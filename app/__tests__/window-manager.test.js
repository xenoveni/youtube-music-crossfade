const fc = require('fast-check');
const path = require('path');

const PBT_CONFIG = { numRuns: 100 };

// Mock electron modules
const mockBrowserWindow = jest.fn();
const mockMenu = {
  buildFromTemplate: jest.fn(),
  setApplicationMenu: jest.fn()
};
const mockDialog = {
  showMessageBox: jest.fn()
};
const mockApp = {
  quit: jest.fn()
};

// Track created windows for testing
let createdWindows = [];
let menuTemplate = null;

// Mock BrowserWindow class
class MockBrowserWindow {
  constructor(options) {
    this.options = options;
    this.closed = false;
    this.focused = false;
    this.webContents = {
      on: jest.fn(),
      send: jest.fn()
    };
    this.eventHandlers = {};
    createdWindows.push(this);
  }

  loadFile(file) {
    this.loadedFile = file;
  }

  loadURL(url) {
    this.loadedURL = url;
  }

  setMenu(menu) {
    this.menu = menu;
  }

  focus() {
    this.focused = true;
  }

  close() {
    this.closed = true;
    if (this.eventHandlers['closed']) {
      this.eventHandlers['closed']();
    }
  }

  on(event, handler) {
    this.eventHandlers[event] = handler;
  }
}

jest.mock('electron', () => ({
  BrowserWindow: MockBrowserWindow,
  Menu: {
    buildFromTemplate: (template) => {
      menuTemplate = template;
      return mockMenu.buildFromTemplate(template);
    },
    setApplicationMenu: mockMenu.setApplicationMenu
  },
  dialog: mockDialog,
  app: mockApp
}));

const WindowManager = require('../window-manager');

