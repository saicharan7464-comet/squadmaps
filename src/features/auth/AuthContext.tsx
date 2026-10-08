import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserProfile } from '../../types/user';
import { supabase, isSupabaseConfigured } from '../../services/supabase/supabaseClient';
import type { User as SupabaseUser } from '@supabase/supabase-js';

export interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  isAuthenticated: boolean;
  isGuest: boolean;
  authError: string | null;
  isRecoveryMode: boolean;
  clearAuthError: () => void;
  setIsRecoveryMode: (value: boolean) => void;

  // Authentication Actions
  login: (email: string, pass: string) => Promise<void>;
  signUp: (email: string, pass: string, name?: string) => Promise<{ requiresVerification?: boolean }>;
  continueAsGuest: (customName?: string) => Promise<UserProfile>;
  logout: () => Promise<void>;

  // Password Recovery
  requestPasswordReset: (email: string) => Promise<void>;
  verifyRecoveryCode: (email: string, token: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;

  // Guest Upgrade
  upgradeGuestAccount: (email: string, pass: string, name?: string) => Promise<{ requiresVerification?: boolean }>;

  // Profile
  updateProfileName: (name: string) => void;

  // Backwards-compatible aliases
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, name: string) => Promise<void>;
  loginAsGuest: (customName?: string) => Promise<UserProfile>;
  loginWithGoogle: () => Promise<void>;
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

const getColorForId = (id: string): string => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return SQUAD_COLORS[Math.abs(hash) % SQUAD_COLORS.length];
};

const getAvatarUrl = (seed: string): string => {
  return `https://api.dicebear.com/7.x/bottts/svg?seed=${seed}`;
};

