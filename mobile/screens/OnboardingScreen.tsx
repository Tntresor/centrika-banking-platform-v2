import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';

// Components
import LanguageToggle from '../components/LanguageToggle';

// Services
import { apiService } from '../services/api';
import { storageService } from '../services/storage';

// Theme
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

interface FormData {
  phone: string;
  firstName: string;
  lastName: string;
  email: string;
  otp: string;
}

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  
  const [step, setStep] = useState<'register' | 'otp' | 'login'>('register');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    phone: '',
    firstName: '',
    lastName: '',
    email: '',
    otp: '',
  });

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleRegister = async () => {
    if (!formData.phone || !formData.firstName || !formData.lastName) {
      Alert.alert(t('error.title'), t('error.required_fields'));
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.register({
        phone: formData.phone,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
      });

      if (response.success) {
        // Send OTP
        await apiService.sendOTP(formData.phone);
        setStep('otp');
      } else {
        Alert.alert(t('error.title'), response.error || t('error.registration_failed'));
      }
    } catch (error) {
      Alert.alert(t('error.title'), t('error.network_error'));
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!formData.phone) {
      Alert.alert(t('error.title'), t('error.phone_required'));
      return;
    }

    setLoading(true);
    try {
      // Send OTP for login
      await apiService.sendOTP(formData.phone);
      setStep('otp');
    } catch (error) {
      Alert.alert(t('error.title'), t('error.network_error'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!formData.otp) {
      Alert.alert(t('error.title'), t('error.otp_required'));
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.login(formData.phone, formData.otp);
      
      if (response.success && response.data?.token) {
        await storageService.setAuthToken(response.data.token);
        await storageService.setUserData(response.data.user);
        await storageService.setOnboardingStatus(true);
        
        // Navigate to main app
        navigation.reset({
          index: 0,
          routes: [{ name: 'Main' as never }],
        });
      } else {
        Alert.alert(t('error.title'), response.error || t('error.invalid_otp'));
      }
    } catch (error) {
      Alert.alert(t('error.title'), t('error.network_error'));
    } finally {
      setLoading(false);
    }
  };

  const renderRegisterForm = () => (
    <View style={styles.form}>
      <Text style={styles.title}>{t('onboarding.welcome_title')}</Text>
      <Text style={styles.subtitle}>{t('onboarding.welcome_subtitle')}</Text>

      <View style={styles.inputContainer}>
        <Feather name="phone" size={20} color={colors.gray[500]} style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder={t('onboarding.phone_placeholder')}
          value={formData.phone}
          onChangeText={(value) => handleInputChange('phone', value)}
          keyboardType="phone-pad"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.inputContainer}>
        <Feather name="user" size={20} color={colors.gray[500]} style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder={t('onboarding.first_name_placeholder')}
          value={formData.firstName}
          onChangeText={(value) => handleInputChange('firstName', value)}
          autoCapitalize="words"
        />
      </View>

      <View style={styles.inputContainer}>
        <Feather name="user" size={20} color={colors.gray[500]} style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder={t('onboarding.last_name_placeholder')}
          value={formData.lastName}
          onChangeText={(value) => handleInputChange('lastName', value)}
          autoCapitalize="words"
        />
      </View>

      <View style={styles.inputContainer}>
        <Feather name="mail" size={20} color={colors.gray[500]} style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder={t('onboarding.email_placeholder')}
          value={formData.email}
          onChangeText={(value) => handleInputChange('email', value)}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleRegister}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? t('common.loading') : t('onboarding.create_account')}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.linkButton}
        onPress={() => setStep('login')}
      >
        <Text style={styles.linkText}>{t('onboarding.already_have_account')}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderLoginForm = () => (
    <View style={styles.form}>
      <Text style={styles.title}>{t('onboarding.login_title')}</Text>
      <Text style={styles.subtitle}>{t('onboarding.login_subtitle')}</Text>

      <View style={styles.inputContainer}>
        <Feather name="phone" size={20} color={colors.gray[500]} style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder={t('onboarding.phone_placeholder')}
          value={formData.phone}
          onChangeText={(value) => handleInputChange('phone', value)}
          keyboardType="phone-pad"
          autoCapitalize="none"
        />
      </View>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleLogin}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? t('common.loading') : t('onboarding.send_otp')}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.linkButton}
        onPress={() => setStep('register')}
      >
        <Text style={styles.linkText}>{t('onboarding.need_account')}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderOTPForm = () => (
    <View style={styles.form}>
      <Text style={styles.title}>{t('onboarding.verify_title')}</Text>
      <Text style={styles.subtitle}>
        {t('onboarding.verify_subtitle', { phone: formData.phone })}
      </Text>

      <View style={styles.inputContainer}>
        <Feather name="key" size={20} color={colors.gray[500]} style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder={t('onboarding.otp_placeholder')}
          value={formData.otp}
          onChangeText={(value) => handleInputChange('otp', value)}
          keyboardType="number-pad"
          maxLength={6}
          autoCapitalize="none"
        />
      </View>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleVerifyOTP}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? t('common.loading') : t('onboarding.verify_otp')}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.linkButton}
        onPress={() => setStep('register')}
      >
        <Text style={styles.linkText}>{t('onboarding.back')}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <LanguageToggle />
            <View style={styles.logo}>
              <Text style={styles.logoText}>Centrika</Text>
              <Text style={styles.logoSubtext}>Neobank</Text>
            </View>
          </View>

          {step === 'register' && renderRegisterForm()}
          {step === 'login' && renderLoginForm()}
          {step === 'otp' && renderOTPForm()}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    alignItems: 'center',
    marginTop: 20,
  },
  logoText: {
    ...typography.h1,
    color: colors.primary,
    fontWeight: 'bold',
  },
  logoSubtext: {
    ...typography.body,
    color: colors.gray[600],
    marginTop: 4,
  },
  form: {
    paddingHorizontal: 32,
  },
  title: {
    ...typography.h2,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    backgroundColor: colors.white,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 52,
    ...typography.body,
    color: colors.text.primary,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: colors.gray[400],
  },
  buttonText: {
    ...typography.button,
    color: colors.white,
  },
  linkButton: {
    alignItems: 'center',
    marginTop: 24,
  },
  linkText: {
    ...typography.body,
    color: colors.primary,
  },
});
