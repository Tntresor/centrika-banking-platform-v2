import * as admin from 'firebase-admin';
import { storage } from '../storage';
import type { Transaction } from '../../shared/schema';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    }),
  });
}

class NotificationService {
  private readonly messaging = admin.messaging();

  async sendKYCStatusNotification(userId: number, status: string): Promise<void> {
    try {
      const user = await storage.getUser(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const title = 'KYC Verification Update';
      let body = '';

      switch (status) {
        case 'approved':
          body = 'Your KYC verification has been approved. You can now access all features.';
          break;
        case 'rejected':
          body = 'Your KYC verification was rejected. Please contact support for assistance.';
          break;
        default:
          body = 'Your KYC verification is under review. We will notify you once complete.';
      }

      // Store notification in database
      await storage.createNotification({
        userId,
        title,
        body,
        type: 'kyc',
        metadata: { status }
      });

      // Send push notification (if FCM token is available)
      await this.sendPushNotification(userId, title, body);

    } catch (error) {
      console.error('KYC notification error:', error);
    }
  }

  async sendTransactionNotification(userId: number, transaction: Transaction, type: 'sent' | 'received' | 'payment' | 'deposit_success' | 'withdrawal'): Promise<void> {
    try {
      const user = await storage.getUser(userId);
      if (!user) {
        throw new Error('User not found');
      }

      let title = '';
      let body = '';

      switch (type) {
        case 'sent':
          title = 'Money Sent';
          body = `You sent ${transaction.amount} ${transaction.currency}. Reference: ${transaction.reference}`;
          break;
        case 'received':
          title = 'Money Received';
          body = `You received ${transaction.amount} ${transaction.currency}. Reference: ${transaction.reference}`;
          break;
        case 'payment':
          title = 'Payment Successful';
          body = `Payment of ${transaction.amount} ${transaction.currency} completed. Reference: ${transaction.reference}`;
          break;
        case 'deposit_success':
          title = 'Deposit Successful';
          body = `Your deposit of ${transaction.amount} ${transaction.currency} has been processed successfully.`;
          break;
        case 'withdrawal':
          title = 'Withdrawal Processed';
          body = `Your withdrawal of ${transaction.amount} ${transaction.currency} has been processed.`;
          break;
      }

      // Store notification in database
      await storage.createNotification({
        userId,
        title,
        body,
        type: 'transaction',
        metadata: { transactionId: transaction.id, transactionType: type }
      });

      // Send push notification
      await this.sendPushNotification(userId, title, body);

    } catch (error) {
      console.error('Transaction notification error:', error);
    }
  }

  async sendCardNotification(userId: number, maskedPan: string, action: 'created' | 'activated' | 'deactivated'): Promise<void> {
    try {
      const user = await storage.getUser(userId);
      if (!user) {
        throw new Error('User not found');
      }

      let title = '';
      let body = '';

      switch (action) {
        case 'created':
          title = 'Virtual Card Created';
          body = `Your virtual card ${maskedPan} has been created successfully.`;
          break;
        case 'activated':
          title = 'Card Activated';
          body = `Your card ${maskedPan} has been activated.`;
          break;
        case 'deactivated':
          title = 'Card Deactivated';
          body = `Your card ${maskedPan} has been deactivated.`;
          break;
      }

      // Store notification in database
      await storage.createNotification({
        userId,
        title,
        body,
        type: 'system',
        metadata: { maskedPan, action }
      });

      // Send push notification
      await this.sendPushNotification(userId, title, body);

    } catch (error) {
      console.error('Card notification error:', error);
    }
  }

  private async sendPushNotification(userId: number, title: string, body: string): Promise<void> {
    try {
      // In a real implementation, you would store FCM tokens for users
      // and retrieve them here to send push notifications
      // For demo purposes, we'll just log the notification
      
      console.log(`Push notification for user ${userId}:`, { title, body });

      // Example of how you would send a real push notification:
      /*
      const userToken = await this.getUserFCMToken(userId);
      if (userToken) {
        const message = {
          notification: { title, body },
          token: userToken,
          data: {
            userId: userId.toString(),
            timestamp: new Date().toISOString()
          }
        };

        await this.messaging.send(message);
      }
      */

    } catch (error) {
      console.error('Push notification error:', error);
    }
  }

  async sendBulkNotification(userIds: number[], title: string, body: string, type: string = 'system'): Promise<void> {
    try {
      const notifications = userIds.map(userId => ({
        userId,
        title,
        body,
        type,
        metadata: { bulk: true }
      }));

      // Store notifications in database
      for (const notification of notifications) {
        await storage.createNotification(notification);
      }

      // Send push notifications
      for (const userId of userIds) {
        await this.sendPushNotification(userId, title, body);
      }

    } catch (error) {
      console.error('Bulk notification error:', error);
    }
  }

  async markAllNotificationsAsRead(userId: number): Promise<void> {
    try {
      const notifications = await storage.getUserNotifications(userId);
      for (const notification of notifications) {
        if (!notification.isRead) {
          await storage.markNotificationAsRead(notification.id);
        }
      }
    } catch (error) {
      console.error('Mark all notifications as read error:', error);
    }
  }
}

export const notificationService = new NotificationService();
