import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

// Components
import QRScanner from '../components/QRScanner';

// Services
import { apiService } from '../services/api';

// Theme
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

interface QRData {
  merchantId: string;
  merchantName?: string;
  amount?: number;
  description?: string;
  reference?: string;
}

interface PaymentResult {
  transaction: {
    id: number;
    amount: string;
    reference: string;
    description: string;
    createdAt: string;
  };
  newBalance: string;
}

export default function QRScanScreen() {
  const { t } = useTranslation();
  
  const [showScanner, setShowScanner] = useState(false);
  const [qrData, setQRData] = useState<QRData | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null);

  useEffect(() => {
    // Auto-open scanner when screen loads
    setShowScanner(true);
  }, []);

  const handleQRScanned = (data: string) => {
    setShowScanner(false);
    
    try {
      const parsedData = parseQRCode(data);
      
      if (!parsedData.merchantId) {
        Alert.alert(t('error.title'), t('qr.error.invalid_qr'));
        return;
      }

      setQRData(parsedData);
      
      if (parsedData.amount && parsedData.amount > 0) {
        // Fixed amount - show confirmation directly
        setShowConfirmModal(true);
      } else {
        // Variable amount - let user enter amount
        // The confirmation modal will handle amount input
        setShowConfirmModal(true);
      }
    } catch (error) {
      Alert.alert(t('error.title'), t('qr.error.invalid_qr'));
    }
  };

  const parseQRCode = (data: string): QRData => {
    try {
      // Try parsing as JSON first
      const parsed = JSON.parse(data);
      return {
        merchantId: parsed.merchantId || parsed.merchant_id || 'DEMO_MERCHANT',
        merchantName: parsed.merchantName || parsed.merchant_name || 'Demo Merchant',
        amount: parsed.amount ? parseFloat(parsed.amount) : undefined,
        description: parsed.description || parsed.desc || 'QR Payment',
        reference: parsed.reference || parsed.ref,
      };
    } catch {
      // If not JSON, try parsing simple format
      const parts = data.split('|');
      const result: QRData = { merchantId: 'DEMO_MERCHANT' };
      
      parts.forEach(part => {
        if (part.startsWith('merchant:')) {
          result.merchantId = part.split(':')[1];
        } else if (part.startsWith('name:')) {
          result.merchantName = part.split(':')[1];
        } else if (part.startsWith('amount:')) {
          result.amount = parseFloat(part.split(':')[1]);
        } else if (part.startsWith('desc:')) {
          result.description = part.split(':')[1];
        } else if (part.startsWith('ref:')) {
          result.reference = part.split(':')[1];
        }
      });
      
      return result;
    }
  };

  const handleConfirmPayment = async () => {
    if (!qrData) return;

    const paymentAmount = qrData.amount || parseFloat(customAmount);
    
    if (!paymentAmount || paymentAmount <= 0) {
      Alert.alert(t('error.title'), t('qr.error.invalid_amount'));
      return;
    }

    // Validate BNR limits
    if (paymentAmount > 1000000) {
      Alert.alert(t('error.title'), t('qr.error.amount_limit'));
      return;
    }

    setShowConfirmModal(false);
    setLoading(true);

    try {
      const response = await apiService.qrPayment({
        qrData: JSON.stringify(qrData),
        amount: paymentAmount,
      });

      if (response.success) {
        setPaymentResult(response.data);
        setShowResultModal(true);
        
        // Reset state
        setQRData(null);
        setCustomAmount('');
      } else {
        Alert.alert(t('error.title'), response.error || t('qr.error.payment_failed'));
      }
    } catch (error) {
      Alert.alert(t('error.title'), t('error.network_error'));
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return num.toLocaleString();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderScanPrompt = () => (
    <View style={styles.content}>
      <Feather name="qr-code" size={64} color={colors.primary} style={styles.icon} />
      <Text style={styles.title}>{t('qr.scan.title')}</Text>
      <Text style={styles.description}>{t('qr.scan.description')}</Text>
      
      <TouchableOpacity
        style={styles.button}
        onPress={() => setShowScanner(true)}
      >
        <Feather name="camera" size={20} color={colors.white} />
        <Text style={styles.buttonText}>{t('qr.scan.button')}</Text>
      </TouchableOpacity>

      <View style={styles.demoSection}>
        <Text style={styles.demoTitle}>{t('qr.demo.title')}</Text>
        <Text style={styles.demoDescription}>{t('qr.demo.description')}</Text>
        
        <TouchableOpacity
          style={styles.demoButton}
          onPress={() => handleQRScanned('{"merchantId":"DEMO_MERCHANT","merchantName":"Demo Coffee Shop","amount":1500,"description":"Coffee and pastry"}')}
        >
          <Text style={styles.demoButtonText}>{t('qr.demo.button')}</Text>
        </TouchableOpacity>
      </View>
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
            <Feather name="credit-card" size={48} color={colors.primary} />
            <Text style={styles.confirmTitle}>{t('qr.confirm.title')}</Text>
          </View>

          <View style={styles.confirmDetails}>
            <View style={styles.confirmRow}>
              <Text style={styles.confirmLabel}>{t('qr.confirm.merchant')}</Text>
              <Text style={styles.confirmValue}>
                {qrData?.merchantName || qrData?.merchantId || 'Unknown'}
              </Text>
            </View>
            
            {qrData?.description && (
              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>{t('qr.confirm.description')}</Text>
                <Text style={styles.confirmValue}>{qrData.description}</Text>
              </View>
            )}
            
            <View style={styles.confirmRow}>
              <Text style={styles.confirmLabel}>{t('qr.confirm.amount')}</Text>
              {qrData?.amount ? (
                <Text style={styles.confirmAmount}>
                  {formatAmount(qrData.amount)} RWF
                </Text>
              ) : (
                <View style={styles.amountInput}>
                  <TextInput
                    style={styles.amountInputField}
                    placeholder={t('qr.confirm.enter_amount')}
                    value={customAmount}
                    onChangeText={setCustomAmount}
                    keyboardType="numeric"
                    maxLength={10}
                  />
                  <Text style={styles.amountCurrency}>RWF</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.confirmButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowConfirmModal(false)}
            >
              <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.confirmButton, loading && styles.confirmButtonDisabled]}
              onPress={handleConfirmPayment}
              disabled={loading}
            >
              <Text style={styles.confirmButtonText}>
                {loading ? t('common.processing') : t('qr.confirm.pay')}
              </Text>
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
            <Text style={styles.resultTitle}>{t('qr.result.success_title')}</Text>
          </View>

          <View style={styles.resultDetails}>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>{t('qr.result.amount_paid')}</Text>
              <Text style={styles.resultAmount}>
                {paymentResult ? formatAmount(paymentResult.transaction.amount) : '0'} RWF
              </Text>
            </View>
            
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>{t('qr.result.merchant')}</Text>
              <Text style={styles.resultValue}>
                {qrData?.merchantName || qrData?.merchantId || 'Unknown'}
              </Text>
            </View>
            
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>{t('qr.result.reference')}</Text>
              <Text style={styles.resultValue}>{paymentResult?.transaction.reference}</Text>
            </View>
            
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>{t('qr.result.date')}</Text>
              <Text style={styles.resultValue}>
                {paymentResult ? formatDate(paymentResult.transaction.createdAt) : ''}
              </Text>
            </View>
            
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>{t('qr.result.new_balance')}</Text>
              <Text style={styles.resultBalance}>
                {paymentResult ? formatAmount(paymentResult.newBalance) : '0'} RWF
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.modalButton}
            onPress={() => {
              setShowResultModal(false);
              setShowScanner(true); // Ready for next scan
            }}
          >
            <Text style={styles.modalButtonText}>{t('qr.result.scan_another')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      {!showScanner && renderScanPrompt()}

      <Modal visible={showScanner} animationType="slide">
        <QRScanner
          onScan={handleQRScanned}
          onClose={() => setShowScanner(false)}
        />
      </Modal>

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
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    marginBottom: 24,
  },
  title: {
    ...typography.h2,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  button: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    marginBottom: 40,
  },
  buttonText: {
    ...typography.button,
    color: colors.white,
    marginLeft: 8,
  },
  demoSection: {
    alignSelf: 'stretch',
    backgroundColor: colors.gray[50],
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  demoTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: 8,
  },
  demoDescription: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  demoButton: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  demoButtonText: {
    ...typography.button,
    color: colors.primary,
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  confirmLabel: {
    ...typography.body,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  confirmValue: {
    ...typography.button,
    color: colors.text.primary,
  },
  confirmAmount: {
    ...typography.button,
    color: colors.primary,
    fontWeight: 'bold',
    fontSize: 18,
  },
  amountInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
  },
  amountInputField: {
    flex: 1,
    ...typography.body,
    color: colors.text.primary,
  },
  amountCurrency: {
    ...typography.button,
    color: colors.text.secondary,
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
  confirmButtonDisabled: {
    backgroundColor: colors.gray[400],
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
