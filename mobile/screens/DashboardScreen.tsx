import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

// Services
import { apiService } from '../services/api';
import { storageService } from '../services/storage';

// Theme
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

interface UserProfile {
  user: {
    id: number;
    firstName: string;
    lastName: string;
    kycStatus: string;
  };
  wallet: {
    balance: string;
    currency: string;
  };
}

interface Transaction {
  id: number;
  amount: string;
  currency: string;
  type: string;
  status: string;
  description: string;
  createdAt: string;
  isIncoming: boolean;
}

export default function DashboardScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [])
  );

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load profile and transactions in parallel
      const [profileResponse, transactionsResponse] = await Promise.all([
        apiService.getUserProfile(),
        apiService.getTransactionHistory(10), // Last 10 transactions
      ]);

      if (profileResponse.success) {
        setProfile(profileResponse.data);
      }

      if (transactionsResponse.success) {
        setTransactions(transactionsResponse.data);
      }
    } catch (error) {
      console.error('Dashboard load error:', error);
      Alert.alert(t('error.title'), t('error.network_error'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const handleKYCAction = () => {
    if (profile?.user.kycStatus === 'pending') {
      navigation.navigate('KYC' as never);
    } else if (profile?.user.kycStatus === 'rejected') {
      Alert.alert(
        t('dashboard.kyc.rejected_title'),
        t('dashboard.kyc.rejected_message'),
        [
          { text: t('common.cancel') },
          { text: t('dashboard.kyc.retry'), onPress: () => navigation.navigate('KYC' as never) }
        ]
      );
    }
  };

  const formatAmount = (amount: string, currency: string) => {
    const numAmount = parseFloat(amount);
    return `${numAmount.toLocaleString()} ${currency}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getTransactionIcon = (type: string, isIncoming: boolean) => {
    switch (type) {
      case 'deposit':
        return 'plus-circle';
      case 'withdrawal':
        return 'minus-circle';
      case 'transfer':
        return isIncoming ? 'arrow-down-left' : 'arrow-up-right';
      case 'payment':
        return 'credit-card';
      default:
        return 'circle';
    }
  };

  const getTransactionColor = (type: string, isIncoming: boolean) => {
    if (type === 'deposit' || isIncoming) return colors.success;
    if (type === 'withdrawal' || type === 'payment') return colors.error;
    return colors.warning;
  };

  const renderKYCStatus = () => {
    if (!profile) return null;

    const { kycStatus } = profile.user;
    let statusColor = colors.warning;
    let statusText = t('dashboard.kyc.pending');
    let actionText = t('dashboard.kyc.complete_verification');

    if (kycStatus === 'approved') {
      statusColor = colors.success;
      statusText = t('dashboard.kyc.verified');
      actionText = '';
    } else if (kycStatus === 'rejected') {
      statusColor = colors.error;
      statusText = t('dashboard.kyc.rejected');
      actionText = t('dashboard.kyc.retry_verification');
    }

    return (
      <TouchableOpacity
        style={[styles.kycCard, { borderColor: statusColor }]}
        onPress={actionText ? handleKYCAction : undefined}
        disabled={!actionText}
      >
        <View style={styles.kycHeader}>
          <Feather
            name={kycStatus === 'approved' ? 'check-circle' : kycStatus === 'rejected' ? 'x-circle' : 'clock'}
            size={20}
            color={statusColor}
          />
          <Text style={[styles.kycStatus, { color: statusColor }]}>
            {statusText}
          </Text>
        </View>
        
        {actionText && (
          <>
            <Text style={styles.kycDescription}>
              {t('dashboard.kyc.description')}
            </Text>
            <Text style={[styles.kycAction, { color: statusColor }]}>
              {actionText} →
            </Text>
          </>
        )}
      </TouchableOpacity>
    );
  };

  const renderQuickActions = () => (
    <View style={styles.quickActions}>
      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => navigation.navigate('MoMo' as never)}
      >
        <Feather name="smartphone" size={24} color={colors.primary} />
        <Text style={styles.actionText}>{t('dashboard.actions.momo')}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => navigation.navigate('P2P' as never)}
      >
        <Feather name="send" size={24} color={colors.primary} />
        <Text style={styles.actionText}>{t('dashboard.actions.send')}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => navigation.navigate('QRScan' as never)}
      >
        <Feather name="qr-code" size={24} color={colors.primary} />
        <Text style={styles.actionText}>{t('dashboard.actions.qr_pay')}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => navigation.navigate('Card' as never)}
      >
        <Feather name="credit-card" size={24} color={colors.primary} />
        <Text style={styles.actionText}>{t('dashboard.actions.card')}</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading && !profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              {t('dashboard.greeting', { name: profile?.user.firstName || 'User' })}
            </Text>
            <Text style={styles.subGreeting}>{t('dashboard.welcome_back')}</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('Settings' as never)}>
            <Feather name="bell" size={24} color={colors.gray[600]} />
          </TouchableOpacity>
        </View>

        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>{t('dashboard.balance.title')}</Text>
          <Text style={styles.balanceAmount}>
            {profile ? formatAmount(profile.wallet.balance, profile.wallet.currency) : '0 RWF'}
          </Text>
          <Text style={styles.balanceNote}>{t('dashboard.balance.available')}</Text>
        </View>

        {/* KYC Status */}
        {renderKYCStatus()}

        {/* Quick Actions */}
        {renderQuickActions()}

        {/* Recent Transactions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('dashboard.transactions.title')}</Text>
            <TouchableOpacity>
              <Text style={styles.sectionAction}>{t('dashboard.transactions.view_all')}</Text>
            </TouchableOpacity>
          </View>

          {transactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="inbox" size={48} color={colors.gray[400]} />
              <Text style={styles.emptyStateText}>{t('dashboard.transactions.empty')}</Text>
            </View>
          ) : (
            <View style={styles.transactionsList}>
              {transactions.slice(0, 5).map((transaction) => (
                <View key={transaction.id} style={styles.transactionItem}>
                  <View style={styles.transactionIcon}>
                    <Feather
                      name={getTransactionIcon(transaction.type, transaction.isIncoming)}
                      size={20}
                      color={getTransactionColor(transaction.type, transaction.isIncoming)}
                    />
                  </View>
                  
                  <View style={styles.transactionDetails}>
                    <Text style={styles.transactionDescription}>
                      {transaction.description || t(`dashboard.transactions.types.${transaction.type}`)}
                    </Text>
                    <Text style={styles.transactionDate}>
                      {formatDate(transaction.createdAt)}
                    </Text>
                  </View>
                  
                  <Text
                    style={[
                      styles.transactionAmount,
                      { color: getTransactionColor(transaction.type, transaction.isIncoming) }
                    ]}
                  >
                    {transaction.isIncoming ? '+' : '-'}
                    {formatAmount(transaction.amount, transaction.currency)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body,
    color: colors.text.secondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  greeting: {
    ...typography.h2,
    color: colors.text.primary,
  },
  subGreeting: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: 4,
  },
  balanceCard: {
    backgroundColor: colors.primary,
    margin: 20,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  balanceLabel: {
    ...typography.body,
    color: colors.white,
    opacity: 0.9,
  },
  balanceAmount: {
    ...typography.h1,
    color: colors.white,
    fontWeight: 'bold',
    marginTop: 8,
  },
  balanceNote: {
    ...typography.caption,
    color: colors.white,
    opacity: 0.8,
    marginTop: 4,
  },
  kycCard: {
    backgroundColor: colors.white,
    margin: 20,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  kycHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  kycStatus: {
    ...typography.button,
    marginLeft: 8,
    fontWeight: '600',
  },
  kycDescription: {
    ...typography.body,
    color: colors.text.secondary,
    marginBottom: 8,
  },
  kycAction: {
    ...typography.button,
    fontWeight: '600',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  actionButton: {
    alignItems: 'center',
    padding: 16,
  },
  actionText: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 8,
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text.primary,
  },
  sectionAction: {
    ...typography.button,
    color: colors.primary,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyStateText: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: 16,
    textAlign: 'center',
  },
  transactionsList: {
    backgroundColor: colors.white,
    borderRadius: 12,
    overflow: 'hidden',
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionDescription: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '500',
  },
  transactionDate: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  transactionAmount: {
    ...typography.button,
    fontWeight: '600',
  },
});
