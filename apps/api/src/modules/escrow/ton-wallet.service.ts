import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TonClient, WalletContractV4, internal, toNano, fromNano } from '@ton/ton';
import { mnemonicToPrivateKey, KeyPair, mnemonicNew, keyPairFromSeed } from '@ton/crypto';
import { Address, beginCell, Cell, storeMessage, contractAddress } from '@ton/core';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

import { EscrowDeal, buildEscrowDataCell, EscrowStatus as FuncEscrowStatus, OP as FUNC_OP_CODES } from '../../contracts/EscrowDeal';

import { TolkEscrowDeal, buildTolkEscrowDataCell, EscrowStatus, OP } from '../../contracts/TolkEscrowDeal';

const STATUS_PENDING = 0n;
const STATUS_FUNDED = 1n;
const STATUS_RELEASED = 2n;
const STATUS_REFUNDED = 3n;
const STATUS_DISPUTED = 4n;

const TACT_OP = {
  RELEASE: 408342921,
  REFUND: 2214270485,
} as const;

const CONTRACT_TYPE = 'TOLK_ESCROW_V4';

interface WalletInfo {
  address: string;
  publicKey: string;
  secretKey?: Buffer;
}

interface TransactionInfo {
  hash: string;
  lt: bigint;
  from: string;
  to: string;
  value: bigint;
  timestamp: number;
  comment?: string;
}

@Injectable()
export class TonWalletService implements OnModuleInit {
  private readonly logger = new Logger(TonWalletService.name);
  private tonClient: TonClient;
  private readonly escrowMasterSeed: string;
  private platformWalletAddress: string;
  private readonly isTestnet: boolean;
  private platformKeypair: KeyPair | null = null;

  private escrowWallets: Map<string, { keypair: KeyPair; wallet: WalletContractV4 }> = new Map();

  constructor(private readonly configService: ConfigService) {
    this.escrowMasterSeed = this.configService.get<string>('ton.escrowMasterSeed') || '';
    this.platformWalletAddress = this.configService.get<string>('ton.platformWalletAddress') || '';
    this.isTestnet = this.configService.get<boolean>('ton.testnet', true);

    const endpoint = this.isTestnet
      ? 'https://testnet.toncenter.com/api/v2/jsonRPC'
      : 'https://toncenter.com/api/v2/jsonRPC';

    const apiKey = this.configService.get<string>('ton.apiKey') || '';

    this.tonClient = new TonClient({
      endpoint,
      apiKey: apiKey || undefined,
    });
  }

  async onModuleInit(): Promise<void> {
    this.logger.log(`TON Wallet service initialized (${this.isTestnet ? 'testnet' : 'mainnet'})`);

    if (!this.escrowMasterSeed) {
      this.logger.warn('ESCROW_MASTER_SEED not set - escrow functionality will use generated wallets');
    }

    if (this.escrowMasterSeed) {
      try {
        const mnemonic = this.escrowMasterSeed.split(' ').filter(w => w.trim());
        if (mnemonic.length === 24) {
          this.platformKeypair = await mnemonicToPrivateKey(mnemonic);


          const platformWallet = WalletContractV4.create({
            publicKey: this.platformKeypair.publicKey,
            workchain: 0,
          });


          try {
            if (this.platformWalletAddress) {
              Address.parse(this.platformWalletAddress);
            } else {
              throw new Error('No platform address configured');
            }
          } catch {

            this.platformWalletAddress = platformWallet.address.toString({
              bounceable: true,
              testOnly: this.isTestnet,
            });
            this.logger.log(`Platform wallet derived from mnemonic: ${this.platformWalletAddress}`);
          }

          this.logger.log('Platform wallet keypair initialized');
        }
      } catch (error) {
        this.logger.warn(`Failed to initialize platform keypair: ${(error as Error).message}`);
      }
    }
  }

