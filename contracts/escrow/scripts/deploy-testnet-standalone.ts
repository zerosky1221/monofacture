/**
 * MONOFACTURE ESCROW - Standalone Testnet Deployment Script
 * 
 * This script deploys the MonofactureEscrow contract to TON testnet
 * WITHOUT Blueprint's interactive prompts (can be run from CI/CD or Claude Code).
 * 
 * Usage:
 *   npx ts-node scripts/deploy-testnet-standalone.ts
 * 
 * Prerequisites:
 *   1. Set DEPLOY_MNEMONIC env var (24-word TON mnemonic) OR it will generate one
 *   2. Fund the deployer wallet with testnet TON from @testgiver_ton_bot
 *   3. Optionally set TON_API_KEY for toncenter
 */

import { TonClient, WalletContractV4, internal, toNano, fromNano } from '@ton/ton';
import { mnemonicToPrivateKey, mnemonicNew, mnemonicValidate } from '@ton/crypto';
import { Address, beginCell } from '@ton/core';
import { MonofactureEscrow } from '../build/MonofactureEscrow/MonofactureEscrow_MonofactureEscrow';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load env from monorepo root
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const TESTNET_ENDPOINT = 'https://testnet.toncenter.com/api/v2/jsonRPC';
const TESTNET_API_KEY = process.env.TON_API_KEY || '';
const PLATFORM_WALLET = process.env.TON_PLATFORM_WALLET_ADDRESS || '';

