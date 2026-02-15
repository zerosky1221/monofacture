// ═══════════════════════════════════════════════════════════════════════════════
// MONOFACTURE DEAL ESCROW v4.0
// Tolk Smart Contract for Telegram Ads Marketplace
//
// Rewrite of FunC escrow-deal.fc v3.0 in Tolk 1.2
//
// Flow:
// 1. Contract deployed with deal params (status = PENDING)
// 2. Advertiser sends TON >= total_amount → FUNDED
// 3. Platform sends Release → ALL funds to platform wallet → self-destruct
// 4. Refund: platform anytime OR advertiser after deadline → self-destruct
// 5. Dispute: advertiser/publisher → DISPUTED. Platform resolves.
//
// On release, ALL funds go to platform wallet. Backend handles:
//   - Publisher amount → in-app balance
//   - Platform fee → platform keeps
//   - Referral fee → referrer's in-app balance
// ═══════════════════════════════════════════════════════════════════════════════
tolk 1.2

// ═══ Status Constants ═══
const STATUS_PENDING  = 0
const STATUS_FUNDED   = 1
const STATUS_RELEASED = 2
const STATUS_REFUNDED = 3
const STATUS_DISPUTED = 4

// ═══ Error Codes ═══
const ERROR_UNAUTHORIZED       = 100
const ERROR_INVALID_STATE      = 101
const ERROR_INSUFFICIENT_FUNDS = 102
const ERROR_EXPIRED            = 103
const ERROR_NOT_EXPIRED        = 104
const ERROR_ALREADY_FUNDED     = 105
const ERROR_INVALID_AMOUNT     = 106
const ERROR_INVALID_OP         = 107
const ERROR_BOUNCE_HANDLING    = 108
const ERROR_INVALID_DEADLINE   = 109

// ═══ Op Codes (ASCII-based, matching FunC v3) ═══
// fund:    0x746F6E46 = "tonF"
// release: 0x72656C73 = "rels"
// refund:  0x72656675 = "refu"
// dispute: 0x64697370 = "disp"
// resolve: 0x7265736F = "reso"
// extend:  0x65787464 = "extd"

// ═══ Message Types ═══
struct (0x746F6E46) MsgFund {
    queryId: uint64
}

struct (0x72656C73) MsgRelease {
    queryId: uint64
}

struct (0x72656675) MsgRefund {
    queryId: uint64
}

struct (0x64697370) MsgDispute {
    queryId: uint64
}

struct (0x7265736F) MsgResolve {
    queryId: uint64
    releaseToPublisher: bool
}

struct (0x65787464) MsgExtend {
    queryId: uint64
    newDeadline: uint32
}

type EscrowMessage = MsgFund | MsgRelease | MsgRefund | MsgDispute | MsgResolve | MsgExtend

// ═══ Storage Layout ═══
// Split across 2 cells to avoid 1023-bit overflow:
// Cell 1: status + dealId + advertiser + publisher + ref→Cell2
// Cell 2: platformWallet + totalAmount + publisherAmount + deadline + createdAt + fundedAt

struct StorageInner {
    platformWallet: address
    totalAmount: coins
    publisherAmount: coins
    deadline: uint32
    createdAt: uint32
    fundedAt: uint32
}

struct Storage {
    status: uint8
    dealId: uint256
    advertiser: address
    publisher: address
    inner: Cell<StorageInner>
}

fun Storage.save(self) {
    contract.setData(self.toCell())
}

// ═══════════════════════════════════════════════════════════════════════════════
// OPERATION HANDLERS
// ═══════════════════════════════════════════════════════════════════════════════

// FUND: Advertiser deposits TON to escrow
// CRITICAL: Check msg_value (incoming value), NOT contract balance
fun handleFund(mutate storage: Storage, msgValue: coins) {
    val innerData = storage.inner.load();

    // Must be PENDING
    assert(storage.status == STATUS_PENDING) throw ERROR_INVALID_STATE;

    // Check incoming value covers the total amount
    assert(msgValue >= innerData.totalAmount) throw ERROR_INSUFFICIENT_FUNDS;

    // Update status to FUNDED and record funding time
    storage.status = STATUS_FUNDED;
    val updatedInner: StorageInner = {
        platformWallet: innerData.platformWallet,
        totalAmount: innerData.totalAmount,
        publisherAmount: innerData.publisherAmount,
        deadline: innerData.deadline,
        createdAt: innerData.createdAt,
        fundedAt: blockchain.now() as uint32,
    };
    storage.inner = updatedInner.toCell();
    storage.save();
}

