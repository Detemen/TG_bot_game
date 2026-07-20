import { useEffect } from "react";

import styles from "./LobbySummary.module.css";
import { useLobbyStore } from "../stores/useLobbyStore";

export function LobbySummary() {
  const { data, loading, error, fetch } = useLobbyStore();

  useEffect(() => {
    if (!data && !loading && !error) {
      void fetch();
    }
  }, [data, loading, error, fetch]);

  const totalBalls = data?.collectedBalls ?? 0;
  const requiredBalls = data?.requiredBalls ?? 10;
  const participants = data?.participants ?? [];

  return (
    <div className={styles.container}>
      <div className={styles.counter}>
        <span className={styles.label}>Ставок зібрано</span>
        <span className={styles.value}>
          {totalBalls} / {requiredBalls}
        </span>
      </div>

      <div className={styles.progress}>
        <div
          className={styles.progressInner}
          style={{ width: `${Math.min((totalBalls / requiredBalls) * 100, 100)}%` }}
        />
      </div>

      {loading ? (
        <p className={styles.helper}>Завантаження стану лобі...</p>
      ) : error ? (
        <p className={styles.error}>{error}</p>
      ) : (
        <>
          <ul className={styles.list}>
            {participants.length === 0 ? (
              <li className={styles.empty}>Поки що ніхто не приєднався.</li>
            ) : (
              participants.map((player) => (
                <li key={player.address}>
                  <span>{player.address}</span>
                  <span>{player.balls} кульок</span>
                </li>
              ))
            )}
          </ul>
          <button className={styles.joinButton} type="button" disabled>
            Купити кульку (скоро)
          </button>
          <span className={styles.helper}>
            Статус: <strong>{data?.status ?? "unknown"}</strong>. Кнопка буде активна після інтеграції оплат.
          </span>
        </>
      )}
    </div>
  );
}
