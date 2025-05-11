// Game constants
const CELL_SIZE = 16;
const ROWS = 31;
const COLS = 28;
const PACMAN_SPEED = 2;
const GHOST_SPEED = 1.5;
const GHOST_COUNT = 4;

// Game variables
let canvas, ctx;
let score = 0;
let gameRunning = false;
let gameLoop;

// Game objects
let pacman = {
    x: 14 * CELL_SIZE,
    y: 23 * CELL_SIZE,
    radius: CELL_SIZE / 2,
    speed: PACMAN_SPEED,
    direction: { x: 0, y: 0 },
    nextDirection: { x: 0, y: 0 },
    angle: 0.2,
    color: '#FFFF00'
};

let ghosts = [];
let dots = [];
let powerPellets = [];

// Maze layout: 0 = wall, 1 = dot, 2 = empty, 3 = power pellet
const maze = [
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
    [0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0],
    [0, 3, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 3, 0],
    [0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0],
    [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
    [0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0],
    [0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0],
    [0, 1, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 0],
    [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 2, 0, 0, 2, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 2, 0, 0, 2, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1, 0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 0, 0, 1, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1, 0, 0, 2, 0, 0, 0, 2, 2, 0, 0, 0, 2, 0, 0, 1, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1, 0, 0, 2, 0, 2, 2, 2, 2, 2, 2, 0, 2, 0, 0, 1, 0, 0, 0, 0, 0, 0],
    [2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 0, 2, 2, 2, 2, 2, 2, 0, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2],
    [0, 0, 0, 0, 0, 0, 1, 0, 0, 2, 0, 2, 2, 2, 2, 2, 2, 0, 2, 0, 0, 1, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 1, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1, 0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 0, 0, 1, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 1, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 1, 0, 0, 0, 0, 0, 0],
    [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
    [0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0],
    [0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0],
    [0, 3, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 2, 2, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 1, 3, 0],
    [0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0],
    [0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0],
    [0, 1, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 0],
    [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
    [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
    [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
];

// Ghost colors
const ghostColors = ['#FF0000', '#00FFDE', '#FFB8DE', '#FFB847'];

// Initialize the game
function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    // Initialize dots and power pellets
    initializeDots();
    
    // Initialize ghosts
    initializeGhosts();
    
    // Add event listeners
    document.addEventListener('keydown', handleKeyDown);
    document.getElementById('startButton').addEventListener('click', startGame);
    
    // Mobile controls
    document.getElementById('upButton').addEventListener('click', () => setDirection(0, -1));
    document.getElementById('downButton').addEventListener('click', () => setDirection(0, 1));
    document.getElementById('leftButton').addEventListener('click', () => setDirection(-1, 0));
    document.getElementById('rightButton').addEventListener('click', () => setDirection(1, 0));
    
    // Draw the initial state
    drawMaze();
    drawPacman();
    drawGhosts();
}

function initializeDots() {
    dots = [];
    powerPellets = [];
    
    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            if (maze[row][col] === 1) {
                dots.push({
                    x: col * CELL_SIZE + CELL_SIZE / 2,
                    y: row * CELL_SIZE + CELL_SIZE / 2,
                    radius: 2
                });
            } else if (maze[row][col] === 3) {
                powerPellets.push({
                    x: col * CELL_SIZE + CELL_SIZE / 2,
                    y: row * CELL_SIZE + CELL_SIZE / 2,
                    radius: 6
                });
            }
        }
    }
}

function initializeGhosts() {
    ghosts = [];
    
    // Ghost starting positions (center of the maze)
    const startPositions = [
        { x: 13 * CELL_SIZE + CELL_SIZE / 2, y: 14 * CELL_SIZE + CELL_SIZE / 2 },
        { x: 14 * CELL_SIZE + CELL_SIZE / 2, y: 14 * CELL_SIZE + CELL_SIZE / 2 },
        { x: 13 * CELL_SIZE + CELL_SIZE / 2, y: 15 * CELL_SIZE + CELL_SIZE / 2 },
        { x: 14 * CELL_SIZE + CELL_SIZE / 2, y: 15 * CELL_SIZE + CELL_SIZE / 2 }
    ];
    
    for (let i = 0; i < GHOST_COUNT; i++) {
        ghosts.push({
            x: startPositions[i].x,
            y: startPositions[i].y,
            radius: CELL_SIZE / 2,
            speed: GHOST_SPEED,
            direction: { x: 0, y: 0 },
            color: ghostColors[i],
            frightened: false
        });
    }
}

function startGame() {
    if (!gameRunning) {
        gameRunning = true;
        document.getElementById('startButton').textContent = 'Restart Game';
        
        // Reset game state
        score = 0;
        document.getElementById('score').textContent = score;
        
        pacman.x = 14 * CELL_SIZE;
        pacman.y = 23 * CELL_SIZE;
        pacman.direction = { x: 0, y: 0 };
        pacman.nextDirection = { x: 0, y: 0 };
        
        initializeDots();
        initializeGhosts();
        
        // Start the game loop
        if (gameLoop) clearInterval(gameLoop);
        gameLoop = setInterval(update, 1000 / 60); // 60 FPS
    } else {
        // Restart the game
        clearInterval(gameLoop);
        gameRunning = false;
        startGame();
    }
}

function update() {
    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Update pacman position
    updatePacman();
    
    // Update ghosts
    updateGhosts();
    
    // Check for collisions
    checkCollisions();
    
    // Draw everything
    drawMaze();
    drawDots();
    drawPowerPellets();
    drawPacman();
    drawGhosts();
    
    // Check win condition
    if (dots.length === 0 && powerPellets.length === 0) {
        gameWon();
    }
}

function updatePacman() {
    // Try to change direction if there's a pending direction change
    if (pacman.nextDirection.x !== 0 || pacman.nextDirection.y !== 0) {
        const nextX = Math.floor((pacman.x + pacman.nextDirection.x * CELL_SIZE) / CELL_SIZE);
        const nextY = Math.floor((pacman.y + pacman.nextDirection.y * CELL_SIZE) / CELL_SIZE);
        
        // Check if the next position is valid (not a wall)
        if (nextX >= 0 && nextX < COLS && nextY >= 0 && nextY < ROWS && maze[nextY][nextX] !== 0) {
            pacman.direction = { ...pacman.nextDirection };
            pacman.nextDirection = { x: 0, y: 0 };
        }
    }
    
    // Move pacman in the current direction
    const nextX = Math.floor((pacman.x + pacman.direction.x * pacman.speed) / CELL_SIZE);
    const nextY = Math.floor((pacman.y + pacman.direction.y * pacman.speed) / CELL_SIZE);
    
    // Check if the next position is valid (not a wall)
    if (nextX >= 0 && nextX < COLS && nextY >= 0 && nextY < ROWS && maze[nextY][nextX] !== 0) {
        pacman.x += pacman.direction.x * pacman.speed;
        pacman.y += pacman.direction.y * pacman.speed;
    }
    
    // Wrap around the tunnel
    if (pacman.x < 0) {
        pacman.x = canvas.width;
    } else if (pacman.x > canvas.width) {
        pacman.x = 0;
    }
}

function updateGhosts() {
    ghosts.forEach(ghost => {
        // Simple ghost AI: randomly change direction at intersections
        if (Math.random() < 0.02) {
            const possibleDirections = [];
            
            // Check all four directions
            const directions = [
                { x: 1, y: 0 },
                { x: -1, y: 0 },
                { x: 0, y: 1 },
                { x: 0, y: -1 }
            ];
            
            directions.forEach(dir => {
                const nextX = Math.floor((ghost.x + dir.x * CELL_SIZE) / CELL_SIZE);
                const nextY = Math.floor((ghost.y + dir.y * CELL_SIZE) / CELL_SIZE);
                
                if (nextX >= 0 && nextX < COLS && nextY >= 0 && nextY < ROWS && maze[nextY][nextX] !== 0) {
                    // Don't go back in the opposite direction
                    if (!(dir.x === -ghost.direction.x && dir.y === -ghost.direction.y)) {
                        possibleDirections.push(dir);
                    }
                }
            });
            
            if (possibleDirections.length > 0) {
                const randomIndex = Math.floor(Math.random() * possibleDirections.length);
                ghost.direction = possibleDirections[randomIndex];
            }
        }
        
        // Move ghost in the current direction
        const nextX = Math.floor((ghost.x + ghost.direction.x * ghost.speed) / CELL_SIZE);
        const nextY = Math.floor((ghost.y + ghost.direction.y * ghost.speed) / CELL_SIZE);
        
        // Check if the next position is valid (not a wall)
        if (nextX >= 0 && nextX < COLS && nextY >= 0 && nextY < ROWS && maze[nextY][nextX] !== 0) {
            ghost.x += ghost.direction.x * ghost.speed;
            ghost.y += ghost.direction.y * ghost.speed;
        } else {
            // If hitting a wall, try a different direction
            const possibleDirections = [];
            
            // Check all four directions
            const directions = [
                { x: 1, y: 0 },
                { x: -1, y: 0 },
                { x: 0, y: 1 },
                { x: 0, y: -1 }
            ];
            
            directions.forEach(dir => {
                const nextX = Math.floor((ghost.x + dir.x * CELL_SIZE) / CELL_SIZE);
                const nextY = Math.floor((ghost.y + dir.y * CELL_SIZE) / CELL_SIZE);
                
                if (nextX >= 0 && nextX < COLS && nextY >= 0 && nextY < ROWS && maze[nextY][nextX] !== 0) {
                    possibleDirections.push(dir);
                }
            });
            
            if (possibleDirections.length > 0) {
                const randomIndex = Math.floor(Math.random() * possibleDirections.length);
                ghost.direction = possibleDirections[randomIndex];
            }
        }
        
        // Wrap around the tunnel
        if (ghost.x < 0) {
            ghost.x = canvas.width;
        } else if (ghost.x > canvas.width) {
            ghost.x = 0;
        }
    });
}

function checkCollisions() {
    // Check for dot collisions
    for (let i = dots.length - 1; i >= 0; i--) {
        const dot = dots[i];
        const distance = Math.sqrt(Math.pow(pacman.x - dot.x, 2) + Math.pow(pacman.y - dot.y, 2));
        
        if (distance < pacman.radius) {
            dots.splice(i, 1);
            score += 10;
            document.getElementById('score').textContent = score;
        }
    }
    
    // Check for power pellet collisions
    for (let i = powerPellets.length - 1; i >= 0; i--) {
        const pellet = powerPellets[i];
        const distance = Math.sqrt(Math.pow(pacman.x - pellet.x, 2) + Math.pow(pacman.y - pellet.y, 2));
        
        if (distance < pacman.radius) {
            powerPellets.splice(i, 1);
            score += 50;
            document.getElementById('score').textContent = score;
            
            // Make ghosts frightened
            ghosts.forEach(ghost => {
                ghost.frightened = true;
                ghost.color = '#2121ff'; // Blue when frightened
            });
            
            // Reset ghosts after a few seconds
            setTimeout(() => {
                ghosts.forEach((ghost, index) => {
                    ghost.frightened = false;
                    ghost.color = ghostColors[index];
                });
            }, 5000);
        }
    }
    
    // Check for ghost collisions
    ghosts.forEach(ghost => {
        const distance = Math.sqrt(Math.pow(pacman.x - ghost.x, 2) + Math.pow(pacman.y - ghost.y, 2));
        
        if (distance < pacman.radius + ghost.radius) {
            if (ghost.frightened) {
                // Eat the ghost
                ghost.x = 14 * CELL_SIZE;
                ghost.y = 14 * CELL_SIZE;
                ghost.frightened = false;
                ghost.color = ghostColors[ghosts.indexOf(ghost)];
                score += 200;
                document.getElementById('score').textContent = score;
            } else {
                // Game over
                gameOver();
            }
        }
    });
}

function gameOver() {
    clearInterval(gameLoop);
    gameRunning = false;
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#FF0000';
    ctx.font = '36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2);
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '24px Arial';
    ctx.fillText(`Score: ${score}`, canvas.width / 2, canvas.height / 2 + 40);
    
    document.getElementById('startButton').textContent = 'Play Again';
}

function gameWon() {
    clearInterval(gameLoop);
    gameRunning = false;
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#FFFF00';
    ctx.font = '36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('You Win!', canvas.width / 2, canvas.height / 2);
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '24px Arial';
    ctx.fillText(`Score: ${score}`, canvas.width / 2, canvas.height / 2 + 40);
    
    document.getElementById('startButton').textContent = 'Play Again';
}

function drawMaze() {
    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            if (maze[row][col] === 0) {
                ctx.fillStyle = '#2121ff';
                ctx.fillRect(col * CELL_SIZE, row * CELL_SIZE, CELL_SIZE, CELL_SIZE);
            }
        }
    }
}

