class TokenManager {
  private static instance: TokenManager;
  private token: string | null = null;
  private setTokenCallback: ((token: string) => void) | null = null;
  private clearTokenCallback: (() => void) | null = null;

  private constructor() {}

  static getInstance(): TokenManager {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager();
    }
    return TokenManager.instance;
  }

  setToken(token: string): void {
    this.token = token;
    if (this.setTokenCallback) {
      this.setTokenCallback(token);
    }
  }

  getToken(): string | null {
    return this.token;
  }

  clearToken(): void {
    this.token = null;
    if (this.clearTokenCallback) {
      this.clearTokenCallback();
    }
  }

  setCallbacks(
    setToken: (token: string) => void,
    clearToken: () => void,
  ): void {
    this.setTokenCallback = setToken;
    this.clearTokenCallback = clearToken;
  }
}

export { TokenManager };

