/**
 * Secure Storage Service for POS Desktop
 *
 * Production: requires Electron's safeStorage IPC bridge — no fallback.
 * Development (Vite browser tab): falls back to localStorage so devs can
 * exercise the renderer without a full Electron build. The fallback is
 * gated on import.meta.env.DEV so it never ships in a production bundle.
 */

const TOKEN_KEY = 'auth_token_secure';
const USER_KEY = 'user_data_secure';

const IS_DEV = typeof import.meta !== 'undefined' && (import.meta as any).env?.DEV === true;

class SecureStorageService {
  private isElectron: boolean;
  private useDevFallback: boolean;
  private warnedAboutFallback = false;

  constructor() {
    this.isElectron = typeof window !== 'undefined' &&
                     (window as any).electronAPI !== undefined;
    // Dev-only fallback when running the renderer in a plain browser tab
    this.useDevFallback = !this.isElectron && IS_DEV && typeof window !== 'undefined' && !!window.localStorage;
  }

  private warnFallbackOnce(): void {
    if (!this.warnedAboutFallback) {
      this.warnedAboutFallback = true;
      console.warn(
        '[secureStorageService] electronAPI not detected — using localStorage fallback. ' +
        'This only happens in dev mode (browser tab). Tokens are NOT encrypted.'
      );
    }
  }

  private requireElectronOrThrow(): void {
    if (this.isElectron) return;
    if (this.useDevFallback) { this.warnFallbackOnce(); return; }
    throw new Error('Secure storage unavailable: electronAPI not loaded');
  }

  async setToken(token: string): Promise<void> {
    this.requireElectronOrThrow();
    if (this.useDevFallback) {
      window.localStorage.setItem(TOKEN_KEY, token);
      return;
    }
    try {
      await (window as any).electronAPI.secureSetItem(TOKEN_KEY, token);
    } catch (error) {
      console.error('Failed to store token in secure storage:', error);
      throw new Error('Secure token storage failed. Please restart the application.');
    }
  }

  async getToken(): Promise<string | null> {
    this.requireElectronOrThrow();
    if (this.useDevFallback) {
      return window.localStorage.getItem(TOKEN_KEY);
    }
    try {
      return await (window as any).electronAPI.secureGetItem(TOKEN_KEY);
    } catch (error) {
      console.error('Failed to retrieve token from secure storage:', error);
      throw new Error('Secure token retrieval failed. Please restart the application.');
    }
  }

  async removeToken(): Promise<void> {
    if (!this.isElectron && !this.useDevFallback) return; // nothing to remove
    if (this.useDevFallback) {
      window.localStorage.removeItem(TOKEN_KEY);
      return;
    }
    try {
      await (window as any).electronAPI.secureRemoveItem(TOKEN_KEY);
    } catch (error) {
      console.error('Failed to remove token from secure storage:', error);
    }
  }

  async setUser(user: any): Promise<void> {
    this.requireElectronOrThrow();
    const userJson = JSON.stringify(user);
    if (this.useDevFallback) {
      window.localStorage.setItem(USER_KEY, userJson);
      return;
    }
    try {
      await (window as any).electronAPI.secureSetItem(USER_KEY, userJson);
    } catch (error) {
      console.error('Failed to store user in secure storage:', error);
      throw new Error('Secure user storage failed. Please restart the application.');
    }
  }

  async getUser(): Promise<any | null> {
    this.requireElectronOrThrow();
    let userJson: string | null;
    if (this.useDevFallback) {
      userJson = window.localStorage.getItem(USER_KEY);
    } else {
      try {
        userJson = await (window as any).electronAPI.secureGetItem(USER_KEY);
      } catch (error) {
        console.error('Failed to retrieve user from secure storage:', error);
        throw new Error('Secure user retrieval failed. Please restart the application.');
      }
    }
    if (userJson) {
      try { return JSON.parse(userJson); } catch { return null; }
    }
    return null;
  }

  async removeUser(): Promise<void> {
    if (!this.isElectron && !this.useDevFallback) return;
    if (this.useDevFallback) {
      window.localStorage.removeItem(USER_KEY);
      return;
    }
    try {
      await (window as any).electronAPI.secureRemoveItem(USER_KEY);
    } catch (error) {
      console.error('Failed to remove user from secure storage:', error);
    }
  }

  async clearAuth(): Promise<void> {
    await this.removeToken();
    await this.removeUser();
  }

  isSecureStorageAvailable(): boolean {
    return this.isElectron;
  }
}

let secureStorageService: SecureStorageService | null = null;

export const getSecureStorageService = (): SecureStorageService => {
  if (!secureStorageService) {
    secureStorageService = new SecureStorageService();
  }
  return secureStorageService;
};

export default SecureStorageService;
