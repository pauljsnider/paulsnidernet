(() => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const nextCanvas = document.getElementById('nextCanvas');
  const nextCtx = nextCanvas.getContext('2d');
  const statusOverlay = document.getElementById('statusOverlay');
  const statusTitle = document.getElementById('statusTitle');
  const restartButton = document.getElementById('restartButton');
  const touchControls = document.getElementById('touchControls');
  const scoreEl = document.getElementById('scoreValue');
  const linesEl = document.getElementById('linesValue');
  const levelEl = document.getElementById('levelValue');
  const holdTimers = new Map();

  const COLS = 10;
  const ROWS = 16;
  const CELL_SIZE = 32;
  const BASE_DROP_INTERVAL = 950;

  const COLORS = [
    '#f7d038',
    '#ec4c4c',
    '#3cbcc3',
    '#1c7ed6',
    '#f06595',
    '#8ce99a',
    '#ffa94d'
  ];

  const BRICKS = [
    {
      name: '2x4 Plate',
      rotations: [
        [
          [0, 0],
          [1, 0],
          [2, 0],
          [3, 0]
        ],
        [
          [0, 0],
          [0, 1],
          [0, 2],
          [0, 3]
        ]
      ],
      color: COLORS[0]
    },
    {
      name: '2x2 Brick',
      rotations: [
        [
          [0, 0],
          [1, 0],
          [0, 1],
          [1, 1]
        ]
      ],
      color: COLORS[1]
    },
    {
      name: 'L Beam',
      rotations: [
        [
          [0, 0],
          [0, 1],
          [0, 2],
          [1, 2]
        ],
        [
          [0, 1],
          [1, 1],
          [2, 1],
          [2, 0]
        ],
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [1, 2]
        ],
        [
          [0, 0],
          [0, 1],
          [1, 0],
          [2, 0]
        ]
      ],
      color: COLORS[2]
    },
    {
      name: 'T Beam',
      rotations: [
        [
          [1, 0],
          [0, 1],
          [1, 1],
          [2, 1]
        ],
        [
          [1, 0],
          [1, 1],
          [1, 2],
          [0, 1]
        ],
        [
          [0, 0],
          [1, 0],
          [2, 0],
          [1, 1]
        ],
        [
          [0, 0],
          [0, 1],
          [0, 2],
          [1, 1]
        ]
      ],
      color: COLORS[3]
    },
    {
      name: 'Skate Plate',
      rotations: [
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [2, 1]
        ],
        [
          [1, 0],
          [1, 1],
          [0, 1],
          [0, 2]
        ]
      ],
      color: COLORS[4]
    },
    {
      name: 'Long Beam',
      rotations: [
        [
          [0, 0],
          [0, 1],
          [0, 2],
          [0, 3]
        ],
        [
          [0, 0],
          [1, 0],
          [2, 0],
          [3, 0]
        ]
      ],
      color: COLORS[5]
    }
  ];

  const board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));

  let activeBrick = null;
  let nextBrick = null;
  let animationId = null;
  let lastTimestamp = 0;
  let dropAccumulator = 0;
  let isSoftDropping = false;

  const gameState = {
    score: 0,
    lines: 0,
    level: 1,
    dropInterval: BASE_DROP_INTERVAL,
    gameOver: false
  };

  function createBrickInstance(definition) {
    const rotationIndex = 0;
    const offsets = definition.rotations[rotationIndex];
    const xs = offsets.map(([x]) => x);
    const ys = offsets.map(([, y]) => y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const width = maxX - minX + 1;
    const position = {
      x: Math.floor((COLS - width) / 2) - minX,
      y: -minY - 2
    };

    return {
      definition,
      rotationIndex,
      position,
      color: definition.color
    };
  }

  function randomBrick() {
    const def = BRICKS[Math.floor(Math.random() * BRICKS.length)];
    return createBrickInstance(def);
  }

  function cloneBrick(brick) {
    return {
      definition: brick.definition,
      rotationIndex: brick.rotationIndex,
      position: { x: brick.position.x, y: brick.position.y },
      color: brick.color
    };
  }

  function getCells(brick, rotationIndex = brick.rotationIndex, offsetX = 0, offsetY = 0) {
    const offsets = brick.definition.rotations[rotationIndex];
    return offsets.map(([x, y]) => ({
      x: x + brick.position.x + offsetX,
      y: y + brick.position.y + offsetY
    }));
  }

  function collides(brick, offsetX = 0, offsetY = 0, rotationIndex = brick.rotationIndex) {
    return getCells(brick, rotationIndex, offsetX, offsetY).some(({ x, y }) => {
      if (x < 0 || x >= COLS) {
        return true;
      }
      if (y >= ROWS) {
        return true;
      }
      if (y >= 0 && board[y][x]) {
        return true;
      }
      return false;
    });
  }

  function placeBrick(brick) {
    getCells(brick).forEach(({ x, y }) => {
      if (y >= 0 && y < ROWS) {
        board[y][x] = {
          color: brick.color,
          name: brick.definition.name
        };
      }
    });
  }

  function clearCompleteLines() {
    let cleared = 0;
    for (let row = ROWS - 1; row >= 0; row -= 1) {
      if (board[row].every((cell) => cell !== null)) {
        board.splice(row, 1);
        board.unshift(Array(COLS).fill(null));
        cleared += 1;
        row += 1; // re-check shifted row index
      }
    }
    if (cleared > 0) {
      gameState.lines += cleared;
      const lineScores = [0, 100, 300, 500, 800];
      gameState.score += (lineScores[cleared] || 1000) * gameState.level;
      const targetLevel = 1 + Math.floor(gameState.lines / 8);
      if (targetLevel !== gameState.level) {
        gameState.level = targetLevel;
        gameState.dropInterval = Math.max(120, BASE_DROP_INTERVAL - (gameState.level - 1) * 90);
      }
      updateScoreboard();
    }
  }

  function updateScoreboard() {
    scoreEl.textContent = gameState.score.toString();
    linesEl.textContent = gameState.lines.toString();
    levelEl.textContent = gameState.level.toString();
  }

  function spawnBrick() {
    if (!nextBrick) {
      nextBrick = randomBrick();
    }
    activeBrick = nextBrick;
    nextBrick = randomBrick();
    if (collides(activeBrick)) {
      endGame();
      return;
    }
    drawNextBrick();
  }

  function resetBoard() {
    for (let row = 0; row < ROWS; row += 1) {
      board[row].fill(null);
    }
  }

  function resetGame() {
    cancelAnimationFrame(animationId);
    resetBoard();
    gameState.score = 0;
    gameState.lines = 0;
    gameState.level = 1;
    gameState.dropInterval = BASE_DROP_INTERVAL;
    gameState.gameOver = false;
    lastTimestamp = 0;
    dropAccumulator = 0;
    isSoftDropping = false;
    nextBrick = randomBrick();
    spawnBrick();
    updateScoreboard();
    hideStatus();
    animationId = requestAnimationFrame(gameLoop);
  }

  function endGame() {
    gameState.gameOver = true;
    showStatus('Game Over');
  }

  function showStatus(title) {
    statusTitle.textContent = title;
    statusOverlay.classList.remove('hidden');
  }

  function hideStatus() {
    statusOverlay.classList.add('hidden');
  }

  function tryMove(offsetX, offsetY) {
    if (!activeBrick) return false;
    if (!collides(activeBrick, offsetX, offsetY)) {
      activeBrick.position.x += offsetX;
      activeBrick.position.y += offsetY;
      return true;
    }
    return false;
  }

  function rotateBrick(direction = 1) {
    if (!activeBrick) return;
    const { definition } = activeBrick;
    const total = definition.rotations.length;
    const nextIndex = (activeBrick.rotationIndex + direction + total) % total;
    if (!collides(activeBrick, 0, 0, nextIndex)) {
      activeBrick.rotationIndex = nextIndex;
    } else {
      // wall kick attempt: try shifting left or right once
      const shifts = [-1, 1, -2, 2];
      for (const shift of shifts) {
        if (!collides(activeBrick, shift, 0, nextIndex)) {
          activeBrick.position.x += shift;
          activeBrick.rotationIndex = nextIndex;
          return;
        }
      }
    }
  }

  function hardDrop() {
    if (!activeBrick) return;
    let distance = 0;
    while (!collides(activeBrick, 0, 1)) {
      activeBrick.position.y += 1;
      distance += 1;
    }
    if (distance > 0) {
      gameState.score += distance * 2;
      updateScoreboard();
    }
    lockActiveBrick();
  }

  function lockActiveBrick() {
    placeBrick(activeBrick);
    clearCompleteLines();
    spawnBrick();
  }

  function getGhostPosition() {
    const ghost = cloneBrick(activeBrick);
    while (!collides(ghost, 0, 1)) {
      ghost.position.y += 1;
    }
    return ghost;
  }

  function drawCell(x, y, color) {
    const px = x * CELL_SIZE;
    const py = y * CELL_SIZE;
    const radius = CELL_SIZE * 0.18;

    const gradient = ctx.createLinearGradient(px, py, px, py + CELL_SIZE);
    gradient.addColorStop(0, lighten(color, 0.25));
    gradient.addColorStop(1, darken(color, 0.25));

    ctx.fillStyle = gradient;
    ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.lineWidth = 3;
    ctx.strokeRect(px + 0.5, py + 0.5, CELL_SIZE - 1, CELL_SIZE - 1);

    ctx.fillStyle = lighten(color, 0.35);
    ctx.beginPath();
    ctx.arc(px + CELL_SIZE / 2, py + CELL_SIZE / 2 - CELL_SIZE * 0.1, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(px + CELL_SIZE / 2, py + CELL_SIZE / 2 - CELL_SIZE * 0.1, radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  function drawGhost(brick) {
    ctx.save();
    ctx.globalAlpha = 0.25;
    drawBrick(brick);
    ctx.restore();
  }

  function drawBrick(brick) {
    getCells(brick).forEach(({ x, y }) => {
      if (y >= 0) {
        drawCell(x, y, brick.color);
      }
    });
  }

  function drawBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < ROWS; y += 1) {
      for (let x = 0; x < COLS; x += 1) {
        const cell = board[y][x];
        if (cell) {
          drawCell(x, y, cell.color);
        } else {
          drawGridStud(x, y);
        }
      }
    }
  }

  function drawGridStud(x, y) {
    const px = x * CELL_SIZE;
    const py = y * CELL_SIZE;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.strokeRect(px, py, CELL_SIZE, CELL_SIZE);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.beginPath();
    ctx.arc(px + CELL_SIZE / 2, py + CELL_SIZE / 2, CELL_SIZE * 0.15, 0, Math.PI * 2);
    ctx.fill();
  }

  function lighten(color, amount) {
    return shadeColor(color, amount);
  }

  function darken(color, amount) {
    return shadeColor(color, -amount);
  }

  function shadeColor(color, amount) {
    const col = color.replace('#', '');
    const num = parseInt(col, 16);
    const r = clamp(((num >> 16) & 0xff) + Math.round(255 * amount), 0, 255);
    const g = clamp(((num >> 8) & 0xff) + Math.round(255 * amount), 0, 255);
    const b = clamp((num & 0xff) + Math.round(255 * amount), 0, 255);
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function drawNextBrick() {
    nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    const brick = cloneBrick(nextBrick);
    brick.position.x = 1;
    brick.position.y = 1;
    const offsets = brick.definition.rotations[brick.rotationIndex];
    const xs = offsets.map(([x]) => x);
    const ys = offsets.map(([, y]) => y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);
    const width = maxX - minX + 1;
    const height = maxY - minY + 1;
    const scale = Math.min(
      (nextCanvas.width - 30) / (width * CELL_SIZE),
      (nextCanvas.height - 30) / (height * CELL_SIZE)
    );

    nextCtx.save();
    nextCtx.translate(
      (nextCanvas.width - width * CELL_SIZE * scale) / 2,
      (nextCanvas.height - height * CELL_SIZE * scale) / 2
    );
    nextCtx.scale(scale, scale);
    drawPreviewBrick(brick, minX, minY);
    nextCtx.restore();
  }

  function drawPreviewBrick(brick, minX, minY) {
    const offsets = brick.definition.rotations[brick.rotationIndex];
    offsets.forEach(([x, y]) => {
      const px = (x - minX) * CELL_SIZE;
      const py = (y - minY) * CELL_SIZE;
      const gradient = nextCtx.createLinearGradient(px, py, px, py + CELL_SIZE);
      gradient.addColorStop(0, lighten(brick.color, 0.3));
      gradient.addColorStop(1, darken(brick.color, 0.3));

      nextCtx.fillStyle = gradient;
      nextCtx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
      nextCtx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
      nextCtx.lineWidth = 2;
      nextCtx.strokeRect(px + 1, py + 1, CELL_SIZE - 2, CELL_SIZE - 2);

      nextCtx.fillStyle = lighten(brick.color, 0.35);
      nextCtx.beginPath();
      nextCtx.arc(
        px + CELL_SIZE / 2,
        py + CELL_SIZE / 2 - CELL_SIZE * 0.1,
        CELL_SIZE * 0.18,
        0,
        Math.PI * 2
      );
      nextCtx.fill();

      nextCtx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
      nextCtx.lineWidth = 1.5;
      nextCtx.beginPath();
      nextCtx.arc(
        px + CELL_SIZE / 2,
        py + CELL_SIZE / 2 - CELL_SIZE * 0.1,
        CELL_SIZE * 0.18,
        0,
        Math.PI * 2
      );
      nextCtx.stroke();
    });
  }

  function gameLoop(timestamp) {
    if (gameState.gameOver) {
      drawBoard();
      if (activeBrick) {
        drawBrick(activeBrick);
      }
      return;
    }

    if (!lastTimestamp) {
      lastTimestamp = timestamp;
    }

    const delta = timestamp - lastTimestamp;
    lastTimestamp = timestamp;
    dropAccumulator += delta;

    const interval = isSoftDropping ? gameState.dropInterval / 4 : gameState.dropInterval;

    if (dropAccumulator >= interval) {
      dropAccumulator -= interval;
      if (!tryMove(0, 1)) {
        lockActiveBrick();
        if (gameState.gameOver) {
          drawScene();
          return;
        }
      }
    }

    drawScene();
    animationId = requestAnimationFrame(gameLoop);
  }

  function drawScene() {
    drawBoard();
    if (activeBrick) {
      const ghost = getGhostPosition();
      drawGhost(ghost);
      drawBrick(activeBrick);
    }
  }

  function triggerControlAction(action) {
    switch (action) {
      case 'move-left':
        tryMove(-1, 0);
        break;
      case 'move-right':
        tryMove(1, 0);
        break;
      case 'move-up':
      case 'rotate':
        rotateBrick(1);
        break;
      case 'soft-drop':
        isSoftDropping = true;
        tryMove(0, 1);
        break;
      case 'drop':
        hardDrop();
        break;
      default:
        break;
    }
  }

  function shouldHold(action) {
    return action === 'move-left' || action === 'move-right' || action === 'soft-drop';
  }

  function clearHold(action) {
    const timerId = holdTimers.get(action);
    if (timerId) {
      clearInterval(timerId);
      holdTimers.delete(action);
    }
    if (action === 'soft-drop') {
      isSoftDropping = false;
    }
  }

  function beginHold(action) {
    if (!shouldHold(action) || holdTimers.has(action)) {
      return;
    }

    if (action === 'soft-drop') {
      isSoftDropping = true;
    }

    const interval = action === 'soft-drop' ? 100 : 160;
    const id = setInterval(() => {
      if (action === 'soft-drop') {
        if (!tryMove(0, 1)) {
          clearHold(action);
        }
        return;
      }
      triggerControlAction(action);
    }, interval);
    holdTimers.set(action, id);
  }

  function setupTouchControls() {
    if (!touchControls) {
      return;
    }

    const buttons = touchControls.querySelectorAll('.control-btn');
    buttons.forEach((button) => {
      const action = button.dataset.action;
      if (!action) return;

      const handlePointerDown = (event) => {
        event.preventDefault();
        button.setPointerCapture(event.pointerId);
        triggerControlAction(action);
        beginHold(action);
      };

      const handlePointerEnd = (event) => {
        event.preventDefault();
        clearHold(action);
        if (button.hasPointerCapture && button.hasPointerCapture(event.pointerId)) {
          button.releasePointerCapture(event.pointerId);
        }
      };

      const handlePointerCancel = () => {
        clearHold(action);
      };

      button.addEventListener('pointerdown', handlePointerDown);
      button.addEventListener('pointerup', handlePointerEnd);
      button.addEventListener('pointercancel', handlePointerCancel);
      button.addEventListener('pointerleave', handlePointerCancel);
    });
  }

  function handleKeyDown(event) {
    if (event.repeat) return;

    switch (event.key) {
      case 'ArrowLeft':
      case 'a':
      case 'A':
        event.preventDefault();
        tryMove(-1, 0);
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        event.preventDefault();
        tryMove(1, 0);
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        event.preventDefault();
        isSoftDropping = true;
        tryMove(0, 1);
        break;
      case 'ArrowUp':
      case 'w':
      case 'W':
      case 'z':
      case 'Z':
        event.preventDefault();
        rotateBrick(1);
        break;
      case 'x':
      case 'X':
        event.preventDefault();
        rotateBrick(-1);
        break;
      case ' ': // Spacebar
        event.preventDefault();
        hardDrop();
        break;
      case 'r':
      case 'R':
        event.preventDefault();
        resetGame();
        break;
      default:
        break;
    }
  }

  function handleKeyUp(event) {
    if (event.key === 'ArrowDown' || event.key === 's' || event.key === 'S') {
      isSoftDropping = false;
    }
  }

  restartButton.addEventListener('click', () => {
    resetGame();
  });

  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);

  setupTouchControls();

  resetGame();
})();
