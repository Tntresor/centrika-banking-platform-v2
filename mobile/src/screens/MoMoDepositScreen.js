import React, { useContext, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LanguageContext } from '../contexts/LanguageContext';
import { AuthContext } from '../contexts/AuthContext';
import ApiService from '../services/ApiService';
import Colors from '../constants/Colors';

export default function MoMoDepositScreen({ navigation }) {
  const { strings } = useContext(LanguageContext);
  const { user } = useContext(AuthContext);
  const [amount, setAmount] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleDeposit = async () => {
    if (!amount || !phoneNumber) {
      Alert.alert(strings.error, strings.fillAllFields);
      return;
    }

    const depositAmount = parseFloat(amount);
    if (depositAmount <= 0 || depositAmount > 1000000) {
      Alert.alert(strings.error, strings.invalidAmount);
      return;
    }

    if (!phoneNumber.match(/^(\+250|250)?[0-9]{9}$/)) {
      Alert.alert(strings.error, strings.invalidPhoneNumber);
      return;
    }

    try {
      setIsLoading(true);

      const response = await ApiService.post('/momo/deposit', {
        amount: depositAmount,
        phoneNumber: phoneNumber,
        userId: user.id,
      });

      if (response.success) {
        Alert.alert(
          strings.success,
          strings.depositSuccess,
          [
            {
              text: strings.ok,
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        Alert.alert(strings.error, response.message || strings.depositFailed);
      }
    } catch (error) {
      Alert.alert(strings.error, error.message || strings.depositFailed);
    } finally {
      setIsLoading(false);
    }
  };

  const formatAmount = (text) => {
    const numericValue = text.replace(/[^0-9]/g, '');
    return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{strings.momoDeposit}</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.content}>
          {/* MoMo Info */}
          <View style={styles.infoCard}>
            <View style={styles.infoIcon}>
              <Ionicons name="phone-portrait" size={32} color={Colors.primary} />
            </View>
            <Text style={styles.infoTitle}>{strings.momoDeposit}</Text>
            <Text style={styles.infoDescription}>
              {strings.momoDepositDescription}
            </Text>
          </View>

          {/* Amount Input */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>{strings.amount}</Text>
            <View style={styles.amountContainer}>
              <TextInput
                style={styles.amountInput}
                value={formatAmount(amount)}
                onChangeText={(text) => setAmount(text.replace(/,/g, ''))}
                placeholder="0"
                keyboardType="numeric"
                maxLength={10}
              />
              <Text style={styles.currency}>RWF</Text>
            </View>
            <Text style={styles.inputHint}>
              {strings.dailyLimit}: 1,000,000 RWF
            </Text>
          </View>

          {/* Phone Number Input */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>{strings.phoneNumber}</Text>
            <TextInput
              style={styles.input}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="+250 7XX XXX XXX"
              keyboardType="phone-pad"
              maxLength={13}
            />
            <Text style={styles.inputHint}>
              {strings.momoPhoneHint}
            </Text>
          </View>

          {/* Fees Info */}
          <View style={styles.feesCard}>
            <View style={styles.feesRow}>
              <Text style={styles.feesLabel}>{strings.amount}</Text>
              <Text style={styles.feesValue}>
                {amount ? `${formatAmount(amount)} RWF` : '0 RWF'}
              </Text>
            </View>
            <View style={styles.feesRow}>
              <Text style={styles.feesLabel}>{strings.fees}</Text>
              <Text style={styles.feesValue}>0 RWF</Text>
            </View>
            <View style={[styles.feesRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>{strings.total}</Text>
              <Text style={styles.totalValue}>
                {amount ? `${formatAmount(amount)} RWF` : '0 RWF'}
              </Text>
            </View>
          </View>

          {/* Deposit Button */}
          <TouchableOpacity
            style={[styles.depositButton, isLoading && styles.buttonDisabled]}
            onPress={handleDeposit}
            disabled={isLoading}
          >
            <Text style={styles.depositButtonText}>
              {isLoading ? strings.processing : strings.deposit}
            </Text>
          </TouchableOpacity>

          {/* Security Note */}
          <View style={styles.securityNote}>
            <Ionicons name="shield-checkmark" size={16} color={Colors.success} />
            <Text style={styles.securityText}>{strings.secureTransaction}</Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  infoCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  infoIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.lightBlue,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  infoDescription: {
    fontSize: 14,
    color: Colors.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  inputSection: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: Colors.lightGray,
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: Colors.text,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: Colors.lightGray,
    borderRadius: 8,
    paddingHorizontal: 16,
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '600',
    color: Colors.text,
    paddingVertical: 16,
  },
  currency: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.secondary,
    marginLeft: 8,
  },
  inputHint: {
    fontSize: 12,
    color: Colors.secondary,
    marginTop: 4,
  },
  feesCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  feesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  feesLabel: {
    fontSize: 14,
    color: Colors.secondary,
  },
  feesValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
    paddingTop: 12,
    marginTop: 4,
    marginBottom: 0,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  depositButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  depositButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  securityText: {
    fontSize: 12,
    color: Colors.secondary,
    marginLeft: 4,
  },
});
