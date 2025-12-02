const { BrowserWindow, Menu, dialog } = require('electron');
const path = require('path');

/**
 * WindowManager - Manages application windows (main, settings, login)
 * 
 * Responsibilities:
 * - Create and configure main application window
 * - Create settings modal window
 * - Create login window with shared session
 * - Build and manage application menu
 */
class WindowManager {
  constructor() {
    this.mainWindow = null;
    this.settingsWindow = null;
    this.loginWindow = null;
  }

  /**
   * Create the main application window with two webviews
   * @returns {BrowserWindow} The main window instance
   */
  createMainWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1600,
      height: 900,
      minWidth: 1000,
      minHeight: 600,
      backgroundColor: '#181a20',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        webviewTag: true,
        preload: path.join(__dirname, 'preload.js')
      },
      icon: path.join(__dirname, 'icon.png'),
      title: 'YouTube Music Crossfade',
      autoHideMenuBar: false
    });

    this.mainWindow.loadFile('index.html');

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    return this.mainWindow;
  }

  /**
   * Create settings window as a modal dialog
   * @returns {BrowserWindow} The settings window instance
   */
  createSettingsWindow() {
    // If settings window already exists, focus it
    if (this.settingsWindow) {
      this.settingsWindow.focus();
      return this.settingsWindow;
    }

    // Ensure main window exists
    if (!this.mainWindow) {
      throw new Error('Main window must be created before settings window');
    }

    this.settingsWindow = new BrowserWindow({
      width: 450,
      height: 600,
      resizable: false,
      parent: this.mainWindow,
      modal: true,
      backgroundColor: '#181a20',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js')
      },
      title: 'Crossfade Settings'
    });

    this.settingsWindow.loadFile('settings.html');
    this.settingsWindow.setMenu(null);

    this.settingsWindow.on('closed', () => {
      this.settingsWindow = null;
    });

    return this.settingsWindow;
  }

  /**
   * Create login window with shared session partition
   * @param {Function} onLoginSuccess - Callback when login succeeds
   * @returns {BrowserWindow} The login window instance
   */
  createLoginWindow(onLoginSuccess) {
    // If login window already exists, focus it
    if (this.loginWindow) {
      this.loginWindow.focus();
      return this.loginWindow;
    }

    // Ensure main window exists
    if (!this.mainWindow) {
      throw new Error('Main window must be created before login window');
    }

    this.loginWindow = new BrowserWindow({
      width: 800,
      height: 600,
      parent: this.mainWindow,
      modal: true,
      backgroundColor: '#fff',
      webPreferences: {
        partition: 'persist:youtube-shared'
      },
      title: 'Login to YouTube Music'
    });

    this.loginWindow.loadURL('https://accounts.google.com');

    // Monitor navigation for successful login
    this.loginWindow.webContents.on('did-navigate', (event, url) => {
      if (url.includes('music.youtube.com') || url.includes('myaccount.google.com')) {
        dialog.showMessageBox(this.mainWindow, {
          type: 'info',
          title: 'Login Successful',
          message: 'You are now logged in!',
          detail: 'Your session is active. Both players will be logged in automatically. You can close this window.'
        });

        // Trigger callback if provided
        if (onLoginSuccess && typeof onLoginSuccess === 'function') {
          onLoginSuccess();
        }
      }
    });

    this.loginWindow.on('closed', () => {
      this.loginWindow = null;
    });

    return this.loginWindow;
  }

  /**
   * Create application menu with File, View, and Help sections
   * @param {Object} handlers - Menu action handlers
   * @param {Function} handlers.onSettings - Handler for opening settings
   * @param {Function} handlers.onLogin - Handler for opening login
   * @param {Function} handlers.onExit - Handler for exit
   * @param {Function} handlers.onAbout - Handler for about dialog (optional)
   */
  createMenu(handlers = {}) {
    const {
      onSettings = () => this.createSettingsWindow(),
      onLogin = () => this.createLoginWindow(),
      onExit = () => require('electron').app.quit(),
      onAbout = () => this._showAboutDialog()
    } = handlers;

    const template = [
      {
        label: 'File',
        submenu: [
          {
            label: 'Crossfade Settings',
            accelerator: 'Ctrl+,',
            click: onSettings
          },
          { type: 'separator' },
          {
            label: 'Login with Chrome',
            click: onLogin
          },
          { type: 'separator' },
          {
            label: 'Exit',
            accelerator: 'Ctrl+Q',
            click: onExit
          }
        ]
      },
      {
        label: 'View',
        submenu: [
          { role: 'reload' },
          { role: 'forceReload' },
          { type: 'separator' },
          { role: 'toggleDevTools' },
          { type: 'separator' },
          { role: 'resetZoom' },
          { role: 'zoomIn' },
          { role: 'zoomOut' }
        ]
      },
      {
        label: 'Help',
        submenu: [
          {
            label: 'About',
            click: onAbout
          }
        ]
      }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);

    return menu;
  }

  /**
   * Show about dialog
   * @private
   */
  _showAboutDialog() {
    if (!this.mainWindow) {
      return;
    }

    dialog.showMessageBox(this.mainWindow, {
      type: 'info',
      title: 'YouTube Music Crossfade',
      message: 'YouTube Music Crossfade v1.0.0',
      detail: 'Seamless crossfading between two YouTube Music players.\n\nCreated with Electron.'
    });
  }

  /**
   * Get the main window instance
   * @returns {BrowserWindow|null}
   */
  getMainWindow() {
    return this.mainWindow;
  }

  /**
   * Get the settings window instance
   * @returns {BrowserWindow|null}
   */
  getSettingsWindow() {
    return this.settingsWindow;
  }

  /**
   * Get the login window instance
   * @returns {BrowserWindow|null}
   */
  getLoginWindow() {
    return this.loginWindow;
  }

  /**
   * Close all windows
   */
  closeAllWindows() {
    if (this.loginWindow) {
      this.loginWindow.close();
    }
    if (this.settingsWindow) {
      this.settingsWindow.close();
    }
    if (this.mainWindow) {
      this.mainWindow.close();
    }
  }
}

module.exports = WindowManager;
