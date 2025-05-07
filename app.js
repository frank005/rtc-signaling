/******************************
 * Agora RTM 2.x DEMO (Signaling 2.x)
 ******************************/
let rtmClient = null;
let rtmChannel = null;

// Add metadata constants
const METADATA_KEY = "screenShare";
const METADATA_NAMESPACE = "rtc";

// RTC Client
let rtcClient = null;
let localAudioTrack = null;
let localVideoTrack = null;

let localInbox = ""; // "inbox_userX"
let subscribedChannel = null; // e.g. "testChannel"

// DOM elements
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const subscribeBtn = document.getElementById("subscribeBtn");
const unsubscribeBtn = document.getElementById("unsubscribeBtn");
const sendChannelMsgBtn = document.getElementById("sendChannelMsgBtn");
const sendPeerMsgBtn = document.getElementById("sendPeerMsgBtn");

const appIdInput = document.getElementById("appId");
const tokenInput = document.getElementById("token");
const userIdInput = document.getElementById("userId");
const channelNameInput = document.getElementById("channelName");
const channelMsgInput = document.getElementById("channelMsg");
const peerIdInput = document.getElementById("peerId");
const peerMsgInput = document.getElementById("peerMsg");

const loginStatus = document.getElementById("loginStatus");
const channelStatus = document.getElementById("channelStatus");
const channelChatBox = document.getElementById("channelChatBox");
const peerChatBox = document.getElementById("peerChatBox");

// Video Elements
const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");

// Modal Elements
const loginModal = document.getElementById("loginModal");
const showLoginBtn = document.getElementById("showLoginBtn");
const closeModalBtn = document.getElementById("closeModalBtn");

// Tab Elements
const tabBtns = document.querySelectorAll(".tab-btn");
const chatPanels = document.querySelectorAll(".chat-panel");

// Simplified RTM config
const rtmConfig = {
  presenceTimeout: 30, // in seconds
  logUpload: false,
  logLevel: "debug",
  cloudProxy: false,
  useStringUserId: true,
};

// Add new variables for participant management
let participants = new Set();
const participantsList = document.getElementById("participantsList");
const presenceIndicator = document.getElementById("presenceIndicator");

// Add new variables for device selection
let audioDevices = [];
let videoDevices = [];
const deviceModal = document.getElementById("deviceModal");
const showDeviceBtn = document.getElementById("showDeviceBtn");
const closeDeviceBtn = document.getElementById("closeDeviceBtn");
const audioSelect = document.getElementById("audioSelect");
const videoSelect = document.getElementById("videoSelect");

// Add new variables for message notifications
let unreadChannelMessages = 0;
let unreadPeerMessages = 0;
const channelTab = document.querySelector('[data-tab="channel"]');
const peerTab = document.querySelector('[data-tab="peer"]');

// Add new variables for video management
const additionalVideos = document.getElementById("additionalVideos");
let remoteVideos = new Map(); // Map to track remote video elements

// Add PiP-related variables
const pipBtn = document.getElementById("pipBtn");
const pipContainer = document.getElementById("pipContainer");
let pipTriggeredByButton = false;

// Add tracking variable for PiP source
let pipSource = null;

// Add a map to track active peer chats
const activePeerChats = new Map();

// Add variables to track the selected peer
let selectedPeer = null;

// Add new variables for volume detection
let volumeDetectionInterval = null;
const VOLUME_SPEAKING_THRESHOLD = 50; // Updated to use dB values
const VOLUME_HIGH_THRESHOLD = 55; // Updated to use dB values
let isTalkingWhileMuted = false;
let micMuteIndicators = new Map();
let cameraMuteIndicators = new Map();

// Add new variables to track user states
const userTrackStates = new Map(); // Map to track the state of each user's tracks

// Add new variables for video stats
const videoStatsIntervalMs = 1000; // Update interval for stats
let videoStatsInterval = null;
let videoStatsEnabled = false;
const videoStatsOverlays = new Map(); // Map to track stats overlays
let clientStatsOverlay = null;

// Update variables to track network quality
let networkQualityIndicators = new Map();
let userNetworkQuality = new Map(); // Store the latest network quality levels

// Add network quality polling interval
let networkQualityInterval = null;
const NETWORK_QUALITY_INTERVAL_MS = 2000; // Poll every 2 seconds

// Update the localVideoLabel creation to be a function
const localVideoLabel = document.createElement("div");
localVideoLabel.className = "video-label";
localVideoLabel.textContent = userIdInput.value || "Local Video";
localVideo.appendChild(localVideoLabel);

// Set parameters for volume detection
AgoraRTC.setParameter("GET_VOLUME_OF_MUTED_AUDIO_TRACK", true);
AgoraRTC.setParameter("AUDIO_VOLUME_INDICATION_INTERVAL", 200); // 200ms interval

// Function to create a dual quality indicator (uplink/downlink)
function createDualQualityIndicator() {
  const indicator = document.createElement("div");
  indicator.className = "dual-quality-indicator";
  
  const upIcon = document.createElement("span");
  upIcon.textContent = "↑";
  upIcon.style.fontSize = "8px";
  upIcon.style.color = "#ffffff";
  
  const uplink = document.createElement("div");
  uplink.className = "uplink-indicator quality-0";
  
  const downIcon = document.createElement("span");
  downIcon.textContent = "↓";
  downIcon.style.fontSize = "8px";
  downIcon.style.color = "#ffffff";
  
  const downlink = document.createElement("div");
  downlink.className = "downlink-indicator quality-0";
  
  indicator.appendChild(upIcon);
  indicator.appendChild(uplink);
  indicator.appendChild(downIcon);
  indicator.appendChild(downlink);
  
  return indicator;
}

// Function to update a dual quality indicator
function updateDualQualityIndicator(indicator, uplinkQuality, downlinkQuality) {
  if (!indicator) return;
  
  const uplink = indicator.querySelector(".uplink-indicator");
  const downlink = indicator.querySelector(".downlink-indicator");
  
  if (uplink) {
    uplink.className = `uplink-indicator quality-${uplinkQuality}`;
  }
  
  if (downlink) {
    downlink.className = `downlink-indicator quality-${downlinkQuality}`;
  }
}

// Modified function to reset local video element
function resetLocalVideo() {
  const localVideo = document.getElementById("localVideo");
  localVideo.innerHTML = "";
  localVideo.dataset.userId = userIdInput.value;
  localVideo.classList.remove("video-muted");
  
  // Recreate the local video label
  const localVideoLabel = document.createElement("div");
  localVideoLabel.className = "video-label";
  localVideoLabel.textContent = userIdInput.value || "Local Video";
  
  // Create mute indicators for local video with better icon alignment
  const localMicMuteIndicator = document.createElement("div");
  localMicMuteIndicator.className = "mute-indicator mic-mute-indicator";
  localMicMuteIndicator.innerHTML = '<i class="fas fa-microphone-slash" aria-hidden="true"></i>';
  localMicMuteIndicator.style.display = "none";
  micMuteIndicators.set(userIdInput.value, localMicMuteIndicator);
  
  const localCameraMuteIndicator = document.createElement("div");
  localCameraMuteIndicator.className = "mute-indicator camera-mute-indicator";
  localCameraMuteIndicator.innerHTML = '<i class="fas fa-video-slash" aria-hidden="true"></i>';
  localCameraMuteIndicator.style.display = "none";
  cameraMuteIndicators.set(userIdInput.value, localCameraMuteIndicator);
  
  // Add talking while muted notification
  const talkingWhileMutedNotification = document.createElement("div");
  talkingWhileMutedNotification.id = "talking-while-muted";
  talkingWhileMutedNotification.textContent = "You're talking but your mic is muted!";
  talkingWhileMutedNotification.style.display = "none";
  
  // Add network quality indicator
  const networkQualityIndicator = createDualQualityIndicator();
  networkQualityIndicators.set(userIdInput.value, networkQualityIndicator);
  
  // Create stats overlay for local video
  const localStatsOverlay = document.createElement("div");
  localStatsOverlay.className = "stats-overlay";
  localStatsOverlay.id = "localVideoStats";
  
  // Add the visible class if stats are enabled
  if (videoStatsEnabled) {
    localStatsOverlay.classList.add('visible');
  }
  
  videoStatsOverlays.set(userIdInput.value, localStatsOverlay);
  
  // First append the label and indicators
  localVideo.appendChild(networkQualityIndicator);
  localVideo.appendChild(localVideoLabel);
  localVideo.appendChild(localMicMuteIndicator);
  localVideo.appendChild(localCameraMuteIndicator);
  localVideo.appendChild(talkingWhileMutedNotification);
  localVideo.appendChild(localStatsOverlay);
}

// Modified function to create a new video element
function createVideoElement(userId) {
  const videoElement = document.createElement("div");
  videoElement.className = "video-player";
  videoElement.dataset.userId = userId;
  
  const videoLabel = document.createElement("div");
  videoLabel.className = "video-label";
  videoLabel.textContent = userId;
  
  // Apply user color to the video label if it's not the current user
  if (userId !== userIdInput.value) {
    videoLabel.style.color = getUserColor(userId);
  }
  
  // Add mute indicators with better icon alignment
  const micMuteIndicator = document.createElement("div");
  micMuteIndicator.className = "mute-indicator mic-mute-indicator";
  micMuteIndicator.innerHTML = '<i class="fas fa-microphone-slash" aria-hidden="true"></i>';
  micMuteIndicator.style.display = "none";
  micMuteIndicators.set(userId, micMuteIndicator);
  
  const cameraMuteIndicator = document.createElement("div");
  cameraMuteIndicator.className = "mute-indicator camera-mute-indicator";
  cameraMuteIndicator.innerHTML = '<i class="fas fa-video-slash" aria-hidden="true"></i>';
  cameraMuteIndicator.style.display = "none";
  cameraMuteIndicators.set(userId, cameraMuteIndicator);
  
  // Add network quality indicator
  const networkQualityIndicator = createDualQualityIndicator();
  networkQualityIndicators.set(userId, networkQualityIndicator);
  
  // Create stats overlay for remote video
  const remoteStatsOverlay = document.createElement("div");
  remoteStatsOverlay.className = "stats-overlay";
  remoteStatsOverlay.id = `remoteVideoStats-${userId}`;
  
  // Add the visible class if stats are enabled
  if (videoStatsEnabled) {
    remoteStatsOverlay.classList.add('visible');
  }
  
  videoStatsOverlays.set(userId, remoteStatsOverlay);
  
  videoElement.appendChild(networkQualityIndicator);
  videoElement.appendChild(videoLabel);
  videoElement.appendChild(micMuteIndicator);
  videoElement.appendChild(cameraMuteIndicator);
  videoElement.appendChild(remoteStatsOverlay);
  
  // Force UI refresh
  updateParticipantsList();
  
  return videoElement;
}

// Function to update video labels
function updateVideoLabels() {
  // Update local video label with current user ID
  if (userIdInput.value) {
    localVideoLabel.textContent = userIdInput.value;
  }
  
  // Update remote video labels
  remoteVideos.forEach((video, userId) => {
    const label = video.querySelector(".video-label");
    if (label) {
      label.textContent = userId;
    }
  });
}

// Add new RTC control buttons
const joinChannelBtn = document.getElementById("joinChannelBtn");
const leaveChannelBtn = document.getElementById("leaveChannelBtn");
const toggleAudioBtn = document.getElementById("toggleAudioBtn");
const toggleVideoBtn = document.getElementById("toggleVideoBtn");

