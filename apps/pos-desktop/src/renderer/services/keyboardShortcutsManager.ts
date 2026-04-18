/**
 * Keyboard Shortcuts Manager
 * Centralized keyboard shortcut handling for POS system
 */

import toast from 'react-hot-toast';

export interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  description: string;
  action: () => void;
  enabled?: boolean;
}

export interface ShortcutCategory {
  name: string;
  shortcuts: ShortcutConfig[];
}

class KeyboardShortcutsManager {
  private shortcuts: Map<string, ShortcutConfig> = new Map();
  private enabled: boolean = true;

  constructor() {
    this.initialize();
  }

  private initialize() {
    document.addEventListener('keydown', this.handleKeyDown);
    console.log('Keyboard shortcuts manager initialized');
  }

  private getShortcutKey(event: KeyboardEvent): string {
    const parts: string[] = [];
    
    if (event.ctrlKey) parts.push('ctrl');
    if (event.altKey) parts.push('alt');
    if (event.shiftKey) parts.push('shift');
    parts.push(event.key.toLowerCase());
    
    return parts.join('+');
  }

  private handleKeyDown = (event: KeyboardEvent) => {
    if (!this.enabled) return;

    // Don't trigger shortcuts when typing in inputs
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      // Allow some shortcuts even in inputs (like Escape)
      if (event.key !== 'Escape' && event.key !== 'F1' && event.key !== 'F2' && event.key !== 'F3') {
        return;
      }
    }

    const shortcutKey = this.getShortcutKey(event);
    const shortcut = this.shortcuts.get(shortcutKey);

    if (shortcut && shortcut.enabled !== false) {
      event.preventDefault();
      event.stopPropagation();
      
      try {
        shortcut.action();
      } catch (error) {
        console.error('Error executing shortcut:', error);
        toast.error('Shortcut action failed');
      }
    }
  };

  /**
   * Register a keyboard shortcut
   */
  public register(config: ShortcutConfig): () => void {
    const parts: string[] = [];
    
    if (config.ctrl) parts.push('ctrl');
    if (config.alt) parts.push('alt');
    if (config.shift) parts.push('shift');
    parts.push(config.key.toLowerCase());
    
    const shortcutKey = parts.join('+');
    
    this.shortcuts.set(shortcutKey, config);
    
    // Return unregister function
    return () => {
      this.shortcuts.delete(shortcutKey);
    };
  }

  /**
   * Register multiple shortcuts at once
   */
  public registerMany(configs: ShortcutConfig[]): () => void {
    const unregisterFns = configs.map(config => this.register(config));
    
    // Return function to unregister all
    return () => {
      unregisterFns.forEach(fn => fn());
    };
  }

  /**
   * Unregister a shortcut
   */
  public unregister(key: string, ctrl?: boolean, alt?: boolean, shift?: boolean): void {
    const parts: string[] = [];
    
    if (ctrl) parts.push('ctrl');
    if (alt) parts.push('alt');
    if (shift) parts.push('shift');
    parts.push(key.toLowerCase());
    
    const shortcutKey = parts.join('+');
    this.shortcuts.delete(shortcutKey);
  }

  /**
   * Get all registered shortcuts grouped by category
   */
  public getAllShortcuts(): ShortcutCategory[] {
    const categories: ShortcutCategory[] = [
      {
        name: 'Order Management',
        shortcuts: [],
      },
      {
        name: 'Navigation',
        shortcuts: [],
      },
      {
        name: 'Actions',
        shortcuts: [],
      },
      {
        name: 'System',
        shortcuts: [],
      },
    ];

    this.shortcuts.forEach((shortcut) => {
      // Categorize based on description
      if (shortcut.description.toLowerCase().includes('order')) {
        categories[0].shortcuts.push(shortcut);
      } else if (shortcut.description.toLowerCase().includes('navigate') || 
                 shortcut.description.toLowerCase().includes('go to')) {
        categories[1].shortcuts.push(shortcut);
      } else if (shortcut.description.toLowerCase().includes('system') ||
                 shortcut.description.toLowerCase().includes('help')) {
        categories[3].shortcuts.push(shortcut);
      } else {
        categories[2].shortcuts.push(shortcut);
      }
    });

    return categories.filter(cat => cat.shortcuts.length > 0);
  }

  /**
   * Enable/disable all shortcuts
   */
  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Check if shortcuts are enabled
   */
  public isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Show shortcuts help overlay
   */
  public showHelp(): void {
    // This will be handled by the UI component
    window.dispatchEvent(new CustomEvent('shortcuts:show-help'));
  }

  /**
   * Cleanup and destroy
   */
  public destroy(): void {
    document.removeEventListener('keydown', this.handleKeyDown);
    this.shortcuts.clear();
    console.log('Keyboard shortcuts manager destroyed');
  }
}

