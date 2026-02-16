/**
 * DealEscrow Smart Contract Wrapper
 * 
 * Handles deployment and interaction with the escrow contract on TON blockchain.
 * Used by the backend to deploy escrow per deal, monitor payments, release/refund funds.
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
  fromNano,
  StateInit,
  storeStateInit,
} from '@ton/core';
import { TonClient } from '@ton/ton';

// Status codes matching the FunC contract
export enum EscrowStatus {
  PENDING = 0,
  FUNDED = 1,
  RELEASED = 2,
  REFUNDED = 3,
  DISPUTED = 4,
}

// Op codes
export const OP = {
  RELEASE: 0x01,
  REFUND: 0x02,
  DISPUTE: 0x03,
  RESOLVE: 0x04,
  EXTEND_DEADLINE: 0x05,
} as const;

export interface DealEscrowConfig {
  dealId: bigint;
  advertiser: Address;
  publisher: Address;
  platformWallet: Address;
  totalAmount: bigint;       // nanoTON — full amount advertiser pays
  publisherAmount: bigint;   // nanoTON — publisher's share (price without commission)
  deadline: number;          // unix timestamp
}

export interface EscrowData {
  dealId: bigint;
  advertiser: Address;
  publisher: Address;
  platformWallet: Address;
  totalAmount: bigint;
  publisherAmount: bigint;
  status: EscrowStatus;
  deadline: number;
  createdAt: number;
}

/**
 * Build the initial data cell for contract deployment
 */
export function buildEscrowDataCell(config: DealEscrowConfig): Cell {
  return beginCell()
    .storeUint(config.dealId, 64)
    .storeAddress(config.advertiser)
    .storeAddress(config.publisher)
    .storeAddress(config.platformWallet)
    .storeCoins(config.totalAmount)
    .storeCoins(config.publisherAmount)
    .storeUint(EscrowStatus.PENDING, 8)
    .storeUint(config.deadline, 64)
    .storeUint(Math.floor(Date.now() / 1000), 64)
    .endCell();
}

/**
 * Compile the FunC contract to BOC
 * In production, this would use the compiled contract code.
 * For now, we load the pre-compiled BOC file.
 */
export function getEscrowCode(): Cell {
  // This should be the compiled escrow-v2.fc BOC
  // In development, compile with: npx func-js contracts/stdlib.fc contracts/escrow-v2.fc
  // For now, return placeholder — will be replaced with actual compiled code
  throw new Error('Load compiled contract code from escrow-v2.boc file');
}

export class DealEscrow implements Contract {
  constructor(
    readonly address: Address,
    readonly init?: { code: Cell; data: Cell },
  ) {}

  /**
   * Create contract instance from config (for deployment)
   */
  static createFromConfig(config: DealEscrowConfig, code: Cell, workchain = 0): DealEscrow {
    const data = buildEscrowDataCell(config);
    const init = { code, data };
    return new DealEscrow(contractAddress(workchain, init), init);
  }

  /**
   * Create contract instance from address (for interaction)
   */
  static createFromAddress(address: Address): DealEscrow {
    return new DealEscrow(address);
  }

  // ═══════════════════════════════════════════════════════
  // DEPLOY
  // ═══════════════════════════════════════════════════════

  async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
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
   * Release funds to platform wallet (only platform can call)
   */
  async sendRelease(provider: ContractProvider, via: Sender, queryId = 0n) {
    await provider.internal(via, {
      value: toNano('0.05'), // gas
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
  async sendRefund(provider: ContractProvider, via: Sender, queryId = 0n) {
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
  async sendDispute(provider: ContractProvider, via: Sender, queryId = 0n) {
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
  async sendResolve(provider: ContractProvider, via: Sender, releaseToPublisher: boolean, queryId = 0n) {
    await provider.internal(via, {
      value: toNano('0.05'),
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(OP.RESOLVE, 32)
        .storeUint(queryId, 64)
        .storeUint(releaseToPublisher ? 1 : 0, 1)
        .endCell(),
    });
  }

  /**
   * Extend deadline (only platform)
   */
  async sendExtendDeadline(provider: ContractProvider, via: Sender, newDeadline: number, queryId = 0n) {
    await provider.internal(via, {
      value: toNano('0.05'),
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(OP.EXTEND_DEADLINE, 32)
        .storeUint(queryId, 64)
        .storeUint(newDeadline, 64)
        .endCell(),
    });
  }

  // ═══════════════════════════════════════════════════════
  // READ OPERATIONS (GET methods)
  // ═══════════════════════════════════════════════════════

  async getEscrowData(provider: ContractProvider): Promise<EscrowData> {
    const result = await provider.get('get_escrow_data', []);
    return {
      dealId: result.stack.readBigNumber(),
      advertiser: result.stack.readAddress(),
      publisher: result.stack.readAddress(),
      platformWallet: result.stack.readAddress(),
      totalAmount: result.stack.readBigNumber(),
      publisherAmount: result.stack.readBigNumber(),
      status: Number(result.stack.readBigNumber()) as EscrowStatus,
      deadline: Number(result.stack.readBigNumber()),
      createdAt: Number(result.stack.readBigNumber()),
    };
  }

  async getStatus(provider: ContractProvider): Promise<EscrowStatus> {
    const result = await provider.get('get_status', []);
    return Number(result.stack.readBigNumber()) as EscrowStatus;
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

  async getLockedBalance(provider: ContractProvider): Promise<bigint> {
    const result = await provider.get('get_locked_balance', []);
    return result.stack.readBigNumber();
  }
}

// ═══════════════════════════════════════════════════════════
// HELPER: Generate TON Connect payment link for advertiser
// ═══════════════════════════════════════════════════════════

export function generatePaymentDeepLink(
  escrowAddress: string,
  totalAmount: bigint,
  dealRef: string,
): string {
  const amountNano = totalAmount.toString();
  return `ton://transfer/${escrowAddress}?amount=${amountNano}&text=deal_${dealRef}`;
}

export function generateTonConnectPayload(
  escrowAddress: string,
  totalAmount: bigint,
  dealRef: string,
): {
  validUntil: number;
  messages: Array<{
    address: string;
    amount: string;
    payload?: string;
  }>;
} {
  return {
    validUntil: Math.floor(Date.now() / 1000) + 300, // 5 min
    messages: [
      {
        address: escrowAddress,
        amount: totalAmount.toString(),
        // Simple text comment payload (op=0 + text)
        // TonConnect will send this as a regular transfer with comment
      },
    ],
  };
}
