import { useEffect, useMemo, useState, useCallback } from "react";

import styles from "./FiftyBallRace.module.css";
import { MatterCanvas } from "./MatterCanvas";
import { useLobbyStore } from "../stores/useLobbyStore";
import type { TrackLayout, ObstacleConfig } from "../types/track";
import type { FinishEntry } from "../physics/obstacles";

const BALL_COUNT = 50;
const DEFAULT_SEED = "fifty-ball-showcase";

function makeDefaultTrackLayout(seed: string): TrackLayout {
  const obstacles: ObstacleConfig[] = [
    { type: "plinkoGrid", x: 30, y: 20, width: 360, height: 150, params: { rows: 5, cols: 5 } },
    { type: "bumpers", x: 30, y: 190, width: 360, height: 100, params: { bumperCount: 5 } },
    { type: "spinner", x: 30, y: 310, width: 360, height: 120 },
    { type: "brickWall", x: 30, y: 450, width: 360, height: 60, params: { rows: 2 } },
    { type: "fans", x: 30, y: 530, width: 360, height: 100, params: { fanCount: 3 } },
    { type: "gravityZone", x: 30, y: 650, width: 360, height: 100, params: { gravityMultiplier: 2.5 } },
    { type: "finishLine", x: 0, y: 820, width: 420, height: 80 },
  ];
  return { id: seed, seed, width: 420, height: 900, obstacles, createdAt: Date.now() };
}

type LeaderboardItem = FinishEntry;

export function FiftyBallRace() {
  const { data, loading, requestNewTrack } = useLobbyStore((state) => ({
    data: state.data,
    loading: state.loading,
    requestNewTrack: state.requestNewTrack,
  }));

  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);

  const seed = data?.seedPreview ?? DEFAULT_SEED;
  const commitHash = data?.commitHash ?? "—";
  const revealTime = data?.nextRevealEta ? new Date(data.nextRevealEta).toLocaleTimeString() : "—";
  const totalBalls = data?.collectedBalls ?? BALL_COUNT;
  const participants = data?.participants?.length ?? 0;
  const statusLabel = data?.status ?? "collecting";

  const trackDescription = useMemo(() => {
    const obstacles = (data?.track as TrackLayout | undefined)?.obstacles;
    if (!obstacles || obstacles.length === 0) {
      return "Очікуємо на генерацію траси з бекенду.";
    }
    const unique = [...new Set(obstacles.map((obstacle) => obstacle.type))];
    return `Перешкод: ${obstacles.length}. Типи: ${unique.join(" · ")}.`;
  }, [data]);

  useEffect(() => {
    setLeaderboard([]);
  }, [seed]);

  const handleRefreshSeed = async () => {
    await requestNewTrack();
  };

  const handleLeaderboardUpdate = useCallback((entries: LeaderboardItem[]) => {
    setLeaderboard(entries);
  }, []);

  return (
    <section className={styles.wrapper}>
      <div className={styles.header}>
        <div>
          <p className={styles.overline}>50 MARBLE MODE</p>
          <h2>Поточний забіг із 50 кульок</h2>
          <p>
            Цей блок використовує Matter.js Canvas, щоб показати, як поводяться усі 50 кульок одночасно.
            Seed приходить із commit–reveal бекенду, тож результат можна верифікувати.
          </p>
        </div>

        <div className={styles.metaGrid}>
          <div>
            <span>Кульок у заїзді</span>
            <strong>{BALL_COUNT}</strong>
          </div>
          <div>
            <span>Статус лобі</span>
            <strong>{statusLabel}</strong>
          </div>
          <div>
            <span>Учасників</span>
            <strong>{participants}</strong>
          </div>
          <div>
            <span>Зібрано ставок</span>
            <strong>{totalBalls}</strong>
          </div>
        </div>
      </div>

      <div className={styles.stage}>
        <div className={styles.canvasPanel}>
          <MatterCanvas
            width={420}
            height={900}
            ballCount={BALL_COUNT}
            trackLayout={(data?.track as TrackLayout) || makeDefaultTrackLayout(seed)}
            onLeaderboardUpdate={handleLeaderboardUpdate}
          />
        </div>

        <div className={styles.infoPanel}>
          <div className={styles.card}>
            <span className={styles.cardLabel}>Seed (reveal)</span>
            <code className={styles.code}>{seed}</code>
            <span className={styles.muted}>Оновиться після наступного commit–reveal циклу.</span>
          </div>

          <div className={styles.card}>
            <span className={styles.cardLabel}>Commit hash</span>
            <code className={styles.code}>{commitHash}</code>
            <div className={styles.metaRow}>
              <span>Наступний reveal:</span>
              <strong>{revealTime}</strong>
            </div>
          </div>

          <div className={styles.card}>
            <span className={styles.cardLabel}>Траса</span>
            <p className={styles.trackCopy}>{trackDescription}</p>
          </div>

          <div className={styles.card}>
            <span className={styles.cardLabel}>Лайв-лідерборд</span>
            {leaderboard.length === 0 ? (
              <p className={styles.trackCopy}>Ще ніхто не доїхав. Слідкуємо…</p>
            ) : (
              <ol className={styles.finishList}>
                {leaderboard.slice(0, 8).map((item, index) => (
                  <li key={item.ballIndex} style={{ borderLeftColor: item.color }}>
                    <span className={styles.finishIndex}>#{index + 1}</span>
                    <span className={styles.finishLabel}>{item.label}</span>
                    <span className={styles.finishTime}>{item.time.toFixed(2)}s</span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <button
            className={styles.refreshButton}
            type="button"
            onClick={handleRefreshSeed}
            disabled={loading}
          >
            {loading ? "Оновлення..." : "Згенерувати новий seed (dev)"}
          </button>

          <p className={styles.helper}>
            Dev-only режим: кнопка зверху викликає mock API, що генерує нові 50 seed-спроб для тестового UI.
          </p>
        </div>
      </div>
    </section>
  );
}
