# WebRTC Signaling Client

A real-time communication client implementation using WebRTC and Agora RTM (Real-Time Messaging).

## Overview

This project implements a WebRTC signaling client that facilitates peer-to-peer connections between browsers. It uses Agora's Real-Time Messaging (RTM) service for signaling and WebRTC for peer-to-peer communication.

## Features

- Real-time signaling using Agora RTM
- WebRTC peer-to-peer connections
- Modern and responsive UI
- Support for multiple concurrent connections

## Prerequisites

- A modern web browser with WebRTC support
- Agora account and App ID (for RTM service)
- Node.js (v14 or higher)

## Setup

1. Clone the repository:

```bash
git clone [your-repository-url]
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
   - Replace the placeholder in the code with your App ID

4. Start the development server:

```bash
npm run dev
```

The application will automatically open in your default browser at `http://localhost:3000`.

## Project Structure

- `src/` - Source files
  - `index.html` - Main HTML interface
  - `app.js` - Client-side JavaScript implementation
  - `style.css` - Styling for the application
- `vite.config.js` - Vite configuration
- `package.json` - Project dependencies and scripts

## Dependencies

- `agora-rtm-sdk` - Agora Real-Time Messaging SDK (v2.2.0.1)
- `vite` - Build tool and development server

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally

## Usage

1. Open the application in two different browser windows
2. Enter a channel name in both windows
3. Click "Join Channel" to establish a connection
4. The peers will automatically connect and establish a WebRTC connection

## License

[Your chosen license]

## Contributing

[Your contribution guidelines]
