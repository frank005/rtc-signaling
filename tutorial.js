// Tutorial state management
// --- Skip tutorial if skipTutorial=1 is in the URL ---
(function() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('skipTutorial') === '1') {
    localStorage.setItem('tutorialCompleted', 'true');
  }
})();

let tutorialState = {
  currentStep: 0,
  completed: false,
  steps: [
    {
      target: '#showLoginBtn',
      title: 'Welcome to Agora RTC Demo!',
      content: 'Let\'s get you started with the basic setup. First, click the login settings button.',
      position: 'bottom'
    },
    {
      target: '#appId',
      title: 'Enter App ID',
      content: 'Enter your Agora App ID here. You can get this from your Agora Console.',
      position: 'bottom'
    },
    {
      target: '#userId',
      title: 'Enter User ID',
      content: 'Choose a unique user ID for yourself. This will be your display name in the chat.',
      position: 'bottom'
    },
    {
      target: '#loginBtn',
      title: 'Login',
      content: 'Click the login button to connect to Agora services.',
      position: 'bottom'
    },
    {
      target: '#channelName',
      title: 'Enter Channel Name',
      content: 'Enter a channel name to join. Other users will need to use the same channel name to connect with you.',
      position: 'bottom'
    },
    {
      target: '#subscribeBtn',
      title: 'Subscribe to Channel',
      content: 'Click subscribe to join the channel and enable chat functionality.',
      position: 'bottom'
    },
    {
      target: '#joinChannelBtn',
      title: 'Join Video Call',
      content: 'Click join channel to start your video call!',
      position: 'bottom'
    },
    {
      target: '.copy-link-btn',
      title: 'Invite Others',
      content: 'Copy this link to invite others to join your channel! You can also share it directly. When you\'re ready, click Finish.',
      position: 'bottom'
    }
  ]
};

// Track the previously highlighted element
let prevHighlighted = null;
let prevOriginalStyles = {};

// Create and initialize tutorial overlay
function initTutorial() {
  // Check if tutorial has been completed before
  if (localStorage.getItem('tutorialCompleted')) {
    return;
  }

  // Create tutorial overlay elements
  const overlay = document.createElement('div');
  overlay.id = 'tutorialOverlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    z-index: 9999;
    display: flex;
    justify-content: center;
    align-items: center;
    pointer-events: none;
  `;

  const tooltip = document.createElement('div');
  tooltip.id = 'tutorialTooltip';
  tooltip.style.cssText = `
    position: absolute;
    background: #1a1a1a;
    color: #ffffff;
    padding: 20px;
    border-radius: 8px;
    max-width: 300px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    z-index: 10000;
    pointer-events: auto;
  `;

  const arrow = document.createElement('div');
  arrow.id = 'tutorialArrow';
  arrow.style.cssText = `
    position: absolute;
    width: 0;
    height: 0;
    border: 10px solid transparent;
  `;

  const content = document.createElement('div');
  content.id = 'tutorialContent';
  content.style.cssText = `
    margin-bottom: 15px;
  `;

  const title = document.createElement('h3');
  title.id = 'tutorialTitle';
  title.style.cssText = `
    margin: 0 0 10px 0;
    color: #89b4fa;
  `;

  const text = document.createElement('p');
  text.id = 'tutorialText';
  text.style.cssText = `
    margin: 0;
    line-height: 1.5;
  `;

  const buttons = document.createElement('div');
  buttons.style.cssText = `
    display: flex;
    justify-content: flex-start;
    margin-top: 15px;
  `;

  const prevBtn = document.createElement('button');
  prevBtn.id = 'tutorialPrevBtn';
  prevBtn.textContent = 'Previous';
  prevBtn.style.cssText = `
    padding: 8px 16px;
    background: #2a2a2a;
    color: #ffffff;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  `;

  // Assemble the tutorial elements
  content.appendChild(title);
  content.appendChild(text);
  tooltip.appendChild(content);
  buttons.appendChild(prevBtn);
  tooltip.appendChild(buttons);
  tooltip.appendChild(arrow);
  overlay.appendChild(tooltip);
  document.body.appendChild(overlay);

  // Add event listener for previous button
  prevBtn.addEventListener('click', () => {
    if (tutorialState.currentStep > 0) {
      tutorialState.currentStep--;
      updateTutorial();
    }
  });

  // Start the tutorial
  updateTutorial();
}