// Add a function to generate consistent colors based on user ID
function getUserColor(userId) {
  // List of colors (complementary to the dark theme)
  const colors = [
    "#89b4fa", // Blue
    "#9ece6a", // Green
    "#f7768e", // Red
    "#bb9af7", // Purple
    "#e0af68", // Orange
    "#7dcfff", // Light Blue
    "#ff9e64", // Light Orange
    "#2ac3de", // Cyan
    "#b4f9f8", // Teal
    "#ff7a93"  // Pink
  ];
  
  // Generate a consistent index based on the userId string
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Get a consistent color from the array
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

/** Append text message in any chatbox. */
function addChatMessage(container, text) {
  const div = document.createElement("div");
  div.className = "chat-message";
  
  // Format the message with proper styling
  if (text.includes("[To ")) {
    // Outgoing peer message
    div.classList.add("message-to");
    const parts = text.match(/\[To (.*?)\]: (.*)/);
    if (parts && parts.length >= 3) {
      const recipient = parts[1];
      const message = parts[2];
      div.innerHTML = `<span class="to">To ${recipient}:</span> ${message}`;
    } else {
  div.textContent = text;
    }
  } else if (text.includes("[From ")) {
    // Incoming peer message
    div.classList.add("message-from");
    const parts = text.match(/\[.*?\] \[From (.*?)\]: (.*)/);
    if (parts && parts.length >= 3) {
      const sender = parts[1];
      const message = parts[2];
      const senderColor = getUserColor(sender);
      div.innerHTML = `<span class="from" style="color: ${senderColor}">From ${sender}:</span> ${message}`;
    } else {
      div.textContent = text;
    }
  } else if (text.includes("[You]: ")) {
    // Outgoing channel message
    div.classList.add("message-to");
    const parts = text.match(/\[You\]: (.*)/);
    if (parts && parts.length >= 2) {
      const message = parts[1];
      div.innerHTML = `<span class="to">You:</span> ${message}`;
    } else {
      div.textContent = text;
    }
  } else if (text.match(/\[.*?\] \[(.*?)\]: (.*)/)) {
    // Incoming channel message from other users
    div.classList.add("message-from");
    const parts = text.match(/\[.*?\] \[(.*?)\]: (.*)/);
    if (parts && parts.length >= 3) {
      const sender = parts[1];
      const message = parts[2];
      const senderColor = getUserColor(sender);
      div.innerHTML = `<span class="from" style="color: ${senderColor}">${sender}:</span> ${message}`;
    } else {
      div.textContent = text;
    }
  } else if (text.includes("[System]")) {
    // System messages
    div.classList.add("message-system");
    div.textContent = text;
  } else {
    // Regular message
    div.textContent = text;
  }
  
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

/** Login to RTM (Signaling 2.x). */
loginBtn.addEventListener("click", async () => {
  const appId = appIdInput.value.trim();
  const token = tokenInput.value.trim() || null;
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
    rtmClient.addEventListener("status", (evt) => {
      console.log("RTM Status Event:", evt);
      updatePresenceIndicator(evt.state === "CONNECTED");
      loginStatus.textContent = `Logged in as "${userId}"`;
    });

    rtmClient.addEventListener("message", handleRtmChannelMessage);
    rtmClient.addEventListener("presence", handleRtmPresenceEvent);
    
    // Add storage event listener for metadata updates
    rtmClient.addEventListener("storage", async (evt) => {
      console.log("[METADATA EVENT] Storage event received:", JSON.stringify(evt, null, 2));
      
      // Check if this is a user metadata update
      if (evt.eventType === "UserMetadataUpdate" || evt.eventType === "UPDATE") {
        const userId = evt.publisher || evt.userId;
        const userIdString = String(userId);
        console.log("[METADATA EVENT] Processing update for user:", userIdString);
        
        // Fix: Access the correct nested structure data.metadata.screenShare.value
        const screenShareValue = evt.data?.metadata?.screenShare?.value;
        console.log("[METADATA EVENT] Screen share value:", screenShareValue, "for user:", userIdString);
        
        const isSharing = screenShareValue === "true";
        console.log("[METADATA EVENT] Is sharing:", isSharing, "for user:", userIdString);
        
        // Update screenShareMap
        if (isSharing) {
          console.log("[METADATA EVENT] Adding to screenShareMap:", userIdString);
          screenShareMap.set(userIdString, `${userIdString}-screen`);
        } else {
          console.log("[METADATA EVENT] Removing from screenShareMap:", userIdString);
          screenShareMap.delete(userIdString);
          
          // Also remove the screen share video element if it exists
          const screenShareVideoId = `${userIdString}-screen`;
          const videoElement = remoteVideos.get(screenShareVideoId);
          if (videoElement) {
            console.log("[METADATA EVENT] Removing screen share video element");
            videoElement.remove();
            remoteVideos.delete(screenShareVideoId);
            updateVideoGrid();
          }
        }
        
        console.log("[METADATA EVENT] ScreenShareMap after update:", Array.from(screenShareMap.entries()));
        console.log("[METADATA EVENT] Current participants:", Array.from(participants));
        
        // Force add to participants if not already there
        if (!participants.has(userIdString) && userIdString !== userIdInput.value) {
          console.log("[METADATA EVENT] Adding missing participant:", userIdString);
          participants.add(userIdString);
        }
        
        // Always update UI for remote users
        if (userIdString !== userIdInput.value) {
          console.log("[METADATA EVENT] Scheduling UI update for remote user:", userIdString);
          // Use multiple delayed updates to ensure UI consistency
          setTimeout(() => {
            console.log("[METADATA EVENT] Executing first UI update for user:", userIdString);
            updateParticipantsList();
            // Schedule a second update to ensure changes are reflected
            setTimeout(() => {
              console.log("[METADATA EVENT] Executing second UI update for user:", userIdString);
              updateParticipantsList();
            }, 500);
          }, 100);
        }
        
        // Verify the update was applied
        try {
          const verifyMetadata = await rtmClient.storage.getUserMetadata({ userId: userIdString });
          console.log("[METADATA EVENT] Verified metadata after update:", JSON.stringify(verifyMetadata, null, 2));
        } catch (error) {
          console.error("[METADATA EVENT] Failed to verify metadata:", error);
        }
      }
    });

    // Login to RTM
    await rtmClient.login({ token });
    localInbox = "inbox_" + userId;

    // Subscribe to our own metadata first
    try {
      const userIdString = String(userId);
      console.log("[LOGIN] Subscribing to own metadata");
      await rtmClient.storage.subscribeUserMetadata(userIdString);
      
      console.log("[LOGIN] Cleaning up existing metadata");
      await cleanupDuplicateMetadata(userIdString);
      console.log("[LOGIN] Setting initial metadata state");
      await rtmClient.storage.setUserMetadata([{
        key: METADATA_KEY,
        value: "false"
      }]);
    } catch (error) {
      console.error("[LOGIN] Failed to setup metadata:", error);
    }

    // Subscribe to personal inbox
    await rtmClient.subscribe(localInbox, {
      withMessage: true,
      withPresence: false,
      withMetadata: true,  // Enable metadata for inbox
      withLock: false,
    });

    // Enable UI
    logoutBtn.disabled = false;
    subscribeBtn.disabled = false;
    sendPeerMsgBtn.disabled = false;

    // Initialize RTC only after successful RTM login
    await initializeRTC(appId, token, userId);

    // Hide login modal
    hideModal();

    // Update local video label with user ID
    localVideoLabel.textContent = userId;
    
    // Set up direct HTML onclick attributes for the send buttons
    const channelMsgBtn = document.getElementById("sendChannelMsgBtn");
    const peerMsgBtn = document.getElementById("sendPeerMsgBtn");
    
    if (channelMsgBtn) {
      console.log("Setting up direct HTML onclick attribute for channel button after login");
      channelMsgBtn.setAttribute("onclick", "sendChannelMessage()");
    }
    
    if (peerMsgBtn) {
      console.log("Setting up direct HTML onclick attribute for peer button after login");
      peerMsgBtn.setAttribute("onclick", "sendPeerMessage()");
    }
  } catch (err) {
    console.error("Login failed:", err);
    alert("Login failed: " + err.message);
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
    subscribedChannel = channelName;
    // Subscribe to RTM channel
    await rtmClient.subscribe(channelName, {
      withMessage: true,
      withPresence: true,
      withMetadata: true,
      withLock: false,
    });
    channelStatus.textContent = `Subscribed to "${channelName}"`;
    
    // Add a system message with subscription status
    const timestamp = new Date().toLocaleTimeString();
    addChatMessage(channelChatBox, `[${timestamp}] [System] You subscribed to channel: ${channelName}`);

    // Enable UI
    subscribeBtn.disabled = true;
    unsubscribeBtn.disabled = false;
    sendChannelMsgBtn.disabled = false;
    joinChannelBtn.disabled = false;

  } catch (err) {
    console.error("Channel subscription failed:", err);
    alert("Channel subscription failed: " + err.message);
  }
});

/** Unsubscribe from the currently subscribed channel. */
unsubscribeBtn.addEventListener("click", async () => {
  console.log("Unsubscribe button clicked");
  await unsubscribe();
});

// Add a debounce function to prevent duplicate message sends
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
}

// Channel message sending logic
async function sendChannelMessage() {
  console.log("sendChannelMessage called");
  if (!rtmClient || !subscribedChannel) {
    alert("Subscribe to a channel first!");
    return;
  }
  const msg = document.getElementById("channelMsg").value.trim();
  if (!msg) return;
  try {
    console.log("Publishing channel message:", msg);
    await rtmClient.publish(subscribedChannel, msg);
    // Only add the message to the chat box once
    addChatMessage(channelChatBox, `[You]: ${msg}`);
    document.getElementById("channelMsg").value = "";
  } catch (err) {
    console.error("Publish error:", err);
  }
}

// Peer message sending logic
async function sendPeerMessage() {
  console.log("sendPeerMessage called");
  if (!rtmClient) {
    alert("Login first!");
    return;
  }
  
  if (!selectedPeer) {
    alert("Please select a participant to message");
    return;
  }
  
  const message = document.getElementById("peerMsg").value.trim();
  if (!message) return;

  try {
    // Create publish options for USER channel type
    const options = {
      channelType: "USER"
    };

    console.log("Publishing peer message to:", selectedPeer);
    // Publish to user channel
    await rtmClient.publish(selectedPeer, message, options);
    // Include recipient name in the message for clarity
    addChatMessage(peerChatBox, `[To ${selectedPeer}]: ${message}`);
    document.getElementById("peerMsg").value = "";

    // Track this peer chat if not already tracked
    if (!activePeerChats.has(selectedPeer)) {
      activePeerChats.set(selectedPeer, true);
      // Subscribe to presence events for this peer
      try {
        await rtmClient.subscribe(selectedPeer, {
          withPresence: true,
          withMessage: true
        });
      } catch (err) {
        console.error(`Error subscribing to peer ${selectedPeer}:`, err);
      }
    }
  } catch (err) {
    console.error("Send peer message error:", err);
    alert("Failed to send message: " + err.message);
  }
}

// Remove all existing click event listeners and reapply them correctly
function refreshButtonEventListeners() {
  console.log("refreshButtonEventListeners function is deprecated");
}

// Call the function to refresh button listeners when the document is ready
document.addEventListener('DOMContentLoaded', function() {
  console.log("DOM Content Loaded - Setting up initial event listeners");
  
  // Instead of cloning buttons, add direct HTML onclick attributes
  const channelMsgBtn = document.getElementById("sendChannelMsgBtn");
  const peerMsgBtn = document.getElementById("sendPeerMsgBtn");
  
  if (channelMsgBtn) {
    console.log("Setting up direct HTML onclick attribute for channel button");
    // Use HTML onclick attribute which works more reliably
    channelMsgBtn.setAttribute("onclick", "sendChannelMessage()");
  }
  
  if (peerMsgBtn) {
    console.log("Setting up direct HTML onclick attribute for peer button");
    // Use HTML onclick attribute which works more reliably
    peerMsgBtn.setAttribute("onclick", "sendPeerMessage()");
  }
  
  // Also set up the keyboard event listeners
  const channelMsg = document.getElementById("channelMsg");
  const peerMsg = document.getElementById("peerMsg");
  
  if (channelMsg) {
    channelMsg.addEventListener("keypress", function(e) {
      if (e.key === "Enter" && !e.shiftKey) {
        console.log("Enter key pressed in channel message input");
        e.preventDefault();
        sendChannelMessage();
      }
    });
  }
  
  if (peerMsg) {
    peerMsg.addEventListener("keypress", function(e) {
      if (e.key === "Enter" && !e.shiftKey) {
        console.log("Enter key pressed in peer message input");
        e.preventDefault();
        sendPeerMessage();
      }
    });
  }

  // Add new DOM elements for copy link
  const copyLinkBtn = document.createElement("button");
  copyLinkBtn.className = "copy-link-btn inside-input";
  copyLinkBtn.innerHTML = '<i class="fas fa-link"></i>';
  copyLinkBtn.title = "Copy channel link";
  copyLinkBtn.type = "button";

  // Style the channel input's parent as relative for absolute positioning
  channelNameInput.parentNode.style.position = "relative";
  // Insert the button as the last child of the input's parent
  channelNameInput.parentNode.appendChild(copyLinkBtn);

  // Position the button inside the input, right side
  copyLinkBtn.style.position = "absolute";
  copyLinkBtn.style.top = "50%";
  copyLinkBtn.style.right = "8px";
  copyLinkBtn.style.transform = "translateY(-50%)";
  copyLinkBtn.style.height = "28px";
  copyLinkBtn.style.width = "28px";
  copyLinkBtn.style.padding = "0";
  copyLinkBtn.style.display = "flex";
  copyLinkBtn.style.alignItems = "center";
  copyLinkBtn.style.justifyContent = "center";
  copyLinkBtn.style.background = "none";
  copyLinkBtn.style.border = "none";
  copyLinkBtn.style.cursor = "pointer";
  copyLinkBtn.style.zIndex = "2";

  // Add copy link functionality
  copyLinkBtn.addEventListener("click", () => {
    const appId = appIdInput.value.trim();
    const channelName = channelNameInput.value.trim();
    
    if (!appId || !channelName) {
      alert("Please enter both App ID and Channel Name first");
      return;
    }
    
    // Create the link with the current values
    const link = `${window.location.origin}${window.location.pathname}?appId=${encodeURIComponent(appId)}&channel=${encodeURIComponent(channelName)}`;
    
    // Copy to clipboard
    navigator.clipboard.writeText(link).then(() => {
      // Show success feedback
      const originalTitle = copyLinkBtn.title;
      copyLinkBtn.title = "Link copied!";
      copyLinkBtn.classList.add("copied");
      
      // Reset after 2 seconds
      setTimeout(() => {
        copyLinkBtn.title = originalTitle;
        copyLinkBtn.classList.remove("copied");
      }, 2000);
    }).catch(err => {
      console.error('Failed to copy link:', err);
      alert('Failed to copy link to clipboard');
    });
  });

  // Add URL parameter handling
  const urlParams = new URLSearchParams(window.location.search);
  const appId = urlParams.get('appId');
  const channel = urlParams.get('channel');
  const userId = urlParams.get('userId');
  if (appId) {
    appIdInput.value = appId;
  }
  if (channel) {
    channelNameInput.value = channel;
  }
  if (userId) {
    userIdInput.value = userId;
  }
  // If all three are present and not logged in, auto-login
  if (appId && channel && userId && (!rtmClient || loginStatus.textContent.includes('Not logged in'))) {
    // Simulate login button click
    setTimeout(() => { loginBtn.click(); }, 200);
  } else if (appId && channel && (!rtmClient || loginStatus.textContent.includes('Not logged in'))) {
    showModal();
    setTimeout(() => { userIdInput.focus(); }, 100);
  }
});

