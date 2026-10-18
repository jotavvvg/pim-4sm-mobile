import { createContext } from 'react';

import type { UserRole } from '@/types/entities';

export type AuthContextValue = {
  role: UserRole | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  bootstrap: (username: string, password: string) => Promise<void>;
  logout: () => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);