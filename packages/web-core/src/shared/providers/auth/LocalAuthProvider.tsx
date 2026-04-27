import { useMemo, type ReactNode } from 'react';
import {
  AuthContext,
  type AuthContextValue,
} from '@/shared/hooks/auth/useAuth';

interface LocalAuthProviderProps {
  children: ReactNode;
}

// Local VK: no BloopAI cloud auth required. Always treat as signed-in.
export function LocalAuthProvider({ children }: LocalAuthProviderProps) {
  const value = useMemo<AuthContextValue>(
    () => ({
      isSignedIn: true,
      isLoaded: true,
      userId: 'local-user',
    }),
    []
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
