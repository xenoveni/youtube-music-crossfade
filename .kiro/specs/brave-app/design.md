# Design Document

## Overview

The Brave-powered YouTube Music Crossfade application is a desktop music player that combines Electron's cross-platform capabilities with Brave's superior ad-blocking and privacy protection. The application maintains the existing crossfade functionality while replacing the Ghostery ad-blocker with Brave's native shields technology.

The architecture follows a main-renderer process pattern typical of Electron applications, with two webview instances sharing a session partition for unified authentication. The Brave integration occurs at the session level, where filter lists and privacy rules are applied before content loads, providing more effective ad-blocking than DOM-based approaches.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Main Process (Node.js)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   App        │  │   Brave      │  │   Settings       │  │
│  │   Lifecycle  │  │   Shields    │  │   Manager        │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│         │                  │                   │             │
│         └──────────────────┴───────────────────┘             │
│                            │                                 │
│                    IPC Communication                         │
│                            │                                 │
└────────────────────────────┼─────────────────────────────────┘
                             │
┌────────────────────────────┼─────────────────────────────────┐
│                  Renderer Process (Browser)                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Main Window (index.html)                 │   │
│  │  ┌────────────────────┐  ┌────────────────────┐     │   │
│  │  │   Webview 1        │  │   Webview 2        │     │   │
│  │  │   (YT Music)       │  │   (YT Music)       │     │   │
│  │  │   + Brave Shields  │  │   + Brave Shields  │     │   │
│  │  └────────────────────┘  └────────────────────┘     │   │
│  │                                                       │   │
│  │  ┌────────────────────────────────────────────────┐ │   │
│  │  │        Crossfade Manager                       │ │   │
│  │  │  - Playback monitoring                         │ │   │
│  │  │  - Volume control                              │ │   │
│  │  │  - Transition orchestration                    │ │   │
│  │  └────────────────────────────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

### Process Communication

- **Main → Renderer**: Settings updates, reload commands, update notifications
- **Renderer → Main**: Settings save requests, update checks
- **Renderer Internal**: Crossfade status events, countdown updates

## Components and Interfaces

### 1. Main Process Components

#### BraveShieldsManager

Responsible for initializing and managing Brave's ad-blocking and privacy features.

```javascript
class BraveShieldsManager {
  constructor(session)
  
  // Initialize Brave shields with filter lists
  async initialize(): Promise<void>
  
  // Enable ad-blocking in the session
  async enableAdBlocking(): Promise<void>
  
  // Setup custom YouTube-specific filters
  setupCustomFilters(): void
  
  // Configure privacy protection headers
  setupPrivacyProtection(): void
  
  // Check and update filter lists
  async updateFilterLists(): Promise<boolean>
}
```

**Key Responsibilities:**
- Load and apply Brave filter lists (EasyList, EasyPrivacy, Brave-specific)
- Block ad-serving domains at the network level
- Inject privacy headers (DNT, Sec-GPC)
- Remove tracking headers (X-Client-Data, X-Goog-Visitor-Id)
- Maintain filter list updates

#### SettingsManager

Manages application settings persistence and retrieval.

```javascript
class SettingsManager {
  constructor(settingsPath: string)
  
  // Load settings from disk
  loadSettings(): Settings
  
  // Save settings to disk
  saveSettings(settings: Settings): void
  
  // Get current settings
  getSettings(): Settings
  
  // Update specific setting
  updateSetting(key: string, value: any): void
}
```

**Settings Schema:**
```typescript
interface Settings {
  fadeOutDuration: number;  // 5-30 seconds
  fadeInDuration: number;   // 5-30 seconds
  isEnabled: boolean;       // Crossfade on/off
  skipSilence: boolean;     // Detect silence at song end
}
```

#### WindowManager

Manages application windows (main, settings, login).

```javascript
class WindowManager {
  constructor()
  
  // Create main application window
  createMainWindow(): BrowserWindow
  
  // Create settings modal window
  createSettingsWindow(parent: BrowserWindow): BrowserWindow
  
  // Create login window with shared session
  createLoginWindow(parent: BrowserWindow): BrowserWindow
  
  // Create application menu
  createMenu(mainWindow: BrowserWindow): void
}
```

