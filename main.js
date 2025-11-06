// ============================================================
// 🟡 Coin Game UI Skeleton (Based on Visual Curiosity Experiment)
// ============================================================

// --- Konva.js imports (Vite style) ---
import Konva from 'konva';

// ============================================================
// 🧩 1. Session ID (keep) 
// Purpose:
// Gives every player session a unique ID (like a run number).
// ============================================================
function getOrCreateSessionId() {
  let id = sessionStorage.getItem('sessionId'); // Changed to sessionStorage (temporary)
  if (!id) {
    id = `run-${Date.now()}`;
    sessionStorage.setItem('sessionId', id);
  }
  return id;
}
const sessionId = getOrCreateSessionId();

// ============================================================
// 🎨 2. Stage and Layer Setup (Konva)
// ============================================================

// Create a stage that fills your module-main container
const stage = new Konva.Stage({
  container: 'module-main', // ✅ reuse your existing div
  width: window.innerWidth,
  height: window.innerHeight,
});

// Create a single layer to hold all visible elements (coins, etc.)
const layer = new Konva.Layer();
stage.add(layer);

// Optional: add a simple background color
const background = new Konva.Rect({
  x: 0,
  y: 0,
  width: stage.width(),
  height: stage.height(),
  fill: '#87CEEB', // same light blue you used before
});
layer.add(background);
layer.draw();


// ============================================================
// 🧱 3. Utilities
// ============================================================
// hashString(str)
// Creates a numeric hash from a string.
// Used later to generate deterministic coin positions.
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  return hash;
}

// ============================================================
// 🪙 5. Coin Setup
// ============================================================
// I define the variables:
// const coins = [];
// const totalCoins = 30;
// let score = 0;
// let timeLeft = 60;
// Henc I have 30 coins, each worth 10 points, and a 60-second countdown.
// Define all coin types and their properties

// 🔁 Round Control
let currentRound = 1;       // tracks which round the player is in
const totalRounds = 2;      // total number of rounds per session
let roundStartMs = 0;



// 🎨  Coin Mappings for each Round
// Round 1 mapping
const coinTypesRound1 = [
  { color: '#FFD700', edge: '#B8860B', value: 5 },   // yellow
  { color: '#FF69B4', edge: '#C71585', value: 7 },   // pink
  { color: '#32CD32', edge: '#228B22', value: 4 },   // green
  { color: '#FF4500', edge: '#8B0000', value: 10 }   // red
];

// Round 2 mapping (swapped values)
const coinTypesRound2 = [
  { color: '#FFD700', edge: '#B8860B', value: 10 },  // yellow
  { color: '#FF69B4', edge: '#C71585', value: 4 },   // pink
  { color: '#32CD32', edge: '#228B22', value: 7 },   // green
  { color: '#FF4500', edge: '#8B0000', value: 5 }    // red
];


const coins = []; // ✅ add this line
const totalCoins = 50;
let score = 0;
let timeLeft =15; // seconds
let roundActive = false; // prevents re-entry



function spawnCoin(coinId, position, coinType) {
  const { color, edge, value } = coinType;

  const coinGroup = new Konva.Group({
    x: position.x,
    y: position.y,
    id: coinId,
  });

  // Circle
  const circle = new Konva.Circle({
    radius: 30,
    fill: color,
    stroke: edge,
    strokeWidth: 3,
  });

  // Centered value text
  const text = new Konva.Text({
    text: value.toString(),
    fontSize: 24,
    fontStyle: 'bold',
    fill: edge,
  });
  text.offsetX(text.width() / 2);
  text.offsetY(text.height() / 2);

  coinGroup.add(circle);
  coinGroup.add(text);

  // ✅ Click interaction
  coinGroup.on('click', () => {
    if (!roundActive) return;
    console.log(`🪙 Clicked ${coinId} (${value} pts)`);

    score += value;
    updateHUD();

    sendCoinData(
      coinId,
      value,
      { x: coinGroup.x(), y: coinGroup.y() },
      color,
      currentRound,
      score  
    );


    // Remove coin
    coinGroup.destroy();

    if (layer.find('Group').length === 0) {
      console.log('🔚 All coins collected, ending round...');
      endRound();
    }
    layer.draw();
  });

  layer.add(coinGroup);
  coins.push(coinGroup);
}

