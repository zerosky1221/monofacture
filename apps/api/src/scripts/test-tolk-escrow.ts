import { Address, Cell, beginCell } from '@ton/core';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

import {
  TolkEscrowDeal,
  EscrowStatus,
  OP,
  buildTolkEscrowDataCell,
  generateTonConnectPayload,
  generatePaymentDeepLink,
  type TolkEscrowDealConfig,
} from '../contracts/TolkEscrowDeal';

function dealIdToHash(dealId: string): bigint {
  const hash = crypto.createHash('sha256').update(dealId).digest('hex');
  return BigInt('0x' + hash);
}

function check(label: string, condition: boolean) {
  if (condition) {
    console.log(`  [PASS] ${label}`);
  } else {
    console.error(`  [FAIL] ${label}`);
    process.exitCode = 1;
  }
}

async function main() {
  console.log('=== Tolk Escrow Contract v4.0 - Manual Test ===\n');

  console.log('1. Loading Tolk contract BOC...');
  const localPath = path.join(__dirname, '../contracts/tolk/escrow-deal.boc');
  const wsPath = path.join(__dirname, '../../../../contracts/escrow/build/tolk-escrow-deal.boc');

  const localExists = fs.existsSync(localPath);
  const wsExists = fs.existsSync(wsPath);
  check('Local BOC exists at ' + localPath, localExists);
  check('Workspace BOC exists at ' + wsPath, wsExists);

  if (!localExists && !wsExists) {
    console.error('\nNo BOC file found. Run: cd contracts/escrow && npm run compile:tolk');
    process.exit(1);
  }

  const bocPath = localExists ? localPath : wsPath;
  const code = Cell.fromBoc(fs.readFileSync(bocPath))[0];
  check('BOC loaded successfully', code.bits.length > 0);
  console.log(`   Code hash: ${code.hash().toString('hex').toUpperCase()}`);

  console.log('\n2. Building contract data cell...');
  const testConfig: TolkEscrowDealConfig = {
    dealId: dealIdToHash('manual-test-deal-001'),
    advertiser: Address.parse('EQDtFpEwcFAEcRe5mLVh2N6C0x-_hJEM7W61_JLnSF74p4q2'),
    publisher: Address.parse('EQDtFpEwcFAEcRe5mLVh2N6C0x-_hJEM7W61_JLnSF74p4q2'),
    platformWallet: Address.parse('EQDtFpEwcFAEcRe5mLVh2N6C0x-_hJEM7W61_JLnSF74p4q2'),
    totalAmount: 1_000_000_000n,
    publisherAmount: 950_000_000n,
    deadline: Math.floor(Date.now() / 1000) + 86400,
  };

  const dataCell = buildTolkEscrowDataCell(testConfig);
  check('Data cell built (2-cell layout)', dataCell.refs.length === 1);

  const mainSlice = dataCell.beginParse();
  const status = mainSlice.loadUint(8);
  const dealId = mainSlice.loadUintBig(256);
  const adv = mainSlice.loadAddress();
  const pub = mainSlice.loadAddress();
  check('Status = PENDING (0)', status === EscrowStatus.PENDING);
  check('DealId stored correctly', dealId === testConfig.dealId);
  check('Advertiser address stored', adv.equals(testConfig.advertiser));
  check('Publisher address stored', pub.equals(testConfig.publisher));

  const innerSlice = dataCell.refs[0].beginParse();
  const platform = innerSlice.loadAddress();
  const totalAmt = innerSlice.loadCoins();
  const pubAmt = innerSlice.loadCoins();
  const dl = innerSlice.loadUint(32);
  const createdAt = innerSlice.loadUint(32);
  const fundedAt = innerSlice.loadUint(32);
  check('Platform wallet in inner cell', platform.equals(testConfig.platformWallet));
  check('Total amount correct', totalAmt === testConfig.totalAmount);
  check('Publisher amount correct', pubAmt === testConfig.publisherAmount);
  check('Deadline stored', dl === testConfig.deadline);
  check('CreatedAt > 0', createdAt > 0);
  check('FundedAt = 0 (not funded)', fundedAt === 0);

  console.log('\n3. Computing contract address...');
  const contract = TolkEscrowDeal.createFromConfig(testConfig, code);
  check('Contract address computed', contract.address instanceof Address);
  console.log(`   Contract address: ${contract.address.toString({ bounceable: true, testOnly: true })}`);
  check('Init state available', contract.init !== undefined);

  const contract2 = TolkEscrowDeal.createFromConfig(testConfig, code);
  check('Address is deterministic', contract.address.equals(contract2.address));

  console.log('\n4. Verifying op-codes...');
  check('FUND = 0x746F6E46', OP.FUND === 0x746f6e46);
  check('RELEASE = 0x72656C73', OP.RELEASE === 0x72656c73);
  check('REFUND = 0x72656675', OP.REFUND === 0x72656675);
  check('DISPUTE = 0x64697370', OP.DISPUTE === 0x64697370);
  check('RESOLVE = 0x7265736F', OP.RESOLVE === 0x7265736f);
  check('EXTEND = 0x65787464', OP.EXTEND === 0x65787464);

  console.log('\n5. Building message bodies...');
  const releaseBody = beginCell()
    .storeUint(OP.RELEASE, 32)
    .storeUint(Date.now(), 64)
    .endCell();
  check('Release body bits = 96', releaseBody.bits.length === 96);

  const resolveBody = beginCell()
    .storeUint(OP.RESOLVE, 32)
    .storeUint(0n, 64)
    .storeBit(true)
    .endCell();
  check('Resolve body bits = 97', resolveBody.bits.length === 97);

  console.log('\n6. Testing helper functions...');
  const addr = contract.address.toString({ bounceable: true, testOnly: true });
  const payload = generateTonConnectPayload(addr, testConfig.totalAmount);
  check('TON Connect payload has validUntil', payload.validUntil > 0);
  check('TON Connect payload has 1 message', payload.messages.length === 1);
  check('TON Connect payload address matches', payload.messages[0].address === addr);

  const deepLink = generatePaymentDeepLink(addr, testConfig.totalAmount, 'TEST-001');
  check('Deep link starts with ton://', deepLink.startsWith('ton://transfer/'));
  check('Deep link contains address', deepLink.includes(addr));

  console.log('\n=== All manual tests completed ===');
  if (process.exitCode) {
    console.error('Some tests FAILED!');
  } else {
    console.log('All tests PASSED!');
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
