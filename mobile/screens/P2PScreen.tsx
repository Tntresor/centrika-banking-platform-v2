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

interface TransferResult {
  transaction: {
    id: number;
    amount: string;
    reference: string;
    description: string;
    createdAt: string;
  };
  newBalance: string;
}

export default function P2PScreen() {
  const { t } = useTranslation();
  
  const [recipientPhone, setRecipientPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [transferResult, setTransferResult] = useState<TransferResult | null>(null);

  const handleConfirmTransfer = () => {
    const numAmount = parseFloat(amount);
    
    if (!recipientPhone) {
      Alert.alert(t('error.title'), t('p2p.error.recipient_required'));
      return;
    }

    if (!amount || numAmount <= 0) {
      Alert.alert(t('error.title'), t('p2p.error.invalid_amount'));
      return;
    }

    // Validate BNR limits
    if (numAmount > 1000000) {
      Alert.alert(t('error.title'), t('p2p.error.amount_limit'));
      return;
    }

    setShowConfirmModal(true);
  };

  const handleTransfer = async () => {
    setShowConfirmModal(false);
    setLoading(true);
    
    try {
      const response = await apiService.p2pTransfer({
        recipientPhone,
        amount: parseFloat(amount),
        description: description || undefined,
      });

      if (response.success) {
        setTransferResult(response.data);
        setShowResultModal(true);
        
        // Clear form
        setRecipientPhone('');
        setAmount('');
        setDescription('');
      } else {
        Alert.alert(t('error.title'), response.error || t('p2p.error.transfer_failed'));
      }
    } catch (error) {
      Alert.alert(t('error.title'), t('error.network_error'));
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount: string) => {
    const num = parseFloat(amount);
    return num.toLocaleString();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderTransferForm = () => (
    <View style={styles.form}>
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>{t('p2p.recipient_label')}</Text>
        <View style={styles.inputWrapper}>
          <Feather name="user" size={20} color={colors.gray[500]} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { paddingLeft: 40 }]}
            placeholder={t('p2p.recipient_placeholder')}
            value={recipientPhone}
            onChangeText={setRecipientPhone}
            keyboardType="phone-pad"
            maxLength={15}
          />
        </View>
        <Text style={styles.inputNote}>{t('p2p.recipient_note')}</Text>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>{t('p2p.amount_label')}</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder={t('p2p.amount_placeholder')}
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            maxLength={10}
          />
          <Text style={styles.inputCurrency}>RWF</Text>
        </View>
        <Text style={styles.inputNote}>{t('p2p.amount_note')}</Text>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>{t('p2p.description_label')}</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder={t('p2p.description_placeholder')}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
          maxLength={100}
        />
        <Text style={styles.inputNote}>{t('p2p.description_note')}</Text>
      </View>

      <TouchableOpacity
        style={[styles.submitButton, loading && styles.submitButtonDisabled]}
        onPress={handleConfirmTransfer}
        disabled={loading}
      >
        <Text style={styles.submitButtonText}>
          {loading ? t('common.processing') : t('p2p.send_money')}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderConfirmModal = () => (
    <Modal
      visible={showConfirmModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowConfirmModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.confirmHeader}>
            <Feather name="send" size={48} color={colors.primary} />
            <Text style={styles.confirmTitle}>{t('p2p.confirm.title')}</Text>
          </View>

          <View style={styles.confirmDetails}>
            <View style={styles.confirmRow}>
              <Text style={styles.confirmLabel}>{t('p2p.confirm.recipient')}</Text>
              <Text style={styles.confirmValue}>{recipientPhone}</Text>
            </View>
            
            <View style={styles.confirmRow}>
              <Text style={styles.confirmLabel}>{t('p2p.confirm.amount')}</Text>
              <Text style={styles.confirmAmount}>
                {formatAmount(amount)} RWF
              </Text>
            </View>
            
            {description && (
              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>{t('p2p.confirm.description')}</Text>
                <Text style={styles.confirmValue}>{description}</Text>
              </View>
            )}
          </View>

          <View style={styles.confirmButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowConfirmModal(false)}
            >
              <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={handleTransfer}
            >
              <Text style={styles.confirmButtonText}>{t('p2p.confirm.send')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderResultModal = () => (
    <Modal
      visible={showResultModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowResultModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.resultHeader}>
            <Feather name="check-circle" size={48} color={colors.success} />
            <Text style={styles.resultTitle}>{t('p2p.result.success_title')}</Text>
          </View>

          <View style={styles.resultDetails}>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>{t('p2p.result.amount_sent')}</Text>
              <Text style={styles.resultAmount}>
                {transferResult ? formatAmount(transferResult.transaction.amount) : '0'} RWF
              </Text>
            </View>
            
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>{t('p2p.result.reference')}</Text>
              <Text style={styles.resultValue}>{transferResult?.transaction.reference}</Text>
            </View>
            
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>{t('p2p.result.date')}</Text>
              <Text style={styles.resultValue}>
                {transferResult ? formatDate(transferResult.transaction.createdAt) : ''}
              </Text>
            </View>
            
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>{t('p2p.result.new_balance')}</Text>
              <Text style={styles.resultBalance}>
                {transferResult ? formatAmount(transferResult.newBalance) : '0'} RWF
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.modalButton}
            onPress={() => setShowResultModal(false)}
          >
            <Text style={styles.modalButtonText}>{t('common.done')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('p2p.title')}</Text>
          <Text style={styles.headerSubtitle}>{t('p2p.subtitle')}</Text>
        </View>

        {renderTransferForm()}

        <View style={styles.infoCard}>
          <Feather name="info" size={20} color={colors.primary} />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>{t('p2p.info.title')}</Text>
            <Text style={styles.infoText}>{t('p2p.info.description')}</Text>
          </View>
        </View>

        <View style={styles.limitsCard}>
          <Text style={styles.limitsTitle}>{t('p2p.limits.title')}</Text>
          <View style={styles.limitRow}>
            <Text style={styles.limitLabel}>{t('p2p.limits.single_transaction')}</Text>
            <Text style={styles.limitValue}>1,000,000 RWF</Text>
          </View>
          <View style={styles.limitRow}>
            <Text style={styles.limitLabel}>{t('p2p.limits.daily_limit')}</Text>
            <Text style={styles.limitValue}>1,000,000 RWF</Text>
          </View>
        </View>
      </ScrollView>

      {renderConfirmModal()}
      {renderResultModal()}
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
  form: {
    padding: 20,
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
  textArea: {
    height: 80,
    paddingVertical: 12,
    textAlignVertical: 'top',
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
  limitsCard: {
    backgroundColor: colors.white,
    margin: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  limitsTitle: {
    ...typography.button,
    color: colors.text.primary,
    marginBottom: 12,
  },
  limitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  limitLabel: {
    ...typography.body,
    color: colors.text.secondary,
  },
  limitValue: {
    ...typography.button,
    color: colors.text.primary,
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
  confirmHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  confirmTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginTop: 12,
  },
  confirmDetails: {
    alignSelf: 'stretch',
    marginBottom: 24,
  },
  confirmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  confirmLabel: {
    ...typography.body,
    color: colors.text.secondary,
  },
  confirmValue: {
    ...typography.button,
    color: colors.text.primary,
    maxWidth: '60%',
    textAlign: 'right',
  },
  confirmAmount: {
    ...typography.button,
    color: colors.primary,
    fontWeight: 'bold',
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    ...typography.button,
    color: colors.text.secondary,
  },
  confirmButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  confirmButtonText: {
    ...typography.button,
    color: colors.white,
  },
  resultHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  resultTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginTop: 12,
  },
  resultDetails: {
    alignSelf: 'stretch',
    marginBottom: 24,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  resultLabel: {
    ...typography.body,
    color: colors.text.secondary,
  },
  resultValue: {
    ...typography.button,
    color: colors.text.primary,
    maxWidth: '60%',
    textAlign: 'right',
  },
  resultAmount: {
    ...typography.button,
    color: colors.success,
    fontWeight: 'bold',
  },
  resultBalance: {
    ...typography.button,
    color: colors.primary,
    fontWeight: 'bold',
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
