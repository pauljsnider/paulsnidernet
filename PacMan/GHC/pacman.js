// Simple Pac-Man Game
document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  
  // Adjust canvas to fill available space
  canvas.width = Math.min(448, window.innerWidth - 20);
  canvas.height = Math.min(496, window.innerHeight - 20);
  
  const tileSize = Math.floor(canvas.width / 28); // Adjust tile size based on canvas width
  
  // Game state
  let score = 0;
  let dotsEaten = 0;
  let totalDots = 0;
  
  const map = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,1,1,0,1,1,1,1,0,1,1,0,1,1,1,1,0,1,1,1,1,0,1,0,1],
    [1,0,1,1,1,1,0,1,1,1,1,0,1,1,0,1,1,1,1,0,1,1,1,1,0,1,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,1,1,0,1,1,0,1,1,1,1,1,1,0,1,1,0,1,1,1,1,0,1,0,1],
    [1,0,0,0,0,0,0,1,1,0,0,0,1,1,0,0,0,1,1,0,0,0,0,0,0,1,0,1],
    [1,1,1,1,1,1,0,1,1,1,1,0,1,1,0,1,1,1,1,0,1,1,1,1,1,1,0,1],
    [1,1,1,1,1,1,0,1,1,0,0,0,0,0,0,0,0,1,1,0,1,1,1,1,1,1,0,1],
    [1,1,1,1,1,1,0,1,1,0,1,1,0,0,1,1,0,1,1,0,1,1,1,1,1,1,0,1],
    [0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0],
    [1,1,1,1,1,1,0,1,1,0,1,1,1,1,1,1,0,1,1,0,1,1,1,1,1,1,0,1],
    [1,1,1,1,1,1,0,1,1,0,0,0,0,0,0,0,0,1,1,0,1,1,1,1,1,1,0,1],
    [1,1,1,1,1,1,0,1,1,0,1,1,1,1,1,1,0,1,1,0,1,1,1,1,1,1,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,1,1,0,1,1,1,1,0,1,1,0,1,1,1,1,0,1,1,1,1,0,1,0,1],
    [1,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,1,0,1],
    [1,1,1,0,1,1,0,1,1,0,1,1,1,1,1,1,0,1,1,0,1,1,0,1,1,1,0,1],
    [1,0,0,0,0,0,0,1,1,0,0,0,1,1,0,0,0,1,1,0,0,0,0,0,0,1,0,1],
    [1,0,1,1,1,1,1,1,1,1,1,0,1,1,0,1,1,1,1,1,1,1,1,1,0,1,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
  ];
  
  // Count total dots
  for (let y = 0; y < map.length; y++) {
    for (let x = 0; x < map[y].length; x++) {
      if (map[y][x] === 0) totalDots++;
    }
  }
  
  // Create dot status array (1 = dot present, 0 = dot eaten)
  const dots = map.map(row => row.map(cell => cell === 0 ? 1 : 0));
  
  const pacman = {
    x: 14,
    y: 17,
    dx: 0,
    dy: 0,
    radius: tileSize / 2 - 2,
    mouthAngle: 0.2,
    mouthDirection: 1,
    speed: 0.1,  // Slower speed
    lastMove: 0
  };
  
  // Ghost class
  class Ghost {
    constructor(x, y, color) {
      this.x = x;
      this.y = y;
      this.dx = 0;
      this.dy = 0;
      this.color = color;
      this.speed = 0.07;
      this.lastMove = 0;
      this.lastDirection = Math.floor(Math.random() * 4);
    }
    
    draw() {
      // Draw ghost body
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(
        this.x * tileSize + tileSize/2,
        this.y * tileSize + tileSize/2 - tileSize/4,
        tileSize/2,
        Math.PI, 0, false
      );
      ctx.rect(
        this.x * tileSize,
        this.y * tileSize + tileSize/4,
        tileSize,
        tileSize/2
      );
      ctx.fill();
      
      // Draw eyes
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(
        this.x * tileSize + tileSize/3,
        this.y * tileSize + tileSize/3,
        tileSize/6,
        0, 2 * Math.PI
      );
      ctx.arc(
        this.x * tileSize + 2*tileSize/3,
        this.y * tileSize + tileSize/3,
        tileSize/6,
        0, 2 * Math.PI
      );
      ctx.fill();
      
      // Draw pupils
      ctx.fillStyle = 'black';
      ctx.beginPath();
      ctx.arc(
        this.x * tileSize + tileSize/3 + this.dx*tileSize/8,
        this.y * tileSize + tileSize/3 + this.dy*tileSize/8,
        tileSize/10,
        0, 2 * Math.PI
      );
      ctx.arc(
        this.x * tileSize + 2*tileSize/3 + this.dx*tileSize/8,
        this.y * tileSize + tileSize/3 + this.dy*tileSize/8,
        tileSize/10,
        0, 2 * Math.PI
      );
      ctx.fill();
    }
    
    move() {
      const now = Date.now();
      if (now - this.lastMove < 1000 / 60) return;
      this.lastMove = now;
      
      // Simple AI: randomly change direction or follow pacman
      const directions = [
        {dx: 0, dy: -1}, // up
        {dx: 0, dy: 1},  // down
        {dx: -1, dy: 0}, // left
        {dx: 1, dy: 0}   // right
      ];
      
      // Occasionally try to move toward pacman
      if (Math.random() < 0.3) {
        if (pacman.x < this.x) this.lastDirection = 2;
        else if (pacman.x > this.x) this.lastDirection = 3;
        else if (pacman.y < this.y) this.lastDirection = 0;
        else if (pacman.y > this.y) this.lastDirection = 1;
      } 
      // Otherwise try random direction
      else if (Math.random() < 0.1) {
        this.lastDirection = Math.floor(Math.random() * 4);
      }
      
      // Try to move in the current direction
      let dir = directions[this.lastDirection];
      let newX = this.x + dir.dx * this.speed;
      let newY = this.y + dir.dy * this.speed;
      
      // Check if movement is valid - ensure ghost stays in paths (0)
      const tileX = Math.floor(newX);
      const tileY = Math.floor(newY);
      
      // Make sure ghosts stay in the paths
      if (map[tileY] && map[tileY][tileX] === 0) {
        this.x = newX;
        this.y = newY;
        this.dx = dir.dx;
        this.dy = dir.dy;
      } else {
        // If can't move, try another direction
        this.lastDirection = Math.floor(Math.random() * 4);
      }
      
      // Handle tunnel
      if (this.x < 0) this.x = map[0].length - 1;
      if (this.x >= map[0].length) this.x = 0;
    }
    
    checkCollision() {
      const distance = Math.sqrt(
        Math.pow(this.x - pacman.x, 2) + 
        Math.pow(this.y - pacman.y, 2)
      );
      return distance < 0.8;
    }
  }
  
  // Create ghosts - position them in the paths (black areas)
  const ghosts = [
    new Ghost(14, 10, 'red'),
    new Ghost(13, 10, 'pink'),
    new Ghost(12, 10, 'cyan'),
    new Ghost(15, 10, 'orange')
  ];
  
  function drawMap() {
    for (let y = 0; y < map.length; y++) {
      for (let x = 0; x < map[y].length; x++) {
        if (map[y][x] === 1) {
          ctx.fillStyle = '#00F';
          ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
        } else {
          ctx.fillStyle = '#111';
          ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
          
          // Draw dot if not eaten
          if (dots[y][x] === 1) {
            ctx.fillStyle = '#FF0';
            ctx.beginPath();
            ctx.arc(x * tileSize + tileSize/2, y * tileSize + tileSize/2, tileSize/6, 0, 2 * Math.PI);
            ctx.fill();
          }
        }
      }
    }
  }
  
  function drawPacman() {
    ctx.fillStyle = 'yellow';
    ctx.beginPath();
    
    // Animate mouth
    pacman.mouthAngle += 0.05 * pacman.mouthDirection;
    if (pacman.mouthAngle > 0.3 || pacman.mouthAngle < 0.05) {
      pacman.mouthDirection *= -1;
    }
    
    // Calculate mouth angle based on direction
    let startAngle = 0;
    let endAngle = 2 * Math.PI;
    
    if (pacman.dx === -1) {
      startAngle = Math.PI + pacman.mouthAngle;
      endAngle = Math.PI - pacman.mouthAngle;
    } else if (pacman.dx === 1) {
      startAngle = pacman.mouthAngle;
      endAngle = 2 * Math.PI - pacman.mouthAngle;
    } else if (pacman.dy === -1) {
      startAngle = 1.5 * Math.PI + pacman.mouthAngle;
      endAngle = 1.5 * Math.PI - pacman.mouthAngle;
    } else if (pacman.dy === 1) {
      startAngle = 0.5 * Math.PI + pacman.mouthAngle;
      endAngle = 0.5 * Math.PI - pacman.mouthAngle;
    } else {
      // Default direction (right) if not moving
      startAngle = pacman.mouthAngle;
      endAngle = 2 * Math.PI - pacman.mouthAngle;
    }
    
    ctx.arc(
      pacman.x * tileSize + tileSize/2,
      pacman.y * tileSize + tileSize/2,
      pacman.radius,
      startAngle,
      endAngle
    );
    ctx.lineTo(pacman.x * tileSize + tileSize/2, pacman.y * tileSize + tileSize/2);
    ctx.fill();
  }
  
  function drawScore() {
    ctx.fillStyle = 'white';
    ctx.font = '16px Arial';
    ctx.fillText(`Score: ${score}`, 10, 20);
  }
  
  function movePacman() {
    const now = Date.now();
    if (now - pacman.lastMove < 1000 / 60) return;
    pacman.lastMove = now;
    
    const newX = pacman.x + pacman.dx * pacman.speed;
    const newY = pacman.y + pacman.dy * pacman.speed;
    
    // Check if movement is valid - ensure we're strictly in a path (0) tile
    const tileX = Math.floor(newX);
    const tileY = Math.floor(newY);
    
    // Check if the entire Pac-Man body would be in a valid position
    // This prevents Pac-Man from partially entering walls
    const nextTileX = pacman.dx > 0 ? Math.ceil(newX + pacman.radius/tileSize) : Math.floor(newX - pacman.radius/tileSize);
    const nextTileY = pacman.dy > 0 ? Math.ceil(newY + pacman.radius/tileSize) : Math.floor(newY - pacman.radius/tileSize);
    
    if (map[tileY] && map[tileY][tileX] === 0 && 
        map[nextTileY] && map[nextTileY][tileX] === 0 && 
        map[tileY] && map[tileY][nextTileX] === 0) {
      pacman.x = newX;
      pacman.y = newY;
      
      // Check if pacman ate a dot
      if (dots[tileY][tileX] === 1) {
        dots[tileY][tileX] = 0;
        score += 10;
        dotsEaten++;
      }
    }
    
    // Handle tunnel
    if (pacman.x < 0) pacman.x = map[0].length - 1;
    if (pacman.x >= map[0].length) pacman.x = 0;
  }
  
  function checkGameOver() {
    // Check ghost collision
    for (const ghost of ghosts) {
      if (ghost.checkCollision()) {
        return true;
      }
    }
    
    // Check win condition
    if (dotsEaten >= totalDots - 4) { // Leave a few dots for simplicity
      return true;
    }
    
    return false;
  }
  
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp')    { pacman.dx = 0; pacman.dy = -1; }
    if (e.key === 'ArrowDown')  { pacman.dx = 0; pacman.dy = 1; }
    if (e.key === 'ArrowLeft')  { pacman.dx = -1; pacman.dy = 0; }
    if (e.key === 'ArrowRight') { pacman.dx = 1; pacman.dy = 0; }
  });
  
  let gameOver = false;
  
  function gameLoop() {
    if (!gameOver) {
      movePacman();
      
      // Move ghosts
      for (const ghost of ghosts) {
        ghost.move();
      }
      
      // Check game over
      gameOver = checkGameOver();
      
      // Clear and redraw
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawMap();
      drawPacman();
      
      // Draw ghosts
      for (const ghost of ghosts) {
        ghost.draw();
      }
      
      drawScore();
      
      requestAnimationFrame(gameLoop);
    } else {
      // Game over screen
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'white';
      ctx.font = '30px Arial';
      ctx.textAlign = 'center';
      
      if (dotsEaten >= totalDots - 4) {
        ctx.fillText('You Win!', canvas.width/2, canvas.height/2);
      } else {
        ctx.fillText('Game Over', canvas.width/2, canvas.height/2);
      }
      
      ctx.font = '20px Arial';
      ctx.fillText(`Score: ${score}`, canvas.width/2, canvas.height/2 + 40);
      ctx.fillText('Press Space to Restart', canvas.width/2, canvas.height/2 + 80);
    }
  }
  
  // Restart game on space press
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && gameOver) {
      window.location.reload();
    }
  });
  
  gameLoop();
});