// Normalize and map raw Supabase error messages to friendly, non-leaking user messages
export const formatAuthErrorMessage = (err: any): string => {
  if (!err) return 'An unexpected error occurred. Please try again.';
  const msg: string = (err.message || err.error_description || String(err)).toLowerCase();

  if (msg.includes('invalid login credentials') || msg.includes('invalid_grant')) {
    return 'Incorrect email or password. Please verify your credentials and try again.';
  }
  if (msg.includes('user already registered') || msg.includes('already exists') || msg.includes('email address already in use')) {
    return 'An account with this email address already exists. Please log in instead.';
  }
  if (msg.includes('rate limit') || msg.includes('too many requests') || msg.includes('over_email_send_rate_limit')) {
    return 'Too many attempts. For security, please wait a minute before trying again.';
  }
  if (msg.includes('token has expired') || msg.includes('otp has expired') || msg.includes('expired')) {
    return 'This verification code has expired. Please request a new code.';
  }
  if (msg.includes('invalid token') || msg.includes('invalid otp') || msg.includes('token is invalid') || msg.includes('bad code')) {
    return 'Invalid verification code. Please check the code in your email and try again.';
  }
  if (msg.includes('password should be at least') || msg.includes('weak password')) {
    return 'Password must be at least 6 characters long and include numbers or symbols.';
  }
  if (msg.includes('network') || msg.includes('failed to fetch') || msg.includes('enotfound')) {
    return 'Network connection issue. Please check your internet connection.';
  }
  return err.message || 'Authentication request failed. Please check your details and try again.';
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isRecoveryMode, setIsRecoveryMode] = useState<boolean>(false);

  const clearAuthError = useCallback(() => {
    setAuthError(null);
  }, []);

  // Sync profile to Supabase public.profiles table
  const syncProfileToSupabase = async (profile: UserProfile): Promise<void> => {
    if (!isSupabaseConfigured() || !supabase) return;
    try {
      await supabase.from('profiles').upsert({
        id: profile.id,
        name: profile.name,
        email: profile.email || null,
        avatar: profile.avatar,
        color: profile.color,
        is_guest: profile.isGuest,
        created_at: profile.createdAt ? new Date(profile.createdAt).toISOString() : new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
    } catch (err) {
      console.warn('[AuthContext] Failed to sync profile to Supabase:', err);
    }
  };

  // Fetch existing profile from Supabase if available
  const fetchProfileFromSupabase = async (userId: string): Promise<Partial<UserProfile> | null> => {
    if (!isSupabaseConfigured() || !supabase) return null;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (!error && data) {
        return {
          name: data.name,
          avatar: data.avatar,
          color: data.color,
          email: data.email || undefined,
          isGuest: Boolean(data.is_guest),
          createdAt: typeof data.created_at === 'number'
            ? data.created_at
            : (data.created_at ? new Date(data.created_at).getTime() : Date.now())
        };
      }
    } catch (err) {
      console.warn('[AuthContext] Failed to fetch profile from Supabase:', err);
    }
    return null;
  };

  // Convert a Supabase user into our domain UserProfile interface
  const mapSupabaseUserToProfile = async (sbUser: SupabaseUser): Promise<UserProfile> => {
    const savedRaw = localStorage.getItem('squadnav_user');
    let cached: UserProfile | null = null;
    if (savedRaw) {
      try {
        const parsed = JSON.parse(savedRaw);
        if (parsed.id === sbUser.id) cached = parsed;
      } catch {}
    }

    const remoteProfile = await fetchProfileFromSupabase(sbUser.id);

    const name =
      remoteProfile?.name ||
      cached?.name ||
      sbUser.user_metadata?.name ||
      sbUser.user_metadata?.full_name ||
      (sbUser.email ? sbUser.email.split('@')[0] : null) ||
      GUEST_NAMES[Math.floor(Math.random() * GUEST_NAMES.length)];

    const avatar =
      remoteProfile?.avatar ||
      cached?.avatar ||
      sbUser.user_metadata?.avatar_url ||
      getAvatarUrl(sbUser.id);

    const color =
      remoteProfile?.color ||
      cached?.color ||
      getColorForId(sbUser.id);

    const isGuest = Boolean(
      sbUser.is_anonymous ||
      sbUser.app_metadata?.provider === 'anonymous'
    );

    const createdAt =
      remoteProfile?.createdAt ||
      cached?.createdAt ||
      (sbUser.created_at ? new Date(sbUser.created_at).getTime() : Date.now());

    const profile: UserProfile = {
      id: sbUser.id,
      name,
      email: sbUser.email || remoteProfile?.email || cached?.email || undefined,
      avatar,
      color,
      isGuest,
      createdAt
    };

    localStorage.setItem('squadnav_user', JSON.stringify(profile));
    return profile;
  };

  // Helper to create a guest user profile
  const createGuestProfile = (customName?: string, explicitId?: string): UserProfile => {
    const randomName = customName?.trim() || GUEST_NAMES[Math.floor(Math.random() * GUEST_NAMES.length)];
    const id = explicitId || `guest_${Math.random().toString(36).substring(2, 9)}`;
    const color = SQUAD_COLORS[Math.floor(Math.random() * SQUAD_COLORS.length)];
    const profile: UserProfile = {
      id,
      name: randomName,
      avatar: getAvatarUrl(id),
      color,
      isGuest: true,
      createdAt: Date.now()
    };
    localStorage.setItem('squadnav_user', JSON.stringify(profile));
    setUser(profile);
    syncProfileToSupabase(profile).catch(() => {});
    return profile;
  };

  // Initialize Auth on app start
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      // 1. Check URL for password reset indicators (#type=recovery or ?type=recovery or accessToken)
      const fullUrl = window.location.href;
      if (
        fullUrl.includes('type=recovery') ||
        fullUrl.includes('reset-password') ||
        fullUrl.includes('access_token') && fullUrl.includes('recovery')
      ) {
        setIsRecoveryMode(true);
      }

      // 2. Check Supabase session first
      if (isSupabaseConfigured() && supabase) {
        try {
          const { data: { session }, error } = await supabase.auth.getSession();
          if (error) {
            console.warn('[AuthContext] Supabase getSession warning:', error.message);
          }
          if (session?.user && mounted) {
            const profile = await mapSupabaseUserToProfile(session.user);
            if (mounted) {
              setUser(profile);
              setLoading(false);
            }
            syncProfileToSupabase(profile).catch(() => {});
            return;
          }
        } catch (err) {
          console.warn('[AuthContext] Failed to get initial Supabase session:', err);
        }
      }

      // 3. If no active Supabase session, check local storage for an existing guest session
      const saved = localStorage.getItem('squadnav_user');
      if (saved && mounted) {
        try {
          const parsed: UserProfile = JSON.parse(saved);
          if (parsed && parsed.id) {
            // If parsed user was a guest, restore guest session
            if (parsed.isGuest) {
              setUser(parsed);
              setLoading(false);
              return;
            }
            // If it was marked registered but Supabase has no session (expired/unconfigured)
            // If Supabase is unconfigured, keep offline mock session; otherwise require login
            if (!isSupabaseConfigured()) {
              setUser(parsed);
              setLoading(false);
              return;
            }
          }
        } catch {
          localStorage.removeItem('squadnav_user');
        }
      }

      // 4. No session exists: set user to null so Authentication Screen is presented
      if (mounted) {
        setUser(null);
        setLoading(false);
      }
    };

    initializeAuth();

    // Subscribe to auth state transitions
    let authListener: { subscription: { unsubscribe: () => void } } | null = null;

    if (isSupabaseConfigured() && supabase) {
      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!mounted) return;

        if (event === 'PASSWORD_RECOVERY') {
          setIsRecoveryMode(true);
        }

        if (session?.user) {
          if (
            event === 'SIGNED_IN' ||
            event === 'TOKEN_REFRESHED' ||
            event === 'USER_UPDATED' ||
            event === 'INITIAL_SESSION'
          ) {
            const profile = await mapSupabaseUserToProfile(session.user);
            if (mounted) {
              setUser(profile);
              setLoading(false);
            }
            syncProfileToSupabase(profile).catch(() => {});
          }
        } else if (event === 'SIGNED_OUT') {
          if (mounted) {
            // Keep guest session if it's explicitly guest, else clear
            const saved = localStorage.getItem('squadnav_user');
            let wasGuest = false;
            if (saved) {
              try {
                wasGuest = JSON.parse(saved).isGuest;
              } catch {}
            }
            if (!wasGuest) {
              localStorage.removeItem('squadnav_user');
              setUser(null);
            }
            setLoading(false);
          }
        }
      });
      authListener = data;
    }

    return () => {
      mounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  // 1. Continue as Guest
  const continueAsGuest = async (customName?: string): Promise<UserProfile> => {
    setAuthError(null);
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase.auth.signInAnonymously();
        if (!error && data?.user) {
          const profile = createGuestProfile(customName, data.user.id);
          return profile;
        }
      } catch (err) {
        console.warn('[AuthContext] Supabase anonymous sign-in fallback to local:', err);
      }
    }
    return createGuestProfile(customName);
  };

  // 2. Login with Email & Password
  const login = async (email: string, pass: string): Promise<void> => {
    setAuthError(null);
    const cleanEmail = email.trim();
    if (!cleanEmail || !pass) {
      throw new Error('Please enter both email and password.');
    }

    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: pass
      });

      if (error) {
        const friendlyMessage = formatAuthErrorMessage(error);
        setAuthError(friendlyMessage);
        throw new Error(friendlyMessage);
      }

      if (data.user) {
        const profile = await mapSupabaseUserToProfile(data.user);
        setUser(profile);
        syncProfileToSupabase(profile).catch(() => {});
      }
    } else {
      // Offline fallback: create local authenticated session
      const id = `usr_${Math.random().toString(36).substring(2, 9)}`;
      const profile: UserProfile = {
        id,
        name: cleanEmail.split('@')[0],
        email: cleanEmail,
        avatar: getAvatarUrl(id),
        color: '#00F0FF',
        isGuest: false,
        createdAt: Date.now()
      };
      localStorage.setItem('squadnav_user', JSON.stringify(profile));
      setUser(profile);
    }
  };

  // 3. Sign Up with Email & Password
  const signUp = async (
    email: string,
    pass: string,
    name?: string
  ): Promise<{ requiresVerification?: boolean }> => {
    setAuthError(null);
    const cleanEmail = email.trim();
    const cleanName = name?.trim() || cleanEmail.split('@')[0];

    if (!cleanEmail || !pass) {
      throw new Error('Email and password are required.');
    }

    if (isSupabaseConfigured() && supabase) {
      // Use window.location.origin as email redirect URL
      const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}/` : undefined;

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: pass,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            name: cleanName
          }
        }
      });

      if (error) {
        const friendlyMessage = formatAuthErrorMessage(error);
        setAuthError(friendlyMessage);
        throw new Error(friendlyMessage);
      }

      // If user session returned immediately (email confirmation disabled or auto-confirmed)
      if (data.session && data.user) {
        const profile: UserProfile = {
          id: data.user.id,
          name: cleanName,
          email: cleanEmail,
          avatar: getAvatarUrl(data.user.id),
          color: getColorForId(data.user.id),
          isGuest: false,
          createdAt: Date.now()
        };
        setUser(profile);
        localStorage.setItem('squadnav_user', JSON.stringify(profile));
        syncProfileToSupabase(profile).catch(() => {});
        return { requiresVerification: false };
      }

      // Email confirmation is required by Supabase project
      return { requiresVerification: true };
    } else {
      // Offline development fallback
      const id = `usr_${Math.random().toString(36).substring(2, 9)}`;
      const profile: UserProfile = {
        id,
        name: cleanName,
        email: cleanEmail,
        avatar: getAvatarUrl(id),
        color: '#8B5CF6',
        isGuest: false,
        createdAt: Date.now()
      };
      localStorage.setItem('squadnav_user', JSON.stringify(profile));
      setUser(profile);
      return { requiresVerification: false };
    }
  };

  // 4. Request Password Reset (Send recovery email)
  const requestPasswordReset = async (email: string): Promise<void> => {
    setAuthError(null);
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      throw new Error('Please enter your email address.');
    }

    if (isSupabaseConfigured() && supabase) {
      const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}/#reset-password` : undefined;
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: redirectUrl
      });

      if (error) {
        const friendlyMessage = formatAuthErrorMessage(error);
        setAuthError(friendlyMessage);
        throw new Error(friendlyMessage);
      }
    } else {
      // Offline fallback: pretend sent
      console.info('[AuthContext] Mock recovery code sent for:', cleanEmail);
    }
  };

  // 5. Verify Recovery Code (OTP)
  const verifyRecoveryCode = async (email: string, token: string): Promise<void> => {
    setAuthError(null);
    const cleanEmail = email.trim();
    const cleanToken = token.trim();

    if (!cleanEmail || !cleanToken) {
      throw new Error('Email and verification code are required.');
    }

    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanToken,
        type: 'recovery'
      });

      if (error) {
        const friendlyMessage = formatAuthErrorMessage(error);
        setAuthError(friendlyMessage);
        throw new Error(friendlyMessage);
      }

      if (data.session) {
        setIsRecoveryMode(true);
      }
    } else {
      // Offline fallback: accept any 6-digit code or '123456'
      if (cleanToken.length >= 6) {
        setIsRecoveryMode(true);
      } else {
        throw new Error('Invalid verification code.');
      }
    }
  };

  // 6. Update Password (Create New Password)
  const updatePassword = async (newPassword: string): Promise<void> => {
    setAuthError(null);
    if (!newPassword || newPassword.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }

    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        const friendlyMessage = formatAuthErrorMessage(error);
        setAuthError(friendlyMessage);
        throw new Error(friendlyMessage);
      }

      setIsRecoveryMode(false);
    } else {
      // Offline fallback
      setIsRecoveryMode(false);
    }
  };

  // 7. Upgrade Guest Account to Registered Account (with data migration)
  const upgradeGuestAccount = async (
    email: string,
    pass: string,
    name?: string
  ): Promise<{ requiresVerification?: boolean }> => {
    setAuthError(null);
    const currentGuestId = user?.id;
    const currentGuestName = name?.trim() || user?.name || email.split('@')[0];
    const currentGuestAvatar = user?.avatar || getAvatarUrl(currentGuestName);
    const currentGuestColor = user?.color || getColorForId(currentGuestName);

    // Call standard sign up
    const result = await signUp(email, pass, currentGuestName);

    // If immediate session was created, perform data migration from guest ID to registered ID
    if (!result.requiresVerification && user) {
      const newUserId = user.id;

      // Migrate existing squad membership or host ownership in Supabase if configured
      if (isSupabaseConfigured() && supabase && currentGuestId && currentGuestId !== newUserId) {
        try {
          // Update squads hosted by the guest
          await supabase
            .from('squads')
            .update({ host_id: newUserId, host_name: currentGuestName })
            .eq('host_id', currentGuestId);

          // Update squad_members joined by the guest
          await supabase
            .from('squad_members')
            .update({ user_id: newUserId, name: currentGuestName })
            .eq('user_id', currentGuestId);

          // Ensure profile reflects non-guest status
          await supabase.from('profiles').upsert({
            id: newUserId,
            name: currentGuestName,
            email,
            avatar: currentGuestAvatar,
            color: currentGuestColor,
            is_guest: false,
            updated_at: new Date().toISOString()
          }, { onConflict: 'id' });
        } catch (migErr) {
          console.warn('[AuthContext] Guest data migration warning:', migErr);
        }
      }
    }

    return result;
  };

  // 8. Logout
  const logout = async (): Promise<void> => {
    setAuthError(null);
    setIsRecoveryMode(false);

    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('[AuthContext] Supabase signOut warning:', err);
      }
    }

    localStorage.removeItem('squadnav_user');
    setUser(null);
  };

  // 9. Update Profile Name
  const updateProfileName = (name: string): void => {
    if (user) {
      const updated: UserProfile = { ...user, name };
      setUser(updated);
      localStorage.setItem('squadnav_user', JSON.stringify(updated));

      if (isSupabaseConfigured() && supabase) {
        (async () => {
          if (!supabase) return;
          try {
            const { error } = await supabase
              .from('profiles')
              .update({ name, updated_at: new Date().toISOString() })
              .eq('id', user.id);
            if (error) {
              await syncProfileToSupabase(updated);
            }
          } catch {
            await syncProfileToSupabase(updated);
          }
        })();
      }
    }
  };

  // 10. Google OAuth
  const loginWithGoogle = async (): Promise<void> => {
    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) {
        const friendly = formatAuthErrorMessage(error);
        setAuthError(friendly);
        throw new Error(friendly);
      }
    } else {
      const id = `goog_${Math.random().toString(36).substring(2, 9)}`;
      const profile: UserProfile = {
        id,
        name: 'Squad Explorer',
        email: 'explorer@squadmaps.app',
        avatar: getAvatarUrl(id),
        color: '#00F0FF',
        isGuest: false,
        createdAt: Date.now()
      };
      localStorage.setItem('squadnav_user', JSON.stringify(profile));
      setUser(profile);
    }
  };

  const isAuthenticated = Boolean(user && !user.isGuest);
  const isGuest = Boolean(user && user.isGuest);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated,
        isGuest,
        authError,
        isRecoveryMode,
        clearAuthError,
        setIsRecoveryMode,

        login,
        signUp,
        continueAsGuest,
        logout,

        requestPasswordReset,
        verifyRecoveryCode,
        updatePassword,
        upgradeGuestAccount,

        updateProfileName,

        // Backwards compatibility
        loginWithEmail: login,
        registerWithEmail: async (email: string, pass: string, name: string) => {
          await signUp(email, pass, name);
        },
        loginAsGuest: continueAsGuest,
        loginWithGoogle
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