/** Handle channel messages from RTM 2.x events. */
function handleRtmChannelMessage(evt) {
  const { channelType, channelName, publisher, message } = evt;
  
  // Format timestamp
  const timestamp = new Date().toLocaleTimeString();
  
  // Handle USER channel messages
  if (channelType === "USER") {
    // If this is a message from a peer
    if (publisher !== userIdInput.value) {
      // Include sender name in the message for clarity
    addChatMessage(peerChatBox, `[${timestamp}] [From ${publisher}]: ${message}`);
      
      // Auto-select the peer if not already selected
      if (!selectedPeer) {
        selectedPeer = publisher;
        updateParticipantsList();
      }
      
      // Track this peer chat if not already tracked
      if (!activePeerChats.has(publisher)) {
        activePeerChats.set(publisher, true);
      }
    }
    return;
  }

  // Handle regular channel messages
  if (channelName === subscribedChannel) {
    if (publisher !== userIdInput.value) {
  addChatMessage(channelChatBox, `[${timestamp}] [${publisher}]: ${message}`);
    }
  }
}

/** Handle presence events (join/leave/timeouts) from RTM 2.x. */
async function handleRtmPresenceEvent(evt) {
  const { eventType, publisher, channelName, timestamp, snapshot } = evt;
  const timeStr = new Date(parseInt(timestamp)).toLocaleTimeString();
  
  // Handle USER channel presence events
  if (channelName && activePeerChats.has(channelName)) {
    if (eventType === "JOIN" || eventType === "REMOTE_JOIN") {
      addChatMessage(peerChatBox, `[${timeStr}] [System] ${publisher} is online`);
    } else if (eventType === "LEAVE" || eventType === "REMOTE_LEAVE" || eventType === "REMOTE_TIMEOUT") {
      addChatMessage(peerChatBox, `[${timeStr}] [System] ${publisher} is offline`);
      activePeerChats.delete(channelName);
    }
    return;
  }
  
  // Handle regular channel presence events
  if (channelName === subscribedChannel) {
    // Handle snapshot event
    if (eventType === "SNAPSHOT" && snapshot) {
      participants.clear();
      
      for (const user of snapshot) {
        if (user.userId !== userIdInput.value) {
          const userIdString = String(user.userId);
          participants.add(userIdString);
          addChatMessage(channelChatBox, `[${timeStr}] [System] ${userIdString} is online`);
          
          // Subscribe to user metadata
          try {
            console.log("[PRESENCE] Subscribing to metadata for user:", userIdString);
            await rtmClient.storage.subscribeUserMetadata(userIdString);
            
            // Get initial metadata state
            const result = await rtmClient.storage.getUserMetadata({ userId: userIdString });
            console.log("[PRESENCE] Got metadata for user:", userIdString, "result:", result);
            
            // Check if user is screen sharing
            const screenShareValue = result?.metadata?.screenShare?.value;
            if (screenShareValue === "true") {
              console.log("[PRESENCE] User is screen sharing, updating map");
              screenShareMap.set(userIdString, `${userIdString}-screen`);
              updateParticipantsList();
            }
          } catch (error) {
            console.error(`[PRESENCE] Failed to handle metadata for user ${userIdString}:`, error);
          }
        }
      }
      
      updateParticipantsList();
      return;
    }

    // Handle join events
    if (eventType === "JOIN" || eventType === "REMOTE_JOIN") {
      if (publisher !== userIdInput.value) {
        const publisherString = String(publisher);
        participants.add(publisherString);
        addChatMessage(channelChatBox, `[${timeStr}] [System] ${publisherString} joined the channel`);
        
        // Subscribe to user metadata immediately when they join
        try {
          console.log("[PRESENCE] Subscribing to metadata for new user:", publisherString);
          await rtmClient.storage.subscribeUserMetadata(publisherString);
          
          // Get initial metadata state
          const result = await rtmClient.storage.getUserMetadata({ userId: publisherString });
          console.log("[PRESENCE] Got initial metadata for new user:", publisherString, "result:", result);
          
          // Check if user is screen sharing
          const screenShareValue = result?.metadata?.screenShare?.value;
          if (screenShareValue === "true") {
            console.log("[PRESENCE] New user is screen sharing, updating map");
            screenShareMap.set(publisherString, `${publisherString}-screen`);
          }
          
          // Force UI update
          updateParticipantsList();
        } catch (error) {
          console.error(`[PRESENCE] Failed to handle metadata for new user ${publisherString}:`, error);
        }
      }
    } 
    // Handle leave events
    else if (eventType === "LEAVE" || eventType === "REMOTE_LEAVE" || eventType === "REMOTE_TIMEOUT") {
      if (publisher !== userIdInput.value) {
        const publisherString = String(publisher);
        participants.delete(publisherString);
        screenShareMap.delete(publisherString);
        
        // Unsubscribe from user metadata when they leave
        try {
          console.log("[PRESENCE] Unsubscribing from metadata for user:", publisherString);
          await rtmClient.storage.unsubscribeUserMetadata(publisherString);
        } catch (error) {
          console.error(`[PRESENCE] Failed to unsubscribe from metadata for user ${publisherString}:`, error);
        }
        
        addChatMessage(channelChatBox, `[${timeStr}] [System] ${publisherString} left the channel`);
        updateParticipantsList();
      }
    }
  }
}

// RTC Event Handlers
async function initializeRTC(appId, token, userId) {
  try {
    if (rtcClient) {
      await rtcClient.leave();
    }

    rtcClient = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
    
    // Add user-joined event handler to create tiles for users who join with muted tracks
    rtcClient.on("user-joined", (user) => {
      console.log(`User ${user.uid} joined the channel`);
      
      // Initialize the track state for this user
      userTrackStates.set(user.uid, {
        hasAudio: false,
        hasVideo: false,
        audioMuted: true,  // Assume muted until we know otherwise
        videoMuted: true   // Assume muted until we know otherwise
      });
      
      // Create video element for this user if it doesn't exist
      if (!remoteVideos.has(user.uid)) {
        const videoElement = createVideoElement(user.uid);
        remoteVideos.set(user.uid, videoElement);
        updateVideoGrid();
        console.log(`Created video element for joined user ${user.uid}`);
        
        // Since we assume the user initially has no tracks published,
        // show the mute indicators and add the video-muted class
        videoElement.classList.add("video-muted");
        
        // Add a muted message for video
        const mutedMsg = document.createElement("div");
        mutedMsg.className = "video-muted-text";
        mutedMsg.textContent = "Video Muted";
        videoElement.appendChild(mutedMsg);
        
        // Show mute indicators
        const micMuteIndicator = micMuteIndicators.get(user.uid);
        const cameraMuteIndicator = cameraMuteIndicators.get(user.uid);
        
        if (micMuteIndicator) {
          micMuteIndicator.style.display = "block";
        }
        
        if (cameraMuteIndicator) {
          cameraMuteIndicator.style.display = "block";
        }
      }
    });
    
    // Add user-left event handler to clean up
    rtcClient.on("user-left", (user) => {
      console.log(`User ${user.uid} left the channel`);
      
      // Remove the user's track state
      userTrackStates.delete(user.uid);
      
      // Clean up the user's indicators
      cleanupUserIndicators(user.uid);
      
      // Remove the user's video element
      const videoElement = remoteVideos.get(user.uid);
      if (videoElement) {
        videoElement.remove();
        remoteVideos.delete(user.uid);
        updateVideoGrid();
        updateParticipantsList(); // Force UI refresh
      }
    });

    // Set up RTC event listeners
    rtcClient.on("user-published", async (user, mediaType) => {
      await rtcClient.subscribe(user, mediaType);
      console.log(`Subscribe success to ${user.uid}'s ${mediaType}`);

      // Update the track state for this user
      const trackState = userTrackStates.get(user.uid) || {
        hasAudio: false,
        hasVideo: false,
        audioMuted: true,
        videoMuted: true
      };
      
      if (mediaType === "audio") {
        trackState.hasAudio = true;
        trackState.audioMuted = false;
      } else if (mediaType === "video") {
        trackState.hasVideo = true;
        trackState.videoMuted = false;
      }
      
      userTrackStates.set(user.uid, trackState);

      if (mediaType === "video") {
      // Create or get video element for this user
      let videoElement;
      if (!remoteVideos.has(user.uid)) {
        videoElement = createVideoElement(user.uid);
        remoteVideos.set(user.uid, videoElement);
        updateVideoGrid();
          console.log(`Created new video element for ${user.uid}`);
      } else {
        videoElement = remoteVideos.get(user.uid);
          console.log(`Using existing video element for ${user.uid}`);
        }
        
        // Remove any previous video-muted state
        videoElement.classList.remove("video-muted");
        const mutedMsg = videoElement.querySelector(".video-muted-text");
        if (mutedMsg) {
          mutedMsg.style.display = "none";
          console.log(`Hid video muted message for ${user.uid}`);
        }
        
        // Play the video directly into the container element
        console.log(`Playing remote video from ${user.uid}`);
        try {
        user.videoTrack.play(videoElement);
          console.log(`Successfully started playing video for ${user.uid}`);
        } catch (error) {
          console.error(`Error playing remote video for ${user.uid}:`, error);
        }
        
        // Update camera mute indicator for this user
        const cameraMuteIndicator = cameraMuteIndicators.get(user.uid);
        if (cameraMuteIndicator) {
          cameraMuteIndicator.style.display = "none";
          console.log(`Hiding camera mute indicator for ${user.uid}`);
        }
      }
      if (mediaType === "audio") {
        console.log(`Playing remote audio from ${user.uid}`);
        user.audioTrack.play();
        
        // Update mic mute indicator for this user
        const micMuteIndicator = micMuteIndicators.get(user.uid);
        if (micMuteIndicator) {
          micMuteIndicator.style.display = "none";
          console.log(`Hiding mic mute indicator for ${user.uid}`);
        }
      }
    });

    rtcClient.on("user-unpublished", (user, mediaType) => {
      // Update the track state for this user
      const trackState = userTrackStates.get(user.uid) || {
        hasAudio: false,
        hasVideo: false,
        audioMuted: true,
        videoMuted: true
      };
      
      if (mediaType === "audio") {
        trackState.audioMuted = true;
      } else if (mediaType === "video") {
        trackState.videoMuted = true;
      }
      
      userTrackStates.set(user.uid, trackState);
      
      if (mediaType === "video") {
        const videoElement = remoteVideos.get(user.uid);
        if (videoElement) {
          // Check if videoTrack exists before trying to stop it
          if (user.videoTrack) {
        user.videoTrack.stop();
            console.log(`Stopped remote video track for ${user.uid}`);
          }
          
          // Show camera mute indicator for this user
          const cameraMuteIndicator = cameraMuteIndicators.get(user.uid);
          if (cameraMuteIndicator) {
            cameraMuteIndicator.style.display = "block";
            console.log(`Showing camera mute indicator for ${user.uid}`);
          }
          
          // Add a visual indication for disabled video
          videoElement.classList.add("video-muted");
          
          // Add a muted message if not exists
          let mutedMsg = videoElement.querySelector(".video-muted-text");
          if (!mutedMsg) {
            mutedMsg = document.createElement("div");
            mutedMsg.className = "video-muted-text";
            mutedMsg.textContent = "Video Muted";
            videoElement.appendChild(mutedMsg);
            console.log(`Added video muted message for ${user.uid}`);
          } else {
            mutedMsg.style.display = "block";
            console.log(`Showing existing video muted message for ${user.uid}`);
          }
        }
      }
      if (mediaType === "audio") {
        // Show mic mute indicator for this user
        const micMuteIndicator = micMuteIndicators.get(user.uid);
        if (micMuteIndicator) {
          micMuteIndicator.style.display = "block";
          console.log(`Showing mic mute indicator for ${user.uid}`);
        }
      }
    });

  } catch (error) {
    console.error("RTC initialization failed:", error);
    if (error.message.includes("UID_CONFLICT")) {
      alert(
        "UID conflict detected. Please log out and try again with a different user ID."
      );
    }
  }
}