### 2. Renderer Process Components

#### CrossfadeManager

Core component managing audio transitions between players.

```javascript
class CrossfadeManager {
  constructor(webview1: Webview, webview2: Webview)
  
  // Initialize and start monitoring
  async init(): Promise<void>
  
  // Update crossfade settings
  updateSettings(settings: Settings): void
  
  // Get playback info from webview
  async getPlaybackInfo(webview: Webview): Promise<PlaybackInfo>
  
  // Execute crossfade transition
  async executeCrossfade(
    fromWebview: Webview,
    toWebview: Webview,
    fromNum: number,
    toNum: number
  ): Promise<void>
  
  // Prepare inactive player for next crossfade
  async prepareInactivePlayer(
    webview: Webview,
    playerNum: number
  ): Promise<void>
  
  // Monitor playback state
  async monitorPlayback(): Promise<void>
  
  // Trigger manual crossfade
  async triggerManualCrossfade(): Promise<void>
  
  // Control methods
  async setVolume(webview: Webview, volume: number): Promise<boolean>
  async play(webview: Webview): Promise<boolean>
  async pause(webview: Webview): Promise<boolean>
  async skipToNext(webview: Webview): Promise<boolean>
}
```

**PlaybackInfo Schema:**
```typescript
interface PlaybackInfo {
  currentTime: number;      // Current playback position in seconds
  duration: number;         // Total song duration in seconds
  isPlaying: boolean;       // Whether audio is playing
  volume: number;           // Current volume (0-100)
  songTitle: string | null; // Current song title
  hasEndingSilence: boolean; // Whether song ends with silence
}
```

#### UIController

Manages UI updates and user interactions.

```javascript
class UIController {
  constructor()
  
  // Update status indicator
  updateStatus(state: StatusState, message: string): void
  
  // Update active player visual indicator
  updateActivePlayer(playerNum: number): void
  
  // Update countdown display
  updateCountdown(seconds: number): void
  
  // Setup event listeners
  setupEventListeners(): void
  
  // Handle navigation button clicks
  handleNavigation(action: string, playerNum: number): void
}
```

**StatusState Enum:**
```typescript
enum StatusState {
  READY = 'ready',
  ACTIVE = 'active',
  CROSSFADING = 'crossfading'
}
```

## Data Models

### Settings

Persisted to `{userData}/settings.json`

```typescript
interface Settings {
  fadeOutDuration: number;  // Range: 5-30, Default: 15
  fadeInDuration: number;   // Range: 5-30, Default: 15
  isEnabled: boolean;       // Default: false
  skipSilence: boolean;     // Default: false
}
```

### PlaybackState

Runtime state maintained by CrossfadeManager

```typescript
interface PlaybackState {
  currentLeader: number;           // 1 or 2
  crossfadeActive: boolean;        // Whether transition in progress
  lastSongTitles: {                // Track song changes
    1: string | null;
    2: string | null;
  };
  timeUntilCrossfade: number;      // Countdown in seconds
  monitoringInterval: NodeJS.Timer | null;
}
```

### WebviewExecutionContext

Context for executing JavaScript in webviews