function drawDots() {
    ctx.fillStyle = '#FFFFFF';
    dots.forEach(dot => {
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, dot.radius, 0, Math.PI * 2);
        ctx.fill();
    });
}

function drawPowerPellets() {
    ctx.fillStyle = '#FFFFFF';
    powerPellets.forEach(pellet => {
        ctx.beginPath();
        ctx.arc(pellet.x, pellet.y, pellet.radius, 0, Math.PI * 2);
        ctx.fill();
    });
}

function drawPacman() {
    ctx.fillStyle = pacman.color;
    ctx.beginPath();
    
    // Calculate mouth angle based on direction
    let startAngle = 0;
    let endAngle = Math.PI * 2;
    
    if (pacman.direction.x === 1) {
        startAngle = pacman.angle;
        endAngle = Math.PI * 2 - pacman.angle;
    } else if (pacman.direction.x === -1) {
        startAngle = Math.PI + pacman.angle;
        endAngle = Math.PI - pacman.angle;
    } else if (pacman.direction.y === 1) {
        startAngle = Math.PI / 2 + pacman.angle;
        endAngle = Math.PI / 2 - pacman.angle + Math.PI;
    } else if (pacman.direction.y === -1) {
        startAngle = Math.PI * 3 / 2 + pacman.angle;
        endAngle = Math.PI * 3 / 2 - pacman.angle + Math.PI;
    } else {
        // Default: facing right
        startAngle = pacman.angle;
        endAngle = Math.PI * 2 - pacman.angle;
    }
    
    ctx.arc(pacman.x, pacman.y, pacman.radius, startAngle, endAngle);
    ctx.lineTo(pacman.x, pacman.y);
    ctx.fill();
}

