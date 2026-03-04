import * as THREE from "https://unpkg.com/three@0.166.1/build/three.module.js";

const GRID_SIZE = 18;
const CELL_SIZE = 1;
const MOVE_INTERVAL = 180;

const canvas = document.getElementById("game");
const scoreEl = document.getElementById("score");
const statusEl = document.getElementById("status");

const scene = new THREE.Scene();
scene.background = new THREE.Color("#020617");
scene.fog = new THREE.Fog("#020617", 14, 40);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(10, 16, 14);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const hemiLight = new THREE.HemisphereLight("#93c5fd", "#0b1120", 1.2);
scene.add(hemiLight);

const dirLight = new THREE.DirectionalLight("#ffffff", 1.1);
dirLight.position.set(8, 14, 10);
scene.add(dirLight);

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(GRID_SIZE * CELL_SIZE, GRID_SIZE * CELL_SIZE),
  new THREE.MeshStandardMaterial({ color: "#0f172a", roughness: 0.9, metalness: 0.1 })
);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

const gridHelper = new THREE.GridHelper(GRID_SIZE, GRID_SIZE, "#334155", "#1e293b");
gridHelper.position.y = 0.01;
scene.add(gridHelper);

const wallMaterial = new THREE.MeshStandardMaterial({ color: "#1d4ed8", transparent: true, opacity: 0.2 });
const wallGeometry = new THREE.BoxGeometry(GRID_SIZE, 1, 0.15);
const topWall = new THREE.Mesh(wallGeometry, wallMaterial);
const bottomWall = new THREE.Mesh(wallGeometry, wallMaterial);
const sideWallGeometry = new THREE.BoxGeometry(0.15, 1, GRID_SIZE);
const leftWall = new THREE.Mesh(sideWallGeometry, wallMaterial);
const rightWall = new THREE.Mesh(sideWallGeometry, wallMaterial);

topWall.position.set(0, 0.5, -GRID_SIZE / 2);
bottomWall.position.set(0, 0.5, GRID_SIZE / 2);
leftWall.position.set(-GRID_SIZE / 2, 0.5, 0);
rightWall.position.set(GRID_SIZE / 2, 0.5, 0);
scene.add(topWall, bottomWall, leftWall, rightWall);

const snakeMaterial = new THREE.MeshStandardMaterial({ color: "#22c55e" });
const headMaterial = new THREE.MeshStandardMaterial({ color: "#4ade80" });
const foodMaterial = new THREE.MeshStandardMaterial({ color: "#f43f5e", emissive: "#be123c", emissiveIntensity: 0.5 });
const snakeSegmentGeometry = new THREE.BoxGeometry(0.9, 0.9, 0.9);
const foodGeometry = new THREE.IcosahedronGeometry(0.45, 1);

let snake = [];
let snakeMeshes = [];
let direction = new THREE.Vector2(1, 0);
let queuedDirection = direction.clone();
let food = new THREE.Vector2(0, 0);
let foodMesh = null;
let running = false;
let score = 0;
let accumulator = 0;

function randomGridPosition() {
  const half = GRID_SIZE / 2;
  return new THREE.Vector2(
    Math.floor(Math.random() * GRID_SIZE - half),
    Math.floor(Math.random() * GRID_SIZE - half)
  );
}

function placeFood() {
  do {
    food = randomGridPosition();
  } while (snake.some((part) => part.x === food.x && part.y === food.y));

  if (!foodMesh) {
    foodMesh = new THREE.Mesh(foodGeometry, foodMaterial);
    scene.add(foodMesh);
  }

  foodMesh.position.set(food.x + 0.5, 0.55, food.y + 0.5);
}

function resetSnakeMeshes() {
  snakeMeshes.forEach((mesh) => scene.remove(mesh));
  snakeMeshes = snake.map((_, index) => {
    const mesh = new THREE.Mesh(snakeSegmentGeometry, index === 0 ? headMaterial : snakeMaterial);
    scene.add(mesh);
    return mesh;
  });
}

function syncSnakeMeshes() {
  snake.forEach((part, index) => {
    if (!snakeMeshes[index]) {
      const mesh = new THREE.Mesh(snakeSegmentGeometry, snakeMaterial);
      scene.add(mesh);
      snakeMeshes.push(mesh);
    }

    snakeMeshes[index].material = index === 0 ? headMaterial : snakeMaterial;
    snakeMeshes[index].position.set(part.x + 0.5, 0.5, part.y + 0.5);
  });

  while (snakeMeshes.length > snake.length) {
    const mesh = snakeMeshes.pop();
    scene.remove(mesh);
  }
}

function setStatus(text) {
  statusEl.textContent = text;
}

function restart() {
  snake = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(-1, 0),
    new THREE.Vector2(-2, 0),
  ];
  direction = new THREE.Vector2(1, 0);
  queuedDirection = direction.clone();
  score = 0;
  scoreEl.textContent = String(score);
  resetSnakeMeshes();
  placeFood();
  running = true;
  accumulator = 0;
  setStatus("游戏进行中...");
}

function inBounds(pos) {
  const half = GRID_SIZE / 2;
  return pos.x >= -half && pos.x < half && pos.y >= -half && pos.y < half;
}

function stepGame() {
  direction.copy(queuedDirection);
  const head = snake[0].clone();
  const next = head.add(direction);

  if (!inBounds(next) || snake.some((part) => part.x === next.x && part.y === next.y)) {
    running = false;
    setStatus("游戏结束！按空格重新开始");
    return;
  }

  snake.unshift(next);

  if (next.x === food.x && next.y === food.y) {
    score += 10;
    scoreEl.textContent = String(score);
    placeFood();
  } else {
    snake.pop();
  }

  syncSnakeMeshes();
}

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();

  if (key === " ") {
    restart();
    return;
  }

  const map = {
    arrowup: new THREE.Vector2(0, -1),
    w: new THREE.Vector2(0, -1),
    arrowdown: new THREE.Vector2(0, 1),
    s: new THREE.Vector2(0, 1),
    arrowleft: new THREE.Vector2(-1, 0),
    a: new THREE.Vector2(-1, 0),
    arrowright: new THREE.Vector2(1, 0),
    d: new THREE.Vector2(1, 0),
  };

  const nextDir = map[key];
  if (!nextDir) {
    return;
  }

  if (nextDir.x === -direction.x && nextDir.y === -direction.y) {
    return;
  }

  queuedDirection = nextDir;
});

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();

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

  if (foodMesh) {
    foodMesh.rotation.y += 0.02;
    foodMesh.rotation.x += 0.01;
  }

  renderer.render(scene, camera);
}

restart();
animate();
