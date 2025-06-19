import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LanguageContext } from '../contexts/LanguageContext';
import Colors from '../constants/Colors';

export default function LanguageToggle() {
  const { language, setLanguage } = useContext(LanguageContext);

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'fr' : 'en');
  };

  return (
    <TouchableOpacity style={styles.container} onPress={toggleLanguage}>
      <View style={styles.toggle}>
        <Text style={[styles.option, language === 'en' && styles.activeOption]}>
          EN
        </Text>
        <Text style={[styles.option, language === 'fr' && styles.activeOption]}>
          FR
        </Text>
        <View
          style={[
            styles.slider,
            {
              left: language === 'en' ? 2 : '50%',
            },
          ]}
        />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  toggle: {
    flexDirection: 'row',
    backgroundColor: Colors.lightGray,
    borderRadius: 20,
    padding: 2,
    position: 'relative',
    width: 70,
    height: 32,
  },
  option: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: Colors.secondary,
    lineHeight: 28,
    zIndex: 2,
  },
  activeOption: {
    color: Colors.primary,
  },
  slider: {
    position: 'absolute',
    top: 2,
    width: '47%',
    height: 28,
    backgroundColor: 'white',
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
});
