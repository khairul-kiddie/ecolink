'use client';
import axios from 'axios';
import { create } from 'zustand';
import api from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

interface User {
  id: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: true,

  setUser: (user) => set({ user }),
  setTokens: (accessToken, refreshToken) => {
    sessionStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    set({ accessToken, isAuthenticated: true });
  },

  login: async ({ email, password }) => {
    const res = await api.post('/auth/login', { email, password });
    const { accessToken, refreshToken, user } = res.data.data;
    get().setTokens(accessToken, refreshToken);
    set({ user, isAuthenticated: true });
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      sessionStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      set({ user: null, accessToken: null, isAuthenticated: false });
    }
  },

  initialize: async () => {
    const token = sessionStorage.getItem('accessToken');
    const storedRefresh = localStorage.getItem('refreshToken');

    if (!token && !storedRefresh) {
      set({ isLoading: false });
      return;
    }

    try {
      // Access token gone (tab closed / browser restarted) but refresh token still valid.
      // Exchange it silently before calling /auth/me so the user stays logged in.
      if (!token && storedRefresh) {
        const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken: storedRefresh });
        const { accessToken: newAccess, refreshToken: newRefresh } = data.data;
        sessionStorage.setItem('accessToken', newAccess);
        localStorage.setItem('refreshToken', newRefresh);
      }

      const res = await api.get('/auth/me');
      const currentToken = sessionStorage.getItem('accessToken')!;
      set({ user: res.data.data, accessToken: currentToken, isAuthenticated: true, isLoading: false });
    } catch {
      sessionStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      set({ isLoading: false });
    }
  },
}));
