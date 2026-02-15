/**
 * Standalone testnet deployment script for MonofactureEscrow
 * 
 * Usage:
 *   set TESTNET_MNEMONIC=word1 word2 word3 ... word24
 *   npx ts-node scripts/deploy-testnet.ts
 * 
 * Or use .env file with TESTNET_MNEMONIC variable
 * 
 * Get testnet TON: https://t.me/testgiver_ton_bot
 */

import { TonClient, WalletContractV4, internal } from '@ton/ton';
import { mnemonicToPrivateKey, mnemonicNew, mnemonicValidate } from '@ton/crypto';
import { toNano, fromNano, Address, beginCell } from '@ton/core';
import { MonofactureEscrow } from '../build/MonofactureEscrow/MonofactureEscrow_MonofactureEscrow';
import * as fs from 'fs';
import * as path from 'path';

// Load .env from project root
function loadEnv() {
    const envPaths = [
        path.resolve(__dirname, '../../../.env'),      // D:\Monofacture\.env
        path.resolve(__dirname, '../.env'),             // contracts/escrow/.env
    ];
    
    for (const envPath of envPaths) {
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
}

const DEPLOY_OPCODE = 2490013878; // From compiled Tact contract

async function main() {
    loadEnv();
    
    console.log('');
    console.log('═'.repeat(60));
    console.log('  MONOFACTURE ESCROW — TESTNET DEPLOYMENT');
    console.log('═'.repeat(60));
    console.log('');

    // Get mnemonic
    const mnemonic = process.env.TESTNET_MNEMONIC;
    if (!mnemonic) {
        console.log('❌ TESTNET_MNEMONIC not set.');
        console.log('');
        console.log('Options:');
        console.log('');
        console.log('  1) Generate new wallet:');
        console.log('     npx ts-node scripts/deploy-testnet.ts --generate');
        console.log('');
        console.log('  2) Set mnemonic manually:');
        console.log('     set TESTNET_MNEMONIC=word1 word2 ... word24');
        console.log('     npx ts-node scripts/deploy-testnet.ts');
        console.log('');
        console.log('  3) Add TESTNET_MNEMONIC to D:\\Monofacture\\.env');
        console.log('');
        
        if (process.argv.includes('--generate')) {
            console.log('🔑 Generating new testnet wallet...');
            console.log('');
            const newMnemonic = await mnemonicNew(24);
            const keypair = await mnemonicToPrivateKey(newMnemonic);
            const wallet = WalletContractV4.create({
                publicKey: keypair.publicKey,
                workchain: 0,
            });
            const address = wallet.address.toString({ testOnly: true, bounceable: false });
            
            console.log('  Mnemonic (SAVE THIS):');
            console.log(`  ${newMnemonic.join(' ')}`);
            console.log('');
            console.log(`  Address: ${address}`);
            console.log('');
            console.log('  Next steps:');
            console.log(`  1. Send testnet TON to: ${address}`);
            console.log('     Use @testgiver_ton_bot on Telegram');
            console.log('  2. Set environment variable:');
            console.log(`     set TESTNET_MNEMONIC=${newMnemonic.join(' ')}`);
            console.log('  3. Run this script again');
            console.log('');
            
            // Also save to .env suggestion
            console.log('  Or add to D:\\Monofacture\\.env:');
            console.log(`  TESTNET_MNEMONIC=${newMnemonic.join(' ')}`);
        }
        
        process.exit(1);
    }

    const words = mnemonic.split(' ').filter(w => w.trim());
    if (words.length !== 24) {
        console.log(`❌ Mnemonic must be 24 words (got ${words.length})`);
        process.exit(1);
    }

    // Validate mnemonic
    const isValid = await mnemonicValidate(words);
    if (!isValid) {
        console.log('❌ Invalid mnemonic');
        process.exit(1);
    }

    // Initialize TON client for testnet
    const apiKey = process.env.TON_API_KEY || '';
    const client = new TonClient({
        endpoint: 'https://testnet.toncenter.com/api/v2/jsonRPC',
        apiKey: apiKey || undefined,
    });

    // Create wallet from mnemonic
    console.log('🔑 Initializing wallet...');
    const keypair = await mnemonicToPrivateKey(words);
    const wallet = WalletContractV4.create({
        publicKey: keypair.publicKey,
        workchain: 0,
    });

    const walletContract = client.open(wallet);
    const walletAddress = wallet.address.toString({ testOnly: true, bounceable: false });
    const walletAddressBounceable = wallet.address.toString({ testOnly: true, bounceable: true });

    console.log(`  Address (non-bounceable): ${walletAddress}`);
    console.log(`  Address (bounceable):     ${walletAddressBounceable}`);

    // Check wallet balance
    const balance = await client.getBalance(wallet.address);
    console.log(`  Balance: ${fromNano(balance)} TON`);

    if (balance < toNano('0.15')) {
        console.log('');
        console.log(`❌ Insufficient balance. Need at least 0.15 TON for deployment.`);
        console.log(`   Current: ${fromNano(balance)} TON`);
        console.log('');
        console.log('   Get testnet TON:');
        console.log('   1. Open Telegram: @testgiver_ton_bot');
        console.log(`   2. Send this address to the bot: ${walletAddress}`);
        console.log('   3. Wait for TON to arrive, then run this script again');
        process.exit(1);
    }

    // Platform wallet (from .env or default to deployer)
    // For testnet, use deployer as platform wallet (mainnet addresses won't parse in testnet mode)
    // In production, this would be the real platform wallet
    let platformWalletAddress: Address;
    try {
        if (process.env.TON_PLATFORM_WALLET_ADDRESS) {
            platformWalletAddress = Address.parse(process.env.TON_PLATFORM_WALLET_ADDRESS);
        } else {
            platformWalletAddress = wallet.address;
        }
    } catch {
        console.log(`  ⚠️  Platform wallet address is mainnet format, using deployer wallet for testnet`);
        platformWalletAddress = wallet.address;
    }

    // Test parameters
    const dealId = BigInt(1); // Simple test deal ID
    const totalAmount = toNano('1.05');      // 1.05 TON (1 TON price + 5% fee)
    const publisherAmount = toNano('1');     // 1 TON to publisher
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60); // 7 days

    console.log('');
    console.log('📋 Contract parameters:');
    console.log(`  Deal ID:          ${dealId}`);
    console.log(`  Advertiser:       ${walletAddress} (deployer)`);
    console.log(`  Publisher:        ${walletAddress} (deployer for test)`);
    console.log(`  Platform Wallet:  ${platformWalletAddress.toString({ testOnly: true })}`);
    console.log(`  Total Amount:     ${fromNano(totalAmount)} TON`);
    console.log(`  Publisher Amount: ${fromNano(publisherAmount)} TON`);
    console.log(`  Platform Fee:     ${fromNano(totalAmount - publisherAmount)} TON`);
    console.log(`  Deadline:         ${new Date(Number(deadline) * 1000).toISOString()}`);

    // Create contract instance
    const escrowContract = await MonofactureEscrow.fromInit(
        dealId,
        wallet.address,           // advertiser (deployer for test)
        wallet.address,           // publisher (deployer for test)
        platformWalletAddress,    // platform wallet
        totalAmount,
        publisherAmount,
        deadline,
    );

    const contractAddr = escrowContract.address.toString({ testOnly: true });
    console.log('');
    console.log(`📄 Contract address: ${contractAddr}`);
    console.log(`   Explorer: https://testnet.tonviewer.com/${contractAddr}`);

    // Check if contract already exists
    try {
        const contractState = await client.getContractState(escrowContract.address);
        if (contractState.state === 'active') {
            console.log('');
            console.log('✅ Contract already deployed!');
            
            // Read state
            const openedContract = client.open(escrowContract);
            try {
                const status = await openedContract.getStatus();
                const data = await openedContract.getEscrowData();
                const lockedBalance = await openedContract.getLockedBalance();
                console.log('');
                console.log('  Contract State:');
                console.log(`    Status:     ${status} (0=PENDING, 1=FUNDED, 2=RELEASED, 3=REFUNDED, 4=DISPUTED)`);
                console.log(`    Deal ID:    ${data.dealId}`);
                console.log(`    Balance:    ${fromNano(lockedBalance)} TON`);
                console.log(`    Deadline:   ${new Date(Number(data.deadline) * 1000).toISOString()}`);
            } catch (e) {
                console.log('  (Could not read state yet)');
            }
            
            process.exit(0);
        }
    } catch {
        // Contract doesn't exist yet — good, we'll deploy
    }

    // Get wallet seqno
    let seqno: number;
    try {
        seqno = await walletContract.getSeqno();
    } catch {
        seqno = 0;
    }

    console.log('');
    console.log('🚀 Deploying contract...');
    console.log(`   Seqno: ${seqno}`);

    // Build Deploy message body (Tact Deployable trait)
    const deployBody = beginCell()
        .storeUint(DEPLOY_OPCODE, 32) // Deploy opcode
        .storeUint(0, 64)             // queryId = 0
        .endCell();

    // Send deployment transaction
    await walletContract.sendTransfer({
        secretKey: keypair.secretKey,
        seqno,
        messages: [
            internal({
                to: escrowContract.address,
                value: toNano('0.05'),     // Gas + storage for deployment
                init: escrowContract.init!, // State init (code + data)
                body: deployBody,
                bounce: false,
            }),
        ],
    });

    console.log('   Transaction sent. Waiting for confirmation...');

    // Wait for deployment (max 60 seconds)
    let deployed = false;
    for (let i = 0; i < 30; i++) {
        await sleep(2000);
        process.stdout.write('.');
        
        try {
            const state = await client.getContractState(escrowContract.address);
            if (state.state === 'active') {
                deployed = true;
                break;
            }
        } catch {
            // Not deployed yet
        }
    }

    console.log('');
    console.log('');

    if (!deployed) {
        console.log('⏳ Deployment may still be processing...');
        console.log(`   Check: https://testnet.tonviewer.com/${contractAddr}`);
        process.exit(0);
    }

    console.log('═'.repeat(60));
    console.log('  ✅ DEPLOYMENT SUCCESSFUL!');
    console.log('═'.repeat(60));
    console.log('');
    console.log(`  Contract: ${contractAddr}`);
    console.log(`  Explorer: https://testnet.tonviewer.com/${contractAddr}`);
    console.log('');

    // Verify contract state
    try {
        await sleep(3000); // Wait a bit more for state to be readable
        const openedContract = client.open(escrowContract);
        const status = await openedContract.getStatus();
        const data = await openedContract.getEscrowData();
        
        console.log('  Verified State:');
        console.log(`    Status:           ${status} (PENDING)`);
        console.log(`    Deal ID:          ${data.dealId}`);
        console.log(`    Total Amount:     ${fromNano(data.totalAmount)} TON`);
        console.log(`    Publisher Amount: ${fromNano(data.publisherAmount)} TON`);
        console.log(`    Platform Fee:     ${fromNano(data.totalAmount - data.publisherAmount)} TON`);
        console.log(`    Deadline:         ${new Date(Number(data.deadline) * 1000).toISOString()}`);
    } catch (e) {
        console.log('  (State will be readable shortly)');
    }

    console.log('');
    console.log('═'.repeat(60));
    console.log('');
    console.log('  Next steps:');
    console.log(`  1. Fund escrow: send ${fromNano(totalAmount)} TON to ${contractAddr}`);
    console.log('  2. Release: platform sends Release message');
    console.log('  3. Integrate with backend (ton-wallet.service.ts)');
    console.log('');

    // Save deployment info
    const deployInfo = {
        network: 'testnet',
        contractAddress: contractAddr,
        explorerUrl: `https://testnet.tonviewer.com/${contractAddr}`,
        deployerAddress: walletAddress,
        platformWallet: platformWalletAddress.toString({ testOnly: true }),
        dealId: Number(dealId),
        totalAmount: fromNano(totalAmount),
        publisherAmount: fromNano(publisherAmount),
        platformFee: fromNano(totalAmount - publisherAmount),
        deadline: new Date(Number(deadline) * 1000).toISOString(),
        deployedAt: new Date().toISOString(),
    };

    const infoPath = path.resolve(__dirname, '../deployment-testnet.json');
    fs.writeFileSync(infoPath, JSON.stringify(deployInfo, null, 2));
    console.log(`  Deployment info saved to: ${infoPath}`);
    console.log('');
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

main().catch(err => {
    console.error('');
    console.error('❌ Deployment failed:', err.message || err);
    process.exit(1);
});