function drawGhosts() {
    ghosts.forEach(ghost => {
        ctx.fillStyle = ghost.color;
        
        // Draw ghost body
        ctx.beginPath();
        ctx.arc(ghost.x, ghost.y, ghost.radius, Math.PI, 0, false);
        ctx.lineTo(ghost.x + ghost.radius, ghost.y + ghost.radius);
        
        // Draw the wavy bottom
        const waveCount = 3;
        const waveWidth = (ghost.radius * 2) / waveCount;
        
        for (let i = 0; i < waveCount; i++) {
            const xOffset = ghost.x + ghost.radius - (i * waveWidth) - waveWidth / 2;
            ctx.arc(xOffset, ghost.y + ghost.radius, waveWidth / 2, 0, Math.PI, true);
        }
        
        ctx.lineTo(ghost.x - ghost.radius, ghost.y + ghost.radius);
        ctx.lineTo(ghost.x - ghost.radius, ghost.y);
        ctx.fill();
        
        // Draw eyes
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(ghost.x - ghost.radius / 2.5, ghost.y - ghost.radius / 5, ghost.radius / 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(ghost.x + ghost.radius / 2.5, ghost.y - ghost.radius / 5, ghost.radius / 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw pupils
        ctx.fillStyle = '#000000';
        
        // Determine pupil position based on ghost direction
        let pupilOffsetX = 0;
        let pupilOffsetY = 0;
        
        if (ghost.direction.x > 0) pupilOffsetX = ghost.radius / 8;
        if (ghost.direction.x < 0) pupilOffsetX = -ghost.radius / 8;
        if (ghost.direction.y > 0) pupilOffsetY = ghost.radius / 8;
        if (ghost.direction.y < 0) pupilOffsetY = -ghost.radius / 8;
        
        ctx.beginPath();
        ctx.arc(ghost.x - ghost.radius / 2.5 + pupilOffsetX, ghost.y - ghost.radius / 5 + pupilOffsetY, ghost.radius / 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(ghost.x + ghost.radius / 2.5 + pupilOffsetX, ghost.y - ghost.radius / 5 + pupilOffsetY, ghost.radius / 6, 0, Math.PI * 2);
        ctx.fill();
    });
}

function handleKeyDown(event) {
    if (!gameRunning) return;
    
    switch (event.key) {
        case 'ArrowUp':
            setDirection(0, -1);
            break;
        case 'ArrowDown':
            setDirection(0, 1);
            break;
        case 'ArrowLeft':
            setDirection(-1, 0);
            break;
        case 'ArrowRight':
            setDirection(1, 0);
            break;
    }
}

function setDirection(x, y) {
    pacman.nextDirection = { x, y };
}

// Initialize the game when the page loads
window.addEventListener('load', init);