describe('WindowManager', () => {
  let windowManager;

  beforeEach(() => {
    windowManager = new WindowManager();
    createdWindows = [];
    menuTemplate = null;
    jest.clearAllMocks();
    mockApp.quit.mockClear();
  });

  describe('Unit Tests', () => {
    describe('createMainWindow', () => {
      test('should create main window with correct configuration', () => {
        const mainWindow = windowManager.createMainWindow();

        expect(mainWindow).toBeDefined();
        expect(mainWindow.options.width).toBe(1600);
        expect(mainWindow.options.height).toBe(900);
        expect(mainWindow.options.minWidth).toBe(1000);
        expect(mainWindow.options.minHeight).toBe(600);
        expect(mainWindow.options.webPreferences.webviewTag).toBe(true);
        expect(mainWindow.options.webPreferences.contextIsolation).toBe(true);
        expect(mainWindow.options.webPreferences.nodeIntegration).toBe(false);
      });

      test('should load index.html', () => {
        const mainWindow = windowManager.createMainWindow();
        expect(mainWindow.loadedFile).toBe('index.html');
      });

      test('should set mainWindow reference', () => {
        windowManager.createMainWindow();
        expect(windowManager.getMainWindow()).toBeDefined();
      });

      test('should clear mainWindow reference on close', () => {
        const mainWindow = windowManager.createMainWindow();
        mainWindow.close();
        expect(windowManager.getMainWindow()).toBeNull();
      });
    });

    describe('createSettingsWindow', () => {
      test('should throw error if main window does not exist', () => {
        expect(() => {
          windowManager.createSettingsWindow();
        }).toThrow('Main window must be created before settings window');
      });

      test('should create settings window with correct configuration', () => {
        windowManager.createMainWindow();
        const settingsWindow = windowManager.createSettingsWindow();

        expect(settingsWindow).toBeDefined();
        expect(settingsWindow.options.width).toBe(450);
        expect(settingsWindow.options.height).toBe(600);
        expect(settingsWindow.options.modal).toBe(true);
        expect(settingsWindow.options.resizable).toBe(false);
        expect(settingsWindow.options.parent).toBe(windowManager.getMainWindow());
      });

      test('should load settings.html', () => {
        windowManager.createMainWindow();
        const settingsWindow = windowManager.createSettingsWindow();
        expect(settingsWindow.loadedFile).toBe('settings.html');
      });

      test('should focus existing settings window if already open', () => {
        windowManager.createMainWindow();
        const settingsWindow1 = windowManager.createSettingsWindow();
        const settingsWindow2 = windowManager.createSettingsWindow();

        expect(settingsWindow1).toBe(settingsWindow2);
        expect(settingsWindow1.focused).toBe(true);
      });

      test('should clear settingsWindow reference on close', () => {
        windowManager.createMainWindow();
        const settingsWindow = windowManager.createSettingsWindow();
        settingsWindow.close();
        expect(windowManager.getSettingsWindow()).toBeNull();
      });
    });

    describe('createLoginWindow', () => {
      test('should throw error if main window does not exist', () => {
        expect(() => {
          windowManager.createLoginWindow();
        }).toThrow('Main window must be created before login window');
      });

      test('should create login window with correct configuration', () => {
        windowManager.createMainWindow();
        const loginWindow = windowManager.createLoginWindow();

        expect(loginWindow).toBeDefined();
        expect(loginWindow.options.width).toBe(800);
        expect(loginWindow.options.height).toBe(600);
        expect(loginWindow.options.modal).toBe(true);
        expect(loginWindow.options.parent).toBe(windowManager.getMainWindow());
        expect(loginWindow.options.webPreferences.partition).toBe('persist:youtube-shared');
      });

      test('should load Google accounts URL', () => {
        windowManager.createMainWindow();
        const loginWindow = windowManager.createLoginWindow();
        expect(loginWindow.loadedURL).toBe('https://accounts.google.com');
      });

      test('should focus existing login window if already open', () => {
        windowManager.createMainWindow();
        const loginWindow1 = windowManager.createLoginWindow();
        const loginWindow2 = windowManager.createLoginWindow();

        expect(loginWindow1).toBe(loginWindow2);
        expect(loginWindow1.focused).toBe(true);
      });

      test('should call onLoginSuccess callback when navigation succeeds', () => {
        windowManager.createMainWindow();
        const onLoginSuccess = jest.fn();
        const loginWindow = windowManager.createLoginWindow(onLoginSuccess);

        // Simulate successful navigation
        const navigateHandler = loginWindow.webContents.on.mock.calls.find(
          call => call[0] === 'did-navigate'
        )[1];
        navigateHandler({}, 'https://music.youtube.com/');

        expect(onLoginSuccess).toHaveBeenCalled();
        expect(mockDialog.showMessageBox).toHaveBeenCalled();
      });

      test('should clear loginWindow reference on close', () => {
        windowManager.createMainWindow();
        const loginWindow = windowManager.createLoginWindow();
        loginWindow.close();
        expect(windowManager.getLoginWindow()).toBeNull();
      });
    });

    describe('createMenu', () => {
      test('should create menu with File, View, and Help sections', () => {
        windowManager.createMainWindow();
        windowManager.createMenu();

        expect(menuTemplate).toBeDefined();
        expect(menuTemplate.length).toBe(3);
        expect(menuTemplate[0].label).toBe('File');
        expect(menuTemplate[1].label).toBe('View');
        expect(menuTemplate[2].label).toBe('Help');
      });

      test('should have Crossfade Settings in File menu', () => {
        windowManager.createMainWindow();
        windowManager.createMenu();

        const fileMenu = menuTemplate[0];
        const settingsItem = fileMenu.submenu.find(item => item.label === 'Crossfade Settings');
        expect(settingsItem).toBeDefined();
        expect(settingsItem.accelerator).toBe('Ctrl+,');
      });

      test('should have Login with Chrome in File menu', () => {
        windowManager.createMainWindow();
        windowManager.createMenu();

        const fileMenu = menuTemplate[0];
        const loginItem = fileMenu.submenu.find(item => item.label === 'Login with Chrome');
        expect(loginItem).toBeDefined();
      });

      test('should have Exit in File menu', () => {
        windowManager.createMainWindow();
        windowManager.createMenu();

        const fileMenu = menuTemplate[0];
        const exitItem = fileMenu.submenu.find(item => item.label === 'Exit');
        expect(exitItem).toBeDefined();
        expect(exitItem.accelerator).toBe('Ctrl+Q');
      });

      test('should have toggleDevTools in View menu', () => {
        windowManager.createMainWindow();
        windowManager.createMenu();

        const viewMenu = menuTemplate[1];
        const devToolsItem = viewMenu.submenu.find(item => item.role === 'toggleDevTools');
        expect(devToolsItem).toBeDefined();
      });

      test('should have About in Help menu', () => {
        windowManager.createMainWindow();
        windowManager.createMenu();

        const helpMenu = menuTemplate[2];
        const aboutItem = helpMenu.submenu.find(item => item.label === 'About');
        expect(aboutItem).toBeDefined();
      });

      test('should call custom handlers when provided', () => {
        windowManager.createMainWindow();
        const handlers = {
          onSettings: jest.fn(),
          onLogin: jest.fn(),
          onExit: jest.fn(),
          onAbout: jest.fn()
        };

        windowManager.createMenu(handlers);

        // Test settings handler
        const fileMenu = menuTemplate[0];
        const settingsItem = fileMenu.submenu.find(item => item.label === 'Crossfade Settings');
        settingsItem.click();
        expect(handlers.onSettings).toHaveBeenCalled();

        // Test login handler
        const loginItem = fileMenu.submenu.find(item => item.label === 'Login with Chrome');
        loginItem.click();
        expect(handlers.onLogin).toHaveBeenCalled();

        // Test exit handler
        const exitItem = fileMenu.submenu.find(item => item.label === 'Exit');
        exitItem.click();
        expect(handlers.onExit).toHaveBeenCalled();

        // Test about handler
        const helpMenu = menuTemplate[2];
        const aboutItem = helpMenu.submenu.find(item => item.label === 'About');
        aboutItem.click();
        expect(handlers.onAbout).toHaveBeenCalled();
      });
    });

    describe('closeAllWindows', () => {
      test('should close all open windows', () => {
        windowManager.createMainWindow();
        windowManager.createSettingsWindow();
        windowManager.createLoginWindow();

        const mainWindow = windowManager.getMainWindow();
        const settingsWindow = windowManager.getSettingsWindow();
        const loginWindow = windowManager.getLoginWindow();

        windowManager.closeAllWindows();

        expect(mainWindow.closed).toBe(true);
        expect(settingsWindow.closed).toBe(true);
        expect(loginWindow.closed).toBe(true);
      });

      test('should handle missing windows gracefully', () => {
        expect(() => {
          windowManager.closeAllWindows();
        }).not.toThrow();
      });
    });
  });

  describe('Property-Based Tests', () => {
    // Feature: brave-app, Property 22: Menu action execution
    test('menu action execution - all menu actions should execute their handlers', () => {
      fc.assert(
        fc.property(
          fc.record({
            settingsCalled: fc.boolean(),
            loginCalled: fc.boolean(),
            exitCalled: fc.boolean(),
            aboutCalled: fc.boolean()
          }),
          (testCase) => {
            // Reset for each iteration
            const manager = new WindowManager();
            manager.createMainWindow();
            
            // Create tracking handlers
            const handlers = {
              onSettings: jest.fn(),
              onLogin: jest.fn(),
              onExit: jest.fn(),
              onAbout: jest.fn()
            };

            manager.createMenu(handlers);

            // Get menu items
            const fileMenu = menuTemplate[0];
            const helpMenu = menuTemplate[2];
            
            const settingsItem = fileMenu.submenu.find(item => item.label === 'Crossfade Settings');
            const loginItem = fileMenu.submenu.find(item => item.label === 'Login with Chrome');
            const exitItem = fileMenu.submenu.find(item => item.label === 'Exit');
            const aboutItem = helpMenu.submenu.find(item => item.label === 'About');

            // Execute actions based on test case
            if (testCase.settingsCalled) {
              settingsItem.click();
            }
            if (testCase.loginCalled) {
              loginItem.click();
            }
            if (testCase.exitCalled) {
              exitItem.click();
            }
            if (testCase.aboutCalled) {
              aboutItem.click();
            }

            // Verify handlers were called correctly
            const settingsCorrect = testCase.settingsCalled ? handlers.onSettings.mock.calls.length === 1 : handlers.onSettings.mock.calls.length === 0;
            const loginCorrect = testCase.loginCalled ? handlers.onLogin.mock.calls.length === 1 : handlers.onLogin.mock.calls.length === 0;
            const exitCorrect = testCase.exitCalled ? handlers.onExit.mock.calls.length === 1 : handlers.onExit.mock.calls.length === 0;
            const aboutCorrect = testCase.aboutCalled ? handlers.onAbout.mock.calls.length === 1 : handlers.onAbout.mock.calls.length === 0;

            return settingsCorrect && loginCorrect && exitCorrect && aboutCorrect;
          }
        ),
        PBT_CONFIG
      );
    });
  });
});
