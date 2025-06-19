import React, { createContext, useState, useEffect } from 'react';
import StorageService from '../services/StorageService';
import { strings } from '../constants/Strings';

export const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState('en');
  const [currentStrings, setCurrentStrings] = useState(strings.en);

  useEffect(() => {
    loadLanguage();
  }, []);

  useEffect(() => {
    setCurrentStrings(strings[language]);
    StorageService.setLanguage(language);
  }, [language]);

  const loadLanguage = async () => {
    try {
      const savedLanguage = await StorageService.getLanguage();
      setLanguage(savedLanguage);
    } catch (error) {
      console.error('Error loading language:', error);
    }
  };

  const value = {
    language,
    setLanguage,
    strings: currentStrings,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};