// UI Update Functions
function updateLoginStatus(state) {
  loginStatus.textContent = `Login Status: ${state}`;
  if (state === "CONNECTED") {
    loginBtn.disabled = true;
    logoutBtn.disabled = false;
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
  toggleAudioBtn.disabled = !enabled;
  toggleVideoBtn.disabled = !enabled;
}

// Message Display Functions
function displayChannelMessage(senderId, message) {
  const messageElement = document.createElement("div");
  messageElement.className = `message ${
    senderId === userIdInput.value ? "self" : "other"
  }`;
  messageElement.textContent = `${senderId}: ${message}`;
  channelChatBox.appendChild(messageElement);
  channelChatBox.scrollTop = channelChatBox.scrollHeight;
}

function displaySystemMessage(container, message) {
  const messageElement = document.createElement("div");
  messageElement.className = "message system";
  messageElement.textContent = message;
  container.appendChild(messageElement);
  container.scrollTop = container.scrollHeight;
}

// Modal Functions
function showModal() {
  loginModal.style.display = "block";
}

function hideModal() {
  loginModal.style.display = "none";
}

// Tab Functions
function switchTab(tabId) {
  tabBtns.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tabId);
  });

  chatPanels.forEach((panel) => {
    panel.classList.toggle("active", panel.id === `${tabId}Chat`);
  });
  
  // Keep participants list visible regardless of tab
  document.getElementById("participantsList").style.display = "block";
}

// Event Listeners for Modal
showLoginBtn.addEventListener("click", showModal);
closeModalBtn.addEventListener("click", hideModal);

window.addEventListener("click", (event) => {
  if (event.target === loginModal) {
    hideModal();
  }
});

// Event Listeners for Tabs
tabBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    switchTab(btn.dataset.tab);
  });
});

// Add participant management functions
function updatePresenceIndicator(isOnline) {
  presenceIndicator.className = `presence-indicator ${
    isOnline ? "online" : "offline"
  }`;
}

function updateParticipantsList() {
  console.log("[PARTICIPANTS] Starting update");
  console.log("[PARTICIPANTS] Current screenShareMap:", Array.from(screenShareMap.entries()));
  console.log("[PARTICIPANTS] Current participants:", Array.from(participants));
  
  const participantsList = document.getElementById("participantsList");
  if (!participantsList) {
    console.error("[PARTICIPANTS] Could not find participants list element");
    return;
  }
  
  participantsList.innerHTML = "";
  
  // Add participant count header
  const header = document.createElement("div");
  header.className = "participants-header";
  const count = participants.size + 1;
  header.innerHTML = `<h3>Participants (${count})</h3>`;
  participantsList.appendChild(header);
  
  // Add self to the list first
  const selfItem = document.createElement("div");
  selfItem.className = "participant-item";
  const selfColor = getUserColor(userIdInput.value);
  const isSharing = screenShareMap.has(userIdInput.value);
  console.log("[PARTICIPANTS] Self user:", userIdInput.value, "isSharing:", isSharing);
  
  const selfHtml = `
    <span class="presence-indicator online"></span>
    <span style="color: ${selfColor}">${userIdInput.value} (You)</span>
    ${isSharing ? '<div class="screen-share-indicator"><i class="fas fa-desktop"></i></div>' : '<!-- not sharing -->'}
  `;
  console.log("[PARTICIPANTS] Self HTML:", selfHtml);
  selfItem.innerHTML = selfHtml;
  participantsList.appendChild(selfItem);
  
  // Add other participants
  participants.forEach((participant) => {
    const isSharing = screenShareMap.has(participant);
    console.log("[PARTICIPANTS] Processing:", participant, "isSharing:", isSharing);
    
    const participantElement = document.createElement("div");
    participantElement.className = "participant-item";
    if (selectedPeer === participant) {
      participantElement.classList.add("selected");
    }
    
    const participantColor = getUserColor(participant);
    const participantHtml = `
      <span class="presence-indicator online"></span>
      <span style="color: ${participantColor}">${participant}</span>
      ${isSharing ? '<div class="screen-share-indicator"><i class="fas fa-desktop"></i></div>' : '<!-- not sharing -->'}
    `;
    console.log("[PARTICIPANTS] Participant HTML:", participantHtml);
    participantElement.innerHTML = participantHtml;
    
    // Add click handler to select this peer
    participantElement.addEventListener("click", () => {
      selectedPeer = participant;
      document.querySelectorAll(".participant-item").forEach(item => {
        item.classList.remove("selected");
      });
      participantElement.classList.add("selected");
      document.querySelector('[data-tab="peer"]').click();
      
      const peerChatHeader = document.createElement("div");
      peerChatHeader.className = "peer-chat-header";
      peerChatHeader.style.color = participantColor;
      peerChatHeader.textContent = `Chat with ${participant}`;
      
      const existingHeader = document.querySelector(".peer-chat-header");
      if (existingHeader) {
        existingHeader.remove();
      }
      document.getElementById("peerChat").insertBefore(peerChatHeader, document.getElementById("peerChatBox"));
    });
    
    participantsList.appendChild(participantElement);
  });
  
  console.log("[PARTICIPANTS] Update complete");
}

