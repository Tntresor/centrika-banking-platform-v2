import React, { useEffect, useState } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

// Screens
import OnboardingScreen from '../screens/OnboardingScreen';
import KYCScreen from '../screens/KYCScreen';
import DashboardScreen from '../screens/DashboardScreen';
import MoMoScreen from '../screens/MoMoScreen';
import P2PScreen from '../screens/P2PScreen';
import QRScanScreen from '../screens/QRScanScreen';
import SettingsScreen from '../screens/SettingsScreen';
import CardScreen from '../screens/CardScreen';

// Services
import { storageService } from '../services/storage';
import { apiService } from '../services/api';

// Theme
import { colors } from '../theme/colors';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const MainTabs = () => {
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Feather.glyphMap;

          if (route.name === 'Dashboard') {
            iconName = 'home';
          } else if (route.name === 'MoMo') {
            iconName = 'smartphone';
          } else if (route.name === 'P2P') {
            iconName = 'send';
          } else if (route.name === 'QRScan') {
            iconName = 'qr-code';
          } else if (route.name === 'Settings') {
            iconName = 'settings';
          } else {
            iconName = 'circle';
          }

          return <Feather name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.gray[500],
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.gray[200],
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        headerStyle: {
          backgroundColor: colors.primary,
        },
        headerTintColor: colors.white,
        headerTitleStyle: {
          fontWeight: '600',
        },
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen} 
        options={{ title: t('navigation.dashboard') }}
      />
      <Tab.Screen 
        name="MoMo" 
        component={MoMoScreen} 
        options={{ title: t('navigation.momo') }}
      />
      <Tab.Screen 
        name="P2P" 
        component={P2PScreen} 
        options={{ title: t('navigation.p2p') }}
      />
      <Tab.Screen 
        name="QRScan" 
        component={QRScanScreen} 
        options={{ title: t('navigation.qr_scan') }}
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsScreen} 
        options={{ title: t('navigation.settings') }}
      />
    </Tab.Navigator>
  );
};

export default function AppNavigator() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await storageService.getAuthToken();
      const onboarding = await storageService.getOnboardingStatus();
      
      if (token) {
        // Validate token with server
        const isValid = await apiService.validateToken(token);
        setIsAuthenticated(isValid);
      } else {
        setIsAuthenticated(false);
      }
      
      setHasCompletedOnboarding(onboarding);
    } catch (error) {
      console.error('Auth check error:', error);
      setIsAuthenticated(false);
      setHasCompletedOnboarding(false);
    }
  };

  // Show loading screen while checking auth
  if (isAuthenticated === null || hasCompletedOnboarding === null) {
    return null; // You could show a loading screen here
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!hasCompletedOnboarding ? (
        <Stack.Screen 
          name="Onboarding" 
          component={OnboardingScreen}
          listeners={{
            focus: () => checkAuthStatus(),
          }}
        />
      ) : !isAuthenticated ? (
        <Stack.Screen 
          name="Auth" 
          component={OnboardingScreen}
          listeners={{
            focus: () => checkAuthStatus(),
          }}
        />
      ) : (
        <>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen 
            name="KYC" 
            component={KYCScreen}
            options={{
              headerShown: true,
              title: 'KYC Verification',
              headerStyle: { backgroundColor: colors.primary },
              headerTintColor: colors.white,
            }}
          />
          <Stack.Screen 
            name="Card" 
            component={CardScreen}
            options={{
              headerShown: true,
              title: 'Virtual Card',
              headerStyle: { backgroundColor: colors.primary },
              headerTintColor: colors.white,
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
