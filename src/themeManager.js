const THEME_COLORS = {
  dark: {
    '--bg-color': '#1a1a1a',
    '--text-color': '#e0e0e0',
    '--text-secondary': '#b0b0b0',
    '--border-color': '#3a3a3a',
    '--accent-color': '#4a9eff',
    '--error-color': '#ff6b6b',
    '--success-color': '#51cf66',
    '--button-bg': '#3a3a3a',
    '--button-hover': '#4a4a4a',
    '--grid-color': '#3a3a3a',
    '--tooltip-bg': 'rgba(42, 42, 42, 0.95)',
    '--switch-bg': '#4a4a4a',
    '--switch-active': '#4a9eff'
  },
  light: {
    '--bg-color': '#ffffff',
    '--text-color': '#1a1a1a',
    '--text-secondary': '#666666',
    '--border-color': '#e0e0e0',
    '--accent-color': '#2563eb',
    '--error-color': '#dc2626',
    '--success-color': '#16a34a',
    '--button-bg': '#f5f5f5',
    '--button-hover': '#e5e5e5',
    '--grid-color': '#e5e5e5',
    '--tooltip-bg': 'rgba(255, 255, 255, 0.95)',
    '--switch-bg': '#e5e5e5',
    '--switch-active': '#2563eb'
  }
};

class ThemeManager {
  constructor() {
    this.storageKey = 'ff-theme-preference';
    this.currentTheme = null;
    this.callbacks = [];
    this.init();
  }

  init() {
    this.currentTheme = localStorage.getItem(this.storageKey) || this.getSystemTheme();
    this.applyTheme(this.currentTheme);

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (this.isSystemDefault()) {
        this.currentTheme = e.matches ? 'dark' : 'light';
        this.applyTheme(this.currentTheme);
        this.notifyCallbacks();
      }
    });
  }

  applyTheme(theme) {
    const isDark = theme === 'dark';
    const colors = THEME_COLORS[isDark ? 'dark' : 'light'];
    const root = document.documentElement;

    Object.entries(colors).forEach(([name, value]) => {
      root.style.setProperty(name, value);
    });

    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
      themeColorMeta.content = isDark ? '#1a1a1a' : '#ffffff';
    }
  }

  toggle() {
    this.setTheme(this.currentTheme === 'dark' ? 'light' : 'dark');
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
    this.currentTheme = this.getSystemTheme();
    this.applyTheme(this.currentTheme);
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
    this.callbacks.forEach((callback) => {
      try {
        callback(this.currentTheme);
      } catch (error) {
        console.error('Theme callback error:', error);
      }
    });
  }
}

export default new ThemeManager();
