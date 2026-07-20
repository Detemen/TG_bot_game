import { FormEvent, useEffect, useState } from "react";

import styles from "./AuthPanel.module.css";
import { AuthStatus, useAuthStore } from "../stores/useAuthStore";

export function AuthPanel() {
  const [addressInput, setAddressInput] = useState("");
  const [signatureInput, setSignatureInput] = useState("");

  const {
    status,
    address,
    nonce,
    requestId,
    error,
    startNonceRequest,
    completeVerification,
    logout,
    initFromStorage,
  } = useAuthStore();

  useEffect(() => {
    initFromStorage();
  }, [initFromStorage]);

  useEffect(() => {
    if (nonce && status === "nonce_ready") {
      setSignatureInput(nonce);
    }
  }, [nonce, status]);

  const handleRequestNonce = (event: FormEvent) => {
    event.preventDefault();
    void startNonceRequest(addressInput || undefined);
  };

  const handleVerify = (event: FormEvent) => {
    event.preventDefault();
    void completeVerification(addressInput, signatureInput || undefined);
  };

  const isAuthenticated = status === "authenticated";

  return (
    <section id="auth-panel" className={styles.panel}>
      <div className={styles.header}>
        <h3>Авторизація (dev)</h3>
        <span className={styles.status}>{statusLabel(status)}</span>
      </div>

      {isAuthenticated && address ? (
        <div className={styles.fieldGroup}>
          <label>Поточна адреса</label>
          <div>{address}</div>
        </div>
      ) : (
        <>
          <form className={styles.fieldGroup} onSubmit={handleRequestNonce}>
            <label htmlFor="address">TON адреса (для підпису)</label>
            <input
              id="address"
              className={styles.input}
              placeholder="UQ... ваш гаманець"
              value={addressInput}
              onChange={(event) => setAddressInput(event.target.value)}
              required
            />
            <div className={styles.actions}>
              <button
                className={styles.primaryButton}
                type="submit"
                disabled={status === "requesting"}
              >
                {status === "requesting" ? "Запит..." : "Отримати nonce"}
              </button>
            </div>
          </form>

          {nonce && requestId ? (
            <form className={styles.fieldGroup} onSubmit={handleVerify}>
              <label htmlFor="signature">Підпис (u dev = nonce)</label>
              <input
                id="signature"
                className={styles.input}
                value={signatureInput}
                onChange={(event) => setSignatureInput(event.target.value)}
                required
              />
              <span className={styles.helper}>
                На цьому етапі достатньо вставити nonce у поле підпису. Згодом тут буде інтегровано TON
                Connect.
              </span>
              <div className={styles.actions}>
                <button
                  className={styles.primaryButton}
                  type="submit"
                  disabled={status === "verifying"}
                >
                  {status === "verifying" ? "Підтвердження..." : "Dev-підписати"}
                </button>
              </div>
            </form>
          ) : null}
        </>
      )}

      {isAuthenticated ? (
        <div className={styles.actions}>
          <button className={styles.secondaryButton} type="button" onClick={() => logout()}>
            Вийти з акаунта
          </button>
        </div>
      ) : null}

      {error ? <div className={styles.error}>{error}</div> : null}
    </section>
  );
}

function statusLabel(status: AuthStatus) {
  switch (status) {
    case "idle":
      return "Очікування";
    case "requesting":
      return "Запит nonce";
    case "nonce_ready":
      return "Nonce готовий";
    case "verifying":
      return "Перевірка";
    case "authenticated":
      return "Авторизовано";
    case "error":
      return "Помилка";
    default:
      return status;
  }
}
