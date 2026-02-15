// ═══════════════════════════════════════════════════════════════════════════════
// MONOFACTURE DEAL ESCROW v3.0 (Tact)
// TON Smart Contract for Telegram Ads Marketplace
//
// Flow:
// 1. Contract deployed with deal params (advertiser, publisher, platform, amount, deadline)
// 2. Advertiser sends TON >= totalAmount -> auto-funded
// 3. On success: platform sends Release -> all funds to platform wallet
// 4. On failure: platform sends Refund or advertiser after deadline -> refund
// 5. Dispute: either party -> freeze. Platform resolves.
// ═══════════════════════════════════════════════════════════════════════════════

import "@stdlib/deploy";

// ═══ Status Constants ═══
const STATUS_PENDING: Int = 0;
const STATUS_FUNDED: Int = 1;
const STATUS_RELEASED: Int = 2;
const STATUS_REFUNDED: Int = 3;
const STATUS_DISPUTED: Int = 4;

// ═══ Min storage reserve ═══
const MIN_TON_FOR_STORAGE: Int = ton("0.01");

// ═══ Message Definitions ═══

message Fund {
    queryId: Int as uint64;
}

message Release {
    queryId: Int as uint64;
}

message Refund {
    queryId: Int as uint64;
}

message Dispute {
    queryId: Int as uint64;
}

message Resolve {
    queryId: Int as uint64;
    releaseToPublisher: Bool;
}

message ExtendDeadline {
    queryId: Int as uint64;
    newDeadline: Int as uint64;
}

// ═══ Escrow Data Struct (for getter return) ═══
struct EscrowData {
    dealId: Int as uint64;
    advertiser: Address;
    publisher: Address;
    platformWallet: Address;
    totalAmount: Int as coins;
    publisherAmount: Int as coins;
    status: Int as uint8;
    deadline: Int as uint64;
    createdAt: Int as uint64;
}

// ═══ Main Contract ═══

