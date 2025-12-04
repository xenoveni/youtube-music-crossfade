// Crossfade Manager - Core logic for crossfading between two YouTube Music webviews

class CrossfadeManager {
    constructor(webview1, webview2) {
        this.webview1 = webview1;
        this.webview2 = webview2;
        this.settings = {
            fadeOutDuration: 15,
            fadeInDuration: 15,
            isEnabled: false,
            detectSilence: false
        };
        this.crossfadeActive = false;
        this.currentLeader = 1; // Which player is currently active
        this.monitoringInterval = null;
        this.lastSongTitles = { 1: null, 2: null };
        this.countdownInterval = null;
        this.timeUntilCrossfade = 0;
    }

    // Initialize the crossfade manager
    async init() {
        // Wait for webviews to load
        await this.waitForWebviewsReady();

        // Start monitoring
        this.startMonitoring();
    }

    // Wait for both webviews to be ready
    waitForWebviewsReady() {
        return new Promise((resolve) => {
            let webview1Ready = false;
            let webview2Ready = false;

            const checkBothReady = () => {
                if (webview1Ready && webview2Ready) {
                    resolve();
                }
            };

            this.webview1.addEventListener('did-finish-load', () => {
                webview1Ready = true;
                checkBothReady();
            });

            this.webview2.addEventListener('did-finish-load', () => {
                webview2Ready = true;
                checkBothReady();
            });

            // Fallback timeout
            setTimeout(() => {
                resolve();
            }, 10000);
        });
    }

