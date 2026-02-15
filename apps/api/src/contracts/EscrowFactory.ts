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

export const FACTORY_OP = {
  CREATE_DEAL: 0x01,
  UPDATE_CODE: 0x02,
  UPDATE_FEE: 0x03,
  WITHDRAW: 0x04,
} as const;

export interface EscrowFactoryConfig {
  owner: Address;
  platformWallet: Address;
  feeRate: number;
  dealCode: Cell;
}

export interface CreateDealParams {
  dealId: bigint;
  advertiser: Address;
  publisher: Address;
  totalAmount: bigint;
  publisherAmount: bigint;
  deadline: number;
}

export function buildFactoryDataCell(config: EscrowFactoryConfig): Cell {
  return beginCell()
    .storeAddress(config.owner)
    .storeAddress(config.platformWallet)
    .storeUint(config.feeRate, 16)
    .storeUint(0, 64)
    .storeRef(config.dealCode)
    .endCell();
}

export class EscrowFactory implements Contract {
  constructor(
    readonly address: Address,
    readonly init?: { code: Cell; data: Cell },
  ) {}

  static createFromConfig(
    config: EscrowFactoryConfig,
    code: Cell,
    workchain = 0,
  ): EscrowFactory {
    const data = buildFactoryDataCell(config);
    const init = { code, data };
    return new EscrowFactory(contractAddress(workchain, init), init);
  }

  static createFromAddress(address: Address): EscrowFactory {
    return new EscrowFactory(address);
  }

  async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
    await provider.internal(via, {
      value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell().endCell(),
    });
  }

  async sendCreateDeal(
    provider: ContractProvider,
    via: Sender,
    params: CreateDealParams,
    queryId = 0n,
  ): Promise<Address> {
    const body = beginCell()
      .storeUint(FACTORY_OP.CREATE_DEAL, 32)
      .storeUint(queryId, 64)
      .storeUint(params.dealId, 256)
      .storeAddress(params.advertiser)
      .storeAddress(params.publisher)
      .storeCoins(params.totalAmount)
      .storeCoins(params.publisherAmount)
      .storeUint(params.deadline, 32)
      .endCell();

    await provider.internal(via, {
      value: toNano('0.15'),
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body,
    });

    return this.computeDealAddress(provider, params);
  }

  async sendUpdateCode(
    provider: ContractProvider,
    via: Sender,
    newCode: Cell,
    queryId = 0n,
  ) {
    await provider.internal(via, {
      value: toNano('0.05'),
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(FACTORY_OP.UPDATE_CODE, 32)
        .storeUint(queryId, 64)
        .storeRef(newCode)
        .endCell(),
    });
  }

  async sendUpdateFee(
    provider: ContractProvider,
    via: Sender,
    newFeeRate: number,
    queryId = 0n,
  ) {
    await provider.internal(via, {
      value: toNano('0.05'),
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(FACTORY_OP.UPDATE_FEE, 32)
        .storeUint(queryId, 64)
        .storeUint(newFeeRate, 16)
        .endCell(),
    });
  }

  async sendWithdraw(
    provider: ContractProvider,
    via: Sender,
    amount: bigint,
    toAddress: Address,
    queryId = 0n,
  ) {
    await provider.internal(via, {
      value: toNano('0.05'),
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(FACTORY_OP.WITHDRAW, 32)
        .storeUint(queryId, 64)
        .storeCoins(amount)
        .storeAddress(toAddress)
        .endCell(),
    });
  }

  async computeDealAddress(
    provider: ContractProvider,
    params: CreateDealParams,
  ): Promise<Address> {
    const result = await provider.get('get_deal_address', [
      { type: 'int', value: params.dealId },
      { type: 'slice', cell: beginCell().storeAddress(params.advertiser).endCell() },
      { type: 'slice', cell: beginCell().storeAddress(params.publisher).endCell() },
      { type: 'int', value: params.totalAmount },
      { type: 'int', value: BigInt(params.publisherAmount) },
      { type: 'int', value: BigInt(params.deadline) },
    ]);
    return result.stack.readAddress();
  }

  async getDealCount(provider: ContractProvider): Promise<bigint> {
    const result = await provider.get('get_deal_count', []);
    return result.stack.readBigNumber();
  }

  async getFeeRate(provider: ContractProvider): Promise<number> {
    const result = await provider.get('get_fee_rate', []);
    return Number(result.stack.readBigNumber());
  }

  async getOwner(provider: ContractProvider): Promise<Address> {
    const result = await provider.get('get_owner', []);
    return result.stack.readAddress();
  }

  async getPlatformWallet(provider: ContractProvider): Promise<Address> {
    const result = await provider.get('get_platform_wallet', []);
    return result.stack.readAddress();
  }

  async getDealCode(provider: ContractProvider): Promise<Cell> {
    const result = await provider.get('get_deal_code', []);
    return result.stack.readCell();
  }
}
