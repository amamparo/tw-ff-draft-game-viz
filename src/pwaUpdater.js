// PWA update detection and management
class PWAUpdater {
  constructor() {
    this.registration = null;
    this.updateAvailable = false;
    this.updateCallbacks = [];
  }

  async init() {
    if ('serviceWorker' in navigator) {
      try {
        this.registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered successfully');

        // Listen for updates
        this.registration.addEventListener('updatefound', () => {
          console.log('Update found, installing new service worker');
          const newWorker = this.registration.installing;
          
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('Update available - new content is available');
              this.updateAvailable = true;
              this.notifyUpdateCallbacks();
            }
          });
        });

        // Check for updates periodically
        this.startUpdateChecker();

        // Listen for messages from service worker
        navigator.serviceWorker.addEventListener('message', event => {
          if (event.data && event.data.type === 'UPDATE_AVAILABLE') {
            this.updateAvailable = true;
            this.notifyUpdateCallbacks();
          }
        });

      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    } else {
      console.log('Service Worker not supported');
    }
  }

  // Check for updates every 30 minutes
  startUpdateChecker() {
    const checkForUpdates = async () => {
      if (this.registration) {
        try {
          await this.registration.update();
          console.log('Checked for service worker updates');
        } catch (error) {
          console.warn('Update check failed:', error);
        }
      }
    };

    // Initial check after 1 minute
    setTimeout(checkForUpdates, 60000);
    
    // Then check every 30 minutes
    setInterval(checkForUpdates, 30 * 60 * 1000);
  }

  // Register callback for when updates are available
  onUpdateAvailable(callback) {
    this.updateCallbacks.push(callback);
    
    // If update is already available, call immediately
    if (this.updateAvailable) {
      callback();
    }
  }

  // Notify all callbacks that an update is available
  notifyUpdateCallbacks() {
    this.updateCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Update callback error:', error);
      }
    });
  }

  // Apply the pending update
  async applyUpdate() {
    if (!this.registration || !this.updateAvailable) {
      console.log('No update available to apply');
      return false;
    }

    const waitingWorker = this.registration.waiting;
    if (waitingWorker) {
      // Tell the waiting service worker to skip waiting
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
      
      // Wait for the new service worker to become active
      return new Promise((resolve) => {
        const handleControllerChange = () => {
          navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
          console.log('Service Worker updated successfully');
          resolve(true);
        };
        
        navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
        
        // Timeout after 5 seconds
        setTimeout(() => {
          navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
          resolve(false);
        }, 5000);
      });
    }

    return false;
  }

  // Reload the page to apply updates
  async updateAndReload() {
    const updated = await this.applyUpdate();
    if (updated) {
      // Small delay to ensure service worker is ready
      setTimeout(() => {
        window.location.reload();
      }, 100);
    } else {
      // Force reload anyway
      window.location.reload();
    }
  }

  // Show update notification UI
  showUpdateNotification() {
    // Create a simple notification banner
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #2a2a2a;
      color: #e0e0e0;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      border: 1px solid #4a9eff;
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 14px;
      max-width: 90vw;
      text-align: center;
    `;

    notification.innerHTML = `
      <div style="margin-bottom: 8px;">🔄 App update available!</div>
      <button id="update-btn" style="
        background: #4a9eff;
        color: white;
        border: none;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        margin-right: 8px;
      ">Update Now</button>
      <button id="dismiss-btn" style="
        background: transparent;
        color: #ccc;
        border: 1px solid #666;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
      ">Later</button>
    `;

    document.body.appendChild(notification);

    // Handle button clicks
    const updateBtn = notification.querySelector('#update-btn');
    const dismissBtn = notification.querySelector('#dismiss-btn');

    updateBtn.addEventListener('click', () => {
      this.updateAndReload();
      document.body.removeChild(notification);
    });

    dismissBtn.addEventListener('click', () => {
      document.body.removeChild(notification);
    });

    // Auto-dismiss after 30 seconds
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 30000);
  }
}

export default new PWAUpdater();