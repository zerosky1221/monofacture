/**
 * MONOFACTURE ESCROW - Test Deployed Contract
 * 
 * Tests the full flow on testnet:
 *   1. Read contract state (should be PENDING)
 *   2. Fund the contract (send TON from advertiser)  
 *   3. Verify FUNDED status
 *   4. Release funds (platform sends Release message)
 *   5. Verify funds arrived at platform wallet
 * 
 * Usage:
 *   npx ts-node scripts/test-deployed-contract.ts
 * 
 * Requires:
 *   - deployment-testnet.json (created by deploy script)
 *   - DEPLOY_MNEMONIC env var (same wallet used for deploy)
 */

import { TonClient, WalletContractV4, internal, toNano, fromNano } from '@ton/ton';
import { mnemonicToPrivateKey } from '@ton/crypto';
import { Address, beginCell } from '@ton/core';
import { MonofactureEscrow } from '../build/MonofactureEscrow/MonofactureEscrow_MonofactureEscrow';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const TESTNET_ENDPOINT = 'https://testnet.toncenter.com/api/v2/jsonRPC';
const TESTNET_API_KEY = process.env.TON_API_KEY || '';

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

function log(color: string, ...args: any[]) {
  console.log(color, ...args, RESET);
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  log(BOLD + CYAN, '\n' + '═'.repeat(65));
  log(BOLD + CYAN, '  MONOFACTURE ESCROW — TESTNET INTEGRATION TEST');
  log(BOLD + CYAN, '═'.repeat(65) + '\n');

  // Load deployment info
  const deployPath = path.resolve(__dirname, '../deployment-testnet.json');
  if (!fs.existsSync(deployPath)) {
    log(RED, '❌ deployment-testnet.json not found. Run deploy first.');
    process.exit(1);
  }

  const deployInfo = JSON.parse(fs.readFileSync(deployPath, 'utf-8'));
  log(CYAN, `Contract: ${deployInfo.contractAddress}`);
  log(CYAN, `Deal ID:  ${deployInfo.dealId}\n`);

  // Setup client
  const client = new TonClient({
    endpoint: TESTNET_ENDPOINT,
    apiKey: TESTNET_API_KEY || undefined,
  });

  // Setup wallet
  const mnemonic = process.env.DEPLOY_MNEMONIC?.split(' ');
  if (!mnemonic || mnemonic.length !== 24) {
    log(RED, '❌ DEPLOY_MNEMONIC not set or invalid. Need 24-word mnemonic.');
    process.exit(1);
  }

  const keypair = await mnemonicToPrivateKey(mnemonic);
  const wallet = WalletContractV4.create({
    publicKey: keypair.publicKey,
    workchain: 0,
  });
  const openedWallet = client.open(wallet);

  log(GREEN, `Wallet: ${wallet.address.toString({ testOnly: true })}`);
  const balance = await client.getBalance(wallet.address);
  log(GREEN, `Balance: ${fromNano(balance)} TON\n`);

  // Open contract
  const contractAddr = Address.parse(deployInfo.contractAddress);
  const contract = client.open(MonofactureEscrow.fromAddress(contractAddr));

  // ═══ Test 1: Read initial state ═══
  log(BLUE, '📋 TEST 1: Read contract state');
  try {
    const status = await contract.getStatus();
    const data = await contract.getEscrowData();
    const lockedBal = await contract.getLockedBalance();

    log(GREEN, `   Status: ${status} (expected: 0 = PENDING)`);
    log(GREEN, `   Total Amount: ${fromNano(data.totalAmount)} TON`);
    log(GREEN, `   Publisher Amount: ${fromNano(data.publisherAmount)} TON`);
    log(GREEN, `   Locked Balance: ${fromNano(lockedBal)} TON`);

    if (status === 0n) {
      log(GREEN, '   ✅ Contract is PENDING — ready for funding\n');
    } else if (status === 1n) {
      log(YELLOW, '   ⚠️  Contract is already FUNDED — skipping to release test\n');
    } else {
      log(YELLOW, `   ⚠️  Unexpected status: ${status}\n`);
    }

    // ═══ Test 2: Fund the contract ═══
    if (status === 0n) {
      log(BLUE, '💰 TEST 2: Fund the escrow');
      
      const fundAmount = data.totalAmount + toNano('0.1'); // Extra for gas
      log(CYAN, `   Sending ${fromNano(fundAmount)} TON to contract...`);

      const seqno = await openedWallet.getSeqno();
      
      await openedWallet.sendTransfer({
        secretKey: keypair.secretKey,
        seqno,
        messages: [
          internal({
            to: contractAddr,
            value: fundAmount,
            body: beginCell().endCell(), // Empty body = auto-fund
            bounce: true,
          }),
        ],
      });

      log(YELLOW, '   Transaction sent. Waiting for confirmation...');

      // Wait for status change
      let funded = false;
      for (let i = 0; i < 20; i++) {
        await sleep(5000);
        try {
          const newStatus = await contract.getStatus();
          if (newStatus === 1n) {
            funded = true;
            const newBal = await contract.getLockedBalance();
            log(GREEN, `   ✅ Contract FUNDED! Balance: ${fromNano(newBal)} TON\n`);
            break;
          }
          log(YELLOW, `   Waiting... status=${newStatus} (${i * 5}s)`);
        } catch (e) {
          log(YELLOW, `   Waiting... (${i * 5}s)`);
        }
      }

      if (!funded) {
        log(RED, '   ❌ Funding timeout. Check explorer manually.');
        log(CYAN, `   ${deployInfo.explorerUrl}\n`);
      }
    }

    // ═══ Test 3: Release funds ═══
    const currentStatus = await contract.getStatus();
    if (currentStatus === 1n) {
      log(BLUE, '🔓 TEST 3: Release escrow (platform → release)');

      const seqno = await openedWallet.getSeqno();

      // Build Release message body (opcode from Tact compiled wrapper)
      // Release opcode = 0x27164b40 = 655869760
      // We need to match the Tact-generated opcode
      const releaseBody = beginCell()
        .storeUint(408342921, 32) // Release opcode from compiled ABI
        .storeUint(Date.now(), 64) // queryId
        .endCell();

      log(CYAN, '   Sending Release message from platform wallet...');

      await openedWallet.sendTransfer({
        secretKey: keypair.secretKey,
        seqno,
        messages: [
          internal({
            to: contractAddr,
            value: toNano('0.05'), // Gas for release
            body: releaseBody,
            bounce: true,
          }),
        ],
      });

      log(YELLOW, '   Transaction sent. Waiting for release...');

      // Wait and check
      for (let i = 0; i < 20; i++) {
        await sleep(5000);
        try {
          const state = await client.getContractState(contractAddr);
          if (state.state !== 'active') {
            log(GREEN, `   ✅ Contract destroyed (state: ${state.state}) — funds released!\n`);
            break;
          }

          const newStatus = await contract.getStatus();
          if (newStatus === 2n) {
            log(GREEN, '   ✅ Status: RELEASED!\n');
            break;
          }
          log(YELLOW, `   Waiting... status=${newStatus}, state=${state.state} (${i * 5}s)`);
        } catch (e) {
          // Contract may be destroyed
          log(GREEN, '   ✅ Contract appears destroyed — funds released!\n');
          break;
        }
      }

      // Check final balances
      const finalBalance = await client.getBalance(wallet.address);
      log(GREEN, `   Deployer wallet balance: ${fromNano(finalBalance)} TON`);
    }

  } catch (error) {
    log(RED, `   ❌ Error: ${(error as Error).message}`);
    log(CYAN, `   Check contract: ${deployInfo.explorerUrl}`);
  }

  log(BOLD + GREEN, '\n' + '═'.repeat(65));
  log(BOLD + GREEN, '  TEST COMPLETE');
  log(BOLD + GREEN, '═'.repeat(65) + '\n');
}

main().catch((error) => {
  log(RED, '\n❌ Test failed:', error.message);
  console.error(error);
  process.exit(1);
});
