import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, TOKEN_KEY, Profile } from '../lib/api';

type User = { id: string; email: string };

type AuthCtx = {
  loading: boolean;
  user: User | null;
  profile: Profile | null;
  onboardingDone: boolean;
  setOnboardingDone: (v: boolean) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthCtx | undefined>(undefined);

const ONBOARDING_KEY = 'joy_onboarding_done';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [onboardingDone, setOnboardingDoneState] = useState(false);

  const fetchMeAndProfile = useCallback(async () => {
    try {
      const meRes = await api.get('/auth/me');
      setUser(meRes.data);
      try {
        const pRes = await api.get('/profile/me');
        setProfile(pRes.data);
      } catch {
        setProfile(null);
      }
    } catch {
      setUser(null);
      setProfile(null);
      await AsyncStorage.removeItem(TOKEN_KEY);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const pRes = await api.get('/profile/me');
      setProfile(pRes.data);
    } catch {
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const token = await AsyncStorage.getItem(TOKEN_KEY);
        const ob = await AsyncStorage.getItem(ONBOARDING_KEY);
        setOnboardingDoneState(ob === 'true');
        if (token) {
          await fetchMeAndProfile();
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchMeAndProfile]);

  const signIn = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    const data = res.data;
    await AsyncStorage.setItem(TOKEN_KEY, data.access_token);
    await fetchMeAndProfile();
  };

  const signUp = async (email: string, password: string) => {
    const res = await api.post('/auth/register', { email, password });
    const data = res.data;
    await AsyncStorage.setItem(TOKEN_KEY, data.access_token);
    await fetchMeAndProfile();
  };

  const signOut = async () => {
    await AsyncStorage.removeItem(TOKEN_KEY);
    setUser(null);
    setProfile(null);
  };

  const setOnboardingDone = async (v: boolean) => {
    await AsyncStorage.setItem(ONBOARDING_KEY, v ? 'true' : 'false');
    setOnboardingDoneState(v);
  };

  return (
    <AuthContext.Provider
      value={{
        loading,
        user,
        profile,
        onboardingDone,
        setOnboardingDone,
        signIn,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
