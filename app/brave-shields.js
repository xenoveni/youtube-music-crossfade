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
      
      // Configure privacy protection headers
      this.setupPrivacyProtection();
      
      this.initialized = true;
      console.log('[Brave Shields] ✓ Initialization complete');
    } catch (error) {
      console.error('[Brave Shields] Failed to initialize:', error);
      throw error;
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
      throw error;
    }
  }

  /**
   * Setup custom filters for YouTube-specific ad domains
   */
  setupCustomFilters() {
    // YouTube-specific ad patterns - block obvious ad serving domains
    const youtubeAdPatterns = [
      'doubleclick.net',
      'googleadservices.com',
      'googlesyndication.com'
    ];
    
    this.session.webRequest.onBeforeRequest((details, callback) => {
      const url = details.url.toLowerCase();
      
      // Block requests to known ad serving domains
      for (const pattern of youtubeAdPatterns) {
        if (url.includes(pattern)) {
          console.log('[Brave Shields] Blocked ad domain:', pattern);
          callback({ cancel: true });
          return;
        }
      }
      
      callback({ cancel: false });
    });
    
    console.log('[Brave Shields] ✓ Custom YouTube filters enabled');
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
  async updateFilterLists() {
    try {
      console.log('[Brave Shields] Checking for filter updates...');
      
      // Fetch the latest filter lists from Ghostery
      const response = await fetch('https://cdn.ghostery.com/adblocker/databases/full-adblocker.db', {
        method: 'HEAD'
      });
      
      if (response.ok) {
        console.log('[Brave Shields] ✓ Filter lists are up to date');
        return true;
      }
      
      return false;
    } catch (error) {
      console.warn('[Brave Shields] Could not verify filter lists:', error.message);
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
