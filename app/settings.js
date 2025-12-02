// Settings Window Script

let settings = {
    fadeOutDuration: 15,
    fadeInDuration: 15,
    isEnabled: false,
    detectSilence: false
};

// DOM Elements
const enableToggle = document.getElementById('enableToggle');
const detectSilenceToggle = document.getElementById('detectSilenceToggle');
const fadeOutSlider = document.getElementById('fadeOutSlider');
const fadeInSlider = document.getElementById('fadeInSlider');
const fadeOutValue = document.getElementById('fadeOutValue');
const fadeInValue = document.getElementById('fadeInValue');
const closeButton = document.getElementById('closeButton');

// Initialize
async function init() {
    // Load current settings
    settings = await window.electronAPI.getSettings();
    applySettings();
    setupEventListeners();
}

// Apply settings to UI
function applySettings() {
    enableToggle.checked = settings.isEnabled;
    if (detectSilenceToggle) {
        detectSilenceToggle.checked = settings.detectSilence;
    }
    fadeOutSlider.value = settings.fadeOutDuration;
    fadeInSlider.value = settings.fadeInDuration;
    fadeOutValue.textContent = `${settings.fadeOutDuration}s`;
    fadeInValue.textContent = `${settings.fadeInDuration}s`;

    // Update slider backgrounds
    updateSliderBackground(fadeOutSlider);
    updateSliderBackground(fadeInSlider);
}

// Save settings
async function saveSettings() {
    await window.electronAPI.saveSettings(settings);
}

// Set up event listeners
function setupEventListeners() {
    // Enable toggle
    enableToggle.addEventListener('change', (e) => {
        settings.isEnabled = e.target.checked;
        saveSettings();
    });

    // Detect silence toggle
    if (detectSilenceToggle) {
        detectSilenceToggle.addEventListener('change', (e) => {
            settings.detectSilence = e.target.checked;
            saveSettings();
        });
    }

    // Fade out slider
    fadeOutSlider.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        settings.fadeOutDuration = value;
        fadeOutValue.textContent = `${value}s`;
        updateSliderBackground(fadeOutSlider);
        saveSettings();
    });

    // Fade in slider
    fadeInSlider.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        settings.fadeInDuration = value;
        fadeInValue.textContent = `${value}s`;
        updateSliderBackground(fadeInSlider);
        saveSettings();
    });

    // Close button
    closeButton.addEventListener('click', () => {
        window.close();
    });
}

// Update slider background
function updateSliderBackground(slider) {
    const value = slider.value;
    const min = slider.min || 0;
    const max = slider.max || 100;
    const percentage = ((value - min) / (max - min)) * 100;
    slider.style.background = `linear-gradient(to right, #1a73e8 0%, #1a73e8 ${percentage}%, #2a2b33 ${percentage}%, #2a2b33 100%)`;
}

// Initialize when ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
