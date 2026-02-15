import { apiClient } from './client';

export interface UserBalance {
  id: string;
  userId: string;
  available: string;
  pending: string;
  totalEarned: string;
  totalWithdrawn: string;
  totalReferral: string;
  createdAt: string;
  updatedAt: string;
}

export interface BalanceTransaction {
  id: string;
  balanceId: string;
  type: 'DEAL_EARNING' | 'WITHDRAWAL' | 'REFERRAL_EARNING' | 'REFUND_CREDIT';
  amount: string;
  description: string;
  dealId?: string;
  referralId?: string;
  withdrawalId?: string;
  createdAt: string;
  deal?: {
    id: string;
    referenceNumber: string;
  };
}

export interface Withdrawal {
  id: string;
  userId: string;
  balanceId: string;
  amount: string;
  fee: string;
  netAmount: string;
  toAddress: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  txHash?: string;
  errorMessage?: string;
  createdAt: string;
  processedAt?: string;
}

export interface BalanceWithHistory extends UserBalance {
  transactions: BalanceTransaction[];
  pendingWithdrawals: Withdrawal[];
}

export interface PaginatedTransactions {
  items: BalanceTransaction[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedWithdrawals {
  items: Withdrawal[];
  total: number;
  page: number;
  limit: number;
}

export const balanceApi = {
  getBalance: () => apiClient.get<BalanceWithHistory>('/balance'),

  getTransactions: (page = 1, limit = 20, type?: string) =>
    apiClient.get<PaginatedTransactions>('/balance/transactions', {
      params: { page, limit, type },
    }),

  requestWithdrawal: (amount: string, toAddress: string) =>
    apiClient.post<Withdrawal>('/balance/withdraw', { amount, toAddress }),

  getWithdrawals: (page = 1, limit = 20) =>
    apiClient.get<PaginatedWithdrawals>('/balance/withdrawals', {
      params: { page, limit },
    }),
};
