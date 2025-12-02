// Brave Shields - Content Script
// Blocks ads at the DOM level using filter lists similar to Brave browser

(function() {
  'use strict';

  console.log('[Brave Shields] Content script initializing...');

  // CSS selectors to hide (from EasyList and uBlock Origin)
  const AD_SELECTORS = [
    // YouTube Music specific
    'ytmusic-player-bar .advertisement',
    '.ytmusic-player-bar[ad-showing]',
    
    // YouTube generic ads
    'ytd-ad-slot-renderer',
    'ytd-promoted-sparkles-web-renderer',
    'ytd-in-feed-ad-layout-renderer',
    'ytd-video-ad-renderer',
    'ytd-display-ad-renderer',
    'ytd-banner-promo-renderer',
    'ytd-statement-banner-renderer',
    'ytd-masthead-ad-renderer',
    'ytd-rich-item-renderer[is-ad]',
    
    // Generic ad containers
    '.ad-container',
    '.ad-showing',
    '.video-ads',
    '[class*="ad-slot"]',
    '[class*="ad-banner"]',
    '[id*="google_ads"]',
    '[id*="ad-container"]',
    
    // Player overlays
    '.ytp-ad-player-overlay',
    '.ytp-ad-overlay-container',
    '.ytp-ad-text-overlay',
    '.ytp-ad-image-overlay',
    '.ytp-ad-module',
    
    // Tracking and analytics
    '[class*="tracking"]',
    '[class*="analytics"]'
  ];

  // Inject CSS to hide ad elements (Brave's approach)
  function injectBlockingCSS() {
    if (document.getElementById('brave-shields-css')) return;
    
    const style = document.createElement('style');
    style.id = 'brave-shields-css';
    style.textContent = `
      /* Brave Shields - Ad Blocking CSS */
      ${AD_SELECTORS.join(',\n')} {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        height: 0 !important;
        width: 0 !important;
        position: absolute !important;
        left: -9999px !important;
      }
      
      /* Block ad iframes */
      iframe[src*="doubleclick"],
      iframe[src*="googleadservices"],
      iframe[src*="googlesyndication"],
      iframe[src*="/ads/"],
      iframe[src*="ad."] {
        display: none !important;
      }
    `;
    
    (document.head || document.documentElement).appendChild(style);
    console.log('[Brave Shields] ✓ Blocking CSS injected');
  }

  // Remove ad elements from DOM
  function removeAdElements() {
    let removedCount = 0;
    
    AD_SELECTORS.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          el.remove();
          removedCount++;
        });
      } catch (e) {
        // Invalid selector, skip
      }
    });
    
    if (removedCount > 0) {
      console.log(`[Brave Shields] Removed ${removedCount} ad elements`);
    }
  }

  // Block ad scripts from loading
  function blockAdScripts() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.tagName === 'SCRIPT') {
            const src = node.src || '';
            const adPatterns = [
              'doubleclick',
              'googleadservices',
              'googlesyndication',
              'googletagservices',
              'google-analytics',
              '/ads/',
              '/pagead/'
            ];
            
            for (const pattern of adPatterns) {
              if (src.includes(pattern)) {
                node.remove();
                console.log('[Brave Shields] Blocked script:', pattern);
                break;
              }
            }
          }
        });
      });
    });
    
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  // Monitor for new ad elements (continuous protection)
  function startMonitoring() {
    const observer = new MutationObserver(() => {
      removeAdElements();
    });
    
    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'id']
    });
    
    console.log('[Brave Shields] ✓ Monitoring for new ads');
  }

  // Override ad-related properties (Brave's approach)
  function overrideAdProperties() {
    // Disable ad-related APIs
    if (window.navigator) {
      // Block ad measurement API
      Object.defineProperty(window.navigator, 'globalPrivacyControl', {
        get: () => true,
        configurable: false
      });
    }
    
    // Override ad-related window properties
    const adProperties = [
      'google_ad_client',
      'google_ad_slot',
      'googletag',
      'adsbygoogle'
    ];
    
    adProperties.forEach(prop => {
      Object.defineProperty(window, prop, {
        get: () => undefined,
        set: () => {},
        configurable: false
      });
    });
    
    console.log('[Brave Shields] ✓ Ad properties overridden');
  }

  // Initialize Brave Shields
  function init() {
    console.log('[Brave Shields] Starting initialization...');
    
    // Apply blocking immediately
    injectBlockingCSS();
    removeAdElements();
    overrideAdProperties();
    blockAdScripts();
    
    // Start continuous monitoring
    if (document.body) {
      startMonitoring();
    } else {
      // Wait for body to be available
      const bodyObserver = new MutationObserver(() => {
        if (document.body) {
          bodyObserver.disconnect();
          startMonitoring();
        }
      });
      bodyObserver.observe(document.documentElement, { childList: true });
    }
    
    // Re-apply blocking periodically (in case YouTube tries to bypass)
    setInterval(() => {
      removeAdElements();
    }, 2000);
    
    console.log('[Brave Shields] ✓ Initialization complete');
  }

  // Start immediately
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Re-initialize on navigation
  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      console.log('[Brave Shields] Page changed, re-initializing...');
      setTimeout(init, 500);
    }
  }).observe(document, { subtree: true, childList: true });

})();
