/**
 * VidGrid — Minimal Multi-Player Video Grid with Focus Lightbox, Self-Healing, Ratios, Gutters, and Corner Rounding
 */

// Hardcoded Default Playlist fallback (empty by default)
const DEFAULT_PLAYLIST = [];

// App State
const state = {
  globalPlaylist: [],
  players: [],
  playerCount: 6,
  aspectFactor: 1, // width / height factor
  aspectCSS: '1 / 1',
  gridGutter: 48,
  borderRadius: 24, // in px
  focusedPlayer: null,
  unmuteOnFocus: false,
  focusFull: false,
  focusAspectFactor: 16 / 9,
  disableFocus: false,
  cursorMode: 'legacy'
};

// Durstenfeld (Fisher-Yates) Shuffle
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Dynamic Video Discovery (Self-Healing Playlist)
 * Fetches the videos/ directory listing and parses video files.
 */
async function discoverVideos() {
  const discovered = [];
  const videoExtensions = ['.mp4', '.webm', '.mov', '.ogg', '.mkv', '.avi'];
  
  // 1. Try to fetch static playlist.json first (used for static hosting like GitHub Pages)
  try {
    const cacheBuster = '?v=' + Date.now();
    let playlistResponse = await fetch('videos/playlist.json' + cacheBuster);
    let playlistBase = 'videos/';
    if (!playlistResponse.ok) {
      playlistResponse = await fetch('../videos/playlist.json' + cacheBuster);
      playlistBase = '../videos/';
    }
    if (playlistResponse.ok) {
      const staticPlaylist = await playlistResponse.json();
      staticPlaylist.forEach(relPath => {
        const fileName = relPath.split('/').pop();
        discovered.push({ name: fileName, url: playlistBase + relPath });
      });
      return discovered;
    }
  } catch (err) {
    // Fail silently and fallback to HTML directory parsing
  }

  // 2. Fallback: Dynamically probe the web server to locate the videos directory
  let baseVideosPath = 'videos/';
  try {
    const test1 = await fetch('videos/');
    if (!test1.ok) {
      throw new Error();
    }
  } catch (e) {
    try {
      const test2 = await fetch('../videos/');
      if (test2.ok) {
        baseVideosPath = '../videos/';
      }
    } catch (err) {
      console.warn('Both videos/ and ../videos/ directory listings are inaccessible.');
    }
  }
  
  // Track directories we need to fetch recursively
  const queue = [baseVideosPath];
  const visited = new Set();
  
  while (queue.length > 0) {
    const currentDir = queue.shift();
    if (visited.has(currentDir)) continue;
    visited.add(currentDir);
    
    try {
      const response = await fetch(currentDir);
      if (!response.ok) {
        console.warn(`Failed to fetch index for: ${currentDir}`);
        continue;
      }
      const html = await response.text();
      
      // Parse directory listing HTML
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const links = doc.querySelectorAll('a');
      
      links.forEach(link => {
        const href = link.getAttribute('href');
        if (!href) return;
        
        const decodedHref = decodeURIComponent(href);
        
        // Skip parent directory links and self-links
        if (
          decodedHref === '../' || 
          decodedHref === '..' || 
          decodedHref === './' || 
          decodedHref === '.' ||
          decodedHref.endsWith('/../') ||
          decodedHref.endsWith('/..')
        ) {
          return;
        }
        
        // Check if it's a subdirectory (ends with a slash '/')
        if (decodedHref.endsWith('/')) {
          let newDir = decodedHref;
          // Resolve relative path
          if (!newDir.startsWith('http://') && !newDir.startsWith('https://') && !newDir.startsWith('/')) {
            newDir = currentDir + decodedHref;
          }
          queue.push(newDir);
        } else {
          // File path matching extension
          const filename = decodedHref.split('/').pop();
          const hasVideoExtension = videoExtensions.some(ext => filename.toLowerCase().endsWith(ext));
          
          if (hasVideoExtension) {
            let url = decodedHref;
            if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('/')) {
              url = currentDir + decodedHref;
            }
            
            if (!discovered.some(item => item.url === url)) {
              discovered.push({
                name: filename,
                url: url
              });
            }
          }
        }
      });
    } catch (error) {
      console.warn(`Dynamic subfolder scan failed for ${currentDir}:`, error.message);
    }
  }
  
  if (discovered.length > 0) {
    console.log('Self-heal: Discovered videos recursively:', discovered);
    return discovered;
  }
  return null;
}

