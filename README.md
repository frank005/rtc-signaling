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

## Setup

1. Clone the repository:

```bash
git clone [your-repository-url]
cd rtc-signaling
```

2. Configure your Agora App ID:

   - Sign up for an Agora account
   - Create a new project
   - Copy your App ID
   - Replace the placeholder in the code with your App ID

3. Open `index.html` in your web browser

## Project Structure

- `index.html` - Main HTML interface
- `app.js` - Client-side JavaScript implementation
- `style.css` - Styling for the application
- `agora-rtm-2.2.0.1.js` - Agora RTM SDK

## Usage

1. Open the application in two different browser windows
2. Enter a channel name in both windows
3. Click "Join Channel" to establish a connection
4. The peers will automatically connect and establish a WebRTC connection

## License

[Your chosen license]

## Contributing

[Your contribution guidelines]
