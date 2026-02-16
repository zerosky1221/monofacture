import { EscrowStatus, TransactionType, TransactionStatus } from '../types/escrow.types.js';

export const ESCROW_STATUS_LABELS: Record<EscrowStatus, string> = {
  [EscrowStatus.PENDING]: 'Pending',
  [EscrowStatus.FUNDED]: 'Funded',
  [EscrowStatus.LOCKED]: 'Locked',
  [EscrowStatus.RELEASING]: 'Releasing',
  [EscrowStatus.RELEASED]: 'Released',
  [EscrowStatus.REFUNDING]: 'Refunding',
  [EscrowStatus.REFUNDED]: 'Refunded',
  [EscrowStatus.DISPUTED]: 'Disputed',
  [EscrowStatus.CANCELLED]: 'Cancelled',
};

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  [TransactionType.DEPOSIT]: 'Deposit',
  [TransactionType.WITHDRAWAL]: 'Withdrawal',
  [TransactionType.ESCROW_LOCK]: 'Escrow Lock',
  [TransactionType.ESCROW_RELEASE]: 'Escrow Release',
  [TransactionType.ESCROW_REFUND]: 'Escrow Refund',
  [TransactionType.PLATFORM_FEE]: 'Platform Fee',
  [TransactionType.PAYOUT]: 'Payout',
};

export const TRANSACTION_STATUS_LABELS: Record<TransactionStatus, string> = {
  [TransactionStatus.PENDING]: 'Pending',
  [TransactionStatus.PROCESSING]: 'Processing',
  [TransactionStatus.CONFIRMED]: 'Confirmed',
  [TransactionStatus.FAILED]: 'Failed',
  [TransactionStatus.CANCELLED]: 'Cancelled',
};
