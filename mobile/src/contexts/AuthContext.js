import React, { createContext, useState, useEffect } from 'react';
import StorageService from '../services/StorageService';
import ApiService from '../services/ApiService';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authToken, setAuthToken] = useState(null);

  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      const [savedUser, savedToken] = await Promise.all([
        StorageService.getUser(),
        ApiService.getAuthToken(),
      ]);

      if (savedUser && savedToken) {
        setUser(savedUser);
        setAuthToken(savedToken);
      }
    } catch (error) {
      console.error('Error checking auth state:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (userData) => {
    try {
      setIsLoading(true);

      // For Phase 0 demo, create user locally
      // For Phase 1, this will call the actual API
      const newUser = {
        id: Date.now().toString(),
        ...userData,
        createdAt: new Date().toISOString(),
        balance: 0,
      };

      // Store user data
      await StorageService.setUser(newUser);
      
      // Generate a mock auth token for demo
      const token = `demo_token_${newUser.id}`;
      await ApiService.setAuthToken(token);

      setUser(newUser);
      setAuthToken(token);

      // Initialize user balance
      await StorageService.setBalance(newUser.id, 0);

      return { success: true, user: newUser };
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (credentials) => {
    try {
      setIsLoading(true);

      const response = await ApiService.signIn(credentials);
      
      if (response.success) {
        const { user: userData, token } = response;
        
        await StorageService.setUser(userData);
        await ApiService.setAuthToken(token);
        
        setUser(userData);
        setAuthToken(token);
        
        return { success: true };
      } else {
        throw new Error(response.message || 'Sign in failed');
      }
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setIsLoading(true);

      // Clear local storage
      if (user) {
        await StorageService.clearUserData(user.id);
      }
      await ApiService.removeAuthToken();

      setUser(null);
      setAuthToken(null);
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateUser = async (updates) => {
    try {
      const updatedUser = { ...user, ...updates };
      await StorageService.setUser(updatedUser);
      setUser(updatedUser);
      return updatedUser;
    } catch (error) {
      console.error('Update user error:', error);
      throw error;
    }
  };

  const refreshUser = async () => {
    try {
      if (!user) return;

      const response = await ApiService.getUserProfile(user.id);
      if (response.success) {
        const updatedUser = response.user;
        await StorageService.setUser(updatedUser);
        setUser(updatedUser);
      }
    } catch (error) {
      console.error('Refresh user error:', error);
    }
  };

  const value = {
    user,
    isLoading,
    authToken,
    signUp,
    signIn,
    signOut,
    updateUser,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
