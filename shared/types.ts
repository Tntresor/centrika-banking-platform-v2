export interface KYCRequest {
  documentType: 'national_id' | 'passport';
  documentImage: string; // base64
  selfieImage: string; // base64
  userId: number;
}

export interface KYCResponse {
  success: boolean;
  verificationId: string;
  status: 'pending' | 'approved' | 'rejected';
  score?: number;
  message?: string;
}

export interface MoMoDepositRequest {
  amount: number;
  phoneNumber: string;
  currency: string;
}

export interface MoMoWithdrawalRequest {
  amount: number;
  phoneNumber: string;
  currency: string;
}

export interface P2PTransferRequest {
  recipientPhone: string;
  amount: number;
  description?: string;
}

export interface QRPaymentRequest {
  qrData: string;
  amount?: number;
}

export interface CardGenerationRequest {
  userId: number;
  cardType: 'virtual' | 'physical';
}

export interface BNRReportData {
  date: string;
  totalTransactions: number;
  totalVolume: number;
  userCount: number;
  kycApprovalRate: number;
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface MetricsData {
  dailySignups: number;
  successfulKYCRate: number;
  transactionCount: number;
  totalLedgerBalance: number;
  activeUsers: number;
}