// Deterministic 2D position based on sessionId + coinId
function getDeterministicPosition(coinId, rangeX = window.innerWidth, rangeY = window.innerHeight) {
  // Combine session + coin into one seed string
  const baseSeed = hashString(sessionId + coinId);

  // Helper: simple deterministic pseudo-random generator (Mulberry32)
  function mulberry32(seed) {
    return function() {
      let t = (seed += 0x6D2B79F5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Create two independent RNGs for x and y
  const randXGen = mulberry32(baseSeed);
  const randYGen = mulberry32(baseSeed ^ 0xDEADBEEF); // different seed for Y

  // Generate pseudo-random values in [0, 1)
  const randX = randXGen();
  const randY = randYGen();

  // Scale to the visible area with small margin
  const x = randX * (rangeX - 60);
  const y = randY * (rangeY - 60);

  return { x, y };
}





// spawn all coins
// Handles how all coins are generated:
// 1.looping through all IDs, 
// 2.determining positions, 
// 3.calling spawnCoin() repeatedly)	
// Called once at game start
function spawnAllCoins(coinTypes) {
  const coinsPerType = 50; // each color type
  coinTypes.forEach((type, typeIndex) => {
    for (let i = 0; i < coinsPerType; i++) {
      const coinId = `round${currentRound}_type${typeIndex}_coin_${i}`;
      const position = getDeterministicPosition(coinId);
      spawnCoin(coinId, position, type);
    }
  });
  layer.draw();
  console.log(`🪙 Spawned ${coinTypes.length * coinsPerType} coins total.`);
}



function spawnNextRound() {
  layer.removeChildren();
  layer.add(background);

  timeLeft =15;       // reset timer for a new round
  clearInterval(timerInterval);
  startTimer();
  roundStartMs = Date.now();
  sendRoundEvent('round_start', { timeLeft_at_start: timeLeft });

  const nextCoins = currentRound === 1 ? coinTypesRound1 : coinTypesRound2;
  spawnAllCoins(nextCoins);
  updateHUD();
  
  // ensure inputs allowed after break
  stage.listening(true);
  roundActive = true;
}





// ============================================================
// 🧮 5. Timer + HUD
// updateHUD()
// Updates on-screen text showing score and time left.
// The <div id="hud"> is created later in DOMContentLoaded.
// Example:
// 💰 Score: 40 | ⏱️ Time Left: 32s
// ============================================================
function updateHUD() {
  const hud = document.getElementById('hud');
  if (hud) {
    hud.textContent = `💰 Score: ${score} | ⏱️ Time Left: ${timeLeft}s | 🌀 Round: ${currentRound}/${totalRounds}`;
    hud.style.display = 'block'; // Make sure it's visible
  }
}

let timerInterval = null;

// startTimer()
// Starts a 1-second countdown:
// timeLeft-- every second,
// updates HUD,
// when timeLeft <= 0 → calls endGame().

function startTimer() {
  clearInterval(timerInterval); // avoid stacked intervals
  timerInterval = setInterval(() => {
    if (!roundActive) return;
    timeLeft--;
    updateHUD();
    if (timeLeft <= 0) {
     console.log('⏰ Time up, ending round...');
     endRound(); // will either spawn next round or end game
    }
  }, 1000);
}



// ============================================================
// 🖱️ 6. Click Interaction
// ============================================================


// collectCoin(coin) Need to add the coin collection functionality later:
// define click behavior for coins
// change the score each coin keeps

// ============================================================
// 🌐 7. Data Logging
// ============================================================
// sendCoinData(coinId, value, screenPos)
// Sends a JSON POST to your Flask backend:
// sessionId, coinId, value, screenPos, timestamp, timeLeft
// That’s how you’ll store participant behavior server-side (like in your record.csv).
// Log a coin click
async function sendCoinData(coinId, value, screenPos, color, round, scoreAfter) {
  try {
    await fetch('/api/coin_pickup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        round,
        coinId,
        coin_color: color,
        coin_value: value,
        points_gained: value,
        screenPos,
        timestamp: Date.now(),
        timeLeft,
        score_after_click: scoreAfter
      })
    });
  } catch (err) {
    console.warn('⚠️ Failed to log coin data:', err);
  }
}

// Mark round start/end (to compute totals)
async function sendRoundEvent(type, payload = {}) {
  try {
    await fetch('/api/round_event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        type,              // 'round_start' | 'round_end' | 'session_start' | 'session_end'
        round: currentRound,
        timestamp: Date.now(),
        ...payload
      })
    });
  } catch (err) {
    console.warn('⚠️ Failed to log round event:', err);
  }
}



// ============================================================
// 🎮 8. Game Flow (Partially keep, need to edit startgame and endgame later
// ============================================================
// startGame()
// The main entry point — runs when player presses “Start.”


function startGame() {
  console.log('🚀 Starting game...');
  score = 0;
  timeLeft = 15;
  currentRound = 1;
  roundStartMs = Date.now();
  sendRoundEvent('session_start');
  sendRoundEvent('round_start', { timeLeft_at_start: timeLeft });
  coins.length = 0;
  roundActive = true;
  layer.removeChildren();
  layer.add(background);
  
  spawnAllCoins(coinTypesRound1);  // Start with Round 1 mapping
  updateHUD();
  startTimer();
}

