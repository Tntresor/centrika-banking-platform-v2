import { storage } from '../storage';
import type { BNRReportData, MetricsData } from '../../shared/types';

class ReportingService {
  async generateBNRReport(date: string): Promise<BNRReportData> {
    try {
      const startDate = new Date(date);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);

      // Get transactions for the date
      const transactions = await storage.getTransactionsByDateRange(
        startDate.toISOString(),
        endDate.toISOString()
      );

      // Calculate metrics
      const totalTransactions = transactions.length;
      const totalVolume = transactions.reduce((sum, tx) => sum + parseFloat(tx.amount), 0);

      // Get user count (simplified - should be unique users who transacted)
      const userIds = new Set(transactions.map(tx => tx.fromWalletId || tx.toWalletId));
      const userCount = userIds.size;

      // Get KYC approval rate (simplified)
      const kycApprovalRate = 85; // This should be calculated from actual KYC data

      const reportData: BNRReportData = {
        date,
        totalTransactions,
        totalVolume,
        userCount,
        kycApprovalRate
      };

      // Generate CSV content
      const csvContent = this.generateBNRCSV(reportData, transactions);
      
      // In production, this would be uploaded to S3 or saved to file system
      console.log('BNR Report CSV:', csvContent);

      return reportData;

    } catch (error) {
      console.error('BNR report generation error:', error);
      throw new Error('Failed to generate BNR report');
    }
  }

  async getDashboardMetrics(date: string): Promise<MetricsData> {
    try {
      const startDate = new Date(date);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);

      // Get daily signups
      const dailySignups = await this.getDailySignups(startDate, endDate);

      // Get successful KYC rate
      const successfulKYCRate = await this.getKYCSuccessRate(startDate, endDate);

      // Get transaction count
      const transactions = await storage.getTransactionsByDateRange(
        startDate.toISOString(),
        endDate.toISOString()
      );
      const transactionCount = transactions.length;

      // Get total ledger balance (simplified)
      const totalLedgerBalance = await this.getTotalLedgerBalance();

      // Get active users (simplified)
      const activeUsers = await this.getActiveUserCount();

      return {
        dailySignups,
        successfulKYCRate,
        transactionCount,
        totalLedgerBalance,
        activeUsers
      };

    } catch (error) {
      console.error('Dashboard metrics error:', error);
      throw new Error('Failed to retrieve dashboard metrics');
    }
  }

  private async getDailySignups(startDate: Date, endDate: Date): Promise<number> {
    // This would typically be a database query
    // For now, return a simulated value
    return Math.floor(Math.random() * 50) + 10;
  }

  private async getKYCSuccessRate(startDate: Date, endDate: Date): Promise<number> {
    // This would typically be a database query to calculate
    // (approved KYC / total KYC submissions) * 100
    return Math.floor(Math.random() * 20) + 80; // 80-100%
  }

  private async getTotalLedgerBalance(): Promise<number> {
    // This would typically sum all wallet balances
    // For now, return a simulated value
    return Math.floor(Math.random() * 10000000) + 5000000; // 5M-15M RWF
  }

  private async getActiveUserCount(): Promise<number> {
    // This would typically count users who have transacted in the last 30 days
    return Math.floor(Math.random() * 500) + 100;
  }

  private generateBNRCSV(reportData: BNRReportData, transactions: any[]): string {
    const headers = [
      'Date',
      'Transaction_ID',
      'Transaction_Type',
      'Amount',
      'Currency',
      'Status',
      'Reference',
      'Created_At'
    ];

    const rows = transactions.map(tx => [
      reportData.date,
      tx.id,
      tx.type,
      tx.amount,
      tx.currency,
      tx.status,
      tx.reference,
      tx.createdAt
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    return csvContent;
  }

  async scheduleJ1Report(): Promise<void> {
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const dateString = yesterday.toISOString().split('T')[0];

      const reportData = await this.generateBNRReport(dateString);
      
      // In production, this would be called by a cron job or Lambda function
      console.log(`J+1 Report generated for ${dateString}:`, reportData);

      // Upload to S3 or designated storage
      // await this.uploadReportToS3(reportData, dateString);

    } catch (error) {
      console.error('J+1 report scheduling error:', error);
    }
  }

  async getTransactionSummary(startDate: string, endDate: string): Promise<any> {
    try {
      const transactions = await storage.getTransactionsByDateRange(startDate, endDate);

      const summary = {
        totalCount: transactions.length,
        totalVolume: transactions.reduce((sum, tx) => sum + parseFloat(tx.amount), 0),
        byType: {} as any,
        byStatus: {} as any,
        averageAmount: 0
      };

      // Group by type
      transactions.forEach(tx => {
        summary.byType[tx.type] = (summary.byType[tx.type] || 0) + 1;
        summary.byStatus[tx.status] = (summary.byStatus[tx.status] || 0) + 1;
      });

      // Calculate average
      summary.averageAmount = summary.totalCount > 0 ? summary.totalVolume / summary.totalCount : 0;

      return summary;

    } catch (error) {
      console.error('Transaction summary error:', error);
      throw new Error('Failed to generate transaction summary');
    }
  }
}

export const reportingService = new ReportingService();