// Add device selection functions
async function loadDevices() {
  try {
    audioDevices = await AgoraRTC.getMicrophones();
    videoDevices = await AgoraRTC.getCameras();

    audioSelect.innerHTML = audioDevices
      .map(
        (device) =>
          `<option value="${device.deviceId}">${
            device.label || `Microphone ${device.deviceId}`
          }</option>`
      )
      .join("");

    videoSelect.innerHTML = videoDevices
      .map(
        (device) =>
          `<option value="${device.deviceId}">${
            device.label || `Camera ${device.deviceId}`
          }</option>`
      )
      .join("");
  } catch (error) {
    console.error("Error loading devices:", error);
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
audioSelect.addEventListener("change", (e) =>
  switchAudioDevice(e.target.value)
);
videoSelect.addEventListener("change", (e) =>
  switchVideoDevice(e.target.value)
);

// Modal functions for device selection
function showDeviceModal() {
  deviceModal.style.display = "block";
  loadDevices();
}

function hideDeviceModal() {
  deviceModal.style.display = "none";
}

// Add event listeners for device modal
showDeviceBtn.addEventListener("click", showDeviceModal);
closeDeviceBtn.addEventListener("click", hideDeviceModal);

// Add RTC control event listeners
joinChannelBtn.addEventListener("click", async () => {
  const channelName = channelNameInput.value.trim();
  if (!channelName) {
    alert("Please enter a channel name");
    return;
  }
  if (!rtcClient) {
    alert("Please login first");
    return;
  }
  if (!subscribedChannel) {
    alert("Please subscribe to the channel first");
    return;
  }
  try {
    // Reset local video with label first
    resetLocalVideo();
    
    // Create tracks with specific states
    const audioTrackConfig = { muted: false };
    const videoTrackConfig = { enabled: true };
    
    // Create and publish tracks
    localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack(audioTrackConfig);
    localVideoTrack = await AgoraRTC.createCameraVideoTrack(videoTrackConfig);
    
    // Initialize my own track state
    const myUserId = userIdInput.value;
    userTrackStates.set(myUserId, {
      hasAudio: true,
      hasVideo: true,
      audioMuted: false,
      videoMuted: false
    });
    
    // Clear any previous video-muted state
    const localVideoElement = document.getElementById("localVideo");
    localVideoElement.classList.remove("video-muted");
    const mutedMsg = localVideoElement.querySelector(".video-muted-text");
    if (mutedMsg) {
      mutedMsg.style.display = "none";
    }
    
    
    // Clear any existing videos that might be inside
    const existingVideos = localVideoElement.querySelectorAll("video");
    existingVideos.forEach(v => {
      v.srcObject = null;
      v.remove();
      console.log("Removed existing local video element");
    });
    
    // Play local video directly
    console.log("Playing local video track");
    if (localVideoTrack) {
      try {
        localVideoTrack.play("localVideo");
        console.log("Successfully started playing local video");
      } catch (error) {
        console.error("Error playing local video:", error);
      }
    }
    
    // Join channel and publish tracks
    await rtcClient.join(
      appIdInput.value,
      channelName,
      tokenInput.value || null,
      userIdInput.value
    );
    
    // Publish tracks
    await rtcClient.publish([localAudioTrack, localVideoTrack]);
    
    // Start volume detection
    startVolumeDetection();
    
    // Set up network quality monitoring (instead of starting interval)
    setupNetworkQualityMonitoring();
    
    // Enable controls and set initial states
    joinChannelBtn.disabled = true;
    leaveChannelBtn.disabled = false;
    toggleVideoBtn.disabled = false;
    toggleAudioBtn.disabled = false;
    
    // Set initial button text based on track states
    const videoEnabled = localVideoTrack.enabled;
    const audioMuted = localAudioTrack.muted;
    
    toggleVideoBtn.textContent = videoEnabled ? "Mute Video" : "Unmute Video";
    toggleAudioBtn.textContent = audioMuted ? "Unmute Audio" : "Mute Audio";
    
    // Update the mute indicators
    const micMuteIndicator = micMuteIndicators.get(userIdInput.value);
    if (micMuteIndicator) {
      micMuteIndicator.style.display = audioMuted ? "block" : "none";
    }
    
    const cameraMuteIndicator = cameraMuteIndicators.get(userIdInput.value);
    if (cameraMuteIndicator) {
      cameraMuteIndicator.style.display = videoEnabled ? "none" : "block";
    }
    
    channelStatus.textContent = `Joined RTC channel: ${channelName}`;
    
    // Add a system message with join status
    const timestamp = new Date().toLocaleTimeString();
    addChatMessage(channelChatBox, `[${timestamp}] [System] You joined RTC channel: ${channelName}`);

    // If stats are enabled, start collecting
    if (videoStatsEnabled) {
      startVideoStatsUpdates();
    }
    
    // Initialize PiP
    initPip();
    
    // Enable screen share button
    screenShareBtn.disabled = false;
    
  } catch (err) {
    console.error("Failed to join RTC channel:", err);
    alert("Failed to join RTC channel. Please check your connection and try again.");
  }
});

// Update the leaveChannel function to clean up PiP
leaveChannelBtn.addEventListener("click", async () => {
  if (!rtcClient) return;
  try {
    console.log("Leave channel button clicked");
    
    // Stop volume detection
    stopVolumeDetection();
    
    // Unpublish tracks
    if (localAudioTrack) {
      console.log("Stopping local audio track");
      localAudioTrack.stop();
      localAudioTrack.close();
      localAudioTrack = null;
    }
    
    if (localVideoTrack) {
      console.log("Stopping local video track");
      localVideoTrack.stop();
      localVideoTrack.close();
      localVideoTrack = null;
    }
    
    // Reset local video with label
    console.log("Resetting local video element");
    resetLocalVideo();
    
    // Clear remote videos
    console.log("Clearing remote videos");
    remoteVideos.forEach((video) => {
      // Remove speaking class
      video.classList.remove("speaking");
      video.remove();
    });
    remoteVideos.clear();
    micMuteIndicators.clear();
    cameraMuteIndicators.clear();
    
    // Ensure local video doesn't have speaking class
    const localVideoElem = document.getElementById("localVideo");
    if (localVideoElem) {
      localVideoElem.classList.remove("speaking");
    }
    
    // Clear additional videos container
    console.log("Clearing additional videos container");
    document.getElementById("additionalVideos").innerHTML = "";
    
    // Hide remote video container
    console.log("Clearing remote video container");
    const remoteVideo = document.getElementById("remoteVideo");
    remoteVideo.innerHTML = "";
    remoteVideo.classList.remove("visible");
    remoteVideo.classList.remove("speaking");
    
    // Leave channel
    console.log("Leaving RTC channel");
    await rtcClient.leave();
    
    // Reset UI
    console.log("Resetting UI");
    joinChannelBtn.disabled = false;
    leaveChannelBtn.disabled = true;
    toggleVideoBtn.disabled = true;
    toggleAudioBtn.disabled = true;
    
    channelStatus.textContent = "Left RTC channel";
    
    // Add a system message with leave status
    const timestamp = new Date().toLocaleTimeString();
    addChatMessage(channelChatBox, `[${timestamp}] [System] You left the RTC channel`);
    
    console.log("Leave channel complete");
    
    // Clean up PiP
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
    }
    pipContainer.style.display = 'none';
    pipContainer.innerHTML = '';
    
    // Stop screen sharing if active
    if (screenShareTrack) {
      screenShareTrack.stop();
      screenShareTrack.close();
      screenShareTrack = null;
    }
    
    if (screenShareClient) {
      await screenShareClient.leave();
      screenShareClient = null;
    }
    
    screenShareMap.clear();
    
    // Update UI
    screenShareBtn.style.display = "inline-block";
    screenShareBtn.disabled = true;
    stopScreenShareBtn.style.display = "none";
    stopScreenShareBtn.disabled = true;
    
  } catch (err) {
    console.error("Failed to leave RTC channel:", err);
  }
});

// Update the unsubscribe handler
async function unsubscribe() {
  try {
    console.log("Unsubscribing from channel...");
    
    // Stop volume detection
    stopVolumeDetection();
    
    // Add a system message with unsubscribe status
    const timestamp = new Date().toLocaleTimeString();
    const channelName = subscribedChannel;
    addChatMessage(channelChatBox, `[${timestamp}] [System] You unsubscribed from channel: ${channelName}`);
    
    // First, stop and close local tracks
    if (localAudioTrack) {
      console.log("Stopping local audio track");
      localAudioTrack.stop();
      localAudioTrack.close();
      localAudioTrack = null;
    }
    
    if (localVideoTrack) {
      console.log("Stopping local video track");
      localVideoTrack.stop();
      localVideoTrack.close();
      localVideoTrack = null;
    }
    
    // Reset local video element with label
    console.log("Resetting local video element");
    resetLocalVideo();
    
    // Ensure local video doesn't have speaking class
    const localVideoElem = document.getElementById("localVideo");
    if (localVideoElem) {
      localVideoElem.classList.remove("speaking");
    }
    
    // Clear remote videos
    console.log("Clearing remote videos");
    remoteVideos.forEach((video) => {
      // Remove speaking class
      video.classList.remove("speaking");
      video.remove();
    });
    remoteVideos.clear();
    micMuteIndicators.clear();
    cameraMuteIndicators.clear();
    
    // Clear additional videos container
    console.log("Clearing additional videos container");
    document.getElementById("additionalVideos").innerHTML = "";
    
    // Hide remote video container
    console.log("Clearing remote video container");
    const remoteVideo = document.getElementById("remoteVideo");
    remoteVideo.innerHTML = "";
    remoteVideo.classList.remove("visible");
    remoteVideo.classList.remove("speaking");
    
    // Leave RTC channel
    if (rtcClient) {
      console.log("Leaving RTC channel");
      try {
        await rtcClient.leave();
      } catch (err) {
        console.warn("Error leaving RTC channel:", err);
      }
    }
    
    // Unsubscribe from RTM channel
    if (rtmClient && subscribedChannel) {
      console.log("Unsubscribing from RTM channel");
      await rtmClient.unsubscribe(subscribedChannel);
      subscribedChannel = null;
    }
    
    // Clean up peer chats
    for (const [peerId] of activePeerChats) {
      try {
        await rtmClient.unsubscribe(peerId);
      } catch (err) {
        console.error(`Error unsubscribing from peer ${peerId}:`, err);
      }
    }
    activePeerChats.clear();
    
    // Reset selected peer
    selectedPeer = null;
    
    // Reset UI
    console.log("Resetting UI");
    joinChannelBtn.disabled = false;
    leaveChannelBtn.disabled = true;
    toggleVideoBtn.disabled = true;
    toggleAudioBtn.disabled = true;
    subscribeBtn.disabled = false;
    unsubscribeBtn.disabled = true;
    sendChannelMsgBtn.disabled = true;
    sendPeerMsgBtn.disabled = true;
    
    document.getElementById("channelStatus").textContent = "Unsubscribed from channel";
    document.getElementById("channelChatBox").innerHTML = "";
    document.getElementById("peerChatBox").innerHTML = "";
    document.getElementById("participantsList").innerHTML = "";
    
    // Remove peer chat header if it exists
    const peerChatHeader = document.querySelector(".peer-chat-header");
    if (peerChatHeader) {
      peerChatHeader.remove();
    }
    
    console.log("Unsubscribe complete");
  } catch (error) {
    console.error("Error unsubscribing:", error);
  }
}

// Make sure to add back the DOM ready event listener
// After page load, create and add the stats toggle button
document.addEventListener('DOMContentLoaded', function() {
  // Add the stats toggle container
  const toggleContainer = document.createElement('label');
  toggleContainer.className = 'stats-toggle-container';
  toggleContainer.innerHTML = `
    <input type="checkbox" id="statsToggleInput">
    <i class="fas fa-chart-line"></i>
  `;
  document.body.appendChild(toggleContainer);
  
  // Add client stats overlay container
  clientStatsOverlay = document.createElement('div');
  clientStatsOverlay.className = 'client-stats-overlay';
  clientStatsOverlay.innerHTML = '<div class="client-stats-heading">RTC Client Stats</div><div id="clientStats"></div>';
  document.body.appendChild(clientStatsOverlay);
  
  // Add event listener for toggle with immediate update
  document.getElementById('statsToggleInput').addEventListener('change', function(e) {
    videoStatsEnabled = e.target.checked;
    
    if (videoStatsEnabled) {
      // First update immediately
      if (rtcClient) {
        updateStatsImmediately().then(() => {
          console.log("Stats updated immediately");
          startVideoStatsUpdates();
        });
  } else {
        console.log("RTC client not available for immediate stats update");
        startVideoStatsUpdates();
      }
      
      // Show all stats overlays
      clientStatsOverlay.classList.add('visible');
      videoStatsOverlays.forEach(overlay => {
        overlay.classList.add('visible');
      });
    } else {
      stopVideoStatsUpdates();
      
      // Hide all stats overlays
      clientStatsOverlay.classList.remove('visible');
      videoStatsOverlays.forEach(overlay => {
        overlay.classList.remove('visible');
        overlay.style.display = "none"; // Ensure display is also set to none
      });
    }
  });
});

// Update function for immediate stats update
async function updateStatsImmediately() {
  if (!rtcClient) return;
  
  try {
    // Get client stats
    const clientStats = rtcClient.getRTCStats();
    
    // Update client stats
    if (clientStats && document.getElementById('clientStats')) {
      document.getElementById('clientStats').innerHTML = [
        `RTT: ${clientStats.RTT || 0}ms`,
        `Outgoing B/W: ${((Number(clientStats.OutgoingAvailableBandwidth) || 0) * 0.001).toFixed(2)} Mbps`,
        `UserCount: ${clientStats.UserCount || 0}`,
        `SendBitrate: ${((Number(clientStats.SendBitrate) || 0) * 0.000001).toFixed(2)} Mbps`,
        `RecvBitrate: ${((Number(clientStats.RecvBitrate) || 0) * 0.000001).toFixed(2)} Mbps`,
        `Duration: ${Math.floor((clientStats.Duration || 0) / 60)}:${((clientStats.Duration || 0) % 60).toString().padStart(2, '0')}`
      ].join('<br>');
    }
    
    // Update all stats displays
    updateStatsDisplays();
    
  } catch (error) {
    console.error('Error in immediate stats update:', error);
  }
}

// Restore the updateUIForDisconnected function
function updateUIForDisconnected() {
  document.getElementById("joinChannelBtn").disabled = true;
  document.getElementById("leaveChannelBtn").disabled = true;
  document.getElementById("toggleAudioBtn").disabled = true;
  document.getElementById("toggleVideoBtn").disabled = true;
  document.getElementById("subscribeBtn").disabled = true;
  document.getElementById("unsubscribeBtn").disabled = true;
  document.getElementById("sendChannelMsgBtn").disabled = true;
  document.getElementById("sendPeerMsgBtn").disabled = true;
  
  // Clear remote videos but keep local video
  remoteVideos.clear();
  updateVideoGrid();
  
  document.getElementById("channelStatus").textContent = "";
  document.getElementById("channelChatBox").innerHTML = "";
  document.getElementById("peerChatBox").innerHTML = "";
  document.getElementById("participantsList").innerHTML = "";
}

// Function to stop volume detection
function stopVolumeDetection() {
  if (volumeDetectionInterval) {
    console.log("Stopping volume detection");
    clearInterval(volumeDetectionInterval);
    volumeDetectionInterval = null;
    
    // Clean up - remove any speaking classes
    document.getElementById("localVideo")?.classList.remove("speaking");
    
    // Clear speaking classes from all remote videos
    remoteVideos.forEach((video) => {
      video.classList.remove("speaking");
    });
    
    // Remove any talking while muted notification
    const talkingWhileMutedNotification = document.getElementById("talking-while-muted");
    if (talkingWhileMutedNotification) {
      talkingWhileMutedNotification.style.display = "none";
    }
    isTalkingWhileMuted = false;
  }
}

// Start volume detection and update UI - using direct polling approach
function startVolumeDetection() {
  // console.log("Starting volume detection with polling approach");
  
  // Clear any existing interval
  if (volumeDetectionInterval) {
    clearInterval(volumeDetectionInterval);
  }
  
  // Set parameters for volume detection
  AgoraRTC.setParameter("AUDIO_VOLUME_INDICATION_INTERVAL", 200); // 200ms interval
  AgoraRTC.setParameter("GET_VOLUME_OF_MUTED_AUDIO_TRACK", true);

  // Enable audio volume indicator on the RTC client
  rtcClient.enableAudioVolumeIndicator();
  
  // Set up interval for local volume monitoring
  volumeDetectionInterval = setInterval(() => {
    if (localAudioTrack) {
      // Get volume level directly from the track
      const volumeLevel = localAudioTrack.getVolumeLevel() * 100; // Convert to 0-100 scale
      // console.log(`Local track volume level: ${volumeLevel}, muted: ${localAudioTrack.muted}`);
      
      // Add speaking border if volume is above threshold AND user is not muted
      const localVideoElement = document.getElementById("localVideo");
      if (volumeLevel > VOLUME_SPEAKING_THRESHOLD) {
        // console.log(`Local user is speaking with level ${volumeLevel}`);
        
        // Only add speaking class if user is NOT muted
        if (!localAudioTrack.muted) {
          localVideoElement.classList.add("speaking");
        } else {
          // If user is muted, ensure the speaking class is removed
          localVideoElement.classList.remove("speaking");
        }
      } else {
        localVideoElement.classList.remove("speaking");
      }
      
      // Show talking while muted notification
      const talkingWhileMutedNotification = document.getElementById("talking-while-muted");
      if (talkingWhileMutedNotification && localAudioTrack.muted && volumeLevel > VOLUME_HIGH_THRESHOLD) {
        // console.log("TALKING WHILE MUTED DETECTED!");
        if (!isTalkingWhileMuted) {
          // console.log("Showing talking while muted notification");
          talkingWhileMutedNotification.style.display = "block";
          isTalkingWhileMuted = true;
          setTimeout(() => {
            // console.log("Hiding talking while muted notification after timeout");
            talkingWhileMutedNotification.style.display = "none";
            isTalkingWhileMuted = false;
          }, 3000);
        }
      }
      
      // Check if talking while muted notification exists, create if it doesn't
      if (!document.getElementById("talking-while-muted")) {
        const localVideoElem = document.getElementById("localVideo");
        if (localVideoElem) {
          // console.log("Creating missing talking-while-muted notification");
          const newNotification = document.createElement("div");
          newNotification.id = "talking-while-muted";
          newNotification.textContent = "You're talking but your mic is muted!";
          newNotification.style.display = "none";
          localVideoElem.appendChild(newNotification);
        }
      }
    }
  }, 200);
  
  // Set up the volume-indicator event for remote users
  rtcClient.on("volume-indicator", volumes => {
    // console.log("Volume indicator event:", volumes.map(v => `${v.uid}: ${v.level}`).join(', '));
    volumes.forEach(volume => {
      // Handle remote users only
      if (volume.uid.toString() !== userIdInput.value) {
        const remoteVideoElement = findRemoteVideoElement(volume.uid);
        if (remoteVideoElement) {
          // Add speaking border if volume is above threshold
          if (volume.level > VOLUME_SPEAKING_THRESHOLD) {
            // console.log(`Remote user ${volume.uid} is speaking with level ${volume.level}`);
            remoteVideoElement.classList.add("speaking");
          } else {
            remoteVideoElement.classList.remove("speaking");
          }
        }
      }
    });
  });
}

// Helper function to find a remote video element by user ID
function findRemoteVideoElement(uid) {
  // The correct way is to get from the remoteVideos Map directly
  const videoElement = remoteVideos.get(uid.toString());
  
  // Log for debugging
  // console.log(`Finding remote video element for ${uid}, found: ${videoElement ? 'yes' : 'no'}`);
  
  // If not found, try to search by attribute as fallback
  if (!videoElement) {
    // console.log(`Fallback: Searching for video element with data-user-id=${uid}`);
    return document.querySelector(`.video-player[data-user-id="${uid}"]`);
  }
  
  return videoElement;
}

// Clean up a user's indicators when they leave
function cleanupUserIndicators(userId) {
  // Remove network quality indicator
  networkQualityIndicators.delete(userId);
  
  // Remove network quality data
  userNetworkQuality.delete(userId);
  
  // Remove stats overlay
  videoStatsOverlays.delete(userId);
  
  // Remove mute indicators
  micMuteIndicators.delete(userId);
  cameraMuteIndicators.delete(userId);
}

// Update function to setup network quality monitoring
function setupNetworkQualityMonitoring() {
  if (!rtcClient) return;
  
  console.log("Setting up network quality monitoring");
  
  // Listen for local network quality events
  rtcClient.on("network-quality", (stats) => {
    console.log("Local network quality update:", stats);
    
    // Store latest quality values
    userNetworkQuality.set(userIdInput.value, {
      uplink: stats.uplinkNetworkQuality || 0,
      downlink: stats.downlinkNetworkQuality || 0
    });
    
    // Update the dual quality indicator for local user
    const localIndicator = networkQualityIndicators.get(userIdInput.value);
    if (localIndicator) {
      updateDualQualityIndicator(
        localIndicator,
        stats.uplinkNetworkQuality || 0,
        stats.downlinkNetworkQuality || 0
      );
    }
    
    // If stats are enabled, update stats displays
    if (videoStatsEnabled) {
      updateStatsDisplays();
    }
  });
  
  // Start polling for remote users' network quality
  startRemoteNetworkQualityPolling();
}

// Function to poll remote network quality
function startRemoteNetworkQualityPolling() {
  if (networkQualityInterval) {
    clearInterval(networkQualityInterval);
  }
  
  console.log("Starting remote network quality polling");
  
  networkQualityInterval = setInterval(async () => {
    if (!rtcClient) return;
    
    try {
      // Get remote network quality for all users
      const remoteNetworkQuality = await rtcClient.getRemoteNetworkQuality();
      console.log("Remote network quality:", remoteNetworkQuality);
      
      // Update network quality indicators for each remote user
      for (const uid in remoteNetworkQuality) {
        const quality = remoteNetworkQuality[uid];
        
        // Store the quality values
        userNetworkQuality.set(uid, {
          uplink: quality.uplinkNetworkQuality || 0,
          downlink: quality.downlinkNetworkQuality || 0
        });
        
        // Update the dual quality indicator
        const indicator = networkQualityIndicators.get(uid);
        if (indicator) {
          updateDualQualityIndicator(
            indicator, 
            quality.uplinkNetworkQuality || 0,
            quality.downlinkNetworkQuality || 0
          );
        }
      }
      
      // If stats are enabled, update the stats display which will show the updated quality
      if (videoStatsEnabled) {
        updateStatsDisplays();
      }
    } catch (error) {
      console.error('Error polling remote network quality:', error);
    }
  }, NETWORK_QUALITY_INTERVAL_MS);
}

// Video grid function that was accidentally removed
function updateVideoGrid() {
  const additionalVideosContainer = document.getElementById("additionalVideos");
  const remoteVideoDiv = document.getElementById("remoteVideo");
  
  // Clear containers
  additionalVideosContainer.innerHTML = "";
  remoteVideoDiv.innerHTML = "";
  
  // Convert Map to Array for easier handling
  const remoteUsers = Array.from(remoteVideos.entries());
  
  // Handle first remote user (if any)
  if (remoteUsers.length > 0) {
    const [firstUserId, firstVideo] = remoteUsers[0];
    remoteVideoDiv.appendChild(firstVideo);
    remoteVideoDiv.classList.add("visible");
  } else {
    remoteVideoDiv.classList.remove("visible");
  }
  
  // Handle additional users (if any)
  for (let i = 1; i < remoteUsers.length; i++) {
    const [userId, video] = remoteUsers[i];
    additionalVideosContainer.appendChild(video);
  }
  
  // If stats are enabled, ensure all overlays are visible
  if (videoStatsEnabled) {
    videoStatsOverlays.forEach(overlay => {
      overlay.classList.add('visible');
    });
  }
}

// Update toggle video button to show mute indicator
toggleVideoBtn.addEventListener("click", async () => {
  if (!localVideoTrack) return;
  
  const enabled = !localVideoTrack.enabled;
  console.log(`Setting video enabled to: ${enabled}`);
  await localVideoTrack.setEnabled(enabled);
  toggleVideoBtn.textContent = enabled ? "Mute Video" : "Unmute Video";
  
  // Update track state
  const myUserId = userIdInput.value;
  const trackState = userTrackStates.get(myUserId) || {
    hasAudio: true,
    hasVideo: true,
    audioMuted: localAudioTrack ? localAudioTrack.muted : false,
    videoMuted: !enabled
  };
  trackState.videoMuted = !enabled;
  userTrackStates.set(myUserId, trackState);
  
  // Update the camera mute indicator
  const cameraMuteIndicator = cameraMuteIndicators.get(userIdInput.value);
  if (cameraMuteIndicator) {
    cameraMuteIndicator.style.display = enabled ? "none" : "block";
  }
  
  // Add a visual indication for disabled video
  const localVideoElement = document.getElementById("localVideo");
  if (localVideoElement) {
    if (!enabled) {
      // For muted state, just add the mute message overlay
      localVideoElement.classList.add("video-muted");
      
      // Add a muted message if not exists
      let mutedMsg = localVideoElement.querySelector(".video-muted-text");
      if (!mutedMsg) {
        mutedMsg = document.createElement("div");
        mutedMsg.className = "video-muted-text";
        mutedMsg.textContent = "Video Muted";
        localVideoElement.appendChild(mutedMsg);
      } else {
        mutedMsg.style.display = "block";
      }
      
      console.log("Video muted - adding video-muted class and muted text");
    } else {
      // For unmuted state, remove the overlay
      localVideoElement.classList.remove("video-muted");
      
      // Hide muted message if exists
      const mutedMsg = localVideoElement.querySelector(".video-muted-text");
      if (mutedMsg) {
        mutedMsg.style.display = "none";
      }
      
      console.log("Video unmuted - removing video-muted class and muted text");
    }
  }
  
  // Publish or unpublish the video track
  if (!enabled) {
    await rtcClient.unpublish([localVideoTrack]);
  } else {
    await rtcClient.publish([localVideoTrack]);
    
    // Replay the video when enabling
    try {
      localVideoTrack.play("localVideo");
      console.log("Re-playing local video after unmute");
    } catch (error) {
      console.error("Error re-playing local video:", error);
    }
  }
});

// Update toggle audio button to use setMuted instead of setEnabled
toggleAudioBtn.addEventListener("click", async () => {
  if (!localAudioTrack) return;
  
  const muted = !localAudioTrack.muted;
  console.log(`Setting audio muted to: ${muted}`);
  await localAudioTrack.setMuted(muted);
  toggleAudioBtn.textContent = muted ? "Unmute Audio" : "Mute Audio";
  
  // Update track state
  const myUserId = userIdInput.value;
  const trackState = userTrackStates.get(myUserId) || {
    hasAudio: true,
    hasVideo: true,
    audioMuted: muted,
    videoMuted: localVideoTrack ? !localVideoTrack.enabled : false
  };
  trackState.audioMuted = muted;
  userTrackStates.set(myUserId, trackState);
  
  // Update the mic mute indicator
  const micMuteIndicator = micMuteIndicators.get(userIdInput.value);
  if (micMuteIndicator) {
    micMuteIndicator.style.display = muted ? "block" : "none";
  }
});

// Remove old network quality functions
function startNetworkQualityUpdates() {
  // This function is deprecated, use setupNetworkQualityMonitoring instead
  console.warn("startNetworkQualityUpdates is deprecated, use setupNetworkQualityMonitoring instead");
  if (rtcClient) {
    setupNetworkQualityMonitoring();
  }
}

function stopNetworkQualityUpdates() {
  // This function is deprecated, use stopRemoteNetworkQualityPolling instead
  console.warn("stopNetworkQualityUpdates is deprecated, use stopRemoteNetworkQualityPolling instead");
  stopRemoteNetworkQualityPolling();
}

// Add any missing functions here after network quality handling
function stopRemoteNetworkQualityPolling() {
  if (networkQualityInterval) {
    console.log("Stopping remote network quality polling");
    clearInterval(networkQualityInterval);
    networkQualityInterval = null;
  }
}

// Function to start video stats updates
function startVideoStatsUpdates() {
  if (videoStatsInterval) {
    clearInterval(videoStatsInterval);
  }
  
  console.log("Starting video stats updates");
  
  videoStatsInterval = setInterval(async () => {
    if (!rtcClient) return;
    
    try {
      // Get client stats
      const clientStats = rtcClient.getRTCStats();
      
      // Update client stats
      if (clientStats && document.getElementById('clientStats')) {
        document.getElementById('clientStats').innerHTML = [
          `RTT: ${clientStats.RTT || 0}ms`,
          `Outgoing B/W: ${((Number(clientStats.OutgoingAvailableBandwidth) || 0) * 0.001).toFixed(2)} Mbps`,
          `UserCount: ${clientStats.UserCount || 0}`,
          `SendBitrate: ${((Number(clientStats.SendBitrate) || 0) * 0.000001).toFixed(2)} Mbps`,
          `RecvBitrate: ${((Number(clientStats.RecvBitrate) || 0) * 0.000001).toFixed(2)} Mbps`,
          `Duration: ${Math.floor((clientStats.Duration || 0) / 60)}:${((clientStats.Duration || 0) % 60).toString().padStart(2, '0')}`
        ].join('<br>');
      }
      
      // Update all stats displays
      updateStatsDisplays();
      
    } catch (error) {
      console.error('Error updating video stats:', error);
    }
  }, videoStatsIntervalMs);
}

// Function to stop video stats updates
function stopVideoStatsUpdates() {
  if (videoStatsInterval) {
    clearInterval(videoStatsInterval);
    videoStatsInterval = null;
  }
}

// Function to update all stats displays
async function updateStatsDisplays() {
  try {
    // Update local stats
    if (rtcClient && localVideoTrack) {
      // Get stats objects
      const localVideoStats = rtcClient.getLocalVideoStats();
      const localAudioStats = rtcClient.getLocalAudioStats();
      
      // Complete one-time debug logging of all available properties
      console.log("ALL LOCAL VIDEO STATS PROPERTIES:", Object.keys(localVideoStats));
      console.log("ALL LOCAL AUDIO STATS PROPERTIES:", Object.keys(localAudioStats));
      
      // Debug: Log the raw stats objects
      console.log("Raw local video stats:", JSON.stringify(localVideoStats));
      console.log("Raw local audio stats:", JSON.stringify(localAudioStats));
      
      // Get local stats display element
      const localStatsDisplay = videoStatsOverlays.get(userIdInput.value);
      if (!localStatsDisplay) return;
      
      // Get local network quality
      const localNetworkQuality = userNetworkQuality.get(userIdInput.value) || {uplink: 0, downlink: 0};
      
      // Create HTML for the two columns
      let html = '';
      
      // Left column
      html += '<div class="stats-column">';
      html += '<span class="stats-header network">Network</span> ';
      html += `<div>Quality: U- ${getQualityText(localNetworkQuality.uplink)} D- ${getQualityText(localNetworkQuality.downlink)}</div>`;
      
      // Direct access using correct property names
      let rtt = localVideoStats.sendRttMs || 0;
      let videoLossRate = (localVideoStats.currentPacketLossRate || 0) * 100;
      let videoPacketsLost = localVideoStats.sendPacketsLost || 0;
      let audioLossRate = (localAudioStats.currentPacketLossRate || 0) * 100;
      let audioPacketsLost = localAudioStats.sendPacketsLost || 0;
      
      html += `<div>RTT: ${rtt.toFixed(0)}ms</div>`;
      html += `<div>Video Loss: ${videoLossRate.toFixed(1)}%</div>`;
      html += `<div>Video Pkts Lost: ${videoPacketsLost}</div>`;
      html += `<div>Audio Loss: ${audioLossRate.toFixed(1)}%</div>`;
      html += `<div>Audio Pkts Lost: ${audioPacketsLost}</div>`;
      
      html += '<span class="stats-header video">Video</span> ';
      
      // Direct access using correct property names
      let captureWidth = localVideoStats.captureResolutionWidth || 0;
      let captureHeight = localVideoStats.captureResolutionHeight || 0;
      let sendWidth = localVideoStats.sendResolutionWidth || 0;
      let sendHeight = localVideoStats.sendResolutionHeight || 0;
      let captureFps = localVideoStats.captureFrameRate || 0;
      let sendFps = localVideoStats.sendFrameRate || 0;
      let videoCodec = localVideoStats.codecType || 'VP8';
      
      html += `<div>Capture: ${captureWidth}x${captureHeight}</div>`;
      html += `<div>Send: ${sendWidth}x${sendHeight}</div>`;
      html += `<div>FPS: ${captureFps.toFixed(1)} → ${sendFps.toFixed(1)}</div>`;
      html += `<div>Codec: ${videoCodec}</div>`;
      html += '</div>'; // Close left column
      
      // Right column
      html += '<div class="stats-column">';
      html += '<span class="stats-header performance">Performance</span> ';
      
      // Direct access using correct property names
      let encodeDelay = localVideoStats.encodeDelay || 0;
      let targetBitrate = (localVideoStats.targetSendBitrate || 0) / 1000;
      let actualBitrate = (localVideoStats.sendBitrate || 0) / 1000;
      let videoBytes = (localVideoStats.sendBytes || 0) / 1024;
      let totalFreezeTime = localVideoStats.totalFreezeTime || 0;
      let duration = localVideoStats.totalDuration || 0;
      
      html += `<div>Encode Delay: ${encodeDelay.toFixed(1)}ms</div>`;
      html += `<div>Target Bitrate: ${targetBitrate.toFixed(2)} Kbps</div>`;
      html += `<div>Video Bitrate: ${actualBitrate.toFixed(2)} Kbps</div>`;
      html += `<div>Video Bytes: ${videoBytes.toFixed(2)} KB</div>`;
      html += `<div>Freeze Time: ${totalFreezeTime.toFixed(0)}ms</div>`;
      html += `<div>Duration: ${duration.toFixed(0)}s</div>`;
      
      html += '<span class="stats-header audio">Audio</span> ';
      
      // Direct access using correct property names
      let audioBitrate = (localAudioStats.sendBitrate || 0) / 1000;
      let audioLevel = localAudioStats.sendVolumeLevel || 0;
      let audioCodec = localAudioStats.codecType || 'opus';
      let audioJitter = localAudioStats.sendJitterMs || 0;
      let audioBytes = (localAudioStats.sendBytes || 0) / 1024;
      
      html += `<div>Audio Bitrate: ${audioBitrate.toFixed(2)} Kbps</div>`;
      html += `<div>Energy Level: ${audioLevel.toFixed(2)}</div>`;
      html += `<div>Codec: ${audioCodec}</div>`;
      html += `<div>Jitter: ${audioJitter.toFixed(1)}ms</div>`;
      html += `<div>Audio Bytes: ${audioBytes.toFixed(2)} KB</div>`;
      html += '</div>'; // Close right column
      
      // Update the display
      localStatsDisplay.innerHTML = html;
      localStatsDisplay.style.display = "flex";
    }
    
    // Update remote stats
    if (rtcClient) {
      // Get remote stats
      const remoteVideoStats = rtcClient.getRemoteVideoStats();
      const remoteAudioStats = rtcClient.getRemoteAudioStats();
      
      // Log all property names for one remote stats object (if available)
      const firstRemoteVideoUid = Object.keys(remoteVideoStats)[0];
      const firstRemoteAudioUid = Object.keys(remoteAudioStats)[0];
      
      if (firstRemoteVideoUid) {
        console.log("ALL REMOTE VIDEO STATS PROPERTIES:", Object.keys(remoteVideoStats[firstRemoteVideoUid]));
      }
      
      if (firstRemoteAudioUid) {
        console.log("ALL REMOTE AUDIO STATS PROPERTIES:", Object.keys(remoteAudioStats[firstRemoteAudioUid]));
      }
      
      // Debug: Log the raw remote stats objects
      console.log("Raw remote video stats:", JSON.stringify(remoteVideoStats));
      console.log("Raw remote audio stats:", JSON.stringify(remoteAudioStats));
      
      // Process each remote user
      for (const [uid, videoElement] of remoteVideos.entries()) {
        try {
          // Get stats for this specific user
          const remoteVideoStats_uid = remoteVideoStats[uid];
          const remoteAudioStats_uid = remoteAudioStats[uid];
          
          // Debug: Log the user-specific stats
          console.log(`Remote video stats for ${uid}:`, JSON.stringify(remoteVideoStats_uid));
          console.log(`Remote audio stats for ${uid}:`, JSON.stringify(remoteAudioStats_uid));
          
          // Get stats display element
          const remoteStatsDisplay = videoStatsOverlays.get(uid);
          if (!remoteStatsDisplay) continue;
          
          // Skip if no stats available
          if (!remoteVideoStats_uid && !remoteAudioStats_uid) {
            console.warn(`No stats available for user ${uid}`);
            continue;
          }
          
          // Get remote network quality
          const remoteNetworkQuality = userNetworkQuality.get(uid) || {uplink: 0, downlink: 0};
          
          // Create HTML for the two columns
          let html = '';
          
          // Left column
          html += '<div class="stats-column">';
          html += '<span class="stats-header network">Network</span> ';
          html += `<div>Quality: U- ${getQualityText(remoteNetworkQuality.uplink)} D- ${getQualityText(remoteNetworkQuality.downlink)}</div>`;
          if (remoteVideoStats_uid) {
            // Direct access using correct property names
            let delay = remoteVideoStats_uid.end2EndDelay || 0;
            let videoLossRate = (remoteVideoStats_uid.packetLossRate || 0) * 100;
            let videoPacketsLost = remoteVideoStats_uid.receivePacketsLost || 0;
            let receiveDelay = remoteVideoStats_uid.receiveDelay || 0;
            let transportDelay = remoteVideoStats_uid.transportDelay || 0;
            
            html += `<div>Delay: ${delay.toFixed(0)}ms</div>`;
            html += `<div>Video Loss: ${videoLossRate.toFixed(1)}%</div>`;
            html += `<div>Video Pkts Lost: ${videoPacketsLost}</div>`;
            html += `<div>Receive Delay: ${receiveDelay.toFixed(1)}ms</div>`;
            html += `<div>Transport: ${transportDelay.toFixed(0)}ms</div>`;
          }
          
          if (remoteAudioStats_uid) {
            let audioLossRate = (remoteAudioStats_uid.packetLossRate || 0) * 100;
            let end2endDelay = remoteAudioStats_uid.end2EndDelay || 0;
            
            html += `<div>Audio Loss: ${audioLossRate.toFixed(1)}%</div>`;
            html += `<div>Audio End2End: ${end2endDelay.toFixed(0)}ms</div>`;
          }
          
          html += '<span class="stats-header video">Video</span> ';
          
          if (remoteVideoStats_uid) {
            // Using correct property names for remote video resolution
            let width = remoteVideoStats_uid.receiveResolutionWidth || 0;
            let height = remoteVideoStats_uid.receiveResolutionHeight || 0;
            let decodeFps = remoteVideoStats_uid.decodeFrameRate || 0;
            let renderFps = remoteVideoStats_uid.renderFrameRate || 0;
            let videoCodec = remoteVideoStats_uid.codecType || 'VP8';
            
            html += `<div>Resolution: ${width}x${height}</div>`;
            html += `<div>FPS: ${decodeFps.toFixed(1)} → ${renderFps.toFixed(1)}</div>`;
            html += `<div>Codec: ${videoCodec}</div>`;
          }
          html += '</div>'; // Close left column
          
          // Right column
          html += '<div class="stats-column">';
          html += '<span class="stats-header performance">Performance</span> ';
          
          if (remoteVideoStats_uid) {
            // Direct access using correct property names
            let videoBitrate = (remoteVideoStats_uid.receiveBitrate || 0) / 1000;
            let freezeTime = remoteVideoStats_uid.totalFreezeTime || 0;
            let freezeRate = (remoteVideoStats_uid.freezeRate || 0) * 100;
            let videoBytes = (remoteVideoStats_uid.receiveBytes || 0) / 1024;
            let duration = remoteVideoStats_uid.totalDuration || 0;
            let publishDuration = remoteVideoStats_uid.publishDuration || 0;
            
            html += `<div>Video Bitrate: ${videoBitrate.toFixed(2)} Kbps</div>`;
            html += `<div>Freeze Time: ${freezeTime.toFixed(0)}ms</div>`;
            html += `<div>Freeze Rate: ${freezeRate.toFixed(1)}%</div>`;
            html += `<div>Video Bytes: ${videoBytes.toFixed(2)} KB</div>`;
            html += `<div>Duration: ${duration.toFixed(0)}s</div>`;
            html += `<div>Pub Duration: ${publishDuration.toFixed(0)}s</div>`;
          }
          
          html += '<span class="stats-header audio">Audio</span> ';
          
          if (remoteAudioStats_uid) {
            // Direct access using correct property names
            let audioBitrate = (remoteAudioStats_uid.receiveBitrate || 0) / 1000;
            let audioLevel = remoteAudioStats_uid.receiveLevel || 0;
            let audioCodec = remoteAudioStats_uid.codecType || 'opus';
            let audioBytes = (remoteAudioStats_uid.receiveBytes || 0) / 1024;
            let audioFreezeTime = remoteAudioStats_uid.totalFreezeTime || 0;
            
            html += `<div>Audio Bitrate: ${audioBitrate.toFixed(2)} Kbps</div>`;
            html += `<div>Energy Level: ${audioLevel.toFixed(2)}</div>`;
            html += `<div>Codec: ${audioCodec}</div>`;
            html += `<div>Audio Bytes: ${audioBytes.toFixed(2)} KB</div>`;
            html += `<div>Freeze Time: ${audioFreezeTime.toFixed(0)}ms</div>`;
          }
          html += '</div>'; // Close right column
          
          // Update the display
          remoteStatsDisplay.innerHTML = html;
          remoteStatsDisplay.style.display = "flex";
        } catch (error) {
          console.error(`Error updating stats for user ${uid}:`, error);
        }
      }
    }
  } catch (error) {
    console.error("Error updating stats displays:", error);
  }
}

// Helper function to get quality text based on quality level
function getQualityText(quality) {
  switch (Number(quality)) {
    case 0: return "Unknown";
    case 1: return "Exc";
    case 2: return "Good";
    case 3: return "Fair";
    case 4: return "Poor";
    case 5: return "Bad";
    case 6: return "Dis";
    default: return "Unknown";
  }
}

// Helper function to get the CSS class for network quality
function getNetworkQualityClass(quality) {
  switch (Number(quality)) {
    case 0: return "quality-0";
    case 1: return "quality-1";
    case 2: return "quality-2";
    case 3: return "quality-3";
    case 4: return "quality-4";
    case 5: return "quality-5";
    case 6: return "quality-6";
    default: return "quality-0";
  }
}

// Initialize PiP functionality
function initPip() {
  // Check if browser supports PiP
  if (document.pictureInPictureEnabled) {
    pipBtn.disabled = false;
    pipBtn.addEventListener('click', () => {
      pipTriggeredByButton = true;
      togglePip();
    });
    pipContainer.addEventListener('click', exitPip);

    // Add visibility change listener for automatic PiP
    document.addEventListener('visibilitychange', async () => {
      if (document.hidden) {
        // App is being minimized/swiped away
        const remoteVideo = document.querySelector('#remoteVideo video');
        if (remoteVideo && remoteVideo.srcObject) {
          try {
            await remoteVideo.requestPictureInPicture();
            pipTriggeredByButton = false; // Mark as auto-triggered
          } catch (error) {
            console.error('Error entering PiP mode with remote video:', error);
          }
        }
      } else if (!pipTriggeredByButton) {
        // App is visible again and PiP was auto-triggered
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        }
      }
    });
  } else {
    pipBtn.style.display = 'none';
  }
}

