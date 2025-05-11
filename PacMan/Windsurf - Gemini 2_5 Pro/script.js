document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    canvas.width = 448; 
    canvas.height = 576;

    const tileSize = 16;
    const rows = canvas.height / tileSize;
    const cols = canvas.width / tileSize;

    // Maze layout: 0 = empty, 1 = wall
    const map = [
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,1,1,1,1,0,1,1,1,1,1,0,1,1,0,1,1,1,1,1,0,1,1,1,1,0,1],
        [1,0,1,1,1,1,0,1,1,1,1,1,0,1,1,0,1,1,1,1,1,0,1,1,1,1,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,1,1,1,1,0,1,1,0,1,1,1,1,1,1,1,1,0,1,1,0,1,1,1,1,0,1],
        [1,0,0,0,0,0,0,1,1,0,0,0,0,1,1,0,0,0,0,1,1,0,0,0,0,0,0,1],
        [1,1,1,1,1,1,0,1,1,1,1,1,0,1,1,0,1,1,1,1,1,0,1,1,1,1,1,1],
        [0,0,0,0,0,1,0,1,1,0,0,0,0,0,0,0,0,0,0,1,1,0,1,0,0,0,0,0], 
        [1,1,1,1,1,1,0,1,1,0,1,1,1,0,0,1,1,1,0,1,1,0,1,1,1,1,1,1],
        [1,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,1],
        [1,1,1,1,1,1,0,1,1,0,1,0,0,0,0,0,0,1,0,1,1,0,1,1,1,1,1,1],
        [0,0,0,0,0,1,0,1,1,0,1,0,1,1,1,1,0,1,0,1,1,0,1,0,0,0,0,0], 
        [1,1,1,1,1,1,0,1,1,0,1,0,1,1,1,1,0,1,0,1,1,0,1,1,1,1,1,1],
        [1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1],
        [1,0,1,1,1,1,0,1,1,1,1,1,0,1,1,0,1,1,1,1,1,0,1,1,1,1,0,1],
        [1,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1],
        [1,1,1,0,1,1,0,1,1,0,1,1,1,1,1,1,1,1,0,1,1,0,1,1,0,1,1,1],
        [1,0,0,0,1,1,0,1,1,0,1,1,1,1,1,1,1,1,0,1,1,0,1,1,0,0,0,1],
        [1,0,1,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,1,0,1,0,1],
        [1,0,1,1,1,1,0,1,1,1,1,1,0,1,1,0,1,1,1,1,1,0,1,1,1,1,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    ];

    const pacman = {
        x: 1, // Starting column
        y: 1, // Starting row
        radius: tileSize / 2 - 2,
        speed: 1, // Tiles per move (adjust for desired speed, may need finer control later)
        dx: 0, // Change in x per move
        dy: 0,  // Change in y per move
        nextDx: 0, // Intended next dx
        nextDy: 0  // Intended next dy
    };

    function canMove(x, y) {
        if (x < 0 || x >= cols || y < 0 || y >= rows) {
            return false; // Out of bounds
        }
        return map[y][x] === 0; // Check if target tile is an empty space
    }

    function drawMaze() {
        for (let r = 0; r < rows; r++) { // Iterate over all canvas rows
            for (let c = 0; c < cols; c++) {
                // Ensure we don't try to access map[r] if r >= map.length
                if (r < map.length && map[r][c] === 1) { // Wall
                    ctx.fillStyle = 'blue';
                    ctx.fillRect(c * tileSize, r * tileSize, tileSize, tileSize);
                } else { // Empty or other
                    // No need to draw if background is already black
                }
            }
        }
    }

    console.log('Pac-Man game initialized');

    function updatePacmanPosition() {
        let newX = pacman.x;
        let newY = pacman.y;

        // Attempt to apply next intended direction
        if (pacman.nextDx !== 0 || pacman.nextDy !== 0) {
            if (canMove(pacman.x + pacman.nextDx, pacman.y + pacman.nextDy)) {
                pacman.dx = pacman.nextDx;
                pacman.dy = pacman.nextDy;
            } 
        }

        // Try to continue in current direction
        newX = pacman.x + pacman.dx;
        newY = pacman.y + pacman.dy;

        if (canMove(newX, newY)) {
            pacman.x = newX;
            pacman.y = newY;
        } else {
            // If current path is blocked, stop
            pacman.dx = 0;
            pacman.dy = 0;
        }
    }

    function drawPacman() {
        ctx.beginPath();
        // Calculate pixel position from grid position
        const pixelX = pacman.x * tileSize + tileSize / 2;
        const pixelY = pacman.y * tileSize + tileSize / 2;
        ctx.arc(pixelX, pixelY, pacman.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'yellow';
        ctx.fill();
        ctx.closePath();
    }

    let lastMoveTime = 0;
    const moveInterval = 200; // Milliseconds between moves, adjust for speed

    function gameLoop(currentTime) {
        requestAnimationFrame(gameLoop);
        const deltaTime = currentTime - lastMoveTime;

        if (deltaTime > moveInterval) {
            lastMoveTime = currentTime - (deltaTime % moveInterval);
            
            updatePacmanPosition();
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'black';
        ctx.fillRect(0,0, canvas.width, canvas.height);

        drawMaze();
        drawPacman();
    }

    document.addEventListener('keydown', (e) => {
        switch (e.key) {
            case 'ArrowUp':
                pacman.nextDx = 0;
                pacman.nextDy = -pacman.speed;
                break;
            case 'ArrowDown':
                pacman.nextDx = 0;
                pacman.nextDy = pacman.speed;
                break;
            case 'ArrowLeft':
                pacman.nextDx = -pacman.speed;
                pacman.nextDy = 0;
                break;
            case 'ArrowRight':
                pacman.nextDx = pacman.speed;
                pacman.nextDy = 0;
                break;
        }
    });

    gameLoop(0); // Start the game loop, pass initial time
});
