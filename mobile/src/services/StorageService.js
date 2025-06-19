import AsyncStorage from '@react-native-async-storage/async-storage';

class StorageService {
  // User data
  async getUser() {
    try {
      const userData = await AsyncStorage.getItem('user');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  }

  async setUser(user) {
    try {
      await AsyncStorage.setItem('user', JSON.stringify(user));
    } catch (error) {
      console.error('Error setting user:', error);
    }
  }

  async removeUser() {
    try {
      await AsyncStorage.removeItem('user');
    } catch (error) {
      console.error('Error removing user:', error);
    }
  }

  // Balance data
  async getBalance(userId) {
    try {
      const balance = await AsyncStorage.getItem(`balance_${userId}`);
      return balance ? parseFloat(balance) : 0;
    } catch (error) {
      console.error('Error getting balance:', error);
      return 0;
    }
  }

  async setBalance(userId, balance) {
    try {
      await AsyncStorage.setItem(`balance_${userId}`, balance.toString());
    } catch (error) {
      console.error('Error setting balance:', error);
    }
  }

  async updateBalance(userId, amount) {
    try {
      const currentBalance = await this.getBalance(userId);
      const newBalance = currentBalance + amount;
      await this.setBalance(userId, newBalance);
      return newBalance;
    } catch (error) {
      console.error('Error updating balance:', error);
      throw error;
    }
  }

  // Transactions data
  async getTransactions(userId) {
    try {
      const transactions = await AsyncStorage.getItem(`transactions_${userId}`);
      return transactions ? JSON.parse(transactions) : [];
    } catch (error) {
      console.error('Error getting transactions:', error);
      return [];
    }
  }

  async addTransaction(userId, transaction) {
    try {
      const transactions = await this.getTransactions(userId);
      const newTransaction = {
        id: Date.now().toString(),
        ...transaction,
        date: new Date().toISOString(),
        status: 'completed',
      };
      transactions.unshift(newTransaction);
      
      // Keep only last 100 transactions
      const limitedTransactions = transactions.slice(0, 100);
      
      await AsyncStorage.setItem(
        `transactions_${userId}`,
        JSON.stringify(limitedTransactions)
      );
      
      return newTransaction;
    } catch (error) {
      console.error('Error adding transaction:', error);
      throw error;
    }
  }

  // Language preference
  async getLanguage() {
    try {
      const language = await AsyncStorage.getItem('language');
      return language || 'en';
    } catch (error) {
      console.error('Error getting language:', error);
      return 'en';
    }
  }

  async setLanguage(language) {
    try {
      await AsyncStorage.setItem('language', language);
    } catch (error) {
      console.error('Error setting language:', error);
    }
  }

  // App settings
  async getSettings() {
    try {
      const settings = await AsyncStorage.getItem('settings');
      return settings ? JSON.parse(settings) : {
        notifications: true,
        biometrics: false,
        currency: 'RWF',
      };
    } catch (error) {
      console.error('Error getting settings:', error);
      return {
        notifications: true,
        biometrics: false,
        currency: 'RWF',
      };
    }
  }

  async setSettings(settings) {
    try {
      await AsyncStorage.setItem('settings', JSON.stringify(settings));
    } catch (error) {
      console.error('Error setting settings:', error);
    }
  }

  // KYC data (temporary storage)
  async setKYCData(userId, kycData) {
    try {
      await AsyncStorage.setItem(`kyc_${userId}`, JSON.stringify(kycData));
    } catch (error) {
      console.error('Error setting KYC data:', error);
    }
  }

  async getKYCData(userId) {
    try {
      const kycData = await AsyncStorage.getItem(`kyc_${userId}`);
      return kycData ? JSON.parse(kycData) : null;
    } catch (error) {
      console.error('Error getting KYC data:', error);
      return null;
    }
  }

  async removeKYCData(userId) {
    try {
      await AsyncStorage.removeItem(`kyc_${userId}`);
    } catch (error) {
      console.error('Error removing KYC data:', error);
    }
  }

  // Virtual cards
  async getCards(userId) {
    try {
      const cards = await AsyncStorage.getItem(`cards_${userId}`);
      return cards ? JSON.parse(cards) : [];
    } catch (error) {
      console.error('Error getting cards:', error);
      return [];
    }
  }

  async addCard(userId, card) {
    try {
      const cards = await this.getCards(userId);
      const newCard = {
        id: Date.now().toString(),
        ...card,
        createdAt: new Date().toISOString(),
      };
      cards.push(newCard);
      
      await AsyncStorage.setItem(`cards_${userId}`, JSON.stringify(cards));
      return newCard;
    } catch (error) {
      console.error('Error adding card:', error);
      throw error;
    }
  }

  // Clear all data (for sign out)
  async clearUserData(userId) {
    try {
      const keys = [
        'user',
        `balance_${userId}`,
        `transactions_${userId}`,
        `kyc_${userId}`,
        `cards_${userId}`,
      ];
      
      await AsyncStorage.multiRemove(keys);
    } catch (error) {
      console.error('Error clearing user data:', error);
    }
  }

  // Clear all app data
  async clearAllData() {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Error clearing all data:', error);
    }
  }
}

export default new StorageService();
