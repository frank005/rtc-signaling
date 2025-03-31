/******************************
 * Agora RTM 2.x DEMO (Signaling 2.x)
 ******************************/
let rtmClient = null;
let rtmChannel = null;

// RTC Client
let rtcClient = null;
let localAudioTrack = null;
let localVideoTrack = null;

let localInbox = "";  // "inbox_userX"
let subscribedChannel = null; // e.g. "testChannel"

// DOM elements
const loginBtn           = document.getElementById("loginBtn");
const logoutBtn          = document.getElementById("logoutBtn");
const subscribeBtn       = document.getElementById("subscribeBtn");
const unsubscribeBtn     = document.getElementById("unsubscribeBtn");
const sendChannelMsgBtn  = document.getElementById("sendChannelMsgBtn");
const sendPeerMsgBtn     = document.getElementById("sendPeerMsgBtn");

const appIdInput         = document.getElementById("appId");
const tokenInput         = document.getElementById("token");
const userIdInput        = document.getElementById("userId");
const channelNameInput   = document.getElementById("channelName");
const channelMsgInput    = document.getElementById("channelMsg");
const peerIdInput        = document.getElementById("peerId");
const peerMsgInput       = document.getElementById("peerMsg");

const loginStatus        = document.getElementById("loginStatus");
const channelStatus      = document.getElementById("channelStatus");
const channelChatBox     = document.getElementById("channelChatBox");
const peerChatBox        = document.getElementById("peerChatBox");

// Video Elements
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const startVideoBtn = document.getElementById('startVideoBtn');
const stopVideoBtn = document.getElementById('stopVideoBtn');
const muteAudioBtn = document.getElementById('muteAudioBtn');
const unmuteAudioBtn = document.getElementById('unmuteAudioBtn');

// Modal Elements
const loginModal = document.getElementById('loginModal');
const showLoginBtn = document.getElementById('showLoginBtn');
const closeModalBtn = document.getElementById('closeModalBtn');

// Tab Elements
const tabBtns = document.querySelectorAll('.tab-btn');
const chatPanels = document.querySelectorAll('.chat-panel');

// Simplified RTM config
const rtmConfig = {
  presenceTimeout: 30, // in seconds
  logUpload: false,
  logLevel: "debug",
  cloudProxy: false,
  useStringUserId: true
};

// Add new variables for participant management
let participants = new Set();
const participantsList = document.getElementById('participantsList');
const presenceIndicator = document.getElementById('presenceIndicator');

// Add new variables for device selection
let audioDevices = [];
let videoDevices = [];
const deviceModal = document.getElementById('deviceModal');
const showDeviceBtn = document.getElementById('showDeviceBtn');
const closeDeviceBtn = document.getElementById('closeDeviceBtn');
const audioSelect = document.getElementById('audioSelect');
const videoSelect = document.getElementById('videoSelect');

// Add new variables for message notifications
let unreadChannelMessages = 0;
let unreadPeerMessages = 0;
const channelTab = document.querySelector('[data-tab="channel"]');
const peerTab = document.querySelector('[data-tab="peer"]');

// Update the video elements to include labels
const localVideoLabel = document.createElement('div');
localVideoLabel.className = 'video-label';
localVideoLabel.textContent = 'Local Video';
localVideo.appendChild(localVideoLabel);

const remoteVideoLabel = document.createElement('div');
remoteVideoLabel.className = 'video-label';
remoteVideoLabel.textContent = 'Remote Video';
remoteVideo.appendChild(remoteVideoLabel);