```typescript
interface WebviewExecutionContext {
  webview: Webview;
  code: string;
  timeout?: number;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property Reflection

After reviewing all testable properties from the prework analysis, several redundancies were identified:

**Redundant Properties:**
- Properties 2.3, 2.4, and 7.5 all test post-crossfade state transitions and can be combined into a single comprehensive property
- Properties 2.1 and 2.2 both test volume transitions during crossfade and can be combined
- Properties 5.1 and 5.2 both test HTTP header modifications and can be combined
- Properties 6.1, 6.2, 6.3, 6.4 all test navigation controls and can be combined into one property about navigation isolation
- Properties 8.1, 8.3, and 8.5 all test UI status updates and can be combined

**Combined Properties:**
These redundant properties will be consolidated in the correctness properties section below to eliminate duplication while maintaining comprehensive validation coverage.

### Correctness Properties

Property 1: Window resize maintains split ratio
*For any* window dimensions, both webviews should maintain equal width (50-50 split)
**Validates: Requirements 1.4**

Property 2: Crossfade volume transitions
*For any* crossfade event, the active player's volume should decrease from 100% to 0% while the inactive player's volume increases from 0% to 100% simultaneously
**Validates: Requirements 2.1, 2.2**

Property 3: Crossfade state transition
*For any* completed crossfade, the previously inactive player should become the new active player, and the previously active player should be paused and advanced to the next song
**Validates: Requirements 2.3, 2.4, 7.5**

Property 4: Inactive player invariant
*For any* point in time when a player is designated as inactive, that player should be paused and have volume set to 0%
**Validates: Requirements 2.5**

Property 5: Settings persistence round-trip
*For any* settings values, saving to disk and then loading should return equivalent settings values
**Validates: Requirements 3.3, 3.4**

Property 6: Crossfade enable toggle
*For any* crossfade enable state (on/off), the monitoring behavior should match that state (monitoring active when enabled, inactive when disabled)
**Validates: Requirements 3.5**

Property 7: Ad domain blocking
*For any* network request to known ad-serving domains (doubleclick.net, googleadservices.com, googlesyndication.com), the request should be blocked before content loads
**Validates: Requirements 4.2, 4.4**

Property 8: Ad element removal
*For any* page load, DOM elements matching ad filter patterns should not be present in the final rendered page
**Validates: Requirements 4.3**

Property 9: Privacy header modification
*For any* HTTP request, DNT and Sec-GPC headers should be present, and X-Client-Data and X-Goog-Visitor-Id headers should be absent
**Validates: Requirements 5.1, 5.2**

Property 10: Tracking script blocking
*For any* page load, scripts matching known tracking and fingerprinting patterns should be blocked
**Validates: Requirements 5.3, 5.5**

Property 11: Navigation isolation
*For any* navigation action (back, forward, reload, home) on one player, the other player's URL and state should remain unchanged
**Validates: Requirements 6.5**

Property 12: Manual crossfade timing
*For any* manual crossfade trigger, the transition duration should equal the configured fade-in duration setting
**Validates: Requirements 7.2**

Property 13: Crossfade mutual exclusion
*For any* crossfade in progress, attempting to trigger another crossfade should be rejected until the current transition completes
**Validates: Requirements 7.3**

Property 14: Crossfade button state
*For any* application state where no player is active, the "Crossfade Now" button should be disabled
**Validates: Requirements 7.4**

Property 15: UI status updates
*For any* change in active player or crossfade state, the UI status indicator and active player highlight should update to reflect the new state
**Validates: Requirements 8.1, 8.3, 8.5**

Property 16: Countdown accuracy
*For any* playback state within the fade-out trigger window, the displayed countdown should match the remaining time until crossfade (±1 second tolerance)
**Validates: Requirements 8.2**

Property 17: Session persistence round-trip
*For any* authenticated session, restarting the application should maintain the authenticated state without requiring re-login
**Validates: Requirements 9.5**

Property 18: Monitoring frequency
*For any* one-second interval when crossfading is enabled, the system should poll both webviews exactly once for playback information
**Validates: Requirements 10.1**

Property 19: Playback info completeness
*For any* successful webview poll, the returned playback information should contain all required fields (currentTime, duration, isPlaying, volume, songTitle)
**Validates: Requirements 10.2**

Property 20: Single player invariant
*For any* application state, at most one player should be playing audio (volume > 0 and not paused) at any given time
**Validates: Requirements 10.3**

Property 21: Automatic crossfade trigger
*For any* playback state where remaining time equals the fade-out duration, an automatic crossfade should be triggered
**Validates: Requirements 10.4**

Property 22: Menu action execution
*For any* menu item selection, the corresponding action (open settings, open login, exit, open DevTools) should execute
**Validates: Requirements 12.2, 12.3, 12.4, 12.5**

## Error Handling

### Network Errors

**Scenario**: Webview fails to load YouTube Music
- **Detection**: Monitor webview `did-fail-load` events
- **Response**: Display error message in webview, provide reload button
- **Recovery**: Allow user to manually reload or check internet connection

**Scenario**: Ad filter list download fails
- **Detection**: Catch exceptions during filter list fetch
- **Response**: Log warning, continue with cached/embedded filter lists
- **Recovery**: Retry on next application launch

### Playback Errors

**Scenario**: Unable to extract playback information from webview
- **Detection**: `getPlaybackInfo()` returns null or incomplete data
- **Response**: Skip monitoring cycle, continue polling
- **Recovery**: Retry on next monitoring interval (1 second)

**Scenario**: Volume control fails
- **Detection**: `setVolume()` returns false
- **Response**: Log error, abort current crossfade
- **Recovery**: Reset both players to known state, resume monitoring

**Scenario**: Song duration is invalid or too short
- **Detection**: Duration < 10 seconds or duration is NaN
- **Response**: Skip crossfade for this song
- **Recovery**: Continue monitoring for next song

### Settings Errors

**Scenario**: Settings file is corrupted
- **Detection**: JSON parse error when loading settings
- **Response**: Use default settings, log error
- **Recovery**: Overwrite corrupted file with defaults on next save

**Scenario**: Settings file cannot be written
- **Detection**: File system error during save
- **Response**: Display error notification to user
- **Recovery**: Retry on next settings change, check disk space/permissions

### Webview Errors

**Scenario**: Webview crashes or becomes unresponsive
- **Detection**: Monitor webview `crashed` and `unresponsive` events
- **Response**: Display error overlay, provide reload option
- **Recovery**: Reload webview, restore session

**Scenario**: JavaScript execution in webview fails
- **Detection**: `executeJavaScript()` throws exception
- **Response**: Log error, return null
- **Recovery**: Continue with next monitoring cycle

## Testing Strategy

### Unit Testing

The application will use **Jest** as the testing framework for unit tests. Unit tests will focus on:

**SettingsManager Tests:**
- Loading default settings when file doesn't exist
- Parsing valid settings JSON
- Handling corrupted settings files
- Saving settings to disk
- Updating individual settings

**BraveShieldsManager Tests:**
- Filter list loading and parsing
- Custom filter rule application
- Header modification logic
- Domain blocking patterns

**CrossfadeManager Tests:**
- Volume calculation during transitions
- State transitions (active/inactive player switching)
- Countdown calculation
- Playback info extraction from mock webviews
- Manual crossfade triggering

**UIController Tests:**
- Status message formatting
- Countdown display formatting
- Button state management

### Property-Based Testing

The application will use **fast-check** (JavaScript property-based testing library) as the PBT framework. Each property-based test will run a minimum of 100 iterations to ensure comprehensive coverage.

**Configuration:**
```javascript
import fc from 'fast-check';

