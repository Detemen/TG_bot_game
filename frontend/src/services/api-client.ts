// API Client for Marble Race Backend

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export interface User {
  id: string;
  telegramId: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  tonAddress?: string;
  balanceTon: string;
  balanceStars: number;
  referralCode: string;
  totalGames: number;
  totalWins: number;
  totalEarned: string;
  referralStats?: {
    totalReferrals: number;
    totalEarnings: string;
  };
  createdAt: string;
}

export interface Game {
  id: string;
  seed: string;
  trackConfig?: any;
  status: 'WAITING' | 'STARTING' | 'RUNNING' | 'FINISHED' | 'CANCELLED';
  difficulty: 'easy' | 'medium' | 'hard';
  potTon: string;
  potStars: number;
  winnerId?: string;
  winner?: {
    id: string;
    username?: string;
    firstName?: string;
  };
  winnerBallId?: number;
  winningTime?: string;
  maxPlayers: number;
  maxBallsPerPlayer: number;
  ballPriceTon: string;
  ballPriceStars: number;
  startTime?: string;
  endTime?: string;
  createdAt: string;
  bets?: Bet[];
  stats?: {
    totalPlayers: number;
    totalBalls: number;
    totalPot: { ton: string; stars: number };
    avgBallsPerPlayer: number;
  };
}

export interface Bet {
  id: string;
  userId: string;
  user?: {
    id: string;
    username?: string;
    firstName?: string;
  };
  ballCount: number;
  amountTon: string;
  amountStars: number;
  currency: 'TON' | 'STARS';
  ballColors: string[];
  isWinner: boolean;
  payout: string;
}

export interface Transaction {
  id: string;
  type: string;
  amount: string;
  currency: 'TON' | 'STARS';
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  gameId?: string;
  referenceId?: string;
  createdAt: string;
  metadata?: any;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async fetch<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // User endpoints
  async registerUser(data: {
    telegramId: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    referrerCode?: string;
  }): Promise<User> {
    return this.fetch<User>('/users/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getUser(userId: string): Promise<User> {
    return this.fetch<User>(`/users/me?userId=${userId}`);
  }

  async deposit(data: {
    userId: string;
    amount: string;
    currency: 'TON' | 'STARS';
    referenceId: string;
    metadata?: any;
  }): Promise<{ transaction: Transaction; newBalance: { ton?: string; stars?: number } }> {
    return this.fetch('/users/deposit', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async withdraw(data: {
    userId: string;
    amount: string;
    currency: 'TON' | 'STARS';
    tonAddress?: string;
  }): Promise<{ transaction: Transaction; newBalance: { ton?: string; stars?: number } }> {
    return this.fetch('/users/withdraw', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getUserTransactions(
    userId: string,
    params?: { type?: string; status?: string; limit?: number; offset?: number }
  ): Promise<{ transactions: Transaction[] }> {
    const query = new URLSearchParams({
      userId,
      ...(params?.type && { type: params.type }),
      ...(params?.status && { status: params.status }),
      ...(params?.limit && { limit: params.limit.toString() }),
      ...(params?.offset && { offset: params.offset.toString() }),
    });
    return this.fetch(`/users/transactions?${query}`);
  }

  async getUserStats(userId: string): Promise<{
    totalDeposits: { ton: string; stars: number };
    totalWithdrawals: { ton: string; stars: number };
    totalBets: { ton: string; stars: number };
    totalWinnings: { ton: string; stars: number };
  }> {
    return this.fetch(`/users/stats?userId=${userId}`);
  }

  async getReferrals(userId: string): Promise<{ referrals: User[] }> {
    return this.fetch(`/users/referrals?userId=${userId}`);
  }

  async getLeaderboard(limit = 100): Promise<{
    leaderboard: Array<{
      rank: number;
      id: string;
      username?: string;
      firstName?: string;
      totalEarned: string;
      totalWins: number;
      totalGames: number;
      winRate: number;
    }>;
  }> {
    return this.fetch(`/users/leaderboard?limit=${limit}`);
  }

  // Game endpoints
  async getActiveGames(): Promise<{ games: Game[] }> {
    return this.fetch('/games');
  }

  async getFinishedGames(params?: {
    limit?: number;
    offset?: number;
  }): Promise<{ games: Game[] }> {
    const query = new URLSearchParams({
      ...(params?.limit && { limit: params.limit.toString() }),
      ...(params?.offset && { offset: params.offset.toString() }),
    });
    return this.fetch(`/games/finished?${query}`);
  }

  async getGame(gameId: string): Promise<Game> {
    return this.fetch(`/games/${gameId}`);
  }

  async createGame(data?: {
    difficulty?: 'easy' | 'medium' | 'hard';
    maxPlayers?: number;
    maxBallsPerPlayer?: number;
    ballPriceTon?: string;
    ballPriceStars?: number;
  }): Promise<Game> {
    return this.fetch('/games', {
      method: 'POST',
      body: JSON.stringify(data || {}),
    });
  }

  async joinGame(
    gameId: string,
    data: {
      userId: string;
      ballCount: number;
      currency: 'TON' | 'STARS';
    }
  ): Promise<{ game: Game; bet: Bet }> {
    return this.fetch(`/games/${gameId}/join`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async startGame(gameId: string): Promise<Game> {
    return this.fetch(`/games/${gameId}/start`, {
      method: 'POST',
    });
  }

  async finishGame(
    gameId: string,
    data: {
      winnerId: string;
      winnerBallId: number;
      winningTime: string;
    }
  ): Promise<Game> {
    return this.fetch(`/games/${gameId}/finish`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async cancelGame(gameId: string): Promise<Game> {
    return this.fetch(`/games/${gameId}/cancel`, {
      method: 'POST',
    });
  }

  async getUserGameHistory(
    userId: string,
    params?: { limit?: number; offset?: number }
  ): Promise<{ games: Game[] }> {
    const query = new URLSearchParams({
      userId,
      ...(params?.limit && { limit: params.limit.toString() }),
      ...(params?.offset && { offset: params.offset.toString() }),
    });
    return this.fetch(`/games/history/user?${query}`);
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
