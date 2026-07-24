import { useCallback, useMemo, useRef, useState } from "react";

import { MatterCanvas } from "../components/MatterCanvas";
import type { FinishEntry } from "../physics/obstacles";
import { generateTrackLayout, randomSeed } from "./trackPresets";
import styles from "./DemoApp.module.css";

const BALL_COUNT = 24;

const BALL_COLORS = [
  "#ff6b9d", "#c69aff", "#ffd93d", "#6bcfff", "#95e1d3", "#ff9a76",
  "#7ee787", "#f778ba", "#a5d6ff", "#ffab70", "#d2a8ff", "#56d364",
];

function buildBallMetadata(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    label: `Кулька #${i + 1}`,
    color: BALL_COLORS[i % BALL_COLORS.length],
  }));
}

export function DemoApp() {
  const [seed, setSeed] = useState(() => randomSeed());
  const [leaderboard, setLeaderboard] = useState<FinishEntry[]>([]);
  const [raceKey, setRaceKey] = useState(0);

  const ballMetadata = useMemo(() => buildBallMetadata(BALL_COUNT), []);
  const track = useMemo(() => generateTrackLayout(seed), [seed]);

  // The leaderboard callback fires often; keep the latest list only.
  const leaderboardRef = useRef<FinishEntry[]>([]);
  const handleLeaderboard = useCallback((entries: FinishEntry[]) => {
    leaderboardRef.current = entries;
    setLeaderboard([...entries]);
  }, []);

  const newRace = useCallback(() => {
    setLeaderboard([]);
    leaderboardRef.current = [];
    setSeed(randomSeed());
    setRaceKey((k) => k + 1);
  }, []);

  const winner = leaderboard[0];

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div>
          <p className={styles.overline}>MARBLE RACE · PHYSICS DEMO</p>
          <h1 className={styles.title}>Marble Race</h1>
          <p className={styles.subtitle}>
            Матч на {BALL_COUNT} кульок. Траса генерується процедурно з сіду —
            перешкоди, гравітаційні зони та спінери щоразу різні. Перша кулька на
            фініші перемагає.
          </p>
        </div>
        <button type="button" className={styles.newRace} onClick={newRace}>
          ↻ Новий заїзд
        </button>
      </header>

      <div className={styles.stage}>
        <div className={styles.canvasPanel}>
          <MatterCanvas
            key={raceKey}
            width={420}
            height={track.height}
            ballCount={BALL_COUNT}
            ballMetadata={ballMetadata}
            trackLayout={track}
            onLeaderboardUpdate={handleLeaderboard}
          />
        </div>

        <aside className={styles.sidebar}>
          <section className={styles.card}>
            <span className={styles.cardLabel}>Сід траси</span>
            <code className={styles.code}>{seed}</code>
            <p className={styles.muted}>
              У продакшені сід приходить із commit–reveal бекенду, тож результат
              заїзду можна верифікувати.
            </p>
          </section>

          <section className={styles.card}>
            <span className={styles.cardLabel}>
              Фінішували ({leaderboard.length}/{BALL_COUNT})
            </span>
            {winner ? (
              <div className={styles.winner}>
                <span
                  className={styles.swatch}
                  style={{ background: winner.color }}
                />
                <span className={styles.winnerText}>
                  🏆 {winner.label} — {winner.time.toFixed(2)}с
                </span>
              </div>
            ) : (
              <p className={styles.muted}>Заїзд триває…</p>
            )}

            <ol className={styles.board}>
              {leaderboard.slice(0, 10).map((entry, index) => (
                <li key={entry.ballIndex} className={styles.boardRow}>
                  <span className={styles.rank}>{index + 1}</span>
                  <span
                    className={styles.swatch}
                    style={{ background: entry.color }}
                  />
                  <span className={styles.boardLabel}>{entry.label}</span>
                  <span className={styles.boardTime}>
                    {entry.time.toFixed(2)}с
                  </span>
                </li>
              ))}
            </ol>
          </section>

          <p className={styles.footnote}>
            Це відкрита демо-версія фізики. Повна гра — Telegram Mini App зі
            ставками в TON та Telegram Stars.
          </p>
        </aside>
      </div>
    </div>
  );
}
