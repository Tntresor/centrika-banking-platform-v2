import React, { useContext, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LanguageContext } from '../contexts/LanguageContext';
import { AuthContext } from '../contexts/AuthContext';
import LanguageToggle from '../components/LanguageToggle';
import Colors from '../constants/Colors';

export default function OnboardingScreen({ navigation }) {
  const { strings } = useContext(LanguageContext);
  const { signUp } = useContext(AuthContext);
  const [isLoading, setIsLoading] = useState(false);

  const handleGetStarted = async () => {
    try {
      setIsLoading(true);
      // Navigate to KYC screen
      navigation.navigate('KYC');
    } catch (error) {
      Alert.alert(strings.error, error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <LanguageToggle />
      </View>

      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <View style={styles.logo}>
            <Ionicons name="card" size={60} color={Colors.primary} />
          </View>
          <Text style={styles.title}>Centrika</Text>
          <Text style={styles.subtitle}>{strings.neobank}</Text>
        </View>

        <View style={styles.featuresContainer}>
          <View style={styles.feature}>
            <Ionicons name="phone-portrait" size={24} color={Colors.primary} />
            <Text style={styles.featureText}>{strings.feature1}</Text>
          </View>
          <View style={styles.feature}>
            <Ionicons name="flash" size={24} color={Colors.primary} />
            <Text style={styles.featureText}>{strings.feature2}</Text>
          </View>
          <View style={styles.feature}>
            <Ionicons name="shield-checkmark" size={24} color={Colors.primary} />
            <Text style={styles.featureText}>{strings.feature3}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleGetStarted}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? strings.loading : strings.getStarted}
          </Text>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          {strings.disclaimer}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 20,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 50,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.lightBlue,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.secondary,
  },
  featuresContainer: {
    marginBottom: 40,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  featureText: {
    fontSize: 16,
    color: Colors.text,
    marginLeft: 15,
    flex: 1,
  },
  button: {
    backgroundColor: Colors.primary,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  disclaimer: {
    fontSize: 12,
    color: Colors.secondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
