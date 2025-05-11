// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 448;  // 28 cells * 16px
canvas.height = 496; // 31 cells * 16px

// Game constants
const CELL_SIZE = 16;
const PACMAN_RADIUS = CELL_SIZE / 2;
const GHOST_SIZE = CELL_SIZE;
const DOT_RADIUS = 2;
const ENERGIZER_RADIUS = 6;
const SPEED = 2;

// Game variables
let score = 0;
let gameOver = false;
let gameWon = false;
let lastFrameTime = 0;

// Direction constants
const DIRECTIONS = {
    UP: { x: 0, y: -1 },
    DOWN: { x: 0, y: 1 },
    LEFT: { x: -1, y: 0 },
    RIGHT: { x: 1, y: 0 },
    NONE: { x: 0, y: 0 }
};

// Pac-Man object
const pacman = {
    x: 14 * CELL_SIZE,
    y: 23 * CELL_SIZE,
    radius: PACMAN_RADIUS,
    speed: SPEED,
    direction: DIRECTIONS.NONE,
    nextDirection: DIRECTIONS.NONE,
    mouthAngle: 0.2,
    mouthOpen: true,
    animationSpeed: 0.05
};

// Ghost object constructor
function Ghost(x, y, color) {
    this.x = x * CELL_SIZE;
    this.y = y * CELL_SIZE;
    this.color = color;
    this.speed = SPEED * 0.75;
    this.direction = DIRECTIONS.UP;
    this.frightened = false;
    
    // Simple ghost AI - choose random valid direction
    this.chooseDirection = function() {
        const possibleDirections = [];
        
        // Check each direction
        if (canMove(this.x, this.y, DIRECTIONS.UP)) possibleDirections.push(DIRECTIONS.UP);
        if (canMove(this.x, this.y, DIRECTIONS.DOWN)) possibleDirections.push(DIRECTIONS.DOWN);
        if (canMove(this.x, this.y, DIRECTIONS.LEFT)) possibleDirections.push(DIRECTIONS.LEFT);
        if (canMove(this.x, this.y, DIRECTIONS.RIGHT)) possibleDirections.push(DIRECTIONS.RIGHT);
        
        // Remove opposite of current direction to avoid backtracking
        const opposites = {
            [DIRECTIONS.UP]: DIRECTIONS.DOWN,
            [DIRECTIONS.DOWN]: DIRECTIONS.UP,
            [DIRECTIONS.LEFT]: DIRECTIONS.RIGHT,
            [DIRECTIONS.RIGHT]: DIRECTIONS.LEFT
        };
        
        const filteredDirections = possibleDirections.filter(dir => 
            dir !== opposites[this.direction] || possibleDirections.length === 1);
        
        // Choose random direction from filtered list
        if (filteredDirections.length > 0) {
            return filteredDirections[Math.floor(Math.random() * filteredDirections.length)];
        }
        
        // If no valid direction, reverse
        return opposites[this.direction];
    };
    
    this.update = function() {
        // At intersections, possibly change direction
        if (this.x % CELL_SIZE === 0 && this.y % CELL_SIZE === 0) {
            this.direction = this.chooseDirection();
        }
        
        // Move ghost
        this.x += this.direction.x * this.speed;
        this.y += this.direction.y * this.speed;
        
        // Wrap around tunnel
        if (this.x < -CELL_SIZE) this.x = canvas.width;
        if (this.x > canvas.width) this.x = -CELL_SIZE;
    };
    
    this.draw = function() {
        // Draw ghost body
        ctx.fillStyle = this.frightened ? '#2121ff' : this.color;
        ctx.beginPath();
        ctx.arc(this.x + CELL_SIZE/2, this.y + CELL_SIZE/2 - 2, CELL_SIZE/2, Math.PI, 0, false);
        ctx.rect(this.x, this.y + CELL_SIZE/2 - 2, CELL_SIZE, CELL_SIZE/2);
        
        // Draw wavy bottom
        const waveHeight = 3;
        ctx.moveTo(this.x, this.y + CELL_SIZE - 2);
        for (let i = 0; i < 3; i++) {
            ctx.quadraticCurveTo(
                this.x + CELL_SIZE/6 + (i * CELL_SIZE/3), 
                this.y + CELL_SIZE - 2 + waveHeight,
                this.x + CELL_SIZE/3 + (i * CELL_SIZE/3), 
                this.y + CELL_SIZE - 2
            );
        }
        ctx.fill();
        
        // Draw eyes
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(this.x + CELL_SIZE/3, this.y + CELL_SIZE/2 - 2, CELL_SIZE/6, 0, Math.PI * 2);
        ctx.arc(this.x + 2*CELL_SIZE/3, this.y + CELL_SIZE/2 - 2, CELL_SIZE/6, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw pupils
        ctx.fillStyle = 'black';
        const pupilOffsetX = this.direction.x * 2;
        const pupilOffsetY = this.direction.y * 2;
        ctx.beginPath();
        ctx.arc(this.x + CELL_SIZE/3 + pupilOffsetX, this.y + CELL_SIZE/2 - 2 + pupilOffsetY, CELL_SIZE/10, 0, Math.PI * 2);
        ctx.arc(this.x + 2*CELL_SIZE/3 + pupilOffsetX, this.y + CELL_SIZE/2 - 2 + pupilOffsetY, CELL_SIZE/10, 0, Math.PI * 2);
        ctx.fill();
    };
}

// Create ghosts
const ghosts = [
    new Ghost(13, 11, '#ff0000'), // Red ghost (Blinky)
    new Ghost(14, 11, '#ffb8ff'), // Pink ghost (Pinky)
    new Ghost(13, 12, '#00ffff'), // Cyan ghost (Inky)
    new Ghost(14, 12, '#ffb852')  // Orange ghost (Clyde)
];

// Game map (0: empty, 1: wall, 2: dot, 3: energizer, 4: ghost house)
const map = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,2,2,2,2,2,2,2,2,2,2,2,2,1,1,2,2,2,2,2,2,2,2,2,2,2,2,1],
    [1,2,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,2,1],
    [1,3,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,3,1],
    [1,2,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,2,1],
    [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
    [1,2,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,2,1],
    [1,2,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,2,1],
    [1,2,2,2,2,2,2,1,1,2,2,2,2,1,1,2,2,2,2,1,1,2,2,2,2,2,2,1],
    [1,1,1,1,1,1,2,1,1,1,1,1,0,1,1,0,1,1,1,1,1,2,1,1,1,1,1,1],
    [0,0,0,0,0,1,2,1,1,1,1,1,0,1,1,0,1,1,1,1,1,2,1,0,0,0,0,0],
    [0,0,0,0,0,1,2,1,1,0,0,0,0,0,0,0,0,0,0,1,1,2,1,0,0,0,0,0],
    [0,0,0,0,0,1,2,1,1,0,1,1,1,4,4,1,1,1,0,1,1,2,1,0,0,0,0,0],
    [1,1,1,1,1,1,2,1,1,0,1,0,0,0,0,0,0,1,0,1,1,2,1,1,1,1,1,1],
    [0,0,0,0,0,0,2,0,0,0,1,0,0,0,0,0,0,1,0,0,0,2,0,0,0,0,0,0],
    [1,1,1,1,1,1,2,1,1,0,1,0,0,0,0,0,0,1,0,1,1,2,1,1,1,1,1,1],
    [0,0,0,0,0,1,2,1,1,0,1,1,1,1,1,1,1,1,0,1,1,2,1,0,0,0,0,0],
    [0,0,0,0,0,1,2,1,1,0,0,0,0,0,0,0,0,0,0,1,1,2,1,0,0,0,0,0],
    [0,0,0,0,0,1,2,1,1,0,1,1,1,1,1,1,1,1,0,1,1,2,1,0,0,0,0,0],
    [1,1,1,1,1,1,2,1,1,0,1,1,1,1,1,1,1,1,0,1,1,2,1,1,1,1,1,1],
    [1,2,2,2,2,2,2,2,2,2,2,2,2,1,1,2,2,2,2,2,2,2,2,2,2,2,2,1],
    [1,2,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,2,1],
    [1,2,1,1,1,1,2,1,1,1,1,1,2,1,1,2,1,1,1,1,1,2,1,1,1,1,2,1],
    [1,3,2,2,1,1,2,2,2,2,2,2,2,0,0,2,2,2,2,2,2,2,1,1,2,2,3,1],
    [1,1,1,2,1,1,2,1,1,2,1,1,1,1,1,1,1,1,2,1,1,2,1,1,2,1,1,1],
    [1,1,1,2,1,1,2,1,1,2,1,1,1,1,1,1,1,1,2,1,1,2,1,1,2,1,1,1],
    [1,2,2,2,2,2,2,1,1,2,2,2,2,1,1,2,2,2,2,1,1,2,2,2,2,2,2,1],
    [1,2,1,1,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,1,1,2,1],
    [1,2,1,1,1,1,1,1,1,1,1,1,2,1,1,2,1,1,1,1,1,1,1,1,1,1,2,1],
    [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

// Count total dots and energizers
let totalDots = 0;
map.forEach(row => {
    row.forEach(cell => {
        if (cell === 2 || cell === 3) totalDots++;
    });
});

// Check if Pac-Man can move in a given direction
function canMove(x, y, direction) {
    // Calculate the next position
    const nextX = x + direction.x * pacman.speed;
    const nextY = y + direction.y * pacman.speed;
    
    // Convert to grid coordinates
    const cellX = Math.floor(nextX / CELL_SIZE);
    const cellY = Math.floor(nextY / CELL_SIZE);
    
    // Check if the next position is within bounds
    if (cellX < 0 || cellX >= map[0].length || cellY < 0 || cellY >= map.length) {
        // Allow tunnel movement
        if (cellY === 14) {
            return true;
        }
        return false;
    }
    
    // Check if the next position is a wall
    return map[cellY][cellX] !== 1;
}

// Draw the game map
function drawMap() {
    for (let y = 0; y < map.length; y++) {
        for (let x = 0; x < map[y].length; x++) {
            const cell = map[y][x];
            const cellX = x * CELL_SIZE;
            const cellY = y * CELL_SIZE;
            
            if (cell === 1) {
                // Draw wall
                ctx.fillStyle = '#2121ff';
                ctx.fillRect(cellX, cellY, CELL_SIZE, CELL_SIZE);
            } else if (cell === 2) {
                // Draw dot
                ctx.fillStyle = '#ffb8ff';
                ctx.beginPath();
                ctx.arc(cellX + CELL_SIZE/2, cellY + CELL_SIZE/2, DOT_RADIUS, 0, Math.PI * 2);
                ctx.fill();
            } else if (cell === 3) {
                // Draw energizer
                ctx.fillStyle = '#ffb8ff';
                ctx.beginPath();
                ctx.arc(cellX + CELL_SIZE/2, cellY + CELL_SIZE/2, ENERGIZER_RADIUS, 0, Math.PI * 2);
                ctx.fill();
            } else if (cell === 4) {
                // Draw ghost house
                ctx.fillStyle = '#ffb852';
                ctx.fillRect(cellX, cellY, CELL_SIZE, CELL_SIZE);
            }
        }
    }
}

// Draw Pac-Man
function drawPacman() {
    ctx.fillStyle = '#ffff00';
    ctx.beginPath();
    
    // Calculate mouth opening based on animation
    const mouthAngle = pacman.mouthAngle * Math.PI;
    
    // Draw Pac-Man with mouth in the direction of movement
    let startAngle, endAngle;
    
    if (pacman.direction === DIRECTIONS.RIGHT) {
        startAngle = mouthAngle;
        endAngle = 2 * Math.PI - mouthAngle;
    } else if (pacman.direction === DIRECTIONS.LEFT) {
        startAngle = Math.PI + mouthAngle;
        endAngle = Math.PI - mouthAngle;
    } else if (pacman.direction === DIRECTIONS.UP) {
        startAngle = Math.PI * 1.5 + mouthAngle;
        endAngle = Math.PI * 1.5 - mouthAngle;
    } else if (pacman.direction === DIRECTIONS.DOWN) {
        startAngle = Math.PI * 0.5 + mouthAngle;
        endAngle = Math.PI * 0.5 - mouthAngle;
    } else {
        // If not moving, use right-facing Pac-Man
        startAngle = mouthAngle;
        endAngle = 2 * Math.PI - mouthAngle;
    }
    
    ctx.arc(pacman.x + CELL_SIZE/2, pacman.y + CELL_SIZE/2, pacman.radius, startAngle, endAngle);
    ctx.lineTo(pacman.x + CELL_SIZE/2, pacman.y + CELL_SIZE/2);
    ctx.fill();
    
    // Animate mouth
    if (pacman.mouthOpen) {
        pacman.mouthAngle += pacman.animationSpeed;
        if (pacman.mouthAngle >= 0.2) {
            pacman.mouthOpen = false;
        }
    } else {
        pacman.mouthAngle -= pacman.animationSpeed;
        if (pacman.mouthAngle <= 0.01) {
            pacman.mouthOpen = true;
        }
    }
}

// Check for collisions with dots and energizers
function checkDotCollision() {
    const cellX = Math.floor((pacman.x + CELL_SIZE/2) / CELL_SIZE);
    const cellY = Math.floor((pacman.y + CELL_SIZE/2) / CELL_SIZE);
    
    // Check if Pac-Man is centered enough on a cell to collect a dot
    if (Math.abs((pacman.x + CELL_SIZE/2) % CELL_SIZE - CELL_SIZE/2) < 5 &&
        Math.abs((pacman.y + CELL_SIZE/2) % CELL_SIZE - CELL_SIZE/2) < 5) {
        
        if (cellX >= 0 && cellX < map[0].length && cellY >= 0 && cellY < map.length) {
            if (map[cellY][cellX] === 2) {
                // Collect dot
                map[cellY][cellX] = 0;
                score += 10;
                totalDots--;
                updateScore();
            } else if (map[cellY][cellX] === 3) {
                // Collect energizer
                map[cellY][cellX] = 0;
                score += 50;
                totalDots--;
                updateScore();
                
                // Make ghosts frightened
                ghosts.forEach(ghost => {
                    ghost.frightened = true;
                    ghost.speed = SPEED * 0.5;
                });
                
                // Reset ghost state after 8 seconds
                setTimeout(() => {
                    ghosts.forEach(ghost => {
                        ghost.frightened = false;
                        ghost.speed = SPEED * 0.75;
                    });
                }, 8000);
            }
        }
    }
    
    // Check if all dots are collected
    if (totalDots === 0) {
        gameWon = true;
    }
}

// Check for collisions with ghosts
function checkGhostCollision() {
    ghosts.forEach(ghost => {
        const distance = Math.sqrt(
            Math.pow((pacman.x + CELL_SIZE/2) - (ghost.x + CELL_SIZE/2), 2) +
            Math.pow((pacman.y + CELL_SIZE/2) - (ghost.y + CELL_SIZE/2), 2)
        );
        
        if (distance < CELL_SIZE - 4) {
            if (ghost.frightened) {
                // Eat ghost
                ghost.x = 13 * CELL_SIZE;
                ghost.y = 11 * CELL_SIZE;
                ghost.frightened = false;
                ghost.speed = SPEED * 0.75;
                score += 200;
                updateScore();
            } else {
                // Game over
                gameOver = true;
            }
        }
    });
}

// Update score display
function updateScore() {
    document.getElementById('score').textContent = score;
}

// Handle keyboard input
document.addEventListener('keydown', (event) => {
    switch (event.key) {
        case 'ArrowUp':
            pacman.nextDirection = DIRECTIONS.UP;
            break;
        case 'ArrowDown':
            pacman.nextDirection = DIRECTIONS.DOWN;
            break;
        case 'ArrowLeft':
            pacman.nextDirection = DIRECTIONS.LEFT;
            break;
        case 'ArrowRight':
            pacman.nextDirection = DIRECTIONS.RIGHT;
            break;
    }
});

// Update Pac-Man position
function updatePacman() {
    // Try to change direction if a new direction is requested
    if (pacman.nextDirection !== DIRECTIONS.NONE) {
        if (canMove(pacman.x, pacman.y, pacman.nextDirection)) {
            pacman.direction = pacman.nextDirection;
            pacman.nextDirection = DIRECTIONS.NONE;
        }
    }
    
    // Move in current direction if possible
    if (pacman.direction !== DIRECTIONS.NONE && canMove(pacman.x, pacman.y, pacman.direction)) {
        pacman.x += pacman.direction.x * pacman.speed;
        pacman.y += pacman.direction.y * pacman.speed;
        
        // Handle tunnel wrap-around
        if (pacman.x < -CELL_SIZE) pacman.x = canvas.width;
        if (pacman.x > canvas.width) pacman.x = -CELL_SIZE;
    }
    
    // Check for collisions
    checkDotCollision();
    checkGhostCollision();
}

// Update ghosts
function updateGhosts() {
    ghosts.forEach(ghost => ghost.update());
}

// Draw game over screen
function drawGameOver() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = 'red';
    ctx.font = '36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 30);
    
    ctx.fillStyle = 'white';
    ctx.font = '24px Arial';
    ctx.fillText(`Score: ${score}`, canvas.width / 2, canvas.height / 2 + 20);
    
    ctx.font = '18px Arial';
    ctx.fillText('Press SPACE to restart', canvas.width / 2, canvas.height / 2 + 60);
}

// Draw game won screen
function drawGameWon() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = 'yellow';
    ctx.font = '36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('YOU WIN!', canvas.width / 2, canvas.height / 2 - 30);
    
    ctx.fillStyle = 'white';
    ctx.font = '24px Arial';
    ctx.fillText(`Score: ${score}`, canvas.width / 2, canvas.height / 2 + 20);
    
    ctx.font = '18px Arial';
    ctx.fillText('Press SPACE to restart', canvas.width / 2, canvas.height / 2 + 60);
}

