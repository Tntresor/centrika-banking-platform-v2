import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  Switch,
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

interface UserProfile {
  user: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    kycStatus: string;
    preferredLanguage: string;
  };
}

export default function SettingsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [notifications, setNotifications] = useState(true);
  const [biometrics, setBiometrics] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const response = await apiService.getUserProfile();
      if (response.success) {
        setProfile(response.data);
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      t('settings.logout.title'),
      t('settings.logout.message'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.logout.confirm'),
          style: 'destructive',
          onPress: performLogout,
        },
      ]
    );
  };

  const performLogout = async () => {
    try {
      await storageService.clearAuthToken();
      await storageService.clearUserData();
      
      // Navigate to auth screen
      navigation.reset({
        index: 0,
        routes: [{ name: 'Auth' as never }],
      });
    } catch (error) {
      Alert.alert(t('error.title'), t('error.logout_failed'));
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      t('settings.delete_account.title'),
      t('settings.delete_account.message'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.delete_account.confirm'),
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              t('settings.delete_account.title'),
              t('settings.delete_account.contact_support')
            );
          },
        },
      ]
    );
  };

  const renderProfileSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('settings.profile.title')}</Text>
      
      <View style={styles.profileCard}>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>
            {profile?.user.firstName} {profile?.user.lastName}
          </Text>
          <Text style={styles.profilePhone}>{profile?.user.phone}</Text>
          {profile?.user.email && (
            <Text style={styles.profileEmail}>{profile.user.email}</Text>
          )}
        </View>
        
        <View style={[styles.kycBadge, { 
          backgroundColor: profile?.user.kycStatus === 'approved' ? colors.success : 
                          profile?.user.kycStatus === 'rejected' ? colors.error : colors.warning 
        }]}>
          <Text style={styles.kycBadgeText}>
            {profile?.user.kycStatus === 'approved' ? t('settings.kyc.verified') :
             profile?.user.kycStatus === 'rejected' ? t('settings.kyc.rejected') :
             t('settings.kyc.pending')}
          </Text>
        </View>
      </View>
    </View>
  );

  const renderSettingsItem = (
    icon: keyof typeof Feather.glyphMap,
    title: string,
    subtitle?: string,
    onPress?: () => void,
    rightElement?: React.ReactNode,
    danger?: boolean
  ) => (
    <TouchableOpacity
      style={styles.settingsItem}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.settingsItemLeft}>
        <Feather 
          name={icon} 
          size={20} 
          color={danger ? colors.error : colors.gray[600]} 
        />
        <View style={styles.settingsItemText}>
          <Text style={[styles.settingsItemTitle, danger && { color: colors.error }]}>
            {title}
          </Text>
          {subtitle && (
            <Text style={styles.settingsItemSubtitle}>{subtitle}</Text>
          )}
        </View>
      </View>
      
      {rightElement || (onPress && (
        <Feather name="chevron-right" size={20} color={colors.gray[400]} />
      ))}
    </TouchableOpacity>
  );

  if (loading) {
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
      <ScrollView style={styles.scrollView}>
        {/* Profile Section */}
        {renderProfileSection()}

        {/* Account Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.account.title')}</Text>
          
          {renderSettingsItem(
            'user',
            t('settings.account.edit_profile'),
            t('settings.account.edit_profile_subtitle'),
            () => {
              // Navigate to edit profile screen
              Alert.alert(t('common.info'), t('settings.coming_soon'));
            }
          )}
          
          {renderSettingsItem(
            'shield',
            t('settings.account.kyc_status'),
            profile?.user.kycStatus === 'approved' ? 
              t('settings.kyc.verified_subtitle') : 
              t('settings.kyc.pending_subtitle'),
            profile?.user.kycStatus !== 'approved' ? 
              () => navigation.navigate('KYC' as never) : undefined
          )}
          
          {renderSettingsItem(
            'credit-card',
            t('settings.account.cards'),
            t('settings.account.cards_subtitle'),
            () => navigation.navigate('Card' as never)
          )}
        </View>

        {/* Security Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.security.title')}</Text>
          
          {renderSettingsItem(
            'bell',
            t('settings.security.notifications'),
            t('settings.security.notifications_subtitle'),
            undefined,
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: colors.gray[300], true: colors.primary }}
              thumbColor={colors.white}
            />
          )}
          
          {renderSettingsItem(
            'fingerprint',
            t('settings.security.biometrics'),
            t('settings.security.biometrics_subtitle'),
            undefined,
            <Switch
              value={biometrics}
              onValueChange={setBiometrics}
              trackColor={{ false: colors.gray[300], true: colors.primary }}
              thumbColor={colors.white}
            />
          )}
          
          {renderSettingsItem(
            'lock',
            t('settings.security.change_pin'),
            t('settings.security.change_pin_subtitle'),
            () => {
              Alert.alert(t('common.info'), t('settings.coming_soon'));
            }
          )}
        </View>

        {/* App Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.app.title')}</Text>
          
          <View style={styles.settingsItem}>
            <View style={styles.settingsItemLeft}>
              <Feather name="globe" size={20} color={colors.gray[600]} />
              <View style={styles.settingsItemText}>
                <Text style={styles.settingsItemTitle}>
                  {t('settings.app.language')}
                </Text>
                <Text style={styles.settingsItemSubtitle}>
                  {t('settings.app.language_subtitle')}
                </Text>
              </View>
            </View>
            <LanguageToggle />
          </View>
          
          {renderSettingsItem(
            'info',
            t('settings.app.about'),
            t('settings.app.about_subtitle'),
            () => {
              Alert.alert(
                t('settings.app.about'),
                `${t('settings.app.version')}: 1.0.0\n${t('settings.app.build')}: 1000`
              );
            }
          )}
          
          {renderSettingsItem(
            'help-circle',
            t('settings.app.support'),
            t('settings.app.support_subtitle'),
            () => {
              Alert.alert(
                t('settings.app.support'),
                t('settings.app.support_message')
              );
            }
          )}
          
          {renderSettingsItem(
            'file-text',
            t('settings.app.terms'),
            t('settings.app.terms_subtitle'),
            () => {
              Alert.alert(t('common.info'), t('settings.coming_soon'));
            }
          )}
          
          {renderSettingsItem(
            'shield',
            t('settings.app.privacy'),
            t('settings.app.privacy_subtitle'),
            () => {
              Alert.alert(t('common.info'), t('settings.coming_soon'));
            }
          )}
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.danger.title')}</Text>
          
          {renderSettingsItem(
            'log-out',
            t('settings.danger.logout'),
            t('settings.danger.logout_subtitle'),
            handleLogout,
            undefined,
            true
          )}
          
          {renderSettingsItem(
            'trash-2',
            t('settings.danger.delete_account'),
            t('settings.danger.delete_account_subtitle'),
            handleDeleteAccount,
            undefined,
            true
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {t('settings.footer.version')} 1.0.0
          </Text>
          <Text style={styles.footerText}>
            © 2024 Centrika Neobank Rwanda
          </Text>
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
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  profileCard: {
    backgroundColor: colors.white,
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: 4,
  },
  profilePhone: {
    ...typography.body,
    color: colors.text.secondary,
    marginBottom: 2,
  },
  profileEmail: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  kycBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  kycBadgeText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: '600',
  },
  settingsItem: {
    backgroundColor: colors.white,
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  settingsItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingsItemText: {
    marginLeft: 16,
    flex: 1,
  },
  settingsItemTitle: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '500',
  },
  settingsItemSubtitle: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  footer: {
    alignItems: 'center',
    padding: 32,
  },
  footerText: {
    ...typography.caption,
    color: colors.text.secondary,
    marginBottom: 4,
  },
});
