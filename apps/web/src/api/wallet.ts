import { apiClient } from './client';

export interface WalletBalance {
  available: string;
  pending: string;
  escrow: string;
  total: string;
  currency: string;
}

export interface Transaction {
  id: string;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'PAYMENT' | 'EARNING' | 'REFUND' | 'FEE';
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  amount: string;
  fee?: string;
  currency: string;
  description?: string;
  dealId?: string;
  deal?: {
    id: string;
    type: string;
    channel?: {
      title: string;
      username: string;
    };
  };
  txHash?: string;
  fromAddress?: string;
  toAddress?: string;
  createdAt: string;
  completedAt?: string;
}

export interface TransactionFilters {
  type?: Transaction['type'];
  status?: Transaction['status'];
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const walletApi = {
  getBalance: () =>
    apiClient.get<WalletBalance>('/wallet/balance'),

  getTransactions: (filters?: TransactionFilters) =>
    apiClient.get<PaginatedResponse<Transaction>>('/wallet/transactions', {
      params: filters as Record<string, string | number | boolean | undefined>
    }),

  getTransactionById: (id: string) =>
    apiClient.get<Transaction>(`/wallet/transactions/${id}`),

  requestWithdrawal: (data: WithdrawalRequest) =>
    apiClient.post<Transaction>('/wallet/withdraw', data),

  cancelWithdrawal: (id: string) =>
    apiClient.post(`/wallet/transactions/${id}/cancel`),

  getDepositAddress: () =>
    apiClient.get<{ address: string }>('/wallet/deposit-address'),

  verifyDeposit: (txHash: string) =>
    apiClient.post<Transaction>('/wallet/verify-deposit', { txHash }),
};

export interface WithdrawalRequest {
  amount: string;
  toAddress: string;
}