  async getBalance(address: string): Promise<bigint> {
    try {
      const addr = Address.parse(address);
      const balance = await this.tonClient.getBalance(addr);
      return balance;
    } catch (error) {
      this.logger.error(`Failed to get balance for ${address}: ${(error as Error).message}`);
      return BigInt(0);
    }
  }

  async generateEscrowWallet(dealId: string): Promise<WalletInfo> {
    try {

      const keypair = await this.deriveKeypair(dealId);

      const wallet = WalletContractV4.create({
        publicKey: keypair.publicKey,
        workchain: 0,
      });

      const address = wallet.address.toString({
        bounceable: true,
        testOnly: this.isTestnet,
      });

      this.escrowWallets.set(dealId, { keypair, wallet });

      this.logger.log(`Generated escrow wallet for deal ${dealId}: ${address}`);

      return {
        address,
        publicKey: keypair.publicKey.toString('hex'),
      };
    } catch (error) {
      this.logger.error(`Failed to generate escrow wallet: ${(error as Error).message}`);
      throw error;
    }
  }

  dealIdToHash(dealId: string): bigint {
    const hash = crypto.createHash('sha256').update(dealId).digest('hex');
    return BigInt('0x' + hash);
  }

  async getTransactions(address: string, limit: number = 10): Promise<TransactionInfo[]> {
    try {
      const addr = Address.parse(address);
      const transactions = await this.tonClient.getTransactions(addr, { limit });

      return transactions.map((tx) => {
        const inMsg = tx.inMessage;
        let from = '';
        let value = BigInt(0);
        let comment = '';

        if (inMsg && inMsg.info.type === 'internal') {
          from = inMsg.info.src.toString();
          value = inMsg.info.value.coins;

          if (inMsg.body) {
            try {
              const slice = inMsg.body.beginParse();
              if (slice.remainingBits >= 32) {
                const op = slice.loadUint(32);
                if (op === 0) {

                  comment = slice.loadStringTail();
                }
              }
            } catch {

            }
          }
        }

        return {
          hash: tx.hash().toString('hex'),
          lt: tx.lt,
          from,
          to: address,
          value,
          timestamp: tx.now,
          comment,
        };
      });
    } catch (error) {
      this.logger.error(`Failed to get transactions: ${(error as Error).message}`);
      return [];
    }
  }

  async checkPaymentReceived(
    escrowAddress: string,
    expectedAmount: bigint,
    afterTimestamp?: number,
  ): Promise<{ received: boolean; txHash?: string; actualAmount?: bigint }> {
    try {

      const contractStatus = await this.getContractStatus(escrowAddress);
      if (contractStatus && contractStatus.status >= STATUS_FUNDED) {

        const transactions = await this.getTransactions(escrowAddress, 10);
        const fundingTx = transactions.find(tx => {
          if (afterTimestamp && tx.timestamp < afterTimestamp) return false;
          return tx.value >= (expectedAmount * 90n) / 100n;
        });

        return {
          received: true,
          txHash: fundingTx?.hash,
          actualAmount: contractStatus.balance,
        };
      }

      const balance = await this.getBalance(escrowAddress);
      if (balance >= expectedAmount) {
        return { received: true, actualAmount: balance };
      }

      return { received: false };
    } catch (error) {
      this.logger.error(`Failed to check payment: ${(error as Error).message}`);
      return { received: false };
    }
  }

