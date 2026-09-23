import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '../../types/user';
import { auth, isFirebaseConfigured } from '../../services/firebase/firebaseConfig';
import {
  signInAnonymously,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged
} from 'firebase/auth';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  loginAsGuest: (customName?: string) => Promise<UserProfile>;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfileName: (name: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SQUAD_COLORS = [
  '#00F0FF', // Cyan
  '#00E676', // Green
  '#FFB300', // Amber
  '#FF3D71', // Red
  '#8B5CF6', // Purple
  '#3B82F6', // Blue
  '#EC4899', // Pink
  '#10B981'  // Emerald
];

const GUEST_NAMES = [
  'Speedy Falcon', 'Desert Fox', 'Road Runner', 'Trail Blazer',
  'Night Rider', 'Silver Arrow', 'Turbo Comet', 'Apex Pilot',
  'Highway Nomad', 'Urban Drifter', 'Echo Cruiser', 'Solar Wind'
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    if (typeof window === 'undefined') return null;
    const saved = localStorage.getItem('squadnav_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    const randomName = GUEST_NAMES[Math.floor(Math.random() * GUEST_NAMES.length)];
    const id = `guest_${Math.random().toString(36).substring(2, 9)}`;
    const color = SQUAD_COLORS[Math.floor(Math.random() * SQUAD_COLORS.length)];
    const profile: UserProfile = {
      id,
      name: randomName,
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${id}`,
      color,
      isGuest: true,
      createdAt: Date.now()
    };
    try {
      localStorage.setItem('squadnav_user', JSON.stringify(profile));
    } catch {}
    return profile;
  });
  const [loading, setLoading] = useState<boolean>(false);

  // Initialize from localStorage or Firebase
  useEffect(() => {
    if (isFirebaseConfigured() && auth) {
      const unsub = onAuthStateChanged(auth, (fbUser) => {
        if (fbUser) {
          const profile: UserProfile = {
            id: fbUser.uid,
            name: fbUser.displayName || 'Squad Pilot',
            email: fbUser.email || undefined,
            avatar: fbUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${fbUser.uid}`,
            color: SQUAD_COLORS[Math.abs(fbUser.uid.charCodeAt(0)) % SQUAD_COLORS.length],
            isGuest: fbUser.isAnonymous,
            createdAt: Date.now()
          };
          setUser(profile);
          try {
            localStorage.setItem('squadnav_user', JSON.stringify(profile));
          } catch {}
        }
        setLoading(false);
      });
      return unsub;
    } else {
      setLoading(false);
    }
  }, []);

  const createGuestUser = (customName?: string): UserProfile => {
    const randomName = customName || GUEST_NAMES[Math.floor(Math.random() * GUEST_NAMES.length)];
    const id = `guest_${Math.random().toString(36).substring(2, 9)}`;
    const color = SQUAD_COLORS[Math.floor(Math.random() * SQUAD_COLORS.length)];
    const profile: UserProfile = {
      id,
      name: randomName,
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${id}`,
      color,
      isGuest: true,
      createdAt: Date.now()
    };
    try {
      localStorage.setItem('squadnav_user', JSON.stringify(profile));
    } catch {}
    setUser(profile);
    return profile;
  };

  const loginAsGuest = async (customName?: string): Promise<UserProfile> => {
    if (isFirebaseConfigured() && auth) {
      try {
        const cred = await signInAnonymously(auth);
        const name = customName || GUEST_NAMES[Math.floor(Math.random() * GUEST_NAMES.length)];
        const profile: UserProfile = {
          id: cred.user.uid,
          name,
          avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${cred.user.uid}`,
          color: SQUAD_COLORS[Math.floor(Math.random() * SQUAD_COLORS.length)],
          isGuest: true,
          createdAt: Date.now()
        };
        setUser(profile);
        localStorage.setItem('squadnav_user', JSON.stringify(profile));
        return profile;
      } catch (err) {
        console.warn('Anonymous sign in failed, using local guest:', err);
      }
    }
    return createGuestUser(customName);
  };

  const loginWithGoogle = async () => {
    if (isFirebaseConfigured() && auth) {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } else {
      // Mock Google Login for development
      const id = `goog_${Math.random().toString(36).substring(2, 9)}`;
      const profile: UserProfile = {
        id,
        name: 'Alex Rivera',
        email: 'alex.rivera@example.com',
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${id}`,
        color: '#00F0FF',
        isGuest: false,
        createdAt: Date.now()
      };
      localStorage.setItem('squadnav_user', JSON.stringify(profile));
      setUser(profile);
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    if (isFirebaseConfigured() && auth) {
      await signInWithEmailAndPassword(auth, email, pass);
    } else {
      const id = `usr_${Math.random().toString(36).substring(2, 9)}`;
      const profile: UserProfile = {
        id,
        name: email.split('@')[0],
        email,
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${id}`,
        color: '#00E676',
        isGuest: false,
        createdAt: Date.now()
      };
      localStorage.setItem('squadnav_user', JSON.stringify(profile));
      setUser(profile);
    }
  };

  const registerWithEmail = async (email: string, pass: string, name: string) => {
    if (isFirebaseConfigured() && auth) {
      await createUserWithEmailAndPassword(auth, email, pass);
    } else {
      const id = `usr_${Math.random().toString(36).substring(2, 9)}`;
      const profile: UserProfile = {
        id,
        name,
        email,
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${id}`,
        color: '#8B5CF6',
        isGuest: false,
        createdAt: Date.now()
      };
      localStorage.setItem('squadnav_user', JSON.stringify(profile));
      setUser(profile);
    }
  };

  const logout = async () => {
    if (isFirebaseConfigured() && auth) {
      await fbSignOut(auth);
    }
    localStorage.removeItem('squadnav_user');
    createGuestUser();
  };

  const updateProfileName = (name: string) => {
    if (user) {
      const updated = { ...user, name };
      setUser(updated);
      localStorage.setItem('squadnav_user', JSON.stringify(updated));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        loginAsGuest,
        loginWithGoogle,
        loginWithEmail,
        registerWithEmail,
        logout,
        updateProfileName
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
