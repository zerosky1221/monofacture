
import { Address, Cell, beginCell } from '@ton/core';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

import {
  TolkEscrowDeal,
  EscrowStatus,
  OP,
  buildTolkEscrowDataCell,
  type TolkEscrowDealConfig,
} from '../../../contracts/TolkEscrowDeal';

import {
  EscrowDeal,
  OP as FUNC_OP,
  buildEscrowDataCell,
  type EscrowDealConfig,
} from '../../../contracts/EscrowDeal';

function randomAddress(): Address {
  return new Address(0, Buffer.alloc(32, Math.floor(Math.random() * 256)));
}

function dealIdToHash(dealId: string): bigint {
  const hash = crypto.createHash('sha256').update(dealId).digest('hex');
  return BigInt('0x' + hash);
}

describe('Tolk Escrow Integration', () => {
  const advertiser = randomAddress();
  const publisher = randomAddress();
  const platformWallet = randomAddress();
  const dealIdHash = dealIdToHash('test-deal-001');
  const totalAmount = 1_000_000_000n;
  const publisherAmount = 950_000_000n;
  const deadline = Math.floor(Date.now() / 1000) + 86400;

  const tolkConfig: TolkEscrowDealConfig = {
    dealId: dealIdHash,
    advertiser,
    publisher,
    platformWallet,
    totalAmount,
    publisherAmount,
    deadline,
  };

  const funcConfig: EscrowDealConfig = {
    dealId: dealIdHash,
    advertiser,
    publisher,
    platformWallet,
    totalAmount,
    publisherAmount,
    deadline,
  };

  describe('Contract BOC Files', () => {
    it('should find Tolk BOC in local contracts directory', () => {
      const localPath = path.join(__dirname, '../../../contracts/tolk/escrow-deal.boc');
      expect(fs.existsSync(localPath)).toBe(true);
    });

    it('should find Tolk BOC in contracts workspace', () => {
      const workspacePath = path.join(__dirname, '../../../../../../contracts/escrow/build/tolk-escrow-deal.boc');
      expect(fs.existsSync(workspacePath)).toBe(true);
    });

    it('should load valid Cell from Tolk BOC', () => {
      const localPath = path.join(__dirname, '../../../contracts/tolk/escrow-deal.boc');
      const boc = fs.readFileSync(localPath);
      const code = Cell.fromBoc(boc)[0];
      expect(code).toBeDefined();
      expect(code.bits.length).toBeGreaterThan(0);
    });

    it('should produce identical code from both BOC locations', () => {
      const localPath = path.join(__dirname, '../../../contracts/tolk/escrow-deal.boc');
      const workspacePath = path.join(__dirname, '../../../../../../contracts/escrow/build/tolk-escrow-deal.boc');

      const localCode = Cell.fromBoc(fs.readFileSync(localPath))[0];
      const wsCode = Cell.fromBoc(fs.readFileSync(workspacePath))[0];

      expect(localCode.hash().toString('hex')).toBe(wsCode.hash().toString('hex'));
    });

    it('should still have legacy FunC BOC available', () => {
      const funcPath = path.join(__dirname, '../../../contracts/escrow-deal.boc');
      expect(fs.existsSync(funcPath)).toBe(true);
    });
  });

  describe('Op-Code Compatibility', () => {
    it('should have matching FUND op-codes', () => {
      expect(OP.FUND).toBe(FUNC_OP.FUND);
      expect(OP.FUND).toBe(0x746f6e46);
    });

    it('should have matching RELEASE op-codes', () => {
      expect(OP.RELEASE).toBe(FUNC_OP.RELEASE);
      expect(OP.RELEASE).toBe(0x72656c73);
    });

    it('should have matching REFUND op-codes', () => {
      expect(OP.REFUND).toBe(FUNC_OP.REFUND);
      expect(OP.REFUND).toBe(0x72656675);
    });

    it('should have matching DISPUTE op-codes', () => {
      expect(OP.DISPUTE).toBe(FUNC_OP.DISPUTE);
      expect(OP.DISPUTE).toBe(0x64697370);
    });

    it('should have matching RESOLVE op-codes', () => {
      expect(OP.RESOLVE).toBe(FUNC_OP.RESOLVE);
      expect(OP.RESOLVE).toBe(0x7265736f);
    });

    it('should have matching EXTEND op-codes', () => {
      expect(OP.EXTEND).toBe(FUNC_OP.EXTEND);
      expect(OP.EXTEND).toBe(0x65787464);
    });
  });

  describe('Data Cell Building', () => {
    it('should build valid Tolk data cell', () => {
      const cell = buildTolkEscrowDataCell(tolkConfig);
      expect(cell).toBeDefined();
      expect(cell.refs.length).toBe(1);
    });

    it('should store status as uint8 in main cell', () => {
      const cell = buildTolkEscrowDataCell(tolkConfig);
      const slice = cell.beginParse();
      const status = slice.loadUint(8);
      expect(status).toBe(EscrowStatus.PENDING);
    });

    it('should store dealId as uint256 in main cell', () => {
      const cell = buildTolkEscrowDataCell(tolkConfig);
      const slice = cell.beginParse();
      slice.loadUint(8);
      const dealId = slice.loadUintBig(256);
      expect(dealId).toBe(dealIdHash);
    });

    it('should store advertiser and publisher addresses in main cell', () => {
      const cell = buildTolkEscrowDataCell(tolkConfig);
      const slice = cell.beginParse();
      slice.loadUint(8);
      slice.loadUintBig(256);
      const storedAdvertiser = slice.loadAddress();
      const storedPublisher = slice.loadAddress();
      expect(storedAdvertiser.equals(advertiser)).toBe(true);
      expect(storedPublisher.equals(publisher)).toBe(true);
    });

    it('should store inner data in ref cell', () => {
      const cell = buildTolkEscrowDataCell(tolkConfig);
      const innerSlice = cell.refs[0].beginParse();

      const storedPlatform = innerSlice.loadAddress();
      const storedTotal = innerSlice.loadCoins();
      const storedPublisher = innerSlice.loadCoins();
      const storedDeadline = innerSlice.loadUint(32);
      const storedCreatedAt = innerSlice.loadUint(32);
      const storedFundedAt = innerSlice.loadUint(32);

      expect(storedPlatform.equals(platformWallet)).toBe(true);
      expect(storedTotal).toBe(totalAmount);
      expect(storedPublisher).toBe(publisherAmount);
      expect(storedDeadline).toBe(deadline);
      expect(storedCreatedAt).toBeGreaterThan(0);
      expect(storedFundedAt).toBe(0);
    });

    it('should have same 2-cell layout as FunC wrapper', () => {
      const tolkCell = buildTolkEscrowDataCell(tolkConfig);
      const funcCell = buildEscrowDataCell(funcConfig);

      expect(tolkCell.refs.length).toBe(funcCell.refs.length);
      expect(tolkCell.refs.length).toBe(1);

      expect(tolkCell.bits.length).toBe(funcCell.bits.length);
    });
  });

  describe('Contract Address Computation', () => {
    it('should compute deterministic address', () => {
      const bocPath = path.join(__dirname, '../../../contracts/tolk/escrow-deal.boc');
      const code = Cell.fromBoc(fs.readFileSync(bocPath))[0];

      const contract1 = TolkEscrowDeal.createFromConfig(tolkConfig, code);
      const contract2 = TolkEscrowDeal.createFromConfig(tolkConfig, code);

      expect(contract1.address.equals(contract2.address)).toBe(true);
    });

    it('should produce different address for different dealId', () => {
      const bocPath = path.join(__dirname, '../../../contracts/tolk/escrow-deal.boc');
      const code = Cell.fromBoc(fs.readFileSync(bocPath))[0];

      const config2 = { ...tolkConfig, dealId: dealIdToHash('test-deal-002') };

      const contract1 = TolkEscrowDeal.createFromConfig(tolkConfig, code);
      const contract2 = TolkEscrowDeal.createFromConfig(config2, code);

      expect(contract1.address.equals(contract2.address)).toBe(false);
    });

    it('should produce different address for different amounts', () => {
      const bocPath = path.join(__dirname, '../../../contracts/tolk/escrow-deal.boc');
      const code = Cell.fromBoc(fs.readFileSync(bocPath))[0];

      const config2 = { ...tolkConfig, totalAmount: 2_000_000_000n };

      const contract1 = TolkEscrowDeal.createFromConfig(tolkConfig, code);
      const contract2 = TolkEscrowDeal.createFromConfig(config2, code);

      expect(contract1.address.equals(contract2.address)).toBe(false);
    });

    it('should include init state_init when created from config', () => {
      const bocPath = path.join(__dirname, '../../../contracts/tolk/escrow-deal.boc');
      const code = Cell.fromBoc(fs.readFileSync(bocPath))[0];

      const contract = TolkEscrowDeal.createFromConfig(tolkConfig, code);

      expect(contract.init).toBeDefined();
      expect(contract.init!.code).toBeDefined();
      expect(contract.init!.data).toBeDefined();
    });

    it('should NOT include init when created from address', () => {
      const contract = TolkEscrowDeal.createFromAddress(advertiser);
      expect(contract.init).toBeUndefined();
    });
  });

  describe('EscrowStatus Enum', () => {
    it('should have correct status values', () => {
      expect(EscrowStatus.PENDING).toBe(0);
      expect(EscrowStatus.FUNDED).toBe(1);
      expect(EscrowStatus.RELEASED).toBe(2);
      expect(EscrowStatus.REFUNDED).toBe(3);
      expect(EscrowStatus.DISPUTED).toBe(4);
    });
  });

  describe('Message Body Building', () => {
    it('should build correct release message body', () => {
      const body = beginCell()
        .storeUint(OP.RELEASE, 32)
        .storeUint(12345n, 64)
        .endCell();

      const slice = body.beginParse();
      expect(slice.loadUint(32)).toBe(OP.RELEASE);
      expect(slice.loadUintBig(64)).toBe(12345n);
    });

    it('should build correct refund message body', () => {
      const body = beginCell()
        .storeUint(OP.REFUND, 32)
        .storeUint(0n, 64)
        .endCell();

      const slice = body.beginParse();
      expect(slice.loadUint(32)).toBe(OP.REFUND);
      expect(slice.loadUintBig(64)).toBe(0n);
    });

    it('should build correct resolve message body with release flag', () => {
      const body = beginCell()
        .storeUint(OP.RESOLVE, 32)
        .storeUint(0n, 64)
        .storeBit(true)
        .endCell();

      const slice = body.beginParse();
      expect(slice.loadUint(32)).toBe(OP.RESOLVE);
      slice.loadUintBig(64);
      expect(slice.loadBit()).toBe(true);
    });

    it('should build correct extend message body', () => {
      const newDeadline = Math.floor(Date.now() / 1000) + 172800;
      const body = beginCell()
        .storeUint(OP.EXTEND, 32)
        .storeUint(0n, 64)
        .storeUint(newDeadline, 32)
        .endCell();

      const slice = body.beginParse();
      expect(slice.loadUint(32)).toBe(OP.EXTEND);
      slice.loadUintBig(64);
      expect(slice.loadUint(32)).toBe(newDeadline);
    });
  });

  describe('DealId Hash Function', () => {
    it('should produce consistent hash for same input', () => {
      const hash1 = dealIdToHash('deal-123');
      const hash2 = dealIdToHash('deal-123');
      expect(hash1).toBe(hash2);
    });

    it('should produce different hash for different inputs', () => {
      const hash1 = dealIdToHash('deal-123');
      const hash2 = dealIdToHash('deal-456');
      expect(hash1).not.toBe(hash2);
    });

    it('should produce 256-bit hash (fits in uint256)', () => {
      const hash = dealIdToHash('test-deal');
      expect(hash).toBeGreaterThan(0n);
      expect(hash).toBeLessThan(2n ** 256n);
    });
  });
});
