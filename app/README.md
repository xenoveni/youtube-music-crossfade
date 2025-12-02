# YouTube Music Crossfade Desktop App

A standalone Windows desktop application for seamless crossfading between two YouTube Music players.

## 🚀 Features

- **Dual YouTube Music Players**: Side-by-side 50-50 split view
- **Automatic Crossfading**: Smooth transitions between songs
- **Collapsible Sidebar**: Clean, modern control panel with settings
- **Customizable Fade Times**: Independent fade out and fade in durations (5-30 seconds)
- **Beautiful UI**: Dark theme with smooth animations and modern design
- **Settings Persistence**: Your preferences are automatically saved

## 📋 Requirements

- Windows 10 or later
- Internet connection (for YouTube Music)
- Node.js (for development)

## 🛠️ Installation & Running

### For Users (Packaged App)
1. Download the latest release `.exe` file
2. Run the installer
3. Launch "YouTube Music Crossfade" from your Start menu

### For Developers
1. Clone or download this repository
2. Navigate to the `app` directory
3. Install dependencies:
   ```bash
   npm install
   ```
4. Run the app:
   ```bash
   npm start
   ```

## 🎵 How to Use

1. **Launch the app** - Two YouTube Music instances will load
2. **Open the sidebar** - Click the settings button (if collapsed)
3. **Configure settings**:
   - Set your desired **Fade Out Duration** (default: 15s)
   - Set your desired **Fade In Duration** (default: 15s)
   - Toggle **Enable Crossfade** to ON
4. **Start playing music** in one of the players
5. **Enjoy automatic crossfading!** When a song reaches the fade-out time before ending, the other player will automatically start and fade in

## ⚙️ Settings

- **Fade Out Duration**: How long the current song takes to fade to 0% volume (5-30 seconds)
- **Fade In Duration**: How long the next song takes to fade to 100% volume (5-30 seconds)
- **Enable Crossfade**: Toggle automatic crossfading on/off

## 🎨 UI Features

- **Collapsible Sidebar**: Hide the control panel for an immersive music experience
- **Active Player Indicator**: Visual indicator showing which player is currently active
- **Real-time Status**: Live updates on crossfade state
- **Smooth Animations**: Premium feel with gradient effects and transitions

## 🔧 Building for Production

To create a distributable Windows package:

```bash
npm run build
```

This will create an installer in the `dist/` directory.

## 📝 How It Works

The app uses Electron to create a native Windows application with two webview instances. Each webview loads YouTube Music independently. The crossfade manager monitors playback in both players and automatically:

1. Detects when a song is approaching its end
2. Starts the inactive player at 0% volume
3. Gradually fades out the active player (100% → 0%)
4. Simultaneously fades in the inactive player (0% → 100%)
5. Pauses the old player after the song changes
6. Repeats the process for continuous music

## 🐛 Troubleshooting

- **Crossfade not working?**
  - Make sure "Enable Crossfade" is toggled ON
  - Verify that at least one player is actively playing music
  - Check that both YouTube Music instances have loaded properly

- **Audio issues?**
  - Refresh the app (you may need to restart)
  - Check your system volume settings
  - Ensure you're logged into YouTube Music in both players

## 📄 License

MIT License - Feel free to use and modify!

## 🙏 Credits

Based on the original [YouTube Music Crossfade Chrome Extension](https://github.com/xenoveni/youtube-music-crossfade)