contract MonofactureEscrow with Deployable {
    // ═══ Storage Variables ═══
    dealId: Int as uint64;
    advertiser: Address;
    publisher: Address;
    platformWallet: Address;
    totalAmount: Int as coins;
    publisherAmount: Int as coins;
    status: Int as uint8;
    deadline: Int as uint64;
    createdAt: Int as uint64;

    // ═══ Constructor ═══
    init(
        dealId: Int,
        advertiser: Address,
        publisher: Address,
        platformWallet: Address,
        totalAmount: Int,
        publisherAmount: Int,
        deadline: Int
    ) {
        self.dealId = dealId;
        self.advertiser = advertiser;
        self.publisher = publisher;
        self.platformWallet = platformWallet;
        self.totalAmount = totalAmount;
        self.publisherAmount = publisherAmount;
        self.status = STATUS_PENDING;
        self.deadline = deadline;
        self.createdAt = now();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // RECEIVERS
    // ═══════════════════════════════════════════════════════════════════════════

    // Auto-fund on plain TON transfer (empty message body)
    receive() {
        self.handleFunding();
    }

    // Handle text comment transfers (also treated as funding)
    receive(comment: String) {
        self.handleFunding();
    }

    // Explicit Fund message
    receive(msg: Fund) {
        self.handleFunding();
    }

    // Release funds to platform wallet (only platform)
    receive(msg: Release) {
        require(sender() == self.platformWallet, "Only platform can release");
        require(self.status == STATUS_FUNDED, "Escrow not funded");

        // Update status first
        self.status = STATUS_RELEASED;

        // Send ALL balance to platform wallet (mode 128 + 32)
        // Mode 128 = send remaining balance
        // Mode 32 = destroy contract if balance becomes zero
        send(SendParameters{
            to: self.platformWallet,
            value: 0,
            mode: SendRemainingBalance | SendDestroyIfZero,
            body: "escrow_release".asComment()
        });
    }

    // Refund funds to advertiser
    receive(msg: Refund) {
        let isPlatform: Bool = sender() == self.platformWallet;
        let isAdvertiser: Bool = sender() == self.advertiser;

        // Platform can refund anytime when funded
        // Advertiser can refund only after deadline
        if (isAdvertiser) {
            require(now() >= self.deadline, "Deadline not passed");
        }

        require(isPlatform || isAdvertiser, "Not authorized");
        require(self.status == STATUS_FUNDED, "Escrow not funded");

        // Update status first
        self.status = STATUS_REFUNDED;

        // Send ALL balance to advertiser (mode 128 + 32)
        send(SendParameters{
            to: self.advertiser,
            value: 0,
            mode: SendRemainingBalance | SendDestroyIfZero,
            body: "escrow_refund".asComment()
        });
    }

    // Freeze funds (dispute)
    receive(msg: Dispute) {
        let isAdvertiser: Bool = sender() == self.advertiser;
        let isPublisher: Bool = sender() == self.publisher;

        require(isAdvertiser || isPublisher, "Not authorized");
        require(self.status == STATUS_FUNDED, "Escrow not funded");

        self.status = STATUS_DISPUTED;
    }

    // Platform resolves dispute
    receive(msg: Resolve) {
        require(sender() == self.platformWallet, "Only platform can resolve");
        require(self.status == STATUS_DISPUTED, "Not disputed");

        if (msg.releaseToPublisher) {
            // Publisher wins - release to platform
            self.status = STATUS_RELEASED;
            send(SendParameters{
                to: self.platformWallet,
                value: 0,
                mode: SendRemainingBalance | SendDestroyIfZero,
                body: "dispute_release".asComment()
            });
        } else {
            // Advertiser wins - refund
            self.status = STATUS_REFUNDED;
            send(SendParameters{
                to: self.advertiser,
                value: 0,
                mode: SendRemainingBalance | SendDestroyIfZero,
                body: "dispute_refund".asComment()
            });
        }
    }

    // Platform extends deadline
    receive(msg: ExtendDeadline) {
        require(sender() == self.platformWallet, "Only platform can extend");
        require(self.status == STATUS_FUNDED || self.status == STATUS_DISPUTED, "Invalid state");
        require(msg.newDeadline > now(), "Deadline must be future");

        self.deadline = msg.newDeadline;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // INTERNAL FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════

    fun handleFunding() {
        // Only when pending
        if (self.status == STATUS_PENDING) {
            // Check sender is advertiser
            require(sender() == self.advertiser, "Only advertiser can fund");
            // Check sufficient funds (current balance after receiving this message)
            require(myBalance() >= self.totalAmount, "Insufficient funds");

            // Mark as funded
            self.status = STATUS_FUNDED;
        }
        // If already funded, accept excess (will be included in release/refund)
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // GETTERS
    // ═══════════════════════════════════════════════════════════════════════════

    // Full escrow data
    get fun escrowData(): EscrowData {
        return EscrowData{
            dealId: self.dealId,
            advertiser: self.advertiser,
            publisher: self.publisher,
            platformWallet: self.platformWallet,
            totalAmount: self.totalAmount,
            publisherAmount: self.publisherAmount,
            status: self.status,
            deadline: self.deadline,
            createdAt: self.createdAt
        };
    }

    // Current status (0=pending, 1=funded, 2=released, 3=refunded, 4=disputed)
    get fun status(): Int {
        return self.status;
    }

    // Total amount locked
    get fun totalAmount(): Int {
        return self.totalAmount;
    }

    // Publisher amount (for transparency)
    get fun publisherAmount(): Int {
        return self.publisherAmount;
    }

    // Platform fee (total - publisher)
    get fun platformFee(): Int {
        return self.totalAmount - self.publisherAmount;
    }

    // Deadline timestamp
    get fun deadline(): Int {
        return self.deadline;
    }

    // Is deadline passed?
    get fun isExpired(): Bool {
        return now() >= self.deadline;
    }

    // Deal ID
    get fun dealId(): Int {
        return self.dealId;
    }

    // Contract balance (actual locked TON)
    get fun lockedBalance(): Int {
        return myBalance();
    }
}
