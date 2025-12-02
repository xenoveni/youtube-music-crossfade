const fc = require('fast-check');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Mock electron app module
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => require('os').tmpdir())
  }
}));

const SettingsManager = require('../settings-manager');

const PBT_CONFIG = { numRuns: 100 };

describe('SettingsManager', () => {
  let tempDir;
  let tempSettingsPath;

  beforeEach(() => {
    // Create a unique temporary directory for each test
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'settings-test-'));
    tempSettingsPath = path.join(tempDir, 'settings.json');
  });

  afterEach(() => {
    // Clean up temporary directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Unit Tests', () => {
    test('should load default settings when file does not exist', () => {
      const manager = new SettingsManager(tempSettingsPath);
      const settings = manager.getSettings();

      expect(settings).toEqual({
        fadeOutDuration: 15,
        fadeInDuration: 15,
        isEnabled: false,
        skipSilence: false
      });
    });

    test('should parse valid settings JSON', () => {
      const testSettings = {
        fadeOutDuration: 20,
        fadeInDuration: 10,
        isEnabled: true,
        skipSilence: true
      };

      fs.writeFileSync(tempSettingsPath, JSON.stringify(testSettings), 'utf8');
      const manager = new SettingsManager(tempSettingsPath);
      const settings = manager.getSettings();

      expect(settings).toEqual(testSettings);
    });

    test('should handle corrupted settings files', () => {
      // Write invalid JSON
      fs.writeFileSync(tempSettingsPath, 'invalid json {{{', 'utf8');
      
      const manager = new SettingsManager(tempSettingsPath);
      const settings = manager.getSettings();

      // Should return default settings
      expect(settings).toEqual({
        fadeOutDuration: 15,
        fadeInDuration: 15,
        isEnabled: false,
        skipSilence: false
      });
    });

    test('should save settings to disk', () => {
      const manager = new SettingsManager(tempSettingsPath);
      const newSettings = {
        fadeOutDuration: 25,
        fadeInDuration: 20,
        isEnabled: true,
        skipSilence: false
      };

      manager.saveSettings(newSettings);

      // Verify file was written
      expect(fs.existsSync(tempSettingsPath)).toBe(true);

      // Verify content
      const fileContent = fs.readFileSync(tempSettingsPath, 'utf8');
      const savedSettings = JSON.parse(fileContent);
      expect(savedSettings).toEqual(newSettings);
    });

    test('should update individual settings', () => {
      const manager = new SettingsManager(tempSettingsPath);
      
      manager.updateSetting('fadeOutDuration', 30);
      
      const settings = manager.getSettings();
      expect(settings.fadeOutDuration).toBe(30);
      
      // Verify it was persisted
      const newManager = new SettingsManager(tempSettingsPath);
      expect(newManager.getSettings().fadeOutDuration).toBe(30);
    });

    test('should throw error for unknown setting key', () => {
      const manager = new SettingsManager(tempSettingsPath);
      
      expect(() => {
        manager.updateSetting('unknownKey', 'value');
      }).toThrow('Unknown setting key: unknownKey');
    });
  });

  describe('Property-Based Tests', () => {
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
            // Create a unique temp path for this iteration
            const iterationPath = path.join(tempDir, `settings-${Date.now()}-${Math.random()}.json`);
            
            const manager = new SettingsManager(iterationPath);
            manager.saveSettings(settings);
            const loaded = manager.loadSettings();
            
            // Clean up
            if (fs.existsSync(iterationPath)) {
              fs.unlinkSync(iterationPath);
            }
            
            return (
              loaded.fadeOutDuration === settings.fadeOutDuration &&
              loaded.fadeInDuration === settings.fadeInDuration &&
              loaded.isEnabled === settings.isEnabled &&
              loaded.skipSilence === settings.skipSilence
            );
          }
        ),
        PBT_CONFIG
      );
    });
  });
});