/**
 * Minimal Player Class
 */
class VideoPlayer {
  constructor(index, container) {
    this.index = index;
    this.container = container;
    this.playlist = [...state.globalPlaylist];
    this.shuffledPlaylist = [];
    this.currentIndex = 0;
    
    this.dom = null;
    this.video = null;
    this.errorCount = 0;
    
    this.init();
  }

  init() {
    this.shuffle();
    this.createDom();
    this.loadVideo();
  }

  shuffle() {
    if (this.playlist.length > 0) {
      this.shuffledPlaylist = shuffleArray(this.playlist);
      this.currentIndex = 0;
    } else {
      this.shuffledPlaylist = [];
    }
  }

  createDom() {
    const card = document.createElement('div');
    card.className = 'player-card';
    card.id = `player-card-${this.index}`;
    card.style.aspectRatio = state.aspectCSS;

    const wrapper = document.createElement('div');
    wrapper.className = 'video-wrapper';

    const video = document.createElement('video');
    video.className = 'player-video';
    video.muted = true;
    video.autoplay = true;
    video.playsInline = true;
    video.disableRemotePlayback = true; // Disable remote cast daemon to save background CPU/network threads
    
    wrapper.appendChild(video);
    card.appendChild(wrapper);
    this.container.appendChild(card);

    this.dom = card;
    this.videoWrapper = wrapper;
    this.video = video;

    // Listeners
    video.addEventListener('ended', () => {
      this.errorCount = 0;
      this.next();
    });
    
    video.addEventListener('playing', () => {
      this.errorCount = 0;
    });

    video.addEventListener('error', () => this.handleError());

    // Clicking player card triggers lightbox zoom Focus Mode
    card.addEventListener('click', (e) => {
      if (state.disableFocus) return;
      e.stopPropagation();
      toggleFocusPlayer(this);
    });
  }

  loadVideo() {
    if (this.shuffledPlaylist.length === 0) {
      this.showError('No videos loaded');
      return;
    }

    const err = this.dom.querySelector('.player-error');
    if (err) err.remove();
    this.video.style.display = 'block';

    const item = this.shuffledPlaylist[this.currentIndex];
    this.video.src = item.url;
    
    this.video.play().catch(e => {
      console.warn(`Autoplay blocked on player #${this.index}:`, e);
      this.dom.addEventListener('click', () => this.video.play(), { once: true });
    });
  }

  next() {
    if (this.shuffledPlaylist.length === 0) return;
    this.currentIndex++;
    if (this.currentIndex >= this.shuffledPlaylist.length) {
      this.shuffle();
    }
    this.loadVideo();
  }

  setPlaylist(newPlaylist) {
    this.playlist = [...newPlaylist];
    this.errorCount = 0;
    this.shuffle();
    this.loadVideo();
  }

  handleError() {
    console.error(`Playback error on player #${this.index} for file:`, this.shuffledPlaylist[this.currentIndex]?.url);
    this.errorCount++;
    
    const brokenUrl = this.shuffledPlaylist[this.currentIndex]?.url;
    if (brokenUrl) {
      this.playlist = this.playlist.filter(item => item.url !== brokenUrl);
      this.shuffledPlaylist = this.shuffledPlaylist.filter(item => item.url !== brokenUrl);
    }
    
    if (this.shuffledPlaylist.length === 0) {
      this.showError('All videos in playlist failed');
      return;
    }
    
    if (this.errorCount > this.shuffledPlaylist.length + 2) {
      this.showError('Playback failed repeatedly');
      return;
    }
    
    setTimeout(() => {
      if (this.currentIndex >= this.shuffledPlaylist.length) {
        this.shuffle();
      }
      this.loadVideo();
    }, 800);
  }

