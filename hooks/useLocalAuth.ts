import { useState, useEffect } from 'react';
import { useLocalStorage, LocalUser, STORAGE_KEYS } from './useLocalStorage';

export const useLocalAuth = () => {
  const [currentUser, setCurrentUser] = useLocalStorage<LocalUser | null>(STORAGE_KEYS.CURRENT_USER, null);
  const [users, setUsers] = useLocalStorage<LocalUser[]>(STORAGE_KEYS.USERS, []);
  const [loading, setLoading] = useState(false);

  const signUp = async (signUpData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
  }) => {
    setLoading(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check if user already exists
    const existingUser = users.find(u => u.email === signUpData.email);
    if (existingUser) {
      setLoading(false);
      return { 
        data: null, 
        error: { message: 'User already registered' } 
      };
    }

    // Create new user
    const newUser: LocalUser = {
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      email: signUpData.email,
      firstName: signUpData.firstName,
      lastName: signUpData.lastName,
      phoneNumber: signUpData.phoneNumber,
      createdAt: new Date().toISOString(),
      trialEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
      subscriptionStatus: 'trial'
    };

    // Save user
    setUsers([...users, newUser]);
    setCurrentUser(newUser);
    setLoading(false);

    return { 
      data: { user: newUser }, 
      error: null 
    };
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Find user
    const user = users.find(u => u.email === email);
    if (!user) {
      setLoading(false);
      return { 
        data: null, 
        error: { message: 'The email or password you entered is incorrect. Please check your credentials and try again.' } 
      };
    }

    setCurrentUser(user);
    setLoading(false);

    return { 
      data: { user }, 
      error: null 
    };
  };

  const signOut = async () => {
    setCurrentUser(null);
    return { error: null };
  };

  return {
    user: currentUser,
    loading,
    signUp,
    signIn,
    signOut,
  };
};