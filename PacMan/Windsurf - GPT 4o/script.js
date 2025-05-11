const canvas = document.getElementById('gameCanvas');
const context = canvas.getContext('2d');

const pacman = {
    x: 50,
    y: 50,
    radius: 20,
    speed: 5,
    direction: 0
};

function drawPacman() {
    context.fillStyle = 'yellow';
    context.beginPath();
    context.arc(pacman.x, pacman.y, pacman.radius, 0.2 * Math.PI, 1.8 * Math.PI);
    context.lineTo(pacman.x, pacman.y);
    context.fill();
}

function updatePacman() {
    if (pacman.direction === 0) pacman.x += pacman.speed;
    if (pacman.direction === 1) pacman.y += pacman.speed;
    if (pacman.direction === 2) pacman.x -= pacman.speed;
    if (pacman.direction === 3) pacman.y -= pacman.speed;

    if (pacman.x > canvas.width) pacman.x = 0;
    if (pacman.y > canvas.height) pacman.y = 0;
    if (pacman.x < 0) pacman.x = canvas.width;
    if (pacman.y < 0) pacman.y = canvas.height;
}

function gameLoop() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    drawPacman();
    updatePacman();
    requestAnimationFrame(gameLoop);
}

gameLoop();

window.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight') pacman.direction = 0;
    if (event.key === 'ArrowDown') pacman.direction = 1;
    if (event.key === 'ArrowLeft') pacman.direction = 2;
    if (event.key === 'ArrowUp') pacman.direction = 3;
});
