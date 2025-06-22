import Constants from 'expo-constants';

class ApiService {
  constructor() {
    // Use environment variable or fallback to localhost for development
    this.baseURL = Constants.expoConfig?.extra?.apiUrl || 'https://centrika-banking-platform-v2.onrender.com/api';
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    // Add auth token if available
    const token = await this.getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  async get(endpoint, options = {}) {
    return this.request(endpoint, { method: 'GET', ...options });
  }

  async post(endpoint, data, options = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
      ...options,
    });
  }

  async put(endpoint, data, options = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
      ...options,
    });
  }

  async delete(endpoint, options = {}) {
    return this.request(endpoint, { method: 'DELETE', ...options });
  }

  async getAuthToken() {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      return await AsyncStorage.getItem('authToken');
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }

  async setAuthToken(token) {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.setItem('authToken', token);
    } catch (error) {
      console.error('Error setting auth token:', error);
    }
  }

  async removeAuthToken() {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.removeItem('authToken');
    } catch (error) {
      console.error('Error removing auth token:', error);
    }
  }

  // Auth endpoints
  async signUp(userData) {
    return this.post('/auth/signup', userData);
  }

  async signIn(credentials) {
    return this.post('/auth/signin', credentials);
  }

  async verifyKYC(kycData) {
    return this.post('/kyc/verify', kycData);
  }

  // Transaction endpoints
  async getTransactions(userId) {
    return this.get(`/transactions/${userId}`);
  }

  async createTransaction(transactionData) {
    return this.post('/transactions', transactionData);
  }

  // MoMo endpoints
  async depositMoMo(depositData) {
    return this.post('/momo/deposit', depositData);
  }

  async withdrawMoMo(withdrawData) {
    return this.post('/momo/withdraw', withdrawData);
  }

  // P2P endpoints
  async transferP2P(transferData) {
    return this.post('/transactions/p2p', transferData);
  }

  // QR payment endpoints
  async processQRPayment(paymentData) {
    return this.post('/transactions/qr-payment', paymentData);
  }

  // Card endpoints
  async getCards(userId) {
    return this.get(`/cards/${userId}`);
  }

  async createVirtualCard(cardData) {
    return this.post('/cards/virtual', cardData);
  }

  // User endpoints
  async getUserProfile(userId) {
    return this.get(`/users/${userId}`);
  }

  async updateUserProfile(userId, userData) {
    return this.put(`/users/${userId}`, userData);
  }

  // Notification endpoints
  async registerForNotifications(token, userId) {
    return this.post('/notifications/register', { token, userId });
  }

  // Utility method for uploading files
  async uploadFile(endpoint, file, additionalData = {}) {
    const formData = new FormData();
    formData.append('file', file);
    
    Object.keys(additionalData).forEach(key => {
      formData.append(key, additionalData[key]);
    });

    const token = await this.getAuthToken();
    const headers = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('File upload failed:', error);
      throw error;
    }
  }
}

export default new ApiService();
