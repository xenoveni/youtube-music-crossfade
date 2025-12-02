# Implementation Plan

- [x] 1. Set up project structure and dependencies





  - Create brave-app directory with proper folder structure
  - Initialize package.json with Electron and required dependencies
  - Install @ghostery/adblocker-electron, cross-fetch, and fast-check for testing
  - Set up Jest testing framework configuration
  - Create basic file structure (main.js, renderer.js, index.html, styles.css)
  - _Requirements: 11.1, 11.2_

- [x] 2. Implement SettingsManager component





  - Create SettingsManager class with load/save functionality
  - Implement default settings initialization
  - Add JSON file persistence to userData directory
  - Handle corrupted settings files with error recovery
  - _Requirements: 3.3, 3.4_

- [x] 2.1 Write property test for SettingsManager


  - **Property 5: Settings persistence round-trip**
  - **Validates: Requirements 3.3, 3.4**

- [x] 3. Implement BraveShieldsManager component





  - Create BraveShieldsManager class for ad-blocking initialization
  - Integrate @ghostery/adblocker-electron with session
  - Implement custom YouTube ad domain blocking (doubleclick, googleadservices, googlesyndication)
  - Add privacy header injection (DNT, Sec-GPC)
  - Remove tracking headers (X-Client-Data, X-Goog-Visitor-Id)
  - Set privacy-focused user agent
  - _Requirements: 4.1, 4.2, 4.4, 5.1, 5.2, 5.4_

- [x] 3.1 Write property test for ad domain blocking


  - **Property 7: Ad domain blocking**
  - **Validates: Requirements 4.2, 4.4**

- [x] 3.2 Write property test for privacy header modification


  - **Property 9: Privacy header modification**
  - **Validates: Requirements 5.1, 5.2**

- [x] 4. Implement WindowManager component





  - Create WindowManager class for window creation and management
  - Implement createMainWindow with proper webview configuration
  - Implement createSettingsWindow as modal dialog
  - Implement createLoginWindow with shared session partition
  - Create application menu with File, View, and Help sections
  - Add menu handlers for settings, login, exit, and DevTools
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [x] 4.1 Write property test for menu action execution


  - **Property 22: Menu action execution**
  - **Validates: Requirements 12.2, 12.3, 12.4, 12.5**

- [x] 5. Create main process entry point





  - Implement main.js with app lifecycle management
  - Initialize SettingsManager on app ready
  - Initialize BraveShieldsManager with session
  - Create main window using WindowManager
  - Set up IPC handlers for get-settings and save-settings
  - Handle app quit and window-all-closed events
  - _Requirements: 1.1, 1.2, 1.5, 9.1, 9.2_

- [x] 6. Build HTML layout and styles


  - Create index.html with split-view layout for two webviews
  - Add player headers with navigation controls (back, forward, reload, home)
  - Add status bar with status indicator, active player display, and countdown
  - Add "Crossfade Now" button
  - Create styles.css with 50-50 split layout, dark theme, and responsive design
  - Implement active player visual highlighting
  - _Requirements: 1.1, 1.4, 6.1, 6.2, 6.3, 6.4, 7.1, 8.1, 8.2, 8.3, 8.4_

- [x] 6.1 Write property test for window resize split ratio


  - **Property 1: Window resize maintains split ratio**
  - **Validates: Requirements 1.4**

- [x] 7. Implement CrossfadeManager core logic


  - Create CrossfadeManager class with webview references
  - Implement getPlaybackInfo to extract playback state from webviews
  - Implement setVolume, play, pause, and skipToNext control methods
  - Add error handling for webview JavaScript execution failures
  - Implement waitForWebviewsReady initialization
  - _Requirements: 2.1, 2.2, 10.2_

- [x] 7.1 Write property test for playback info completeness


  - **Property 19: Playback info completeness**
  - **Validates: Requirements 10.2**

- [x] 8. Implement crossfade execution logic


  - Implement executeCrossfade method with volume transition loop
  - Add 50ms interval for smooth volume changes
  - Implement prepareInactivePlayer to pause and skip to next song
  - Track current leader (active player) state
  - Prevent overlapping crossfades with crossfadeActive flag
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 7.3_

- [x] 8.1 Write property test for crossfade volume transitions


  - **Property 2: Crossfade volume transitions**
  - **Validates: Requirements 2.1, 2.2**

- [x] 8.2 Write property test for crossfade state transition

  - **Property 3: Crossfade state transition**
  - **Validates: Requirements 2.3, 2.4, 7.5**

- [x] 8.3 Write property test for inactive player invariant

  - **Property 4: Inactive player invariant**
  - **Validates: Requirements 2.5**

- [x] 8.4 Write property test for crossfade mutual exclusion

  - **Property 13: Crossfade mutual exclusion**
  - **Validates: Requirements 7.3**

