import App from './App.svelte';
import pwaUpdater from './pwaUpdater.js';

const app = new App({
	target: document.body
});

// Initialize PWA features
pwaUpdater.init();

// Show update notification when available
pwaUpdater.onUpdateAvailable(() => {
	console.log('PWA update available - showing notification');
	pwaUpdater.showUpdateNotification();
});

// Expose performance tracker to window for debugging
if (typeof window !== 'undefined') {
	import('./proxyPerformance.js').then(module => {
		window.proxyPerformance = module.default;
		console.log('Proxy performance tracker available at window.proxyPerformance');
		console.log('Use window.proxyPerformance.getPerformanceSummary() to see stats');
		console.log('Use window.proxyPerformance.resetBlocked() to unblock all proxies');
		console.log('Use window.proxyPerformance.reset() to clear all performance data');
	});
}

export default app;