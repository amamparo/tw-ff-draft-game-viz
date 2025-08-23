import App from './App.svelte';
import themeManager from './themeManager.js';

const app = new App({
	target: document.body
});

// Initialize theme manager
themeManager.init();

export default app;