let breakInterval = null;

function showInterRoundBreak(seconds = 10) {
  const overlay = document.getElementById('break-overlay');
  if (!overlay) return;

  // freeze input during break
  roundActive = false;
  stage.listening(false);

  let remaining = seconds;
  overlay.innerHTML = `Round ${currentRound} finished.<br>Round ${currentRound + 1} starts in <b>${remaining}</b> seconds…`;
  overlay.style.display = 'block';

  // safety: clear any prior countdown
  if (breakInterval) clearInterval(breakInterval);

  breakInterval = setInterval(() => {
    remaining--;
    overlay.innerHTML = `Round ${currentRound} finished.<br>Round ${currentRound + 1} starts in <b>${remaining}</b> seconds…`;

    if (remaining <= 0) {
      clearInterval(breakInterval);
      breakInterval = null;
      overlay.style.display = 'none';

      // advance round and start next
      currentRound++;
      spawnNextRound();

      // re-enable input
      stage.listening(true);
      roundActive = true;
    }
  }, 1000);
}


async function endRound() {
  if (!roundActive) return;
  roundActive = false;

  clearInterval(timerInterval);
  const roundDurationMs = Date.now() - roundStartMs;
  const totalScoreAfterRound = score;
  await sendRoundEvent('round_end', {
    round_time_ms: roundDurationMs,
    total_score_after_round: totalScoreAfterRound,
    timeLeft_at_end: timeLeft
  });

  if (currentRound < totalRounds) {
    // Clean the canvas (no coins during break, keep bg)
    layer.removeChildren();
    layer.add(background);
    layer.draw();

    // Show the break overlay (10s)
    showInterRoundBreak(10);
  } else {
    endGame();
  }
}



// endGame()
// Purpose: Stop everything and show results.**
function endGame() {
  console.log('🎉 Game ended!');
  clearInterval(timerInterval);

  // Clear coins and show score
  layer.destroyChildren();
  layer.add(background);
  const gameOverText = new Konva.Text({
    x: stage.width() / 2 - 150,
    y: stage.height() / 2 - 30,
    text: `Game Over! Final Score: ${score}`,
    fontSize: 24,
    fill: '#000',
  });
  layer.add(gameOverText);
  layer.draw();
  sendRoundEvent('session_end', { final_score: score });
  alert(`Game Over! Final Score: ${score}`);
}



// ============================================================
// 🚀 9. Initialize
// ============================================================

// Initialization (DOMContentLoaded)
// Runs when the webpage finishes loading:
// Logs “Coin Game Loaded”
// Creates the <div id="hud"> overlay for score/time display.
// Hides it until startGame() runs.

window.addEventListener('DOMContentLoaded', () => {
  console.log('🎮 Coin Game Loaded');
  
  // Create HUD
  const hudDiv = document.createElement('div');
  hudDiv.id = 'hud';
  hudDiv.style.position = 'absolute';
  hudDiv.style.top = '10px';
  hudDiv.style.left = '10px';
  hudDiv.style.fontSize = '20px';
  hudDiv.style.color = '#000';
  hudDiv.style.background = 'rgba(255,255,255,0.7)';
  hudDiv.style.padding = '6px 10px';
  hudDiv.style.borderRadius = '8px';
  hudDiv.style.display = 'none';
  hudDiv.style.zIndex = '100';
  document.body.appendChild(hudDiv);

  // === Inter-round break overlay ===
  const breakDiv = document.createElement('div');
  breakDiv.id = 'break-overlay';
  breakDiv.style.position = 'fixed';
  breakDiv.style.inset = '0';
  breakDiv.style.display = 'none';
  breakDiv.style.background = 'rgba(0,0,0,0.75)';
  breakDiv.style.color = '#fff';
  breakDiv.style.fontSize = '28px';
  breakDiv.style.fontWeight = '600';
  breakDiv.style.textAlign = 'center';
  breakDiv.style.paddingTop = '35vh';
  breakDiv.style.zIndex = '1000';
  breakDiv.style.userSelect = 'none';
  breakDiv.style.lineHeight = '1.6';
  document.body.appendChild(breakDiv);

});

// Expose startGame to be called from index.html
window.startGame = startGame;

// Handle window resize:Ensures the 2D scene resizes properly with the window.
window.addEventListener('resize', () => {
  stage.width(window.innerWidth);
  stage.height(window.innerHeight);
  background.width(stage.width());
  background.height(stage.height());
  layer.draw();
});