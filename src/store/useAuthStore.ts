import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi, setToken, type PublicUser } from '../api/client';

interface AuthState {
  user: PublicUser | null;
  isLoading: boolean;
  providers: { google: boolean; github: boolean; email: boolean } | null;
  setUser: (user: PublicUser | null) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
  fetchProviders: () => Promise<void>;
  handleOAuthToken: (token: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoading: false,
      providers: null,

      setUser: (user) => set({ user }),

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const { token, user } = await authApi.login({ email, password });
          setToken(token);
          set({ user });
        } finally {
          set({ isLoading: false });
        }
      },

      register: async (email, password, displayName) => {
        set({ isLoading: true });
        try {
          const { token, user } = await authApi.register({ email, password, displayName });
          setToken(token);
          set({ user });
        } finally {
          set({ isLoading: false });
        }
      },

      logout: async () => {
        try {
          await authApi.logout();
        } catch {
          /* offline */
        }
        setToken(null);
        set({ user: null });
      },

      fetchMe: async () => {
        const token = localStorage.getItem('fitpulse_token');
        if (!token) {
          set({ user: null });
          return;
        }
        set({ isLoading: true });
        try {
          const { user } = await authApi.me();
          set({ user });
        } catch {
          setToken(null);
          set({ user: null });
        } finally {
          set({ isLoading: false });
        }
      },

      fetchProviders: async () => {
        try {
          const providers = await authApi.providers();
          set({ providers });
        } catch {
          set({ providers: { google: false, github: false, email: true } });
        }
      },

      handleOAuthToken: async (token) => {
        setToken(token);
        set({ isLoading: true });
        try {
          const { user } = await authApi.me();
          set({ user });
        } finally {
          set({ isLoading: false });
        }
      },
    }),
    {
      name: 'fitpulse-auth',
      partialize: (s) => ({ user: s.user }),
    }
  )
);
