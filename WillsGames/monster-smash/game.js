(() => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('scoreValue');
  const smashEl = document.getElementById('smashValue');
  const statusPanel = document.getElementById('statusPanel');
  const statusTitle = document.getElementById('statusTitle');
  const restartButton = document.getElementById('restartButton');

  const inputs = {
    up: false,
    down: false,
    left: false,
    right: false
  };

  const arena = {
    padding: 60,
    width: canvas.width,
    height: canvas.height
  };

  const truck = {
    x: canvas.width / 2,
    y: canvas.height / 2 + 80,
    angle: -Math.PI / 2,
    radius: 38,
    drift: 0
  };

  const junkers = [];

  const gameState = {
    playing: false,
    score: 0,
    smashes: 0,
    lastTimestamp: 0,
    message: 'Ready!'
  };

  function spawnJunkers(count = 5) {
    junkers.length = 0;
    for (let i = 0; i < count; i += 1) {
      junkers.push(createJunker());
    }
  }

  function createJunker() {
    const margin = arena.padding + 40;
    return {
      x: randomRange(margin, arena.width - margin),
      y: randomRange(margin, arena.height - margin),
      radius: randomRange(26, 34),
      color: randomJunkerColor(),
      wobble: Math.random() * Math.PI * 2
    };
  }

  function randomJunkerColor() {
    const palette = ['#ff922b', '#d00000', '#4cc9f0', '#b3e55d', '#ffd166'];
    return palette[Math.floor(Math.random() * palette.length)];
  }

  function randomRange(min, max) {
    return Math.random() * (max - min) + min;
  }

  function resetTruck() {
    truck.x = canvas.width / 2;
    truck.y = canvas.height / 2 + 80;
    truck.angle = -Math.PI / 2;
    truck.drift = 0;
  }

  function startShow() {
    resetTruck();
    spawnJunkers();
    gameState.playing = true;
    gameState.score = 0;
    gameState.smashes = 0;
    gameState.lastTimestamp = 0;
    gameState.message = 'Showtime!';
    hideStatus();
    updateUI();
    requestAnimationFrame(gameLoop);
  }

  function updateUI() {
    scoreEl.textContent = gameState.score.toString();
    smashEl.textContent = gameState.smashes.toString();
  }

  function gameLoop(timestamp) {
    if (!gameState.playing) {
      drawScene(0);
      return;
    }

    if (!gameState.lastTimestamp) {
      gameState.lastTimestamp = timestamp;
    }

    const delta = Math.min(32, timestamp - gameState.lastTimestamp);
    gameState.lastTimestamp = timestamp;

    update(delta);
    drawScene(delta);

    if (gameState.playing) {
      requestAnimationFrame(gameLoop);
    }
  }

  function update(delta) {
    handleTruckPhysics(delta);
    checkCollisions();
    updateUI();
  }

  function handleTruckPhysics(delta) {
    const moveSpeed = 0.3;
    let dirX = 0;
    let dirY = 0;

    if (inputs.left) dirX -= 1;
    if (inputs.right) dirX += 1;
    if (inputs.up) dirY -= 1;
    if (inputs.down) dirY += 1;

    if (dirX !== 0 || dirY !== 0) {
      const length = Math.hypot(dirX, dirY);
      const normX = dirX / length;
      const normY = dirY / length;
      const distance = moveSpeed * delta;
      truck.x += normX * distance;
      truck.y += normY * distance;
      truck.angle = Math.atan2(normY, normX);
      truck.drift = lerp(truck.drift, normX * 0.5, 0.2);
    } else {
      truck.drift = lerp(truck.drift, 0, 0.12);
    }

    containTruck();
  }

  function checkCollisions() {
    junkers.forEach((junker, idx) => {
      const dx = truck.x - junker.x;
      const dy = truck.y - junker.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < truck.radius + junker.radius) {
        smashJunker(idx);
      }
    });
  }

  function smashJunker(index) {
    const basePoints = 120;
    gameState.smashes += 1;
    gameState.score += basePoints;
    junkers[index] = createJunker();
  }

  function containTruck() {
    const minX = arena.padding;
    const maxX = arena.width - arena.padding;
    const minY = arena.padding;
    const maxY = arena.height - arena.padding;

    if (truck.x < minX) {
      truck.x = minX;
    }
    if (truck.x > maxX) {
      truck.x = maxX;
    }
    if (truck.y < minY) {
      truck.y = minY;
    }
    if (truck.y > maxY) {
      truck.y = maxY;
    }
  }

  function drawScene(delta) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawArena();
    drawJunkers(delta);
    drawTruck();
    if (!gameState.playing) {
      drawBanner(gameState.message);
    }
  }

  function drawArena() {
    ctx.save();
    ctx.fillStyle = '#10141a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
    ctx.lineWidth = 10;
    ctx.strokeRect(
      arena.padding,
      arena.padding,
      arena.width - arena.padding * 2,
      arena.height - arena.padding * 2
    );

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 2;
    for (let i = arena.padding + 30; i < arena.height - arena.padding; i += 36) {
      ctx.beginPath();
      ctx.moveTo(arena.padding, i);
      ctx.lineTo(arena.width - arena.padding, i);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawJunkers(delta) {
    junkers.forEach((junker) => {
      junker.wobble += delta * 0.0025;
      const wobbleOffset = Math.sin(junker.wobble) * 4;
      ctx.save();
      ctx.translate(junker.x, junker.y + wobbleOffset);
      ctx.fillStyle = junker.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, junker.radius * 1.2, junker.radius * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(0, junker.radius * 0.6, junker.radius, junker.radius * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    });
  }

  function drawTruck() {
    ctx.save();
    ctx.translate(truck.x, truck.y);
    ctx.rotate(truck.angle);

    ctx.fillStyle = '#f72585';
    ctx.fillRect(-24, -40, 48, 70);

    ctx.fillStyle = '#480ca8';
    ctx.fillRect(-22, -34, 44, 28);

    ctx.fillStyle = '#000';
    drawWheel(-22, -28, truck.drift);
    drawWheel(22, -28, -truck.drift);
    drawWheel(-22, 28, truck.drift * 0.6);
    drawWheel(22, 28, -truck.drift * 0.6);

    ctx.fillStyle = '#fefae0';
    ctx.fillRect(-18, -32, 36, 18);

    ctx.restore();
  }

  function drawWheel(x, y, rotation) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.beginPath();
    ctx.fillRect(-8, -12, 16, 24);
    ctx.fillStyle = '#111';
    ctx.fillRect(-10, -14, 20, 28);
    ctx.restore();
  }

  function drawBanner(text) {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(120, canvas.height / 2 - 50, canvas.width - 240, 100);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 4;
    ctx.strokeRect(120, canvas.height / 2 - 50, canvas.width - 240, 100);

    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 32px "Bungee", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    ctx.restore();
  }

  function showStatus(message) {
    statusTitle.textContent = message;
    statusPanel.classList.add('active');
  }

  function hideStatus() {
    statusPanel.classList.remove('active');
  }

  function lerp(value, target, amount) {
    return value + (target - value) * amount;
  }

  function handleKeyDown(event) {
    switch (event.key) {
      case 'w':
      case 'W':
      case 'ArrowUp':
        inputs.up = true;
        event.preventDefault();
        break;
      case 's':
      case 'S':
      case 'ArrowDown':
        inputs.down = true;
        event.preventDefault();
        break;
      case 'a':
      case 'A':
      case 'ArrowLeft':
        inputs.left = true;
        event.preventDefault();
        break;
      case 'd':
      case 'D':
      case 'ArrowRight':
        inputs.right = true;
        event.preventDefault();
        break;
      case 'r':
      case 'R':
        event.preventDefault();
        startShow();
        break;
      default:
        break;
    }
  }

  function handleKeyUp(event) {
    switch (event.key) {
      case 'w':
      case 'W':
      case 'ArrowUp':
        inputs.up = false;
        break;
      case 's':
      case 'S':
      case 'ArrowDown':
        inputs.down = false;
        break;
      case 'a':
      case 'A':
      case 'ArrowLeft':
        inputs.left = false;
        break;
      case 'd':
      case 'D':
      case 'ArrowRight':
        inputs.right = false;
        break;
      default:
        break;
    }
  }

  restartButton.addEventListener('click', () => startShow());
  window.addEventListener('keydown', handleKeyDown, { passive: false });
  window.addEventListener('keyup', handleKeyUp);

  startShow();
})();
