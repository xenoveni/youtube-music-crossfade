# Project Structure

This document describes the structure of the YouTube Music Crossfade application built with Electron and Brave-style ad-blocking.

## Directory Structure

```
app/
├── __tests__/              # Test files
│   └── setup.test.js       # Test environment verification
├── node_modules/           # Dependencies
├── index.html              # Main window HTML
├── main.js                 # Main process (Electron)
├── renderer.js             # Renderer process (UI logic)
├── preload.js              # Preload script (IPC bridge)
├── crossfade.js            # Crossfade manager logic
├── brave-shields.js        # Ad-blocking content script
├── styles.css              # Main window styles
├── settings.html           # Settings window HTML
├── settings.js             # Settings window logic
├── settings-styles.css     # Settings window styles
├── package.json            # Project dependencies and scripts
├── jest.config.js          # Jest testing configuration
└── PROJECT_STRUCTURE.md    # This file
```

## Dependencies

### Production Dependencies
- **@ghostery/adblocker-electron** (^2.12.5): Brave-compatible ad-blocking with filter list support
- **cross-fetch** (^4.1.0): Cross-platform fetch API for filter list updates

### Development Dependencies
- **electron** (^28.0.0): Desktop application framework
- **electron-builder** (^24.9.1): Application packaging and distribution
- **jest** (^29.7.0): Testing framework
- **fast-check** (^3.15.0): Property-based testing library
- **@types/jest** (^29.5.11): TypeScript definitions for Jest

## Testing Setup

### Jest Configuration
- Test environment: Node.js
- Test pattern: `**/__tests__/**/*.js` and `**/*.test.js`
- Coverage directory: `coverage/`
- Test timeout: 10 seconds

### Property-Based Testing
- Library: fast-check
- Minimum iterations per property test: 100
- Configuration constant: `PBT_CONFIG = { numRuns: 100 }`

## NPM Scripts

- `npm start`: Launch the Electron application
- `npm test`: Run all tests with Jest
- `npm run test:watch`: Run tests in watch mode
- `npm run build`: Build application installer with electron-builder

## Requirements Validated

This setup satisfies the following requirements from the specification:
- **Requirement 11.1**: Application uses Electron as the desktop framework
- **Requirement 11.2**: Webviews configured with Brave's ad-blocking features

## Next Steps

The project structure is ready for implementation. The next tasks will involve:
1. Implementing the SettingsManager component
2. Implementing the BraveShieldsManager component
3. Implementing the WindowManager component
4. Building out the crossfade logic
5. Writing property-based tests for each component