// Update tutorial position and content
function updateTutorial() {
  const step = tutorialState.steps[tutorialState.currentStep];
  const target = document.querySelector(step.target);
  const tooltip = document.getElementById('tutorialTooltip');
  const arrow = document.getElementById('tutorialArrow');
  const title = document.getElementById('tutorialTitle');
  const text = document.getElementById('tutorialText');
  const prevBtn = document.getElementById('tutorialPrevBtn');
  const overlay = document.getElementById('tutorialOverlay');

  // Remove any existing Finish button
  let finishBtn = document.getElementById('tutorialFinishBtn');
  if (finishBtn) finishBtn.remove();

  if (!target || !tooltip) return;

  // Remove highlight from previous element
  if (prevHighlighted) {
    prevHighlighted.style.position = prevOriginalStyles.position || '';
    prevHighlighted.style.zIndex = prevOriginalStyles.zIndex || '';
    prevHighlighted.style.boxShadow = prevOriginalStyles.boxShadow || '';
    prevHighlighted.style.pointerEvents = prevOriginalStyles.pointerEvents || '';
    prevHighlighted = null;
    prevOriginalStyles = {};
  }

  // Update content
  title.textContent = step.title;
  text.textContent = step.content;

  // Update previous button visibility
  prevBtn.style.display = tutorialState.currentStep === 0 ? 'none' : 'block';

  // Show Finish button only on last step
  if (tutorialState.currentStep === tutorialState.steps.length - 1) {
    finishBtn = document.createElement('button');
    finishBtn.id = 'tutorialFinishBtn';
    finishBtn.textContent = 'Finish';
    finishBtn.style.cssText = `
      padding: 8px 16px;
      background: #89b4fa;
      color: #1a1a1a;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      margin-left: 10px;
    `;
    finishBtn.addEventListener('click', completeTutorial);
    prevBtn.parentNode.appendChild(finishBtn);
  }

  // Adjust overlay background for modal steps
  const loginModal = document.getElementById('loginModal');
  if (loginModal && loginModal.contains(target)) {
    overlay.style.background = 'rgba(0,0,0,0.05)'; // almost transparent
  } else {
    overlay.style.background = 'rgba(0,0,0,0.7)'; // normal dark
  }

  // Position tooltip
  const targetRect = target.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();

  let top, left, arrowTop, arrowLeft, arrowBorder;

  switch (step.position) {
    case 'top':
      top = targetRect.top - tooltipRect.height - 20;
      left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
      arrowTop = tooltipRect.height;
      arrowLeft = tooltipRect.width / 2;
      arrowBorder = 'border-top-color: #1a1a1a;';
      break;
    case 'bottom':
      top = targetRect.bottom + 20;
      left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
      arrowTop = -20;
      arrowLeft = tooltipRect.width / 2;
      arrowBorder = 'border-bottom-color: #1a1a1a;';
      break;
    case 'left':
      top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
      left = targetRect.left - tooltipRect.width - 20;
      arrowTop = tooltipRect.height / 2;
      arrowLeft = tooltipRect.width;
      arrowBorder = 'border-left-color: #1a1a1a;';
      break;
    case 'right':
      top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
      left = targetRect.right + 20;
      arrowTop = tooltipRect.height / 2;
      arrowLeft = -20;
      arrowBorder = 'border-right-color: #1a1a1a;';
      break;
  }

  // Ensure tooltip stays within viewport
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  if (left < 0) left = 20;
  if (left + tooltipRect.width > viewportWidth) left = viewportWidth - tooltipRect.width - 20;
  if (top < 0) top = 20;
  if (top + tooltipRect.height > viewportHeight) top = viewportHeight - tooltipRect.height - 20;

  tooltip.style.top = `${top}px`;
  tooltip.style.left = `${left}px`;
  arrow.style.top = `${arrowTop}px`;
  arrow.style.left = `${arrowLeft}px`;
  arrow.style.cssText += arrowBorder;

  // Highlight target element and save original styles
  prevHighlighted = target;
  prevOriginalStyles = {
    position: target.style.position,
    zIndex: target.style.zIndex,
    boxShadow: target.style.boxShadow,
    pointerEvents: target.style.pointerEvents
  };
  // Only set position: relative if not already absolute/fixed
  const computedPosition = window.getComputedStyle(target).position;
  if (computedPosition !== 'absolute' && computedPosition !== 'fixed') {
    target.style.position = 'relative';
  }
  target.style.zIndex = '10001';
  target.style.boxShadow = '0 0 0 4px #89b4fa';
  target.style.pointerEvents = 'auto';
}

