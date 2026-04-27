/**
 * Secure Storage Service for POS Desktop
 * Uses Electron's safeStorage API for secure token storage
 * NO FALLBACK - if secure storage fails, app requires restart
 */

const TOKEN_KEY = 'auth_token_secure';
const USER_KEY = 'user_data_secure';

class SecureStorageService {
  private isElectron: boolean;

  constructor() {
    // Check if running in Electron with safeStorage available
    this.isElectron = typeof window !== 'undefined' && 
                     (window as any).electronAPI !== undefined;
  }

  /**
   * Store authentication token securely
   * Falls back to localStorage for browser dev mode
   */
  async setToken(token: string): Promise<void> {
    if (!this.isElectron) {
      // Fallback to localStorage for browser dev mode
      localStorage.setItem(TOKEN_KEY, token);
      return;
    }
    try {
      await (window as any).electronAPI.secureSetItem(TOKEN_KEY, token);
    } catch (error) {
      console.error('Failed to store token in secure storage:', error);
      throw new Error('Secure token storage failed. Please restart the application.');
    }
  }

  /**
   * Retrieve authentication token
   * Returns null if not found, throws on storage error
   */
  async getToken(): Promise<string | null> {
    if (!this.isElectron) {
      // Fallback to localStorage for browser dev mode
      return localStorage.getItem(TOKEN_KEY);
    }
    try {
      return await (window as any).electronAPI.secureGetItem(TOKEN_KEY);
    } catch (error) {
      console.error('Failed to retrieve token from secure storage:', error);
      throw new Error('Secure token retrieval failed. Please restart the application.');
    }
  }

  /**
   * Remove authentication token
   */
  async removeToken(): Promise<void> {
    if (!this.isElectron) {
      // Fallback to localStorage for browser dev mode
      localStorage.removeItem(TOKEN_KEY);
      return;
    }
    try {
      await (window as any).electronAPI.secureRemoveItem(TOKEN_KEY);
    } catch (error) {
      console.error('Failed to remove token from secure storage:', error);
      // Non-critical - don't throw
    }
  }

  /**
   * Store user data securely
   * Falls back to localStorage for browser dev mode
   */
  async setUser(user: any): Promise<void> {
    if (!this.isElectron) {
      // Fallback to localStorage for browser dev mode
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      return;
    }
    const userJson = JSON.stringify(user);
    try {
      await (window as any).electronAPI.secureSetItem(USER_KEY, userJson);
    } catch (error) {
      console.error('Failed to store user in secure storage:', error);
      throw new Error('Secure user storage failed. Please restart the application.');
    }
  }

  /**
   * Retrieve user data
   * Returns null if not found, throws on storage error
   */
  async getUser(): Promise<any | null> {
    if (!this.isElectron) {
      // Fallback to localStorage for browser dev mode
      const userJson = localStorage.getItem(USER_KEY);
      if (userJson) {
        return JSON.parse(userJson);
      }
      return null;
    }
    try {
      const userJson = await (window as any).electronAPI.secureGetItem(USER_KEY);
      if (userJson) {
        return JSON.parse(userJson);
      }
      return null;
    } catch (error) {
      console.error('Failed to retrieve user from secure storage:', error);
      throw new Error('Secure user retrieval failed. Please restart the application.');
    }
  }

  /**
   * Remove user data
   */
  async removeUser(): Promise<void> {
    if (!this.isElectron) {
      // Fallback to localStorage for browser dev mode
      localStorage.removeItem(USER_KEY);
      return;
    }
    try {
      await (window as any).electronAPI.secureRemoveItem(USER_KEY);
    } catch (error) {
      console.error('Failed to remove user from secure storage:', error);
      // Non-critical - don't throw
    }
  }

  /**
   * Clear all auth data
   */
  async clearAuth(): Promise<void> {
    await this.removeToken();
    await this.removeUser();
  }

  /**
   * Check if secure storage is available
   */
  isSecureStorageAvailable(): boolean {
    return this.isElectron;
  }
}

// Singleton instance
let secureStorageService: SecureStorageService | null = null;

export const getSecureStorageService = (): SecureStorageService => {
  if (!secureStorageService) {
    secureStorageService = new SecureStorageService();
  }
  return secureStorageService;
};

export default SecureStorageService;