// RELEASE: Platform releases funds after deal completion
// Sends ALL remaining balance to platform wallet, self-destructs
fun handleRelease(mutate storage: Storage, senderAddress: address) {
    val innerData = storage.inner.load();

    // Only platform can release
    assert(senderAddress == innerData.platformWallet) throw ERROR_UNAUTHORIZED;

    // Must be FUNDED
    assert(storage.status == STATUS_FUNDED) throw ERROR_INVALID_STATE;

    // Update state BEFORE sending (reentrancy protection)
    storage.status = STATUS_RELEASED;
    storage.save();

    // Send ALL remaining balance to platform wallet
    // Mode 128 = carry all balance, 32 = destroy contract if zero
    val msg = createMessage({
        bounce: BounceMode.NoBounce,
        value: 0 as coins,
        dest: innerData.platformWallet,
        body: "escrow_release",
    });
    msg.send(SEND_MODE_CARRY_ALL_BALANCE | SEND_MODE_DESTROY);
}

// REFUND: Return ALL funds to advertiser
// Platform can refund anytime; advertiser only after deadline
fun handleRefund(mutate storage: Storage, senderAddress: address) {
    val innerData = storage.inner.load();

    val isPlatform = senderAddress == innerData.platformWallet;
    val isAdvertiser = senderAddress == storage.advertiser;

    // Only platform or advertiser can refund
    assert(isPlatform | isAdvertiser) throw ERROR_UNAUTHORIZED;

    // Must be FUNDED or DISPUTED
    assert((storage.status == STATUS_FUNDED) | (storage.status == STATUS_DISPUTED)) throw ERROR_INVALID_STATE;

    // Advertiser can only refund after deadline
    if (isAdvertiser) {
        assert(blockchain.now() >= innerData.deadline as int) throw ERROR_NOT_EXPIRED;
    }

    // Update state BEFORE sending (reentrancy protection)
    storage.status = STATUS_REFUNDED;
    storage.save();

    // Send ALL remaining balance back to advertiser
    val msg = createMessage({
        bounce: BounceMode.NoBounce,
        value: 0 as coins,
        dest: storage.advertiser,
        body: "escrow_refund",
    });
    msg.send(SEND_MODE_CARRY_ALL_BALANCE | SEND_MODE_DESTROY);
}

// DISPUTE: Freeze funds for dispute resolution
// Only advertiser or publisher can dispute
fun handleDispute(mutate storage: Storage, senderAddress: address) {
    val isAdvertiser = senderAddress == storage.advertiser;
    val isPublisher = senderAddress == storage.publisher;

    // Only advertiser or publisher
    assert(isAdvertiser | isPublisher) throw ERROR_UNAUTHORIZED;

    // Must be FUNDED
    assert(storage.status == STATUS_FUNDED) throw ERROR_INVALID_STATE;

    storage.status = STATUS_DISPUTED;
    storage.save();
}

// RESOLVE: Platform resolves dispute
// releaseToPublisher=true → release to platform (publisher wins)
// releaseToPublisher=false → refund to advertiser
fun handleResolve(mutate storage: Storage, senderAddress: address, releaseToPublisher: bool) {
    val innerData = storage.inner.load();

    // Only platform can resolve
    assert(senderAddress == innerData.platformWallet) throw ERROR_UNAUTHORIZED;

    // Must be DISPUTED
    assert(storage.status == STATUS_DISPUTED) throw ERROR_INVALID_STATE;

    if (releaseToPublisher) {
        // Publisher wins → release to platform
        storage.status = STATUS_RELEASED;
        storage.save();

        val msg = createMessage({
            bounce: BounceMode.NoBounce,
            value: 0 as coins,
            dest: innerData.platformWallet,
            body: "dispute_release",
        });
        msg.send(SEND_MODE_CARRY_ALL_BALANCE | SEND_MODE_DESTROY);
    } else {
        // Advertiser wins → refund
        storage.status = STATUS_REFUNDED;
        storage.save();

        val msg = createMessage({
            bounce: BounceMode.NoBounce,
            value: 0 as coins,
            dest: storage.advertiser,
            body: "dispute_refund",
        });
        msg.send(SEND_MODE_CARRY_ALL_BALANCE | SEND_MODE_DESTROY);
    }
}

