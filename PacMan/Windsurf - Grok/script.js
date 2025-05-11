const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const gameOverElement = document.getElementById('gameOver');

// Game settings
const tileSize = 20;
const mapWidth = 28;
const mapHeight = 31;
let score = 0;
let gameOver = false;

// Pac-Man settings
const pacman = {
    x: 13.5 * tileSize,
    y: 23.5 * tileSize,
    speed: 1.2,
    direction: 'none',
    nextDirection: 'none',
    radius: tileSize / 2 - 2
};

// Ghost settings
const ghosts = [
    { x: 13.5 * tileSize, y: 11.5 * tileSize, color: 'red', speed: 1 },
    { x: 11.5 * tileSize, y: 13.5 * tileSize, color: 'cyan', speed: 1 },
    { x: 15.5 * tileSize, y: 13.5 * tileSize, color: 'pink', speed: 1 },
    { x: 13.5 * tileSize, y: 15.5 * tileSize, color: 'orange', speed: 1 }
];

// Game map (0 = wall, 1 = path, 2 = dot)
const map = [
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,2,2,2,2,2,2,2,2,2,2,2,2,0,0,2,2,2,2,2,2,2,2,2,2,2,2,0],
    [0,2,0,0,0,0,2,0,0,0,0,0,2,0,0,2,0,0,0,0,0,2,0,0,0,0,2,0],
    [0,2,0,0,0,0,2,0,0,0,0,0,2,0,0,2,0,0,0,0,0,2,0,0,0,0,2,0],
    [0,2,0,0,0,0,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,0,0,0,0,2,0],
    [0,2,2,2,2,2,2,0,0,2,0,0,0,0,0,0,0,0,2,0,0,2,2,2,2,2,2,0],
    [0,2,0,0,0,0,2,0,0,2,0,0,0,0,0,0,0,0,2,0,0,2,0,0,0,0,2,0],
    [0,2,0,0,0,0,2,2,2,2,2,2,2,0,0,2,2,2,2,2,2,2,0,0,0,0,2,0],
    [0,2,2,2,2,2,2,0,0,0,0,0,2,0,0,2,0,0,0,0,0,2,2,2,2,2,2,0],
    [0,0,0,0,0,0,2,0,0,0,0,0,2,0,0,2,0,0,0,0,0,2,0,0,0,0,0,0],
    [0,0,0,0,0,0,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,0,0,0,0,0,0],
    [0,0,0,0,0,0,2,0,0,2,0,0,0,1,1,0,0,0,2,0,0,2,0,0,0,0,0,0],
    [2,2,2,2,2,2,2,0,0,2,0,0,0,1,1,0,0,0,2,0,0,2,2,2,2,2,2,2],
    [0,0,0,0,0,0,2,0,0,2,0,0,0,1,1,1,1,0,2,0,0,2,0,0,0,0,0,0],
    [0,0,0,0,0,0,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,0,0,0,0,0,0],
    [0,0,0,0,0,0,2,0,0,0,0,0,2,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0],
    [2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2],
    [0,0,0,0,0,0,2,0,0,0,0,0,2,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0],
    [0,0,0,0,0,0,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,0,0,0,0,0,0],
    [0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0],
    [2,2,2,2,2,2,2,2,2,2,2,2,2,0,0,2,2,2,2,2,2,2,2,2,2,2,2,2],
    [0,0,0,0,0,0,2,0,0,0,0,0,2,0,0,2,0,0,0,0,0,2,0,0,0,0,0,0],
    [0,0,0,0,0,0,2,0,0,0,0,0,2,0,0,2,0,0,0,0,0,2,0,0,0,0,0,0],
    [0,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,0],
    [0,2,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,2,0],
    [0,2,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,2,0],
    [0,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,0],
    [0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0],
    [0,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
];

// Keyboard input handling
document.addEventListener('keydown', (event) => {
    if (gameOver) {
        if (event.key === 'r' || event.key === 'R') {
            restartGame();
        }
        return;
    }

    switch(event.key) {
        case 'ArrowLeft':
            pacman.nextDirection = 'left';
            break;
        case 'ArrowRight':
            pacman.nextDirection = 'right';
            break;
        case 'ArrowUp':
            pacman.nextDirection = 'up';
            break;
        case 'ArrowDown':
            pacman.nextDirection = 'down';
            break;
    }
});