// Configure all property tests to run 100+ iterations
const PBT_CONFIG = { numRuns: 100 };
```

**Property Test Requirements:**
- Each property-based test MUST be tagged with a comment referencing the design document property
- Tag format: `// Feature: brave-app, Property {number}: {property_text}`
- Each correctness property MUST be implemented by a SINGLE property-based test
- Tests should use smart generators that constrain inputs to valid ranges

**Example Property Test Structure:**
```javascript
// Feature: brave-app, Property 5: Settings persistence round-trip
test('settings round-trip preserves values', () => {
  fc.assert(
    fc.property(
      fc.record({
        fadeOutDuration: fc.integer({ min: 5, max: 30 }),
        fadeInDuration: fc.integer({ min: 5, max: 30 }),
        isEnabled: fc.boolean(),
        skipSilence: fc.boolean()
      }),
      (settings) => {
        const manager = new SettingsManager(tempPath);
        manager.saveSettings(settings);
        const loaded = manager.loadSettings();
        expect(loaded).toEqual(settings);
      }
    ),
    PBT_CONFIG
  );
});
```

**Property Test Coverage:**
- Property 1: Window resize (generate random dimensions, verify split ratio)
- Property 2: Volume transitions (generate crossfade events, verify simultaneous volume changes)
- Property 3: State transitions (generate crossfades, verify player role swap)
- Property 4: Inactive player invariant (generate application states, verify inactive player is paused at 0%)
- Property 5: Settings round-trip (generate random settings, verify save/load preserves values)
- Property 7: Ad domain blocking (generate URLs with ad domains, verify blocking)
- Property 9: Header modification (generate HTTP requests, verify header presence/absence)
- Property 11: Navigation isolation (generate navigation actions, verify other player unchanged)
- Property 12: Manual crossfade timing (generate fade-in durations, verify transition matches)
- Property 16: Countdown accuracy (generate playback states, verify countdown calculation)
- Property 18: Monitoring frequency (verify polling occurs once per second)
- Property 19: Playback info completeness (verify all fields present in poll results)
- Property 20: Single player invariant (generate application states, verify at most one player active)

