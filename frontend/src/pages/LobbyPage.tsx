import { useEffect, useState } from 'react';
import { apiClient, Game } from '../services/api-client';
import { useUser } from '../contexts/UserContext';
import { useHaptic } from '../contexts/TelegramContext';
import styles from './LobbyPage.module.css';

interface LobbyPageProps {
  onJoinGame?: (gameId: string) => void;
}

export function LobbyPage({ onJoinGame }: LobbyPageProps) {
  const { user, refetchUser } = useUser();
  const haptic = useHaptic();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [ballCount, setBallCount] = useState(1);
  const [currency, setCurrency] = useState<'TON' | 'STARS'>('TON');
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    fetchGames();
    const interval = setInterval(fetchGames, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchGames = async () => {
    try {
      const { games: activeGames } = await apiClient.getActiveGames();
      setGames(activeGames);
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch games:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGame = async () => {
    if (!user) return;

    try {
      haptic.impact('light');
      setLoading(true);
      await apiClient.createGame();
      await fetchGames();
      haptic.notification('success');
    } catch (err: any) {
      console.error('Failed to create game:', err);
      setError(err.message);
      haptic.notification('error');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectGame = (gameId: string) => {
    haptic.selection();
    setSelectedGame(gameId === selectedGame ? null : gameId);
  };

  const handleJoinGame = async () => {
    if (!user || !selectedGame) return;

    const game = games.find((g) => g.id === selectedGame);
    if (!game) return;

    const totalCost =
      currency === 'TON'
        ? parseFloat(game.ballPriceTon) * ballCount
        : game.ballPriceStars * ballCount;

    const userBalance =
      currency === 'TON' ? parseFloat(user.balanceTon) : user.balanceStars;

    if (totalCost > userBalance) {
      setError(`Insufficient balance. Need ${totalCost} ${currency}`);
      haptic.notification('error');
      return;
    }

    try {
      setJoining(true);
      haptic.impact('medium');

      await apiClient.joinGame(selectedGame, {
        userId: user.id,
        ballCount,
        currency,
      });

      await refetchUser();
      await fetchGames();

      haptic.notification('success');

      // Navigate to game room
      if (onJoinGame) {
        onJoinGame(selectedGame);
      }

      setSelectedGame(null);
      setBallCount(1);
    } catch (err: any) {
      console.error('Failed to join game:', err);
      setError(err.message);
      haptic.notification('error');
    } finally {
      setJoining(false);
    }
  };

  const getGameStatus = (game: Game): string => {
    switch (game.status) {
      case 'WAITING':
        return 'Очікування гравців';
      case 'STARTING':
        return 'Скоро старт!';
      case 'RUNNING':
        return 'Йде гра';
      default:
        return game.status;
    }
  };

  if (loading && games.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Завантаження...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Marble Race Lobby</h1>
        {user && (
          <div className={styles.balance}>
            <div className={styles.balanceItem}>
              <span className={styles.balanceLabel}>TON</span>
              <span className={styles.balanceValue}>{user.balanceTon}</span>
            </div>
            <div className={styles.balanceItem}>
              <span className={styles.balanceLabel}>Stars</span>
              <span className={styles.balanceValue}>{user.balanceStars}</span>
            </div>
          </div>
        )}
      </header>

      {error && (
        <div className={styles.error}>
          {error}
          <button onClick={() => setError(null)} className={styles.closeError}>
            ✕
          </button>
        </div>
      )}

      <div className={styles.actions}>
        <button
          onClick={handleCreateGame}
          disabled={loading || !user}
          className={styles.createButton}
        >
          + Створити нову гру
        </button>
      </div>

      <div className={styles.gamesList}>
        <h2>Активні ігри ({games.length})</h2>

        {games.length === 0 ? (
          <div className={styles.empty}>
            <p>Немає активних ігор</p>
            <p className={styles.emptyHint}>Створіть нову гру, щоб почати!</p>
          </div>
        ) : (
          games.map((game) => (
            <div
              key={game.id}
              className={`${styles.gameCard} ${selectedGame === game.id ? styles.selected : ''}`}
              onClick={() => handleSelectGame(game.id)}
            >
              <div className={styles.gameHeader}>
                <span className={styles.gameStatus}>{getGameStatus(game)}</span>
                <span className={styles.gameDifficulty}>{game.difficulty}</span>
              </div>

              <div className={styles.gameStats}>
                <div className={styles.stat}>
                  <span className={styles.statLabel}>Pot</span>
                  <span className={styles.statValue}>
                    {game.potTon} TON / {game.potStars} ⭐
                  </span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statLabel}>Ціна кульки</span>
                  <span className={styles.statValue}>
                    {game.ballPriceTon} TON / {game.ballPriceStars} ⭐
                  </span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statLabel}>Слоти</span>
                  <span className={styles.statValue}>
                    {game.stats?.totalBalls || 0} / {game.maxPlayers}
                  </span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statLabel}>Гравці</span>
                  <span className={styles.statValue}>{game.stats?.totalPlayers || 0}</span>
                </div>
              </div>

              {selectedGame === game.id && (
                <div className={styles.joinPanel}>
                  <div className={styles.inputGroup}>
                    <label>Кількість кульок</label>
                    <div className={styles.ballCounter}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setBallCount(Math.max(1, ballCount - 1));
                          haptic.selection();
                        }}
                        disabled={ballCount <= 1}
                      >
                        −
                      </button>
                      <input
                        type="number"
                        value={ballCount}
                        onChange={(e) => {
                          e.stopPropagation();
                          setBallCount(
                            Math.min(game.maxBallsPerPlayer, Math.max(1, parseInt(e.target.value) || 1))
                          );
                        }}
                        min="1"
                        max={game.maxBallsPerPlayer}
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setBallCount(Math.min(game.maxBallsPerPlayer, ballCount + 1));
                          haptic.selection();
                        }}
                        disabled={ballCount >= game.maxBallsPerPlayer}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className={styles.inputGroup}>
                    <label>Валюта</label>
                    <div className={styles.currencySelector}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrency('TON');
                          haptic.selection();
                        }}
                        className={currency === 'TON' ? styles.active : ''}
                      >
                        TON
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrency('STARS');
                          haptic.selection();
                        }}
                        className={currency === 'STARS' ? styles.active : ''}
                      >
                        Stars ⭐
                      </button>
                    </div>
                  </div>

                  <div className={styles.costSummary}>
                    <span>Всього:</span>
                    <span className={styles.costValue}>
                      {currency === 'TON'
                        ? `${(parseFloat(game.ballPriceTon) * ballCount).toFixed(2)} TON`
                        : `${game.ballPriceStars * ballCount} ⭐`}
                    </span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleJoinGame();
                    }}
                    disabled={joining || !user}
                    className={styles.joinButton}
                  >
                    {joining ? 'Приєднання...' : 'Приєднатись до гри'}
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
