export enum EscrowStatus {
  PENDING = 'PENDING',
  FUNDED = 'FUNDED',
  LOCKED = 'LOCKED',
  RELEASING = 'RELEASING',
  RELEASED = 'RELEASED',
  REFUNDING = 'REFUNDING',
  REFUNDED = 'REFUNDED',
  DISPUTED = 'DISPUTED',
  CANCELLED = 'CANCELLED',
}

export enum TransactionType {
  DEPOSIT = 'DEPOSIT',
  WITHDRAWAL = 'WITHDRAWAL',
  ESCROW_LOCK = 'ESCROW_LOCK',
  ESCROW_RELEASE = 'ESCROW_RELEASE',
  ESCROW_REFUND = 'ESCROW_REFUND',
  PLATFORM_FEE = 'PLATFORM_FEE',
  PAYOUT = 'PAYOUT',
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  CONFIRMED = 'CONFIRMED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export interface Escrow {
  id: string;
  dealId: string;
  escrowWalletAddress: string;
  advertiserWallet: string;
  channelOwnerWallet: string;
  platformWallet: string;
  amount: bigint;
  platformFee: bigint;
  totalAmount: bigint;
  status: EscrowStatus;
  fundingTxHash: string | null;
  releaseTxHash: string | null;
  refundTxHash: string | null;
  fundedAt: Date | null;
  releasedAt: Date | null;
  refundedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date | null;
}

export interface Transaction {
  id: string;
  userId: string | null;
  escrowId: string | null;
  type: TransactionType;
  status: TransactionStatus;
  amount: bigint;
  fee: bigint;
  currency: string;
  fromAddress: string | null;
  toAddress: string | null;
  txHash: string | null;
  lt: bigint | null;
  utime: Date | null;
  description: string | null;
  metadata: Record<string, unknown> | null;
  errorMessage: string | null;
  createdAt: Date;
  confirmedAt: Date | null;
}

export interface PaymentLink {
  paymentLink: string;
  qrCode: string;
  amount: string;
  address: string;
  memo: string;
  expiresAt: Date;
}

export interface TonProofPayload {
  address: string;
  network: string;
  proof: {
    timestamp: number;
    domain: string;
    signature: string;
    payload: string;
  };
}

export interface TransactionFilters {
  type?: TransactionType | TransactionType[];
  status?: TransactionStatus;
  sortBy?: 'created' | 'amount';
  sortOrder?: 'asc' | 'desc';
}
