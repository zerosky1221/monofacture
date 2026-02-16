/**
 * TolkEscrowDeal Smart Contract Wrapper v4.0
 *
 * TypeScript wrapper for the Tolk escrow-deal.tolk contract.
 * Interface-compatible with EscrowDeal.ts (FunC wrapper).
 *
 * Storage layout (2 cells):
 * Cell 1: status(8) + dealId(256) + advertiser(267) + publisher(267) + ref→Cell2
 * Cell 2: platformWallet(267) + totalAmount(coins) + publisherAmount(coins)
 *         + deadline(32) + createdAt(32) + fundedAt(32)
 */

import {
  Address,
  beginCell,
  Cell,
  Contract,
  contractAddress,
  ContractProvider,
  Sender,
  SendMode,
  toNano,
} from '@ton/core';

// Status codes (matching Tolk contract)
export enum EscrowStatus {
  PENDING = 0,
  FUNDED = 1,
  RELEASED = 2,
  REFUNDED = 3,
  DISPUTED = 4,
}

// ASCII-based op-codes (matching FunC v3 and Tolk v4)
export const OP = {
  FUND: 0x746f6e46, // "tonF"
  RELEASE: 0x72656c73, // "rels"
  REFUND: 0x72656675, // "refu"
  DISPUTE: 0x64697370, // "disp"
  RESOLVE: 0x7265736f, // "reso"
  EXTEND: 0x65787464, // "extd"
} as const;

export interface TolkEscrowDealConfig {
  dealId: bigint; // SHA256 hash of string dealId (uint256)
  advertiser: Address;
  publisher: Address;
  platformWallet: Address;
  totalAmount: bigint; // nanoTON
  publisherAmount: bigint; // nanoTON
  deadline: number; // unix timestamp (uint32)
}

export interface EscrowData {
  status: EscrowStatus;
  dealId: bigint;
  advertiser: Address;
  publisher: Address;
  platformWallet: Address;
  totalAmount: bigint;
  publisherAmount: bigint;
  deadline: number;
  createdAt: number;
}

/**
 * Build initial data cell for contract deployment.
 * Must match the Tolk Storage struct layout exactly:
 * Cell 1: status(uint8) + dealId(uint256) + advertiser(address) + publisher(address) + ref→Cell2
 * Cell 2: platformWallet(address) + totalAmount(coins) + publisherAmount(coins)
 *         + deadline(uint32) + createdAt(uint32) + fundedAt(uint32)
 */
export function buildTolkEscrowDataCell(
  config: TolkEscrowDealConfig,
): Cell {
  // Build inner cell (StorageInner)
  const innerCell = beginCell()
    .storeAddress(config.platformWallet)
    .storeCoins(config.totalAmount)
    .storeCoins(config.publisherAmount)
    .storeUint(config.deadline, 32) // deadline (uint32)
    .storeUint(Math.floor(Date.now() / 1000), 32) // createdAt (uint32)
    .storeUint(0, 32) // fundedAt (uint32) = 0 initially
    .endCell();

  // Build main cell (Storage)
  return beginCell()
    .storeUint(EscrowStatus.PENDING, 8) // status
    .storeUint(config.dealId, 256) // dealId (SHA256)
    .storeAddress(config.advertiser)
    .storeAddress(config.publisher)
    .storeRef(innerCell)
    .endCell();
}

export class TolkEscrowDeal implements Contract {
  constructor(
    readonly address: Address,
    readonly init?: { code: Cell; data: Cell },
  ) {}

  /**
   * Create from config (for deployment)
   */
  static createFromConfig(
    config: TolkEscrowDealConfig,
    code: Cell,
    workchain = 0,
  ): TolkEscrowDeal {
    const data = buildTolkEscrowDataCell(config);
    const init = { code, data };
    return new TolkEscrowDeal(contractAddress(workchain, init), init);
  }

  /**
   * Create from address (for interaction)
   */
  static createFromAddress(address: Address): TolkEscrowDeal {
    return new TolkEscrowDeal(address);
  }

  // ═══════════════════════════════════════════════════════
  // DEPLOY
  // ═══════════════════════════════════════════════════════

  async sendDeploy(
    provider: ContractProvider,
    via: Sender,
    value: bigint,
  ) {
    await provider.internal(via, {
      value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell().endCell(),
    });
  }

  // ═══════════════════════════════════════════════════════
  // WRITE OPERATIONS
  // ═══════════════════════════════════════════════════════

  /**
   * Explicit fund message (optional - plain TON transfer also works)
   */
  async sendFund(
    provider: ContractProvider,
    via: Sender,
    value: bigint,
    queryId = 0n,
  ) {
    await provider.internal(via, {
      value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(OP.FUND, 32)
        .storeUint(queryId, 64)
        .endCell(),
    });
  }

  /**
   * Release funds to platform wallet (only platform can call)
   */
  async sendRelease(
    provider: ContractProvider,
    via: Sender,
    queryId = 0n,
  ) {
    await provider.internal(via, {
      value: toNano('0.05'),
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(OP.RELEASE, 32)
        .storeUint(queryId, 64)
        .endCell(),
    });
  }

