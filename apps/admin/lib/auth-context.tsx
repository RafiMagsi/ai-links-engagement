'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, signOut } from 'firebase/auth';
import { auth } from './firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  logout: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      try {
        setError(null);
        if (currentUser) {
          // In development, allow any logged-in user
          if (process.env.NODE_ENV === 'development') {
            setUser(currentUser);
            setIsAdmin(true);
          } else {
            // Get the ID token with custom claims
            const idTokenResult = await currentUser.getIdTokenResult();
            const customClaims = idTokenResult.claims;

            // Check for admin custom claims
            const hasAdminClaim = customClaims?.admin === true;
            setIsAdmin(hasAdminClaim);

            if (!hasAdminClaim) {
              setError('Not authorized as admin');
              await signOut(auth);
              setUser(null);
            } else {
              setUser(currentUser);
            }
          }
        } else {
          setUser(null);
          setIsAdmin(false);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Auth error occurred');
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    try {
      setError(null);
      await signOut(auth);
      setUser(null);
      setIsAdmin(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Logout failed');
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