// Complete tutorial
function completeTutorial() {
  // Remove highlight from previous element
  if (prevHighlighted) {
    prevHighlighted.style.position = prevOriginalStyles.position || '';
    prevHighlighted.style.zIndex = prevOriginalStyles.zIndex || '';
    prevHighlighted.style.boxShadow = prevOriginalStyles.boxShadow || '';
    prevHighlighted.style.pointerEvents = prevOriginalStyles.pointerEvents || '';
    prevHighlighted = null;
    prevOriginalStyles = {};
  }
  const overlay = document.getElementById('tutorialOverlay');
  if (overlay) {
    overlay.remove();
  }
  localStorage.setItem('tutorialCompleted', 'true');
  tutorialState.completed = true;
}

// Add event listeners for tutorial progression
document.addEventListener('DOMContentLoaded', () => {
  // Initialize tutorial
  initTutorial();

  // Add input event listeners for progression
  const appIdInput = document.getElementById('appId');
  const userIdInput = document.getElementById('userId');
  const channelNameInput = document.getElementById('channelName');

  if (appIdInput) {
    appIdInput.addEventListener('input', () => {
      if (tutorialState.currentStep === 1 && appIdInput.value.trim()) {
        tutorialState.currentStep = 2;
        updateTutorial();
      }
    });
  }

  if (userIdInput) {
    userIdInput.addEventListener('input', () => {
      if (tutorialState.currentStep === 2 && userIdInput.value.trim()) {
        tutorialState.currentStep = 3;
        updateTutorial();
      }
    });
  }

  if (channelNameInput) {
    channelNameInput.addEventListener('input', () => {
      if (tutorialState.currentStep === 4 && channelNameInput.value.trim()) {
        tutorialState.currentStep = 5;
        updateTutorial();
      }
    });
  }

  // Add click event listeners for progression
  const showLoginBtn = document.getElementById('showLoginBtn');
  const loginBtn = document.getElementById('loginBtn');
  const subscribeBtn = document.getElementById('subscribeBtn');
  const joinChannelBtn = document.getElementById('joinChannelBtn');

  if (showLoginBtn) {
    showLoginBtn.addEventListener('click', () => {
      if (tutorialState.currentStep === 0) {
        tutorialState.currentStep = 1;
        updateTutorial();
      }
    });
  }

  if (loginBtn) {
    loginBtn.addEventListener('click', () => {
      if (tutorialState.currentStep === 3) {
        tutorialState.currentStep = 4;
        updateTutorial();
      }
    });
  }

  if (subscribeBtn) {
    subscribeBtn.addEventListener('click', () => {
      if (tutorialState.currentStep === 5) {
        tutorialState.currentStep = 6;
        updateTutorial();
      }
    });
  }

  if (joinChannelBtn) {
    joinChannelBtn.addEventListener('click', () => {
      if (tutorialState.currentStep === 6) {
        tutorialState.currentStep = 7;
        updateTutorial();
      }
    });
  }
}); 