  showError(message) {
    this.video.style.display = 'none';
    
    let err = this.dom.querySelector('.player-error');
    if (!err) {
      err = document.createElement('div');
      err.className = 'player-error';
      this.dom.appendChild(err);
    }
    
    if (message === 'No videos loaded') {
      err.innerHTML = `
        <div style="font-weight: 600; margin-bottom: 6px; color: #888;">No Videos Found</div>
        <div style="font-size: 0.72rem; line-height: 1.4; max-width: 90%; color: #555;">
          Place files in your <code>dist/videos/</code> directory and serve locally.
        </div>
      `;
    } else {
      err.innerText = message;
    }
  }
}

/**
 * Helper to smoothly fade audio volume of a video element
 */
function fadeVideoVolume(video, targetVolume, durationMs) {
  if (video.fadeInterval) {
    clearInterval(video.fadeInterval);
  }

  const startVolume = video.volume;
  const volumeDifference = targetVolume - startVolume;
  if (volumeDifference === 0) return;

  const stepTime = 16; // ~60fps
  const totalSteps = durationMs / stepTime;
  let currentStep = 0;

  if (targetVolume > 0 && video.muted) {
    video.volume = 0;
    video.muted = false;
  }

  video.fadeInterval = setInterval(() => {
    currentStep++;
    const progress = currentStep / totalSteps;
    
    if (progress >= 1) {
      clearInterval(video.fadeInterval);
      video.fadeInterval = null;
      video.volume = targetVolume;
      if (targetVolume === 0) {
        video.muted = true;
        video.volume = 1.0; // Reset for next unmuting
      }
    } else {
      video.volume = startVolume + (volumeDifference * progress);
    }
  }, stepTime);
}

/**
 * Focus Mode Control Functions
 */
function toggleFocusPlayer(player) {
  if (state.focusedPlayer === player) {
    exitFocusMode();
  } else {
    enterFocusMode(player);
  }
}

function enterFocusMode(player) {
  if (state.focusedPlayer) {
    exitFocusMode();
  }
  
  state.focusedPlayer = player;
  document.body.classList.add('focus-active');
  
  // Calculate and apply scaling/centering layout coordinates
  applyFocusLayout(player);
  
  player.dom.classList.add('focused');
  player.videoWrapper.classList.add('focused');
  
  // Smoothly fade up the volume of the focused player
  if (state.unmuteOnFocus) {
    fadeVideoVolume(player.video, 1.0, 500);
  }
}

function applyFocusLayout(player, isResize = false) {
  const card = player.dom;
  const wrapper = player.videoWrapper;
  
  // Calculate target focused dimensions
  let targetWidth, targetHeight;
  
  if (state.focusFull) {
    targetWidth = window.innerWidth;
    targetHeight = window.innerHeight;
  } else {
    // Determine aspect ratio for focus mode (fallback to grid aspect ratio)
    const A_focus = state.focusAspectFactor || state.aspectFactor;
    
    const maxWidth = window.innerWidth * 0.8;
    const maxHeight = window.innerHeight * 0.8;
    
    // Fit aspect ratio within 80% bounds
    targetWidth = Math.min(maxWidth, maxHeight * A_focus);
    targetHeight = targetWidth / A_focus;
  }
  
  // Calculate target centering position
  const targetLeft = (window.innerWidth - targetWidth) / 2;
  const targetTop = (window.innerHeight - targetHeight) / 2;
  
  if (isResize) {
    // Update layout coordinates instantly on window resize to prevent delay lag
    wrapper.style.transition = 'none';
    wrapper.style.left = `${targetLeft}px`;
    wrapper.style.top = `${targetTop}px`;
    wrapper.style.width = `${targetWidth}px`;
    wrapper.style.height = `${targetHeight}px`;
    if (state.focusFull) {
      wrapper.style.borderRadius = '0px';
    } else {
      const scaledFocusRadius = (state.borderRadius / 300) * targetHeight;
      wrapper.style.borderRadius = `${scaledFocusRadius}px`;
    }
    wrapper.offsetHeight; // Force reflow
    wrapper.style.transition = '';
    return;
  }

  // Measure the current card slot position in the stable CSS grid
  const rect = card.getBoundingClientRect();
  
  // Disable transition temporarily during initial position snap
  wrapper.style.transition = 'none';
  
  // Initialize fixed layout position matching grid card bounds
  wrapper.style.position = 'fixed';
  wrapper.style.left = `${rect.left}px`;
  wrapper.style.top = `${rect.top}px`;
  wrapper.style.width = `${rect.width}px`;
  wrapper.style.height = `${rect.height}px`;
  wrapper.style.zIndex = '1001';
  wrapper.style.borderRadius = card.style.borderRadius;
  wrapper.style.boxShadow = '0 0 0 rgba(0,0,0,0)';
  
  // Force browser layout repaint (reflow)
  wrapper.offsetHeight;
  
  // Re-enable transition before setting target coordinates so they animate
  wrapper.style.transition = '';
  
  // Set target zoomed layout position to trigger the CSS transition
  wrapper.style.left = `${targetLeft}px`;
  wrapper.style.top = `${targetTop}px`;
  wrapper.style.width = `${targetWidth}px`;
  wrapper.style.height = `${targetHeight}px`;
  
  if (state.focusFull) {
    wrapper.style.borderRadius = '0px';
  } else {
    // Proportional border radius for focused player card
    const scaledFocusRadius = (state.borderRadius / 300) * targetHeight;
    wrapper.style.borderRadius = `${scaledFocusRadius}px`;
  }
  
  wrapper.style.boxShadow = '0 30px 100px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(255, 255, 255, 0.15)';
}

