import React, { useContext, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Switch,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LanguageContext } from '../contexts/LanguageContext';
import { AuthContext } from '../contexts/AuthContext';
import LanguageToggle from '../components/LanguageToggle';
import Colors from '../constants/Colors';

export default function SettingsScreen({ navigation }) {
  const { strings, language } = useContext(LanguageContext);
  const { user, signOut } = useContext(AuthContext);
  const [notifications, setNotifications] = useState(true);
  const [biometrics, setBiometrics] = useState(false);

  const handleSignOut = () => {
    Alert.alert(
      strings.signOut,
      strings.signOutConfirmation,
      [
        { text: strings.cancel, style: 'cancel' },
        { text: strings.signOut, onPress: signOut, style: 'destructive' },
      ]
    );
  };

  const settingsGroups = [
    {
      title: strings.account,
      items: [
        {
          icon: 'person',
          title: strings.profile,
          subtitle: strings.profileSubtitle,
          onPress: () => {},
        },
        {
          icon: 'card',
          title: strings.cards,
          subtitle: strings.cardsSubtitle,
          onPress: () => {},
        },
        {
          icon: 'shield-checkmark',
          title: strings.security,
          subtitle: strings.securitySubtitle,
          onPress: () => {},
        },
      ],
    },
    {
      title: strings.preferences,
      items: [
        {
          icon: 'notifications',
          title: strings.notifications,
          subtitle: strings.notificationsSubtitle,
          rightElement: (
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: Colors.lightGray, true: Colors.primary }}
            />
          ),
        },
        {
          icon: 'finger-print',
          title: strings.biometrics,
          subtitle: strings.biometricsSubtitle,
          rightElement: (
            <Switch
              value={biometrics}
              onValueChange={setBiometrics}
              trackColor={{ false: Colors.lightGray, true: Colors.primary }}
            />
          ),
        },
        {
          icon: 'language',
          title: strings.language,
          subtitle: language === 'en' ? 'English' : 'Français',
          rightElement: <LanguageToggle />,
        },
      ],
    },
    {
      title: strings.support,
      items: [
        {
          icon: 'help-circle',
          title: strings.help,
          subtitle: strings.helpSubtitle,
          onPress: () => {},
        },
        {
          icon: 'document-text',
          title: strings.terms,
          subtitle: strings.termsSubtitle,
          onPress: () => {},
        },
        {
          icon: 'shield',
          title: strings.privacy,
          subtitle: strings.privacySubtitle,
          onPress: () => {},
        },
        {
          icon: 'information',
          title: strings.about,
          subtitle: strings.aboutSubtitle,
          onPress: () => {},
        },
      ],
    },
  ];

  const renderSettingItem = (item, index) => (
    <TouchableOpacity
      key={index}
      style={styles.settingItem}
      onPress={item.onPress}
      disabled={!item.onPress}
    >
      <View style={styles.settingLeft}>
        <View style={styles.settingIcon}>
          <Ionicons name={item.icon} size={20} color={Colors.primary} />
        </View>
        <View style={styles.settingContent}>
          <Text style={styles.settingTitle}>{item.title}</Text>
          <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
        </View>
      </View>
      <View style={styles.settingRight}>
        {item.rightElement || (
          <Ionicons name="chevron-forward" size={20} color={Colors.secondary} />
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{strings.settings}</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* User Info */}
        <View style={styles.userCard}>
          <View style={styles.userAvatar}>
            <Text style={styles.userInitials}>
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>
              {user?.firstName} {user?.lastName}
            </Text>
            <Text style={styles.userPhone}>{user?.phoneNumber}</Text>
            <View style={styles.kycStatus}>
              <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
              <Text style={styles.kycStatusText}>{strings.verified}</Text>
            </View>
          </View>
        </View>

        {/* Settings Groups */}
        {settingsGroups.map((group, groupIndex) => (
          <View key={groupIndex} style={styles.settingsGroup}>
            <Text style={styles.groupTitle}>{group.title}</Text>
            <View style={styles.groupItems}>
              {group.items.map((item, itemIndex) => renderSettingItem(item, itemIndex))}
            </View>
          </View>
        ))}

        {/* Sign Out */}
        <View style={styles.signOutContainer}>
          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <Ionicons name="log-out" size={20} color={Colors.error} />
            <Text style={styles.signOutText}>{strings.signOut}</Text>
          </TouchableOpacity>
        </View>

        {/* App Version */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>
            {strings.version} 1.0.0
          </Text>
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
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
  },
  scrollView: {
    flex: 1,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  userAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  userInitials: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  userPhone: {
    fontSize: 14,
    color: Colors.secondary,
    marginBottom: 8,
  },
  kycStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  kycStatusText: {
    fontSize: 12,
    color: Colors.success,
    fontWeight: '500',
    marginLeft: 4,
  },
  settingsGroup: {
    marginBottom: 24,
  },
  groupTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.secondary,
    textTransform: 'uppercase',
    marginBottom: 12,
    marginHorizontal: 20,
  },
  groupItems: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.lightBlue,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: Colors.secondary,
  },
  settingRight: {
    marginLeft: 12,
  },
  signOutContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.error,
    marginLeft: 8,
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  versionText: {
    fontSize: 12,
    color: Colors.secondary,
  },
});
