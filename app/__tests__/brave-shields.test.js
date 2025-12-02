const fc = require('fast-check');
const BraveShieldsManager = require('../brave-shields');

const PBT_CONFIG = { numRuns: 100 };

// Mock electron session
class MockSession {
  constructor() {
    this.userAgent = '';
    this.beforeRequestCallbacks = [];
    this.beforeSendHeadersCallbacks = [];
    this.blockedUrls = [];
    this.modifiedHeaders = [];
  }

  setUserAgent(ua) {
    this.userAgent = ua;
  }

  get webRequest() {
    return {
      onBeforeRequest: (callback) => {
        this.beforeRequestCallbacks.push(callback);
      },
      onBeforeSendHeaders: (callback) => {
        this.beforeSendHeadersCallbacks.push(callback);
      }
    };
  }

  // Simulate a network request
  simulateRequest(url) {
    const details = { url };
    let cancelled = false;

    for (const callback of this.beforeRequestCallbacks) {
      callback(details, (result) => {
        if (result.cancel) {
          cancelled = true;
          this.blockedUrls.push(url);
        }
      });
    }

    return !cancelled;
  }

  // Simulate header modification
  simulateHeaderModification(url, headers) {
    const details = { url, requestHeaders: { ...headers } };
    let modifiedHeaders = { ...headers };

    for (const callback of this.beforeSendHeadersCallbacks) {
      callback(details, (result) => {
        modifiedHeaders = result.requestHeaders;
      });
    }

    this.modifiedHeaders.push({ url, headers: modifiedHeaders });
    return modifiedHeaders;
  }
}

// Mock @ghostery/adblocker-electron
jest.mock('@ghostery/adblocker-electron', () => ({
  ElectronBlocker: {
    fromPrebuiltAdsAndTracking: jest.fn(() => Promise.resolve({
      enableBlockingInSession: jest.fn()
    }))
  }
}));

// Mock cross-fetch
jest.mock('cross-fetch', () => jest.fn(() => Promise.resolve({ ok: true })));

