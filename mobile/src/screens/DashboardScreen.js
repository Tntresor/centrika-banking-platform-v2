import React, { useContext, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LanguageContext } from '../contexts/LanguageContext';
import { AuthContext } from '../contexts/AuthContext';
import StorageService from '../services/StorageService';
import ApiService from '../services/ApiService';
import Colors from '../constants/Colors';

export default function DashboardScreen({ navigation }) {
  const { strings } = useContext(LanguageContext);
  const { user } = useContext(AuthContext);
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const userBalance = await StorageService.getBalance(user.id);
      const userTransactions = await StorageService.getTransactions(user.id);
      setBalance(userBalance);
      setTransactions(userTransactions.slice(0, 5)); // Show last 5 transactions
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadDashboardData();
    setIsRefreshing(false);
  };

  const formatCurrency = (amount) => {
    return `${amount.toLocaleString()} RWF`;
  };

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'deposit':
        return 'arrow-down-circle';
      case 'withdrawal':
        return 'arrow-up-circle';
      case 'transfer':
        return 'swap-horizontal';
      case 'payment':
        return 'card';
      default:
        return 'help-circle';
    }
  };

  const quickActions = [
    {
      title: strings.deposit,
      icon: 'add-circle',
      color: Colors.success,
      onPress: () => navigation.navigate('MoMoDeposit'),
    },
    {
      title: strings.transfer,
      icon: 'send',
      color: Colors.primary,
      onPress: () => navigation.navigate('Payments'),
    },
    {
      title: strings.qrPay,
      icon: 'qr-code',
      color: Colors.warning,
      onPress: () => navigation.navigate('QR'),
    },
    {
      title: strings.cards,
      icon: 'card',
      color: Colors.secondary,
      onPress: () => {
        // Navigate to cards screen
      },
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              {strings.hello}, {user?.firstName || 'User'}
            </Text>
            <Text style={styles.date}>
              {new Date().toLocaleDateString()}
            </Text>
          </View>
          <TouchableOpacity style={styles.notificationButton}>
            <Ionicons name="notifications" size={24} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>{strings.totalBalance}</Text>
          <Text style={styles.balanceAmount}>{formatCurrency(balance)}</Text>
          <View style={styles.balanceRow}>
            <Text style={styles.balanceSubtext}>
              {strings.availableBalance}
            </Text>
            <TouchableOpacity>
              <Ionicons name="eye" size={20} color={Colors.lightGray} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{strings.quickActions}</Text>
          <View style={styles.actionsGrid}>
            {quickActions.map((action, index) => (
              <TouchableOpacity
                key={index}
                style={styles.actionButton}
                onPress={action.onPress}
              >
                <View style={[styles.actionIcon, { backgroundColor: action.color }]}>
                  <Ionicons name={action.icon} size={24} color="white" />
                </View>
                <Text style={styles.actionText}>{action.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Recent Transactions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{strings.recentTransactions}</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>{strings.seeAll}</Text>
            </TouchableOpacity>
          </View>
          
          {transactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="receipt" size={48} color={Colors.lightGray} />
              <Text style={styles.emptyStateText}>{strings.noTransactions}</Text>
            </View>
          ) : (
            <View style={styles.transactionsList}>
              {transactions.map((transaction, index) => (
                <TouchableOpacity key={index} style={styles.transactionItem}>
                  <View style={styles.transactionIcon}>
                    <Ionicons
                      name={getTransactionIcon(transaction.type)}
                      size={24}
                      color={Colors.primary}
                    />
                  </View>
                  <View style={styles.transactionDetails}>
                    <Text style={styles.transactionTitle}>
                      {transaction.description}
                    </Text>
                    <Text style={styles.transactionDate}>
                      {new Date(transaction.date).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.transactionAmount,
                      {
                        color: transaction.amount > 0 ? Colors.success : Colors.error,
                      },
                    ]}
                  >
                    {transaction.amount > 0 ? '+' : ''}
                    {formatCurrency(Math.abs(transaction.amount))}
                  </Text>
                </TouchableOpacity>
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
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 10,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
  },
  date: {
    fontSize: 14,
    color: Colors.secondary,
    marginTop: 2,
  },
  notificationButton: {
    padding: 8,
  },
  balanceCard: {
    backgroundColor: Colors.primary,
    margin: 20,
    padding: 24,
    borderRadius: 16,
  },
  balanceLabel: {
    color: 'white',
    fontSize: 16,
    opacity: 0.8,
  },
  balanceAmount: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 8,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  balanceSubtext: {
    color: 'white',
    fontSize: 14,
    opacity: 0.8,
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
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  seeAllText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    width: '48%',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    textAlign: 'center',
  },
  transactionsList: {
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.lightBlue,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
  },
  transactionDate: {
    fontSize: 14,
    color: Colors.secondary,
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: 'white',
    borderRadius: 12,
  },
  emptyStateText: {
    fontSize: 16,
    color: Colors.secondary,
    marginTop: 12,
    textAlign: 'center',
  },
});
