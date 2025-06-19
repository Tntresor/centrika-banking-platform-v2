import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

// Theme
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

export default function LanguageToggle() {
  const { i18n } = useTranslation();

  const currentLanguage = i18n.language;

  const toggleLanguage = () => {
    const newLanguage = currentLanguage === 'en' ? 'fr' : 'en';
    i18n.changeLanguage(newLanguage);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.languageButton,
          currentLanguage === 'en' && styles.activeButton,
        ]}
        onPress={() => currentLanguage !== 'en' && toggleLanguage()}
      >
        <Text
          style={[
            styles.languageText,
            currentLanguage === 'en' && styles.activeText,
          ]}
        >
          EN
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[
          styles.languageButton,
          currentLanguage === 'fr' && styles.activeButton,
        ]}
        onPress={() => currentLanguage !== 'fr' && toggleLanguage()}
      >
        <Text
          style={[
            styles.languageText,
            currentLanguage === 'fr' && styles.activeText,
          ]}
        >
          FR
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.gray[200],
    borderRadius: 20,
    padding: 4,
  },
  languageButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  activeButton: {
    backgroundColor: colors.primary,
  },
  languageText: {
    ...typography.caption,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  activeText: {
    color: colors.white,
  },
});
