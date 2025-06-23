# ADN Audio Broadcaster

A desktop-based admin tool for live audio broadcasting from ministry sound equipment to an online audience.

## Features

- Automatic audio device detection across Windows, macOS, and Linux
- Simple, user-friendly interface for non-technical administrators
- Secure storage of streaming credentials
- Real-time streaming status and logs
- Cross-platform support (Windows, macOS, Linux)

## Installation

### Prerequisites

- Node.js 16+ and npm
- Git

### Development Setup

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

### Building for Production

To build the application for your current platform:

```bash
npm run build
npm run package
```

Platform-specific builds:

```bash
# Windows
npm run package:win

# macOS
npm run package:mac

# Linux
npm run package:linux
```

The packaged applications will be available in the `release` directory.

## FFmpeg Integration

This application requires FFmpeg for audio streaming. During development, you can:

1. Install FFmpeg globally on your system
2. For production builds, place platform-specific FFmpeg binaries in:
   - `assets/ffmpeg/win/` for Windows
   - `assets/ffmpeg/mac/` for macOS
   - `assets/ffmpeg/linux/` for Linux

## Configuration

The application stores configuration securely using encryption. For production deployment, set the `STREAM_KEY_SECRET` environment variable to a secure value.

## Architecture

- **Electron Main Process**: Handles audio device detection, FFmpeg process management, and IPC
- **React Renderer Process**: Provides the user interface
- **IPC Bridge**: Facilitates communication between main and renderer processes
- **FFmpeg Controller**: Manages the FFmpeg process for streaming
- **Config Manager**: Securely stores and retrieves configuration