  async sendFromEscrow(
    dealId: string,
    toAddress: string,
    amount: bigint,
    memo?: string,
  ): Promise<{ hash: string; success: boolean }> {
    this.logger.log(`Sending ${fromNano(amount)} TON to ${toAddress} from escrow ${dealId}`);

    try {

      let walletData = this.escrowWallets.get(dealId);
      if (!walletData) {

        const keypair = await this.deriveKeypair(dealId);
        const wallet = WalletContractV4.create({
          publicKey: keypair.publicKey,
          workchain: 0,
        });
        walletData = { keypair, wallet };
        this.escrowWallets.set(dealId, walletData);
      }

      const { keypair, wallet } = walletData;

      const contract = this.tonClient.open(wallet);

      let seqno: number;
      try {
        seqno = await contract.getSeqno();
      } catch {

        seqno = 0;
      }

      let body: Cell | undefined;
      if (memo) {
        body = beginCell()
          .storeUint(0, 32)
          .storeStringTail(memo)
          .endCell();
      }

      await contract.sendTransfer({
        secretKey: keypair.secretKey,
        seqno,
        messages: [
          internal({
            to: Address.parse(toAddress),
            value: amount,
            body,
            bounce: false,
          }),
        ],
      });

      const txHash = crypto
        .createHash('sha256')
        .update(`${dealId}:${toAddress}:${amount}:${Date.now()}`)
        .digest('hex');

      this.logger.log(`Transfer initiated: ${fromNano(amount)} TON to ${toAddress}`);

      return { hash: txHash, success: true };
    } catch (error) {
      this.logger.error(`Failed to send from escrow: ${(error as Error).message}`);
      throw error;
    }
  }

  async sendMultipleFromEscrow(
    dealId: string,
    transfers: Array<{ to: string; amount: bigint; memo?: string }>,
  ): Promise<{ hash: string; success: boolean }> {
    this.logger.log(`Sending ${transfers.length} transfers from escrow ${dealId}`);

    try {
      let walletData = this.escrowWallets.get(dealId);
      if (!walletData) {
        const keypair = await this.deriveKeypair(dealId);
        const wallet = WalletContractV4.create({
          publicKey: keypair.publicKey,
          workchain: 0,
        });
        walletData = { keypair, wallet };
        this.escrowWallets.set(dealId, walletData);
      }

      const { keypair, wallet } = walletData;
      const contract = this.tonClient.open(wallet);

      let seqno: number;
      try {
        seqno = await contract.getSeqno();
      } catch {
        seqno = 0;
      }

      const messages = transfers.map((t) => {
        let body: Cell | undefined;
        if (t.memo) {
          body = beginCell()
            .storeUint(0, 32)
            .storeStringTail(t.memo)
            .endCell();
        }

        return internal({
          to: Address.parse(t.to),
          value: t.amount,
          body,
          bounce: false,
        });
      });

      await contract.sendTransfer({
        secretKey: keypair.secretKey,
        seqno,
        messages,
      });

      const txHash = crypto
        .createHash('sha256')
        .update(`${dealId}:multi:${Date.now()}`)
        .digest('hex');

      return { hash: txHash, success: true };
    } catch (error) {
      this.logger.error(`Failed to send multiple transfers: ${(error as Error).message}`);
      throw error;
    }
  }

  getPlatformWalletAddress(): string {
    return this.platformWalletAddress;
  }

  async getPlatformWalletBalance(): Promise<{
    address: string;
    balance: string;
    balanceFormatted: string;
  }> {
    const balance = await this.getBalance(this.platformWalletAddress);
    return {
      address: this.platformWalletAddress,
      balance: balance.toString(),
      balanceFormatted: fromNano(balance) + ' TON',
    };
  }

  generatePaymentLink(address: string, amount: bigint, memo?: string): string {
    const amountTon = fromNano(amount);
    const params = new URLSearchParams({
      amount: toNano(amountTon).toString(),
    });

    if (memo) {
      params.set('text', memo);
    }

    return `ton://transfer/${address}?${params.toString()}`;
  }

  generateTonConnectLink(address: string, amount: bigint, memo?: string): string {
    const amountNano = amount.toString();

    const payload = {
      version: '0',
      body: {
        type: 'sign-data',
        data: {
          valid_until: Math.floor(Date.now() / 1000) + 300,
          network: this.isTestnet ? '-3' : '-239',
          messages: [
            {
              address,
              amount: amountNano,
              ...(memo && { payload: memo }),
            },
          ],
        },
      },
    };

    return `tc://?${new URLSearchParams({
      v: '2',
      id: crypto.randomBytes(8).toString('hex'),
      r: JSON.stringify(payload),
    }).toString()}`;
  }