- [x] 9. Implement playback monitoring


  - Implement monitorPlayback method with 1-second polling interval
  - Add logic to detect when both players are playing and pause the non-active one
  - Calculate time until crossfade trigger point
  - Trigger automatic crossfade when remaining time reaches fade-out duration
  - Skip crossfading for songs shorter than 10 seconds
  - Start/stop monitoring based on crossfade enabled setting
  - _Requirements: 10.1, 10.3, 10.4, 10.5_

- [x] 9.1 Write property test for monitoring frequency

  - **Property 18: Monitoring frequency**
  - **Validates: Requirements 10.1**

- [x] 9.2 Write property test for single player invariant

  - **Property 20: Single player invariant**
  - **Validates: Requirements 10.3**

- [x] 9.3 Write property test for automatic crossfade trigger

  - **Property 21: Automatic crossfade trigger**
  - **Validates: Requirements 10.4**

- [x] 10. Implement manual crossfade and countdown



  - Implement triggerManualCrossfade method
  - Add updateCountdown method to dispatch countdown events
  - Implement stopCountdown to clear countdown display
  - Ensure manual crossfade respects fade-in duration setting
  - _Requirements: 7.1, 7.2, 8.2_

- [x] 10.1 Write property test for manual crossfade timing

  - **Property 12: Manual crossfade timing**
  - **Validates: Requirements 7.2**

- [x] 10.2 Write property test for countdown accuracy

  - **Property 16: Countdown accuracy**
  - **Validates: Requirements 8.2**

- [ ] 11. Implement UIController for renderer process
  - Create UIController class to manage UI updates
  - Implement updateStatus to change status indicator and message
  - Implement updateActivePlayer to highlight active player section
  - Implement updateCountdown to display countdown text
  - Add event listeners for crossfade-status and crossfade-countdown events
  - _Requirements: 8.1, 8.3, 8.4, 8.5_

- [ ] 11.1 Write property test for UI status updates
  - **Property 15: UI status updates**
  - **Validates: Requirements 8.1, 8.3, 8.5**

- [ ] 11.2 Write property test for crossfade button state
  - **Property 14: Crossfade button state**
  - **Validates: Requirements 7.4**

- [ ] 12. Implement renderer.js initialization and event handling
  - Load settings from main process via IPC
  - Initialize CrossfadeManager with both webviews
  - Set up navigation button event listeners (back, forward, reload, home)
  - Set up "Crossfade Now" button event listener
  - Listen for reload-webviews IPC message from main process
  - Initialize UIController and connect to CrossfadeManager events
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 9.3_

- [ ] 12.1 Write property test for navigation isolation
  - **Property 11: Navigation isolation**
  - **Validates: Requirements 6.5**

- [ ] 13. Create settings window UI
  - Create settings.html with modal dialog layout
  - Add sliders for fade-out duration (5-30 seconds)
  - Add sliders for fade-in duration (5-30 seconds)
  - Add toggle switch for enable/disable crossfade
  - Add toggle switch for skip silence detection
  - Create settings.js to handle settings UI interactions
  - Implement save functionality via IPC to main process
  - _Requirements: 3.1, 3.2, 3.5_

- [ ] 13.1 Write property test for crossfade enable toggle
  - **Property 6: Crossfade enable toggle**
  - **Validates: Requirements 3.5**

- [ ] 14. Implement preload script for IPC bridge
  - Create preload.js with contextBridge API exposure
  - Expose getSettings IPC handler
  - Expose saveSettings IPC handler
  - Expose onReloadWebviews IPC listener
  - Ensure context isolation and security
  - _Requirements: 3.3, 9.3_

- [ ] 15. Implement session persistence and login flow
  - Configure webviews with persist:youtube-shared partition
  - Implement login window navigation to Google accounts
  - Add did-navigate listener to detect successful authentication
  - Send reload-webviews message after successful login
  - Verify session persists across application restarts
  - _Requirements: 1.5, 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 15.1 Write property test for session persistence round-trip
  - **Property 17: Session persistence round-trip**
  - **Validates: Requirements 9.5**

- [ ] 16. Add DOM-level ad-blocking content script
  - Create brave-shields.js content script for DOM manipulation
  - Add CSS injection to hide ad elements
  - Implement MutationObserver to remove ad elements continuously
  - Block ad scripts from loading (doubleclick, googlesyndication patterns)
  - Override ad-related window properties
  - Inject content script into both webviews
  - _Requirements: 4.3, 5.3, 5.5_

- [ ] 16.1 Write property test for ad element removal
  - **Property 8: Ad element removal**
  - **Validates: Requirements 4.3**

- [ ] 16.2 Write property test for tracking script blocking
  - **Property 10: Tracking script blocking**
  - **Validates: Requirements 5.3, 5.5**

- [ ] 17. Package application for Windows
  - Configure electron-builder for Windows NSIS installer
  - Create application icons (16x16, 48x48, 128x128, .ico)
  - Set up build scripts in package.json
  - Test packaged application on Windows 10
  - Verify all features work in packaged build
  - _Requirements: 11.5_

- [ ] 18. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