// Check if Pac-Man or Ghost can move to the next position
function canMove(x, y) {
    const tileX = Math.floor(x / tileSize);
    const tileY = Math.floor(y / tileSize);
    
    if (tileX < 0 || tileX >= mapWidth || tileY < 0 || tileY >= mapHeight) {
        return false;
    }
    return map[tileY][tileX] !== 0;
}

// Update Pac-Man's position
function updatePacman() {
    let nextX = pacman.x;
    let nextY = pacman.y;

    // Check if Pac-Man can move in the next direction
    if (pacman.nextDirection !== 'none') {
        let canChangeDirection = false;
        switch (pacman.nextDirection) {
            case 'left':
                nextX = pacman.x - pacman.speed;
                if (canMove(nextX - pacman.radius, pacman.y)) {
                    canChangeDirection = true;
                }
                break;
            case 'right':
                nextX = pacman.x + pacman.speed;
                if (canMove(nextX + pacman.radius, pacman.y)) {
                    canChangeDirection = true;
                }
                break;
            case 'up':
                nextY = pacman.y - pacman.speed;
                if (canMove(pacman.x, nextY - pacman.radius)) {
                    canChangeDirection = true;
                }
                break;
            case 'down':
                nextY = pacman.y + pacman.speed;
                if (canMove(pacman.x, nextY + pacman.radius)) {
                    canChangeDirection = true;
                }
                break;
        }
        if (canChangeDirection) {
            pacman.direction = pacman.nextDirection;
            pacman.nextDirection = 'none';
        }
    }

    // Move in current direction
    switch (pacman.direction) {
        case 'left':
            nextX = pacman.x - pacman.speed;
            if (!canMove(nextX - pacman.radius, pacman.y)) {
                nextX = pacman.x;
                pacman.direction = 'none';
            }
            break;
        case 'right':
            nextX = pacman.x + pacman.speed;
            if (!canMove(nextX + pacman.radius, pacman.y)) {
                nextX = pacman.x;
                pacman.direction = 'none';
            }
            break;
        case 'up':
            nextY = pacman.y - pacman.speed;
            if (!canMove(pacman.x, nextY - pacman.radius)) {
                nextY = pacman.y;
                pacman.direction = 'none';
            }
            break;
        case 'down':
            nextY = pacman.y + pacman.speed;
            if (!canMove(pacman.x, nextY + pacman.radius)) {
                nextY = pacman.y;
                pacman.direction = 'none';
            }
            break;
    }

    pacman.x = nextX;
    pacman.y = nextY;

    // Eat dots
    const tileX = Math.floor(pacman.x / tileSize);
    const tileY = Math.floor(pacman.y / tileSize);
    if (map[tileY][tileX] === 2) {
        map[tileY][tileX] = 1;
        score += 10;
        scoreElement.textContent = `Score: ${score}`;
    }
}

// Update ghosts' positions
function updateGhosts() {
    ghosts.forEach(ghost => {
        let direction = ghost.direction || ['left', 'right', 'up', 'down'][Math.floor(Math.random() * 4)];
        let nextX = ghost.x;
        let nextY = ghost.y;

        switch (direction) {
            case 'left':
                nextX = ghost.x - ghost.speed;
                if (!canMove(nextX, ghost.y)) {
                    direction = ['up', 'down', 'right'][Math.floor(Math.random() * 3)];
                }
                break;
            case 'right':
                nextX = ghost.x + ghost.speed;
                if (!canMove(nextX, ghost.y)) {
                    direction = ['up', 'down', 'left'][Math.floor(Math.random() * 3)];
                }
                break;
            case 'up':
                nextY = ghost.y - ghost.speed;
                if (!canMove(ghost.x, nextY)) {
                    direction = ['left', 'right', 'down'][Math.floor(Math.random() * 3)];
                }
                break;
            case 'down':
                nextY = ghost.y + ghost.speed;
                if (!canMove(ghost.x, nextY)) {
                    direction = ['left', 'right', 'up'][Math.floor(Math.random() * 3)];
                }
                break;
        }

        ghost.x = nextX;
        ghost.y = nextY;
        ghost.direction = direction;

        // Check for collision with Pac-Man
        const dx = pacman.x - ghost.x;
        const dy = pacman.y - ghost.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < pacman.radius + 5) {
            gameOver = true;
            gameOverElement.classList.remove('hidden');
        }
    });
}