// Colors for console output
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
  log(BOLD + CYAN, '  MONOFACTURE ESCROW — TESTNET DEPLOYMENT');
  log(BOLD + CYAN, '═'.repeat(65) + '\n');

  // ═══ Step 1: Initialize TON Client ═══
  log(BLUE, '📡 Connecting to TON Testnet...');
  const client = new TonClient({
    endpoint: TESTNET_ENDPOINT,
    apiKey: TESTNET_API_KEY || undefined,
  });
  log(GREEN, '✅ Connected to testnet.toncenter.com\n');

  // ═══ Step 2: Setup deployer wallet ═══
  log(BLUE, '🔑 Setting up deployer wallet...');
  
  let mnemonic: string[];
  const envMnemonic = process.env.DEPLOY_MNEMONIC;
  
  if (envMnemonic && envMnemonic.split(' ').length === 24) {
    mnemonic = envMnemonic.split(' ');
    log(GREEN, '   Using mnemonic from DEPLOY_MNEMONIC env var');
  } else {
    // Generate new mnemonic
    log(YELLOW, '   No valid DEPLOY_MNEMONIC found, generating new wallet...');
    mnemonic = await mnemonicNew(24);
    log(YELLOW, `\n   ⚠️  SAVE THIS MNEMONIC (24 words):`);
    log(BOLD + RED, `   ${mnemonic.join(' ')}`);
    log(YELLOW, `   ⚠️  Add to .env as: DEPLOY_MNEMONIC=${mnemonic.join(' ')}\n`);
  }

  const isValid = await mnemonicValidate(mnemonic);
  if (!isValid) {
    log(RED, '❌ Invalid mnemonic! Please provide a valid 24-word TON mnemonic.');
    process.exit(1);
  }

  const keypair = await mnemonicToPrivateKey(mnemonic);
  const deployerWallet = WalletContractV4.create({
    publicKey: keypair.publicKey,
    workchain: 0,
  });

  const deployerAddress = deployerWallet.address.toString({ 
    bounceable: false, 
    testOnly: true 
  });
  const deployerAddressBounce = deployerWallet.address.toString({ 
    bounceable: true, 
    testOnly: true 
  });

  log(GREEN, `✅ Deployer wallet: ${deployerAddress}`);
  log(CYAN, `   Explorer: https://testnet.tonviewer.com/${deployerAddress}`);

  // ═══ Step 3: Check balance ═══
  log(BLUE, '\n💰 Checking deployer balance...');
  let balance = await client.getBalance(deployerWallet.address);
  log(GREEN, `   Balance: ${fromNano(balance)} TON`);

  if (balance < toNano('0.2')) {
    log(YELLOW, '\n' + '─'.repeat(65));
    log(BOLD + YELLOW, '  ⚠️  INSUFFICIENT BALANCE — NEED AT LEAST 0.2 TON');
    log(YELLOW, '─'.repeat(65));
    log(YELLOW, '\n  Fund this address with testnet TON:');
    log(BOLD + CYAN, `  ${deployerAddress}`);
    log(YELLOW, '\n  Options to get testnet TON:');
    log(YELLOW, '  1. Telegram bot: @testgiver_ton_bot — send the address above');
    log(YELLOW, '  2. TON Console faucet: https://faucet.tonconsole.com');
    log(YELLOW, '  3. Testnet toncenter: https://testnet.toncenter.com');
    
    log(YELLOW, '\n  Waiting for funds (polling every 10s)...');
    
    // Poll for balance
    let attempts = 0;
    const maxAttempts = 60; // 10 minutes
    while (balance < toNano('0.2') && attempts < maxAttempts) {
      await sleep(10000);
      balance = await client.getBalance(deployerWallet.address);
      attempts++;
      if (attempts % 3 === 0) {
        log(YELLOW, `   Still waiting... Balance: ${fromNano(balance)} TON (attempt ${attempts}/${maxAttempts})`);
      }
    }

    if (balance < toNano('0.2')) {
      log(RED, '\n❌ Timeout waiting for funds. Please fund the wallet and run again.');
      
      // Save wallet info for reuse
      const walletInfo = {
        address: deployerAddress,
        addressBounce: deployerAddressBounce,
        mnemonic: mnemonic.join(' '),
        note: 'Fund this address and run deploy again',
      };
      const walletPath = path.resolve(__dirname, '../deploy-wallet.json');
      fs.writeFileSync(walletPath, JSON.stringify(walletInfo, null, 2));
      log(YELLOW, `   Wallet info saved to: ${walletPath}`);
      
      process.exit(1);
    }

    log(GREEN, `\n✅ Funds received! Balance: ${fromNano(balance)} TON`);
  }

  // ═══ Step 4: Deploy contract ═══
  log(BLUE, '\n🚀 Deploying MonofactureEscrow contract...\n');

  const dealId = BigInt(Date.now());
  
  // Use different addresses for realism (but deployer for platform for testing)
  const advertiserAddr = deployerWallet.address;
  const publisherAddr = deployerWallet.address;
  const platformAddr = PLATFORM_WALLET 
    ? Address.parse(PLATFORM_WALLET) 
    : deployerWallet.address;

  const totalAmount = toNano('1.05');       // 1.05 TON (price + 5% fee)
  const publisherAmount = toNano('1');       // 1 TON to publisher
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60); // 7 days

  log(CYAN, '   Parameters:');
  log(CYAN, `   Deal ID:          ${dealId}`);
  log(CYAN, `   Advertiser:       ${advertiserAddr.toString({ testOnly: true })}`);
  log(CYAN, `   Publisher:        ${publisherAddr.toString({ testOnly: true })}`);
  log(CYAN, `   Platform Wallet:  ${platformAddr.toString({ testOnly: true })}`);
  log(CYAN, `   Total Amount:     1.05 TON`);
  log(CYAN, `   Publisher Amount: 1.00 TON`);
  log(CYAN, `   Platform Fee:     0.05 TON`);
  log(CYAN, `   Deadline:         ${new Date(Number(deadline) * 1000).toISOString()}\n`);

  // Create contract instance
  const escrowContract = MonofactureEscrow.fromAddress(
    (await MonofactureEscrow.fromInit(
      dealId,
      advertiserAddr,
      publisherAddr,
      platformAddr,
      totalAmount,
      publisherAmount,
      deadline,
    )).address
  );

  // Get init data for deployment
  const contractInit = await MonofactureEscrow.fromInit(
    dealId,
    advertiserAddr,
    publisherAddr,
    platformAddr,
    totalAmount,
    publisherAmount,
    deadline,
  );

  const contractAddress = contractInit.address.toString({ 
    bounceable: true, 
    testOnly: true 
  });
  
  log(GREEN, `   Contract address: ${contractAddress}`);
  log(CYAN, `   Explorer: https://testnet.tonviewer.com/${contractAddress}\n`);

  // Open deployer wallet
  const openedWallet = client.open(deployerWallet);
  
  // Get seqno
  let seqno: number;
  try {
    seqno = await openedWallet.getSeqno();
  } catch {
    seqno = 0;
  }
  log(CYAN, `   Deployer seqno: ${seqno}`);

  // Build Deploy message body (opcode from Tact Deployable trait)
  const deployBody = beginCell()
    .storeUint(2490013878, 32) // Deploy opcode
    .storeUint(0, 64) // queryId
    .endCell();

  // Send deploy transaction
  log(BLUE, '   Sending deployment transaction...');
  await openedWallet.sendTransfer({
    secretKey: keypair.secretKey,
    seqno,
    messages: [
      internal({
        to: contractInit.address,
        value: toNano('0.1'), // Gas for deployment + min storage
        init: {
          code: contractInit.init!.code,
          data: contractInit.init!.data,
        },
        body: deployBody,
        bounce: false,
      }),
    ],
  });

  log(YELLOW, '   Transaction sent. Waiting for confirmation...');

  // Wait for deployment
  let deployed = false;
  for (let i = 0; i < 30; i++) {
    await sleep(3000);
    try {
      const state = await client.getContractState(contractInit.address);
      if (state.state === 'active') {
        deployed = true;
        break;
      }
      if (i % 3 === 0) {
        log(YELLOW, `   Waiting... (${i * 3}s, state: ${state.state})`);
      }
    } catch (e) {
      // Contract not found yet
    }
  }

  if (!deployed) {
    log(RED, '\n❌ Deployment timeout. The contract may still be deploying.');
    log(YELLOW, `   Check: https://testnet.tonviewer.com/${contractAddress}`);
    
    // Save info anyway
    saveDeploymentInfo(contractAddress, dealId, deadline);
    process.exit(1);
  }

  log(GREEN, '\n✅ Contract deployed successfully!\n');

  // ═══ Step 5: Verify contract state ═══
  log(BLUE, '🔍 Verifying contract state...');
  await sleep(2000);

  try {
    const openedContract = client.open(
      MonofactureEscrow.fromAddress(contractInit.address)
    );

    const status = await openedContract.getStatus();
    const escrowData = await openedContract.getEscrowData();
    const lockedBalance = await openedContract.getLockedBalance();

    log(GREEN, '\n   Contract State:');
    log(GREEN, `   Status:           ${status} (0=PENDING ✓)`);
    log(GREEN, `   Deal ID:          ${escrowData.dealId}`);
    log(GREEN, `   Total Amount:     ${fromNano(escrowData.totalAmount)} TON`);
    log(GREEN, `   Publisher Amount: ${fromNano(escrowData.publisherAmount)} TON`);
    log(GREEN, `   Platform Fee:     ${fromNano(escrowData.totalAmount - escrowData.publisherAmount)} TON`);
    log(GREEN, `   Locked Balance:   ${fromNano(lockedBalance)} TON`);
    log(GREEN, `   Deadline:         ${new Date(Number(escrowData.deadline) * 1000).toISOString()}`);
    log(GREEN, `   Advertiser:       ${escrowData.advertiser.toString({ testOnly: true })}`);
    log(GREEN, `   Publisher:        ${escrowData.publisher.toString({ testOnly: true })}`);
    log(GREEN, `   Platform:         ${escrowData.platformWallet.toString({ testOnly: true })}`);
  } catch (error) {
    log(YELLOW, `   ⚠️  Could not read contract state yet: ${(error as Error).message}`);
    log(YELLOW, '   This is normal — try again in a few seconds.');
  }

  // ═══ Step 6: Save deployment info ═══
  saveDeploymentInfo(contractAddress, dealId, deadline);

  log(BOLD + GREEN, '\n' + '═'.repeat(65));
  log(BOLD + GREEN, '  ✅ DEPLOYMENT COMPLETE');
  log(BOLD + GREEN, '═'.repeat(65));
  log(CYAN, `\n  Contract:  ${contractAddress}`);
  log(CYAN, `  Explorer:  https://testnet.tonviewer.com/${contractAddress}`);
  log(CYAN, `  Deal ID:   ${dealId}`);
  log(CYAN, `  Deployer:  ${deployerAddress}\n`);

  log(YELLOW, '  Next steps:');
  log(YELLOW, '  1. Test funding: Send 1.05 TON from advertiser to contract address');
  log(YELLOW, '  2. Test release: Send Release message from platform wallet');
  log(YELLOW, '  3. Verify: Check balances on tonviewer\n');
}

function saveDeploymentInfo(contractAddress: string, dealId: bigint, deadline: bigint) {
  const deploymentInfo = {
    network: 'testnet',
    contractAddress,
    dealId: dealId.toString(),
    deadline: new Date(Number(deadline) * 1000).toISOString(),
    deployedAt: new Date().toISOString(),
    explorerUrl: `https://testnet.tonviewer.com/${contractAddress}`,
    platformWallet: PLATFORM_WALLET || 'deployer (same address)',
  };

  const deployPath = path.resolve(__dirname, '../deployment-testnet.json');
  fs.writeFileSync(deployPath, JSON.stringify(deploymentInfo, null, 2));
  log(CYAN, `\n   📁 Deployment info saved to: deployment-testnet.json`);
}

main().catch((error) => {
  log(RED, '\n❌ Deployment failed:', error.message);
  console.error(error);
  process.exit(1);
});
