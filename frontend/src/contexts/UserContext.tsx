import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { apiClient, User } from '../services/api-client';
import { useTelegram } from './TelegramContext';

interface UserContextType {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  refetchUser: () => Promise<void>;
  updateBalance: (ton?: string, stars?: number) => void;
}

const UserContext = createContext<UserContextType | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const { user: telegramUser, isReady } = useTelegram();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrCreateUser = useCallback(async () => {
    if (!telegramUser) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Try to register/get user
      const userData = await apiClient.registerUser({
        telegramId: telegramUser.id.toString(),
        username: telegramUser.username,
        firstName: telegramUser.first_name,
        lastName: telegramUser.last_name,
      });

      setUser(userData);
    } catch (err: any) {
      console.error('Failed to fetch user:', err);
      setError(err.message || 'Failed to load user');
    } finally {
      setIsLoading(false);
    }
  }, [telegramUser]);

  useEffect(() => {
    if (isReady) {
      void fetchOrCreateUser();
    }
  }, [isReady, fetchOrCreateUser]);

  const refetchUser = useCallback(async () => {
    if (!user) return;

    try {
      const updatedUser = await apiClient.getUser(user.id);
      setUser(updatedUser);
    } catch (err: any) {
      console.error('Failed to refetch user:', err);
      setError(err.message);
    }
  }, [user]);

  const updateBalance = useCallback((ton?: string, stars?: number) => {
    if (!user) return;

    setUser((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        balanceTon: ton ?? prev.balanceTon,
        balanceStars: stars ?? prev.balanceStars,
      };
    });
  }, [user]);

  const value: UserContextType = {
    user,
    isLoading,
    error,
    refetchUser,
    updateBalance,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within UserProvider');
  }
  return context;
}
