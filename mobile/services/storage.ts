import AsyncStorage from '@react-native-async-storage/async-storage';

class StorageService {
  private readonly keys = {
    AUTH_TOKEN: 'auth_token',
    USER_DATA: 'user_data',
    ONBOARDING_STATUS: 'onboarding_status',
    LANGUAGE: 'language',
    BIOMETRIC_ENABLED: 'biometric_enabled',
    NOTIFICATIONS_ENABLED: 'notifications_enabled',
    DEMO_DATA: 'demo_data',
  };

  async initialize(): Promise<void> {
    try {
      // Initialize demo data if not exists
      const demoData = await this.getDemoData();
      if (!demoData) {
        await this.initializeDemoData();
      }
    } catch (error) {
      console.error('Storage initialization failed:', error);
    }
  }

  // Auth token methods
  async setAuthToken(token: string): Promise<void> {
    await AsyncStorage.setItem(this.keys.AUTH_TOKEN, token);
  }

  async getAuthToken(): Promise<string | null> {
    return AsyncStorage.getItem(this.keys.AUTH_TOKEN);
  }

  async clearAuthToken(): Promise<void> {
    await AsyncStorage.removeItem(this.keys.AUTH_TOKEN);
  }

  // User data methods
  async setUserData(userData: any): Promise<void> {
    await AsyncStorage.setItem(this.keys.USER_DATA, JSON.stringify(userData));
  }

  async getUserData(): Promise<any | null> {
    const data = await AsyncStorage.getItem(this.keys.USER_DATA);
    return data ? JSON.parse(data) : null;
  }

  async clearUserData(): Promise<void> {
    await AsyncStorage.removeItem(this.keys.USER_DATA);
  }

  // Onboarding status
  async setOnboardingStatus(completed: boolean): Promise<void> {
    await AsyncStorage.setItem(this.keys.ONBOARDING_STATUS, JSON.stringify(completed));
  }

  async getOnboardingStatus(): Promise<boolean> {
    const status = await AsyncStorage.getItem(this.keys.ONBOARDING_STATUS);
    return status ? JSON.parse(status) : false;
  }

  // Language preference
  async setLanguage(language: string): Promise<void> {
    await AsyncStorage.setItem(this.keys.LANGUAGE, language);
  }

  async getLanguage(): Promise<string> {
    const language = await AsyncStorage.getItem(this.keys.LANGUAGE);
    return language || 'en';
  }

  // Biometric settings
  async setBiometricEnabled(enabled: boolean): Promise<void> {
    await AsyncStorage.setItem(this.keys.BIOMETRIC_ENABLED, JSON.stringify(enabled));
  }

  async getBiometricEnabled(): Promise<boolean> {
    const enabled = await AsyncStorage.getItem(this.keys.BIOMETRIC_ENABLED);
    return enabled ? JSON.parse(enabled) : false;
  }

  // Notification settings
  async setNotificationsEnabled(enabled: boolean): Promise<void> {
    await AsyncStorage.setItem(this.keys.NOTIFICATIONS_ENABLED, JSON.stringify(enabled));
  }

  async getNotificationsEnabled(): Promise<boolean> {
    const enabled = await AsyncStorage.getItem(this.keys.NOTIFICATIONS_ENABLED);
    return enabled ? JSON.parse(enabled) : true; // Default to enabled
  }

  // Demo data for Phase 0
  async initializeDemoData(): Promise<void> {
    const demoData = {
      balance: 150000, // 150,000 RWF
      transactions: [
        {
          id: 1,
          amount: '5000',
          type: 'deposit',
          description: 'MoMo Deposit',
          date: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
          isIncoming: true,
        },
        {
          id: 2,
          amount: '2500',
          type: 'transfer',
          description: 'Transfer to John Doe',
          date: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago
          isIncoming: false,
        },
        {
          id: 3,
          amount: '1200',
          type: 'payment',
          description: 'Coffee Shop Payment',
          date: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(), // 3 days ago
          isIncoming: false,
        },
      ],
      cards: [
        {
          id: 1,
          maskedPan: '624100******1234',
          expiryDate: '12/2027',
          cardType: 'virtual',
          provider: 'unionpay',
          isActive: true,
        },
      ],
      notifications: [
        {
          id: 1,
          title: 'Welcome to Centrika',
          body: 'Your account has been created successfully.',
          type: 'system',
          isRead: false,
          createdAt: new Date().toISOString(),
        },
      ],
    };

    await AsyncStorage.setItem(this.keys.DEMO_DATA, JSON.stringify(demoData));
  }

  async getDemoData(): Promise<any | null> {
    const data = await AsyncStorage.getItem(this.keys.DEMO_DATA);
    return data ? JSON.parse(data) : null;
  }

  async updateDemoBalance(newBalance: number): Promise<void> {
    const demoData = await this.getDemoData();
    if (demoData) {
      demoData.balance = newBalance;
      await AsyncStorage.setItem(this.keys.DEMO_DATA, JSON.stringify(demoData));
    }
  }

  async addDemoTransaction(transaction: any): Promise<void> {
    const demoData = await this.getDemoData();
    if (demoData) {
      demoData.transactions.unshift({
        ...transaction,
        id: Date.now(),
        date: new Date().toISOString(),
      });
      await AsyncStorage.setItem(this.keys.DEMO_DATA, JSON.stringify(demoData));
    }
  }

  // Clear all data
  async clearAll(): Promise<void> {
    await AsyncStorage.multiRemove([
      this.keys.AUTH_TOKEN,
      this.keys.USER_DATA,
      this.keys.ONBOARDING_STATUS,
      this.keys.LANGUAGE,
      this.keys.BIOMETRIC_ENABLED,
      this.keys.NOTIFICATIONS_ENABLED,
      this.keys.DEMO_DATA,
    ]);
  }

  // Get all stored keys (for debugging)
  async getAllKeys(): Promise<string[]> {
    return AsyncStorage.getAllKeys();
  }

  // Get multiple items at once
  async getMultipleItems(keys: string[]): Promise<[string, string | null][]> {
    return AsyncStorage.multiGet(keys);
  }
}

export const storageService = new StorageService();
