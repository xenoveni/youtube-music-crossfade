// Renderer Process - UI Logic and Event Handlers (Updated for new layout)

let crossfadeManager;
let settings = {
    fadeOutDuration: 15,
    fadeInDuration: 15,
    isEnabled: false,
    detectSilence: false
};

// DOM Elements
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const activePlayerStatus = document.getElementById('activePlayerStatus');
const countdownText = document.getElementById('countdownText');
const crossfadeNowBtn = document.getElementById('crossfadeNowBtn');
const player1Section = document.getElementById('player1Section');
const player2Section = document.getElementById('player2Section');
const webview1 = document.getElementById('webview1');
const webview2 = document.getElementById('webview2');

// Navigation buttons
const back1 = document.getElementById('back1');
const forward1 = document.getElementById('forward1');
const reload1 = document.getElementById('reload1');
const home1 = document.getElementById('home1');
const back2 = document.getElementById('back2');
const forward2 = document.getElementById('forward2');
const reload2 = document.getElementById('reload2');
const home2 = document.getElementById('home2');

// Initialize the application
async function init() {
    // Load settings from Electron
    settings = await window.electronAPI.getSettings();

    // Initialize crossfade manager
    crossfadeManager = new CrossfadeManager(webview1, webview2);
    crossfadeManager.updateSettings(settings);
    await crossfadeManager.init();

    // Set up event listeners
    setupEventListeners();

    // Update status
    updateStatusUI('ready', 'Initialized - ready to crossfade');
}

// Set up event listeners
function setupEventListeners() {
    // Navigation for Player 1
    back1.addEventListener('click', () => {
        webview1.goBack();
    });

    forward1.addEventListener('click', () => {
        webview1.goForward();
    });

    reload1.addEventListener('click', () => {
        webview1.reload();
    });

    home1.addEventListener('click', () => {
        webview1.loadURL('https://music.youtube.com');
    });

    // Navigation for Player 2
    back2.addEventListener('click', () => {
        webview2.goBack();
    });

    forward2.addEventListener('click', () => {
        webview2.goForward();
    });

    reload2.addEventListener('click', () => {
        webview2.reload();
    });

    home2.addEventListener('click', () => {
        webview2.loadURL('https://music.youtube.com');
    });

    // Crossfade Now button
    crossfadeNowBtn.addEventListener('click', async () => {
        if (crossfadeManager) {
            await crossfadeManager.triggerManualCrossfade();
        }
    });

    // Listen for crossfade status updates
    window.addEventListener('crossfade-status', (e) => {
        const { state, message, activePlayer } = e.detail;
        updateStatusUI(state, message);
        updateActivePlayer(activePlayer);
    });

    // Listen for countdown updates
    window.addEventListener('crossfade-countdown', (e) => {
        const { seconds } = e.detail;
        updateCountdown(seconds);
    });

    // Listen for reload-webviews message from main process
    window.electronAPI.onReloadWebviews(() => {
        webview1.reload();
        webview2.reload();
    });
}

// Update status UI
function updateStatusUI(state, message) {
    statusText.textContent = message;

    // Remove all state classes
    statusDot.classList.remove('active', 'crossfading');

    // Add appropriate class
    if (state === 'active') {
        statusDot.classList.add('active');
    } else if (state === 'crossfading') {
        statusDot.classList.add('crossfading');
    }
}

// Update active player indicator
function updateActivePlayer(playerNum) {
    if (playerNum === 1) {
        player1Section.classList.add('active');
        player2Section.classList.remove('active');
        activePlayerStatus.textContent = 'Player 1 is active';
    } else if (playerNum === 2) {
        player2Section.classList.add('active');
        player1Section.classList.remove('active');
        activePlayerStatus.textContent = 'Player 2 is active';
    } else {
        player1Section.classList.remove('active');
        player2Section.classList.remove('active');
        activePlayerStatus.textContent = 'No active player';
    }
}

// Update countdown display
function updateCountdown(seconds) {
    if (seconds > 0) {
        countdownText.textContent = `Crossfade in ${seconds}s`;
        countdownText.style.display = 'inline';
    } else {
        countdownText.textContent = '';
        countdownText.style.display = 'none';
    }
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
