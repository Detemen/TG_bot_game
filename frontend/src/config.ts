export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";
export const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL ?? "ws://localhost:4000";

export const API_ROUTES = {
  authRequest: `${API_BASE_URL}/auth/request`,
  authVerify: `${API_BASE_URL}/auth/verify`,
  lobbyStub: `${API_BASE_URL}/dev/lobby/stub`,
  lobbyMockProgress: `${API_BASE_URL}/dev/lobby/mock-progress`,
};

export const STORAGE_KEYS = {
  authToken: "marble_race_auth_token",
  authAddress: "marble_race_auth_address",
};
