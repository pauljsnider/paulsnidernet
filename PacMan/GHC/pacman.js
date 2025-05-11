// Simple Pac-Man Game
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const tileSize = 16;
const map = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,1,1,1,1,1,1,1,1,1,0,1,1,1,0,1,1,1,1,1,1,1,1,1,1,0,1],
  [1,0,1,0,0,0,0,0,0,0,1,0,1,1,1,0,1,0,0,0,0,0,0,0,0,1,0,1],
  [1,0,1,0,1,1,1,1,1,0,1,0,1,1,1,0,1,0,1,1,1,1,1,1,0,1,0,1],
  [1,0,1,0,1,0,0,0,1,0,1,0,0,0,0,0,1,0,1,0,0,0,0,1,0,1,0,1],
  [1,0,1,0,1,0,1,0,1,0,1,1,1,1,1,1,1,0,1,0,1,0,1,1,0,1,0,1],
  [1,0,1,0,1,0,1,0,1,0,0,0,0,0,0,0,0,0,1,0,1,0,1,0,0,1,0,1],
  [1,0,1,0,1,0,1,0,1,1,1,1,1,1,1,1,1,1,1,0,1,0,1,0,1,1,0,1],
  [1,0,1,0,1,0,1,0,0,0,0,0,0,0,0,0,0,0,1,0,1,0,1,0,0,0,0,1],
  [1,0,1,0,1,0,1,1,1,1,1,1,1,1,1,1,1,0,1,0,1,0,1,1,1,1,0,1],
  [1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,1,0,1,0,0,0,0,0,0,1,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

const pacman = {
  x: 1,
  y: 1,
  dx: 0,
  dy: 0,
  radius: tileSize / 2 - 2
};

function drawMap() {
  for (let y = 0; y < map.length; y++) {
    for (let x = 0; x < map[y].length; x++) {
      if (map[y][x] === 1) {
        ctx.fillStyle = '#00F';
        ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
      } else {
        ctx.fillStyle = '#111';
        ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
        ctx.fillStyle = '#FF0';
        ctx.beginPath();
        ctx.arc(x * tileSize + tileSize/2, y * tileSize + tileSize/2, 2, 0, 2 * Math.PI);
        ctx.fill();
      }
    }
  }
}

function drawPacman() {
  ctx.fillStyle = 'yellow';
  ctx.beginPath();
  ctx.arc(
    pacman.x * tileSize + tileSize/2,
    pacman.y * tileSize + tileSize/2,
    pacman.radius,
    0.25 * Math.PI,
    1.75 * Math.PI,
    false
  );
  ctx.lineTo(pacman.x * tileSize + tileSize/2, pacman.y * tileSize + tileSize/2);
  ctx.fill();
}

function movePacman() {
  const newX = pacman.x + pacman.dx;
  const newY = pacman.y + pacman.dy;
  if (map[newY] && map[newY][newX] === 0) {
    pacman.x = newX;
    pacman.y = newY;
  }
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowUp')    { pacman.dx = 0; pacman.dy = -1; }
  if (e.key === 'ArrowDown')  { pacman.dx = 0; pacman.dy = 1; }
  if (e.key === 'ArrowLeft')  { pacman.dx = -1; pacman.dy = 0; }
  if (e.key === 'ArrowRight') { pacman.dx = 1; pacman.dy = 0; }
});

function gameLoop() {
  movePacman();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawMap();
  drawPacman();
  requestAnimationFrame(gameLoop);
}

gameLoop();
