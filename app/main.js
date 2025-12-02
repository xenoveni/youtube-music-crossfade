const { app, ipcMain, session } = require('electron');
const SettingsManager = require('./settings-manager');
const BraveShieldsManager = require('./brave-shields');
const WindowManager = require('./window-manager');

/**
 * Main Process Entry Point
 * 
 * Responsibilities:
 * - Initialize SettingsManager on app ready
 * - Initialize BraveShieldsManager with session
 * - Create main window using WindowManager
 * - Set up IPC handlers for get-settings and save-settings
 * - Handle app lifecycle events (quit, window-all-closed)
 */

// Component instances
let settingsManager = null;
let braveShieldsManager = null;
let windowManager = null;

/**
 * Initialize BraveShieldsManager with shared session partition
 */
async function initializeBraveShields() {
  try {
    console.log('[Main] Initializing Brave Shields...');
    const youtubeSess = session.fromPartition('persist:youtube-shared');
    braveShieldsManager = new BraveShieldsManager(youtubeSess);
    await braveShieldsManager.initialize();
    console.log('[Main] ✓ Brave Shields initialized');
  } catch (error) {
    console.error('[Main] Failed to initialize Brave Shields:', error);
  }
}

/**
 * Initialize SettingsManager
 */
function initializeSettings() {
  try {
    console.log('[Main] Initializing Settings Manager...');
    settingsManager = new SettingsManager();
    console.log('[Main] ✓ Settings Manager initialized');
  } catch (error) {
    console.error('[Main] Failed to initialize Settings Manager:', error);
  }
}

/**
 * Initialize WindowManager and create main window
 */
function initializeWindows() {
  try {
    console.log('[Main] Initializing Window Manager...');
    windowManager = new WindowManager();
    
    // Create main window
    const mainWindow = windowManager.createMainWindow();
    console.log('[Main] ✓ Main window created');
    
    // Create application menu with handlers
    windowManager.createMenu({
      onSettings: () => {
        windowManager.createSettingsWindow();
      },
      onLogin: () => {
        windowManager.createLoginWindow(() => {
          // On successful login, reload webviews
          const main = windowManager.getMainWindow();
          if (main) {
            main.webContents.send('reload-webviews');
          }
        });
      },
      onExit: () => {
        app.quit();
      }
    });
    console.log('[Main] ✓ Application menu created');
    
    return mainWindow;
  } catch (error) {
    console.error('[Main] Failed to initialize windows:', error);
    throw error;
  }
}

/**
 * Set up IPC handlers for communication with renderer process
 */
function setupIpcHandlers() {
  // Handler for getting current settings
  ipcMain.handle('get-settings', () => {
    if (!settingsManager) {
      console.error('[Main] SettingsManager not initialized');
      return null;
    }
    return settingsManager.getSettings();
  });

  // Handler for saving settings
  ipcMain.handle('save-settings', (_event, newSettings) => {
    if (!settingsManager) {
      console.error('[Main] SettingsManager not initialized');
      return null;
    }
    
    try {
      settingsManager.saveSettings(newSettings);
      return settingsManager.getSettings();
    } catch (error) {
      console.error('[Main] Failed to save settings:', error);
      return null;
    }
  });

  console.log('[Main] ✓ IPC handlers registered');
}

/**
 * App lifecycle: whenReady
 * Initialize all components and create the main window
 */
app.whenReady().then(async () => {
  console.log('[Main] App ready, initializing components...');
  
  // Initialize SettingsManager
  initializeSettings();
  
  // Initialize BraveShieldsManager with session
  await initializeBraveShields();
  
  // Set up IPC handlers
  setupIpcHandlers();
  
  // Initialize WindowManager and create main window
  initializeWindows();
  
  console.log('[Main] ✓ Application initialization complete');
});

/**
 * App lifecycle: window-all-closed
 * Quit the app when all windows are closed (except on macOS)
 */
app.on('window-all-closed', () => {
  // On macOS, apps typically stay open until explicitly quit
  if (process.platform !== 'darwin') {
    if (braveShieldsManager) {
      try { braveShieldsManager.destroy(); } catch (_) {}
    }
    app.quit();
  }
});

/**
 * App lifecycle: activate
 * Recreate window when dock icon is clicked (macOS)
 */
app.on('activate', () => {
  if (!windowManager || !windowManager.getMainWindow()) {
    initializeWindows();
  }
});