// Draw the game map
function drawMap() {
    for (let y = 0; y < mapHeight; y++) {
        for (let x = 0; x < mapWidth; x++) {
            if (map[y][x] === 0) {
                ctx.fillStyle = 'blue';
                ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
            } else if (map[y][x] === 2) {
                ctx.fillStyle = 'white';
                ctx.beginPath();
                ctx.arc(x * tileSize + tileSize / 2, y * tileSize + tileSize / 2, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
}

// Draw Pac-Man
function drawPacman() {
    ctx.fillStyle = 'yellow';
    ctx.beginPath();
    let startAngle = 0;
    let endAngle = Math.PI * 2;
    let mouthOpen = true;

    switch (pacman.direction) {
        case 'right':
            startAngle = Math.PI * 0.1;
            endAngle = Math.PI * 1.9;
            break;
        case 'left':
            startAngle = Math.PI * 1.1;
            endAngle = Math.PI * 0.9;
            break;
        case 'up':
            startAngle = Math.PI * 1.6;
            endAngle = Math.PI * 1.4;
            break;
        case 'down':
            startAngle = Math.PI * 0.6;
            endAngle = Math.PI * 0.4;
            break;
        default:
            mouthOpen = false;
            break;
    }

    if (mouthOpen) {
        ctx.arc(pacman.x, pacman.y, pacman.radius, startAngle, endAngle);
        ctx.lineTo(pacman.x, pacman.y);
    } else {
        ctx.arc(pacman.x, pacman.y, pacman.radius, 0, Math.PI * 2);
    }
    ctx.fill();
}

// Draw ghosts
function drawGhosts() {
    ghosts.forEach(ghost => {
        ctx.fillStyle = ghost.color;
        ctx.beginPath();
        ctx.arc(ghost.x, ghost.y, 8, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw eyes
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(ghost.x - 3, ghost.y - 2, 2, 0, Math.PI * 2);
        ctx.arc(ghost.x + 3, ghost.y - 2, 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw pupils
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(ghost.x - 3, ghost.y - 1, 1, 0, Math.PI * 2);
        ctx.arc(ghost.x + 3, ghost.y - 1, 1, 0, Math.PI * 2);
        ctx.fill();
    });
}

// Game loop
function gameLoop() {
    if (!gameOver) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        updatePacman();
        updateGhosts();
        drawMap();
        drawPacman();
        drawGhosts();
    }
    requestAnimationFrame(gameLoop);
}

// Restart game
function restartGame() {
    gameOver = false;
    gameOverElement.classList.add('hidden');
    pacman.x = 13.5 * tileSize;
    pacman.y = 23.5 * tileSize;
    pacman.direction = 'none';
    pacman.nextDirection = 'none';
    score = 0;
    scoreElement.textContent = `Score: ${score}`;
    
    ghosts[0].x = 13.5 * tileSize;
    ghosts[0].y = 11.5 * tileSize;
    ghosts[1].x = 11.5 * tileSize;
    ghosts[1].y = 13.5 * tileSize;
    ghosts[2].x = 15.5 * tileSize;
    ghosts[2].y = 13.5 * tileSize;
    ghosts[3].x = 13.5 * tileSize;
    ghosts[3].y = 15.5 * tileSize;
    
    // Reset map dots
    for (let y = 0; y < mapHeight; y++) {
        for (let x = 0; x < mapWidth; x++) {
            if (map[y][x] === 1) {
                map[y][x] = 2;
            }
        }
    }
}

// Start the game
gameLoop();
