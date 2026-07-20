import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import WebApp from '@twa-dev/sdk';

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
}

interface TelegramContextType {
  webApp: typeof WebApp;
  user: TelegramUser | null;
  isReady: boolean;
  initData: string;
  initDataUnsafe: any;
}

const TelegramContext = createContext<TelegramContextType | null>(null);

export function TelegramProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [user, setUser] = useState<TelegramUser | null>(null);

  useEffect(() => {
    console.log('[TelegramContext] Initializing...');

    // Initialize Telegram WebApp
    WebApp.ready();
    setIsReady(true);

    // Expand to full height
    WebApp.expand();

    // Set theme
    WebApp.setHeaderColor('bg_color');
    WebApp.setBackgroundColor('#0f0f0f');

    // Get user data
    const telegramUser = WebApp.initDataUnsafe?.user;
    console.log('[TelegramContext] Telegram user data:', telegramUser);

    if (telegramUser) {
      console.log('[TelegramContext] Using Telegram user');
      setUser(telegramUser);
    } else if (import.meta.env.DEV) {
      // Mock user ONLY in development mode
      console.warn('[TelegramContext] DEV MODE: using mock user');
      const mockUser = {
        id: 123456789,
        first_name: 'Dev',
        last_name: 'User',
        username: 'devuser',
        language_code: 'uk',
      };
      setUser(mockUser);
    } else {
      console.error('[TelegramContext] No Telegram user data in production!');
    }

    // Enable closing confirmation
    WebApp.enableClosingConfirmation();

    return () => {
      WebApp.disableClosingConfirmation();
    };
  }, []);

  const value: TelegramContextType = {
    webApp: WebApp,
    user,
    isReady,
    initData: WebApp.initData,
    initDataUnsafe: WebApp.initDataUnsafe,
  };

  return (
    <TelegramContext.Provider value={value}>
      {children}
    </TelegramContext.Provider>
  );
}

export function useTelegram() {
  const context = useContext(TelegramContext);
  if (!context) {
    throw new Error('useTelegram must be used within TelegramProvider');
  }
  return context;
}

// Hook for showing main button
export function useMainButton(
  text: string,
  onClick: () => void,
  options?: {
    disabled?: boolean;
    loading?: boolean;
    color?: string;
    textColor?: string;
  }
) {
  const { webApp } = useTelegram();

  useEffect(() => {
    const button = webApp.MainButton;

    button.setText(text);
    button.onClick(onClick);

    if (options?.disabled) {
      button.disable();
    } else {
      button.enable();
    }

    if (options?.loading) {
      button.showProgress();
    } else {
      button.hideProgress();
    }

    if (options?.color) {
      button.setParams({ color: options.color });
    }

    if (options?.textColor) {
      button.setParams({ text_color: options.textColor });
    }

    button.show();

    return () => {
      button.offClick(onClick);
      button.hide();
    };
  }, [webApp, text, onClick, options?.disabled, options?.loading, options?.color, options?.textColor]);
}

// Hook for showing back button
export function useBackButton(onClick: () => void) {
  const { webApp } = useTelegram();

  useEffect(() => {
    const button = webApp.BackButton;

    button.onClick(onClick);
    button.show();

    return () => {
      button.offClick(onClick);
      button.hide();
    };
  }, [webApp, onClick]);
}

// Hook for haptic feedback
export function useHaptic() {
  const { webApp } = useTelegram();

  return {
    impact: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' = 'medium') => {
      webApp.HapticFeedback.impactOccurred(style);
    },
    notification: (type: 'error' | 'success' | 'warning') => {
      webApp.HapticFeedback.notificationOccurred(type);
    },
    selection: () => {
      webApp.HapticFeedback.selectionChanged();
    },
  };
}
