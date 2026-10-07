import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(app);

export const createGoogleProvider = (): GoogleAuthProvider => {
  const provider = new GoogleAuthProvider();
  provider.addScope('https://www.googleapis.com/auth/spreadsheets');
  provider.addScope('https://www.googleapis.com/auth/drive.file');
  provider.setCustomParameters({
    prompt: 'select_account consent',
    access_type: 'offline',
  });
  return provider;
};

// Flag to indicate if we are in the middle of a sign-in flow
let isSigningIn = false;
// In-memory access token cache (NEVER stored in localStorage as per Workspace Skill)
let cachedAccessToken: string | null = null;
let cachedGoogleUser: User | null = null;

const authListeners = new Set<(user: User | null, token: string | null) => void>();

export const initGoogleAuth = (
  onAuthChange?: (user: User | null, token: string | null) => void
): (() => void) => {
  if (onAuthChange) {
    authListeners.add(onAuthChange);
  }

  const unsubscribe = onAuthStateChanged(firebaseAuth, async (user: User | null) => {
    cachedGoogleUser = user;
    if (!user) {
      cachedAccessToken = null;
    }
    authListeners.forEach((cb) => cb(cachedGoogleUser, cachedAccessToken));
  });

  return () => {
    if (onAuthChange) {
      authListeners.delete(onAuthChange);
    }
    unsubscribe();
  };
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const provider = createGoogleProvider();
    const result = await signInWithPopup(firebaseAuth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Gagal mendapatkan token akses dari Google Sign-In.');
    }

    cachedAccessToken = credential.accessToken;
    cachedGoogleUser = result.user;
    authListeners.forEach((cb) => cb(cachedGoogleUser, cachedAccessToken));

    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    // Gracefully handle user cancellation or popup closing without throwing error
    if (
      error?.code === 'auth/popup-closed-by-user' ||
      error?.code === 'auth/cancelled-popup-request' ||
      String(error?.message || '').includes('popup-closed-by-user') ||
      String(error || '').includes('popup-closed-by-user')
    ) {
      return null;
    }
    console.warn('Google Sign in warning:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const clearGoogleAccessToken = (): void => {
  cachedAccessToken = null;
};

export const getGoogleAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const getCachedGoogleUser = (): User | null => {
  return cachedGoogleUser;
};

export const googleSignOut = async (): Promise<void> => {
  await signOut(firebaseAuth);
  cachedAccessToken = null;
  cachedGoogleUser = null;
  authListeners.forEach((cb) => cb(null, null));
};
