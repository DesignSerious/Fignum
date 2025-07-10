import { useState, useEffect } from 'react';

// Simple local storage hook for user data
export const useLocalStorage = <T>(key: string, defaultValue: T) => {
  const [value, setValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return defaultValue;
    }
  });

  const setStoredValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(value) : value;
      setValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [value, setStoredValue] as const;
};

// Mock user data structure
export interface LocalUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  createdAt: string;
  trialEndDate: string;
  subscriptionStatus: 'trial' | 'active' | 'expired';
}

export interface LocalProject {
  id: string;
  userId: string;
  title: string;
  description: string;
  fileName: string;
  fileSize: number;
  annotations: any[];
  createdAt: string;
  updatedAt: string;
}

// Local storage keys
export const STORAGE_KEYS = {
  CURRENT_USER: 'fignum_current_user',
  USERS: 'fignum_users',
  PROJECTS: 'fignum_projects',
} as const;