    // Update settings
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
    }

    // Execute JavaScript in a webview and get the result
    async executeInWebview(webview, code) {
        try {
            const result = await webview.executeJavaScript(code);
            return result;
        } catch (error) {
            console.error('Error executing script in webview:', error);
            return null;
        }
    }

    // Get playback information from a webview
    async getPlaybackInfo(webview) {
        const code = `
            (function() {
                try {
                    // Find audio element
                    const audio = document.querySelector('audio') || document.querySelector('video');
                    if (!audio) return null;

                    // Get song title
                    const titleElement = document.querySelector('.title.ytmusic-player-bar') || 
                                        document.querySelector('yt-formatted-string.title') ||
                                        document.querySelector('.title');
                    const songTitle = titleElement ? titleElement.textContent.trim() : null;
                    
                    // ===== AD DETECTION =====
                    // Detect if an ad is currently playing
                    let isAd = false;
                    
                    // Check for ad indicators
                    const adText = document.querySelector('.ytp-ad-text, .video-ads-text');
                    const adOverlay = document.querySelector('.ytp-ad-overlay-container, .video-ads');
                    const adPlayer = document.querySelector('.ad-showing, .ad-interrupting');
                    const skipButton = document.querySelector('.ytp-ad-skip-button, .ytp-skip-ad-button');
                    
                    // Check if video player has ad-related classes
                    const videoPlayer = document.querySelector('.html5-video-player');
                    if (videoPlayer) {
                        isAd = videoPlayer.classList.contains('ad-showing') || 
                               videoPlayer.classList.contains('ad-interrupting') ||
                               videoPlayer.classList.contains('ytp-ad-player-overlay-shown');
                    }
                    
                    // Also check for ad indicators in DOM
                    if (!isAd) {
                        isAd = !!(adText || adOverlay || adPlayer || skipButton);
                    }
                    
                    // Additional check: very short duration might be an ad
                    if (!isAd && audio.duration > 0 && audio.duration < 90) {
                        // Check if title contains typical ad indicators
                        const lowerTitle = (songTitle || '').toLowerCase();
                        if (lowerTitle.includes('advertisement') || 
                            lowerTitle.includes('ad •') ||
                            lowerTitle.includes('sponsored')) {
                            isAd = true;
                        }
                    }

                    // Detect silence/low volume at end of track
                    let hasEndingSilence = false;
                    const timeRemaining = audio.duration - audio.currentTime;
                    
                    if (timeRemaining < 5 && timeRemaining > 0) {
                        // Check if audio is very quiet (silence detection)
                        const analyser = audio.analyser;
                        if (analyser) {
                            const dataArray = new Uint8Array(analyser.frequencyBinCount);
                            analyser.getByteFrequencyData(dataArray);
                            const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
                            hasEndingSilence = average < 10; // Very quiet threshold
                        }
                    }

                    return {
                        currentTime: audio.currentTime || 0,
                        duration: audio.duration || 0,
                        isPlaying: !audio.paused,
                        volume: audio.volume * 100,
                        songTitle: songTitle,
                        hasEndingSilence: hasEndingSilence,
                        isAd: isAd  // NEW: Ad detection flag
                    };
                } catch (e) {
                    return null;
                }
            })();
        `;

        return await this.executeInWebview(webview, code);
    }

    // Set volume in a webview (0-100)
    async setVolume(webview, volume) {
        const normalizedVolume = Math.max(0, Math.min(100, volume)) / 100;
        const code = `
            (function() {
                const audio = document.querySelector('audio') || document.querySelector('video');
                if (audio) {
                    audio.volume = ${normalizedVolume};
                    return true;
                }
                return false;
            })();
        `;

        return await this.executeInWebview(webview, code);
    }

    // Play a webview
    async play(webview) {
        const code = `
            (function() {
                const audio = document.querySelector('audio') || document.querySelector('video');
                if (audio && audio.paused) {
                    audio.play().catch(() => {
                        const playButton = document.querySelector('#play-pause-button') ||
                                         document.querySelector('button[aria-label*="Play"]');
                        if (playButton) playButton.click();
                    });
                    return true;
                }
                return false;
            })();
        `;

        return await this.executeInWebview(webview, code);
    }

    // Pause a webview
    async pause(webview) {
        const code = `
            (function() {
                const audio = document.querySelector('audio') || document.querySelector('video');
                if (audio && !audio.paused) {
                    audio.pause();
                    return true;
                }
                return false;
            })();
        `;

        return await this.executeInWebview(webview, code);
    }

    // Try to skip an ad by clicking the skip button
    async trySkipAd(webview) {
        const code = `
            (function() {
                // Try to find and click skip button
                const skipSelectors = [
                    '.ytp-ad-skip-button',
                    '.ytp-skip-ad-button',
                    'button[aria-label*="Skip"]',
                    '.videoAdUiSkipButton',
                    '.ytp-ad-skip-button-modern'
                ];
                
                for (const selector of skipSelectors) {
                    const skipButton = document.querySelector(selector);
                    if (skipButton && !skipButton.disabled) {
                        skipButton.click();
                        console.log('[Ad Skip] Clicked skip button:', selector);
                        return true;
                    }
                }
                return false;
            })();
        `;

        return await this.executeInWebview(webview, code);
    }

    // Skip to next song and keep it paused
    async skipToNext(webview) {
        const code = `
            (function() {
                // First, ensure audio is paused and at volume 0
                const audio = document.querySelector('audio') || document.querySelector('video');
                if (audio) {
                    audio.volume = 0;
                    audio.pause();
                }
                
                // Then click next button
                const nextButton = document.querySelector('.next-button') ||
                                 document.querySelector('[aria-label*="Next"]') ||
                                 document.querySelector('button[title*="Next"]') ||
                                 document.querySelector('.ytp-next-button');
                if (nextButton) {
                    nextButton.click();
                    
                    // Immediately pause the new song when it loads
                    setTimeout(() => {
                        const audio = document.querySelector('audio') || document.querySelector('video');
                        if (audio) {
                            audio.volume = 0;
                            audio.pause();
                        }
                    }, 100);
                    
                    return true;
                }
                return false;
            })();
        `;
        return await this.executeInWebview(webview, code);
    }

    // Execute crossfade from one player to another
    async executeCrossfade(fromWebview, toWebview, fromNum, toNum) {
        if (this.crossfadeActive) return;

        this.crossfadeActive = true;
        const duration = this.settings.fadeInDuration * 1000; // Convert to milliseconds
        const startTime = Date.now();

        // Get current song title from the "from" player
        const fromInfo = await this.getPlaybackInfo(fromWebview);
        if (fromInfo && fromInfo.songTitle) {
            this.lastSongTitles[fromNum] = fromInfo.songTitle;
        }

        // Update UI to show crossfading
        this.updateStatus('crossfading', `Crossfading to Player ${toNum}`);
        this.stopCountdown();

        // Start the "to" player at 0 volume
        await this.setVolume(toWebview, 0);
        await this.play(toWebview);

        // Crossfade interval
        const interval = setInterval(async () => {
            const currentTime = Date.now();
            const progress = Math.min(1, (currentTime - startTime) / duration);

            if (progress >= 1) {
                // Crossfade complete
                clearInterval(interval);
                await this.setVolume(fromWebview, 0);
                await this.setVolume(toWebview, 100);

                // CRITICAL: Pause the old player immediately at volume 0
                await this.pause(fromWebview);

                // Prepare the old player for next crossfade
                await this.prepareInactivePlayer(fromWebview, fromNum);

                this.crossfadeActive = false;
                this.currentLeader = toNum;
                this.updateStatus('active', `Player ${toNum} active`);
                return;
            }

            // Update volumes
            const fromVolume = Math.round(100 * (1 - progress));
            const toVolume = Math.round(100 * progress);

            await this.setVolume(fromWebview, fromVolume);
            await this.setVolume(toWebview, toVolume);
        }, 50);
    }

    // Prepare inactive player for next crossfade
    async prepareInactivePlayer(webview, playerNum) {
        // Set volume to 0 FIRST to avoid hearing anything
        await this.setVolume(webview, 0);

        // Skip to next song (it will load at volume 0)
        await this.skipToNext(webview);

        // Wait for next song to start loading
        await new Promise(resolve => setTimeout(resolve, 1000));

        // ===== SILENT AD PLAYTHROUGH =====
        // Check if the next item is an ad - if so, play it silently
        const info = await this.getPlaybackInfo(webview);

        if (info && info.isAd) {
            console.log(`[Crossfade] Player ${playerNum} has an ad - playing silently...`);

            // Keep volume at 0 and play the ad
            await this.setVolume(webview, 0);
            await this.play(webview);

            // Wait for ad to finish
            await this.waitForAdToFinish(webview, playerNum);

            console.log(`[Crossfade] Player ${playerNum} ad finished, ready for crossfade`);
        }

        // Ensure volume is 0 and player is paused (unless playing ad)
        const currentInfo = await this.getPlaybackInfo(webview);
        if (!currentInfo || !currentInfo.isAd) {
            await this.setVolume(webview, 0);
            await this.pause(webview);
        }

        // Update last song title
        if (currentInfo && currentInfo.songTitle) {
            this.lastSongTitles[playerNum] = currentInfo.songTitle;
        }
    }

    // Wait for ad to finish playing (silently)
    async waitForAdToFinish(webview, playerNum) {
        const maxWaitTime = 60000; // Maximum 60 seconds for an ad
        const startTime = Date.now();

        while (Date.now() - startTime < maxWaitTime) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // Check every second

            const info = await this.getPlaybackInfo(webview);

            if (!info) {
                console.log(`[Crossfade] Player ${playerNum} - couldn't get info`);
                break;
            }

            // If no longer an ad, ad has finished
            if (!info.isAd) {
                console.log(`[Crossfade] Player ${playerNum} - ad finished, music ready`);
                await this.pause(webview); // Pause the music that comes after ad
                break;
            }

            // If ad is not playing, it might have ended
            if (!info.isPlaying) {
                console.log(`[Crossfade] Player ${playerNum} - ad stopped playing`);
                // Try to play in case it paused
                await this.play(webview);
                await new Promise(resolve => setTimeout(resolve, 500));

                // Check again
                const newInfo = await this.getPlaybackInfo(webview);
                if (newInfo && !newInfo.isAd) {
                    await this.pause(webview);
                    break;
                }
            }

            // Ensure volume stays at 0 while playing ad
            await this.setVolume(webview, 0);
        }
    }



    // Monitor playback and trigger crossfades
    async monitorPlayback() {
        if (!this.settings.isEnabled || this.crossfadeActive) return;

        const info1 = await this.getPlaybackInfo(this.webview1);
        const info2 = await this.getPlaybackInfo(this.webview2);

        if (!info1 || !info2) return;

        // ===== AUTO-SKIP ADS =====
        // Check both players for ads and auto-skip them
        if (info1.isAd && info1.isPlaying) {
            console.log('[Crossfade] Ad detected in Player 1 - muting and trying to skip');
            await this.setVolume(this.webview1, 0);
            await this.trySkipAd(this.webview1);
        }
        if (info2.isAd && info2.isPlaying) {
            console.log('[Crossfade] Ad detected in Player 2 - muting and trying to skip');
            await this.setVolume(this.webview2, 0);
            await this.trySkipAd(this.webview2);
        }

        // If both are playing, pause the one that should NOT be the leader
        // But only if we're not in the middle of a crossfade
        if (info1.isPlaying && info2.isPlaying && !this.crossfadeActive) {
            // Determine which one to pause based on current leader
            if (this.currentLeader === 1) {
                // Player 1 is leader, pause player 2
                await this.pause(this.webview2);
            } else if (this.currentLeader === 2) {
                // Player 2 is leader, pause player 1
                await this.pause(this.webview1);
            } else {
                // No leader set yet, let player 1 be the leader
                this.currentLeader = 1;
                await this.pause(this.webview2);
            }
            return;
        }

        let playingWebview, pausedWebview, playingInfo, playingNum, pausedNum;

        if (info1.isPlaying && !info2.isPlaying) {
            playingWebview = this.webview1;
            pausedWebview = this.webview2;
            playingInfo = info1;
            playingNum = 1;
            pausedNum = 2;
            this.currentLeader = 1;
        } else if (info2.isPlaying && !info1.isPlaying) {
            playingWebview = this.webview2;
            pausedWebview = this.webview1;
            playingInfo = info2;
            playingNum = 2;
            pausedNum = 1;
            this.currentLeader = 2;
        } else {
            // Neither playing
            this.updateStatus('ready', 'Ready - press play to start');
            this.stopCountdown();
            return;
        }

        // ===== CHECK INACTIVE PLAYER FOR ADS =====
        // While one player is playing music, check if the other has an ad
        const pausedInfo = await this.getPlaybackInfo(pausedWebview);
        if (pausedInfo && pausedInfo.isAd && !pausedInfo.isPlaying) {
            console.log(`[Crossfade] Inactive Player ${pausedNum} has ad - playing silently`);
            await this.setVolume(pausedWebview, 0);
            await this.play(pausedWebview);
        }

        // If inactive player is playing an ad, ensure volume stays at 0
        if (pausedInfo && pausedInfo.isAd && pausedInfo.isPlaying) {
            await this.setVolume(pausedWebview, 0);
        }

        // Update status
        this.updateStatus('active', `Player ${playingNum} active`);

        // Check if we should trigger crossfade
        const timeUntilEnd = playingInfo.duration - playingInfo.currentTime;

        // Don't trigger if duration is invalid or too short
        if (!playingInfo.duration || playingInfo.duration < 10) {
            return;
        }

        // Determine trigger point based on silence detection
        let triggerPoint = this.settings.fadeOutDuration;
        if (this.settings.detectSilence && playingInfo.hasEndingSilence) {
            triggerPoint = Math.min(this.settings.fadeOutDuration, timeUntilEnd - 2);
        }

        // Update countdown
        if (timeUntilEnd <= triggerPoint && timeUntilEnd > 0) {
            this.updateCountdown(Math.ceil(timeUntilEnd));

            // Only trigger crossfade once when we hit the trigger point
            if (timeUntilEnd <= triggerPoint && timeUntilEnd > (triggerPoint - 1)) {
                await this.executeCrossfade(playingWebview, pausedWebview, playingNum, pausedNum);
            }
        } else {
            this.stopCountdown();
        }
    }

    // Start monitoring
    startMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }

        this.monitoringInterval = setInterval(() => {
            this.monitorPlayback();
        }, 1000);
    }

    // Stop monitoring
    stopMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
    }

    // Trigger manual crossfade
    async triggerManualCrossfade() {
        if (this.crossfadeActive) return;

        const info1 = await this.getPlaybackInfo(this.webview1);
        const info2 = await this.getPlaybackInfo(this.webview2);

        if (!info1 || !info2) return;

        // Determine which player is playing
        if (info1.isPlaying && !info2.isPlaying) {
            await this.executeCrossfade(this.webview1, this.webview2, 1, 2);
        } else if (info2.isPlaying && !info1.isPlaying) {
            await this.executeCrossfade(this.webview2, this.webview1, 2, 1);
        }
    }

    // Update countdown timer
    updateCountdown(seconds) {
        this.timeUntilCrossfade = seconds;
        window.dispatchEvent(new CustomEvent('crossfade-countdown', {
            detail: { seconds }
        }));
    }

    // Stop countdown
    stopCountdown() {
        this.timeUntilCrossfade = 0;
        window.dispatchEvent(new CustomEvent('crossfade-countdown', {
            detail: { seconds: 0 }
        }));
    }

    // Update status UI (to be implemented in renderer.js)
    updateStatus(state, message) {
        // Dispatch custom event for renderer to handle
        window.dispatchEvent(new CustomEvent('crossfade-status', {
            detail: { state, message, activePlayer: this.currentLeader }
        }));
    }
}

// Export for use in renderer
window.CrossfadeManager = CrossfadeManager;