// Reset game
function resetGame() {
    // Reset Pac-Man
    pacman.x = 14 * CELL_SIZE;
    pacman.y = 23 * CELL_SIZE;
    pacman.direction = DIRECTIONS.NONE;
    pacman.nextDirection = DIRECTIONS.NONE;
    
    // Reset ghosts
    ghosts[0].x = 13 * CELL_SIZE; ghosts[0].y = 11 * CELL_SIZE;
    ghosts[1].x = 14 * CELL_SIZE; ghosts[1].y = 11 * CELL_SIZE;
    ghosts[2].x = 13 * CELL_SIZE; ghosts[2].y = 12 * CELL_SIZE;
    ghosts[3].x = 14 * CELL_SIZE; ghosts[3].y = 12 * CELL_SIZE;
    
    ghosts.forEach(ghost => {
        ghost.frightened = false;
        ghost.speed = SPEED * 0.75;
        ghost.direction = DIRECTIONS.UP;
    });
    
    // Reset map (restore dots and energizers)
    for (let y = 0; y < map.length; y++) {
        for (let x = 0; x < map[y].length; x++) {
            if (map[y][x] === 0 && originalMap[y][x] > 1) {
                map[y][x] = originalMap[y][x];
            }
        }
    }
    
    // Reset game state
    score = 0;
    updateScore();
    gameOver = false;
    gameWon = false;
    
    // Count total dots again
    totalDots = 0;
    map.forEach(row => {
        row.forEach(cell => {
            if (cell === 2 || cell === 3) totalDots++;
        });
    });
}

// Store original map for reset
const originalMap = JSON.parse(JSON.stringify(map));

// Handle restart
document.addEventListener('keydown', (event) => {
    if ((gameOver || gameWon) && event.code === 'Space') {
        resetGame();
    }
});

// Game loop
function gameLoop(timestamp) {
    // Calculate delta time
    const deltaTime = timestamp - lastFrameTime;
    lastFrameTime = timestamp;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw map
    drawMap();
    
    if (!gameOver && !gameWon) {
        // Update game objects
        updatePacman();
        updateGhosts();
        
        // Draw game objects
        drawPacman();
        ghosts.forEach(ghost => ghost.draw());
    } else if (gameOver) {
        // Draw game over screen
        drawGameOver();
    } else if (gameWon) {
        // Draw game won screen
        drawGameWon();
    }
    
    // Continue game loop
    requestAnimationFrame(gameLoop);
}

// Start the game
function init() {
    // Initialize score
    updateScore();
    
    // Start game loop
    lastFrameTime = performance.now();
    requestAnimationFrame(gameLoop);
}

// Wait for DOM to load
window.addEventListener('load', init);
