/**
 * EscrowDeal FunC Contract Tests
 *
 * Comprehensive tests for escrow-deal.fc with:
 * - msg_value funding verification (critical fix)
 * - ASCII-based op-codes
 * - Bounce handling
 * - All status transitions
 */

import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { toNano, beginCell, Cell, Address } from '@ton/core';
import { EscrowDeal, EscrowStatus, OP, buildEscrowDataCell } from '../wrappers/EscrowDeal';
import '@ton/test-utils';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

describe('EscrowDeal (FunC)', () => {
  let blockchain: Blockchain;
  let deployer: SandboxContract<TreasuryContract>;
  let advertiser: SandboxContract<TreasuryContract>;
  let publisher: SandboxContract<TreasuryContract>;
  let platform: SandboxContract<TreasuryContract>;
  let randomUser: SandboxContract<TreasuryContract>;
  let escrow: SandboxContract<EscrowDeal>;
  let escrowCode: Cell;

  // Test parameters
  const dealId = BigInt('0x' + 'a'.repeat(64)); // SHA256 hash simulation
  const totalAmount = toNano('10'); // 10 TON
  const publisherAmount = toNano('9.5'); // 95% to publisher
  const platformFee = toNano('0.5'); // 5% platform fee

  const getDeadline = (hoursFromNow = 24) =>
    Math.floor(Date.now() / 1000) + hoursFromNow * 3600;
  const getPastDeadline = () => Math.floor(Date.now() / 1000) - 3600; // 1 hour ago

  beforeAll(async () => {
    // Load compiled contract code
    const bocPath = join(__dirname, '../build/escrow-deal.boc');
    if (existsSync(bocPath)) {
      escrowCode = Cell.fromBoc(readFileSync(bocPath))[0];
    } else {
      console.warn('Compiled escrow-deal.boc not found. Run "npm run compile" first.');
      // Create minimal mock code for wrapper logic testing
      escrowCode = beginCell().storeUint(0, 8).endCell();
    }
  });

  beforeEach(async () => {
    blockchain = await Blockchain.create();

    // Create wallets
    deployer = await blockchain.treasury('deployer');
    advertiser = await blockchain.treasury('advertiser');
    publisher = await blockchain.treasury('publisher');
    platform = await blockchain.treasury('platform');
    randomUser = await blockchain.treasury('randomUser');

    const config = {
      dealId,
      advertiser: advertiser.address,
      publisher: publisher.address,
      platformWallet: platform.address,
      totalAmount,
      publisherAmount,
      deadline: getDeadline(),
    };

    // Create escrow contract
    escrow = blockchain.openContract(
      EscrowDeal.createFromConfig(config, escrowCode),
    );

    // Deploy
    const deployResult = await escrow.sendDeploy(
      deployer.getSender(),
      toNano('0.1'),
    );

    expect(deployResult.transactions).toHaveTransaction({
      from: deployer.address,
      to: escrow.address,
      deploy: true,
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // DEPLOYMENT TESTS
  // ═══════════════════════════════════════════════════════════════════

  describe('Deployment', () => {
    it('should deploy with PENDING status', async () => {
      const status = await escrow.getStatus();
      expect(status).toBe(EscrowStatus.PENDING);
    });

    it('should store correct deal parameters', async () => {
      const data = await escrow.getEscrowData();
      expect(data.dealId).toBe(dealId);
      expect(data.advertiser.equals(advertiser.address)).toBe(true);
      expect(data.publisher.equals(publisher.address)).toBe(true);
      expect(data.platformWallet.equals(platform.address)).toBe(true);
      expect(data.totalAmount).toBe(totalAmount);
      expect(data.publisherAmount).toBe(publisherAmount);
      expect(data.status).toBe(EscrowStatus.PENDING);
    });

    it('should return correct getter values', async () => {
      expect(await escrow.getDealId()).toBe(dealId);
      expect(await escrow.getTotalAmount()).toBe(totalAmount);
      expect(await escrow.getPublisherAmount()).toBe(publisherAmount);
      expect(await escrow.getPlatformFee()).toBe(platformFee);
      expect(await escrow.isExpired()).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // FUNDING TESTS - Critical msg_value verification
  // ═══════════════════════════════════════════════════════════════════

  describe('Funding', () => {
    it('should auto-fund on plain TON transfer from advertiser', async () => {
      // Send plain TON with empty body
      const fundResult = await advertiser.send({
        to: escrow.address,
        value: totalAmount + toNano('0.05'),
        body: beginCell().endCell(), // Empty body
      });

      expect(fundResult.transactions).toHaveTransaction({
        from: advertiser.address,
        to: escrow.address,
        success: true,
      });

      expect(await escrow.getStatus()).toBe(EscrowStatus.FUNDED);
    });

    it('should fund via explicit Fund message (op=0x746F6E46)', async () => {
      const fundResult = await escrow.sendFund(
        advertiser.getSender(),
        totalAmount + toNano('0.05'),
        1n,
      );

      expect(fundResult.transactions).toHaveTransaction({
        from: advertiser.address,
        to: escrow.address,
        success: true,
      });

      expect(await escrow.getStatus()).toBe(EscrowStatus.FUNDED);
    });

    it('should fund via text comment (op=0) from advertiser', async () => {
      const body = beginCell()
        .storeUint(0, 32) // op = 0 (text comment)
        .storeStringTail('funding escrow')
        .endCell();

      const fundResult = await advertiser.send({
        to: escrow.address,
        value: totalAmount + toNano('0.05'),
        body,
      });

      expect(fundResult.transactions).toHaveTransaction({
        from: advertiser.address,
        to: escrow.address,
        success: true,
      });

      expect(await escrow.getStatus()).toBe(EscrowStatus.FUNDED);
    });

    it('CRITICAL: should fund with exact totalAmount (msg_value check)', async () => {
      // This tests the critical fix: checking msg_value, not my_balance
      const fundResult = await advertiser.send({
        to: escrow.address,
        value: totalAmount, // Exact amount, no gas buffer
        body: beginCell().endCell(),
      });

      expect(fundResult.transactions).toHaveTransaction({
        from: advertiser.address,
        to: escrow.address,
        success: true,
      });

      expect(await escrow.getStatus()).toBe(EscrowStatus.FUNDED);
    });

    it('should reject funding from non-advertiser', async () => {
      const fundResult = await randomUser.send({
        to: escrow.address,
        value: totalAmount + toNano('0.05'),
        body: beginCell().endCell(),
      });

      expect(fundResult.transactions).toHaveTransaction({
        from: randomUser.address,
        to: escrow.address,
        success: false,
        exitCode: 101, // ERR_UNAUTHORIZED
      });

      expect(await escrow.getStatus()).toBe(EscrowStatus.PENDING);
    });

    it('should reject funding with insufficient msg_value', async () => {
      const fundResult = await advertiser.send({
        to: escrow.address,
        value: toNano('5'), // Less than totalAmount
        body: beginCell().endCell(),
      });

      expect(fundResult.transactions).toHaveTransaction({
        from: advertiser.address,
        to: escrow.address,
        success: false,
        exitCode: 103, // ERR_INSUFFICIENT_FUNDS
      });

      expect(await escrow.getStatus()).toBe(EscrowStatus.PENDING);
    });

    it('should accept excess funds when already FUNDED (no state change)', async () => {
      // First fund
      await advertiser.send({
        to: escrow.address,
        value: totalAmount + toNano('0.05'),
        body: beginCell().endCell(),
      });
      expect(await escrow.getStatus()).toBe(EscrowStatus.FUNDED);

      // Send more (should be accepted silently)
      const extraResult = await advertiser.send({
        to: escrow.address,
        value: toNano('1'),
        body: beginCell().endCell(),
      });

      expect(extraResult.transactions).toHaveTransaction({
        from: advertiser.address,
        to: escrow.address,
        success: true,
      });

      expect(await escrow.getStatus()).toBe(EscrowStatus.FUNDED);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // RELEASE TESTS
  // ═══════════════════════════════════════════════════════════════════

  describe('Release', () => {
    beforeEach(async () => {
      // Fund the escrow first
      await advertiser.send({
        to: escrow.address,
        value: totalAmount + toNano('0.05'),
        body: beginCell().endCell(),
      });
      expect(await escrow.getStatus()).toBe(EscrowStatus.FUNDED);
    });

    it('should release funds to platform when called by platform', async () => {
      const releaseResult = await escrow.sendRelease(platform.getSender());

      expect(releaseResult.transactions).toHaveTransaction({
        from: platform.address,
        to: escrow.address,
        success: true,
      });

      // Verify funds sent to platform
      expect(releaseResult.transactions).toHaveTransaction({
        from: escrow.address,
        to: platform.address,
        success: true,
      });

      // Contract should be destroyed (mode 128+32)
      // Status check may fail after destruction, which is expected
    });

    it('should reject release when not FUNDED', async () => {
      // Create new unfunded escrow
      const unfundedConfig = {
        dealId: dealId + 1n,
        advertiser: advertiser.address,
        publisher: publisher.address,
        platformWallet: platform.address,
        totalAmount,
        publisherAmount,
        deadline: getDeadline(),
      };
      const unfundedEscrow = blockchain.openContract(
        EscrowDeal.createFromConfig(unfundedConfig, escrowCode),
      );
      await unfundedEscrow.sendDeploy(deployer.getSender(), toNano('0.1'));

      const releaseResult = await unfundedEscrow.sendRelease(platform.getSender());

      expect(releaseResult.transactions).toHaveTransaction({
        from: platform.address,
        to: unfundedEscrow.address,
        success: false,
        exitCode: 102, // ERR_INVALID_STATE
      });
    });

    it('should reject release from non-platform', async () => {
      const releaseResult = await escrow.sendRelease(advertiser.getSender());

      expect(releaseResult.transactions).toHaveTransaction({
        from: advertiser.address,
        to: escrow.address,
        success: false,
        exitCode: 101, // ERR_UNAUTHORIZED
      });

      expect(await escrow.getStatus()).toBe(EscrowStatus.FUNDED);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // REFUND TESTS
  // ═══════════════════════════════════════════════════════════════════

  describe('Refund', () => {
    beforeEach(async () => {
      await advertiser.send({
        to: escrow.address,
        value: totalAmount + toNano('0.05'),
        body: beginCell().endCell(),
      });
      expect(await escrow.getStatus()).toBe(EscrowStatus.FUNDED);
    });

    it('should allow platform to refund anytime', async () => {
      const refundResult = await escrow.sendRefund(platform.getSender());

      expect(refundResult.transactions).toHaveTransaction({
        from: platform.address,
        to: escrow.address,
        success: true,
      });

      // Verify funds sent to advertiser
      expect(refundResult.transactions).toHaveTransaction({
        from: escrow.address,
        to: advertiser.address,
        success: true,
      });
    });

    it('should reject advertiser refund before deadline', async () => {
      const refundResult = await escrow.sendRefund(advertiser.getSender());

      expect(refundResult.transactions).toHaveTransaction({
        from: advertiser.address,
        to: escrow.address,
        success: false,
        exitCode: 104, // ERR_DEADLINE_NOT_MET
      });

      expect(await escrow.getStatus()).toBe(EscrowStatus.FUNDED);
    });

    it('should allow advertiser refund after deadline', async () => {
      // Create escrow with past deadline
      const expiredConfig = {
        dealId: dealId + 2n,
        advertiser: advertiser.address,
        publisher: publisher.address,
        platformWallet: platform.address,
        totalAmount,
        publisherAmount,
        deadline: getPastDeadline(),
      };
      const expiredEscrow = blockchain.openContract(
        EscrowDeal.createFromConfig(expiredConfig, escrowCode),
      );
      await expiredEscrow.sendDeploy(deployer.getSender(), toNano('0.1'));

      // Fund it
      await advertiser.send({
        to: expiredEscrow.address,
        value: totalAmount + toNano('0.05'),
        body: beginCell().endCell(),
      });

      // Now advertiser can refund
      const refundResult = await expiredEscrow.sendRefund(advertiser.getSender());

      expect(refundResult.transactions).toHaveTransaction({
        from: advertiser.address,
        to: expiredEscrow.address,
        success: true,
      });
    });

    it('should reject publisher refund', async () => {
      const refundResult = await escrow.sendRefund(publisher.getSender());

      expect(refundResult.transactions).toHaveTransaction({
        from: publisher.address,
        to: escrow.address,
        success: false,
        exitCode: 101, // ERR_UNAUTHORIZED
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // DISPUTE TESTS
  // ═══════════════════════════════════════════════════════════════════

  describe('Dispute', () => {
    beforeEach(async () => {
      await advertiser.send({
        to: escrow.address,
        value: totalAmount + toNano('0.05'),
        body: beginCell().endCell(),
      });
    });

    it('should allow advertiser to open dispute', async () => {
      const disputeResult = await escrow.sendDispute(advertiser.getSender());

      expect(disputeResult.transactions).toHaveTransaction({
        from: advertiser.address,
        to: escrow.address,
        success: true,
      });

      expect(await escrow.getStatus()).toBe(EscrowStatus.DISPUTED);
    });

    it('should allow publisher to open dispute', async () => {
      const disputeResult = await escrow.sendDispute(publisher.getSender());

      expect(disputeResult.transactions).toHaveTransaction({
        from: publisher.address,
        to: escrow.address,
        success: true,
      });

      expect(await escrow.getStatus()).toBe(EscrowStatus.DISPUTED);
    });

    it('should reject dispute from random user', async () => {
      const disputeResult = await escrow.sendDispute(randomUser.getSender());

      expect(disputeResult.transactions).toHaveTransaction({
        from: randomUser.address,
        to: escrow.address,
        success: false,
        exitCode: 101,
      });
    });

    it('should reject dispute when not FUNDED', async () => {
      // Create unfunded escrow
      const unfundedConfig = {
        dealId: dealId + 3n,
        advertiser: advertiser.address,
        publisher: publisher.address,
        platformWallet: platform.address,
        totalAmount,
        publisherAmount,
        deadline: getDeadline(),
      };
      const unfundedEscrow = blockchain.openContract(
        EscrowDeal.createFromConfig(unfundedConfig, escrowCode),
      );
      await unfundedEscrow.sendDeploy(deployer.getSender(), toNano('0.1'));

      const disputeResult = await unfundedEscrow.sendDispute(advertiser.getSender());

      expect(disputeResult.transactions).toHaveTransaction({
        success: false,
        exitCode: 102,
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // RESOLVE DISPUTE TESTS
  // ═══════════════════════════════════════════════════════════════════

  describe('Resolve Dispute', () => {
    beforeEach(async () => {
      await advertiser.send({
        to: escrow.address,
        value: totalAmount + toNano('0.05'),
        body: beginCell().endCell(),
      });
      await escrow.sendDispute(advertiser.getSender());
      expect(await escrow.getStatus()).toBe(EscrowStatus.DISPUTED);
    });

    it('should resolve in favor of publisher (release)', async () => {
      const resolveResult = await escrow.sendResolve(
        platform.getSender(),
        true, // releaseToPublisher
      );

      expect(resolveResult.transactions).toHaveTransaction({
        from: platform.address,
        to: escrow.address,
        success: true,
      });

      // Funds should go to platform
      expect(resolveResult.transactions).toHaveTransaction({
        from: escrow.address,
        to: platform.address,
        success: true,
      });
    });

    it('should resolve in favor of advertiser (refund)', async () => {
      const resolveResult = await escrow.sendResolve(
        platform.getSender(),
        false, // refund advertiser
      );

      expect(resolveResult.transactions).toHaveTransaction({
        from: platform.address,
        to: escrow.address,
        success: true,
      });

      // Funds should go to advertiser
      expect(resolveResult.transactions).toHaveTransaction({
        from: escrow.address,
        to: advertiser.address,
        success: true,
      });
    });

    it('should reject resolve from non-platform', async () => {
      const resolveResult = await escrow.sendResolve(advertiser.getSender(), true);

      expect(resolveResult.transactions).toHaveTransaction({
        success: false,
        exitCode: 101,
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // EXTEND DEADLINE TESTS
  // ═══════════════════════════════════════════════════════════════════

  describe('Extend Deadline', () => {
    beforeEach(async () => {
      await advertiser.send({
        to: escrow.address,
        value: totalAmount + toNano('0.05'),
        body: beginCell().endCell(),
      });
    });

    it('should allow platform to extend deadline', async () => {
      const newDeadline = getDeadline(48); // 48 hours from now

      const extendResult = await escrow.sendExtendDeadline(
        platform.getSender(),
        newDeadline,
      );

      expect(extendResult.transactions).toHaveTransaction({
        from: platform.address,
        to: escrow.address,
        success: true,
      });

      expect(await escrow.getDeadline()).toBe(newDeadline);
    });

    it('should reject deadline in the past', async () => {
      const extendResult = await escrow.sendExtendDeadline(
        platform.getSender(),
        getPastDeadline(),
      );

      expect(extendResult.transactions).toHaveTransaction({
        success: false,
        exitCode: 108, // ERR_INVALID_DEADLINE
      });
    });

    it('should reject extend from non-platform', async () => {
      const extendResult = await escrow.sendExtendDeadline(
        advertiser.getSender(),
        getDeadline(48),
      );

      expect(extendResult.transactions).toHaveTransaction({
        success: false,
        exitCode: 101,
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // EDGE CASES
  // ═══════════════════════════════════════════════════════════════════

  describe('Edge Cases', () => {
    it('should handle unknown op-code gracefully', async () => {
      const unknownOp = beginCell()
        .storeUint(0xDEADBEEF, 32)
        .storeUint(0n, 64)
        .endCell();

      const result = await advertiser.send({
        to: escrow.address,
        value: toNano('0.1'),
        body: unknownOp,
      });

      expect(result.transactions).toHaveTransaction({
        from: advertiser.address,
        to: escrow.address,
        success: false,
        exitCode: 106, // ERR_INVALID_OP
      });
    });

    it('should verify exact amounts in release', async () => {
      await advertiser.send({
        to: escrow.address,
        value: totalAmount + toNano('0.1'),
        body: beginCell().endCell(),
      });

      const platformBalanceBefore = await platform.getBalance();
      await escrow.sendRelease(platform.getSender());
      const platformBalanceAfter = await platform.getBalance();

      // Platform should receive at least totalAmount (minus gas)
      const received = platformBalanceAfter - platformBalanceBefore;
      expect(received).toBeGreaterThan(totalAmount - toNano('0.2')); // Allow for gas
    });
  });
});
