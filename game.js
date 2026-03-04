(() => {
  function diag(msg) {
    const el = document.getElementById('diag');
    if (el) el.textContent += msg + "\n";
    console.log('[DIAG]', msg);
  }

  diag('boot start');
  diag('location=' + location.href);
  diag('THREE=' + (!!window.THREE));
  diag('OrbitControls=' + (!!(window.THREE && window.THREE.OrbitControls)));
  diag('game.js loaded once guard=' + (!!window.__SNAKE_GAME_BOOTED__));

  if (window.__SNAKE_GAME_BOOTED__) {
    console.warn('Snake already booted, skip duplicate load');
    const statusEl = document.getElementById('status');
    if (statusEl) {
      statusEl.textContent = '检测到重复加载 game.js：已忽略后续脚本执行';
    }
    diag('duplicate boot detected, skip execution');
    return;
  }
  window.__SNAKE_GAME_BOOTED__ = true;

  if (!window.THREE) {
    diag('ERROR: THREE not loaded. Check vendor/three.min.js path + Pages deployment.');
    const status = document.getElementById('status');
    if (status) status.textContent = '❌ THREE 未加载：请检查 vendor/three.min.js 路径与 Pages 部署/缓存';
    throw new Error('THREE not loaded');
  }

  const GRID_SIZE = 18;
  const MOVE_INTERVAL = 170;
  const SCORE_PER_FOOD = 10;
  const LEADERBOARD_KEY = 'snake3d-leaderboard';

  const scoreEl = document.getElementById('score');
  const bestScoreEl = document.getElementById('best-score');
  const finalScoreEl = document.getElementById('final-score');
  const finalRankEl = document.getElementById('final-rank');
  const statusEl = document.getElementById('status');
  const gameOverEl = document.getElementById('game-over');
  const restartBtn = document.getElementById('restart-btn');
  const touchControls = document.querySelector('.touch-controls');
  const leaderboardListEl = document.getElementById('leaderboard-list');
  const musicToggle = document.getElementById('music-toggle');

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#020617');
  scene.fog = new THREE.Fog('#020617', 14, 40);

  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(10, 16, 14);

  const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('game'), antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;

  let controls = null;
  if (!(window.THREE && window.THREE.OrbitControls)) {
    diag('WARN: OrbitControls not loaded. Disable orbit controls.');
    if (statusEl) {
      statusEl.textContent = '⚠️ OrbitControls 未加载：已禁用鼠标旋转视角';
    }
  } else {
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.minDistance = 10;
    controls.maxDistance = 34;
    controls.maxPolarAngle = Math.PI / 2.05;
  }

  scene.add(new THREE.AmbientLight('#93c5fd', 0.35));
  scene.add(new THREE.HemisphereLight('#93c5fd', '#0b1120', 0.9));
  const dirLight = new THREE.DirectionalLight('#ffffff', 1.1);
  dirLight.position.set(8, 14, 10);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.set(2048, 2048);
  scene.add(dirLight);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(GRID_SIZE, GRID_SIZE),
    new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.95 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor, new THREE.GridHelper(GRID_SIZE, GRID_SIZE, '#334155', '#1e293b'));

  const wallMat = new THREE.MeshStandardMaterial({ color: '#1d4ed8', transparent: true, opacity: 0.22 });
  const walls = [
    new THREE.Mesh(new THREE.BoxGeometry(GRID_SIZE, 1, 0.15), wallMat),
    new THREE.Mesh(new THREE.BoxGeometry(GRID_SIZE, 1, 0.15), wallMat),
    new THREE.Mesh(new THREE.BoxGeometry(0.15, 1, GRID_SIZE), wallMat),
    new THREE.Mesh(new THREE.BoxGeometry(0.15, 1, GRID_SIZE), wallMat),
  ];
  walls[0].position.set(0, 0.5, -GRID_SIZE / 2);
  walls[1].position.set(0, 0.5, GRID_SIZE / 2);
  walls[2].position.set(-GRID_SIZE / 2, 0.5, 0);
  walls[3].position.set(GRID_SIZE / 2, 0.5, 0);
  scene.add(...walls);

  const snakeMaterial = new THREE.MeshStandardMaterial({ color: '#22c55e' });
  const headMaterial = new THREE.MeshStandardMaterial({ color: '#4ade80' });
  const foodMaterial = new THREE.MeshStandardMaterial({ color: '#fb7185', emissive: '#e11d48', emissiveIntensity: 1.3 });

  let snake = [];
  let snakeMeshes = [];
  let direction = new THREE.Vector2(1, 0);
  let queuedDirection = direction.clone();
  let food = new THREE.Vector2(0, 0);
  let foodMesh;
  let foodLight;
  let running = false;
  let score = 0;
  let accumulator = 0;
  let leaderboard = [];
  let storageBlocked = false;

  function loadLeaderboard() {
    try {
      const raw = localStorage.getItem(LEADERBOARD_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      leaderboard = Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      storageBlocked = true;
      diag('storage blocked: ' + (error && error.message ? error.message : error));
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
    leaderboard.push({ score, time: new Date().toLocaleDateString() });
    leaderboard.sort((a, b) => b.score - a.score);
    leaderboard = leaderboard.slice(0, 20);
    try {
      localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(leaderboard));
    } catch (error) {
      storageBlocked = true;
      diag('storage blocked: ' + (error && error.message ? error.message : error));
    }
    renderLeaderboard();
    if (storageBlocked) {
      finalRankEl.textContent = '未保存（存储受限）';
      return;
    }
    const rank = leaderboard.findIndex((i) => i.score === score) + 1;
    finalRankEl.textContent = rank > 0 ? `第 ${rank} 名` : '未上榜';
  }

  function randomGridPosition() {
    const half = GRID_SIZE / 2;
    return new THREE.Vector2(Math.floor(Math.random() * GRID_SIZE - half), Math.floor(Math.random() * GRID_SIZE - half));
  }

  function placeFood() {
    do {
      food = randomGridPosition();
    } while (snake.some((part) => part.x === food.x && part.y === food.y));
    if (!foodMesh) {
      foodMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45, 1), foodMaterial);
      foodMesh.castShadow = true;
      foodLight = new THREE.PointLight('#fb7185', 2.2, 6, 2);
      scene.add(foodMesh, foodLight);
    }
    foodMesh.position.set(food.x + 0.5, 0.65, food.y + 0.5);
    foodLight.position.set(food.x + 0.5, 1.2, food.y + 0.5);
  }

  function rebuildSnake() {
    snakeMeshes.forEach((m) => scene.remove(m));
    snakeMeshes = snake.map((_, index) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), index === 0 ? headMaterial : snakeMaterial);
      m.castShadow = true;
      scene.add(m);
      return m;
    });
  }

  function syncSnake() {
    snake.forEach((part, i) => {
      if (!snakeMeshes[i]) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), snakeMaterial);
        m.castShadow = true;
        scene.add(m);
        snakeMeshes.push(m);
      }
      snakeMeshes[i].material = i === 0 ? headMaterial : snakeMaterial;
      snakeMeshes[i].position.set(part.x + 0.5, 0.5, part.y + 0.5);
    });
    while (snakeMeshes.length > snake.length) {
      scene.remove(snakeMeshes.pop());
    }
  }

  function restart() {
    snake = [new THREE.Vector2(0, 0), new THREE.Vector2(-1, 0), new THREE.Vector2(-2, 0)];
    direction = new THREE.Vector2(1, 0);
    queuedDirection = direction.clone();
    score = 0;
    scoreEl.textContent = '0';
    rebuildSnake();
    placeFood();
    running = true;
    accumulator = 0;
    if (!(window.THREE && window.THREE.OrbitControls)) {
      statusEl.textContent = '⚠️ OrbitControls 未加载：已禁用鼠标旋转视角';
    } else {
      statusEl.textContent = '游戏进行中...';
    }
    gameOverEl.classList.add('hidden');
  }

  function endGame() {
    running = false;
    finalScoreEl.textContent = String(score);
    saveScore();
    statusEl.textContent = '游戏结束！按空格或点击按钮重新开始';
    gameOverEl.classList.remove('hidden');
  }

  function inBounds(pos) {
    const half = GRID_SIZE / 2;
    return pos.x >= -half && pos.x < half && pos.y >= -half && pos.y < half;
  }

  function stepGame() {
    direction.copy(queuedDirection);
    const next = snake[0].clone().add(direction);
    if (!inBounds(next) || snake.some((p) => p.x === next.x && p.y === next.y)) {
      endGame();
      return;
    }
    snake.unshift(next);
    if (next.x === food.x && next.y === food.y) {
      score += SCORE_PER_FOOD;
      scoreEl.textContent = String(score);
      placeFood();
    } else {
      snake.pop();
    }
    syncSnake();
  }

  const directionMap = {
    up: new THREE.Vector2(0, -1), down: new THREE.Vector2(0, 1), left: new THREE.Vector2(-1, 0), right: new THREE.Vector2(1, 0),
    arrowup: new THREE.Vector2(0, -1), w: new THREE.Vector2(0, -1), arrowdown: new THREE.Vector2(0, 1), s: new THREE.Vector2(0, 1),
    arrowleft: new THREE.Vector2(-1, 0), a: new THREE.Vector2(-1, 0), arrowright: new THREE.Vector2(1, 0), d: new THREE.Vector2(1, 0),
  };

  function queueDirection(nextDir) {
    if (!nextDir || (nextDir.x === -direction.x && nextDir.y === -direction.y)) return;
    queuedDirection = nextDir;
  }

  window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    if (key === ' ') return restart();
    queueDirection(directionMap[key]);
  });

  touchControls.addEventListener('pointerdown', (event) => {
    const button = event.target.closest('button[data-dir]');
    if (!button) return;
    event.preventDefault();
    queueDirection(directionMap[button.dataset.dir]);
  });

  restartBtn.addEventListener('click', restart);
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  let musicEnabled = true;
  let audioCtx;
  let gain;
  let oscA;
  let oscB;

  function ensureMusic() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    gain = audioCtx.createGain();
    gain.gain.value = 0.03;
    oscA = audioCtx.createOscillator();
    oscB = audioCtx.createOscillator();
    oscA.type = 'triangle';
    oscB.type = 'sine';
    oscA.frequency.value = 220;
    oscB.frequency.value = 329.63;
    oscA.connect(gain);
    oscB.connect(gain);
    gain.connect(audioCtx.destination);
    oscA.start();
    oscB.start();
  }

  function toggleMusic() {
    musicEnabled = !musicEnabled;
    musicToggle.textContent = `🎵 背景音乐：${musicEnabled ? '开' : '关'}`;
    if (!audioCtx) return;
    gain.gain.setTargetAtTime(musicEnabled ? 0.03 : 0, audioCtx.currentTime, 0.03);
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

  const clock = new THREE.Clock();
  loadLeaderboard();
  renderLeaderboard();
  restart();

  function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta() * 1000;
    if (running) {
      accumulator += delta;
      while (accumulator >= MOVE_INTERVAL) {
        stepGame();
        accumulator -= MOVE_INTERVAL;
      }
    }

    if (foodMesh && foodLight) {
      const t = performance.now() * 0.003;
      foodMesh.rotation.y += 0.03;
      foodMesh.rotation.x += 0.015;
      foodMaterial.emissiveIntensity = 1.2 + Math.sin(t) * 0.5;
      foodLight.intensity = 2.2 + Math.sin(t * 1.4) * 0.7;
    }

    if (audioCtx && musicEnabled) {
      const t = performance.now() * 0.001;
      oscA.frequency.value = 220 + Math.sin(t) * 16;
      oscB.frequency.value = 329.63 + Math.sin(t * 1.7) * 20;
    }

    if (controls) {
      controls.update();
    }
    renderer.render(scene, camera);
  }

  animate();
})();
