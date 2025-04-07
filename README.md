# RTC Signaling Client

A real-time communication client built with Agora RTM 2.0 (Signaling) and RTC SDKs.

## Overview

This project implements a feature-rich video conferencing and chat application using Agora's Real-Time Messaging (RTM 2.0) service for signaling and Real-Time Communication (RTC) for audio/video streaming. The application supports both channel-based group communication and peer-to-peer messaging.

## Features

- **Video Conferencing**
  - High-quality video and audio streaming
  - Dynamic 2x2 video grid layout
  - Device selection (camera and microphone)
  - Audio/video mute controls
  - Custom video labels with user IDs

- **Real-time Messaging**
  - Channel-based group chat
  - Peer-to-peer private messaging
  - Presence indicators for online users
  - System messages for join/leave events
  - Real-time participant list
  - Message timestamps

- **User Experience**
  - Modern dark theme UI
  - Color-coded messages per user
  - Tabbed interface for channel and peer chat
  - Responsive layout
  - Keyboard shortcuts (Enter to send messages)

## Prerequisites

- A modern web browser with WebRTC support
- Agora account and App ID (for RTM and RTC services)
- Node.js (v14 or higher) for local development

## Setup

1. Clone the repository:

```bash
git clone https://github.com/yourusername/rtc-signaling.git
cd rtc-signaling
```

2. Install dependencies:

```bash
npm install
```

3. Configure your Agora App ID:
   - Sign up for an Agora account
   - Create a new project
   - Copy your App ID
   - Enter your App ID when prompted in the application

4. Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173`.

## Usage Guide

1. **Login**
   - Enter your App ID and User ID
   - Click "Login"

2. **Join a Channel**
   - Enter a channel name
   - Click "Subscribe" to join the signaling channel
   - Click "Join Channel" to start video conferencing

3. **Chat in the Channel**
   - Type messages in the channel chat
   - Press Enter or click "Send" to send messages
   - All participants in the channel will receive your messages

4. **Private Messaging**
   - Click on a participant's name from the list
   - The interface will switch to peer chat
   - Type your message and press Enter or click "Send"
   - Only the selected participant will receive your message

5. **Video Controls**
   - Click "Mute Video" to toggle your camera
   - Click "Mute Audio" to toggle your microphone
   - Click "Device Settings" to change input devices

6. **Leaving**
   - Click "Leave Channel" to stop video conferencing
   - Click "Unsubscribe" to leave the signaling channel
   - Click "Logout" to sign out completely

## Project Structure

- `index.html` - Main HTML interface
- `app.js` - Client-side JavaScript implementation
- `style.css` - Styling for the application
- `vite.config.js` - Vite configuration
- `package.json` - Project dependencies and scripts

## Dependencies

- `agora-rtm-sdk` - Agora Real-Time Messaging SDK (v2.x)
- `agora-rtc-sdk-ng` - Agora Real-Time Communication SDK
- `vite` - Build tool and development server

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally

## Browser Support

The application works best in modern browsers that support WebRTC:
- Chrome (recommended)
- Firefox
- Safari
- Edge

## License

[MIT License](LICENSE)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
