const { app, BrowserWindow, ipcMain, Menu, dialog, session } = require('electron');
const path = require('path');
const fs = require('fs');

// Settings file path
const settingsPath = path.join(app.getPath('userData'), 'settings.json');

// Default settings
let settings = {
  fadeOutDuration: 15,
  fadeInDuration: 15,
  isEnabled: false
};

// Load settings from file
function loadSettings() {
  try {
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf8');
      settings = { ...settings, ...JSON.parse(data) };
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
}

// Save settings to file
function saveSettings() {
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
}

let mainWindow;
let settingsWindow;

// Create application menu
function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Crossfade Settings',
          accelerator: 'Ctrl+,',
          click: () => {
            createSettingsWindow();
          }
        },
        { type: 'separator' },
        {
          label: 'Login with Chrome',
          click: async () => {
            await loginWithChrome();
          }
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: 'Ctrl+Q',
          click: () => {
            app.quit();
          }
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
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'YouTube Music Crossfade',
              message: 'YouTube Music Crossfade v1.0.0',
              detail: 'Seamless crossfading between two YouTube Music players.\n\nCreated with Electron.'
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Create settings window
function createSettingsWindow() {
  if (settingsWindow) {
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 450,
    height: 500,
    resizable: false,
    parent: mainWindow,
    modal: true,
    backgroundColor: '#181a20',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    title: 'Crossfade Settings'
  });

  settingsWindow.loadFile('settings.html');
  settingsWindow.setMenu(null);

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}

// Login with Chrome session
// Login with shared session
async function loginWithChrome() {
  const chromeWindow = new BrowserWindow({
    width: 800,
    height: 600,
    parent: mainWindow,
    modal: true,
    backgroundColor: '#fff',
    webPreferences: {
      partition: 'persist:youtube-shared'
    },
    title: 'Login to YouTube Music'
  });

  chromeWindow.loadURL('https://accounts.google.com');

  chromeWindow.webContents.on('did-navigate', (event, url) => {
    if (url.includes('music.youtube.com') || url.includes('myaccount.google.com')) {
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Login Successful',
        message: 'You are now logged in!',
        detail: 'Your session is active. Both players will be logged in automatically. You can close this window.'
      });

      // Send message to reload webviews
      if (mainWindow) {
        mainWindow.webContents.send('reload-webviews');
      }
    }
  });
}

function createWindow() {
  // Load settings before creating window
  loadSettings();

  // Create application menu
  createMenu();

  mainWindow = new BrowserWindow({
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

  mainWindow.loadFile('index.html');

  // Open DevTools in development (optional)
  // mainWindow.webContents.openDevTools();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers
ipcMain.handle('get-settings', () => {
  return settings;
});

ipcMain.handle('save-settings', (event, newSettings) => {
  settings = { ...settings, ...newSettings };
  saveSettings();
  return settings;
});

// Set up ad blocking for YouTube
function setupAdBlocking() {
  const youtubeSess = session.fromPartition('persist:youtube-shared');

  // List of ad/tracking domains to block
  const adDomains = [
    '*://*.doubleclick.net/*',
    '*://*.googlesyndication.com/*',
    '*://*.googleadservices.com/*',
    '*://pagead2.googlesyndication.com/*',
    '*://*.youtube.com/api/stats/ads*',
    '*://*.youtube.com/pagead/*',
    '*://*.youtube.com/ptracking*',
    '*://*.youtube.com/api/stats/qoe*',
    '*://www.googletagmanager.com/*',
    '*://www.google-analytics.com/*'
  ];

  youtubeSess.webRequest.onBeforeRequest({ urls: adDomains }, (details, callback) => {
    callback({ cancel: true });
  });

  console.log('Ad blocking enabled for YouTube Music');
}

// App lifecycle
app.whenReady().then(() => {
  setupAdBlocking();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
