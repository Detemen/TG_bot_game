import styles from "./CommitRevealStatus.module.css";
import { useLobbyStore } from "../stores/useLobbyStore";

export function CommitRevealStatus() {
  const { data, loading } = useLobbyStore();

  const commitHash = data?.commitHash;
  const seedPreview = data?.seedPreview;
  const nextRevealEta = data?.nextRevealEta;

  return (
    <div className={styles.container}>
      <header>
        <p className={styles.caption}>Lobby: {data?.lobbyId ?? "—"}</p>
        <h3>Commit–Reveal</h3>
      </header>

      <div className={styles.stage}>
        <span className={styles.badge}>Commit</span>
        {commitHash ? (
          <>
            <p>
              Hash опубліковано: <code>{commitHash}</code>
            </p>
            <small>
              Очікуваний reveal:{" "}
              {nextRevealEta ? new Date(nextRevealEta).toLocaleTimeString() : "невідомо"}
            </small>
          </>
        ) : loading ? (
          <p>Очікуємо commit hash...</p>
        ) : (
          <p>Закладаємо основу для майбутнього commit — як тільки зберемо мінімум ставок.</p>
        )}
      </div>

      <div className={styles.stage}>
        <span className={styles.badge}>Reveal</span>
        {seedPreview ? (
          <p>
            Попередній seed: <code>{seedPreview}</code>
          </p>
        ) : (
          <p>
            Seed буде розкритий після завершення набору. На dev-етапі seed може бути заглушкою і не
            впливати на фізику.
          </p>
        )}
      </div>

      <div className={styles.stage}>
        <span className={styles.badge}>Траса</span>
        {data?.track ? (
          <p>
            Перешкод: {data.track.obstacles.length}. Типи:{" "}
            {[...new Set(data.track.obstacles.map((obstacle) => obstacle.type))].join(", ")}.
          </p>
        ) : (
          <p>Очікуємо генерацію траси.</p>
        )}
      </div>

      <footer className={styles.footerNote}>
        <p>
          Після reveal бекенд опублікує <code>seed</code> і стартові параметри. Клієнт зможе відтворити
          гонку локально та перевірити чесність.
        </p>
      </footer>
    </div>
  );
}