function exitFocusMode() {
  if (!state.focusedPlayer) return;
  
  const player = state.focusedPlayer;
  const card = player.dom;
  const wrapper = player.videoWrapper;
  
  document.body.classList.remove('focus-active');
  card.classList.remove('focused');
  wrapper.classList.remove('focused');
  
  // Measure the current card slot in the grid (which is stable)
  const rect = card.getBoundingClientRect();
  
  // Transition back to the grid position and size
  wrapper.style.left = `${rect.left}px`;
  wrapper.style.top = `${rect.top}px`;
  wrapper.style.width = `${rect.width}px`;
  wrapper.style.height = `${rect.height}px`;
  wrapper.style.borderRadius = card.style.borderRadius;
  wrapper.style.boxShadow = '';
  
  // Smoothly fade down the volume when returning to the grid
  if (state.unmuteOnFocus) {
    fadeVideoVolume(player.video, 0.0, 500);
  }
  
  const currentFocusedPlayer = player;
  setTimeout(() => {
    // Only reset inline styles if this player remains unfocused
    if (state.focusedPlayer !== currentFocusedPlayer) {
      wrapper.style.position = '';
      wrapper.style.left = '';
      wrapper.style.top = '';
      wrapper.style.width = '';
      wrapper.style.height = '';
      wrapper.style.zIndex = '';
    }
  }, 450); // Matches the 0.45s CSS transition duration
  
  state.focusedPlayer = null;
}

/**
 * Responsive Grid Layout Resizer
 */