  /**
   * Refund funds to advertiser (platform or advertiser after deadline)
   */
  async sendRefund(
    provider: ContractProvider,
    via: Sender,
    queryId = 0n,
  ) {
    await provider.internal(via, {
      value: toNano('0.05'),
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(OP.REFUND, 32)
        .storeUint(queryId, 64)
        .endCell(),
    });
  }

  /**
   * Open dispute (advertiser or publisher)
   */
  async sendDispute(
    provider: ContractProvider,
    via: Sender,
    queryId = 0n,
  ) {
    await provider.internal(via, {
      value: toNano('0.05'),
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(OP.DISPUTE, 32)
        .storeUint(queryId, 64)
        .endCell(),
    });
  }

  /**
   * Resolve dispute (only platform)
   * @param releaseToPublisher - true = publisher wins, false = refund advertiser
   */
  async sendResolve(
    provider: ContractProvider,
    via: Sender,
    releaseToPublisher: boolean,
    queryId = 0n,
  ) {
    await provider.internal(via, {
      value: toNano('0.05'),
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(OP.RESOLVE, 32)
        .storeUint(queryId, 64)
        .storeBit(releaseToPublisher)
        .endCell(),
    });
  }

  /**
   * Extend deadline (only platform)
   */
  async sendExtendDeadline(
    provider: ContractProvider,
    via: Sender,
    newDeadline: number,
    queryId = 0n,
  ) {
    await provider.internal(via, {
      value: toNano('0.05'),
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(OP.EXTEND, 32)
        .storeUint(queryId, 64)
        .storeUint(newDeadline, 32)
        .endCell(),
    });
  }

  // ═══════════════════════════════════════════════════════
  // READ OPERATIONS (GET methods)
  // ═══════════════════════════════════════════════════════

  async getEscrowData(provider: ContractProvider): Promise<EscrowData> {
    const result = await provider.get('get_escrow_data', []);
    return {
      status: Number(result.stack.readBigNumber()) as EscrowStatus,
      dealId: result.stack.readBigNumber(),
      advertiser: result.stack.readAddress(),
      publisher: result.stack.readAddress(),
      platformWallet: result.stack.readAddress(),
      totalAmount: result.stack.readBigNumber(),
      publisherAmount: result.stack.readBigNumber(),
      deadline: Number(result.stack.readBigNumber()),
      createdAt: Number(result.stack.readBigNumber()),
    };
  }

  async getStatus(provider: ContractProvider): Promise<EscrowStatus> {
    const result = await provider.get('get_status', []);
    return Number(result.stack.readBigNumber()) as EscrowStatus;
  }

  async getDealId(provider: ContractProvider): Promise<bigint> {
    const result = await provider.get('get_deal_id', []);
    return result.stack.readBigNumber();
  }

  async getTotalAmount(provider: ContractProvider): Promise<bigint> {
    const result = await provider.get('get_total_amount', []);
    return result.stack.readBigNumber();
  }

  async getPublisherAmount(provider: ContractProvider): Promise<bigint> {
    const result = await provider.get('get_publisher_amount', []);
    return result.stack.readBigNumber();
  }

  async getPlatformFee(provider: ContractProvider): Promise<bigint> {
    const result = await provider.get('get_platform_fee', []);
    return result.stack.readBigNumber();
  }

  async getDeadline(provider: ContractProvider): Promise<number> {
    const result = await provider.get('get_deadline', []);
    return Number(result.stack.readBigNumber());
  }

  async isExpired(provider: ContractProvider): Promise<boolean> {
    const result = await provider.get('is_expired', []);
    return result.stack.readBigNumber() !== 0n;
  }

  async isFunded(provider: ContractProvider): Promise<boolean> {
    const result = await provider.get('is_funded', []);
    return result.stack.readBigNumber() !== 0n;
  }

  async getLockedBalance(provider: ContractProvider): Promise<bigint> {
    const result = await provider.get('get_locked_balance', []);
    return result.stack.readBigNumber();
  }
}

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

/**
 * Generate TON Connect payment payload for advertiser
 * Note: escrow contract auto-funds on plain TON transfer, no payload needed
 */
export function generateTonConnectPayload(
  escrowAddress: string,
  totalAmount: bigint,
  gasBuffer = toNano('0.05'),
): {
  validUntil: number;
  messages: Array<{
    address: string;
    amount: string;
  }>;
} {
  return {
    validUntil: Math.floor(Date.now() / 1000) + 600, // 10 min
    messages: [
      {
        address: escrowAddress,
        amount: (totalAmount + gasBuffer).toString(),
      },
    ],
  };
}

/**
 * Generate TON deep link for manual payment
 */
export function generatePaymentDeepLink(
  escrowAddress: string,
  totalAmount: bigint,
  dealRef: string,
): string {
  const amountNano = totalAmount.toString();
  return `ton://transfer/${escrowAddress}?amount=${amountNano}&text=deal_${dealRef}`;
}
