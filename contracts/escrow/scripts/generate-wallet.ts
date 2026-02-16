/**
 * Generate a new 24-word TON mnemonic for platform wallet
 * 
 * Usage: npx ts-node scripts/generate-wallet.ts
 */

import { mnemonicNew, mnemonicToPrivateKey } from '@ton/crypto';
import { WalletContractV4 } from '@ton/ton';

async function main() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  TON WALLET GENERATOR');
  console.log('═══════════════════════════════════════════════════════\n');

  const mnemonic = await mnemonicNew(24);
  const keypair = await mnemonicToPrivateKey(mnemonic);
  
  const wallet = WalletContractV4.create({
    publicKey: keypair.publicKey,
    workchain: 0,
  });

  const addressTestnet = wallet.address.toString({ bounceable: false, testOnly: true });
  const addressTestnetBounce = wallet.address.toString({ bounceable: true, testOnly: true });
  const addressMainnet = wallet.address.toString({ bounceable: false, testOnly: false });

  console.log('🔑 MNEMONIC (24 words) — SAVE SECURELY:');
  console.log(`\n   ${mnemonic.join(' ')}\n`);

  console.log('📍 ADDRESSES:');
  console.log(`   Testnet (non-bounceable): ${addressTestnet}`);
  console.log(`   Testnet (bounceable):     ${addressTestnetBounce}`);
  console.log(`   Mainnet (non-bounceable): ${addressMainnet}\n`);

  console.log('🔗 EXPLORER:');
  console.log(`   https://testnet.tonviewer.com/${addressTestnet}\n`);

  console.log('📋 ADD TO .env:');
  console.log(`   ESCROW_MASTER_SEED=${mnemonic.join(' ')}`);
  console.log(`   DEPLOY_MNEMONIC=${mnemonic.join(' ')}`);
  console.log(`   TON_PLATFORM_WALLET_ADDRESS=${addressTestnetBounce}\n`);

  console.log('💰 GET TESTNET TON:');
  console.log(`   1. Open Telegram: @testgiver_ton_bot`);
  console.log(`   2. Send this address: ${addressTestnet}`);
  console.log(`   3. You'll receive 5 testnet TON\n`);

  console.log('═══════════════════════════════════════════════════════\n');
}

main().catch(console.error);
