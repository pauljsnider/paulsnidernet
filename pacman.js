// Pacman Game Implementation
document.addEventListener('DOMContentLoaded', function() {
    // Game elements
    const canvas = document.getElementById('pacmanCanvas');
    const ctx = canvas.getContext('2d');
    const startButton = document.getElementById('startGame');
    const resetButton = document.getElementById('resetGame');
    const scoreElement = document.getElementById('score');
    const livesElement = document.getElementById('lives');
    
    // Mobile controls
    const upButton = document.getElementById('upButton');
    const downButton = document.getElementById('downButton');
    const leftButton = document.getElementById('leftButton');
    const rightButton = document.getElementById('rightButton');
    
    // Game constants
    const CELL_SIZE = 30;
    const GRID_WIDTH = 15;
    const GRID_HEIGHT = 15;
    const PACMAN_SPEED = 3;
    const GHOST_SPEED = 2;
    
    // Game variables
    let gameRunning = false;
    let score = 0;
    let lives = 3;
    let animationId;
    
    // Direction constants
    const DIRECTIONS = {
        UP: { x: 0, y: -1 },
        DOWN: { x: 0, y: 1 },
        LEFT: { x: -1, y: 0 },
        RIGHT: { x: 1, y: 0 },
        NONE: { x: 0, y: 0 }
    };
    
    // Game objects
    let pacman = {
        x: CELL_SIZE * 7,
        y: CELL_SIZE * 11,
        radius: CELL_SIZE / 2 - 2,
        direction: DIRECTIONS.NONE,
        nextDirection: DIRECTIONS.NONE,
        speed: PACMAN_SPEED,
        mouthOpen: 0.2,
        mouthDir: 0.1,
        angle: 0
    };
    
    // Ghost colors
    const GHOST_COLORS = ['red', 'pink', 'cyan', 'orange'];
    
    // Create ghosts
    let ghosts = [];
    
    function createGhosts() {
        ghosts = [];
        for (let i = 0; i < 4; i++) {
            ghosts.push({
                x: CELL_SIZE * (6 + i),
                y: CELL_SIZE * 7,
                radius: CELL_SIZE / 2 - 2,
                color: GHOST_COLORS[i],
                direction: getRandomDirection(),
                speed: GHOST_SPEED
            });
        }
    }
    
    // Game map (0: empty, 1: wall, 2: dot)
    let gameMap = [
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 1],
        [1, 2, 1, 1, 2, 1, 2, 1, 2, 1, 2, 1, 1, 2, 1],
        [1, 2, 2, 2, 2, 1, 2, 2, 2, 1, 2, 2, 2, 2, 1],
        [1, 2, 1, 1, 2, 1, 1, 1, 1, 1, 2, 1, 1, 2, 1],
        [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
        [1, 2, 1, 1, 2, 1, 2, 1, 2, 1, 2, 1, 1, 2, 1],
        [1, 2, 1, 1, 2, 1, 2, 1, 2, 1, 2, 1, 1, 2, 1],
        [1, 2, 2, 2, 2, 1, 2, 2, 2, 1, 2, 2, 2, 2, 1],
        [1, 1, 1, 1, 2, 1, 1, 0, 1, 1, 2, 1, 1, 1, 1],
        [0, 0, 0, 1, 2, 1, 0, 0, 0, 1, 2, 1, 0, 0, 0],
        [0, 0, 0, 1, 2, 1, 0, 0, 0, 1, 2, 1, 0, 0, 0],
        [1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1],
        [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
    ];
    
    // Original map for reset
    const originalMap = JSON.parse(JSON.stringify(gameMap));
    
    // Count total dots
    function countDots() {
        let count = 0;
        for (let y = 0; y < GRID_HEIGHT; y++) {
            for (let x = 0; x < GRID_WIDTH; x++) {
                if (gameMap[y][x] === 2) count++;
            }
        }
        return count;
    }
    
    let totalDots = countDots();
    
    // Helper functions
    function getRandomDirection() {
        const dirs = [DIRECTIONS.UP, DIRECTIONS.DOWN, DIRECTIONS.LEFT, DIRECTIONS.RIGHT];
        return dirs[Math.floor(Math.random() * dirs.length)];
    }
    
    function drawWall(x, y) {
        ctx.fillStyle = '#0056b3';
        ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        
        // Add 3D effect
        ctx.fillStyle = '#003366';
        ctx.fillRect(x * CELL_SIZE + 2, y * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4);
    }
    
    function drawDot(x, y) {
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(
            x * CELL_SIZE + CELL_SIZE / 2,
            y * CELL_SIZE + CELL_SIZE / 2,
            CELL_SIZE / 10,
            0,
            Math.PI * 2
        );
        ctx.fill();
    }
    
    function drawPacman() {
        ctx.fillStyle = '#FFFF00';
        ctx.beginPath();
        
        // Calculate mouth angle based on direction
        let startAngle = 0;
        let endAngle = Math.PI * 2;
        
        if (pacman.direction === DIRECTIONS.RIGHT) {
            startAngle = pacman.mouthOpen;
            endAngle = Math.PI * 2 - pacman.mouthOpen;
            pacman.angle = 0;
        } else if (pacman.direction === DIRECTIONS.LEFT) {
            startAngle = Math.PI + pacman.mouthOpen;
            endAngle = Math.PI - pacman.mouthOpen;
            pacman.angle = Math.PI;
        } else if (pacman.direction === DIRECTIONS.UP) {
            startAngle = Math.PI * 1.5 + pacman.mouthOpen;
            endAngle = Math.PI * 1.5 - pacman.mouthOpen;
            pacman.angle = Math.PI * 1.5;
        } else if (pacman.direction === DIRECTIONS.DOWN) {
            startAngle = Math.PI * 0.5 + pacman.mouthOpen;
            endAngle = Math.PI * 0.5 - pacman.mouthOpen;
            pacman.angle = Math.PI * 0.5;
        }
        
        ctx.arc(pacman.x, pacman.y, pacman.radius, startAngle, endAngle);
        ctx.lineTo(pacman.x, pacman.y);
        ctx.fill();
        
        // Draw eye
        ctx.fillStyle = 'black';
        
        // Position the eye based on pacman's direction
        let eyeX = pacman.x;
        let eyeY = pacman.y - pacman.radius / 2;
        
        // Adjust eye position based on direction
        if (pacman.direction === DIRECTIONS.LEFT) {
            eyeX = pacman.x - pacman.radius / 3;
        } else if (pacman.direction === DIRECTIONS.RIGHT) {
            eyeX = pacman.x + pacman.radius / 3;
        } else if (pacman.direction === DIRECTIONS.UP) {
            eyeX = pacman.x + pacman.radius / 3;
            eyeY = pacman.y - pacman.radius / 3;
        } else if (pacman.direction === DIRECTIONS.DOWN) {
            eyeX = pacman.x - pacman.radius / 3;
            eyeY = pacman.y - pacman.radius / 3;
        }
        
        ctx.beginPath();
        ctx.arc(eyeX, eyeY, pacman.radius / 6, 0, Math.PI * 2);
        ctx.fill();
        
        // Animate mouth
        pacman.mouthOpen += pacman.mouthDir;
        if (pacman.mouthOpen > 0.5 || pacman.mouthOpen < 0.1) {
            pacman.mouthDir *= -1;
        }
    }
    
    function drawGhost(ghost) {
        // Ghost body
        ctx.fillStyle = ghost.color;
        ctx.beginPath();
        ctx.arc(ghost.x, ghost.y, ghost.radius, Math.PI, 0, false);
        ctx.lineTo(ghost.x + ghost.radius, ghost.y + ghost.radius);
        
        // Create wavy bottom
        const waveCount = 3;
        const waveWidth = (ghost.radius * 2) / waveCount;
        
        for (let i = 0; i < waveCount; i++) {
            const xOffset = ghost.x + ghost.radius - (i * waveWidth) - waveWidth / 2;
            ctx.arc(xOffset, ghost.y + ghost.radius, waveWidth / 2, 0, Math.PI, true);
        }
        
        ctx.lineTo(ghost.x - ghost.radius, ghost.y + ghost.radius);
        ctx.lineTo(ghost.x - ghost.radius, ghost.y);
        ctx.fill();
        
        // Eyes
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(ghost.x - ghost.radius / 2.5, ghost.y - ghost.radius / 5, ghost.radius / 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(ghost.x + ghost.radius / 2.5, ghost.y - ghost.radius / 5, ghost.radius / 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Pupils
        ctx.fillStyle = 'black';
        
        // Determine pupil position based on ghost direction
        let pupilOffsetX = 0;
        let pupilOffsetY = 0;
        
        if (ghost.direction === DIRECTIONS.LEFT) pupilOffsetX = -2;
        if (ghost.direction === DIRECTIONS.RIGHT) pupilOffsetX = 2;
        if (ghost.direction === DIRECTIONS.UP) pupilOffsetY = -2;
        if (ghost.direction === DIRECTIONS.DOWN) pupilOffsetY = 2;
        
        ctx.beginPath();
        ctx.arc(ghost.x - ghost.radius / 2.5 + pupilOffsetX, ghost.y - ghost.radius / 5 + pupilOffsetY, ghost.radius / 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(ghost.x + ghost.radius / 2.5 + pupilOffsetX, ghost.y - ghost.radius / 5 + pupilOffsetY, ghost.radius / 6, 0, Math.PI * 2);
        ctx.fill();
    }
    
    function drawMap() {
        for (let y = 0; y < GRID_HEIGHT; y++) {
            for (let x = 0; x < GRID_WIDTH; x++) {
                if (gameMap[y][x] === 1) {
                    drawWall(x, y);
                } else if (gameMap[y][x] === 2) {
                    drawDot(x, y);
                }
            }
        }
    }
    
    function canMove(x, y, direction) {
        const nextX = Math.floor((x + direction.x * CELL_SIZE) / CELL_SIZE);
        const nextY = Math.floor((y + direction.y * CELL_SIZE) / CELL_SIZE);
        
        // Check if next position is within bounds
        if (nextX < 0 || nextX >= GRID_WIDTH || nextY < 0 || nextY >= GRID_HEIGHT) {
            return false;
        }
        
        // Check if next position is a wall
        return gameMap[nextY][nextX] !== 1;
    }
    
    function checkCollision(obj1, obj2) {
        const dx = obj1.x - obj2.x;
        const dy = obj1.y - obj2.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < obj1.radius + obj2.radius;
    }
    
    function updatePacman() {
        // Try to change direction if requested
        if (pacman.nextDirection !== DIRECTIONS.NONE) {
            if (canMove(pacman.x, pacman.y, pacman.nextDirection)) {
                pacman.direction = pacman.nextDirection;
                pacman.nextDirection = DIRECTIONS.NONE;
            }
        }
        
        // Move pacman if possible
        if (pacman.direction !== DIRECTIONS.NONE && canMove(pacman.x, pacman.y, pacman.direction)) {
            pacman.x += pacman.direction.x * pacman.speed;
            pacman.y += pacman.direction.y * pacman.speed;
        }
        
        // Check if pacman eats a dot
        const cellX = Math.floor(pacman.x / CELL_SIZE);
        const cellY = Math.floor(pacman.y / CELL_SIZE);
        
        if (cellX >= 0 && cellX < GRID_WIDTH && cellY >= 0 && cellY < GRID_HEIGHT) {
            if (gameMap[cellY][cellX] === 2) {
                gameMap[cellY][cellX] = 0;
                score += 10;
                scoreElement.textContent = score;
                
                // Check if all dots are eaten
                if (--totalDots === 0) {
                    gameWin();
                }
            }
        }
    }
    
    function updateGhosts() {
        ghosts.forEach(ghost => {
            // Check if ghost can continue in current direction
            if (!canMove(ghost.x, ghost.y, ghost.direction)) {
                // Find available directions
                const availableDirections = [];
                for (const dir in DIRECTIONS) {
                    if (dir !== 'NONE' && canMove(ghost.x, ghost.y, DIRECTIONS[dir])) {
                        availableDirections.push(DIRECTIONS[dir]);
                    }
                }
                
                // Choose a random available direction
                if (availableDirections.length > 0) {
                    ghost.direction = availableDirections[Math.floor(Math.random() * availableDirections.length)];
                }
            }
            
            // Move ghost
            ghost.x += ghost.direction.x * ghost.speed;
            ghost.y += ghost.direction.y * ghost.speed;
            
            // Check collision with pacman
            if (checkCollision(ghost, pacman)) {
                handlePacmanDeath();
            }
        });
    }
    
    function handlePacmanDeath() {
        lives--;
        livesElement.textContent = lives;
        
        if (lives <= 0) {
            gameOver();
        } else {
            resetPositions();
        }
    }
    
    function resetPositions() {
        // Reset pacman position
        pacman.x = CELL_SIZE * 7;
        pacman.y = CELL_SIZE * 11;
        pacman.direction = DIRECTIONS.NONE;
        pacman.nextDirection = DIRECTIONS.NONE;
        
        // Reset ghost positions
        createGhosts();
    }
    
    function gameOver() {
        gameRunning = false;
        cancelAnimationFrame(animationId);
        
        // Display game over message
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = 'red';
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2);
        
        ctx.fillStyle = 'white';
        ctx.font = '24px Arial';
        ctx.fillText('Final Score: ' + score, canvas.width / 2, canvas.height / 2 + 40);
    }
    
    function gameWin() {
        gameRunning = false;
        cancelAnimationFrame(animationId);
        
        // Display win message
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = 'gold';
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('YOU WIN!', canvas.width / 2, canvas.height / 2);
        
        ctx.fillStyle = 'white';
        ctx.font = '24px Arial';
        ctx.fillText('Final Score: ' + score, canvas.width / 2, canvas.height / 2 + 40);
    }
    
    function gameLoop() {
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw map
        drawMap();
        
        // Update and draw pacman
        updatePacman();
        drawPacman();
        
        // Update and draw ghosts
        updateGhosts();
        ghosts.forEach(drawGhost);
        
        // Continue game loop
        if (gameRunning) {
            animationId = requestAnimationFrame(gameLoop);
        }
    }
    
    function resetGame() {
        // Reset game variables
        score = 0;
        lives = 3;
        scoreElement.textContent = score;
        livesElement.textContent = lives;
        
        // Reset map
        gameMap = JSON.parse(JSON.stringify(originalMap));
        totalDots = countDots();
        
        // Reset positions
        resetPositions();
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawMap();
        drawPacman();
        ghosts.forEach(drawGhost);
    }
    
    function startGame() {
        if (!gameRunning) {
            gameRunning = true;
            resetGame();
            gameLoop();
        }
    }
    
    // Event listeners
    startButton.addEventListener('click', startGame);
    resetButton.addEventListener('click', function() {
        gameRunning = false;
        cancelAnimationFrame(animationId);
        resetGame();
    });
    
    // Keyboard controls
    document.addEventListener('keydown', function(e) {
        switch (e.key) {
            case 'ArrowUp':
            case 'w':
            case 'W':
                pacman.nextDirection = DIRECTIONS.UP;
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                pacman.nextDirection = DIRECTIONS.DOWN;
                break;
            case 'ArrowLeft':
            case 'a':
            case 'A':
                pacman.nextDirection = DIRECTIONS.LEFT;
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                pacman.nextDirection = DIRECTIONS.RIGHT;
                break;
        }
    });
    
    // Mobile controls
    if (upButton) upButton.addEventListener('click', () => pacman.nextDirection = DIRECTIONS.UP);
    if (downButton) downButton.addEventListener('click', () => pacman.nextDirection = DIRECTIONS.DOWN);
    if (leftButton) leftButton.addEventListener('click', () => pacman.nextDirection = DIRECTIONS.LEFT);
    if (rightButton) rightButton.addEventListener('click', () => pacman.nextDirection = DIRECTIONS.RIGHT);
    
    // Initial setup
    createGhosts();
    drawMap();
    drawPacman();
    ghosts.forEach(drawGhost);
});