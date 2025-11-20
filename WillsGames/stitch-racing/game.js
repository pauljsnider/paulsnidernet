
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game State
const STATE = {
    MENU: 'MENU',
    CHAR_SELECT: 'CHAR_SELECT',
    RACE: 'RACE',
    RESULTS: 'RESULTS'
};

let currentState = STATE.MENU;
let mode = 1; // 1 or 2 players
let winner = null;

// Assets
const assets = {
    stitch: new Image(),
    red: new Image(),
    trackPattern: new Image()
};
assets.stitch.src = 'assets/stitch-car.svg';
assets.red.src = 'assets/red-car.svg';
assets.trackPattern.src = 'assets/track-pattern.svg';

// Game Objects
class Car {
    constructor(x, y, type, controls) {
        this.x = x;
        this.y = y;
        this.angle = 0;
        this.speed = 0;
        this.maxSpeed = 10; // Increased speed
        this.acceleration = 0.4; // Snappier acceleration
        this.friction = 0.96;
        this.turnSpeed = 0.08;
        this.type = type; // 'stitch' or 'red'
        this.controls = controls;
        this.lap = 0;
        this.checkpoints = [false, false, false, false]; // 4 checkpoints
        this.width = 40;
        this.height = 60;
    }

    update(input) {
        // Monster Smash Style Controls (Directional)
        const SPEED = 10;
        let dx = 0;
        let dy = 0;

        // Input Mapping to Direction
        if (input[this.controls.up]) dy -= 1;
        if (input[this.controls.down]) dy += 1;
        if (input[this.controls.left]) dx -= 1;
        if (input[this.controls.right]) dx += 1;

        // Normalize and Move
        if (dx !== 0 || dy !== 0) {
            const len = Math.hypot(dx, dy);
            dx /= len;
            dy /= len;

            this.x += dx * SPEED;
            this.y += dy * SPEED;

            // Rotate to face direction (smoothly)
            const targetAngle = Math.atan2(dx, -dy); // 0 is Up
            // Shortest angle difference interpolation
            let diff = targetAngle - this.angle;
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;
            this.angle += diff * 0.2;
        }

        // --- Collision Detection ---
        // Track is a rounded rect from 50,50 to 1950,1950
        // Inner hole is 500,500 to 1500,1500

        // Outer Bounds
        if (this.x < 100) this.x = 100;
        if (this.x > 1900) this.x = 1900;
        if (this.y < 100) this.y = 100;
        if (this.y > 1900) this.y = 1900;

        // Inner Bounds (The Hole)
        if (this.x > 500 && this.x < 1500 && this.y > 500 && this.y < 1500) {
            // Push out
            const distLeft = Math.abs(this.x - 500);
            const distRight = Math.abs(this.x - 1500);
            const distTop = Math.abs(this.y - 500);
            const distBottom = Math.abs(this.y - 1500);

            const minDist = Math.min(distLeft, distRight, distTop, distBottom);

            if (minDist === distLeft) this.x = 500;
            else if (minDist === distRight) this.x = 1500;
            else if (minDist === distTop) this.y = 500;
            else if (minDist === distBottom) this.y = 1500;
        }

        // --- Lap System (Counter-Clockwise) ---
        // Start/Finish is Top Center (1000, 200)
        // Direction: Left (<1000) -> Down (>500) -> Right (>1000) -> Up (<500) -> Finish

        // Checkpoint 1: Top Left Corner (x < 500, y < 500)
        if (!this.checkpoints[0] && this.x < 500 && this.y < 500) {
            this.checkpoints[0] = true;
            // console.log('CP 1');
        }
        // Checkpoint 2: Bottom Left Corner (x < 500, y > 1500)
        if (this.checkpoints[0] && !this.checkpoints[1] && this.x < 500 && this.y > 1500) {
            this.checkpoints[1] = true;
            // console.log('CP 2');
        }
        // Checkpoint 3: Bottom Right Corner (x > 1500, y > 1500)
        if (this.checkpoints[1] && !this.checkpoints[2] && this.x > 1500 && this.y > 1500) {
            this.checkpoints[2] = true;
            // console.log('CP 3');
        }
        // Checkpoint 4: Top Right Corner (x > 1500, y < 500)
        if (this.checkpoints[2] && !this.checkpoints[3] && this.x > 1500 && this.y < 500) {
            this.checkpoints[3] = true;
            // console.log('CP 4');
        }

        // Finish Line: Cross x=1000 at y=200 (Top straight, moving Right to Left? No, CCW is Top->Left... wait)
        // CCW: Top(Start) -> Left -> Bottom -> Right -> Top
        // My checkpoints above are: TopLeft -> BottomLeft -> BottomRight -> TopRight.
        // This matches CCW flow if we start at Top Center and go Left.

        // Finish: Crossing x=1000 from Right to Left? Or just being in the zone after CP4.
        if (this.checkpoints[3] && this.x > 900 && this.x < 1100 && this.y < 300) {
            this.lap++;
            this.checkpoints = [false, false, false, false];
            if (this.lap >= 1) {
                endGame(this.type);
            }
        }
    }


