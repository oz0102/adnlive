# ADN Audio Broadcaster - Cross-Platform Testing Guide

This document provides instructions for testing the ADN Audio Broadcaster application across different operating systems.

## Prerequisites

Before testing, ensure you have:

1. Node.js 16+ and npm installed
2. Git installed
3. FFmpeg installed (for development testing)
4. Audio input devices available on your system

## Development Testing

### Setup

1. Clone the repository:
```bash
git clone https://github.com/your-org/adn-audio-broadcaster.git
cd adn-audio-broadcaster
```

2. Install dependencies:
```bash
npm install
```

3. Set up asset directories:
```bash
chmod +x setup-assets.sh
./setup-assets.sh
```

4. Run in development mode:
```bash
npm run dev
```

### Testing Checklist

#### Audio Device Detection

- [ ] Application detects and lists available audio input devices
- [ ] Default device is selected automatically
- [ ] Changing device selection works correctly
- [ ] Device selection persists between application restarts

#### Stream Configuration

- [ ] RTMP URL and Stream Key fields accept input correctly
- [ ] Stream Key is masked by default and can be revealed
- [ ] Advanced settings can be toggled
- [ ] Configuration persists between application restarts
- [ ] Stream Key is stored securely (encrypted)

#### Streaming Controls

- [ ] Start button is disabled when required fields are empty
- [ ] Start button initiates streaming correctly
- [ ] Stop button stops streaming correctly
- [ ] Status indicators update in real-time
- [ ] Duration timer works correctly during streaming

#### Logging

- [ ] Log viewer displays FFmpeg output correctly
- [ ] Auto-scroll works as expected
- [ ] Clear logs button functions correctly
- [ ] Log entries are timestamped and formatted properly

## Production Build Testing

### Building for Each Platform

#### Windows

```bash
npm run package:win
```

Test the generated installer in `release/` directory.

#### macOS

```bash
npm run package:mac
```

Test the generated DMG in `release/` directory.

#### Linux

```bash
npm run package:linux
```

Test the generated AppImage and DEB in `release/` directory.

### Production Testing Checklist

- [ ] Application installs correctly
- [ ] Application icon appears in system menus/dock/taskbar
- [ ] Application launches without errors
- [ ] FFmpeg is correctly bundled and accessible
- [ ] All functionality works as expected in production build
- [ ] Configuration is stored in the correct system location
- [ ] Uninstallation works correctly

## Common Issues and Troubleshooting

### Windows

- If audio devices aren't detected, check that the application has permission to access audio devices
- For streaming issues, verify that Windows Defender Firewall isn't blocking the connection

### macOS

- If permission dialogs appear for microphone access, ensure they are accepted
- Check that FFmpeg binary has execution permissions

### Linux

- Verify ALSA is properly configured
- For AppImage, ensure it has execution permissions (`chmod +x`)
- For DEB packages, check installation logs for any dependency issues

## Reporting Issues

When reporting issues, please include:

1. Operating system and version
2. Application version
3. Steps to reproduce the issue
4. Expected behavior
5. Actual behavior
6. Error messages or logs
7. Screenshots if applicable
