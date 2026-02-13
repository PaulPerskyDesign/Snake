import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.162.0/build/three.module.js";

const canvas = document.getElementById("game");
const scoreEl = document.getElementById("score");
const highScoreEl = document.getElementById("high-score");
const statusEl = document.getElementById("status");
const startBtn = document.getElementById("start-btn");
const stopBtn = document.getElementById("stop-btn");
const restartBtn = document.getElementById("restart-btn");

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x0b0f1f, 20, 44);

const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 22, 0.01);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;

const boardSize = 16;
const cellSize = 1;
const halfBoard = boardSize / 2;
const speedMs = 160;

const grid = new THREE.GridHelper(boardSize, boardSize, 0x95c4ff, 0x29518f);
grid.position.y = 0.01;
scene.add(grid);

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(boardSize, boardSize),
  new THREE.MeshStandardMaterial({ color: 0x0f1936, roughness: 0.75, metalness: 0.15 })
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

scene.add(new THREE.HemisphereLight(0xbfe5ff, 0x203050, 0.7));
const dirLight = new THREE.DirectionalLight(0xf4fbff, 1.2);
dirLight.position.set(7, 13, 6);
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(1024, 1024);
scene.add(dirLight);

const snakeMaterial = new THREE.MeshStandardMaterial({ color: 0x57ffa0, roughness: 0.3, metalness: 0.25 });
const headMaterial = new THREE.MeshStandardMaterial({ color: 0x7dffec, roughness: 0.2, metalness: 0.35 });
const foodMaterial = new THREE.MeshStandardMaterial({ color: 0xff5f92, roughness: 0.25, metalness: 0.1, emissive: 0x2d0011 });

const snakeGroup = new THREE.Group();
scene.add(snakeGroup);

let snake = [
  { x: 0, z: 0 },
  { x: -1, z: 0 },
  { x: -2, z: 0 },
];
let direction = { x: 1, z: 0 };
let queuedDirection = { ...direction };
let food = spawnFood();
let score = 0;
let highScore = 0;
let gameOver = false;
let isRunning = false;
let tickAt = 0;

const foodMesh = new THREE.Mesh(new THREE.SphereGeometry(0.35, 24, 24), foodMaterial);
foodMesh.castShadow = true;
scene.add(foodMesh);

const glow = new THREE.PointLight(0xff5f92, 1.2, 6);
scene.add(glow);

function boardToWorld(x, z) {
  return new THREE.Vector3((x + 0.5) * cellSize - halfBoard, 0.5, (z + 0.5) * cellSize - halfBoard);
}

function spawnFood() {
  while (true) {
    const x = Math.floor(Math.random() * boardSize);
    const z = Math.floor(Math.random() * boardSize);
    if (!snake.some((s) => s.x === x && s.z === z)) return { x, z };
  }
}

function setStatus(text) {
  statusEl.textContent = text;
}

function refreshButtons() {
  startBtn.disabled = isRunning || gameOver;
  stopBtn.disabled = !isRunning;
}

function rebuildSnakeMeshes() {
  snakeGroup.clear();
  snake.forEach((segment, index) => {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.86, 0.86, 0.86),
      index === 0 ? headMaterial : snakeMaterial
    );
    mesh.position.copy(boardToWorld(segment.x, segment.z));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    snakeGroup.add(mesh);
  });
}

function resetGame() {
  snake = [
    { x: 0, z: 0 },
    { x: -1, z: 0 },
    { x: -2, z: 0 },
  ];
  direction = { x: 1, z: 0 };
  queuedDirection = { ...direction };
  food = spawnFood();
  score = 0;
  gameOver = false;
  isRunning = false;
  scoreEl.textContent = String(score);
  setStatus("Ready");
  rebuildSnakeMeshes();
  refreshButtons();
}

function startGame() {
  if (gameOver) return;
  isRunning = true;
  setStatus("Running");
  refreshButtons();
}

function stopGame() {
  isRunning = false;
  if (!gameOver) setStatus("Stopped");
  refreshButtons();
}

function onGameOver(message) {
  gameOver = true;
  isRunning = false;
  setStatus("Game Over");
  refreshButtons();
  setTimeout(() => alert(`${message} Score: ${score}. Press Restart or Enter to play again.`), 40);
}

function stepSnake() {
  if (gameOver || !isRunning) return;

  if (queuedDirection.x !== -direction.x || queuedDirection.z !== -direction.z) {
    direction = queuedDirection;
  }

  const next = { x: snake[0].x + direction.x, z: snake[0].z + direction.z };

  if (next.x < 0 || next.z < 0 || next.x >= boardSize || next.z >= boardSize) {
    onGameOver("Game over!");
    return;
  }

  const willGrow = next.x === food.x && next.z === food.z;
  const collisionSegments = willGrow ? snake : snake.slice(0, -1);
  if (collisionSegments.some((segment) => segment.x === next.x && segment.z === next.z)) {
    onGameOver("You crashed into yourself.");
    return;
  }

  snake.unshift(next);

  if (willGrow) {
    score += 1;
    scoreEl.textContent = String(score);
    if (score > highScore) {
      highScore = score;
      highScoreEl.textContent = String(highScore);
    }
    food = spawnFood();
  } else {
    snake.pop();
  }

  rebuildSnakeMeshes();
}

startBtn.addEventListener("click", startGame);
stopBtn.addEventListener("click", stopGame);
restartBtn.addEventListener("click", () => {
  resetGame();
  startGame();
});

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();

  if (key === "arrowup" || key === "w") queuedDirection = { x: 0, z: -1 };
  if (key === "arrowdown" || key === "s") queuedDirection = { x: 0, z: 1 };
  if (key === "arrowleft" || key === "a") queuedDirection = { x: -1, z: 0 };
  if (key === "arrowright" || key === "d") queuedDirection = { x: 1, z: 0 };

  if (key === " ") {
    if (isRunning) stopGame();
    else if (!gameOver) startGame();
  }

  if (key === "enter") {
    if (gameOver) {
      resetGame();
      startGame();
    } else if (!isRunning) {
      startGame();
    }
  }
});

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function animate(ms = 0) {
  requestAnimationFrame(animate);

  if (ms - tickAt > speedMs) {
    tickAt = ms;
    stepSnake();
  }

  const foodPos = boardToWorld(food.x, food.z);
  foodMesh.position.copy(foodPos);
  foodMesh.position.y = 0.5 + Math.sin(ms * 0.006) * 0.07;
  foodMesh.rotation.y += 0.03;
  glow.position.set(foodPos.x, 1.4, foodPos.z);

  renderer.render(scene, camera);
}

highScoreEl.textContent = String(highScore);
resetGame();
animate();
