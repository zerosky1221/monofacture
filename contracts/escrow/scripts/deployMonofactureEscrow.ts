import { toNano, Address } from '@ton/core';
import { MonofactureEscrow } from '../build/MonofactureEscrow/MonofactureEscrow_MonofactureEscrow';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    // Test parameters for testnet deployment
    const dealId = BigInt(Date.now()); // Use timestamp as unique deal ID

    // Get deployer address as the platform wallet for testing
    const deployerAddress = provider.sender().address;
    if (!deployerAddress) {
        throw new Error('Deployer address not available');
    }

    // For testing, we'll use the same address for all parties
    // In production, these would be different addresses
    const testAddress = deployerAddress;

    // Test amounts
    const totalAmount = toNano('1'); // 1 TON total
    const publisherAmount = toNano('0.95'); // 95% to publisher

    // Deadline: 24 hours from now
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 24 * 60 * 60);

    console.log('='.repeat(60));
    console.log('MONOFACTURE ESCROW - TESTNET DEPLOYMENT');
    console.log('='.repeat(60));
    console.log('');
    console.log('Parameters:');
    console.log(`  Deal ID:          ${dealId}`);
    console.log(`  Advertiser:       ${testAddress.toString()}`);
    console.log(`  Publisher:        ${testAddress.toString()}`);
    console.log(`  Platform Wallet:  ${testAddress.toString()}`);
    console.log(`  Total Amount:     ${toNano('1')} nanoTON (1 TON)`);
    console.log(`  Publisher Amount: ${toNano('0.95')} nanoTON (0.95 TON)`);
    console.log(`  Platform Fee:     ${toNano('0.05')} nanoTON (0.05 TON)`);
    console.log(`  Deadline:         ${new Date(Number(deadline) * 1000).toISOString()}`);
    console.log('');

    // Create contract instance
    const monofactureEscrow = provider.open(
        await MonofactureEscrow.fromInit(
            dealId,
            testAddress, // advertiser
            testAddress, // publisher
            testAddress, // platform wallet
            totalAmount,
            publisherAmount,
            deadline,
        )
    );

    console.log('Contract address:', monofactureEscrow.address.toString());
    console.log('');
    console.log('Deploying...');

    // Deploy with initial TON for storage
    await monofactureEscrow.send(
        provider.sender(),
        {
            value: toNano('0.05'), // Gas for deployment
        },
        {
            $$type: 'Deploy',
            queryId: 0n,
        },
    );

    await provider.waitForDeploy(monofactureEscrow.address);

    console.log('');
    console.log('Contract deployed successfully!');
    console.log('');
    console.log('='.repeat(60));
    console.log('DEPLOYMENT DETAILS');
    console.log('='.repeat(60));
    console.log(`Contract Address: ${monofactureEscrow.address.toString()}`);
    console.log(`Explorer URL:     https://testnet.tonviewer.com/${monofactureEscrow.address.toString()}`);
    console.log('');

    // Verify deployment by reading contract state
    console.log('Verifying contract state...');
    try {
        const status = await monofactureEscrow.getStatus();
        const escrowData = await monofactureEscrow.getEscrowData();

        console.log('');
        console.log('Contract State:');
        console.log(`  Status:           ${status} (0=PENDING, 1=FUNDED, 2=RELEASED, 3=REFUNDED, 4=DISPUTED)`);
        console.log(`  Deal ID:          ${escrowData.dealId}`);
        console.log(`  Total Amount:     ${escrowData.totalAmount} nanoTON`);
        console.log(`  Publisher Amount: ${escrowData.publisherAmount} nanoTON`);
        console.log(`  Deadline:         ${new Date(Number(escrowData.deadline) * 1000).toISOString()}`);
        console.log('');
        console.log('Deployment verified successfully!');
    } catch (error) {
        console.log('Note: Contract state verification may take a moment...');
    }

    console.log('='.repeat(60));
}