function resizeGrid() {
  const container = document.getElementById('players-grid');
  const count = state.playerCount;
  if (!container || count === 0) return;

  const gap = state.gridGutter;     
  const A = state.aspectFactor;

  // Enforce minimum outer padding equal to the gutter width
  const padding = gap * 2; 

  const width = window.innerWidth - padding;
  const height = window.innerHeight - padding;

  if (width <= 0 || height <= 0) return;

  // Update container's parent padding via CSS custom variable
  const mainContainer = container.parentElement;
  if (mainContainer) {
    mainContainer.style.setProperty('--container-padding', `${gap}px`);
  }

  let bestSize = 0;
  let bestCols = 1;
  let bestRows = 1;

  for (let cols = 1; cols <= count; cols++) {
    const rows = Math.ceil(count / cols);
    
    // Fit to width: cols * (A * H) + (cols - 1) * gap <= width
    const sizeW = (width - (cols - 1) * gap) / (cols * A);
    // Fit to height: rows * H + (rows - 1) * gap <= height
    const sizeH = (height - (rows - 1) * gap) / rows;

    const size = Math.min(sizeW, sizeH);
    if (size > bestSize) {
      bestSize = size;
      bestCols = cols;
      bestRows = rows;
    }
  }

  bestSize = Math.floor(bestSize);
  if (bestSize < 10) bestSize = 10;

  const cardWidth = Math.floor(bestSize * A);
  const cardHeight = bestSize;

  container.style.gap = `${gap}px`;
  container.style.gridTemplateColumns = `repeat(${bestCols}, ${cardWidth}px)`;
  container.style.gridTemplateRows = `repeat(${bestRows}, ${cardHeight}px)`;

  // Calculate scaled border radius (in px) relative to the 300px height baseline
  const scaledRadius = (state.borderRadius / 300) * cardHeight;

  const cards = container.querySelectorAll('.player-card');
  cards.forEach(card => {
    card.style.width = `${cardWidth}px`;
    card.style.height = `${cardHeight}px`;
    card.style.borderRadius = `${scaledRadius}px`;
    
    // Set border radius on the wrapper to clip the video correctly in the grid
    const wrapper = card.querySelector('.video-wrapper');
    if (wrapper && (!state.focusedPlayer || state.focusedPlayer.dom !== card)) {
      wrapper.style.borderRadius = `${scaledRadius}px`;
    }
  });

  // Re-calculate the focused player layout coordinates on resize
  if (state.focusedPlayer) {
    applyFocusLayout(state.focusedPlayer, true);
  }
}

/**
 * Parse Aspect Ratio from String (e.g. "16:9", "4:3", "11", "1:1")
 */
function parseAspectRatio(param) {
  if (!param) return;
  
  const cleanParam = param.trim();
  
  // Custom presets
  if (cleanParam === '11') {
    state.aspectFactor = 1.0;
    state.aspectCSS = '1 / 1';
  } else if (cleanParam === '43') {
    state.aspectFactor = 4 / 3;
    state.aspectCSS = '4 / 3';
  } else if (cleanParam === '169') {
    state.aspectFactor = 16 / 9;
    state.aspectCSS = '16 / 9';
  } else {
    const match = cleanParam.match(/^(\d+(?:\.\d+)?)(?:[:\/x\-]+(\d+(?:\.\d+)?))?$/);
    if (match) {
      const w = parseFloat(match[1]);
      const h = match[2] ? parseFloat(match[2]) : 1;
      if (w > 0 && h > 0) {
        state.aspectFactor = w / h;
        state.aspectCSS = `${w} / ${h}`;
      }
    }
  }
}

/**
 * Parse Focus Aspect Ratio from String
 */
function parseFocusAspectRatio(param) {
  if (!param) return;
  const cleanParam = param.trim();
  if (cleanParam === '11') {
    state.focusAspectFactor = 1.0;
  } else if (cleanParam === '43') {
    state.focusAspectFactor = 4 / 3;
  } else if (cleanParam === '169') {
    state.focusAspectFactor = 16 / 9;
  } else {
    const match = cleanParam.match(/^(\d+(?:\.\d+)?)(?:[:\/x\-]+(\d+(?:\.\d+)?))?$/);
    if (match) {
      const w = parseFloat(match[1]);
      const h = match[2] ? parseFloat(match[2]) : 1;
      if (w > 0 && h > 0) {
        state.focusAspectFactor = w / h;
      }
    }
  }
}

/**
 * Automatically reloads the page once a day at 3:00 AM local time
 * to wipe browser memory fragmentation and cache.
 */
function scheduleKioskReload() {
  const now = new Date();
  const reloadTime = new Date();
  reloadTime.setHours(3, 0, 0, 0); // 3:00 AM local

  // If past 3:00 AM, schedule for tomorrow
  if (now.getHours() >= 3) {
    reloadTime.setDate(reloadTime.getDate() + 1);
  }

  const timeoutMs = reloadTime.getTime() - now.getTime();
  console.log(`Kiosk auto-reload scheduled in ${(timeoutMs / 1000 / 60 / 60).toFixed(2)} hours.`);
  
  setTimeout(() => {
    // Avoid interrupting active user focus
    if (!state.focusedPlayer) {
      window.location.reload();
    } else {
      console.log('Kiosk reload deferred: User is active. Retrying in 1 hour.');
      setTimeout(() => window.location.reload(), 3600000);
    }
  }, timeoutMs);
}

