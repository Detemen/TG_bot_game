import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { apiClient, Game as GameType } from '../services/api-client';
import { useUser } from '../contexts/UserContext';
import { useHaptic } from '../contexts/TelegramContext';
import { MatterCanvas } from '../components/MatterCanvas';
import type { FinishEntry } from '../physics/obstacles';
import styles from './GameRoomPage.module.css';

interface GameRoomPageProps {
  gameId: string;
  onBack: () => void;
}

export function GameRoomPage({ gameId, onBack }: GameRoomPageProps) {
  const { user, refetchUser } = useUser();
  const haptic = useHaptic();
  const [game, setGame] = useState<GameType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<FinishEntry[]>([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const finishSentRef = useRef(false);

  useEffect(() => {
    let isStarted = false;

    const fetchGame = async () => {
      try {
        const gameData = await apiClient.getGame(gameId);
        setGame(gameData);
        setError(null);

        if (gameData.status === 'RUNNING' && !isStarted) {
          isStarted = true;
          setGameStarted(true);
          haptic.notification('success');
        }

        if (gameData.status === 'STARTING' && gameData.startTime) {
          const startTime = new Date(gameData.startTime).getTime();
          const diff = Math.max(0, Math.ceil((startTime - Date.now()) / 1000));
          setCountdown(diff);
        } else {
          setCountdown(null);
        }
      } catch (err: any) {
        console.error('Failed to fetch game:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    void fetchGame();
    const interval = setInterval(() => void fetchGame(), 2000);
    return () => clearInterval(interval);
  }, [gameId, haptic]);

  // Stable ref to game for use inside callbacks
  const gameRef = useRef(game);
  gameRef.current = game;

  const handleFinish = useCallback(async (ballIndex: number, time: number) => {
    const g = gameRef.current;
    if (!g || g.status !== 'RUNNING' || finishSentRef.current) return;
    finishSentRef.current = true;

    // Sort bets by ID for stable ball-to-user mapping (same order as ballMetadata)
    const sortedBets = [...(g.bets || [])].sort((a, b) => a.id.localeCompare(b.id));

    // Map ballIndex to user
    let currentIndex = 0;
    for (const bet of sortedBets) {
      for (let i = 0; i < bet.ballCount; i++) {
        if (currentIndex === ballIndex) {
          try {
            haptic.impact('heavy');
            await apiClient.finishGame(gameId, {
              winnerId: bet.userId,
              winnerBallId: ballIndex,
              winningTime: time.toString(),
            });
            await refetchUser();
            const gameData = await apiClient.getGame(gameId);
            setGame(gameData);
            haptic.notification('success');
          } catch (err: any) {
            console.error('Failed to finish game:', err);
            setError(err.message);
            haptic.notification('error');
            finishSentRef.current = false; // allow retry on error
          }
          return;
        }
        currentIndex++;
      }
    }
  }, [gameId, haptic, refetchUser]);

  const handleLeaderboardUpdate = useCallback((entries: FinishEntry[]) => {
    setLeaderboard(entries);
  }, []);

  const getPlayerName = (userId: string): string => {
    const bet = game?.bets?.find((b) => b.userId === userId);
    return bet?.user?.username || bet?.user?.firstName || `Player ${userId.slice(0, 6)}`;
  };

  const getStatusLabel = (): string => {
    if (!game) return 'Завантаження...';
    switch (game.status) {
      case 'WAITING': return 'Очікування гравців...';
      case 'STARTING': return countdown !== null ? `Старт через ${countdown}с` : 'Підготовка...';
      case 'RUNNING': return 'Гра йде!';
      case 'FINISHED': return 'Гра завершена';
      case 'CANCELLED': return 'Гра скасована';
      default: return game.status;
    }
  };

  // Memoize ball metadata to prevent re-creation every render
  const ballMetadata = useMemo(() => {
    if (!game?.bets) return [];

    const balls: Array<{ label: string; color: string }> = [];
    const sortedBets = [...game.bets].sort((a, b) => a.id.localeCompare(b.id));

    sortedBets.forEach((bet) => {
      const playerName = getPlayerName(bet.userId);
      const colors = bet.ballColors as string[];
      for (let i = 0; i < bet.ballCount; i++) {
        balls.push({
          label: `${playerName} #${i + 1}`,
          color: colors[i] || '#ffffff',
        });
      }
    });

    return balls;
  }, [game?.bets]);

  const totalBalls = game?.stats?.totalBalls || 0;

  if (loading && !game) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Завантаження гри...</p>
        </div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h2>Гру не знайдено</h2>
          <button onClick={onBack} className={styles.backButton}>
            ← Назад до лобі
          </button>
        </div>
      </div>
    );
  }

  const isFinished = game.status === 'FINISHED';
  const winner = isFinished && game.winner ? game.winner : null;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button onClick={onBack} className={styles.backButton}>
          ← Назад
        </button>

        <div className={styles.gameInfo}>
          <h1>Marble Race</h1>
          <p className={styles.status}>{getStatusLabel()}</p>
        </div>

        <div className={styles.pot}>
          <span className={styles.potLabel}>Pot</span>
          <span className={styles.potValue}>
            {game.potTon} TON
            {game.potStars > 0 && ` / ${game.potStars} ⭐`}
          </span>
        </div>
      </header>

      {error && (
        <div className={styles.errorBanner}>
          {error}
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      <div className={styles.gameArea}>
        <div className={styles.canvasContainer}>
          {gameStarted && game.trackConfig ? (
            <MatterCanvas
              width={420}
              height={900}
              ballCount={totalBalls}
              ballMetadata={ballMetadata}
              trackLayout={game.trackConfig}
              onFinish={handleFinish}
              onLeaderboardUpdate={handleLeaderboardUpdate}
            />
          ) : (
            <div className={styles.waitingScreen}>
              <h2>{getStatusLabel()}</h2>
              {game.status === 'WAITING' && (
                <p>Очікуємо на більше гравців...</p>
              )}
              {game.status === 'STARTING' && countdown !== null && (
                <div className={styles.countdownCircle}>
                  <span className={styles.countdownNumber}>{countdown}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <aside className={styles.sidebar}>
          <div className={styles.section}>
            <h3>Гравці ({game.stats?.totalPlayers || 0})</h3>
            <div className={styles.playersList}>
              {game.bets?.map((bet) => (
                <div key={bet.userId} className={styles.player}>
                  <div className={styles.playerHeader}>
                    <span className={styles.playerName}>
                      {getPlayerName(bet.userId)}
                      {(bet as any).user?.isBot && <span className={styles.botBadge}>BOT</span>}
                    </span>
                    <span className={styles.playerBalls}>
                      {bet.ballCount} кульок
                    </span>
                  </div>
                  <div className={styles.ballColors}>
                    {(bet.ballColors as string[]).map((color, i) => (
                      <div
                        key={i}
                        className={styles.colorDot}
                        style={{ backgroundColor: color }}
                        title={`Ball #${i + 1}`}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {leaderboard.length > 0 && (
            <div className={styles.section}>
              <h3>Фінішували ({leaderboard.length})</h3>
              <ol className={styles.leaderboard}>
                {leaderboard.map((entry, index) => (
                  <li
                    key={entry.ballIndex}
                    className={`${styles.leaderboardItem} ${index === 0 ? styles.winner : ''}`}
                  >
                    <div
                      className={styles.colorDot}
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className={styles.rank}>#{index + 1}</span>
                    <span className={styles.label}>{entry.label}</span>
                    <span className={styles.time}>{entry.time.toFixed(2)}s</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {isFinished && winner && (
            <div className={styles.winnerBanner}>
              <h2>Переможець!</h2>
              <p className={styles.winnerName}>
                {winner.username || winner.firstName || 'Unknown'}
              </p>
              <p className={styles.winnerPrize}>
                Виграш: {(parseFloat(game.potTon) * 0.9).toFixed(2)} TON
              </p>
            </div>
          )}

          <div className={styles.section}>
            <h3>Деталі гри</h3>
            <dl className={styles.details}>
              <dt>Складність</dt>
              <dd>{game.difficulty}</dd>

              <dt>Кульок</dt>
              <dd>{game.stats?.totalBalls} / {game.maxPlayers}</dd>

              <dt>Seed</dt>
              <dd className={styles.seed}>{game.seed.slice(0, 16)}...</dd>

              {game.winningTime && (
                <>
                  <dt>Час перемоги</dt>
                  <dd>{parseFloat(game.winningTime).toFixed(2)}с</dd>
                </>
              )}
            </dl>
          </div>
        </aside>
      </div>
    </div>
  );
}