// EXTEND: Platform extends deadline
fun handleExtend(mutate storage: Storage, senderAddress: address, newDeadline: uint32) {
    val innerData = storage.inner.load();

    // Only platform can extend
    assert(senderAddress == innerData.platformWallet) throw ERROR_UNAUTHORIZED;

    // Must be FUNDED or DISPUTED
    assert((storage.status == STATUS_FUNDED) | (storage.status == STATUS_DISPUTED)) throw ERROR_INVALID_STATE;

    // New deadline must be in the future
    assert(newDeadline as int > blockchain.now()) throw ERROR_INVALID_DEADLINE;

    // Update deadline
    val updatedInner: StorageInner = {
        platformWallet: innerData.platformWallet,
        totalAmount: innerData.totalAmount,
        publisherAmount: innerData.publisherAmount,
        deadline: newDeadline,
        createdAt: innerData.createdAt,
        fundedAt: innerData.fundedAt,
    };
    storage.inner = updatedInner.toCell();
    storage.save();
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN MESSAGE HANDLER
// ═══════════════════════════════════════════════════════════════════════════════

fun onInternalMessage(in: InMessage) {
    var storage = lazy Storage.fromCell(contract.getData());

    // AUTO-FUND: Empty body = plain TON transfer = funding attempt
    if (in.body.isEmpty()) {
        if (storage.status == STATUS_PENDING) {
            handleFund(mutate storage, in.valueCoins);
        }
        // If already funded, silently accept excess
        return;
    }

    // Try to parse as known message type
    val msg = lazy EscrowMessage.fromSlice(in.body, {
        throwIfOpcodeDoesNotMatch: 0,
    });

    match (msg) {
        MsgFund => {
            handleFund(mutate storage, in.valueCoins);
        }
        MsgRelease => {
            handleRelease(mutate storage, in.senderAddress);
        }
        MsgRefund => {
            handleRefund(mutate storage, in.senderAddress);
        }
        MsgDispute => {
            handleDispute(mutate storage, in.senderAddress);
        }
        MsgResolve => {
            handleResolve(mutate storage, in.senderAddress, msg.releaseToPublisher);
        }
        MsgExtend => {
            handleExtend(mutate storage, in.senderAddress, msg.newDeadline);
        }
        else => {
            // Check if op=0 (text comment) → treat as funding
            if (storage.status == STATUS_PENDING) {
                handleFund(mutate storage, in.valueCoins);
                return;
            }
            // Unknown op on funded contract → ignore silently
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// BOUNCE HANDLER
// If release/refund message bounces, revert status to FUNDED
// ═══════════════════════════════════════════════════════════════════════════════

fun onBouncedMessage(in: InMessageBounced) {
    var storage = lazy Storage.fromCell(contract.getData());

    // If release or refund bounced, revert to FUNDED for retry
    if ((storage.status == STATUS_RELEASED) | (storage.status == STATUS_REFUNDED)) {
        storage.status = STATUS_FUNDED;
        storage.save();
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// GETTER METHODS
// ═══════════════════════════════════════════════════════════════════════════════

// Full escrow data
get fun get_escrow_data(): (int, int, address, address, address, int, int, int, int) {
    val storage = Storage.fromCell(contract.getData());
    val inner = storage.inner.load();
    return (
        storage.status as int,
        storage.dealId as int,
        storage.advertiser,
        storage.publisher,
        inner.platformWallet,
        inner.totalAmount as int,
        inner.publisherAmount as int,
        inner.deadline as int,
        inner.createdAt as int,
    )
}

get fun get_status(): int {
    val storage = Storage.fromCell(contract.getData());
    return storage.status as int
}

get fun get_deal_id(): int {
    val storage = Storage.fromCell(contract.getData());
    return storage.dealId as int
}

get fun get_total_amount(): int {
    val storage = Storage.fromCell(contract.getData());
    val inner = storage.inner.load();
    return inner.totalAmount as int
}

get fun get_publisher_amount(): int {
    val storage = Storage.fromCell(contract.getData());
    val inner = storage.inner.load();
    return inner.publisherAmount as int
}

get fun get_platform_fee(): int {
    val storage = Storage.fromCell(contract.getData());
    val inner = storage.inner.load();
    return (inner.totalAmount as int) - (inner.publisherAmount as int)
}

get fun get_deadline(): int {
    val storage = Storage.fromCell(contract.getData());
    val inner = storage.inner.load();
    return inner.deadline as int
}

get fun is_expired(): int {
    val storage = Storage.fromCell(contract.getData());
    val inner = storage.inner.load();
    return blockchain.now() >= (inner.deadline as int) ? -1 : 0
}

get fun is_funded(): int {
    val storage = Storage.fromCell(contract.getData());
    return storage.status >= STATUS_FUNDED ? -1 : 0
}

get fun get_locked_balance(): int {
    return contract.getOriginalBalance() as int
}
