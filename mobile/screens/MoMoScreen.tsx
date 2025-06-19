import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ScrollView,
  Modal,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

// Services
import { apiService } from '../services/api';

// Theme
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

type MoMoMode = 'deposit' | 'withdraw';

interface TransactionStatus {
  reference: string;
  status: 'pending' | 'completed' | 'failed';
  amount: string;
  type: string;
}

export default function MoMoScreen() {
  const { t } = useTranslation();
  
  const [mode, setMode] = useState<MoMoMode>('deposit');
  const [amount, setAmount] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<TransactionStatus | null>(null);

  const handleMoMoTransaction = async () => {
    const numAmount = parseFloat(amount);
    
    if (!amount || numAmount <= 0) {
      Alert.alert(t('error.title'), t('momo.error.invalid_amount'));
      return;
    }

    if (!phoneNumber) {
      Alert.alert(t('error.title'), t('momo.error.phone_required'));
      return;
    }

    // Validate BNR limits
    if (numAmount > 1000000) {
      Alert.alert(t('error.title'), t('momo.error.amount_limit'));
      return;
    }

    setLoading(true);
    
    try {
      let response;
      
      if (mode === 'deposit') {
        response = await apiService.momoDeposit({
          amount: numAmount,
          phoneNumber,
          currency: 'RWF',
        });
      } else {
        response = await apiService.momoWithdraw({
          amount: numAmount,
          phoneNumber,
          currency: 'RWF',
        });
      }

      if (response.success) {
        setTransactionStatus({
          reference: response.data.momoReference,
          status: response.data.status || 'pending',
          amount: numAmount.toString(),
          type: mode,
        });
        
        setShowStatusModal(true);
        
        // Clear form
        setAmount('');
        setPhoneNumber('');
        
        // Poll for status updates
        pollTransactionStatus(response.data.momoReference);
      } else {
        Alert.alert(t('error.title'), response.error || t('momo.error.transaction_failed'));
      }
    } catch (error) {
      Alert.alert(t('error.title'), t('error.network_error'));
    } finally {
      setLoading(false);
    }
  };

  const pollTransactionStatus = async (reference: string) => {
    const maxPolls = 10;
    let pollCount = 0;

    const poll = async () => {
      if (pollCount >= maxPolls) return;
      
      try {
        const response = await apiService.getMoMoStatus(reference);
        if (response.success) {
          setTransactionStatus(prev => prev ? { ...prev, status: response.data.status } : null);
          
          if (response.data.status === 'completed' || response.data.status === 'failed') {
            return; // Stop polling
          }
        }
      } catch (error) {
        console.error('Status polling error:', error);
      }
      
      pollCount++;
      setTimeout(poll, 3000); // Poll every 3 seconds
    };

    poll();
  };

  const formatAmount = (amount: string) => {
    const num = parseFloat(amount);
    return num.toLocaleString();
  };

  const renderModeSelector = () => (
    <View style={styles.modeSelector}>
      <TouchableOpacity
        style={[styles.modeButton, mode === 'deposit' && styles.modeButtonActive]}
        onPress={() => setMode('deposit')}
      >
        <Feather 
          name="plus-circle" 
          size={20} 
          color={mode === 'deposit' ? colors.white : colors.primary} 
        />
        <Text style={[
          styles.modeButtonText,
          mode === 'deposit' && styles.modeButtonTextActive
        ]}>
          {t('momo.deposit.title')}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.modeButton, mode === 'withdraw' && styles.modeButtonActive]}
        onPress={() => setMode('withdraw')}
      >
        <Feather 
          name="minus-circle" 
          size={20} 
          color={mode === 'withdraw' ? colors.white : colors.primary} 
        />
        <Text style={[
          styles.modeButtonText,
          mode === 'withdraw' && styles.modeButtonTextActive
        ]}>
          {t('momo.withdraw.title')}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderTransactionForm = () => (
    <View style={styles.form}>
      <Text style={styles.formTitle}>
        {mode === 'deposit' ? t('momo.deposit.description') : t('momo.withdraw.description')}
      </Text>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>{t('momo.amount_label')}</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder={t('momo.amount_placeholder')}
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            maxLength={10}
          />
          <Text style={styles.inputCurrency}>RWF</Text>
        </View>
        <Text style={styles.inputNote}>{t('momo.amount_note')}</Text>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>{t('momo.phone_label')}</Text>
        <View style={styles.inputWrapper}>
          <Feather name="smartphone" size={20} color={colors.gray[500]} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { paddingLeft: 40 }]}
            placeholder={t('momo.phone_placeholder')}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
            maxLength={15}
          />
        </View>
        <Text style={styles.inputNote}>{t('momo.phone_note')}</Text>
      </View>

      <TouchableOpacity
        style={[styles.submitButton, loading && styles.submitButtonDisabled]}
        onPress={handleMoMoTransaction}
        disabled={loading}
      >
        <Text style={styles.submitButtonText}>
          {loading ? t('common.processing') : 
           mode === 'deposit' ? t('momo.deposit.button') : t('momo.withdraw.button')}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderStatusModal = () => (
    <Modal
      visible={showStatusModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowStatusModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.statusHeader}>
            <Feather
              name={
                transactionStatus?.status === 'completed' ? 'check-circle' :
                transactionStatus?.status === 'failed' ? 'x-circle' : 'clock'
              }
              size={48}
              color={
                transactionStatus?.status === 'completed' ? colors.success :
                transactionStatus?.status === 'failed' ? colors.error : colors.warning
              }
            />
            <Text style={styles.statusTitle}>
              {transactionStatus?.status === 'completed' ? t('momo.status.completed') :
               transactionStatus?.status === 'failed' ? t('momo.status.failed') : 
               t('momo.status.pending')}
            </Text>
          </View>

          <View style={styles.statusDetails}>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>{t('momo.status.amount')}</Text>
              <Text style={styles.statusValue}>
                {transactionStatus ? formatAmount(transactionStatus.amount) : '0'} RWF
              </Text>
            </View>
            
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>{t('momo.status.reference')}</Text>
              <Text style={styles.statusValue}>{transactionStatus?.reference}</Text>
            </View>
            
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>{t('momo.status.type')}</Text>
              <Text style={styles.statusValue}>
                {transactionStatus?.type === 'deposit' ? 
                 t('momo.deposit.title') : t('momo.withdraw.title')}
              </Text>
            </View>
          </View>

          {transactionStatus?.status === 'pending' && (
            <Text style={styles.statusNote}>
              {t('momo.status.pending_note')}
            </Text>
          )}

          <TouchableOpacity
            style={styles.modalButton}
            onPress={() => setShowStatusModal(false)}
          >
            <Text style={styles.modalButtonText}>{t('common.close')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('momo.title')}</Text>
          <Text style={styles.headerSubtitle}>{t('momo.subtitle')}</Text>
        </View>

        {renderModeSelector()}
        {renderTransactionForm()}

        <View style={styles.infoCard}>
          <Feather name="info" size={20} color={colors.primary} />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>{t('momo.info.title')}</Text>
            <Text style={styles.infoText}>{t('momo.info.description')}</Text>
          </View>
        </View>
      </ScrollView>

      {renderStatusModal()}
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
  header: {
    padding: 20,
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.h2,
    color: colors.text.primary,
    marginBottom: 8,
  },
  headerSubtitle: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  modeSelector: {
    flexDirection: 'row',
    margin: 20,
    backgroundColor: colors.gray[100],
    borderRadius: 12,
    padding: 4,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  modeButtonActive: {
    backgroundColor: colors.primary,
  },
  modeButtonText: {
    ...typography.button,
    color: colors.primary,
    marginLeft: 8,
  },
  modeButtonTextActive: {
    color: colors.white,
  },
  form: {
    padding: 20,
  },
  formTitle: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    ...typography.button,
    color: colors.text.primary,
    marginBottom: 8,
  },
  inputWrapper: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 52,
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: 12,
    paddingHorizontal: 16,
    ...typography.body,
    color: colors.text.primary,
    backgroundColor: colors.white,
  },
  inputIcon: {
    position: 'absolute',
    left: 16,
    zIndex: 1,
  },
  inputCurrency: {
    position: 'absolute',
    right: 16,
    ...typography.button,
    color: colors.text.secondary,
  },
  inputNote: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  submitButtonDisabled: {
    backgroundColor: colors.gray[400],
  },
  submitButtonText: {
    ...typography.button,
    color: colors.white,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: colors.blue[50],
    margin: 20,
    padding: 16,
    borderRadius: 12,
    alignItems: 'flex-start',
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    ...typography.button,
    color: colors.primary,
    marginBottom: 4,
  },
  infoText: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  statusHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  statusTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginTop: 12,
  },
  statusDetails: {
    alignSelf: 'stretch',
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  statusLabel: {
    ...typography.body,
    color: colors.text.secondary,
  },
  statusValue: {
    ...typography.button,
    color: colors.text.primary,
  },
  statusNote: {
    ...typography.caption,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  modalButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  modalButtonText: {
    ...typography.button,
    color: colors.white,
  },
});