    draw(ctx, camera) {
        ctx.save();
        ctx.translate(this.x - camera.x, this.y - camera.y);
        ctx.rotate(this.angle);

        const img = this.type === 'stitch' ? assets.stitch : assets.red;
        if (img.complete) {
            ctx.drawImage(img, -32, -32, 64, 64);
        } else {
            // Fallback
            ctx.fillStyle = this.type === 'stitch' ? '#3B82F6' : '#EF4444';
            ctx.fillRect(-20, -30, 40, 60);
        }

        ctx.restore();
    }
}

let cars = [];
let input = {};
let camera = { x: 0, y: 0 };

// Input Listeners
window.addEventListener('keydown', (e) => {
    input[e.key] = true;
    // Prevent scrolling with arrows
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].indexOf(e.code) > -1) {
        e.preventDefault();
    }
});
window.addEventListener('keyup', (e) => input[e.key] = false);

// Mobile Controls
const mobileBtns = document.querySelectorAll('.d-btn');
mobileBtns.forEach(btn => {
    btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        input[btn.dataset.key] = true;
    });
    btn.addEventListener('touchend', (e) => {
        e.preventDefault();
        input[btn.dataset.key] = false;
    });
    // Mouse support for testing
    btn.addEventListener('mousedown', (e) => {
        input[btn.dataset.key] = true;
    });
    btn.addEventListener('mouseup', (e) => {
        input[btn.dataset.key] = false;
    });
});

// UI Elements
const menuOverlay = document.getElementById('menuOverlay');
const charSelectOverlay = document.getElementById('charSelectOverlay');
const resultsOverlay = document.getElementById('resultsOverlay');
const btn1P = document.getElementById('btn1P');
const btn2P = document.getElementById('btn2P');
const btnStartRace = document.getElementById('btnStartRace');
const btnRestart = document.getElementById('btnRestart');
const btnMenu = document.getElementById('btnMenu');
const mobileControls = document.getElementById('mobileControls');

// Event Handlers
btn1P.addEventListener('click', () => {
    mode = 1;
    menuOverlay.classList.add('hidden');
    charSelectOverlay.classList.remove('hidden');
    mobileControls.classList.remove('hidden'); // Show mobile controls for 1P
});

btn2P.addEventListener('click', () => {
    mode = 2;
    menuOverlay.classList.add('hidden');
    charSelectOverlay.classList.remove('hidden');
    mobileControls.classList.add('hidden'); // Hide mobile controls for 2P
});

