import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  updateProfile,
  type User as FirebaseUser,
} from 'firebase/auth';

import { auth } from '@/config/firebase';
import { api } from '@/services/api';
import { getMyProfile } from '@/services/users';
import { UserProfile } from '@/types/user';

type AuthContextValue = {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  initializing: boolean;
  profileLoading: boolean;
  signingUp: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'auth/email-already-in-use': 'Este email já está registado.',
  'auth/invalid-email': 'Email inválido.',
  'auth/weak-password': 'A palavra-passe é demasiado fraca.',
};

function translateAuthError(err: unknown): Error {
  const code = (err as { code?: string } | null)?.code;
  const message = code ? AUTH_ERROR_MESSAGES[code] : undefined;
  if (message) return new Error(message);
  return err instanceof Error ? err : new Error('Não foi possível criar a conta');
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [signingUp, setSigningUp] = useState(false);

  const loadProfile = useCallback(async (firebaseUser: FirebaseUser | null) => {
    if (!firebaseUser) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }

    setProfileLoading(true);
    try {
      const nextProfile = await getMyProfile();
      setProfile(nextProfile);
    } catch {
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    return onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setInitializing(false);
      void loadProfile(firebaseUser);
    });
  }, [loadProfile]);

  async function signIn(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password);
  }

  async function signUp(name: string, email: string, password: string) {
    setSigningUp(true);
    try {
      let credential;
      try {
        credential = await createUserWithEmailAndPassword(auth, email, password);
      } catch (err) {
        throw translateAuthError(err);
      }

      await updateProfile(credential.user, { displayName: name });

      try {
        await api.post('/api/users/profile', { name, email });
        await loadProfile(credential.user);
      } catch (err) {
        await credential.user.delete();
        throw err;
      }
    } finally {
      setSigningUp(false);
    }
  }

  async function signInWithGoogle() {
    const provider = new GoogleAuthProvider();
    const credential = await signInWithPopup(auth, provider);
    const firebaseUser = credential.user;

    try {
      await getMyProfile();
    } catch {
      const baseName = firebaseUser.displayName ?? 'User';
      const email = firebaseUser.email ?? '';

      try {
        await api.post('/api/users/profile', { name: baseName, email });
      } catch (err) {
        // Se o nome já estiver ocupado, tenta uma vez com um sufixo numérico
        if (err instanceof Error && err.message.includes('nome')) {
          const suffix = Math.floor(1000 + Math.random() * 9000);
          await api.post('/api/users/profile', { name: `${baseName} ${suffix}`, email });
        } else {
          throw err;
        }
      }

      await loadProfile(firebaseUser);
    }
  }

  async function signOut() {
    setProfile(null);
    await firebaseSignOut(auth);
  }

  async function refreshProfile() {
    await loadProfile(auth.currentUser);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        initializing,
        profileLoading,
        signingUp,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        refreshProfile,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
