const fs = require('fs');
const path = require('path');
const { app } = require('electron');

/**
 * SettingsManager handles loading, saving, and managing application settings.
 * Settings are persisted to a JSON file in the userData directory.
 */
class SettingsManager {
  constructor(settingsPath = null) {
    // Allow custom path for testing, otherwise use userData directory
    this.settingsPath = settingsPath || path.join(app.getPath('userData'), 'settings.json');
    this.settings = this.loadSettings();
  }

  /**
   * Get default settings
   * @returns {Object} Default settings object
   */
  getDefaultSettings() {
    return {
      fadeOutDuration: 15,  // Range: 5-30, Default: 15
      fadeInDuration: 15,   // Range: 5-30, Default: 15
      isEnabled: false,     // Default: false
      skipSilence: false,   // Default: false
      historyUrl1: 'https://music.youtube.com',  // Last URL in webview1
      historyUrl2: 'https://music.youtube.com'   // Last URL in webview2
    };
  }

  /**
   * Load settings from disk
   * @returns {Object} Settings object
   */
  loadSettings() {
    try {
      // Check if settings file exists
      if (!fs.existsSync(this.settingsPath)) {
        // Return default settings if file doesn't exist
        return this.getDefaultSettings();
      }

      // Read and parse settings file
      const data = fs.readFileSync(this.settingsPath, 'utf8');
      const settings = JSON.parse(data);

      // Merge with defaults to ensure all keys exist
      return {
        ...this.getDefaultSettings(),
        ...settings
      };
    } catch (error) {
      // Handle corrupted settings files with error recovery
      console.error('Error loading settings, using defaults:', error.message);
      return this.getDefaultSettings();
    }
  }

  /**
   * Save settings to disk
   * @param {Object} settings - Settings object to save
   */
  saveSettings(settings) {
    try {
      // Ensure directory exists
      const dir = path.dirname(this.settingsPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Write settings to file
      fs.writeFileSync(this.settingsPath, JSON.stringify(settings, null, 2), 'utf8');

      // Update in-memory settings
      this.settings = settings;
    } catch (error) {
      console.error('Error saving settings:', error.message);
      throw error;
    }
  }

  /**
   * Get current settings
   * @returns {Object} Current settings object
   */
  getSettings() {
    return { ...this.settings };
  }

  /**
   * Update a specific setting
   * @param {string} key - Setting key to update
   * @param {*} value - New value for the setting
   */
  updateSetting(key, value) {
    if (this.settings.hasOwnProperty(key)) {
      this.settings[key] = value;
      this.saveSettings(this.settings);
    } else {
      throw new Error(`Unknown setting key: ${key}`);
    }
  }
}

module.exports = SettingsManager;
