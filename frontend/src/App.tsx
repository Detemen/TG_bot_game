import { useState } from "react";
import styles from "./App.module.css";
import { LobbyPage } from "./pages/LobbyPage";
import { GameRoomPage } from "./pages/GameRoomPage";
import { useUser } from "./contexts/UserContext";
import { useTelegram } from "./contexts/TelegramContext";

type View = 'lobby' | 'game';

function App() {
  const { user, isLoading, error } = useUser();
  const { user: telegramUser, isReady } = useTelegram();
  const [currentView, setCurrentView] = useState<View>('lobby');
  const [currentGameId, setCurrentGameId] = useState<string | null>(null);

  console.log('[App] Render state:', {
    isLoading,
    hasUser: !!user,
    user,
    telegramUser,
    isReady,
    error,
    devMode: import.meta.env.VITE_DEV_MODE,
    apiUrl: import.meta.env.VITE_API_URL
  });

  const handleJoinGame = (gameId: string) => {
    setCurrentGameId(gameId);
    setCurrentView('game');
  };

  const handleBackToLobby = () => {
    setCurrentView('lobby');
    setCurrentGameId(null);
  };

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Завантаження...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={styles.error}>
        <h2>Помилка авторизації</h2>
        <p>Не вдалося завантажити дані користувача</p>
        <p className={styles.hint}>
          Переконайтесь, що ви відкрили застосунок через Telegram
        </p>
        <details style={{ marginTop: '20px', padding: '10px', background: '#1a1a1a', borderRadius: '8px', textAlign: 'left' }}>
          <summary style={{ cursor: 'pointer', fontWeight: 'bold', marginBottom: '10px' }}>Відлагоджувальна інформація</summary>
          <pre style={{ fontSize: '11px', overflow: 'auto', maxHeight: '300px' }}>
            {JSON.stringify({
              isLoading,
              hasUser: !!user,
              user,
              telegramUser,
              telegramReady: isReady,
              error,
              devMode: import.meta.env.VITE_DEV_MODE,
              apiUrl: import.meta.env.VITE_API_URL,
              apiBaseUrl: import.meta.env.VITE_API_BASE_URL
            }, null, 2)}
          </pre>
        </details>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      {currentView === 'lobby' && <LobbyPage onJoinGame={handleJoinGame} />}
      {currentView === 'game' && currentGameId && (
        <GameRoomPage gameId={currentGameId} onBack={handleBackToLobby} />
      )}
    </div>
  );
}

export default App;
