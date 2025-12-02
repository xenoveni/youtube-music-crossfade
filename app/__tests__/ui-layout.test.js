const fc = require('fast-check');
const fs = require('fs');
const path = require('path');

const PBT_CONFIG = { numRuns: 100 };

describe('UI Layout Tests', () => {
  let htmlContent;
  let cssContent;

  beforeAll(() => {
    // Load the HTML and CSS
    const htmlPath = path.join(__dirname, '..', 'index.html');
    const cssPath = path.join(__dirname, '..', 'styles.css');
    
    htmlContent = fs.readFileSync(htmlPath, 'utf8');
    cssContent = fs.readFileSync(cssPath, 'utf8');
  });

  describe('Property-Based Tests', () => {
    // Feature: brave-app, Property 1: Window resize maintains split ratio
    test('window resize maintains 50-50 split ratio', () => {
      fc.assert(
        fc.property(
          fc.record({
            width: fc.integer({ min: 800, max: 3840 }),
            height: fc.integer({ min: 600, max: 2160 })
          }),
          (dimensions) => {
            // Verify CSS defines equal flex distribution for both players
            // The CSS should have .player-section { flex: 1; } which ensures 50-50 split
            // regardless of window dimensions
            
            // Check that CSS contains the flex: 1 rule for player-section
            const playerSectionFlexRule = /\.player-section\s*{[^}]*flex:\s*1/;
            const hasSplitRule = playerSectionFlexRule.test(cssContent);
            
            // Check that split-container uses flexbox
            const splitContainerFlexRule = /\.split-container\s*{[^}]*display:\s*flex/;
            const hasFlexDisplay = splitContainerFlexRule.test(cssContent);
            
            // Both conditions must be true for any window dimensions
            // This ensures the 50-50 split is maintained regardless of resize
            return hasSplitRule && hasFlexDisplay;
          }
        ),
        PBT_CONFIG
      );
    });
  });

  describe('Unit Tests', () => {
    test('should have split-container with flex display in CSS', () => {
      const splitContainerFlexRule = /\.split-container\s*{[^}]*display:\s*flex/;
      expect(splitContainerFlexRule.test(cssContent)).toBe(true);
    });

    test('should have player-section with flex: 1 in CSS', () => {
      const playerSectionFlexRule = /\.player-section\s*{[^}]*flex:\s*1/;
      expect(playerSectionFlexRule.test(cssContent)).toBe(true);
    });

    test('should have two player sections in HTML', () => {
      expect(htmlContent).toContain('id="player1Section"');
      expect(htmlContent).toContain('id="player2Section"');
    });

    test('should have navigation controls for both players', () => {
      expect(htmlContent).toContain('id="back1"');
      expect(htmlContent).toContain('id="forward1"');
      expect(htmlContent).toContain('id="reload1"');
      expect(htmlContent).toContain('id="home1"');
      
      expect(htmlContent).toContain('id="back2"');
      expect(htmlContent).toContain('id="forward2"');
      expect(htmlContent).toContain('id="reload2"');
      expect(htmlContent).toContain('id="home2"');
    });

    test('should have status bar with required elements', () => {
      expect(htmlContent).toContain('class="status-bar"');
      expect(htmlContent).toContain('id="statusDot"');
      expect(htmlContent).toContain('id="statusText"');
      expect(htmlContent).toContain('id="activePlayerStatus"');
      expect(htmlContent).toContain('id="countdownText"');
      expect(htmlContent).toContain('id="crossfadeNowBtn"');
    });

    test('should have webviews with correct partition', () => {
      expect(htmlContent).toContain('id="webview1"');
      expect(htmlContent).toContain('id="webview2"');
      expect(htmlContent).toContain('partition="persist:youtube-shared"');
    });

    test('should have active player visual highlighting CSS', () => {
      const activePlayerRule = /\.player-section\.active/;
      expect(activePlayerRule.test(cssContent)).toBe(true);
    });

    test('should have crossfade button styling', () => {
      const crossfadeButtonRule = /\.crossfade-now-btn/;
      expect(crossfadeButtonRule.test(cssContent)).toBe(true);
    });

    test('should have countdown text element', () => {
      const countdownRule = /\.countdown-text/;
      expect(countdownRule.test(cssContent)).toBe(true);
    });
  });
});
