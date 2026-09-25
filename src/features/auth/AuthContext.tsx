import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '../../types/user';
import { supabase, isSupabaseConfigured } from '../../services/supabase/supabaseClient';
import type { User as SupabaseUser } from '@supabase/supabase-js';

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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

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
        created_at: profile.createdAt,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
    } catch (err) {
      console.warn('Failed to sync profile to Supabase:', err);
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
      console.warn('Failed to fetch profile from Supabase:', err);
    }
    return null;
  };

  // Convert a Supabase user into our domain UserProfile interface
  const mapSupabaseUserToProfile = async (sbUser: SupabaseUser): Promise<UserProfile> => {
    // Check if we already have a cached profile for this user ID in localStorage
    const savedRaw = localStorage.getItem('squadnav_user');
    let cached: UserProfile | null = null;
    if (savedRaw) {
      try {
        const parsed = JSON.parse(savedRaw);
        if (parsed.id === sbUser.id) cached = parsed;
      } catch {}
    }

    // Check remote profile table for stored custom name/color/avatar
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

  const createGuestUser = (customName?: string): UserProfile => {
    const randomName = customName || GUEST_NAMES[Math.floor(Math.random() * GUEST_NAMES.length)];
    const id = `guest_${Math.random().toString(36).substring(2, 9)}`;
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

  const checkLocalUser = () => {
    const saved = localStorage.getItem('squadnav_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setUser(parsed);
      } catch {
        createGuestUser();
      }
    } else {
      createGuestUser();
    }
  };

  // Initialize auth state and subscribe to Supabase Auth changes
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      if (isSupabaseConfigured() && supabase) {
        try {
          const { data: { session }, error } = await supabase.auth.getSession();
          if (error) {
            console.warn('Supabase getSession error:', error);
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
          console.warn('Failed to get initial Supabase session:', err);
        }
      }

      if (mounted) {
        checkLocalUser();
        setLoading(false);
      }
    };

    initializeAuth();

    // Subscribe to auth state transitions
    let authListener: { subscription: { unsubscribe: () => void } } | null = null;

    if (isSupabaseConfigured() && supabase) {
      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!mounted) return;

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
            localStorage.removeItem('squadnav_user');
            createGuestUser();
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

  // 1. Guest Login (Supabase Anonymous Sign-In with local fallback)
  const loginAsGuest = async (customName?: string): Promise<UserProfile> => {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase.auth.signInAnonymously();
        if (error) {
          console.warn('Supabase anonymous sign-in error, falling back to local guest:', error.message);
        } else if (data.user) {
          const name = customName || GUEST_NAMES[Math.floor(Math.random() * GUEST_NAMES.length)];
          const profile: UserProfile = {
            id: data.user.id,
            name,
            avatar: getAvatarUrl(data.user.id),
            color: getColorForId(data.user.id),
            isGuest: true,
            createdAt: Date.now()
          };
          setUser(profile);
          localStorage.setItem('squadnav_user', JSON.stringify(profile));
          syncProfileToSupabase(profile).catch(() => {});
          return profile;
        }
      } catch (err) {
        console.warn('Supabase anonymous sign-in failed, using local guest:', err);
      }
    }
    return createGuestUser(customName);
  };

  // 2. Google OAuth Login
  const loginWithGoogle = async (): Promise<void> => {
    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) {
        console.error('Google OAuth sign-in error:', error.message);
        throw error;
      }
    } else {
      // Mock Google Login for offline development
      const id = `goog_${Math.random().toString(36).substring(2, 9)}`;
      const profile: UserProfile = {
        id,
        name: 'Alex Rivera',
        email: 'alex.rivera@example.com',
        avatar: getAvatarUrl(id),
        color: '#00F0FF',
        isGuest: false,
        createdAt: Date.now()
      };
      localStorage.setItem('squadnav_user', JSON.stringify(profile));
      setUser(profile);
      syncProfileToSupabase(profile).catch(() => {});
    }
  };

  // 3. Email & Password Login
  const loginWithEmail = async (email: string, pass: string): Promise<void> => {
    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: pass
      });
      if (error) {
        throw error;
      }
      if (data.user) {
        const profile = await mapSupabaseUserToProfile(data.user);
        setUser(profile);
        syncProfileToSupabase(profile).catch(() => {});
      }
    } else {
      const id = `usr_${Math.random().toString(36).substring(2, 9)}`;
      const profile: UserProfile = {
        id,
        name: email.split('@')[0],
        email,
        avatar: getAvatarUrl(id),
        color: '#00E676',
        isGuest: false,
        createdAt: Date.now()
      };
      localStorage.setItem('squadnav_user', JSON.stringify(profile));
      setUser(profile);
      syncProfileToSupabase(profile).catch(() => {});
    }
  };

  // 4. Email & Password Registration
  const registerWithEmail = async (email: string, pass: string, name: string): Promise<void> => {
    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: pass,
        options: {
          data: {
            name: name.trim() || undefined
          }
        }
      });
      if (error) {
        throw error;
      }

      // If user session returned immediately (or auto-confirmed)
      if (data.user) {
        const profile: UserProfile = {
          id: data.user.id,
          name: name.trim() || email.split('@')[0],
          email,
          avatar: getAvatarUrl(data.user.id),
          color: getColorForId(data.user.id),
          isGuest: false,
          createdAt: Date.now()
        };
        setUser(profile);
        localStorage.setItem('squadnav_user', JSON.stringify(profile));
        syncProfileToSupabase(profile).catch(() => {});
      }
    } else {
      const id = `usr_${Math.random().toString(36).substring(2, 9)}`;
      const profile: UserProfile = {
        id,
        name,
        email,
        avatar: getAvatarUrl(id),
        color: '#8B5CF6',
        isGuest: false,
        createdAt: Date.now()
      };
      localStorage.setItem('squadnav_user', JSON.stringify(profile));
      setUser(profile);
      syncProfileToSupabase(profile).catch(() => {});
    }
  };

  // 5. Logout
  const logout = async (): Promise<void> => {
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('Supabase signOut error:', err);
      }
    }
    localStorage.removeItem('squadnav_user');
    createGuestUser();
  };

  // 6. Update Profile Name
  const updateProfileName = (name: string): void => {
    if (user) {
      const updated: UserProfile = { ...user, name };
      setUser(updated);
      localStorage.setItem('squadnav_user', JSON.stringify(updated));

      // Asynchronously update public.profiles table in Supabase
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
