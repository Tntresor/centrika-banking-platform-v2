const admin = require('firebase-admin');
const storage = require('../storage/MemoryStorage');

class NotificationService {
  constructor() {
    this.isInitialized = false;
  }

  // Initialize Firebase Admin SDK
  async initialize() {
    try {
      // Initialize Firebase Admin with service account
      const serviceAccount = {
        type: "service_account",
        project_id: process.env.FIREBASE_PROJECT_ID || "centrika-neobank",
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
        private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID,
        auth_uri: "https://accounts.google.com/o/oauth2/auth",
        token_uri: "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL,
      };

      // Only initialize if not already done
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
      }

      this.isInitialized = true;
      console.log('Firebase Admin SDK initialized successfully');

    } catch (error) {
      console.error('Firebase initialization error:', error);
      // For demo purposes, continue without FCM
      this.isInitialized = false;
    }
  }

  // Register device token for user
  async registerDeviceToken(userId, token, deviceInfo = {}) {
    try {
      const deviceRegistration = {
        id: `device_${Date.now()}_${userId}`,
        userId,
        token,
        platform: deviceInfo.platform || 'unknown',
        deviceId: deviceInfo.deviceId,
        appVersion: deviceInfo.appVersion,
        osVersion: deviceInfo.osVersion,
        registeredAt: new Date(),
        lastUsed: new Date(),
        active: true,
      };

      await storage.createDeviceRegistration(deviceRegistration);

      return { success: true, registrationId: deviceRegistration.id };

    } catch (error) {
      console.error('Register device token error:', error);
      return { success: false, message: 'Failed to register device' };
    }
  }

  // Send push notification to user
  async sendNotification(userId, notification) {
    try {
      if (!this.isInitialized) {
        console.log('FCM not initialized, logging notification:', notification);
        return { success: true, simulated: true };
      }

      // Get user's device tokens
      const devices = await storage.getDeviceRegistrationsByUserId(userId);
      const activeTokens = devices
        .filter(device => device.active)
        .map(device => device.token);

      if (activeTokens.length === 0) {
        console.log('No active device tokens for user:', userId);
        return { success: true, message: 'No active devices' };
      }

      // Prepare FCM message
      const message = {
        notification: {
          title: notification.title,
          body: notification.body,
        },
        data: {
          type: notification.type || 'general',
          userId: userId.toString(),
          timestamp: new Date().toISOString(),
          ...notification.data,
        },
        tokens: activeTokens,
      };

      // Send notification
      const response = await admin.messaging().sendMulticast(message);

      // Process response and update token validity
      if (response.failureCount > 0) {
        await this.handleFailedTokens(response.responses, activeTokens);
      }

      // Store notification in history
      await this.storeNotificationHistory(userId, notification, {
        sent: response.successCount,
        failed: response.failureCount,
      });

      return {
        success: true,
        sent: response.successCount,
        failed: response.failureCount,
      };

    } catch (error) {
      console.error('Send notification error:', error);
      return { success: false, message: 'Failed to send notification' };
    }
  }

  // Handle failed FCM tokens
  async handleFailedTokens(responses, tokens) {
    try {
      for (let i = 0; i < responses.length; i++) {
        const response = responses[i];
        if (!response.success) {
          const token = tokens[i];
          const errorCode = response.error?.code;

          // Deactivate invalid tokens
          if (errorCode === 'messaging/invalid-registration-token' ||
              errorCode === 'messaging/registration-token-not-registered') {
            await storage.deactivateDeviceToken(token);
          }
        }
      }
    } catch (error) {
      console.error('Handle failed tokens error:', error);
    }
  }

  // Store notification in history
  async storeNotificationHistory(userId, notification, result) {
    try {
      const history = {
        id: `notif_${Date.now()}_${userId}`,
        userId,
        title: notification.title,
        body: notification.body,
        type: notification.type,
        data: notification.data,
        result,
        sentAt: new Date(),
      };

      await storage.createNotificationHistory(history);

    } catch (error) {
      console.error('Store notification history error:', error);
    }
  }

  // Send transfer notification
  async sendTransferNotification(senderId, recipientId, amount, transactionId) {
    try {
      // Notification for sender
      await this.sendNotification(senderId, {
        title: 'Transfer Sent',
        body: `You sent ${amount.toLocaleString()} RWF successfully`,
        type: 'transfer_sent',
        data: {
          transactionId,
          amount: amount.toString(),
          type: 'debit',
        },
      });

      // Notification for recipient
      await this.sendNotification(recipientId, {
        title: 'Money Received',
        body: `You received ${amount.toLocaleString()} RWF`,
        type: 'transfer_received',
        data: {
          transactionId,
          amount: amount.toString(),
          type: 'credit',
        },
      });

    } catch (error) {
      console.error('Send transfer notification error:', error);
    }
  }

  // Send deposit notification
  async sendDepositNotification(userId, amount) {
    try {
      await this.sendNotification(userId, {
        title: 'Deposit Successful',
        body: `${amount.toLocaleString()} RWF has been added to your account`,
        type: 'deposit',
        data: {
          amount: amount.toString(),
          type: 'credit',
        },
      });
    } catch (error) {
      console.error('Send deposit notification error:', error);
    }
  }

  // Send withdrawal notification
  async sendWithdrawalNotification(userId, amount) {
    try {
      await this.sendNotification(userId, {
        title: 'Withdrawal Successful',
        body: `${amount.toLocaleString()} RWF has been withdrawn from your account`,
        type: 'withdrawal',
        data: {
          amount: amount.toString(),
          type: 'debit',
        },
      });
    } catch (error) {
      console.error('Send withdrawal notification error:', error);
    }
  }

  // Send payment notification
  async sendPaymentNotification(userId, amount, merchantName) {
    try {
      await this.sendNotification(userId, {
        title: 'Payment Successful',
        body: `You paid ${amount.toLocaleString()} RWF to ${merchantName}`,
        type: 'payment',
        data: {
          amount: amount.toString(),
          merchantName,
          type: 'debit',
        },
      });
    } catch (error) {
      console.error('Send payment notification error:', error);
    }
  }

  // Send transaction failed notification
  async sendTransactionFailedNotification(userId, amount, transactionType) {
    try {
      await this.sendNotification(userId, {
        title: 'Transaction Failed',
        body: `Your ${transactionType} of ${amount.toLocaleString()} RWF could not be processed`,
        type: 'transaction_failed',
        data: {
          amount: amount.toString(),
          transactionType,
        },
      });
    } catch (error) {
      console.error('Send transaction failed notification error:', error);
    }
  }

  // Send transaction cancelled notification
  async sendTransactionCancelledNotification(userId, transactionId) {
    try {
      await this.sendNotification(userId, {
        title: 'Transaction Cancelled',
        body: 'Your transaction has been cancelled',
        type: 'transaction_cancelled',
        data: {
          transactionId,
        },
      });
    } catch (error) {
      console.error('Send transaction cancelled notification error:', error);
    }
  }

  // Send KYC status notification
  async sendKYCStatusNotification(userId, status, message) {
    try {
      const titles = {
        approved: 'Identity Verified',
        rejected: 'Identity Verification Failed',
        pending: 'Identity Under Review',
      };

      await this.sendNotification(userId, {
        title: titles[status] || 'Identity Verification Update',
        body: message,
        type: 'kyc_status',
        data: {
          status,
        },
      });
    } catch (error) {
      console.error('Send KYC status notification error:', error);
    }
  }

  // Send card notification
  async sendCardNotification(userId, type, cardData) {
    try {
      const messages = {
        card_created: {
          title: 'Virtual Card Created',
          body: 'Your new virtual card is ready to use',
        },
        card_blocked: {
          title: 'Card Blocked',
          body: 'Your card has been temporarily blocked',
        },
        card_unblocked: {
          title: 'Card Unblocked',
          body: 'Your card is now active and ready to use',
        },
        card_transaction: {
          title: 'Card Transaction',
          body: `Card payment of ${cardData.amount?.toLocaleString()} RWF`,
        },
      };

      const message = messages[type];
      if (message) {
        await this.sendNotification(userId, {
          ...message,
          type: `card_${type}`,
          data: cardData,
        });
      }
    } catch (error) {
      console.error('Send card notification error:', error);
    }
  }

  // Send security alert
  async sendSecurityAlert(userId, alertType, details) {
    try {
      const alerts = {
        login_attempt: {
          title: 'New Login Detected',
          body: 'Someone logged into your account',
        },
        pin_changed: {
          title: 'PIN Changed',
          body: 'Your PIN has been successfully updated',
        },
        suspicious_activity: {
          title: 'Suspicious Activity',
          body: 'Unusual activity detected on your account',
        },
      };

      const alert = alerts[alertType];
      if (alert) {
        await this.sendNotification(userId, {
          ...alert,
          type: 'security_alert',
          data: {
            alertType,
            ...details,
          },
        });
      }
    } catch (error) {
      console.error('Send security alert error:', error);
    }
  }

  // Send promotional notification
  async sendPromotionalNotification(userId, promotion) {
    try {
      await this.sendNotification(userId, {
        title: promotion.title,
        body: promotion.body,
        type: 'promotion',
        data: {
          promotionId: promotion.id,
          category: promotion.category,
        },
      });
    } catch (error) {
      console.error('Send promotional notification error:', error);
    }
  }

  // Get notification history for user
  async getNotificationHistory(userId, options = {}) {
    try {
      const { page = 1, limit = 20 } = options;
      const offset = (page - 1) * limit;

      return await storage.getNotificationHistory(userId, { offset, limit });

    } catch (error) {
      console.error('Get notification history error:', error);
      return { data: [], total: 0 };
    }
  }

  // Update notification preferences
  async updateNotificationPreferences(userId, preferences) {
    try {
      const userPreferences = {
        userId,
        enablePushNotifications: preferences.enablePushNotifications ?? true,
        enableEmailNotifications: preferences.enableEmailNotifications ?? false,
        enableSMSNotifications: preferences.enableSMSNotifications ?? true,
        categories: {
          transactions: preferences.categories?.transactions ?? true,
          security: preferences.categories?.security ?? true,
          promotions: preferences.categories?.promotions ?? false,
          kyc: preferences.categories?.kyc ?? true,
          cards: preferences.categories?.cards ?? true,
        },
        updatedAt: new Date(),
      };

      await storage.updateNotificationPreferences(userId, userPreferences);

      return { success: true };

    } catch (error) {
      console.error('Update notification preferences error:', error);
      return { success: false, message: 'Failed to update preferences' };
    }
  }

  // Check if notification type is enabled for user
  async isNotificationEnabled(userId, type) {
    try {
      const preferences = await storage.getNotificationPreferences(userId);
      
      if (!preferences || !preferences.enablePushNotifications) {
        return false;
      }

      const categoryMapping = {
        transfer_sent: 'transactions',
        transfer_received: 'transactions',
        deposit: 'transactions',
        withdrawal: 'transactions',
        payment: 'transactions',
        transaction_failed: 'transactions',
        transaction_cancelled: 'transactions',
        kyc_status: 'kyc',
        card_created: 'cards',
        card_blocked: 'cards',
        card_unblocked: 'cards',
        card_transaction: 'cards',
        security_alert: 'security',
        promotion: 'promotions',
      };

      const category = categoryMapping[type];
      return category ? preferences.categories?.[category] ?? true : true;

    } catch (error) {
      console.error('Check notification enabled error:', error);
      return true; // Default to enabled
    }
  }

  // Send bulk notifications
  async sendBulkNotifications(userIds, notification) {
    try {
      const results = await Promise.allSettled(
        userIds.map(userId => this.sendNotification(userId, notification))
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      return {
        success: true,
        sent: successful,
        failed,
        total: userIds.length,
      };

    } catch (error) {
      console.error('Send bulk notifications error:', error);
      return { success: false, message: 'Failed to send bulk notifications' };
    }
  }
}

module.exports = new NotificationService();
