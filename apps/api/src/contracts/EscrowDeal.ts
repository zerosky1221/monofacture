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

export enum EscrowStatus {
  PENDING = 0,
  FUNDED = 1,
  RELEASED = 2,
  REFUNDED = 3,
  DISPUTED = 4,
}

export const OP = {
  FUND: 0x746f6e46,
  RELEASE: 0x72656c73,
  REFUND: 0x72656675,
  DISPUTE: 0x64697370,
  RESOLVE: 0x7265736f,
  EXTEND: 0x65787464,
} as const;

export interface EscrowDealConfig {
  dealId: bigint;
  advertiser: Address;
  publisher: Address;
  platformWallet: Address;
  totalAmount: bigint;
  publisherAmount: bigint;
  deadline: number;
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

export function buildEscrowDataCell(config: EscrowDealConfig): Cell {
  const dataCell2 = beginCell()
    .storeAddress(config.platformWallet)
    .storeCoins(config.totalAmount)
    .storeCoins(config.publisherAmount)
    .storeUint(config.deadline, 32)
    .storeUint(Math.floor(Date.now() / 1000), 32)
    .endCell();

  return beginCell()
    .storeUint(EscrowStatus.PENDING, 8)
    .storeUint(config.dealId, 256)
    .storeAddress(config.advertiser)
    .storeAddress(config.publisher)
    .storeRef(dataCell2)
    .endCell();
}

export class EscrowDeal implements Contract {
  constructor(
    readonly address: Address,
    readonly init?: { code: Cell; data: Cell },
  ) {}

  static createFromConfig(
    config: EscrowDealConfig,
    code: Cell,
    workchain = 0,
  ): EscrowDeal {
    const data = buildEscrowDataCell(config);
    const init = { code, data };
    return new EscrowDeal(contractAddress(workchain, init), init);
  }

  static createFromAddress(address: Address): EscrowDeal {
    return new EscrowDeal(address);
  }

  async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
    await provider.internal(via, {
      value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell().endCell(),
    });
  }

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

  async sendRelease(provider: ContractProvider, via: Sender, queryId = 0n) {
    await provider.internal(via, {
      value: toNano('0.05'),
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(OP.RELEASE, 32)
        .storeUint(queryId, 64)
        .endCell(),
    });
  }

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
        .storeUint(releaseToPublisher ? 1 : 0, 1)
        .endCell(),
    });
  }

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

  async getLockedBalance(provider: ContractProvider): Promise<bigint> {
    const result = await provider.get('get_locked_balance', []);
    return result.stack.readBigNumber();
  }
}

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
    validUntil: Math.floor(Date.now() / 1000) + 600,
    messages: [
      {
        address: escrowAddress,
        amount: (totalAmount + gasBuffer).toString(),
      },
    ],
  };
}

export function generatePaymentDeepLink(
  escrowAddress: string,
  totalAmount: bigint,
  dealRef: string,
): string {
  const amountNano = totalAmount.toString();
  return `ton://transfer/${escrowAddress}?amount=${amountNano}&text=deal_${dealRef}`;
}