let selectedChar = 'stitch';
document.querySelectorAll('.char-card').forEach(card => {
    card.addEventListener('click', () => {
        document.querySelectorAll('.char-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        selectedChar = card.dataset.char;
    });
});

btnStartRace.addEventListener('click', () => {
    charSelectOverlay.classList.add('hidden');
    startRace();
});

btnRestart.addEventListener('click', () => {
    resultsOverlay.classList.add('hidden');
    startRace();
});

btnMenu.addEventListener('click', () => {
    resultsOverlay.classList.add('hidden');
    menuOverlay.classList.remove('hidden');
    currentState = STATE.MENU;
});

function startRace() {
    currentState = STATE.RACE;
    cars = [];

    // P1
    const p1Type = selectedChar;
    cars.push(new Car(1000, 200, p1Type, {
        up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight'
    }));

    // P2 or AI
    if (mode === 2) {
        const p2Type = selectedChar === 'stitch' ? 'red' : 'stitch';
        cars.push(new Car(1100, 200, p2Type, {
            up: 'w', down: 's', left: 'a', right: 'd'
        }));
    } else {
        // AI (Simple implementation: just a car that drives forward and turns)
        // For now, just single player time trial if 1P, or add a dummy car
        // Let's add a dummy rival for 1P
        const rivalType = selectedChar === 'stitch' ? 'red' : 'stitch';
        // Simple AI logic would go here, but for now let's just have 1P be a time trial or solo race
        // User said "2 plays (optional)", so 1P is fine solo.
    }

    // Reset Camera
    camera.x = 1000 - canvas.width / 2;
    camera.y = 200 - canvas.height / 2;
}

function endGame(winnerType) {
    currentState = STATE.RESULTS;
    winner = winnerType;
    document.getElementById('winnerText').innerText =
        (winnerType === 'stitch' ? 'Stitch' : 'Red Rival') + ' Wins!';
    resultsOverlay.classList.remove('hidden');
}

// Render Functions
function drawTrack(ctx, camera) {
    // Draw large background
    ctx.save();
    ctx.translate(-camera.x, -camera.y);

    // Grass/Background
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(0, 0, 2000, 2000);

    // Track Surface
    ctx.fillStyle = '#1E293B';
    // Outer loop
    ctx.beginPath();
    ctx.roundRect(50, 50, 1900, 1900, 100);
    ctx.fill();

    // Inner Island (Grass)
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.roundRect(500, 500, 1000, 1000, 100);
    ctx.fill();

    // Start/Finish Line
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 4; i++) {
        ctx.fillRect(800 + i * 100, 200, 50, 20);
        ctx.fillRect(850 + i * 100, 220, 50, 20);
    }

    // Decor: Neon Borders
    ctx.strokeStyle = '#00f3ff';
    ctx.lineWidth = 5;
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#00f3ff';
    ctx.strokeRect(50, 50, 1900, 1900);

    ctx.strokeStyle = '#ff00ff';
    ctx.shadowColor = '#ff00ff';
    ctx.strokeRect(500, 500, 1000, 1000);

    ctx.restore();
}

function updateCamera() {
    if (cars.length === 0) return;

    let targetX, targetY;

    if (cars.length === 1) {
        targetX = cars[0].x;
        targetY = cars[0].y;
    } else {
        // Midpoint
        targetX = (cars[0].x + cars[1].x) / 2;
        targetY = (cars[0].y + cars[1].y) / 2;
    }

    // Smooth follow
    camera.x += (targetX - canvas.width / 2 - camera.x) * 0.1;
    camera.y += (targetY - canvas.height / 2 - camera.y) * 0.1;

    // Clamp camera to world bounds
    // World is 2000x2000
    // Canvas is 800x600
    camera.x = Math.max(0, Math.min(camera.x, 2000 - canvas.width));
    camera.y = Math.max(0, Math.min(camera.y, 2000 - canvas.height));
}

// Game Loop
function loop() {
    if (currentState === STATE.RACE) {
        cars.forEach(car => car.update(input));
        updateCamera();
    }

    // Clear
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (currentState === STATE.RACE || currentState === STATE.RESULTS) {
        drawTrack(ctx, camera);
        cars.forEach(car => car.draw(ctx, camera));
    }

    requestAnimationFrame(loop);
}

// Start
loop();