/** Append text message in any chatbox. */
function addChatMessage(container, text) {
  const div = document.createElement("div");
  div.className = "chat-message";
  div.textContent = text;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

/** Login to RTM (Signaling 2.x). */
loginBtn.addEventListener("click", async () => {
  const appId  = appIdInput.value.trim();
  const token  = tokenInput.value.trim() || null;
  const userId = userIdInput.value.trim();

  if (!appId || !userId) {
    alert("Please provide App ID and User ID");
    return;
  }

  try {
    // Create and initialize RTM client
    const { RTM } = AgoraRTM;
    rtmClient = new RTM(appId, userId, rtmConfig);

    // Set up RTM event listeners
    rtmClient.addEventListener("status", evt => {
      console.log("RTM Status Event:", evt);
      updatePresenceIndicator(evt.state === 'CONNECTED');
      loginStatus.textContent = `Logged in as "${userId}"`;
    });

    rtmClient.addEventListener("message", handleRtmChannelMessage);
    rtmClient.addEventListener("presence", handleRtmPresenceEvent);

    // Login to RTM
    await rtmClient.login({ token });
    localInbox = "inbox_" + userId;
    
    // Subscribe to personal inbox
    await rtmClient.subscribe(localInbox, {
      withMessage: true,
      withPresence: false,
      withMetadata: false,
      withLock: false
    });

    // Enable UI
    logoutBtn.disabled = false;
    subscribeBtn.disabled = false;
    sendPeerMsgBtn.disabled = false;
    startVideoBtn.disabled = false;

    // Initialize RTC only after successful RTM login
    await initializeRTC(appId, token, userId);
    
    // Hide login modal
    hideModal();

    // Update local video label with user ID
    localVideoLabel.textContent = userId;
  } catch (err) {
    console.error("Login failed:", err);
    alert("Login failed, see console.");
  }
});

/** Logout & cleanup. */
logoutBtn.addEventListener("click", async () => {
  try {
    // Clean up RTM
    if (subscribedChannel) {
      await rtmClient.unsubscribe(subscribedChannel);
    }
    if (localInbox) {
      await rtmClient.unsubscribe(localInbox);
    }
    await rtmClient.logout();
    
    // Clean up RTC
    if (rtcClient) {
      await rtcClient.leave();
    }
    
    // Reset state
    rtmClient = null;
    rtcClient = null;
    participants.clear();
    updateParticipantsList();
    updatePresenceIndicator(false);
    
    // Update UI
    loginStatus.textContent = "Not logged in";
    logoutBtn.disabled = true;
    subscribeBtn.disabled = true;
    unsubscribeBtn.disabled = true;
    sendChannelMsgBtn.disabled = true;
    sendPeerMsgBtn.disabled = true;
    startVideoBtn.disabled = true;
  } catch (err) {
    console.error("Logout error:", err);
  }
});

/** Subscribe to a channel (with messages + presence). */
subscribeBtn.addEventListener("click", async () => {
  if (!rtmClient) {
    alert("Please login first!");
    return;
  }
  const channelName = channelNameInput.value.trim();
  if (!channelName) {
    alert("Channel name required");
    return;
  }

  try {
    // Subscribe to RTM channel
    await rtmClient.subscribe(channelName, {
      withMessage: true,
      withPresence: true,
      withMetadata: false,
      withLock: false
    });
    subscribedChannel = channelName;
    channelStatus.textContent = `Subscribed to "${channelName}"`;
    addChatMessage(channelChatBox, `You subscribed to channel: ${channelName}`);

    // Join RTC channel
    if (rtcClient) {
      await rtcClient.join(
        appIdInput.value,
        channelName,
        tokenInput.value || null,
        userIdInput.value
      );
    }

    // Update UI
    subscribeBtn.disabled = true;
    unsubscribeBtn.disabled = false;
    sendChannelMsgBtn.disabled = false;
  } catch (err) {
    console.error("Channel subscription failed:", err);
    if (err.message.includes('UID_CONFLICT')) {
      alert('UID conflict detected. Please log out and try again with a different user ID.');
    }
  }
});

/** Unsubscribe from the currently subscribed channel. */
unsubscribeBtn.addEventListener("click", async () => {
  if (!rtmClient || !subscribedChannel) return;
  try {
    await rtmClient.unsubscribe(subscribedChannel);
    addChatMessage(channelChatBox, `Unsubscribed from ${subscribedChannel}`);
    channelStatus.textContent = "Not subscribed to any channel";
    subscribedChannel = null;
    subscribeBtn.disabled     = false;
    unsubscribeBtn.disabled   = true;
    sendChannelMsgBtn.disabled = true;

    if (rtmChannel) {
      await rtmChannel.leave();
      rtmChannel = null;
    }
  } catch (err) {
    console.error("Unsubscribe error:", err);
  }
});

/** Publish a message to the subscribed channel. */
sendChannelMsgBtn.addEventListener("click", async () => {
  if (!rtmClient || !subscribedChannel) {
    alert("Subscribe to a channel first!");
    return;
  }
  const msg = channelMsgInput.value.trim();
  if (!msg) return;
  try {
    await rtmClient.publish(subscribedChannel, msg);
    addChatMessage(channelChatBox, `[You]: ${msg}`);
    channelMsgInput.value = "";
  } catch (err) {
    console.error("Publish error:", err);
  }
});

/** Send a direct P2P message by publishing to "inbox_<peerId>" channel. */
sendPeerMsgBtn.addEventListener("click", async () => {
  if (!rtmClient) {
    alert("Login first!");
    return;
  }
  const peerId = peerIdInput.value.trim();
  if (!peerId) {
    alert("Peer ID is required");
    return;
  }
  const message = peerMsgInput.value.trim();
  if (!message) return;

  // P2P is just "publish" to their "inbox_peerID" channel
  const peerInbox = "inbox_" + peerId;
  try {
    await rtmClient.publish(peerInbox, message);
    addChatMessage(peerChatBox, `[To ${peerId}]: ${message}`);
    peerMsgInput.value = "";
  } catch (err) {
    console.error("Send peer message error:", err);
  }
});

/** Handle channel messages from RTM 2.x events. */
function handleRtmChannelMessage(evt) {
  const { channelType, channelName, publisher, message } = evt;
  // The event might also have topicName, messageType, customType, publishTime, etc.

  // If it's your personal inbox => that's a "peer message"
  if (channelName === localInbox) {
    addChatMessage(peerChatBox, `[From ${publisher}]: ${message}`);
    return;
  }

  // Otherwise, it's a normal channel
  addChatMessage(channelChatBox, `[${publisher}]: ${message}`);
}

/** Handle presence events (join/leave/timeouts) from RTM 2.x. */
function handleRtmPresenceEvent(evt) {
  const { eventType, publisher, channelName } = evt;
  
  if (channelName === subscribedChannel) {
    if (eventType === 'JOIN') {
      participants.add(publisher);
      // Update remote video label when user joins
      remoteVideoLabel.textContent = `Remote Video (${publisher})`;
    } else if (eventType === 'LEAVE' || eventType === 'TIMEOUT') {
      participants.delete(publisher);
      // Reset remote video label when user leaves
      if (participants.size === 0) {
        remoteVideoLabel.textContent = 'Remote Video';
      }
    }
    updateParticipantsList();
    addChatMessage(channelChatBox, `Presence: [${publisher}] ${eventType} channel "${channelName}"`);
  }
}

// RTC Event Handlers
async function initializeRTC(appId, token, userId) {
  try {
    if (rtcClient) {
      await rtcClient.leave();
    }

    rtcClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
    
    // Set up RTC event listeners
    rtcClient.on('user-published', async (user, mediaType) => {
      await rtcClient.subscribe(user, mediaType);
      if (mediaType === 'video') {
        user.videoTrack.play(remoteVideo);
      }
    });
    
    rtcClient.on('user-unpublished', (user) => {
      if (user.videoTrack) {
        user.videoTrack.stop();
      }
    });

    // Only join if we have a channel name
    if (channelNameInput.value.trim()) {
      await rtcClient.join(appId, channelNameInput.value, token, userId);
    }
  } catch (error) {
    console.error('RTC initialization failed:', error);
    if (error.message.includes('UID_CONFLICT')) {
      alert('UID conflict detected. Please log out and try again with a different user ID.');
    }
  }
}

async function joinChannel() {
  try {
    rtmChannel = rtmClient.createChannel(channelNameInput.value);
    
    rtmChannel.on('ChannelMessage', (message, memberId) => {
      displayChannelMessage(memberId, message.text);
    });
    
    rtmChannel.on('MemberJoined', (memberId) => {
      displaySystemMessage(channelChatBox, `${memberId} joined the channel`);
    });
    
    rtmChannel.on('MemberLeft', (memberId) => {
      displaySystemMessage(channelChatBox, `${memberId} left the channel`);
    });

    await rtmChannel.join();
    updateChannelStatus('Connected to channel');
    enableChannelControls(true);
  } catch (error) {
    console.error('Error joining channel:', error);
    updateChannelStatus('Failed to join channel: ' + error.message);
  }
}

async function startVideo() {
  try {
    localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
    localVideoTrack = await AgoraRTC.createCameraVideoTrack();
    
    localVideoTrack.play(localVideo);
    await rtcClient.publish([localAudioTrack, localVideoTrack]);
    
    enableVideoControls(true);
  } catch (error) {
    console.error('Error starting video:', error);
  }
}

async function stopVideo() {
  try {
    if (localAudioTrack) {
      localAudioTrack.close();
    }
    if (localVideoTrack) {
      localVideoTrack.close();
    }
    await rtcClient.unpublish();
    enableVideoControls(false);
  } catch (error) {
    console.error('Error stopping video:', error);
  }
}

// UI Update Functions
function updateLoginStatus(state) {
  loginStatus.textContent = `Login Status: ${state}`;
  if (state === 'CONNECTED') {
    loginBtn.disabled = true;
    logoutBtn.disabled = false;
    startVideoBtn.disabled = false;
    subscribeBtn.disabled = false;
  }
}

function updateChannelStatus(message) {
  channelStatus.textContent = message;
}

function enableChannelControls(enabled) {
  subscribeBtn.disabled = enabled;
  unsubscribeBtn.disabled = !enabled;
  channelMsgInput.disabled = !enabled;
  sendChannelMsgBtn.disabled = !enabled;
}

function enableVideoControls(enabled) {
  startVideoBtn.disabled = enabled;
  stopVideoBtn.disabled = !enabled;
  muteAudioBtn.disabled = !enabled;
  unmuteAudioBtn.disabled = !enabled;
}

// Message Display Functions
function displayChannelMessage(senderId, message) {
  const messageElement = document.createElement('div');
  messageElement.className = `message ${senderId === userIdInput.value ? 'self' : 'other'}`;
  messageElement.textContent = `${senderId}: ${message}`;
  channelChatBox.appendChild(messageElement);
  channelChatBox.scrollTop = channelChatBox.scrollHeight;
}

function displaySystemMessage(container, message) {
  const messageElement = document.createElement('div');
  messageElement.className = 'message system';
  messageElement.textContent = message;
  container.appendChild(messageElement);
  container.scrollTop = container.scrollHeight;
}

// Event Listeners
startVideoBtn.addEventListener('click', startVideo);
stopVideoBtn.addEventListener('click', stopVideo);

muteAudioBtn.addEventListener('click', () => {
  if (localAudioTrack) {
    localAudioTrack.setEnabled(false);
    muteAudioBtn.disabled = true;
    unmuteAudioBtn.disabled = false;
  }
});

unmuteAudioBtn.addEventListener('click', () => {
  if (localAudioTrack) {
    localAudioTrack.setEnabled(true);
    muteAudioBtn.disabled = false;
    unmuteAudioBtn.disabled = true;
  }
});

// Modal Functions
function showModal() {
  loginModal.style.display = 'block';
}

function hideModal() {
  loginModal.style.display = 'none';
}

// Tab Functions
function switchTab(tabId) {
  tabBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });
  
  chatPanels.forEach(panel => {
    panel.classList.toggle('active', panel.id === `${tabId}Chat`);
  });
}

