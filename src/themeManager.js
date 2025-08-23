// Theme management for light/dark mode
class ThemeManager {
  constructor() {
    this.storageKey = 'ff-theme-preference';
    this.currentTheme = null;
    this.callbacks = [];
    this.init();
  }

  init() {
    // Get saved preference or default to system preference
    const savedTheme = localStorage.getItem(this.storageKey);
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme) {
      this.currentTheme = savedTheme;
    } else {
      this.currentTheme = systemPrefersDark ? 'dark' : 'light';
    }

    // Apply initial theme
    this.applyTheme(this.currentTheme);

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      // Only follow system changes if user hasn't set a preference
      if (!localStorage.getItem(this.storageKey)) {
        const newTheme = e.matches ? 'dark' : 'light';
        this.currentTheme = newTheme;
        this.applyTheme(newTheme);
        this.notifyCallbacks();
      }
    });
  }

  applyTheme(theme) {
    const root = document.documentElement;
    
    if (theme === 'dark') {
      root.style.setProperty('--bg-color', '#1a1a1a');
      root.style.setProperty('--text-color', '#e0e0e0');
      root.style.setProperty('--text-secondary', '#b0b0b0');
      root.style.setProperty('--border-color', '#3a3a3a');
      root.style.setProperty('--accent-color', '#4a9eff');
      root.style.setProperty('--error-color', '#ff6b6b');
      root.style.setProperty('--success-color', '#51cf66');
      root.style.setProperty('--button-bg', '#3a3a3a');
      root.style.setProperty('--button-hover', '#4a4a4a');
      root.style.setProperty('--grid-color', '#3a3a3a');
      root.style.setProperty('--tooltip-bg', 'rgba(42, 42, 42, 0.95)');
      root.style.setProperty('--switch-bg', '#4a4a4a');
      root.style.setProperty('--switch-active', '#4a9eff');
    } else {
      root.style.setProperty('--bg-color', '#ffffff');
      root.style.setProperty('--text-color', '#1a1a1a');
      root.style.setProperty('--text-secondary', '#666666');
      root.style.setProperty('--border-color', '#e0e0e0');
      root.style.setProperty('--accent-color', '#2563eb');
      root.style.setProperty('--error-color', '#dc2626');
      root.style.setProperty('--success-color', '#16a34a');
      root.style.setProperty('--button-bg', '#f5f5f5');
      root.style.setProperty('--button-hover', '#e5e5e5');
      root.style.setProperty('--grid-color', '#e5e5e5');
      root.style.setProperty('--tooltip-bg', 'rgba(255, 255, 255, 0.95)');
      root.style.setProperty('--switch-bg', '#e5e5e5');
      root.style.setProperty('--switch-active', '#2563eb');
    }

    // Update meta theme color for PWA
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
      themeColorMeta.content = theme === 'dark' ? '#1a1a1a' : '#ffffff';
    }
  }

  toggle() {
    const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    this.setTheme(newTheme);
  }

  setTheme(theme) {
    if (theme !== 'light' && theme !== 'dark') return;
    
    this.currentTheme = theme;
    localStorage.setItem(this.storageKey, theme);
    this.applyTheme(theme);
    this.notifyCallbacks();
  }

  clearPreference() {
    localStorage.removeItem(this.storageKey);
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const newTheme = systemPrefersDark ? 'dark' : 'light';
    this.currentTheme = newTheme;
    this.applyTheme(newTheme);
    this.notifyCallbacks();
  }

  getTheme() {
    return this.currentTheme;
  }

  isSystemDefault() {
    return !localStorage.getItem(this.storageKey);
  }

  getSystemTheme() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  onChange(callback) {
    this.callbacks.push(callback);
  }

  notifyCallbacks() {
    this.callbacks.forEach(callback => {
      try {
        callback(this.currentTheme);
      } catch (error) {
        console.error('Theme callback error:', error);
      }
    });
  }
}

export default new ThemeManager();