async function togglePip() {
  if (!localVideoTrack) return;

  if (document.pictureInPictureElement) {
    await exitPip();
    return;
  }

  // First try to find a screen share video
  const screenShareVideo = document.querySelector('.screen-share video');
  if (screenShareVideo && screenShareVideo.srcObject) {
    try {
      await screenShareVideo.requestPictureInPicture();
      return;
    } catch (error) {
      console.error('Error entering PiP mode with screen share:', error);
    }
  }

  // Then try to find a regular remote video
  const remoteVideo = document.querySelector('#remoteVideo video');
  if (remoteVideo && remoteVideo.srcObject) {
    try {
      await remoteVideo.requestPictureInPicture();
      return;
    } catch (error) {
      console.error('Error entering PiP mode with remote video:', error);
    }
  }

  // Try local video as a last resort using getMediaStreamTrack
  try {
    const mediaStreamTrack = localVideoTrack.getMediaStreamTrack();
    if (mediaStreamTrack) {
      const mediaStream = new MediaStream([mediaStreamTrack]);
      const pipVideo = document.createElement('video');
      pipVideo.srcObject = mediaStream;
      pipVideo.autoplay = true;
      pipVideo.muted = true;
      
      // Wait for metadata to load before requesting PiP
      await new Promise((resolve, reject) => {
        pipVideo.onloadedmetadata = resolve;
        pipVideo.onerror = reject;
        // Set a timeout in case the video never loads
        setTimeout(reject, 5000);
      });
      
      pipContainer.innerHTML = '';
      pipContainer.appendChild(pipVideo);
      pipContainer.style.display = 'block';
      
      await pipVideo.requestPictureInPicture();
      return;
    }
  } catch (error) {
    console.error('Error trying to use local video for PiP:', error);
  }

  // If we get here, no suitable video was found for PiP
  alert('Picture-in-Picture is only available for remote video or screen sharing content.');
}