  formatTon(nanoTon: bigint): string {
    return fromNano(nanoTon);
  }

  parseTon(ton: string): bigint {
    return toNano(ton);
  }

  isValidAddress(address: string): boolean {
    try {
      Address.parse(address);
      return true;
    } catch {
      return false;
    }
  }

  normalizeAddress(address: string): string {
    try {
      const addr = Address.parse(address);
      return addr.toString({
        bounceable: true,
        testOnly: this.isTestnet,
      });
    } catch {
      return address;
    }
  }

  private async deriveKeypair(identifier: string): Promise<KeyPair> {
    if (this.escrowMasterSeed) {

      const seed = crypto
        .createHmac('sha256', this.escrowMasterSeed)
        .update(identifier)
        .digest();

      return keyPairFromSeed(seed);
    }

    this.logger.warn('No ESCROW_MASTER_SEED configured — generating random keypair (non-deterministic!)');
    const mnemonic = await mnemonicNew(24);
    return await mnemonicToPrivateKey(mnemonic);
  }

  async waitForTransaction(
    address: string,
    expectedMinAmount: bigint,
    timeoutMs: number = 60000,
    pollIntervalMs: number = 5000,
  ): Promise<TransactionInfo | null> {
    const startTime = Date.now();
    const startBalance = await this.getBalance(address);

    while (Date.now() - startTime < timeoutMs) {
      const transactions = await this.getTransactions(address, 5);

      for (const tx of transactions) {

        if (tx.timestamp > startTime / 1000 - 60 && tx.value >= expectedMinAmount) {
          return tx;
        }
      }

      const currentBalance = await this.getBalance(address);
      if (currentBalance - startBalance >= expectedMinAmount) {

        return {
          hash: crypto.randomBytes(32).toString('hex'),
          lt: BigInt(0),
          from: 'unknown',
          to: address,
          value: currentBalance - startBalance,
          timestamp: Math.floor(Date.now() / 1000),
        };
      }

      await this.sleep(pollIntervalMs);
    }

    return null;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private getEscrowCode(): Cell {

    const localTolkBocPath = path.join(__dirname, '../../contracts/tolk/escrow-deal.boc');
    this.logger.debug(`[getEscrowCode] Checking local path: ${localTolkBocPath}`);
    if (fs.existsSync(localTolkBocPath)) {
      this.logger.log('Loading Tolk escrow contract v4.0 (local)');
      return Cell.fromBoc(fs.readFileSync(localTolkBocPath))[0];
    }

    const tolkBocPath = path.join(__dirname, '../../../../contracts/escrow/build/tolk-escrow-deal.boc');
    this.logger.debug(`[getEscrowCode] Checking workspace path: ${tolkBocPath}`);
    if (fs.existsSync(tolkBocPath)) {
      this.logger.log('Loading Tolk escrow contract v4.0 (workspace)');
      return Cell.fromBoc(fs.readFileSync(tolkBocPath))[0];
    }

    const funcBocPath = path.join(__dirname, '../../contracts/escrow-deal.boc');
    this.logger.debug(`[getEscrowCode] Checking FunC fallback path: ${funcBocPath}`);
    if (fs.existsSync(funcBocPath)) {
      this.logger.warn('Tolk contract not found, falling back to FunC contract');
      return Cell.fromBoc(fs.readFileSync(funcBocPath))[0];
    }

    this.logger.error(`[getEscrowCode] No BOC files found! __dirname=${__dirname}`);
    throw new Error('No escrow contract BOC file found');
  }

  async deployEscrowContract(params: {
    dealId: bigint | string;
    advertiserAddress: string;
    publisherAddress: string;
    totalAmount: bigint;
    publisherAmount: bigint;
    deadline: bigint;
  }): Promise<{ contractAddress: string; deployed: boolean }> {
    this.logger.log(`[deployEscrowContract] Starting deployment...`);


    const dealIdHash = typeof params.dealId === 'string'
      ? this.dealIdToHash(params.dealId)
      : params.dealId;

    this.logger.log(`[deployEscrowContract] Deploying Tolk escrow contract v4.0 for deal ${dealIdHash.toString(16).slice(0, 16)}...`);

    if (!this.platformKeypair) {
      this.logger.error('[deployEscrowContract] Platform wallet not initialized!');
      throw new Error('Platform wallet not initialized - missing ESCROW_MASTER_SEED');
    }
    this.logger.debug('[deployEscrowContract] Platform keypair OK');

    try {
      this.logger.debug('[deployEscrowContract] Loading contract code...');
      const code = this.getEscrowCode();
      this.logger.debug('[deployEscrowContract] Contract code loaded');

      const platformAddress = Address.parse(this.platformWalletAddress);
      this.logger.debug(`[deployEscrowContract] Platform address: ${platformAddress.toString()}`);
      this.logger.debug(`[deployEscrowContract] Advertiser: ${params.advertiserAddress}`);
      this.logger.debug(`[deployEscrowContract] Publisher: ${params.publisherAddress}`);

      this.logger.debug('[deployEscrowContract] Creating TolkEscrowDeal instance...');
      const escrowContract = TolkEscrowDeal.createFromConfig(
        {
          dealId: dealIdHash,
          advertiser: Address.parse(params.advertiserAddress),
          publisher: Address.parse(params.publisherAddress),
          platformWallet: platformAddress,
          totalAmount: params.totalAmount,
          publisherAmount: params.publisherAmount,
          deadline: Number(params.deadline),
        },
        code,
      );
      this.logger.debug('[deployEscrowContract] TolkEscrowDeal instance created');

      const address = escrowContract.address.toString({
        bounceable: true,
        testOnly: this.isTestnet,
      });
      this.logger.debug(`[deployEscrowContract] Contract address computed: ${address}`);

      const platformWallet = WalletContractV4.create({
        publicKey: this.platformKeypair.publicKey,
        workchain: 0,
      });

      const contract = this.tonClient.open(platformWallet);
      this.logger.debug('[deployEscrowContract] Platform wallet opened');

      let seqno: number;
      try {
        seqno = await contract.getSeqno();
        this.logger.debug(`[deployEscrowContract] Got seqno: ${seqno}`);
      } catch (seqnoError) {
        this.logger.warn(`[deployEscrowContract] Failed to get seqno, using 0: ${(seqnoError as Error).message}`);
        seqno = 0;
      }

      this.logger.log(`[deployEscrowContract] Sending deployment tx (seqno=${seqno}, value=0.03 TON)...`);
      await contract.sendTransfer({
        secretKey: this.platformKeypair.secretKey,
        seqno,
        messages: [
          internal({
            to: escrowContract.address,
            value: toNano('0.03'),
            init: escrowContract.init,
            body: beginCell().endCell(),
          }),
        ],
      });

      this.logger.log(`[deployEscrowContract] ✅ Tolk escrow contract v4.0 deployed at ${address}`);

      return { contractAddress: address, deployed: true };
    } catch (error) {
      this.logger.error(`[deployEscrowContract] ❌ Failed to deploy: ${(error as Error).message}`);
      this.logger.error(`[deployEscrowContract] Stack: ${(error as Error).stack}`);
      throw error;
    }
  }

  async computeEscrowAddress(params: {
    dealId: bigint | string;
    advertiserAddress: string;
    publisherAddress: string;
    totalAmount: bigint;
    publisherAmount: bigint;
    deadline: bigint;
  }): Promise<string> {
    try {
      const code = this.getEscrowCode();
      const platformAddress = Address.parse(this.platformWalletAddress);

      const dealIdHash = typeof params.dealId === 'string'
        ? this.dealIdToHash(params.dealId)
        : params.dealId;

      const escrowContract = TolkEscrowDeal.createFromConfig(
        {
          dealId: dealIdHash,
          advertiser: Address.parse(params.advertiserAddress),
          publisher: Address.parse(params.publisherAddress),
          platformWallet: platformAddress,
          totalAmount: params.totalAmount,
          publisherAmount: params.publisherAmount,
          deadline: Number(params.deadline),
        },
        code,
      );

      return escrowContract.address.toString({
        bounceable: true,
        testOnly: this.isTestnet,
      });
    } catch (error) {
      this.logger.error(`Failed to compute escrow address: ${(error as Error).message}`);
      throw error;
    }
  }

  async sendReleaseMessage(contractAddress: string): Promise<{ hash: string; success: boolean }> {
    this.logger.log(`Sending Release message to ${contractAddress}`);

    if (!this.platformKeypair) {
      throw new Error('Platform wallet not initialized');
    }

    try {
      const platformWallet = WalletContractV4.create({
        publicKey: this.platformKeypair.publicKey,
        workchain: 0,
      });

      const contract = this.tonClient.open(platformWallet);

      let seqno: number;
      try {
        seqno = await contract.getSeqno();
      } catch {
        seqno = 0;
      }

      const body = beginCell()
        .storeUint(OP.RELEASE, 32)
        .storeUint(Date.now(), 64)
        .endCell();

      await contract.sendTransfer({
        secretKey: this.platformKeypair.secretKey,
        seqno,
        messages: [
          internal({
            to: Address.parse(contractAddress),
            value: toNano('0.05'),
            body,
            bounce: true,
          }),
        ],
      });

      const txHash = crypto
        .createHash('sha256')
        .update(`release:${contractAddress}:${Date.now()}`)
        .digest('hex');

      this.logger.log(`Release message sent to ${contractAddress}`);

      return { hash: txHash, success: true };
    } catch (error) {
      this.logger.error(`Failed to send Release: ${(error as Error).message}`);
      throw error;
    }
  }

  async sendRefundMessage(contractAddress: string): Promise<{ hash: string; success: boolean }> {
    this.logger.log(`Sending Refund message to ${contractAddress}`);

    if (!this.platformKeypair) {
      throw new Error('Platform wallet not initialized');
    }

    try {
      const platformWallet = WalletContractV4.create({
        publicKey: this.platformKeypair.publicKey,
        workchain: 0,
      });

      const contract = this.tonClient.open(platformWallet);

      let seqno: number;
      try {
        seqno = await contract.getSeqno();
      } catch {
        seqno = 0;
      }

      const body = beginCell()
        .storeUint(OP.REFUND, 32)
        .storeUint(Date.now(), 64)
        .endCell();

      await contract.sendTransfer({
        secretKey: this.platformKeypair.secretKey,
        seqno,
        messages: [
          internal({
            to: Address.parse(contractAddress),
            value: toNano('0.05'),
            body,
            bounce: true,
          }),
        ],
      });

      const txHash = crypto
        .createHash('sha256')
        .update(`refund:${contractAddress}:${Date.now()}`)
        .digest('hex');

      this.logger.log(`Refund message sent to ${contractAddress}`);

      return { hash: txHash, success: true };
    } catch (error) {
      this.logger.error(`Failed to send Refund: ${(error as Error).message}`);
      throw error;
    }
  }

  async getContractStatus(contractAddress: string): Promise<{
    status: bigint;
    totalAmount: bigint;
    publisherAmount: bigint;
    deadline: bigint;
    isExpired: boolean;
    balance: bigint;
  } | null> {
    try {
      const addr = Address.parse(contractAddress);

      const state = await this.tonClient.getContractState(addr);
      if (state.state !== 'active') {
        this.logger.log(`Contract ${contractAddress} is not active (state: ${state.state})`);
        return null;
      }

      try {

        const escrowDataResult = await this.tonClient.runMethod(addr, 'get_escrow_data');
        const status = escrowDataResult.stack.readBigNumber();
        escrowDataResult.stack.readBigNumber();
        escrowDataResult.stack.readAddress();
        escrowDataResult.stack.readAddress();
        escrowDataResult.stack.readAddress();
        const totalAmount = escrowDataResult.stack.readBigNumber();
        const publisherAmount = escrowDataResult.stack.readBigNumber();
        const deadline = escrowDataResult.stack.readBigNumber();

        const isExpiredResult = await this.tonClient.runMethod(addr, 'is_expired');
        const balanceResult = await this.tonClient.runMethod(addr, 'get_locked_balance');

        return {
          status,
          totalAmount,
          publisherAmount,
          deadline,
          isExpired: isExpiredResult.stack.readBigNumber() !== 0n,
          balance: balanceResult.stack.readBigNumber(),
        };
      } catch {

        this.logger.log(`Falling back to Tact getter names for ${contractAddress}`);
        const statusResult = await this.tonClient.runMethod(addr, 'status');
        const totalAmountResult = await this.tonClient.runMethod(addr, 'totalAmount');
        const publisherAmountResult = await this.tonClient.runMethod(addr, 'publisherAmount');
        const deadlineResult = await this.tonClient.runMethod(addr, 'deadline');
        const isExpiredResult = await this.tonClient.runMethod(addr, 'isExpired');
        const balanceResult = await this.tonClient.runMethod(addr, 'lockedBalance');

        return {
          status: statusResult.stack.readBigNumber(),
          totalAmount: totalAmountResult.stack.readBigNumber(),
          publisherAmount: publisherAmountResult.stack.readBigNumber(),
          deadline: deadlineResult.stack.readBigNumber(),
          isExpired: isExpiredResult.stack.readBoolean(),
          balance: balanceResult.stack.readBigNumber(),
        };
      }
    } catch (error) {
      this.logger.error(`Failed to get contract status: ${(error as Error).message}`);
      return null;
    }
  }

  async isContractFunded(contractAddress: string): Promise<boolean> {
    const status = await this.getContractStatus(contractAddress);
    return status !== null && status.status >= STATUS_FUNDED;
  }

  async sendFromPlatformWallet(
    toAddress: string,
    amount: bigint,
    memo?: string,
  ): Promise<{ hash: string; success: boolean }> {
    this.logger.log(`Sending ${fromNano(amount)} TON to ${toAddress} from platform wallet`);

    if (!this.platformKeypair) {
      throw new Error('Platform wallet not initialized');
    }

    try {
      const platformWallet = WalletContractV4.create({
        publicKey: this.platformKeypair.publicKey,
        workchain: 0,
      });

      const contract = this.tonClient.open(platformWallet);

      let seqno: number;
      try {
        seqno = await contract.getSeqno();
      } catch {
        seqno = 0;
      }

      let body: Cell | undefined;
      if (memo) {
        body = beginCell()
          .storeUint(0, 32)
          .storeStringTail(memo)
          .endCell();
      }

      await contract.sendTransfer({
        secretKey: this.platformKeypair.secretKey,
        seqno,
        messages: [
          internal({
            to: Address.parse(toAddress),
            value: amount,
            body,
            bounce: false,
          }),
        ],
      });

      const txHash = crypto
        .createHash('sha256')
        .update(`platform:${toAddress}:${amount}:${Date.now()}`)
        .digest('hex');

      this.logger.log(`Platform transfer sent: ${fromNano(amount)} TON to ${toAddress}`);

      return { hash: txHash, success: true };
    } catch (error) {
      this.logger.error(`Failed to send from platform wallet: ${(error as Error).message}`);
      throw error;
    }
  }

  getStatusString(status: bigint): string {
    const statusMap: Record<string, string> = {
      '0': 'PENDING',
      '1': 'FUNDED',
      '2': 'RELEASED',
      '3': 'REFUNDED',
      '4': 'DISPUTED',
    };
    return statusMap[status.toString()] || 'UNKNOWN';
  }
}
