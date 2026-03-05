(() => {
  const GRID_SIZE = 24;
  const SCORE_PER_FOOD = 10;
  const BASE_MOVE_INTERVAL = 150;
  const MIN_MOVE_INTERVAL = 60;
  const SPEED_UP_EVERY_FOOD = 5;
  const SPEED_STEP = 10;
  const LEADERBOARD_KEY = 'snake3d-leaderboard';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  const scoreEl = document.getElementById('score');
  const bestScoreEl = document.getElementById('best-score');
  const finalScoreEl = document.getElementById('final-score');
  const statusEl = document.getElementById('status');
  const gameOverEl = document.getElementById('game-over');
  const restartBtn = document.getElementById('restart-btn');
  const startBtn = document.getElementById('start-btn');
  const pauseBtn = document.getElementById('pause-btn');
  const touchControls = document.querySelector('.touch-controls');
  const leaderboardListEl = document.getElementById('leaderboard-list');
  const musicToggle = document.getElementById('music-toggle');

  const cellSize = Math.floor(canvas.width / GRID_SIZE);

  let snake = [];
  let direction = { x: 1, y: 0 };
  let queuedDirection = { x: 1, y: 0 };
  let food = { x: 6, y: 6 };
  let running = false;
  let started = false;
  let score = 0;
  let foodsEaten = 0;
  let moveInterval = BASE_MOVE_INTERVAL;
  let accumulator = 0;
  let lastTs = performance.now();

  let leaderboard = [];
  let storageBlocked = false;

  let musicEnabled = true;
  let audioCtx;
  let gain;
  let oscA;
  let oscB;

  function loadLeaderboard() {
    try {
      const raw = localStorage.getItem(LEADERBOARD_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      leaderboard = Array.isArray(parsed) ? parsed : [];
    } catch {
      storageBlocked = true;
      leaderboard = [];
    }
  }

  function renderLeaderboard() {
    leaderboardListEl.innerHTML = '';
    if (storageBlocked) {
      leaderboardListEl.innerHTML = '<li>隐私模式/拦截导致无法保存</li>';
      bestScoreEl.textContent = '0';
      return;
    }
    const top = leaderboard.slice(0, 5);
    if (!top.length) {
      leaderboardListEl.innerHTML = '<li>暂无记录</li>';
      bestScoreEl.textContent = '0';
      return;
    }
    top.forEach((item, i) => {
      const li = document.createElement('li');
      li.textContent = `#${i + 1} - ${item.score} 分 (${item.time})`;
      leaderboardListEl.appendChild(li);
    });
    bestScoreEl.textContent = String(top[0].score);
  }

  function saveScore() {
    if (storageBlocked) return;
    leaderboard.push({ score, time: new Date().toLocaleDateString() });
    leaderboard.sort((a, b) => b.score - a.score);
    leaderboard = leaderboard.slice(0, 20);
    try {
      localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(leaderboard));
    } catch {
      storageBlocked = true;
    }
    renderLeaderboard();
  }

  function randomGridPosition() {
    return {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
  }

  function placeFood() {
    const total = GRID_SIZE * GRID_SIZE;
    if (snake.length >= total) {
      winGame();
      return false;
    }

    let attempts = 0;
    do {
      food = randomGridPosition();
      attempts += 1;
    } while (snake.some((p) => p.x === food.x && p.y === food.y) && attempts < total);

    if (snake.some((p) => p.x === food.x && p.y === food.y)) {
      for (let x = 0; x < GRID_SIZE; x += 1) {
        for (let y = 0; y < GRID_SIZE; y += 1) {
          if (!snake.some((p) => p.x === x && p.y === y)) {
            food = { x, y };
            return true;
          }
        }
      }
      winGame();
      return false;
    }

    return true;
  }

  function setDirection(newDir) {
    if (!newDir) return;
    if (snake.length > 1) {
      const opposite = newDir.x === -direction.x && newDir.y === -direction.y;
      if (opposite) return;
    }
    queuedDirection = { x: newDir.x, y: newDir.y };
  }

  function endGame() {
    if (!started) return;
    running = false;
    started = false;
    statusEl.textContent = 'Game Over';
    finalScoreEl.textContent = String(score);
    saveScore();
    gameOverEl.classList.remove('hidden');
  }

  function winGame() {
    if (!started) return;
    running = false;
    started = false;
    statusEl.textContent = '🎉 You Win!';
    finalScoreEl.textContent = String(score);
    saveScore();
    gameOverEl.classList.remove('hidden');
  }

  function inBounds(pos) {
    return pos.x >= 0 && pos.x < GRID_SIZE && pos.y >= 0 && pos.y < GRID_SIZE;
  }

  function stepGame() {
    if (!running) return;

    direction = { x: queuedDirection.x, y: queuedDirection.y };
    const next = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };

    let body = snake;
    if (!(next.x === food.x && next.y === food.y)) {
      body = snake.slice(0, snake.length - 1);
    }

    if (!inBounds(next) || body.some((p) => p.x === next.x && p.y === next.y)) {
      endGame();
      return;
    }

    snake.unshift(next);

    if (next.x === food.x && next.y === food.y) {
      score += SCORE_PER_FOOD;
      foodsEaten += 1;
      scoreEl.textContent = String(score);
      if (foodsEaten % SPEED_UP_EVERY_FOOD === 0) {
        moveInterval = Math.max(MIN_MOVE_INTERVAL, moveInterval - SPEED_STEP);
      }
      placeFood();
    } else {
      snake.pop();
    }
  }

  function draw() {
    ctx.fillStyle = '#0b1020';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_SIZE; i += 1) {
      const p = i * cellSize;
      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, GRID_SIZE * cellSize);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, p);
      ctx.lineTo(GRID_SIZE * cellSize, p);
      ctx.stroke();
    }

    const cx = food.x * cellSize + cellSize / 2;
    const cy = food.y * cellSize + cellSize / 2;
    ctx.fillStyle = '#ff4d4f';
    ctx.beginPath();
    ctx.arc(cx, cy, cellSize * 0.32, 0, Math.PI * 2);
    ctx.fill();

    snake.forEach((part, i) => {
      const x = part.x * cellSize + 1;
      const y = part.y * cellSize + 1;
      ctx.fillStyle = i === 0 ? '#6cf2a1' : '#2ecc71';
      ctx.fillRect(x, y, cellSize - 2, cellSize - 2);
    });

    const head = snake[0];
    if (head) {
      const hx = head.x * cellSize;
      const hy = head.y * cellSize;
      ctx.fillStyle = '#0b1020';
      const eye = Math.max(2, Math.floor(cellSize * 0.12));
      const ox = Math.floor(cellSize * 0.26);
      const oy = Math.floor(cellSize * 0.28);
      ctx.fillRect(hx + ox, hy + oy, eye, eye);
      ctx.fillRect(hx + cellSize - ox - eye, hy + oy, eye, eye);
    }
  }

  function restart() {
    snake = [
      { x: 4, y: 12 },
      { x: 3, y: 12 },
      { x: 2, y: 12 },
    ];
    direction = { x: 1, y: 0 };
    queuedDirection = { x: 1, y: 0 };
    score = 0;
    foodsEaten = 0;
    moveInterval = BASE_MOVE_INTERVAL;
    scoreEl.textContent = '0';
    started = true;
    running = true;
    placeFood();
    statusEl.textContent = 'Running';
    gameOverEl.classList.add('hidden');
    lastTs = performance.now();
    accumulator = 0;
  }

  function startGame() {
    if (started && running) return;
    if (!started) {
      restart();
      return;
    }
    running = true;
    statusEl.textContent = 'Running';
  }

  function pauseGame() {
    if (!started) return;
    running = false;
    statusEl.textContent = 'Paused';
  }

  function animate(ts) {
    const delta = ts - lastTs;
    lastTs = ts;

    if (running) {
      accumulator += delta;
      while (accumulator >= moveInterval) {
        stepGame();
        accumulator -= moveInterval;
      }
    }

    draw();
    requestAnimationFrame(animate);
  }

  function ensureMusic() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    gain = audioCtx.createGain();
    gain.gain.value = 0.03;
    oscA = audioCtx.createOscillator();
    oscB = audioCtx.createOscillator();
    oscA.type = 'triangle';
    oscB.type = 'sine';
    oscA.frequency.value = 196;
    oscB.frequency.value = 293.66;
    oscA.connect(gain);
    oscB.connect(gain);
    gain.connect(audioCtx.destination);
    oscA.start();
    oscB.start();
  }

  function toggleMusic() {
    musicEnabled = !musicEnabled;
    musicToggle.textContent = `🎵 背景音乐：${musicEnabled ? '开' : '关'}`;
    if (audioCtx) {
      gain.gain.setTargetAtTime(musicEnabled ? 0.03 : 0, audioCtx.currentTime, 0.03);
    }
  }

  musicToggle.addEventListener('click', async () => {
    ensureMusic();
    if (audioCtx.state === 'suspended') await audioCtx.resume();
    toggleMusic();
  });

  window.addEventListener('pointerdown', async () => {
    ensureMusic();
    if (audioCtx.state === 'suspended') await audioCtx.resume();
  }, { once: true });

  const directionMap = {
    arrowup: { x: 0, y: -1 },
    w: { x: 0, y: -1 },
    arrowdown: { x: 0, y: 1 },
    s: { x: 0, y: 1 },
    arrowleft: { x: -1, y: 0 },
    a: { x: -1, y: 0 },
    arrowright: { x: 1, y: 0 },
    d: { x: 1, y: 0 },
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
  };

  window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    if (key === ' ') {
      restart();
      return;
    }
    setDirection(directionMap[key]);
  });

  touchControls.addEventListener('pointerdown', (event) => {
    const button = event.target.closest('button[data-dir]');
    if (!button) return;
    event.preventDefault();
    setDirection(directionMap[button.dataset.dir]);
  });

  startBtn.addEventListener('click', startGame);
  pauseBtn.addEventListener('click', pauseGame);
  restartBtn.addEventListener('click', restart);

  loadLeaderboard();
  renderLeaderboard();
  draw();
  requestAnimationFrame(animate);
})();