async function exitPip() {
  if (document.pictureInPictureElement) {
    await document.exitPictureInPicture();
    pipTriggeredByButton = false;
  }
  pipContainer.style.display = 'none';
  pipContainer.innerHTML = '';
}

// Add PiP event listeners
document.addEventListener('leavepictureinpicture', () => {
  pipContainer.style.display = 'none';
  pipContainer.innerHTML = '';
});

// Add new variables for screen sharing
let screenShareClient = null;
let screenShareTrack = null;
let screenShareUserId = null;
let screenShareMap = new Map(); // Map to track who is screen sharing
const screenShareBtn = document.getElementById("screenShareBtn");
const stopScreenShareBtn = document.getElementById("stopScreenShareBtn");

// Screen sharing event handlers
screenShareBtn.addEventListener("click", async () => {
  try {
    // Create screen share track
    screenShareTrack = await AgoraRTC.createScreenVideoTrack();
    
    // Create screen share client
    const screenShareUserId = `${userIdInput.value}-screen`;
    screenShareClient = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
    
    // Join channel with screen share client
    await screenShareClient.join(
      appIdInput.value,
      channelNameInput.value,
      tokenInput.value || null,
      screenShareUserId
    );
    
    // Publish screen share track
    await screenShareClient.publish([screenShareTrack]);
    
    // Add to screen share map first
    console.log("[SCREEN SHARE] Adding to screenShareMap:", userIdInput.value);
    screenShareMap.set(userIdInput.value, screenShareUserId);
    
    // Update metadata to indicate screen sharing
    try {
      console.log("[SCREEN SHARE] Setting metadata to true");
      await rtmClient.storage.setUserMetadata([{
        key: METADATA_KEY,
        value: "true"
      }]);
      console.log("[SCREEN SHARE] Metadata set successfully");
    } catch (error) {
      console.error("[SCREEN SHARE] Failed to update metadata:", error);
    }
    
    // Update UI
    screenShareBtn.style.display = "none";
    stopScreenShareBtn.style.display = "inline-block";
    stopScreenShareBtn.disabled = false;
    
    // Force UI update
    console.log("[SCREEN SHARE] Forcing UI update");
    updateParticipantsList();
    
    // Add system message
    const timestamp = new Date().toLocaleTimeString();
    addChatMessage(channelChatBox, `[${timestamp}] [System] You started screen sharing`);
    
    // Broadcast to all users
    if (rtmClient && subscribedChannel) {
      await rtmClient.publish(subscribedChannel, `[System] ${userIdInput.value} started screen sharing`);
    }
  } catch (error) {
    console.error("[SCREEN SHARE] Failed to start:", error);
    alert("Failed to start screen sharing: " + error.message);
  }
});

