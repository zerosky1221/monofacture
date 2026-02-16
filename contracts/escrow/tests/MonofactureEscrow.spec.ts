import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { toNano, Address } from '@ton/core';
import {
    MonofactureEscrow,
    Fund,
    Release,
    Refund,
    Dispute,
    Resolve,
    ExtendDeadline,
    STATUS_PENDING,
    STATUS_FUNDED,
    STATUS_RELEASED,
    STATUS_REFUNDED,
    STATUS_DISPUTED,
} from '../build/MonofactureEscrow/MonofactureEscrow_MonofactureEscrow';
import '@ton/test-utils';

describe('MonofactureEscrow', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let advertiser: SandboxContract<TreasuryContract>;
    let publisher: SandboxContract<TreasuryContract>;
    let platform: SandboxContract<TreasuryContract>;
    let randomUser: SandboxContract<TreasuryContract>;
    let escrow: SandboxContract<MonofactureEscrow>;

    // Test parameters
    const dealId = 12345n;
    const totalAmount = toNano('10'); // 10 TON
    const publisherAmount = toNano('9.5'); // 95% to publisher
    const platformFee = toNano('0.5'); // 5% platform fee

    const getDeadline = () => BigInt(Math.floor(Date.now() / 1000) + 86400); // 24 hours from now

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        // Create wallets
        deployer = await blockchain.treasury('deployer');
        advertiser = await blockchain.treasury('advertiser');
        publisher = await blockchain.treasury('publisher');
        platform = await blockchain.treasury('platform');
        randomUser = await blockchain.treasury('randomUser');

        const deadline = getDeadline();

        // Deploy escrow contract
        escrow = blockchain.openContract(
            await MonofactureEscrow.fromInit(
                dealId,
                advertiser.address,
                publisher.address,
                platform.address,
                totalAmount,
                publisherAmount,
                deadline
            )
        );

        const deployResult = await escrow.send(
            deployer.getSender(),
            { value: toNano('0.05') },
            { $$type: 'Deploy', queryId: 0n }
        );

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: escrow.address,
            deploy: true,
            success: true,
        });
    });

    describe('Deployment', () => {
        it('should deploy with correct initial state', async () => {
            const status = await escrow.getStatus();
            expect(status).toBe(STATUS_PENDING);

            const data = await escrow.getEscrowData();
            expect(data.dealId).toBe(dealId);
            expect(data.advertiser.equals(advertiser.address)).toBe(true);
            expect(data.publisher.equals(publisher.address)).toBe(true);
            expect(data.platformWallet.equals(platform.address)).toBe(true);
            expect(data.totalAmount).toBe(totalAmount);
            expect(data.publisherAmount).toBe(publisherAmount);
            expect(data.status).toBe(STATUS_PENDING);
        });

        it('should return correct getter values', async () => {
            expect(await escrow.getDealId()).toBe(dealId);
            expect(await escrow.getTotalAmount()).toBe(totalAmount);
            expect(await escrow.getPublisherAmount()).toBe(publisherAmount);
            expect(await escrow.getPlatformFee()).toBe(platformFee);
            expect(await escrow.getIsExpired()).toBe(false);
        });
    });

    describe('Funding', () => {
        it('should auto-fund on plain TON transfer from advertiser', async () => {
            // Send TON directly (empty message body)
            const fundResult = await escrow.send(
                advertiser.getSender(),
                { value: totalAmount + toNano('0.05') }, // Extra for gas
                null
            );

            expect(fundResult.transactions).toHaveTransaction({
                from: advertiser.address,
                to: escrow.address,
                success: true,
            });

            const status = await escrow.getStatus();
            expect(status).toBe(STATUS_FUNDED);
        });

        it('should fund via explicit Fund message from advertiser', async () => {
            const fundMessage: Fund = { $$type: 'Fund', queryId: 1n };

            const fundResult = await escrow.send(
                advertiser.getSender(),
                { value: totalAmount + toNano('0.05') },
                fundMessage
            );

            expect(fundResult.transactions).toHaveTransaction({
                from: advertiser.address,
                to: escrow.address,
                success: true,
            });

            expect(await escrow.getStatus()).toBe(STATUS_FUNDED);
        });

        it('should fund via text comment transfer from advertiser', async () => {
            const fundResult = await escrow.send(
                advertiser.getSender(),
                { value: totalAmount + toNano('0.05') },
                'funding escrow'
            );

            expect(fundResult.transactions).toHaveTransaction({
                from: advertiser.address,
                to: escrow.address,
                success: true,
            });

            expect(await escrow.getStatus()).toBe(STATUS_FUNDED);
        });

        it('should reject funding from non-advertiser', async () => {
            const fundResult = await escrow.send(
                randomUser.getSender(),
                { value: totalAmount + toNano('0.05') },
                null
            );

            expect(fundResult.transactions).toHaveTransaction({
                from: randomUser.address,
                to: escrow.address,
                success: false,
                exitCode: 59612, // "Only advertiser can fund"
            });

            expect(await escrow.getStatus()).toBe(STATUS_PENDING);
        });

        it('should reject funding with insufficient amount', async () => {
            const fundResult = await escrow.send(
                advertiser.getSender(),
                { value: toNano('5') }, // Less than totalAmount
                null
            );

            expect(fundResult.transactions).toHaveTransaction({
                from: advertiser.address,
                to: escrow.address,
                success: false,
                exitCode: 51754, // "Insufficient funds"
            });

            expect(await escrow.getStatus()).toBe(STATUS_PENDING);
        });

        it('should accept excess funds when already funded', async () => {
            // First fund
            await escrow.send(
                advertiser.getSender(),
                { value: totalAmount + toNano('0.05') },
                null
            );
            expect(await escrow.getStatus()).toBe(STATUS_FUNDED);

            // Send more funds
            const extraResult = await escrow.send(
                advertiser.getSender(),
                { value: toNano('1') },
                null
            );

            expect(extraResult.transactions).toHaveTransaction({
                from: advertiser.address,
                to: escrow.address,
                success: true,
            });

            // Status should still be funded
            expect(await escrow.getStatus()).toBe(STATUS_FUNDED);
        });
    });

    describe('Release', () => {
        beforeEach(async () => {
            // Fund the escrow first
            await escrow.send(
                advertiser.getSender(),
                { value: totalAmount + toNano('0.05') },
                null
            );
        });

        it('should release all funds to platform wallet', async () => {
            const platformBalanceBefore = await platform.getBalance();

            const releaseMessage: Release = { $$type: 'Release', queryId: 1n };

            const releaseResult = await escrow.send(
                platform.getSender(),
                { value: toNano('0.05') },
                releaseMessage
            );

            expect(releaseResult.transactions).toHaveTransaction({
                from: platform.address,
                to: escrow.address,
                success: true,
            });

            // Should send to platform wallet
            expect(releaseResult.transactions).toHaveTransaction({
                from: escrow.address,
                to: platform.address,
                success: true,
            });

            // Note: Contract is destroyed after release (mode 128+32), so we can't read status
            // Instead, verify the funds were transferred
            const platformBalanceAfter = await platform.getBalance();
            expect(platformBalanceAfter).toBeGreaterThan(platformBalanceBefore);
        });

        it('should reject release from non-platform', async () => {
            const releaseMessage: Release = { $$type: 'Release', queryId: 1n };

            const releaseResult = await escrow.send(
                advertiser.getSender(),
                { value: toNano('0.05') },
                releaseMessage
            );

            expect(releaseResult.transactions).toHaveTransaction({
                from: advertiser.address,
                to: escrow.address,
                success: false,
                exitCode: 7161, // "Only platform can release"
            });

            expect(await escrow.getStatus()).toBe(STATUS_FUNDED);
        });

        it('should reject release when not funded', async () => {
            // Deploy new escrow without funding
            const newEscrow = blockchain.openContract(
                await MonofactureEscrow.fromInit(
                    99999n,
                    advertiser.address,
                    publisher.address,
                    platform.address,
                    totalAmount,
                    publisherAmount,
                    getDeadline()
                )
            );

            await newEscrow.send(
                deployer.getSender(),
                { value: toNano('0.05') },
                { $$type: 'Deploy', queryId: 0n }
            );

            const releaseMessage: Release = { $$type: 'Release', queryId: 1n };

            const releaseResult = await newEscrow.send(
                platform.getSender(),
                { value: toNano('0.05') },
                releaseMessage
            );

            expect(releaseResult.transactions).toHaveTransaction({
                from: platform.address,
                to: newEscrow.address,
                success: false,
                exitCode: 21911, // "Escrow not funded"
            });
        });
    });

    describe('Refund', () => {
        beforeEach(async () => {
            // Fund the escrow first
            await escrow.send(
                advertiser.getSender(),
                { value: totalAmount + toNano('0.05') },
                null
            );
        });

        it('should allow platform to refund anytime', async () => {
            const advertiserBalanceBefore = await advertiser.getBalance();

            const refundMessage: Refund = { $$type: 'Refund', queryId: 1n };

            const refundResult = await escrow.send(
                platform.getSender(),
                { value: toNano('0.05') },
                refundMessage
            );

            expect(refundResult.transactions).toHaveTransaction({
                from: platform.address,
                to: escrow.address,
                success: true,
            });

            // Should send to advertiser
            expect(refundResult.transactions).toHaveTransaction({
                from: escrow.address,
                to: advertiser.address,
                success: true,
            });

            // Note: Contract is destroyed after refund (mode 128+32), so we can't read status
            // Instead, verify the funds were transferred
            const advertiserBalanceAfter = await advertiser.getBalance();
            expect(advertiserBalanceAfter).toBeGreaterThan(advertiserBalanceBefore);
        });

        it('should reject advertiser refund before deadline', async () => {
            const refundMessage: Refund = { $$type: 'Refund', queryId: 1n };

            const refundResult = await escrow.send(
                advertiser.getSender(),
                { value: toNano('0.05') },
                refundMessage
            );

            expect(refundResult.transactions).toHaveTransaction({
                from: advertiser.address,
                to: escrow.address,
                success: false,
                exitCode: 44089, // "Deadline not passed"
            });

            expect(await escrow.getStatus()).toBe(STATUS_FUNDED);
        });

        it('should allow advertiser refund after deadline', async () => {
            // Deploy new escrow with past deadline
            const pastDeadline = BigInt(Math.floor(Date.now() / 1000) - 100); // 100 seconds ago

            const newEscrow = blockchain.openContract(
                await MonofactureEscrow.fromInit(
                    99998n,
                    advertiser.address,
                    publisher.address,
                    platform.address,
                    totalAmount,
                    publisherAmount,
                    pastDeadline
                )
            );

            await newEscrow.send(
                deployer.getSender(),
                { value: toNano('0.05') },
                { $$type: 'Deploy', queryId: 0n }
            );

            // Fund it
            await newEscrow.send(
                advertiser.getSender(),
                { value: totalAmount + toNano('0.05') },
                null
            );

            const advertiserBalanceBefore = await advertiser.getBalance();

            const refundMessage: Refund = { $$type: 'Refund', queryId: 1n };

            const refundResult = await newEscrow.send(
                advertiser.getSender(),
                { value: toNano('0.05') },
                refundMessage
            );

            expect(refundResult.transactions).toHaveTransaction({
                from: advertiser.address,
                to: newEscrow.address,
                success: true,
            });

            // Should send refund to advertiser
            expect(refundResult.transactions).toHaveTransaction({
                from: newEscrow.address,
                to: advertiser.address,
                success: true,
            });

            // Note: Contract is destroyed after refund (mode 128+32), so we can't read status
            // Instead, verify the funds were transferred back
            const advertiserBalanceAfter = await advertiser.getBalance();
            expect(advertiserBalanceAfter).toBeGreaterThan(advertiserBalanceBefore - toNano('1')); // Account for gas
        });

        it('should reject refund from unauthorized user', async () => {
            const refundMessage: Refund = { $$type: 'Refund', queryId: 1n };

            const refundResult = await escrow.send(
                randomUser.getSender(),
                { value: toNano('0.05') },
                refundMessage
            );

            expect(refundResult.transactions).toHaveTransaction({
                from: randomUser.address,
                to: escrow.address,
                success: false,
                exitCode: 42435, // "Not authorized"
            });
        });

        it('should reject refund from publisher', async () => {
            const refundMessage: Refund = { $$type: 'Refund', queryId: 1n };

            const refundResult = await escrow.send(
                publisher.getSender(),
                { value: toNano('0.05') },
                refundMessage
            );

            expect(refundResult.transactions).toHaveTransaction({
                from: publisher.address,
                to: escrow.address,
                success: false,
                exitCode: 42435, // "Not authorized"
            });
        });
    });

    describe('Dispute', () => {
        beforeEach(async () => {
            // Fund the escrow first
            await escrow.send(
                advertiser.getSender(),
                { value: totalAmount + toNano('0.05') },
                null
            );
        });

        it('should allow advertiser to open dispute', async () => {
            const disputeMessage: Dispute = { $$type: 'Dispute', queryId: 1n };

            const disputeResult = await escrow.send(
                advertiser.getSender(),
                { value: toNano('0.05') },
                disputeMessage
            );

            expect(disputeResult.transactions).toHaveTransaction({
                from: advertiser.address,
                to: escrow.address,
                success: true,
            });

            expect(await escrow.getStatus()).toBe(STATUS_DISPUTED);
        });

        it('should allow publisher to open dispute', async () => {
            const disputeMessage: Dispute = { $$type: 'Dispute', queryId: 1n };

            const disputeResult = await escrow.send(
                publisher.getSender(),
                { value: toNano('0.05') },
                disputeMessage
            );

            expect(disputeResult.transactions).toHaveTransaction({
                from: publisher.address,
                to: escrow.address,
                success: true,
            });

            expect(await escrow.getStatus()).toBe(STATUS_DISPUTED);
        });

        it('should reject dispute from unauthorized user', async () => {
            const disputeMessage: Dispute = { $$type: 'Dispute', queryId: 1n };

            const disputeResult = await escrow.send(
                randomUser.getSender(),
                { value: toNano('0.05') },
                disputeMessage
            );

            expect(disputeResult.transactions).toHaveTransaction({
                from: randomUser.address,
                to: escrow.address,
                success: false,
                exitCode: 42435, // "Not authorized"
            });
        });

        it('should reject dispute when not funded', async () => {
            // Deploy new escrow without funding
            const newEscrow = blockchain.openContract(
                await MonofactureEscrow.fromInit(
                    99997n,
                    advertiser.address,
                    publisher.address,
                    platform.address,
                    totalAmount,
                    publisherAmount,
                    getDeadline()
                )
            );

            await newEscrow.send(
                deployer.getSender(),
                { value: toNano('0.05') },
                { $$type: 'Deploy', queryId: 0n }
            );

            const disputeMessage: Dispute = { $$type: 'Dispute', queryId: 1n };

            const disputeResult = await newEscrow.send(
                advertiser.getSender(),
                { value: toNano('0.05') },
                disputeMessage
            );

            expect(disputeResult.transactions).toHaveTransaction({
                from: advertiser.address,
                to: newEscrow.address,
                success: false,
                exitCode: 21911, // "Escrow not funded"
            });
        });
    });

    describe('Resolve Dispute', () => {
        beforeEach(async () => {
            // Fund the escrow
            await escrow.send(
                advertiser.getSender(),
                { value: totalAmount + toNano('0.05') },
                null
            );

            // Open dispute
            const disputeMessage: Dispute = { $$type: 'Dispute', queryId: 1n };
            await escrow.send(
                advertiser.getSender(),
                { value: toNano('0.05') },
                disputeMessage
            );
        });

        it('should resolve in favor of publisher (release to platform)', async () => {
            const platformBalanceBefore = await platform.getBalance();

            const resolveMessage: Resolve = {
                $$type: 'Resolve',
                queryId: 1n,
                releaseToPublisher: true,
            };

            const resolveResult = await escrow.send(
                platform.getSender(),
                { value: toNano('0.05') },
                resolveMessage
            );

            expect(resolveResult.transactions).toHaveTransaction({
                from: platform.address,
                to: escrow.address,
                success: true,
            });

            // Should send to platform wallet
            expect(resolveResult.transactions).toHaveTransaction({
                from: escrow.address,
                to: platform.address,
                success: true,
            });

            // Note: Contract is destroyed after resolve (mode 128+32), so we can't read status
            // Instead, verify the funds were transferred
            const platformBalanceAfter = await platform.getBalance();
            expect(platformBalanceAfter).toBeGreaterThan(platformBalanceBefore);
        });

        it('should resolve in favor of advertiser (refund)', async () => {
            const advertiserBalanceBefore = await advertiser.getBalance();

            const resolveMessage: Resolve = {
                $$type: 'Resolve',
                queryId: 1n,
                releaseToPublisher: false,
            };

            const resolveResult = await escrow.send(
                platform.getSender(),
                { value: toNano('0.05') },
                resolveMessage
            );

            expect(resolveResult.transactions).toHaveTransaction({
                from: platform.address,
                to: escrow.address,
                success: true,
            });

            // Should send to advertiser
            expect(resolveResult.transactions).toHaveTransaction({
                from: escrow.address,
                to: advertiser.address,
                success: true,
            });

            // Note: Contract is destroyed after resolve (mode 128+32), so we can't read status
            // Instead, verify the funds were transferred
            const advertiserBalanceAfter = await advertiser.getBalance();
            expect(advertiserBalanceAfter).toBeGreaterThan(advertiserBalanceBefore);
        });

        it('should reject resolve from non-platform', async () => {
            const resolveMessage: Resolve = {
                $$type: 'Resolve',
                queryId: 1n,
                releaseToPublisher: true,
            };

            const resolveResult = await escrow.send(
                advertiser.getSender(),
                { value: toNano('0.05') },
                resolveMessage
            );

            expect(resolveResult.transactions).toHaveTransaction({
                from: advertiser.address,
                to: escrow.address,
                success: false,
                exitCode: 55960, // "Only platform can resolve"
            });

            expect(await escrow.getStatus()).toBe(STATUS_DISPUTED);
        });

        it('should reject resolve when not disputed', async () => {
            // Deploy new escrow without dispute
            const newEscrow = blockchain.openContract(
                await MonofactureEscrow.fromInit(
                    99996n,
                    advertiser.address,
                    publisher.address,
                    platform.address,
                    totalAmount,
                    publisherAmount,
                    getDeadline()
                )
            );

            await newEscrow.send(
                deployer.getSender(),
                { value: toNano('0.05') },
                { $$type: 'Deploy', queryId: 0n }
            );

            await newEscrow.send(
                advertiser.getSender(),
                { value: totalAmount + toNano('0.05') },
                null
            );

            const resolveMessage: Resolve = {
                $$type: 'Resolve',
                queryId: 1n,
                releaseToPublisher: true,
            };

            const resolveResult = await newEscrow.send(
                platform.getSender(),
                { value: toNano('0.05') },
                resolveMessage
            );

            expect(resolveResult.transactions).toHaveTransaction({
                from: platform.address,
                to: newEscrow.address,
                success: false,
                exitCode: 62062, // "Not disputed"
            });
        });
    });

    describe('Extend Deadline', () => {
        beforeEach(async () => {
            // Fund the escrow
            await escrow.send(
                advertiser.getSender(),
                { value: totalAmount + toNano('0.05') },
                null
            );
        });

        it('should allow platform to extend deadline', async () => {
            const originalDeadline = await escrow.getDeadline();
            const newDeadline = originalDeadline + 86400n; // +24 hours

            const extendMessage: ExtendDeadline = {
                $$type: 'ExtendDeadline',
                queryId: 1n,
                newDeadline: newDeadline,
            };

            const extendResult = await escrow.send(
                platform.getSender(),
                { value: toNano('0.05') },
                extendMessage
            );

            expect(extendResult.transactions).toHaveTransaction({
                from: platform.address,
                to: escrow.address,
                success: true,
            });

            const updatedDeadline = await escrow.getDeadline();
            expect(updatedDeadline).toBe(newDeadline);
        });

        it('should reject extend deadline from non-platform', async () => {
            const newDeadline = BigInt(Math.floor(Date.now() / 1000) + 172800); // +48 hours

            const extendMessage: ExtendDeadline = {
                $$type: 'ExtendDeadline',
                queryId: 1n,
                newDeadline: newDeadline,
            };

            const extendResult = await escrow.send(
                advertiser.getSender(),
                { value: toNano('0.05') },
                extendMessage
            );

            expect(extendResult.transactions).toHaveTransaction({
                from: advertiser.address,
                to: escrow.address,
                success: false,
                exitCode: 32773, // "Only platform can extend"
            });
        });

        it('should reject extend deadline with past deadline', async () => {
            const pastDeadline = BigInt(Math.floor(Date.now() / 1000) - 100); // Past

            const extendMessage: ExtendDeadline = {
                $$type: 'ExtendDeadline',
                queryId: 1n,
                newDeadline: pastDeadline,
            };

            const extendResult = await escrow.send(
                platform.getSender(),
                { value: toNano('0.05') },
                extendMessage
            );

            expect(extendResult.transactions).toHaveTransaction({
                from: platform.address,
                to: escrow.address,
                success: false,
                exitCode: 10588, // "Deadline must be future"
            });
        });

        it('should allow extend deadline when disputed', async () => {
            // Open dispute
            const disputeMessage: Dispute = { $$type: 'Dispute', queryId: 1n };
            await escrow.send(
                advertiser.getSender(),
                { value: toNano('0.05') },
                disputeMessage
            );

            expect(await escrow.getStatus()).toBe(STATUS_DISPUTED);

            const originalDeadline = await escrow.getDeadline();
            const newDeadline = originalDeadline + 86400n;

            const extendMessage: ExtendDeadline = {
                $$type: 'ExtendDeadline',
                queryId: 1n,
                newDeadline: newDeadline,
            };

            const extendResult = await escrow.send(
                platform.getSender(),
                { value: toNano('0.05') },
                extendMessage
            );

            expect(extendResult.transactions).toHaveTransaction({
                from: platform.address,
                to: escrow.address,
                success: true,
            });

            expect(await escrow.getDeadline()).toBe(newDeadline);
        });

        it('should reject extend deadline when not funded', async () => {
            // Deploy new unfunded escrow
            const newEscrow = blockchain.openContract(
                await MonofactureEscrow.fromInit(
                    99995n,
                    advertiser.address,
                    publisher.address,
                    platform.address,
                    totalAmount,
                    publisherAmount,
                    getDeadline()
                )
            );

            await newEscrow.send(
                deployer.getSender(),
                { value: toNano('0.05') },
                { $$type: 'Deploy', queryId: 0n }
            );

            const newDeadline = BigInt(Math.floor(Date.now() / 1000) + 172800);

            const extendMessage: ExtendDeadline = {
                $$type: 'ExtendDeadline',
                queryId: 1n,
                newDeadline: newDeadline,
            };

            const extendResult = await newEscrow.send(
                platform.getSender(),
                { value: toNano('0.05') },
                extendMessage
            );

            expect(extendResult.transactions).toHaveTransaction({
                from: platform.address,
                to: newEscrow.address,
                success: false,
                exitCode: 9483, // "Invalid state"
            });
        });
    });

    describe('Getters', () => {
        it('should return correct isExpired value', async () => {
            // Current escrow should not be expired
            expect(await escrow.getIsExpired()).toBe(false);

            // Deploy escrow with past deadline
            const pastDeadline = BigInt(Math.floor(Date.now() / 1000) - 100);

            const expiredEscrow = blockchain.openContract(
                await MonofactureEscrow.fromInit(
                    99994n,
                    advertiser.address,
                    publisher.address,
                    platform.address,
                    totalAmount,
                    publisherAmount,
                    pastDeadline
                )
            );

            await expiredEscrow.send(
                deployer.getSender(),
                { value: toNano('0.05') },
                { $$type: 'Deploy', queryId: 0n }
            );

            expect(await expiredEscrow.getIsExpired()).toBe(true);
        });

        it('should return correct locked balance', async () => {
            // Before funding, balance may be minimal (deployment gas remainder)
            const balanceBefore = await escrow.getLockedBalance();

            // Fund the escrow
            await escrow.send(
                advertiser.getSender(),
                { value: totalAmount + toNano('0.05') },
                null
            );

            const balanceAfter = await escrow.getLockedBalance();
            expect(balanceAfter).toBeGreaterThan(balanceBefore);
            expect(balanceAfter).toBeGreaterThanOrEqual(totalAmount);
        });

        it('should return full escrow data', async () => {
            const data = await escrow.getEscrowData();

            expect(data.$$type).toBe('EscrowData');
            expect(data.dealId).toBe(dealId);
            expect(data.advertiser.equals(advertiser.address)).toBe(true);
            expect(data.publisher.equals(publisher.address)).toBe(true);
            expect(data.platformWallet.equals(platform.address)).toBe(true);
            expect(data.totalAmount).toBe(totalAmount);
            expect(data.publisherAmount).toBe(publisherAmount);
            expect(data.status).toBe(STATUS_PENDING);
            expect(data.deadline).toBeGreaterThan(0n);
            expect(data.createdAt).toBeGreaterThan(0n);
        });
    });
});