// Singleton instance
let keyboardShortcutsManager: KeyboardShortcutsManager | null = null;

export const getKeyboardShortcutsManager = (): KeyboardShortcutsManager => {
  if (!keyboardShortcutsManager) {
    keyboardShortcutsManager = new KeyboardShortcutsManager();
  }
  return keyboardShortcutsManager;
};

// Default POS shortcuts configuration
export const DEFAULT_POS_SHORTCUTS: ShortcutConfig[] = [
  // Order Management
  {
    key: 'F1',
    description: 'Start New Order',
    action: () => window.dispatchEvent(new CustomEvent('pos:new-order')),
  },
  {
    key: 'F2',
    description: 'Hold Current Order',
    action: () => window.dispatchEvent(new CustomEvent('pos:hold-order')),
  },
  {
    key: 'F3',
    description: 'View Held Orders',
    action: () => window.dispatchEvent(new CustomEvent('pos:toggle-held-orders')),
  },
  {
    key: 'F4',
    description: 'Send to Kitchen',
    action: () => window.dispatchEvent(new CustomEvent('pos:send-to-kitchen')),
  },
  {
    key: 'F5',
    description: 'Proceed to Checkout',
    action: () => window.dispatchEvent(new CustomEvent('pos:checkout')),
  },
  
  // Actions
  {
    key: 'd',
    ctrl: true,
    description: 'Apply Discount',
    action: () => window.dispatchEvent(new CustomEvent('pos:apply-discount')),
  },
  {
    key: 't',
    ctrl: true,
    description: 'Add Tip',
    action: () => window.dispatchEvent(new CustomEvent('pos:add-tip')),
  },
  {
    key: 'v',
    ctrl: true,
    description: 'Void Item',
    action: () => window.dispatchEvent(new CustomEvent('pos:void-item')),
  },
  {
    key: 'p',
    ctrl: true,
    description: 'Print Receipt',
    action: () => window.dispatchEvent(new CustomEvent('pos:print-receipt')),
  },
  {
    key: 'o',
    ctrl: true,
    description: 'Open Cash Drawer',
    action: () => window.dispatchEvent(new CustomEvent('pos:open-drawer')),
  },
  
  // Navigation
  {
    key: 'h',
    ctrl: true,
    description: 'Go to Order History',
    action: () => window.location.hash = '#/cashier-history',
  },
  {
    key: 'a',
    ctrl: true,
    description: 'Go to Active Orders',
    action: () => window.location.hash = '#/cashier-orders',
  },
  {
    key: 'm',
    ctrl: true,
    description: 'Go to Menu',
    action: () => window.location.hash = '#/cashier-pos',
  },
  
  // System
  {
    key: '/',
    description: 'Show Keyboard Shortcuts',
    action: () => window.dispatchEvent(new CustomEvent('shortcuts:show-help')),
  },
  {
    key: '?',
    shift: true,
    description: 'Show Help',
    action: () => window.dispatchEvent(new CustomEvent('shortcuts:show-help')),
  },
  {
    key: 'Escape',
    description: 'Close Modal / Cancel',
    action: () => window.dispatchEvent(new CustomEvent('pos:cancel')),
  },
];

export default KeyboardShortcutsManager;
