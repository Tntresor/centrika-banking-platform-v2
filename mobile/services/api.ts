import { storageService } from './storage';
import type { 
  KYCRequest, 
  MoMoDepositRequest, 
  MoMoWithdrawalRequest, 
  P2PTransferRequest, 
  QRPaymentRequest,
  CardGenerationRequest,
  APIResponse 
} from '../../shared/types';

class APIService {
  private baseURL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/api';

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<APIResponse<T>> {
    try {
      const token = await storageService.getAuthToken();
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
      };

      if (token && !endpoint.includes('/auth/')) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...options,
        headers,
      });

      const data = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          error: data.error || `HTTP ${response.status}`,
        };
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      return {
        success: false,
        error: 'Network error occurred',
      };
    }
  }

  // Auth endpoints
  async register(userData: {
    phone: string;
    firstName: string;
    lastName: string;
    email?: string;
    preferredLanguage?: string;
  }): Promise<APIResponse> {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async login(phone: string, otp: string): Promise<APIResponse> {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phone, otp }),
    });
  }

  async sendOTP(phone: string): Promise<APIResponse> {
    return this.request('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
  }

  async validateToken(token: string): Promise<boolean> {
    try {
      const response = await this.request('/users/profile');
      return response.success;
    } catch {
      return false;
    }
  }

  // User endpoints
  async getUserProfile(): Promise<APIResponse> {
    return this.request('/users/profile');
  }

  async updateUserProfile(updates: {
    firstName?: string;
    lastName?: string;
    email?: string;
    preferredLanguage?: string;
    address?: string;
  }): Promise<APIResponse> {
    return this.request('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async getUserNotifications(): Promise<APIResponse> {
    return this.request('/users/notifications');
  }

  async markNotificationAsRead(id: number): Promise<APIResponse> {
    return this.request(`/users/notifications/${id}/read`, {
      method: 'PUT',
    });
  }

  async getUserWallet(): Promise<APIResponse> {
    return this.request('/users/wallet');
  }

  // KYC endpoints
  async submitKYC(kycData: KYCRequest): Promise<APIResponse> {
    return this.request('/kyc/submit', {
      method: 'POST',
      body: JSON.stringify(kycData),
    });
  }

  async getKYCStatus(): Promise<APIResponse> {
    return this.request('/kyc/status');
  }

  // Transaction endpoints
  async getTransactionHistory(limit?: number): Promise<APIResponse> {
    const params = limit ? `?limit=${limit}` : '';
    return this.request(`/transactions/history${params}`);
  }

  async getTransactionDetails(id: number): Promise<APIResponse> {
    return this.request(`/transactions/${id}`);
  }

  async p2pTransfer(transferData: P2PTransferRequest): Promise<APIResponse> {
    return this.request('/transactions/p2p', {
      method: 'POST',
      body: JSON.stringify(transferData),
    });
  }

  async qrPayment(paymentData: QRPaymentRequest): Promise<APIResponse> {
    return this.request('/transactions/qr-pay', {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
  }

  // MoMo endpoints
  async momoDeposit(depositData: MoMoDepositRequest): Promise<APIResponse> {
    return this.request('/momo/deposit', {
      method: 'POST',
      body: JSON.stringify(depositData),
    });
  }

  async momoWithdraw(withdrawData: MoMoWithdrawalRequest): Promise<APIResponse> {
    return this.request('/momo/withdraw', {
      method: 'POST',
      body: JSON.stringify(withdrawData),
    });
  }

  async getMoMoStatus(reference: string): Promise<APIResponse> {
    return this.request(`/momo/status/${reference}`);
  }

  // Card endpoints
  async getUserCards(): Promise<APIResponse> {
    return this.request('/cards');
  }

  async generateCard(cardData: CardGenerationRequest): Promise<APIResponse> {
    return this.request('/cards/generate', {
      method: 'POST',
      body: JSON.stringify(cardData),
    });
  }

  async getCardDetails(cardId: number): Promise<APIResponse> {
    return this.request(`/cards/${cardId}/details`);
  }

  async updateCardStatus(cardId: number, isActive: boolean): Promise<APIResponse> {
    return this.request(`/cards/${cardId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ isActive }),
    });
  }

  // Admin endpoints (for back-office)
  async adminLogin(email: string, password: string): Promise<APIResponse> {
    return this.request('/auth/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async getAdminMetrics(): Promise<APIResponse> {
    return this.request('/admin/metrics');
  }

  async searchUsers(query: string, status?: string, page = 1, limit = 20): Promise<APIResponse> {
    const params = new URLSearchParams({
      query,
      page: page.toString(),
      limit: limit.toString(),
    });
    
    if (status) {
      params.append('status', status);
    }

    return this.request(`/admin/users?${params.toString()}`);
  }

  async getUserDetails(userId: number): Promise<APIResponse> {
    return this.request(`/admin/users/${userId}`);
  }

  async reviewKYC(documentId: number, status: 'approved' | 'rejected', notes?: string): Promise<APIResponse> {
    return this.request(`/kyc/review/${documentId}`, {
      method: 'PUT',
      body: JSON.stringify({ status, notes }),
    });
  }

  async getPendingKYC(): Promise<APIResponse> {
    return this.request('/kyc/pending');
  }

  async adjustWallet(walletId: number, amount: number, type: 'credit' | 'debit', reason: string): Promise<APIResponse> {
    return this.request(`/admin/wallets/${walletId}/adjust`, {
      method: 'POST',
      body: JSON.stringify({ amount, type, reason }),
    });
  }

  async getAuditLogs(page = 1, limit = 50): Promise<APIResponse> {
    return this.request(`/admin/audit?page=${page}&limit=${limit}`);
  }

  async generateBNRReport(date: string): Promise<APIResponse> {
    return this.request('/admin/reports/bnr', {
      method: 'POST',
      body: JSON.stringify({ date }),
    });
  }
}

export const apiService = new APIService();