stopScreenShareBtn.addEventListener("click", async () => {
  try {
    // Stop and close screen share track
    if (screenShareTrack) {
      screenShareTrack.stop();
      screenShareTrack.close();
      screenShareTrack = null;
    }
    
    // Leave channel with screen share client
    if (screenShareClient) {
      await screenShareClient.leave();
      screenShareClient = null;
    }
    
    // Remove from screen share map first
    console.log("[SCREEN SHARE] Removing from screenShareMap:", userIdInput.value);
    screenShareMap.delete(userIdInput.value);
    
    // Update metadata to indicate screen sharing stopped
    try {
      console.log("[SCREEN SHARE] Setting metadata to false");
      await rtmClient.storage.setUserMetadata([{
        key: METADATA_KEY,
        value: "false"
      }]);
      console.log("[SCREEN SHARE] Metadata set successfully");
    } catch (error) {
      console.error("[SCREEN SHARE] Failed to update metadata:", error);
    }
    
    // Update UI
    screenShareBtn.style.display = "inline-block";
    stopScreenShareBtn.style.display = "none";
    stopScreenShareBtn.disabled = true;
    
    // Force UI update
    console.log("[SCREEN SHARE] Forcing UI update");
    updateParticipantsList();
    
    // Add system message
    const timestamp = new Date().toLocaleTimeString();
    addChatMessage(channelChatBox, `[${timestamp}] [System] You stopped screen sharing`);
    
    // Broadcast to all users
    if (rtmClient && subscribedChannel) {
      await rtmClient.publish(subscribedChannel, `[System] ${userIdInput.value} stopped screen sharing`);
    }
  } catch (error) {
    console.error("[SCREEN SHARE] Failed to stop:", error);
  }
});

// Update the joinChannelBtn click handler to enable screen share button
joinChannelBtn.addEventListener("click", async () => {
  // ... existing code ...
  
  try {
    // ... existing code ...
    
    // Enable screen share button
    screenShareBtn.disabled = false;
    
    // ... rest of existing code ...
  } catch (err) {
    console.error("Failed to join RTC channel:", err);
    alert("Failed to join RTC channel. Please check your connection and try again.");
  }
});

// Update the leaveChannelBtn click handler to handle screen sharing cleanup
leaveChannelBtn.addEventListener("click", async () => {
  // ... existing code ...
  
  try {
    // ... existing code ...
    
    // Stop screen sharing if active
    if (screenShareTrack) {
      screenShareTrack.stop();
      screenShareTrack.close();
      screenShareTrack = null;
    }
    
    if (screenShareClient) {
      await screenShareClient.leave();
      screenShareClient = null;
    }
    
    screenShareMap.clear();
    
    // Update UI
    screenShareBtn.style.display = "inline-block";
    screenShareBtn.disabled = true;
    stopScreenShareBtn.style.display = "none";
    stopScreenShareBtn.disabled = true;
    
    // ... rest of existing code ...
  } catch (err) {
    console.error("Failed to leave RTC channel:", err);
  }
});

// Update the user-published event handler to handle screen sharing
rtcClient.on("user-published", async (user, mediaType) => {
  await rtcClient.subscribe(user, mediaType);
  console.log(`Subscribe success to ${user.uid}'s ${mediaType}`);

  // Check if this is a screen share user
  if (user.uid.toString().endsWith("-screen")) {
    // Find the original user ID
    const originalUserId = user.uid.toString().replace(/-screen$/, "");
    console.log("[SCREEN SHARE] Detected screen share from user:", originalUserId);
    
    // Subscribe to metadata for both the original user and screen share user
    try {
      console.log("[SCREEN SHARE] Subscribing to metadata for original user:", originalUserId);
      await rtmClient.storage.subscribeUserMetadata(originalUserId);
      
      // Get initial metadata state
      const result = await rtmClient.storage.getUserMetadata({ userId: originalUserId });
      console.log("[SCREEN SHARE] Got initial metadata for user:", originalUserId, "result:", result);
      
      // Update screen share map
      screenShareMap.set(originalUserId, user.uid.toString());
      console.log("[SCREEN SHARE] Updated screenShareMap:", Array.from(screenShareMap.entries()));
      
      // Ensure the original user is in the participants set
      if (!participants.has(originalUserId)) {
        participants.add(originalUserId);
      }
      
      // Force UI update
      updateParticipantsList();
    } catch (error) {
      console.error("[SCREEN SHARE] Failed to handle metadata:", error);
    }
    
    // Create video element for screen share
    const videoElement = createVideoElement(user.uid);
    videoElement.classList.add("screen-share");
    
    // Add screen share indicator
    const screenShareIndicator = document.createElement("div");
    screenShareIndicator.className = "screen-share-indicator";
    screenShareIndicator.innerHTML = '<i class="fas fa-desktop"></i> Screen Share';
    videoElement.appendChild(screenShareIndicator);
    
    remoteVideos.set(user.uid, videoElement);
    updateVideoGrid();
    
    // Play the screen share
    if (mediaType === "video") {
      user.videoTrack.play(videoElement);
    }
  } else {
    // Handle regular user video/audio as before
    if (mediaType === "video") {
      // Create or get video element for this user
      let videoElement;
      if (!remoteVideos.has(user.uid)) {
        videoElement = createVideoElement(user.uid);
        remoteVideos.set(user.uid, videoElement);
        updateVideoGrid();
        console.log(`Created new video element for ${user.uid}`);
      } else {
        videoElement = remoteVideos.get(user.uid);
        console.log(`Using existing video element for ${user.uid}`);
      }
      
      // Remove any previous video-muted state
      videoElement.classList.remove("video-muted");
      const mutedMsg = videoElement.querySelector(".video-muted-text");
      if (mutedMsg) {
        mutedMsg.style.display = "none";
        console.log(`Hid video muted message for ${user.uid}`);
      }
      
      // Play the video directly into the container element
      console.log(`Playing remote video from ${user.uid}`);
      try {
        user.videoTrack.play(videoElement);
        console.log(`Successfully started playing video for ${user.uid}`);
      } catch (error) {
        console.error(`Error playing remote video for ${user.uid}:`, error);
      }
      
      // Update camera mute indicator for this user
      const cameraMuteIndicator = cameraMuteIndicators.get(user.uid);
      if (cameraMuteIndicator) {
        cameraMuteIndicator.style.display = "none";
        console.log(`Hiding camera mute indicator for ${user.uid}`);
      }
    }
    if (mediaType === "audio") {
      console.log(`Playing remote audio from ${user.uid}`);
      user.audioTrack.play();
      
      // Update mic mute indicator for this user
      const micMuteIndicator = micMuteIndicators.get(user.uid);
      if (micMuteIndicator) {
        micMuteIndicator.style.display = "none";
        console.log(`Hiding mic mute indicator for ${user.uid}`);
      }
    }
  }
});

// Update the user-left event handler to handle screen sharing cleanup
rtcClient.on("user-left", (user) => {
  console.log(`User ${user.uid} left the channel`);
  
  // Check if this is a screen share user
  if (user.uid.toString().endsWith("-screen")) {
    // Find and remove from screen share map
    const originalUserId = user.uid.toString().replace(/-screen$/, "");
    screenShareMap.delete(originalUserId);
    updateParticipantsList();
  }
  
  // Remove the user's track state
  userTrackStates.delete(user.uid);
  
  // Clean up the user's indicators
  cleanupUserIndicators(user.uid);
  
  // Remove the user's video element
  const videoElement = remoteVideos.get(user.uid);
  if (videoElement) {
    videoElement.remove();
    remoteVideos.delete(user.uid);
    updateVideoGrid();
    updateParticipantsList(); // Force UI refresh
  }
});

// Function to clean up duplicate metadata
async function cleanupDuplicateMetadata(userId) {
  try {
    console.log("[METADATA CLEANUP] Starting cleanup for user:", userId);
    // Delete the old "screenSharing" key
    await rtmClient.storage.removeUserMetadata([{
      key: "screenSharing"
    }]);
    console.log("[METADATA CLEANUP] Successfully removed old metadata key");
  } catch (error) {
    console.error("[METADATA CLEANUP] Failed to cleanup metadata:", error);
  }
}
