// Proxy performance tracking and adaptive selection
class ProxyPerformanceTracker {
  constructor() {
    this.storageKey = 'ff-proxy-performance';
    this.performance = this.loadPerformance();
    this.currentSession = new Map(); // Track current session performance
    
    // Perform cleanup on initialization
    this.performMaintenance();
    
    // Schedule periodic maintenance every 30 minutes
    setInterval(() => this.performMaintenance(), 30 * 60 * 1000);
  }

  // Load historical performance data from localStorage
  loadPerformance() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        return new Map(JSON.parse(stored));
      }
    } catch (error) {
      console.warn('Failed to load proxy performance data:', error);
    }
    return new Map();
  }

  // Save performance data to localStorage
  savePerformance() {
    try {
      const data = Array.from(this.performance.entries());
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save proxy performance data:', error);
    }
  }

  // Record a successful proxy request
  recordSuccess(proxyUrl, responseTime, dataSize = 0) {
    const key = this.getProxyKey(proxyUrl);
    const current = this.performance.get(key) || {
      successCount: 0,
      failCount: 0,
      avgResponseTime: 0,
      totalResponseTime: 0,
      lastUsed: 0,
      blocked: false,
      reliability: 0
    };

    current.successCount++;
    current.totalResponseTime += responseTime;
    current.avgResponseTime = current.totalResponseTime / current.successCount;
    current.lastUsed = Date.now();
    current.blocked = false;
    current.reliability = this.calculateReliability(current);

    this.performance.set(key, current);
    this.savePerformance();

    // Track session performance
    const sessionData = this.currentSession.get(key) || { successes: 0, failures: 0 };
    sessionData.successes++;
    this.currentSession.set(key, sessionData);
  }

  // Record a failed proxy request
  recordFailure(proxyUrl, errorType = 'unknown') {
    const key = this.getProxyKey(proxyUrl);
    const current = this.performance.get(key) || {
      successCount: 0,
      failCount: 0,
      avgResponseTime: 0,
      totalResponseTime: 0,
      lastUsed: 0,
      blocked: false,
      reliability: 0
    };

    current.failCount++;
    current.lastUsed = Date.now();
    
    // Only mark as blocked after multiple 403/401 errors, not on first failure
    if ((errorType === '403' || errorType === '401') && current.failCount >= 3) {
      current.blocked = true;
    }
    // Network errors are less likely to be permanent blocks
    if (errorType === 'network' && current.failCount >= 5 && current.successCount === 0) {
      current.blocked = true;
    }

    current.reliability = this.calculateReliability(current);

    this.performance.set(key, current);
    this.savePerformance();

    // Track session performance
    const sessionData = this.currentSession.get(key) || { successes: 0, failures: 0 };
    sessionData.failures++;
    this.currentSession.set(key, sessionData);
  }

  // Calculate reliability score (0-1)
  calculateReliability(stats) {
    const total = stats.successCount + stats.failCount;
    if (total === 0) return 0.5; // Neutral for untested proxies

    const successRate = stats.successCount / total;
    const recencyBonus = this.getRecencyBonus(stats.lastUsed);
    const speedBonus = this.getSpeedBonus(stats.avgResponseTime);
    const recoveryBonus = this.getRecoveryBonus(stats);
    
    let reliability = successRate * 0.6 + recencyBonus * 0.2 + speedBonus * 0.1 + recoveryBonus * 0.1;
    
    // Penalize blocked proxies, but not as heavily if they're old blocks
    if (stats.blocked) {
      const blockAge = this.getBlockAge(stats.lastUsed);
      const penalty = Math.max(0.1, 1 - blockAge); // Less penalty for older blocks
      reliability *= penalty;
    }

    return Math.max(0, Math.min(1, reliability));
  }

  // Bonus for recently successful proxies
  getRecencyBonus(lastUsed) {
    if (!lastUsed) return 0;
    const hoursSinceUse = (Date.now() - lastUsed) / (1000 * 60 * 60);
    return Math.max(0, 1 - hoursSinceUse / 24); // Linear decay over 24 hours
  }

  // Bonus for faster proxies
  getSpeedBonus(avgResponseTime) {
    if (!avgResponseTime) return 0.5;
    // Good response time is under 3 seconds, bad is over 10 seconds
    if (avgResponseTime < 3000) return 1;
    if (avgResponseTime > 10000) return 0;
    return 1 - (avgResponseTime - 3000) / 7000;
  }

  // Recovery bonus for proxies that might have recovered from temporary issues
  getRecoveryBonus(stats) {
    if (!stats.blocked || !stats.lastUsed) return 0;
    
    // If it's been more than 1 hour since last failure, give recovery bonus
    const hoursSinceBlock = (Date.now() - stats.lastUsed) / (1000 * 60 * 60);
    if (hoursSinceBlock > 1) {
      return Math.min(0.3, hoursSinceBlock * 0.1); // Up to 30% bonus after 3+ hours
    }
    return 0;
  }

  // Calculate how old a block is (0-1, where 1 is very old)
  getBlockAge(lastUsed) {
    if (!lastUsed) return 0;
    const hoursSinceBlock = (Date.now() - lastUsed) / (1000 * 60 * 60);
    return Math.min(1, hoursSinceBlock / 24); // Full age bonus after 24 hours
  }

  // Get proxy identifier from URL
  getProxyKey(proxyUrl) {
    try {
      const url = new URL(proxyUrl);
      return url.hostname;
    } catch {
      return proxyUrl.split('/')[2] || proxyUrl;
    }
  }

  // Get ordered list of proxies by performance
  getOrderedProxies(proxyUrls) {
    const scored = proxyUrls.map(url => {
      const key = this.getProxyKey(url);
      const stats = this.performance.get(key);
      const reliability = stats ? stats.reliability : 0.5;
      
      return {
        url,
        key,
        reliability,
        stats: stats || null
      };
    });

    // Sort by reliability (descending), with some randomization for equal scores
    return scored.sort((a, b) => {
      const diff = b.reliability - a.reliability;
      if (Math.abs(diff) < 0.1) {
        // Add small random factor for proxies with similar scores
        return (Math.random() - 0.5) * 0.2;
      }
      return diff;
    });
  }

  // Check if a proxy might be blocked
  isLikelyBlocked(proxyUrl) {
    const key = this.getProxyKey(proxyUrl);
    const stats = this.performance.get(key);
    
    // Never block untested proxies
    if (!stats) return false;
    
    // Auto-unblock proxies that have been blocked for over 2 hours
    if (stats.blocked && stats.lastUsed) {
      const hoursSinceBlock = (Date.now() - stats.lastUsed) / (1000 * 60 * 60);
      if (hoursSinceBlock > 2) {
        console.log(`Auto-unblocking ${key} after ${Math.round(hoursSinceBlock)} hours`);
        stats.blocked = false;
        stats.reliability = this.calculateReliability(stats);
        this.savePerformance();
        return false;
      }
    }
    
    // Only consider blocked if we have strong evidence AND it's recent
    if (stats.blocked && stats.failCount > stats.successCount && stats.failCount >= 3) {
      const hoursSinceBlock = (Date.now() - stats.lastUsed) / (1000 * 60 * 60);
      // Reduce blocking strictness over time
      const requiredFailures = Math.max(3, Math.round(3 + hoursSinceBlock));
      if (stats.failCount >= requiredFailures) {
        return true;
      }
    }
    
    // Consider blocked if recent session has many consecutive failures (but not permanently)
    const sessionData = this.currentSession.get(key);
    if (sessionData && sessionData.failures >= 7 && sessionData.successes === 0) {
      return true;
    }

    // If overall success rate is very low with enough attempts (but give chances for recovery)
    const total = stats.successCount + stats.failCount;
    if (total >= 10 && stats.successCount / total < 0.05) {
      return true;
    }

    return false;
  }

  // Get performance summary for debugging
  getPerformanceSummary() {
    const summary = {};
    for (const [key, stats] of this.performance.entries()) {
      summary[key] = {
        reliability: Math.round(stats.reliability * 100) / 100,
        successRate: `${stats.successCount}/${stats.successCount + stats.failCount}`,
        avgResponseTime: Math.round(stats.avgResponseTime),
        blocked: stats.blocked,
        lastUsed: stats.lastUsed ? new Date(stats.lastUsed).toISOString() : 'never'
      };
    }
    return summary;
  }

  // Reset blocked status for all proxies
  resetBlocked() {
    for (const [key, stats] of this.performance.entries()) {
      if (stats.blocked) {
        stats.blocked = false;
        stats.reliability = this.calculateReliability(stats);
        console.log(`Reset blocked status for ${key}`);
      }
    }
    this.currentSession.clear();
    this.savePerformance();
  }

  // Perform maintenance to keep data healthy
  performMaintenance() {
    let maintenanceActions = 0;
    
    for (const [key, stats] of this.performance.entries()) {
      let modified = false;
      
      // Auto-unblock old blocks (redundant check, but good for maintenance)
      if (stats.blocked && stats.lastUsed) {
        const hoursSinceBlock = (Date.now() - stats.lastUsed) / (1000 * 60 * 60);
        if (hoursSinceBlock > 2) {
          stats.blocked = false;
          modified = true;
          maintenanceActions++;
        }
      }
      
      // Reset extreme failure counts to prevent permanent blacklisting
      if (stats.failCount > 20 && stats.successCount === 0) {
        // Keep some failure history but make it recoverable
        stats.failCount = Math.min(10, stats.failCount);
        modified = true;
        maintenanceActions++;
      }
      
      // If data is very old (over 7 days), reduce its weight
      if (stats.lastUsed && stats.lastUsed < Date.now() - (7 * 24 * 60 * 60 * 1000)) {
        stats.successCount = Math.ceil(stats.successCount * 0.8);
        stats.failCount = Math.ceil(stats.failCount * 0.8);
        modified = true;
        maintenanceActions++;
      }
      
      if (modified) {
        stats.reliability = this.calculateReliability(stats);
      }
    }
    
    if (maintenanceActions > 0) {
      console.log(`Proxy maintenance: performed ${maintenanceActions} cleanup actions`);
      this.savePerformance();
    }
    
    // Clear old session data
    this.currentSession.clear();
  }

  // Reset performance data (for debugging)
  reset() {
    this.performance.clear();
    this.currentSession.clear();
    localStorage.removeItem(this.storageKey);
    console.log('Proxy performance data reset');
  }
}

export default new ProxyPerformanceTracker();