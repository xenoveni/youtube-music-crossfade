# Requirements Document

## Introduction

This document specifies the requirements for rebuilding the YouTube Music Crossfade application using the Brave browser engine (Electron with Brave features). The application enables seamless crossfading between two YouTube Music players while providing built-in ad-blocking and privacy protection through Brave's native shields technology. The goal is to leverage Brave's superior ad-blocking capabilities to eliminate ads more effectively than the current Ghostery-based implementation, while maintaining all existing crossfade functionality.

## Glossary

- **Brave Engine**: The Chromium-based browser engine with built-in ad-blocking and privacy features developed by Brave Software
- **Brave Shields**: Brave's native ad-blocking and privacy protection system that blocks ads, trackers, and scripts
- **Crossfade Manager**: The component responsible for managing smooth audio transitions between two players
- **Webview**: An embedded browser instance that displays YouTube Music
- **Active Player**: The webview currently playing audio at full volume
- **Inactive Player**: The webview that is paused or playing at zero volume, ready for the next crossfade
- **Fade Duration**: The time period over which audio volume transitions from one level to another
- **Session Persistence**: The ability to maintain login state and cookies across application restarts
- **Filter Lists**: Collections of rules that define which content should be blocked (ads, trackers, etc.)

## Requirements

### Requirement 1

**User Story:** As a music listener, I want to play YouTube Music in two side-by-side players, so that I can prepare seamless transitions between songs.

#### Acceptance Criteria

1. WHEN the application launches THEN the system SHALL display two webview instances in a 50-50 split layout
2. WHEN each webview loads THEN the system SHALL navigate to https://music.youtube.com
3. WHEN a user interacts with either webview THEN the system SHALL respond to all standard browser interactions (clicking, scrolling, typing)
4. WHEN the application window is resized THEN the system SHALL maintain the 50-50 split ratio between both webviews
5. WHERE both webviews are displayed THEN the system SHALL use a shared session partition to maintain consistent login state

### Requirement 2

**User Story:** As a music listener, I want automatic crossfading between players, so that I can enjoy continuous music without gaps or abrupt transitions.

#### Acceptance Criteria

1. WHEN a song in the active player reaches the fade-out trigger point THEN the system SHALL begin reducing the active player's volume from 100% to 0%
2. WHEN the active player begins fading out THEN the system SHALL simultaneously start the inactive player at 0% volume and increase it to 100%
3. WHEN the crossfade completes THEN the system SHALL designate the previously inactive player as the new active player
4. WHEN the crossfade completes THEN the system SHALL pause the previously active player and skip it to the next song
5. WHEN the inactive player is prepared THEN the system SHALL ensure it remains paused at 0% volume until the next crossfade begins

### Requirement 3

**User Story:** As a music listener, I want to configure crossfade timing, so that I can customize transitions to match my preferences.

#### Acceptance Criteria

1. WHEN a user opens the settings window THEN the system SHALL display controls for fade-out duration (5-30 seconds)
2. WHEN a user opens the settings window THEN the system SHALL display controls for fade-in duration (5-30 seconds)
3. WHEN a user modifies fade duration settings THEN the system SHALL persist the new values to disk immediately
4. WHEN the application restarts THEN the system SHALL load and apply the previously saved fade duration settings
5. WHEN a user toggles the crossfade enable switch THEN the system SHALL activate or deactivate automatic crossfading accordingly

### Requirement 4

**User Story:** As a music listener, I want built-in ad-blocking using Brave technology, so that I can enjoy uninterrupted music without advertisements.

#### Acceptance Criteria

1. WHEN the application initializes THEN the system SHALL enable Brave Shields for both webview sessions
2. WHEN a webview attempts to load ad-serving domains THEN the system SHALL block the network requests before content loads
3. WHEN a webview loads YouTube Music content THEN the system SHALL apply filter lists to remove ad elements from the DOM
4. WHEN ad-blocking is active THEN the system SHALL block requests to doubleclick.net, googleadservices.com, and googlesyndication.com domains
5. WHEN the application runs THEN the system SHALL maintain ad-blocking without requiring user configuration or manual filter updates

### Requirement 5

**User Story:** As a privacy-conscious user, I want enhanced privacy protection, so that my browsing activity is not tracked by third parties.

#### Acceptance Criteria

1. WHEN webviews make HTTP requests THEN the system SHALL add DNT (Do Not Track) and Sec-GPC (Global Privacy Control) headers
2. WHEN webviews make HTTP requests THEN the system SHALL remove tracking headers including X-Client-Data and X-Goog-Visitor-Id
3. WHEN webviews load content THEN the system SHALL block third-party tracking scripts and analytics
4. WHEN webviews establish connections THEN the system SHALL use a privacy-focused user agent string
5. WHEN the application runs THEN the system SHALL prevent fingerprinting attempts by blocking fingerprinting scripts

