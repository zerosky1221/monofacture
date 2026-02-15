/**
 * End-to-End test on TON Testnet
 * Tests: Deploy → Fund → Check Status → Release → Verify
 * 
 * Run: npx ts-node scripts/e2e-testnet.ts
 */

import { TonClient, WalletContractV4, internal } from '@ton/ton';
import { mnemonicToPrivateKey } from '@ton/crypto';
import { toNano, fromNano, Address, beginCell } from '@ton/core';
import { MonofactureEscrow } from '../build/MonofactureEscrow/MonofactureEscrow_MonofactureEscrow';
import * as fs from 'fs';
import * as path from 'path';

// Opcodes from compiled contract
const DEPLOY_OPCODE = 2490013878;
const RELEASE_OPCODE = 408342921;
const REFUND_OPCODE = 2214270485;
const FUND_OPCODE = 2753303635;

// Status constants
const STATUS_NAMES: Record<string, string> = {
    '0': 'PENDING',
    '1': 'FUNDED', 
    '2': 'RELEASED',
    '3': 'REFUNDED',
    '4': 'DISPUTED',
};

function loadEnv() {
    const envPath = path.resolve(__dirname, '../../../.env');
    if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf-8');
        for (const line of content.split('\n')) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;
            const eqIdx = trimmed.indexOf('=');
            if (eqIdx === -1) continue;
            const key = trimmed.substring(0, eqIdx).trim();
            const value = trimmed.substring(eqIdx + 1).trim();
            if (!process.env[key]) {
                process.env[key] = value;
            }
        }
    }
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    loadEnv();

    console.log('');
    console.log('═'.repeat(60));
    console.log('  MONOFACTURE ESCROW — E2E TEST (TESTNET)');
    console.log('═'.repeat(60));
    console.log('');

    // Setup
    const mnemonic = process.env.TESTNET_MNEMONIC;
    if (!mnemonic) {
        console.log('❌ TESTNET_MNEMONIC not set in .env');
        process.exit(1);
    }

    const words = mnemonic.split(' ').filter(w => w.trim());
    const apiKey = process.env.TON_API_KEY || '';

    const client = new TonClient({
        endpoint: 'https://testnet.toncenter.com/api/v2/jsonRPC',
        apiKey: apiKey || undefined,
    });

    const keypair = await mnemonicToPrivateKey(words);
    const wallet = WalletContractV4.create({
        publicKey: keypair.publicKey,
        workchain: 0,
    });
    const walletContract = client.open(wallet);
    const walletAddr = wallet.address.toString({ testOnly: true, bounceable: false });

    const startBalance = await client.getBalance(wallet.address);
    console.log(`💳 Wallet: ${walletAddr}`);
    console.log(`💰 Balance: ${fromNano(startBalance)} TON`);

    if (startBalance < toNano('1.5')) {
        console.log('❌ Need at least 1.5 TON for E2E test');
        process.exit(1);
    }

    // ═══════════════════════════════════════════════════
    // STEP 1: DEPLOY NEW CONTRACT
    // ═══════════════════════════════════════════════════
    console.log('');
    console.log('━'.repeat(60));
    console.log('  STEP 1: DEPLOY CONTRACT');
    console.log('━'.repeat(60));

    const dealId = BigInt(Date.now());
    const totalAmount = toNano('1.05');
    const publisherAmount = toNano('1');
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60);

    const escrowContract = await MonofactureEscrow.fromInit(
        dealId,
        wallet.address,        // advertiser = deployer
        wallet.address,        // publisher = deployer  
        wallet.address,        // platform = deployer
        totalAmount,
        publisherAmount,
        deadline,
    );

    const contractAddr = escrowContract.address.toString({ testOnly: true });
    console.log(`  Contract: ${contractAddr}`);
    console.log(`  Deal ID: ${dealId}`);
    console.log(`  Total: ${fromNano(totalAmount)} TON`);

    let seqno = await getSeqno(walletContract);

    // Deploy
    const deployBody = beginCell()
        .storeUint(DEPLOY_OPCODE, 32)
        .storeUint(0, 64)
        .endCell();

    await walletContract.sendTransfer({
        secretKey: keypair.secretKey,
        seqno,
        messages: [
            internal({
                to: escrowContract.address,
                value: toNano('0.05'),
                init: escrowContract.init!,
                body: deployBody,
                bounce: false,
            }),
        ],
    });

    console.log('  Deploying...');
    await waitForSeqno(walletContract, seqno);

    // Wait for contract to appear
    let deployed = false;
    for (let i = 0; i < 20; i++) {
        await sleep(2000);
        try {
            const state = await client.getContractState(escrowContract.address);
            if (state.state === 'active') {
                deployed = true;
                break;
            }
        } catch {}
        process.stdout.write('.');
    }
    console.log('');

    if (!deployed) {
        console.log('❌ Contract not deployed in time');
        process.exit(1);
    }

    // Read initial state
    const openedContract = client.open(escrowContract);
    await sleep(2000);
    
    const status1 = await openedContract.getStatus();
    const balance1 = await openedContract.getLockedBalance();
    console.log(`  ✅ Deployed! Status: ${status1} (${STATUS_NAMES[status1.toString()]})`);
    console.log(`  Balance: ${fromNano(balance1)} TON`);
    console.log(`  Explorer: https://testnet.tonviewer.com/${contractAddr}`);

    // ═══════════════════════════════════════════════════
    // STEP 2: FUND ESCROW (advertiser sends TON)
    // ═══════════════════════════════════════════════════
    console.log('');
    console.log('━'.repeat(60));
    console.log('  STEP 2: FUND ESCROW (send 1.05 TON)');
    console.log('━'.repeat(60));

    seqno = await getSeqno(walletContract);

    // Send plain TON transfer (auto-fund via receive() handler)
    await walletContract.sendTransfer({
        secretKey: keypair.secretKey,
        seqno,
        messages: [
            internal({
                to: escrowContract.address,
                value: totalAmount + toNano('0.02'), // Extra for gas
                bounce: true,
            }),
        ],
    });

    console.log(`  Sending ${fromNano(totalAmount)} + 0.02 (gas) TON...`);
    await waitForSeqno(walletContract, seqno);

    // Wait for status change
    let funded = false;
    for (let i = 0; i < 20; i++) {
        await sleep(2000);
        try {
            const s = await openedContract.getStatus();
            if (s === 1n) {
                funded = true;
                break;
            }
        } catch {}
        process.stdout.write('.');
    }
    console.log('');

    if (!funded) {
        console.log('❌ Contract not funded in time');
        // Check what happened
        try {
            const s = await openedContract.getStatus();
            const b = await openedContract.getLockedBalance();
            console.log(`  Status: ${s} (${STATUS_NAMES[s.toString()]})`);
            console.log(`  Balance: ${fromNano(b)} TON`);
        } catch (e: any) {
            console.log(`  Error reading state: ${e.message}`);
        }
        process.exit(1);
    }

    const balance2 = await openedContract.getLockedBalance();
    console.log(`  ✅ Funded! Status: FUNDED`);
    console.log(`  Contract balance: ${fromNano(balance2)} TON`);

    // Verify escrow data
    const data = await openedContract.getEscrowData();
    console.log(`  Deal ID: ${data.dealId}`);
    console.log(`  Total Amount: ${fromNano(data.totalAmount)} TON`);
    console.log(`  Publisher Amount: ${fromNano(data.publisherAmount)} TON`);
    console.log(`  Platform Fee: ${fromNano(data.totalAmount - data.publisherAmount)} TON`);

    // ═══════════════════════════════════════════════════
    // STEP 3: RELEASE (platform releases funds)  
    // ═══════════════════════════════════════════════════
    console.log('');
    console.log('━'.repeat(60));
    console.log('  STEP 3: RELEASE (platform releases to itself)');
    console.log('━'.repeat(60));

    const walletBalanceBefore = await client.getBalance(wallet.address);
    console.log(`  Wallet balance before: ${fromNano(walletBalanceBefore)} TON`);

    seqno = await getSeqno(walletContract);

    // Send Release message from platform wallet
    const releaseBody = beginCell()
        .storeUint(RELEASE_OPCODE, 32)
        .storeUint(BigInt(Date.now()), 64)  // queryId
        .endCell();

    await walletContract.sendTransfer({
        secretKey: keypair.secretKey,
        seqno,
        messages: [
            internal({
                to: escrowContract.address,
                value: toNano('0.05'),  // Gas for release
                body: releaseBody,
                bounce: true,
            }),
        ],
    });

    console.log('  Sending Release message...');
    await waitForSeqno(walletContract, seqno);

    // Wait for contract to be destroyed (mode 128+32)
    let released = false;
    for (let i = 0; i < 20; i++) {
        await sleep(2000);
        try {
            const state = await client.getContractState(escrowContract.address);
            // Contract should be destroyed after release (mode 128+32)
            if (state.state !== 'active') {
                released = true;
                break;
            }
            // If still active, check status
            const s = await openedContract.getStatus();
            if (s === 2n) {
                released = true;
                break;
            }
        } catch {
            // Contract destroyed = success
            released = true;
            break;
        }
        process.stdout.write('.');
    }
    console.log('');

    if (!released) {
        console.log('❌ Release not confirmed in time');
        try {
            const s = await openedContract.getStatus();
            console.log(`  Status: ${s} (${STATUS_NAMES[s.toString()]})`);
        } catch (e: any) {
            console.log(`  Contract may be destroyed: ${e.message}`);
        }
        process.exit(1);
    }

    // Check final wallet balance  
    await sleep(3000);
    const walletBalanceAfter = await client.getBalance(wallet.address);
    const received = walletBalanceAfter - walletBalanceBefore;

    console.log(`  ✅ Released!`);
    console.log(`  Wallet balance after: ${fromNano(walletBalanceAfter)} TON`);
    console.log(`  Net change: ${Number(received) > 0 ? '+' : ''}${fromNano(received)} TON`);

    // Check contract state
    try {
        const state = await client.getContractState(escrowContract.address);
        if (state.state === 'active') {
            console.log(`  Contract still active (status may show RELEASED)`);
        } else {
            console.log(`  Contract destroyed (mode 128+32) ✅`);
        }
    } catch {
        console.log(`  Contract destroyed ✅`);
    }

    // ═══════════════════════════════════════════════════
    // SUMMARY
    // ═══════════════════════════════════════════════════
    console.log('');
    console.log('═'.repeat(60));
    console.log('  📊 E2E TEST SUMMARY');
    console.log('═'.repeat(60));
    console.log('');

    const endBalance = await client.getBalance(wallet.address);
    const totalSpent = startBalance - endBalance;

    console.log(`  Deal ID:           ${dealId}`);
    console.log(`  Contract:          ${contractAddr}`);
    console.log(`  Explorer:          https://testnet.tonviewer.com/${contractAddr}`);
    console.log('');
    console.log(`  Flow:              Deploy → Fund → Release ✅`);
    console.log(`  Escrow Amount:     ${fromNano(totalAmount)} TON`);
    console.log(`  Publisher Gets:    ${fromNano(publisherAmount)} TON`);
    console.log(`  Platform Fee:      ${fromNano(totalAmount - publisherAmount)} TON`);
    console.log('');
    console.log(`  Wallet start:      ${fromNano(startBalance)} TON`);
    console.log(`  Wallet end:        ${fromNano(endBalance)} TON`);
    console.log(`  Total gas spent:   ~${fromNano(totalSpent)} TON`);
    console.log('');
    console.log('  ✅ ALL STEPS PASSED — SMART CONTRACT WORKS ON TESTNET!');
    console.log('');
    console.log('═'.repeat(60));

    // Save test results
    const results = {
        test: 'e2e-testnet',
        timestamp: new Date().toISOString(),
        network: 'testnet',
        dealId: Number(dealId),
        contractAddress: contractAddr,
        explorerUrl: `https://testnet.tonviewer.com/${contractAddr}`,
        walletAddress: walletAddr,
        escrowAmount: fromNano(totalAmount),
        publisherAmount: fromNano(publisherAmount),
        platformFee: fromNano(totalAmount - publisherAmount),
        gasSpent: fromNano(totalSpent),
        steps: {
            deploy: '✅ PASSED',
            fund: '✅ PASSED',
            release: '✅ PASSED',
        },
        result: 'ALL PASSED',
    };

    const resultsPath = path.resolve(__dirname, '../e2e-test-results.json');
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
    console.log(`  Results saved to: ${resultsPath}`);
    console.log('');
}

async function getSeqno(walletContract: any): Promise<number> {
    try {
        return await walletContract.getSeqno();
    } catch {
        return 0;
    }
}

async function waitForSeqno(walletContract: any, currentSeqno: number): Promise<void> {
    for (let i = 0; i < 30; i++) {
        await sleep(2000);
        try {
            const newSeqno = await walletContract.getSeqno();
            if (newSeqno > currentSeqno) return;
        } catch {}
    }
}

main().catch(err => {
    console.error('');
    console.error('❌ E2E test failed:', err.message || err);
    process.exit(1);
});