// Event Listeners for Modal
showLoginBtn.addEventListener('click', showModal);
closeModalBtn.addEventListener('click', hideModal);

window.addEventListener('click', (event) => {
  if (event.target === loginModal) {
    hideModal();
  }
});

// Event Listeners for Tabs
tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    switchTab(btn.dataset.tab);
  });
});

// Add participant management functions
function updatePresenceIndicator(isOnline) {
  presenceIndicator.className = `presence-indicator ${isOnline ? 'online' : 'offline'}`;
}

function updateParticipantsList() {
  participantsList.innerHTML = '';
  participants.forEach(participant => {
    const participantElement = document.createElement('div');
    participantElement.className = 'participant-item';
    participantElement.innerHTML = `
      <span class="presence-indicator online"></span>
      <span>${participant}</span>
    `;
    participantElement.addEventListener('click', () => {
      peerIdInput.value = participant;
      switchTab('peer');
    });
    participantsList.appendChild(participantElement);
  });
}

// Add device selection functions
async function loadDevices() {
  try {
    audioDevices = await AgoraRTC.getMicrophones();
    videoDevices = await AgoraRTC.getCameras();
    
    audioSelect.innerHTML = audioDevices.map(device => 
      `<option value="${device.deviceId}">${device.label || `Microphone ${device.deviceId}`}</option>`
    ).join('');
    
    videoSelect.innerHTML = videoDevices.map(device => 
      `<option value="${device.deviceId}">${device.label || `Camera ${device.deviceId}`}</option>`
    ).join('');
  } catch (error) {
    console.error('Error loading devices:', error);
  }
}

async function switchAudioDevice(deviceId) {
  if (localAudioTrack) {
    await localAudioTrack.setDevice(deviceId);
  }
}

async function switchVideoDevice(deviceId) {
  if (localVideoTrack) {
    await localVideoTrack.setDevice(deviceId);
  }
}

// Add event listeners for device selection
audioSelect.addEventListener('change', (e) => switchAudioDevice(e.target.value));
videoSelect.addEventListener('change', (e) => switchVideoDevice(e.target.value));

// Modal functions for device selection
function showDeviceModal() {
  deviceModal.style.display = 'block';
  loadDevices();
}

function hideDeviceModal() {
  deviceModal.style.display = 'none';
}

// Add event listeners for device modal
showDeviceBtn.addEventListener('click', showDeviceModal);
closeDeviceBtn.addEventListener('click', hideDeviceModal);