### Integration Testing

Integration tests will verify end-to-end workflows:

**Crossfade Workflow:**
1. Launch application
2. Load both webviews
3. Start playback in player 1
4. Wait for crossfade trigger
5. Verify smooth transition to player 2
6. Verify player 1 is paused and advanced

**Settings Workflow:**
1. Open settings window
2. Modify fade durations
3. Save settings
4. Restart application
5. Verify settings persisted

**Ad-Blocking Workflow:**
1. Launch application
2. Load YouTube Music in webviews
3. Monitor network requests
4. Verify ad domains are blocked
5. Verify ad elements are removed from DOM

### Test Utilities

**Mock Webview:**
```javascript
class MockWebview {
  constructor() {
    this.url = '';
    this.volume = 100;
    this.paused = true;
  }
  
  async executeJavaScript(code) {
    // Simulate playback info extraction
  }
  
  loadURL(url) {
    this.url = url;
  }
}
```

**Playback State Generator:**
```javascript
const playbackStateArbitrary = fc.record({
  currentTime: fc.float({ min: 0, max: 300 }),
  duration: fc.float({ min: 10, max: 300 }),
  isPlaying: fc.boolean(),
  volume: fc.integer({ min: 0, max: 100 }),
  songTitle: fc.string()
});
```

## Implementation Notes

### Brave Integration Approach

Since Electron doesn't natively support Brave's engine, we'll implement Brave-like functionality using:

1. **@cliqz/adblocker-electron** or **@ghostery/adblocker-electron**: Provides Brave-compatible filter list support
2. **Custom filter lists**: Load EasyList, EasyPrivacy, and Brave-specific rules
3. **Session-level blocking**: Apply filters at the session level before content loads
4. **Header injection**: Use `webRequest` API to modify headers

### Performance Considerations

**Monitoring Frequency**: 1-second polling interval balances responsiveness with CPU usage

**Volume Transition Smoothness**: 50ms update interval during crossfade provides smooth audio transitions without excessive CPU load

**Filter List Caching**: Cache filter lists locally to avoid repeated downloads

### Security Considerations

**Webview Isolation**: Use `contextIsolation: true` and `nodeIntegration: false` for security

**Session Partitioning**: Use persistent partition for session sharing while maintaining isolation from main process

**Content Security**: Brave shields provide additional protection against malicious content

### Platform-Specific Notes

**Windows**: Primary target platform, full feature support

**macOS/Linux**: Architecture supports cross-platform deployment with minimal changes (menu structure, keyboard shortcuts)

## Future Enhancements

1. **Automatic Filter Updates**: Periodically check for and download updated filter lists
2. **Customizable Blocking**: Allow users to enable/disable specific filter categories
3. **Statistics Dashboard**: Display blocked ad count, data saved
4. **Playlist Integration**: Automatically queue songs for seamless crossfading
5. **Audio Analysis**: Detect song endings more accurately using audio fingerprinting
6. **Multi-Platform Packaging**: Build installers for macOS and Linux
