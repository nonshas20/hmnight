'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  isLoggedIn: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in from localStorage
    const savedUser = localStorage.getItem('hmnight_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error('Error parsing saved user:', error);
        localStorage.removeItem('hmnight_user');
      }
    }
    setLoading(false);
  }, []);

  const signup = async (name: string, email: string, password: string): Promise<boolean> => {
    try {
      // Check if user already exists
      const existingUsers = JSON.parse(localStorage.getItem('hmnight_users') || '[]');
      const userExists = existingUsers.find((u: User) => u.email === email);

      if (userExists) {
        return false; // User already exists
      }

      // Create new user
      const newUser: User = {
        id: Date.now().toString(),
        email,
        name,
        createdAt: new Date().toISOString(),
      };

      // Save to users list
      existingUsers.push(newUser);
      localStorage.setItem('hmnight_users', JSON.stringify(existingUsers));

      // DON'T automatically log in the user - they need to login explicitly
      // setUser(newUser);
      // localStorage.setItem('hmnight_user', JSON.stringify(newUser));

      return true;
    } catch (error) {
      console.error('Signup error:', error);
      return false;
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      // Get users from localStorage
      const existingUsers = JSON.parse(localStorage.getItem('hmnight_users') || '[]');
      const foundUser = existingUsers.find((u: User) => u.email === email);

      if (foundUser) {
        setUser(foundUser);
        localStorage.setItem('hmnight_user', JSON.stringify(foundUser));
        return true;
      }

      return false; // User not found
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('hmnight_user');
  };

  const value: AuthContextType = {
    user,
    isLoggedIn: !!user,
    login,
    signup,
    logout,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
