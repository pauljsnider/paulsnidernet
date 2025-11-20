(() => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const scoreEl = document.getElementById('scoreValue');
    const leavesEl = document.getElementById('leavesValue');
    const statusPanel = document.getElementById('statusPanel');
    const statusTitle = document.getElementById('statusTitle');
    const restartButton = document.getElementById('restartButton');
    const touchControls = document.getElementById('touchControls');
    const holdTimers = new Map();

    // Game State
    const state = {
        playing: false,
        score: 0,
        leavesTotal: 0,
        leavesShot: 0,
        lastTime: 0,
        message: 'Ready?'
    };

    // Inputs
    const inputs = {
        up: false,
        down: false,
        left: false,
        right: false,
        shoot: false
    };

    // Crosshair
    const crosshair = {
        x: canvas.width / 2,
        y: canvas.height / 2,
        speed: 0.4,
        radius: 20
    };

    // Entities
    let leaves = [];
    let branches = [];

    // Configuration
    const COLORS = ['#d90429', '#ef233c', '#ffba08', '#e85d04', '#dc2f02'];
    const GRAVITY = 0.002;
    const WIND = 0.0005;

    // --- Initialization ---

    function init() {
        resizeCanvas();
        generateTree();
        setupEvents();
        startSeason();
    }

    function resizeCanvas() {
        // Fixed size for now
    }

    function startSeason() {
        state.playing = true;
        state.score = 0;
        state.leavesShot = 0;
        state.lastTime = 0;

        resetLeaves();
        hideStatus();
        updateUI();

        requestAnimationFrame(gameLoop);
    }

    function generateTree() {
        branches = [];
        const startX = canvas.width / 2;
        const startY = canvas.height;
        const length = 140;
        const angle = -Math.PI / 2;

        // Root branch
        growBranch(startX, startY, length, angle, 12, null);
    }

    function growBranch(x, y, len, angle, width, parent) {
        const endX = x + Math.cos(angle) * len;
        const endY = y + Math.sin(angle) * len;

        const branch = { x, y, endX, endY, width, parent, children: [] };
        branches.push(branch);
        if (parent) {
            parent.children.push(branch);
        }

        if (len < 15) return;

        const subLen = len * 0.75;
        const subWidth = width * 0.7;

        growBranch(endX, endY, subLen, angle - 0.3, subWidth, branch);
        growBranch(endX, endY, subLen, angle + 0.3, subWidth, branch);

        if (Math.random() > 0.6) {
            growBranch(endX, endY, subLen, angle + (Math.random() - 0.5) * 0.5, subWidth, branch);
        }
    }

    function resetLeaves() {
        leaves = [];
        branches.forEach(branch => {
            if (branch.width < 4) {
                const count = Math.floor(Math.random() * 3) + 1;
                for (let i = 0; i < count; i++) {
                    const leaf = createLeaf(branch.endX, branch.endY);
                    leaf.parentBranch = branch; // Link leaf to branch
                    leaves.push(leaf);
                }
            }
        });
        state.leavesTotal = leaves.length;
    }

    function createLeaf(x, y) {
        const offsetX = (Math.random() - 0.5) * 40;
        const offsetY = (Math.random() - 0.5) * 40;
        return {
            x: x + offsetX,
            y: y + offsetY,
            vx: 0,
            vy: 0,
            rotation: Math.random() * Math.PI * 2,
            vRot: 0,
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
            size: 8 + Math.random() * 6,
            state: 'attached', // attached, falling, landed
            swayOffset: Math.random() * 100,
            swaySpeed: 0.002 + Math.random() * 0.003
        };
    }

    // --- Game Loop ---

    function gameLoop(timestamp) {
        if (!state.playing) {
            draw();
            return;
        }

        if (!state.lastTime) state.lastTime = timestamp;
        const dt = timestamp - state.lastTime;
        state.lastTime = timestamp;

        update(dt);
        draw();

        if (state.playing) {
            requestAnimationFrame(gameLoop);
        }
    }

    function update(dt) {
        handleCrosshair(dt);
        updateLeaves(dt);
        checkWinCondition();
    }

    function handleCrosshair(dt) {
        let dx = 0;
        let dy = 0;

        if (inputs.left) dx -= 1;
        if (inputs.right) dx += 1;
        if (inputs.up) dy -= 1;
        if (inputs.down) dy += 1;

        if (dx !== 0 || dy !== 0) {
            const len = Math.hypot(dx, dy);
            const speed = crosshair.speed * dt;
            crosshair.x += (dx / len) * speed;
            crosshair.y += (dy / len) * speed;
        }

        crosshair.x = Math.max(0, Math.min(canvas.width, crosshair.x));
        crosshair.y = Math.max(0, Math.min(canvas.height, crosshair.y));
    }

    function updateLeaves(dt) {
        leaves.forEach(leaf => {
            if (leaf.state === 'attached') {
                const time = Date.now() * leaf.swaySpeed + leaf.swayOffset;
                leaf.x += Math.sin(time) * 0.2;
                leaf.rotation += Math.cos(time) * 0.01;
            } else if (leaf.state === 'falling') {
                leaf.vy += GRAVITY * dt;
                leaf.x += Math.sin(Date.now() * 0.005) * 0.5 + WIND * dt;
                leaf.y += leaf.vy * dt;
                leaf.rotation += leaf.vRot * dt;

                // Check for ground collision
                // Simple ground check: bottom of screen minus some offset for snow
                // Using the curve approximation from drawGround:
                // ctx.bezierCurveTo(w*0.3, h-60, w*0.6, h-20, w, h-50);
                // Let's just use a simple threshold for now, or maybe a bit of randomness
                const groundY = canvas.height - 30 + Math.random() * 20;

                if (leaf.y > groundY) {
                    leaf.y = groundY;
                    leaf.state = 'landed';
                    leaf.rotation = Math.PI / 2 + (Math.random() - 0.5); // Lay flat-ish
                }
            }
        });
    }

    function checkWinCondition() {
        // 1. All leaves must be shot
        if (state.leavesShot < state.leavesTotal) return;

        // 2. No leaves should be falling
        const anyFalling = leaves.some(l => l.state === 'falling');
        if (anyFalling) return;

        // If we get here, all leaves are shot and none are falling (all landed)
        endGame('All Clear!');
    }

    function endGame(msg) {
        state.playing = false;
        state.message = msg;
        showStatus(msg);
    }

    // --- Actions ---

    function shoot() {
        if (!state.playing) return;

        let hit = false;

        // 1. Check Leaves
        for (let i = leaves.length - 1; i >= 0; i--) {
            const leaf = leaves[i];
            if (leaf.state === 'attached') {
                const dx = leaf.x - crosshair.x;
                const dy = leaf.y - crosshair.y;
                const dist = Math.hypot(dx, dy);

                if (dist < leaf.size + 10) {
                    hitLeaf(leaf);
                    hit = true;
                    break;
                }
            }
        }

        // 2. Check Branches (if no leaf hit)
        if (!hit) {
            for (const branch of branches) {
                if (checkBranchHit(branch, crosshair.x, crosshair.y)) {
                    shakeBranch(branch);
                    hit = true;
                    break;
                }
            }
        }
    }

    function checkBranchHit(branch, cx, cy) {
        // Simple line segment distance check
        const A = { x: branch.x, y: branch.y };
        const B = { x: branch.endX, y: branch.endY };
        const P = { x: cx, y: cy };

        const len2 = dist2(A, B);
        if (len2 === 0) return dist2(P, A) < (branch.width + 10) ** 2;

        let t = ((P.x - A.x) * (B.x - A.x) + (P.y - A.y) * (B.y - A.y)) / len2;
        t = Math.max(0, Math.min(1, t));

        const proj = { x: A.x + t * (B.x - A.x), y: A.y + t * (B.y - A.y) };
        const d2 = dist2(P, proj);

        return d2 < (branch.width + 15) ** 2; // Generous hitbox
    }

    function dist2(v, w) {
        return (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
    }

    function shakeBranch(targetBranch) {
        // Find all leaves attached to this branch or its children
        const branchesToShake = [targetBranch];
        const allChildBranches = getAllChildren(targetBranch);
        branchesToShake.push(...allChildBranches);

        let count = 0;
        leaves.forEach(leaf => {
            if (leaf.state === 'attached' && branchesToShake.includes(leaf.parentBranch)) {
                hitLeaf(leaf);
                count++;
            }
        });

        if (count > 0) {
            // Bonus points for branch clear?
            state.score += count * 50;
        }
    }

    function getAllChildren(branch) {
        let children = [...branch.children];
        branch.children.forEach(child => {
            children.push(...getAllChildren(child));
        });
        return children;
    }

    function hitLeaf(leaf) {
        if (leaf.state !== 'attached') return;
        leaf.state = 'falling';
        leaf.vy = -0.1;
        leaf.vRot = (Math.random() - 0.5) * 0.02;
        state.score += 100;
        state.leavesShot++;
        updateUI();
    }

    // --- Drawing ---

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw Snow/Ground
        drawGround();

        // Draw Tree
        ctx.strokeStyle = '#4a3b32';
        ctx.lineCap = 'round';
        branches.forEach(b => {
            ctx.lineWidth = b.width;
            ctx.beginPath();
            ctx.moveTo(b.x, b.y);
            ctx.lineTo(b.endX, b.endY);
            ctx.stroke();
        });

        // Draw Leaves
        leaves.forEach(leaf => {
            // Draw all leaves, including landed ones

            ctx.save();
            ctx.translate(leaf.x, leaf.y);
            ctx.rotate(leaf.rotation);
            ctx.fillStyle = leaf.color;

            ctx.beginPath();
            ctx.ellipse(0, 0, leaf.size, leaf.size / 2, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = 'rgba(0,0,0,0.2)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(-leaf.size, 0);
            ctx.lineTo(leaf.size, 0);
            ctx.stroke();

            ctx.restore();
        });

        drawCrosshair();
    }

    function drawGround() {
        ctx.save();
        ctx.fillStyle = '#f0f8ff'; // AliceBlue snow
        ctx.beginPath();
        ctx.moveTo(0, canvas.height);
        ctx.lineTo(0, canvas.height - 40);
        // Simple snowy hills
        ctx.bezierCurveTo(
            canvas.width * 0.3, canvas.height - 60,
            canvas.width * 0.6, canvas.height - 20,
            canvas.width, canvas.height - 50
        );
        ctx.lineTo(canvas.width, canvas.height);
        ctx.fill();
        ctx.restore();
    }

    function drawCrosshair() {
        const { x, y, radius } = crosshair;
        ctx.save();
        ctx.translate(x, y);

        ctx.strokeStyle = '#d90429';
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#d90429';
        ctx.beginPath();
        ctx.arc(0, 0, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(0, -radius - 5);
        ctx.lineTo(0, -radius + 5);
        ctx.moveTo(0, radius - 5);
        ctx.lineTo(0, radius + 5);
        ctx.moveTo(-radius - 5, 0);
        ctx.lineTo(-radius + 5, 0);
        ctx.moveTo(radius - 5, 0);
        ctx.lineTo(radius + 5, 0);
        ctx.stroke();

        ctx.restore();
    }

    // --- UI & Events ---

    function updateUI() {
        scoreEl.textContent = state.score;
        leavesEl.textContent = state.leavesTotal - state.leavesShot;
    }

    function showStatus(msg) {
        statusTitle.textContent = msg;
        statusPanel.classList.add('active');
    }

    function hideStatus() {
        statusPanel.classList.remove('active');
    }

    function setupEvents() {
        canvas.addEventListener('mousemove', e => {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            crosshair.x = (e.clientX - rect.left) * scaleX;
            crosshair.y = (e.clientY - rect.top) * scaleY;
        });

        canvas.addEventListener('mousedown', () => {
            shoot();
        });

        window.addEventListener('keydown', e => {
            switch (e.key) {
                case 'w': case 'ArrowUp': inputs.up = true; break;
                case 's': case 'ArrowDown': inputs.down = true; break;
                case 'a': case 'ArrowLeft': inputs.left = true; break;
                case 'd': case 'ArrowRight': inputs.right = true; break;
                case ' ': shoot(); break;
                case 'r': case 'R': startSeason(); break;
            }
        });

        window.addEventListener('keyup', e => {
            switch (e.key) {
                case 'w': case 'ArrowUp': inputs.up = false; break;
                case 's': case 'ArrowDown': inputs.down = false; break;
                case 'a': case 'ArrowLeft': inputs.left = false; break;
                case 'd': case 'ArrowRight': inputs.right = false; break;
            }
        });

        restartButton.addEventListener('click', startSeason);

        setupTouchControls();
    }

    function setupTouchControls() {
        if (!touchControls) return;

        canvas.addEventListener('touchstart', e => e.preventDefault(), { passive: false });

        const buttons = touchControls.querySelectorAll('.control-btn');
        buttons.forEach(btn => {
            const action = btn.dataset.action;

            const start = (e) => {
                e.preventDefault();
                if (action === 'shoot') {
                    shoot();
                } else {
                    handleInput(action, true);
                }
            };

            const end = (e) => {
                e.preventDefault();
                if (action !== 'shoot') {
                    handleInput(action, false);
                }
            };

            btn.addEventListener('touchstart', start, { passive: false });
            btn.addEventListener('touchend', end, { passive: false });
            btn.addEventListener('mousedown', start);
            btn.addEventListener('mouseup', end);
            btn.addEventListener('mouseleave', end);
        });
    }

    function handleInput(action, pressed) {
        switch (action) {
            case 'move-up': inputs.up = pressed; break;
            case 'move-down': inputs.down = pressed; break;
            case 'move-left': inputs.left = pressed; break;
            case 'move-right': inputs.right = pressed; break;
        }
    }

    init();
})();
