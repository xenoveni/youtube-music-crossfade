const { app, BrowserWindow, ipcMain, Menu, dialog, session } = require('electron');
const path = require('path');
const fs = require('fs');

// Settings file path
const settingsPath = path.join(app.getPath('userData'), 'settings.json');

const { ElectronBlocker } = require('@ghostery/adblocker-electron');
const fetch = require('cross-fetch');

// Default settings
let settings = {
  fadeOutDuration: 15,
  fadeInDuration: 15,
  isEnabled: false,
  skipSilence: false
};

// Brave-style ad blocking with multiple filter lists
async function setupAdBlocking() {
  try {
    const youtubeSess = session.fromPartition('persist:youtube-shared');
    
    console.log('[Brave Shields] Initializing ad blocker with multiple filter lists...');
    
    // Method 1: Use Ghostery's comprehensive blocker (includes EasyList, EasyPrivacy, etc.)
    const blocker = await ElectronBlocker.fromPrebuiltAdsAndTracking(fetch);
    blocker.enableBlockingInSession(youtubeSess);
    console.log('[Brave Shields] ✓ Ghostery blocker enabled (EasyList + EasyPrivacy + more)');
    
    // Method 2: Add custom filter rules for YouTube-specific ads
    setupCustomFilters(youtubeSess);
    
    // Method 3: Block third-party scripts and trackers
    setupPrivacyProtection(youtubeSess);
    
    console.log('[Brave Shields] ✓ Ad blocking fully initialized');
  } catch (error) {
    console.error('[Brave Shields] Failed to enable ad blocker:', error);
  }
}

// Setup custom filters for YouTube ads (similar to uBlock Origin custom rules)
function setupCustomFilters(sess) {
  // YouTube-specific ad patterns - ONLY block obvious ad domains
  const youtubeAdPatterns = [
    'doubleclick.net',
    'googleadservices.com',
    'googlesyndication.com'
  ];
  
  sess.webRequest.onBeforeRequest((details, callback) => {
    const url = details.url.toLowerCase();
    
    // Only block obvious ad serving domains
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

// Setup privacy protection (block trackers and fingerprinting)
function setupPrivacyProtection(sess) {
  // Remove tracking headers
  sess.webRequest.onBeforeSendHeaders((details, callback) => {
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
  sess.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  
  console.log('[Brave Shields] ✓ Privacy protection enabled');
}

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
    height: 600,
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
