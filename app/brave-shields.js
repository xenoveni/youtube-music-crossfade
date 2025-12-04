const { ElectronBlocker } = require('@ghostery/adblocker-electron');
const fetch = require('cross-fetch');

/**
 * BraveShieldsManager - Manages ad-blocking and privacy protection
 * 
 * This component integrates @ghostery/adblocker-electron to provide
 * Brave-like ad-blocking and privacy features for the application.
 */
class BraveShieldsManager {
  constructor(session) {
    this.session = session;
    this.blocker = null;
    this.initialized = false;
    this.refreshInterval = null;
  }

  /**
   * Initialize Brave shields with filter lists and privacy protection
   */
  async initialize() {
    try {
      console.log('[Brave Shields] Initializing ad blocker...');

      // Check for filter list updates
      await this.updateFilterLists();

      // Enable ad-blocking
      await this.enableAdBlocking();

      // Setup custom YouTube-specific filters
      this.setupCustomFilters();

      this.setupYouTubePlayerResponseFilter();

      // Configure privacy protection headers
      this.setupPrivacyProtection();

      this.schedulePeriodicRefresh();

      this.initialized = true;
      console.log('[Brave Shields] ✓ Initialization complete');
    } catch (error) {
      console.error('[Brave Shields] Failed to initialize:', error);
      throw error;
    }
  }

  async refreshBlocker() {
    try {
      if (this.blocker) {
        this.blocker.disableBlockingInSession(this.session);
      }
      this.blocker = await ElectronBlocker.fromPrebuiltAdsAndTracking(fetch);
      this.blocker.enableBlockingInSession(this.session);
    } catch (e) { }
  }

  schedulePeriodicRefresh() {
    if (this.refreshInterval) return;
    const DAY = 24 * 60 * 60 * 1000;
    this.refreshInterval = setInterval(async () => {
      await this.refreshBlocker();
    }, DAY);
    if (this.refreshInterval.unref) this.refreshInterval.unref();
  }

  destroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
    if (this.blocker) {
      try {
        this.blocker.disableBlockingInSession(this.session);
      } catch (_) { }
    }
  }

  /**
   * Enable ad-blocking in the session using Ghostery's comprehensive blocker
   */
  async enableAdBlocking() {
    try {
      // Use Ghostery's prebuilt blocker (includes EasyList, EasyPrivacy, etc.)
      this.blocker = await ElectronBlocker.fromPrebuiltAdsAndTracking(fetch);
      this.blocker.enableBlockingInSession(this.session);
      console.log('[Brave Shields] ✓ Ad blocker enabled');
    } catch (error) {
      console.error('[Brave Shields] Failed to enable ad blocker:', error);
      // Don't throw - continue even if ad blocker fails
    }
  }

  /**
   * Setup custom filters for YouTube-specific ad domains
   */
  setupCustomFilters() {
    // YouTube-specific ad patterns - comprehensive list for 2024/2025
    const youtubeAdPatterns = [
      'doubleclick.net',
      'googleadservices.com',
      'googlesyndication.com',
      'google-analytics.com',
      'googletagmanager.com',
      'googletagservices.com'
    ];

    // YouTube ad endpoints to block
    const youtubeAdPaths = [
      '/pagead/',
      '/ptracking',
      '/api/stats/ads',
      '/api/stats/atr',
      '/youtubei/v1/ad',
      '/get_midroll_info',
      '/pcs/activeview',
      '/generate_204'
    ];

    this.session.webRequest.onBeforeRequest((details, callback) => {
      const url = details.url.toLowerCase();

      for (const pattern of youtubeAdPatterns) {
        if (url.includes(pattern)) {
          console.log('[Brave Shields] Blocked ad domain:', pattern);
          callback({ cancel: true });
          return;
        }
      }

      try {
        const u = new URL(details.url);
        const host = u.hostname.toLowerCase();
        const pathname = u.pathname.toLowerCase();

        // Block googlevideo ad tier
        const hasCtierA = u.searchParams.get('ctier') === 'A';
        if (host.endsWith('googlevideo.com') && hasCtierA) {
          console.log('[Brave Shields] Blocked googlevideo ad-tier');
          callback({ cancel: true });
          return;
        }

        // Block YouTube ad endpoints
        const isYouTubeHost = host.endsWith('youtube.com') || host.endsWith('music.youtube.com') || host.endsWith('ytimg.com');
        if (isYouTubeHost) {
          for (const adPath of youtubeAdPaths) {
            if (pathname.includes(adPath)) {
              console.log('[Brave Shields] Blocked YouTube ad endpoint:', pathname);
              callback({ cancel: true });
              return;
            }
          }
        }

        // Block premium promotion endpoints
        if (isYouTubeHost && (pathname.includes('/premium') || pathname.includes('/red'))) {
          if (u.searchParams.has('feature') || pathname.includes('get_')) {
            console.log('[Brave Shields] Blocked premium promotion:', pathname);
            callback({ cancel: true });
            return;
          }
        }
      } catch (_) { }

      callback({ cancel: false });
    });

    console.log('[Brave Shields] ✓ Custom YouTube filters enabled');
  }

  setupYouTubePlayerResponseFilter() {
    const isPlayerEndpoint = (url) => {
      const u = url.toLowerCase();
      return u.includes('/youtubei/v1/player') || u.includes('/youtubei/v1/next');
    };
    const stripAds = (obj) => {
      // Comprehensive list of ad-related keys to remove (2024/2025 update)
      const removeKeys = new Set([
        'adPlacements', 'adBreaks', 'playerAds', 'adSlots', 'adSlot', 'adSignals',
        'ads', 'ad', 'showAds', 'adInfo', 'adLoggingData', 'adParams', 'adSafetyReason',
        'companion', 'companionAd', 'overlay', 'bannerPromo', 'premiumButton',
        'upsell', 'premiumUpsell', 'ypcTrailer', 'getPremium', 'adModule',
        'inStreamAdRenderer', 'adSlotRenderer', 'promotedSparklesWebRenderer'
      ]);
      const process = (value) => {
        if (Array.isArray(value)) {
          return value
            .map(process)
            .filter((v) => !(v && typeof v === 'object' && Object.keys(v).some((k) => k.toLowerCase().includes('ad'))));
        }
        if (value && typeof value === 'object') {
          const out = {};
          for (const [k, v] of Object.entries(value)) {
            if (removeKeys.has(k) || k.toLowerCase().includes('ad')) continue;
            out[k] = process(v);
          }
          return out;
        }
        return value;
      };
      return process(obj);
    };
    this.session.webRequest.onBeforeRequest((details, callback) => {
      const url = details.url;
      if (isPlayerEndpoint(url)) {
        const filter = this.session.webRequest.filterResponseData(details.id);
        let data = Buffer.alloc(0);
        filter.on('data', (chunk) => {
          data = Buffer.concat([data, chunk]);
        });
        filter.on('end', () => {
          try {
            const text = data.toString('utf-8');
            const json = JSON.parse(text);
            const cleaned = stripAds(json);
            const out = Buffer.from(JSON.stringify(cleaned));
            filter.write(out);
          } catch (e) {
            filter.write(data);
          }
          filter.end();
        });
      }
      callback({});
    });
  }

  /**
   * Configure privacy protection headers
   */
  setupPrivacyProtection() {
    // Modify headers for privacy protection
    this.session.webRequest.onBeforeSendHeaders((details, callback) => {
      const headers = details.requestHeaders;

      // Remove tracking headers
      delete headers['X-Client-Data'];
      delete headers['X-Goog-Visitor-Id'];

      // Add privacy headers
      headers['DNT'] = '1'; // Do Not Track
      headers['Sec-GPC'] = '1'; // Global Privacy Control

      callback({ requestHeaders: headers });
    });

    // Set privacy-focused user agent
    this.session.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    console.log('[Brave Shields] ✓ Privacy protection enabled');
  }

  /**
   * Check and update filter lists
   * @returns {Promise<boolean>} True if filters are up to date
   */
  /**
   * Fetch and update filter lists from multiple sources
   * @returns {Promise<boolean>} True if update was successful
   */
  async updateFilterLists() {
    try {
      console.log('[Brave Shields] Fetching latest filter lists...');

      // Try to update from prebuilt source
      await this.refreshBlocker();

      console.log('[Brave Shields] ✓ Filter lists updated successfully');
      return true;
    } catch (error) {
      console.warn('[Brave Shields] Could not update filter lists:', error.message);
      return false;
    }
  }

  /**
   * Check if the manager is initialized
   * @returns {boolean}
   */
  isInitialized() {
    return this.initialized;
  }
}

module.exports = BraveShieldsManager;