describe('BraveShieldsManager', () => {
  let mockSession;

  beforeEach(() => {
    mockSession = new MockSession();
    jest.clearAllMocks();
  });

  describe('Unit Tests', () => {
    test('should initialize successfully', async () => {
      const manager = new BraveShieldsManager(mockSession);
      await manager.initialize();
      
      expect(manager.isInitialized()).toBe(true);
    });

    test('should set privacy-focused user agent', async () => {
      const manager = new BraveShieldsManager(mockSession);
      await manager.initialize();
      
      expect(mockSession.userAgent).toContain('Mozilla/5.0');
      expect(mockSession.userAgent).toContain('Chrome');
    });

    test('should block doubleclick.net domain', async () => {
      const manager = new BraveShieldsManager(mockSession);
      await manager.initialize();
      
      const allowed = mockSession.simulateRequest('https://doubleclick.net/ads');
      expect(allowed).toBe(false);
      expect(mockSession.blockedUrls).toContain('https://doubleclick.net/ads');
    });

    test('should block googleadservices.com domain', async () => {
      const manager = new BraveShieldsManager(mockSession);
      await manager.initialize();
      
      const allowed = mockSession.simulateRequest('https://googleadservices.com/pagead');
      expect(allowed).toBe(false);
    });

    test('should block googlesyndication.com domain', async () => {
      const manager = new BraveShieldsManager(mockSession);
      await manager.initialize();
      
      const allowed = mockSession.simulateRequest('https://googlesyndication.com/safeframe');
      expect(allowed).toBe(false);
    });

    test('should allow non-ad domains', async () => {
      const manager = new BraveShieldsManager(mockSession);
      await manager.initialize();
      
      const allowed = mockSession.simulateRequest('https://music.youtube.com/watch');
      expect(allowed).toBe(true);
    });

    test('should add DNT header', async () => {
      const manager = new BraveShieldsManager(mockSession);
      await manager.initialize();
      
      const headers = mockSession.simulateHeaderModification(
        'https://music.youtube.com',
        { 'User-Agent': 'test' }
      );
      
      expect(headers['DNT']).toBe('1');
    });

    test('should add Sec-GPC header', async () => {
      const manager = new BraveShieldsManager(mockSession);
      await manager.initialize();
      
      const headers = mockSession.simulateHeaderModification(
        'https://music.youtube.com',
        { 'User-Agent': 'test' }
      );
      
      expect(headers['Sec-GPC']).toBe('1');
    });

    test('should remove X-Client-Data header', async () => {
      const manager = new BraveShieldsManager(mockSession);
      await manager.initialize();
      
      const headers = mockSession.simulateHeaderModification(
        'https://music.youtube.com',
        { 'X-Client-Data': 'tracking-data', 'User-Agent': 'test' }
      );
      
      expect(headers['X-Client-Data']).toBeUndefined();
    });

    test('should remove X-Goog-Visitor-Id header', async () => {
      const manager = new BraveShieldsManager(mockSession);
      await manager.initialize();
      
      const headers = mockSession.simulateHeaderModification(
        'https://music.youtube.com',
        { 'X-Goog-Visitor-Id': 'visitor-123', 'User-Agent': 'test' }
      );
      
      expect(headers['X-Goog-Visitor-Id']).toBeUndefined();
    });
  });

  describe('Property-Based Tests', () => {
    // Feature: brave-app, Property 7: Ad domain blocking
    test('ad domain blocking - all requests to known ad domains should be blocked', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            protocol: fc.constantFrom('http', 'https'),
            adDomain: fc.constantFrom('doubleclick.net', 'googleadservices.com', 'googlesyndication.com'),
            path: fc.stringOf(fc.constantFrom('a', 'b', 'c', '/', '-', '_'), { minLength: 1, maxLength: 20 })
          }),
          async (urlParts) => {
            const session = new MockSession();
            const manager = new BraveShieldsManager(session);
            await manager.initialize();
            
            const url = `${urlParts.protocol}://${urlParts.adDomain}${urlParts.path}`;
            const allowed = session.simulateRequest(url);
            
            // All ad domain requests should be blocked
            return !allowed;
          }
        ),
        PBT_CONFIG
      );
    });

    // Feature: brave-app, Property 9: Privacy header modification
    test('privacy header modification - DNT and Sec-GPC present, tracking headers absent', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            url: fc.webUrl(),
            hasClientData: fc.boolean(),
            hasVisitorId: fc.boolean(),
            otherHeaders: fc.dictionary(
              fc.stringOf(fc.constantFrom('A', 'B', 'C', '-'), { minLength: 3, maxLength: 15 }),
              fc.string({ minLength: 1, maxLength: 20 }),
              { minKeys: 0, maxKeys: 3 }
            )
          }),
          async (testCase) => {
            const session = new MockSession();
            const manager = new BraveShieldsManager(session);
            await manager.initialize();
            
            // Build initial headers
            const initialHeaders = { ...testCase.otherHeaders };
            if (testCase.hasClientData) {
              initialHeaders['X-Client-Data'] = 'tracking-data';
            }
            if (testCase.hasVisitorId) {
              initialHeaders['X-Goog-Visitor-Id'] = 'visitor-123';
            }
            
            // Simulate header modification
            const modifiedHeaders = session.simulateHeaderModification(testCase.url, initialHeaders);
            
            // Verify privacy headers are present
            const hasDNT = modifiedHeaders['DNT'] === '1';
            const hasSecGPC = modifiedHeaders['Sec-GPC'] === '1';
            
            // Verify tracking headers are absent
            const noClientData = !modifiedHeaders['X-Client-Data'];
            const noVisitorId = !modifiedHeaders['X-Goog-Visitor-Id'];
            
            return hasDNT && hasSecGPC && noClientData && noVisitorId;
          }
        ),
        PBT_CONFIG
      );
    });
  });
});