/**
 * Init App
 */
document.addEventListener('DOMContentLoaded', async () => {
  // Parse query parameters
  const urlParams = new URLSearchParams(window.location.search);
  
  // 1. Videos Count (?videos=N)
  const videosParam = urlParams.get('videos');
  if (videosParam) {
    const parsed = parseInt(videosParam, 10);
    if (!isNaN(parsed) && parsed > 0) {
      state.playerCount = Math.min(32, parsed); // Cap at 32 players max
    }
  }

  // 2. Aspect Ratio (?aspect=16:9, ?aspect=43, ?aspect=11)
  const aspectParam = urlParams.get('aspect');
  parseAspectRatio(aspectParam);

  // 3. Gutter Size (?gutter=32, ?gutter=0)
  const gutterParam = urlParams.get('gutter');
  if (gutterParam !== null) {
    const parsed = parseInt(gutterParam, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      state.gridGutter = parsed;
    }
  }

  // 4. Border Radius / Corners (?corners=16)
  const cornersParam = urlParams.get('corners');
  if (cornersParam !== null) {
    const parsed = parseInt(cornersParam, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      state.borderRadius = parsed;
    }
  }

  // 5. Unmute on Focus (?unmuting=true)
  const unmutingParam = urlParams.get('unmuting');
  if (unmutingParam === 'true') {
    state.unmuteOnFocus = true;
  }

  // 6. Disable Focus (?disable-focus=true)
  const disableFocusParam = urlParams.get('disable-focus');
  if (disableFocusParam === 'true') {
    state.disableFocus = true;
    document.body.classList.add('disable-focus');
  }

  // 7. Focus Full Screen (?focus-full=true)
  const focusFullParam = urlParams.get('focus-full');
  if (focusFullParam === 'true') {
    state.focusFull = true;
  }

  // 8. Focus Aspect Ratio (?focus-aspect=16:9)
  const focusAspectParam = urlParams.get('focus-aspect');
  if (focusAspectParam) {
    parseFocusAspectRatio(focusAspectParam);
  }

  // 9. Cursor Style (?cursor=default, ?cursor=pointer, ?cursor=crosshair, ?cursor=zoom)
  const cursorParam = urlParams.get('cursor');
  if (cursorParam) {
    const cleanCursor = cursorParam.trim().toLowerCase();
    if (['default', 'pointer', 'crosshair', 'zoom'].includes(cleanCursor)) {
      state.cursorMode = cleanCursor;
    }
  }
  document.body.classList.add(`cursor-${state.cursorMode}`);

  // Attempt dynamic self-healing folder discovery
  const discovered = await discoverVideos();
  if (discovered) {
    state.globalPlaylist = discovered;
  }

  // Create Video Players
  const container = document.getElementById('players-grid');
  for (let i = 1; i <= state.playerCount; i++) {
    const player = new VideoPlayer(i, container);
    state.players.push(player);
  }

  // Create Dynamic Focus Backdrop
  const backdrop = document.createElement('div');
  backdrop.className = 'focus-backdrop';
  document.body.appendChild(backdrop);
  
  // Clicking backdrop restores grid
  backdrop.addEventListener('click', (e) => {
    e.stopPropagation();
    exitFocusMode();
  });

  // Clicking anywhere on body while focus is active restores grid
  document.body.addEventListener('click', () => {
    if (state.focusedPlayer) {
      exitFocusMode();
    }
  });

  // Exit focus when pressing Escape
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      exitFocusMode();
    }
  });


  // Use ResizeObserver instead of window resize events to catch late-initializing webviews (like macOS Screensavers)
  const resizeObserver = new ResizeObserver(() => {
    requestAnimationFrame(() => {
      resizeGrid();
    });
  });
  resizeObserver.observe(document.body);

  // Initial layout calculation
  resizeGrid();

  // Schedule daily kiosk reload at 3:00 AM
  scheduleKioskReload();
});