### Requirement 6

**User Story:** As a user, I want to control playback in both players, so that I can navigate, reload, and return to the home page as needed.

#### Acceptance Criteria

1. WHEN a user clicks the back button for a player THEN the system SHALL navigate that webview to the previous page in its history
2. WHEN a user clicks the forward button for a player THEN the system SHALL navigate that webview to the next page in its history
3. WHEN a user clicks the reload button for a player THEN the system SHALL refresh that webview's current page
4. WHEN a user clicks the home button for a player THEN the system SHALL navigate that webview to https://music.youtube.com
5. WHEN navigation controls are used THEN the system SHALL only affect the targeted player without impacting the other player

### Requirement 7

**User Story:** As a user, I want to manually trigger crossfades, so that I can switch between players at any time regardless of song position.

#### Acceptance Criteria

1. WHEN a user clicks the "Crossfade Now" button THEN the system SHALL immediately begin a crossfade from the active player to the inactive player
2. WHEN a manual crossfade is triggered THEN the system SHALL use the configured fade-in duration for the transition
3. WHEN a manual crossfade is in progress THEN the system SHALL prevent additional crossfade triggers until the current transition completes
4. WHEN no player is currently active THEN the system SHALL disable the "Crossfade Now" button
5. WHEN a manual crossfade completes THEN the system SHALL update the active player designation and prepare the inactive player

### Requirement 8

**User Story:** As a user, I want visual feedback on crossfade status, so that I can understand which player is active and when crossfades will occur.

#### Acceptance Criteria

1. WHEN a player becomes active THEN the system SHALL display a visual indicator highlighting that player's section
2. WHEN crossfading is enabled and a song is playing THEN the system SHALL display a countdown showing seconds until the next crossfade
3. WHEN a crossfade is in progress THEN the system SHALL update the status indicator to show "crossfading" state
4. WHEN the application is ready but no music is playing THEN the system SHALL display "Ready - press play to start" status
5. WHEN the active player changes THEN the system SHALL update the status bar to indicate which player is currently active

### Requirement 9

**User Story:** As a user, I want to log in once and have both players authenticated, so that I can access my playlists and preferences without logging in twice.

#### Acceptance Criteria

1. WHEN a user opens the login window THEN the system SHALL display a browser window navigated to Google accounts login
2. WHEN a user completes authentication THEN the system SHALL store the session in the shared partition
3. WHEN authentication succeeds THEN the system SHALL reload both webviews to apply the authenticated session
4. WHEN both webviews reload after login THEN the system SHALL display the user's authenticated YouTube Music account in both players
5. WHEN the application restarts THEN the system SHALL maintain the authenticated session without requiring re-login

### Requirement 10

**User Story:** As a user, I want the application to monitor playback automatically, so that crossfades happen without manual intervention.

#### Acceptance Criteria

1. WHEN crossfading is enabled THEN the system SHALL poll both webviews every second to retrieve playback information
2. WHEN polling a webview THEN the system SHALL extract current time, duration, playing state, volume, and song title
3. WHEN both players are playing simultaneously THEN the system SHALL pause the non-active player to prevent audio overlap
4. WHEN the active player's remaining time reaches the fade-out duration THEN the system SHALL trigger an automatic crossfade
5. WHEN a song's duration is less than 10 seconds THEN the system SHALL skip crossfading for that song to avoid errors

### Requirement 11

**User Story:** As a developer, I want the application built with Electron and Brave integration, so that I can leverage both Electron's desktop capabilities and Brave's privacy features.

#### Acceptance Criteria

1. WHEN the application is packaged THEN the system SHALL use Electron as the desktop application framework
2. WHEN webviews are created THEN the system SHALL configure them with Brave's ad-blocking and privacy features
3. WHEN the application initializes THEN the system SHALL load Brave's filter lists for ad and tracker blocking
4. WHEN filter lists are loaded THEN the system SHALL apply EasyList, EasyPrivacy, and Brave-specific rules
5. WHEN the application runs THEN the system SHALL maintain compatibility with Windows 10 and later operating systems

### Requirement 12

**User Story:** As a user, I want access to application menus, so that I can access settings, login, and other features through standard menu navigation.

#### Acceptance Criteria

1. WHEN the application launches THEN the system SHALL display a menu bar with File, View, and Help menus
2. WHEN a user selects "Crossfade Settings" from the File menu THEN the system SHALL open the settings window
3. WHEN a user selects "Login with Chrome" from the File menu THEN the system SHALL open the authentication window
4. WHEN a user selects "Exit" from the File menu THEN the system SHALL close the application
5. WHEN a user selects developer tools from the View menu THEN the system SHALL open Chromium DevTools for debugging
