
"use strict";

/*
=========================================================
 NEURAL//CORE
 Advanced AI Robot Mission Game
=========================================================
*/


// ================================================
// DOM
// ================================================

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const startScreen = document.getElementById("startScreen");
const gameScreen = document.getElementById("gameScreen");
const gameOverScreen = document.getElementById("gameOverScreen");
const victoryScreen = document.getElementById("victoryScreen");

const startButton = document.getElementById("startButton");
const restartButton = document.getElementById("restartButton");
const victoryRestart = document.getElementById("victoryRestart");

const pauseOverlay = document.getElementById("pauseOverlay");
const resumeButton = document.getElementById("resumeButton");

const timerElement = document.getElementById("timer");
const energyText = document.getElementById("energyText");
const shieldText = document.getElementById("shieldText");
const xpText = document.getElementById("xpText");

const energyBar = document.getElementById("energyBar");
const shieldBar = document.getElementById("shieldBar");
const xpBar = document.getElementById("xpBar");

const objectiveElement = document.getElementById("objective");
const objectiveCount = document.getElementById("objectiveCount");
const objectiveTotal = document.getElementById("objectiveTotal");

const threatCount = document.getElementById("threatCount");
const coreCount = document.getElementById("coreCount");
const scoreElement = document.getElementById("score");
const levelElement = document.getElementById("level");

const notification = document.getElementById("notification");


// ================================================
// CANVAS
// ================================================

let width = window.innerWidth;
let height = window.innerHeight;

function resizeCanvas() {

    width = window.innerWidth;
    height = window.innerHeight;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = width * dpr;
    canvas.height = height * dpr;

    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

window.addEventListener("resize", resizeCanvas);

resizeCanvas();


// ================================================
// GAME STATE
// ================================================

const game = {

    running: false,

    paused: false,

    time: 120,

    score: 0,

    xp: 0,

    level: 1,

    energy: 100,

    shield: 100,

    cores: 0,

    collected: 0,

    objectiveTotal: 5,

    missionComplete: false,

    shake: 0,

    lastTime: 0,

    timerAccumulator: 0

};


// ================================================
// PLAYER
// ================================================

const player = {

    x: width / 2,

    y: height / 2,

    radius: 18,

    angle: 0,

    speed: 190,

    boostSpeed: 330,

    vx: 0,

    vy: 0,

    trail: [],

    boost: false,

    invulnerable: 0

};


// ================================================
// INPUT
// ================================================

const keys = {};

window.addEventListener("keydown", (event) => {

    keys[event.key.toLowerCase()] = true;

    if (
        ["arrowup", "arrowdown", "arrowleft", "arrowright", " "]
            .includes(event.key.toLowerCase())
    ) {
        event.preventDefault();
    }

    if (event.key.toLowerCase() === "p") {
        togglePause();
    }
});

window.addEventListener("keyup", (event) => {
    keys[event.key.toLowerCase()] = false;
});


// ================================================
// WORLD
// ================================================

const world = {

    gridSize: 55,

    offsetX: 0,

    offsetY: 0,

    obstacles: [],

    cores: [],

    drones: [],

    particles: [],

    stars: [],

    portals: [],

    scanLines: []
};


// ================================================
// UTILITY
// ================================================

function random(min, max) {
    return Math.random() * (max - min) + min;
}

function randomInt(min, max) {
    return Math.floor(random(min, max + 1));
}

function distance(a, b) {

    return Math.hypot(
        a.x - b.x,
        a.y - b.y
    );
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function formatScore(value) {

    return String(Math.floor(value)).padStart(6, "0");
}


// ================================================
// NOTIFICATION
// ================================================

let notificationTimer;

function showNotification(text) {

    notification.textContent = text;

    notification.classList.add("show");

    clearTimeout(notificationTimer);

    notificationTimer = setTimeout(() => {
        notification.classList.remove("show");
    }, 1800);
}


// ================================================
// WORLD GENERATION
// ================================================

function createWorld() {

    world.obstacles = [];
    world.cores = [];
    world.drones = [];
    world.particles = [];
    world.stars = [];
    world.portals = [];
    world.scanLines = [];

    // Stars

    for (let i = 0; i < 180; i++) {

        world.stars.push({
            x: random(0, width),
            y: random(0, height),
            size: random(0.5, 2),
            alpha: random(0.15, 0.8),
            speed: random(0.1, 0.6)
        });
    }


    // Obstacles

    const obstacleCount =
        16 + game.level * 3;

    for (let i = 0; i < obstacleCount; i++) {

        let obstacle;

        let safe = false;

        let attempts = 0;

        while (!safe && attempts < 100) {

            obstacle = {

                x: random(80, width - 80),

                y: random(100, height - 100),

                w: random(40, 110),

                h: random(30, 90)

            };

            const dx = obstacle.x - player.x;
            const dy = obstacle.y - player.y;

            safe =
                Math.hypot(dx, dy) > 150;

            attempts++;
        }

        if (safe) {
            world.obstacles.push(obstacle);
        }
    }


    // Energy cores

    for (let i = 0; i < game.objectiveTotal; i++) {

        spawnCore();
    }


    // Drones

    const droneCount =
        3 + game.level * 2;

    for (let i = 0; i < droneCount; i++) {

        spawnDrone();
    }


    // Portals

    world.portals.push({

        x: width - 100,

        y: height - 100,

        radius: 35,

        pulse: 0

    });


    // Scan lines

    for (let i = 0; i < 5; i++) {

        world.scanLines.push({
            y: random(0, height),
            speed: random(20, 60)
        });
    }
}


// ================================================
// CORE SPAWN
// ================================================

function spawnCore() {

    let position;

    let valid = false;

    let attempts = 0;

    while (!valid && attempts < 100) {

        position = {

            x: random(70, width - 70),

            y: random(100, height - 70),

            radius: 10,

            pulse: random(0, Math.PI * 2)

        };

        valid = true;

        for (const obstacle of world.obstacles) {

            if (
                position.x >
                    obstacle.x - 25 &&
                position.x <
                    obstacle.x + obstacle.w + 25 &&
                position.y >
                    obstacle.y - 25 &&
                position.y <
                    obstacle.y + obstacle.h + 25
            ) {
                valid = false;
                break;
            }
        }

        attempts++;
    }

    if (valid) {
        world.cores.push(position);
    }
}


// ================================================
// DRONE SPAWN
// ================================================

function spawnDrone() {

    const side = randomInt(0, 3);

    let x;
    let y;

    if (side === 0) {
        x = -30;
        y = random(80, height - 80);
    }

    else if (side === 1) {
        x = width + 30;
        y = random(80, height - 80);
    }

    else if (side === 2) {
        x = random(50, width - 50);
        y = -30;
    }

    else {
        x = random(50, width - 50);
        y = height + 30;
    }

    world.drones.push({

        x,
        y,

        radius: 14,

        speed: random(35, 65) + game.level * 5,

        angle: 0,

        health: 100,

        pulse: random(0, Math.PI * 2),

        orbit: random(0, Math.PI * 2)

    });
}


// ================================================
// PARTICLES
// ================================================

function createParticle(
    x,
    y,
    options = {}
) {

    const particle = {

        x,
        y,

        vx:
            options.vx ??
            random(-50, 50),

        vy:
            options.vy ??
            random(-50, 50),

        life:
            options.life ??
            random(0.4, 1),

        maxLife:
            options.life ??
            random(0.4, 1),

        size:
            options.size ??
            random(1, 4),

        type:
            options.type ??
            "energy"

    };

    world.particles.push(particle);
}


// ================================================
// EXPLOSION
// ================================================

function explosion(
    x,
    y,
    amount = 25
) {

    for (let i = 0; i < amount; i++) {

        createParticle(x, y, {

            vx: random(-160, 160),

            vy: random(-160, 160),

            life: random(0.4, 1.2),

            size: random(1, 4),

            type: "explosion"

        });
    }
}


// ================================================
// RESET GAME
// ================================================

function resetGame() {

    game.running = true;

    game.paused = false;

    game.time = 120;

    game.score = 0;

    game.xp = 0;

    game.level = 1;

    game.energy = 100;

    game.shield = 100;

    game.cores = 0;

    game.collected = 0;

    game.objectiveTotal = 5;

    game.missionComplete = false;

    game.shake = 0;

    player.x = width / 2;

    player.y = height / 2;

    player.vx = 0;

    player.vy = 0;

    player.angle = 0;

    player.trail = [];

    player.invulnerable = 0;

    createWorld();

    updateHUD();

    showNotification("NEURAL CORE INITIALIZED");

    requestAnimationFrame(gameLoop);
}


// ================================================
// START
// ================================================

function startGame() {

    startScreen.classList.remove("active");

    gameOverScreen.classList.remove("active");

    victoryScreen.classList.remove("active");

    gameScreen.classList.add("active");

    resetGame();
}


// ================================================
// PAUSE
// ================================================

function togglePause() {

    if (!game.running) {
        return;
    }

    game.paused = !game.paused;

    pauseOverlay.classList.toggle(
        "active",
        game.paused
    );

    if (!game.paused) {

        game.lastTime = performance.now();

        requestAnimationFrame(gameLoop);
    }
}


// ================================================
// UPDATE PLAYER
// ================================================

function updatePlayer(dt) {

    let dx = 0;
    let dy = 0;

    if (
        keys["w"] ||
        keys["arrowup"]
    ) {
        dy -= 1;
    }

    if (
        keys["s"] ||
        keys["arrowdown"]
    ) {
        dy += 1;
    }

    if (
        keys["a"] ||
        keys["arrowleft"]
    ) {
        dx -= 1;
    }

    if (
        keys["d"] ||
        keys["arrowright"]
    ) {
        dx += 1;
    }

    const magnitude =
        Math.hypot(dx, dy);

    if (magnitude > 0) {

        dx /= magnitude;
        dy /= magnitude;

        player.boost =
            keys["shift"] &&
            game.energy > 0;

        const speed =
            player.boost
                ? player.boostSpeed
                : player.speed;

        player.vx = dx * speed;
        player.vy = dy * speed;

        player.angle =
            Math.atan2(dy, dx);

        if (player.boost) {

            game.energy -=
                18 * dt;

            createParticle(
                player.x -
                    Math.cos(player.angle) *
                    15,
                player.y -
                    Math.sin(player.angle) *
                    15,
                {
                    vx: random(-20, 20),
                    vy: random(-20, 20),
                    life: 0.35,
                    size: random(2, 5),
                    type: "boost"
                }
            );
        }

    } else {

        player.vx *= 0.85;

        player.vy *= 0.85;

        player.boost = false;

    }

    player.x +=
        player.vx * dt;

    player.y +=
        player.vy * dt;


    // Boundaries

    const margin = 30;

    player.x =
        clamp(
            player.x,
            margin,
            width - margin
        );

    player.y =
        clamp(
            player.y,
            90,
            height - 35
        );


    // Obstacle collision

    for (const obstacle of world.obstacles) {

        const nearestX =
            clamp(
                player.x,
                obstacle.x,
                obstacle.x + obstacle.w
            );

        const nearestY =
            clamp(
                player.y,
                obstacle.y,
                obstacle.y + obstacle.h
            );

        const distanceX =
            player.x - nearestX;

        const distanceY =
            player.y - nearestY;

        const distanceSquared =
            distanceX * distanceX +
            distanceY * distanceY;

        if (
            distanceSquared <
            player.radius *
            player.radius
        ) {

            player.x -=
                player.vx * dt;

            player.y -=
                player.vy * dt;

            player.vx *= -0.3;
            player.vy *= -0.3;

            game.shake = 4;
        }
    }


    // Trail

    player.trail.push({

        x: player.x,
        y: player.y,
        life: 0.35

    });

    if (player.trail.length > 30) {
        player.trail.shift();
    }

    for (const point of player.trail) {
        point.life -= dt;
    }


    if (game.energy < 100) {

        game.energy +=
            3 * dt;
    }

    game.energy =
        clamp(
            game.energy,
            0,
            100
        );

    if (player.invulnerable > 0) {
        player.invulnerable -= dt;
    }
}


// ================================================
// UPDATE CORES
// ================================================

function updateCores(dt) {

    for (
        let i = world.cores.length - 1;
        i >= 0;
        i--
    ) {

        const core =
            world.cores[i];

        core.pulse += dt * 4;

        if (
            distance(
                player,
                core
            ) <
            player.radius +
            core.radius +
            5
        ) {

            collectCore(core);

            world.cores.splice(i, 1);

            spawnCore();
        }
    }
}


// ================================================
// COLLECT CORE
// ================================================

function collectCore(core) {

    game.cores++;

    game.collected++;

    game.score += 250;

    game.xp += 150;

    game.energy =
        clamp(
            game.energy + 10,
            0,
            100
        );

    explosion(
        core.x,
        core.y,
        18
    );

    showNotification(
        `ENERGY CORE ACQUIRED +250`
    );

    checkLevel();

    if (
        game.collected >=
        game.objectiveTotal
    ) {

        completeObjective();
    }
}


// ================================================
// OBJECTIVE
// ================================================

function completeObjective() {

    if (game.missionComplete) {
        return;
    }

    game.missionComplete = true;

    game.score += 1000;

    game.xp += 400;

    showNotification(
        "PRIMARY OBJECTIVE COMPLETE"
    );

    setTimeout(() => {

        if (!game.running) {
            return;
        }

        showNotification(
            "REACH THE NEURAL GATE"
        );

    }, 1800);
}


// ================================================
// UPDATE DRONES
// ================================================

function updateDrones(dt) {

    for (const drone of world.drones) {

        drone.pulse += dt * 4;

        const dx =
            player.x - drone.x;

        const dy =
            player.y - drone.y;

        const distanceToPlayer =
            Math.hypot(dx, dy);

        const direction =
            Math.atan2(dy, dx);

        drone.angle =
            direction;


        // Drone movement

        if (distanceToPlayer < 450) {

            drone.x +=
                Math.cos(direction) *
                drone.speed *
                dt;

            drone.y +=
                Math.sin(direction) *
                drone.speed *
                dt;

        } else {

            drone.x +=
                Math.cos(
                    drone.orbit
                ) *
                drone.speed *
                0.3 *
                dt;

            drone.y +=
                Math.sin(
                    drone.orbit
                ) *
                drone.speed *
                0.3 *
                dt;

            drone.orbit +=
                dt * 0.4;
        }


        // Player collision

        if (
            distanceToPlayer <
            player.radius +
            drone.radius
        ) {

            damagePlayer(
                18
            );

            drone.x -=
                Math.cos(direction) *
                50;

            drone.y -=
                Math.sin(direction) *
                50;
        }


        // Remove distant drones

        if (
            drone.x < -200 ||
            drone.x > width + 200 ||
            drone.y < -200 ||
            drone.y > height + 200
        ) {

            drone.x =
                random(50, width - 50);

            drone.y =
                random(100, height - 50);
        }
    }
}


// ================================================
// DAMAGE PLAYER
// ================================================

function damagePlayer(amount) {

    if (player.invulnerable > 0) {
        return;
    }

    game.shield -= amount;

    player.invulnerable = 0.8;

    game.shake = 12;

    explosion(
        player.x,
        player.y,
        8
    );

    showNotification(
        `WARNING: SHIELD -${amount}`
    );

    if (game.shield <= 0) {

        game.shield = 0;

        endGame();
    }
}


// ================================================
// UPDATE PARTICLES
// ================================================

function updateParticles(dt) {

    for (
        let i = world.particles.length - 1;
        i >= 0;
        i--
    ) {

        const particle =
            world.particles[i];

        particle.x +=
            particle.vx * dt;

        particle.y +=
            particle.vy * dt;

        particle.vx *=
            0.98;

        particle.vy *=
            0.98;

        particle.life -= dt;

        if (particle.life <= 0) {

            world.particles.splice(
                i,
                1
            );
        }
    }
}


// ================================================
// TIMER
// ================================================

function updateTimer(dt) {

    game.timerAccumulator += dt;

    if (
        game.timerAccumulator >= 1
    ) {

        game.timerAccumulator = 0;

        game.time--;

        if (game.time <= 0) {

            game.time = 0;

            endGame();
        }
    }
}


// ================================================
// LEVEL SYSTEM
// ================================================

function checkLevel() {

    const requiredXP =
        game.level * 500;

    if (game.xp >= requiredXP) {

        game.xp -= requiredXP;

        game.level++;

        player.speed += 8;

        player.boostSpeed += 10;

        game.shield =
            clamp(
                game.shield + 20,
                0,
                100
            );

        showNotification(
            `LEVEL UP // ${game.level}`
        );
    }
}


// ================================================
// PORTAL
// ================================================

function updatePortal(dt) {

    const portal =
        world.portals[0];

    if (!portal) {
        return;
    }

    portal.pulse += dt * 3;

    if (
        game.missionComplete &&
        distance(
            player,
            portal
        ) <
        player.radius +
        portal.radius
    ) {

        victory();
    }
}


// ================================================
// GAME UPDATE
// ================================================

function update(dt) {

    updatePlayer(dt);

    updateCores(dt);

    updateDrones(dt);

    updateParticles(dt);

    updatePortal(dt);

    updateTimer(dt);

    if (game.shake > 0) {
        game.shake -=
            30 * dt;

        if (game.shake < 0) {
            game.shake = 0;
        }
    }

    updateHUD();
}


// ================================================
// DRAW BACKGROUND
// ================================================

function drawBackground(time) {

    ctx.fillStyle = "#03050c";

    ctx.fillRect(
        0,
        0,
        width,
        height
    );


    // Stars

    for (const star of world.stars) {

        const alpha =
            star.alpha +
            Math.sin(
                time *
                    star.speed
            ) *
            0.15;

        ctx.fillStyle =
            `rgba(150,220,255,${alpha})`;

        ctx.fillRect(
            star.x,
            star.y,
            star.size,
            star.size
        );
    }


    // Grid

    const grid = 55;

    ctx.strokeStyle =
        "rgba(0,217,255,0.055)";

    ctx.lineWidth = 1;

    const offset =
        (time * 8) % grid;

    for (
        let x = -grid + offset;
        x < width + grid;
        x += grid
    ) {

        ctx.beginPath();

        ctx.moveTo(x, 70);

        ctx.lineTo(x, height);

        ctx.stroke();
    }

    for (
        let y = 70 - grid + offset;
        y < height;
        y += grid
    ) {

        ctx.beginPath();

        ctx.moveTo(0, y);

        ctx.lineTo(width, y);

        ctx.stroke();
    }


    // Scan lines

    for (const line of world.scanLines) {

        line.y +=
            line.speed *
            0.016;

        if (line.y > height) {
            line.y = 70;
        }

        ctx.fillStyle =
            "rgba(0,217,255,0.025)";

        ctx.fillRect(
            0,
            line.y,
            width,
            1
        );
    }
}


// ================================================
// DRAW OBSTACLES
// ================================================

function drawObstacles(time) {

    for (const obstacle of world.obstacles) {

        ctx.save();

        ctx.fillStyle =
            "rgba(10,20,38,0.95)";

        ctx.strokeStyle =
            "rgba(0,217,255,0.25)";

        ctx.lineWidth = 1;

        ctx.fillRect(
            obstacle.x,
            obstacle.y,
            obstacle.w,
            obstacle.h
        );

        ctx.strokeRect(
            obstacle.x,
            obstacle.y,
            obstacle.w,
            obstacle.h
        );


        // Animated edge

        const scan =
            (
                time * 60 +
                obstacle.x
            ) %
            obstacle.w;

        ctx.fillStyle =
            "rgba(0,217,255,0.18)";

        ctx.fillRect(
            obstacle.x + scan,
            obstacle.y,
            2,
            obstacle.h
        );


        // Corner markers

        const s = 8;

        ctx.strokeStyle =
            "rgba(139,92,246,0.7)";

        ctx.beginPath();

        ctx.moveTo(
            obstacle.x,
            obstacle.y + s
        );

        ctx.lineTo(
            obstacle.x,
            obstacle.y
        );

        ctx.lineTo(
            obstacle.x + s,
            obstacle.y
        );

        ctx.stroke();

        ctx.beginPath();

        ctx.moveTo(
            obstacle.x +
                obstacle.w -
                s,
            obstacle.y +
                obstacle.h
        );

        ctx.lineTo(
            obstacle.x +
                obstacle.w,
            obstacle.y +
                obstacle.h
        );

        ctx.lineTo(
            obstacle.x +
                obstacle.w,
            obstacle.y +
                obstacle.h -
                s
        );

        ctx.stroke();

        ctx.restore();
    }
}


// ================================================
// DRAW CORES
// ================================================

function drawCores(time) {

    for (const core of world.cores) {

        const pulse =
            Math.sin(core.pulse) * 3;

        ctx.save();

        ctx.translate(
            core.x,
            core.y
        );

        ctx.rotate(
            core.pulse * 0.4
        );


        // Glow

        ctx.shadowBlur = 25;

        ctx.shadowColor =
            "#00d9ff";

        ctx.fillStyle =
            "#00d9ff";

        ctx.beginPath();

        ctx.moveTo(
            0,
            -12 - pulse
        );

        ctx.lineTo(
            9,
            0
        );

        ctx.lineTo(
            0,
            12 + pulse
        );

        ctx.lineTo(
            -9,
            0
        );

        ctx.closePath();

        ctx.fill();


        ctx.shadowBlur = 0;

        ctx.strokeStyle =
            "#ffffff";

        ctx.lineWidth = 1;

        ctx.stroke();


        ctx.restore();
    }
}


// ================================================
// DRAW DRONES
// ================================================

function drawDrones(time) {

    for (const drone of world.drones) {

        const pulse =
            Math.sin(
                drone.pulse
            ) * 2;

        ctx.save();

        ctx.translate(
            drone.x,
            drone.y
        );

        ctx.rotate(
            drone.angle
        );


        // Glow

        ctx.shadowBlur = 18;

        ctx.shadowColor =
            "#ff416c";


        // Main body

        ctx.fillStyle =
            "#160d18";

        ctx.strokeStyle =
            "#ff416c";

        ctx.lineWidth = 2;

        ctx.beginPath();

        ctx.moveTo(18, 0);

        ctx.lineTo(
            -10,
            -12
        );

        ctx.lineTo(
            -17,
            0
        );

        ctx.lineTo(
            -10,
            12
        );

        ctx.closePath();

        ctx.fill();

        ctx.stroke();


        // Core

        ctx.fillStyle =
            "#ff416c";

        ctx.beginPath();

        ctx.arc(
            0,
            0,
            5 + pulse,
            0,
            Math.PI * 2
        );

        ctx.fill();


        // Wings

        ctx.strokeStyle =
            "rgba(255,65,108,0.7)";

        ctx.beginPath();

        ctx.moveTo(-5, -8);
        ctx.lineTo(-16, -18);

        ctx.moveTo(-5, 8);
        ctx.lineTo(-16, 18);

        ctx.stroke();


        ctx.restore();
    }
}


// ================================================
// DRAW PORTAL
// ================================================

function drawPortal(time) {

    const portal =
        world.portals[0];

    if (!portal) {
        return;
    }

    ctx.save();

    ctx.translate(
        portal.x,
        portal.y
    );

    const pulse =
        Math.sin(
            portal.pulse
        ) * 5;

    ctx.shadowBlur = 25;

    ctx.shadowColor =
        game.missionComplete
            ? "#35ff9c"
            : "#6f42c1";

    ctx.strokeStyle =
        game.missionComplete
            ? "#35ff9c"
            : "#6f42c1";

    ctx.lineWidth = 3;

    ctx.beginPath();

    ctx.arc(
        0,
        0,
        portal.radius + pulse,
        0,
        Math.PI * 2
    );

    ctx.stroke();

    ctx.rotate(
        portal.pulse * 0.5
    );

    ctx.beginPath();

    ctx.arc(
        0,
        0,
        portal.radius - 8,
        0,
        Math.PI * 1.5
    );

    ctx.stroke();

    ctx.restore();
}


// ================================================
// DRAW PLAYER
// ================================================

function drawPlayer() {

    function drawPlayer() {

    const now = performance.now() / 1000;

    // ================================================
    // ENERGY TRAIL
    // ================================================

    for (let i = 0; i < player.trail.length; i++) {

        const point = player.trail[i];

        const alpha =
            Math.max(0, point.life / 0.35);

        ctx.save();

        ctx.globalAlpha =
            alpha * 0.45;

        ctx.fillStyle =
            "#00d9ff";

        ctx.shadowBlur =
            15;

        ctx.shadowColor =
            "#00d9ff";

        ctx.beginPath();

        ctx.arc(
            point.x,
            point.y,
            5 * alpha,
            0,
            Math.PI * 2
        );

        ctx.fill();

        ctx.restore();
    }


    // ================================================
    // ANIMATION
    // ================================================

    const pulse =
        Math.sin(now * 5) * 2;

    const hover =
        Math.sin(now * 4) * 2;

    const rotation =
        now * 1.8;


    ctx.save();

    ctx.translate(
        player.x,
        player.y + hover
    );

    ctx.rotate(player.angle);


    // ================================================
    // DAMAGE FLASH
    // ================================================

    if (
        player.invulnerable > 0 &&
        Math.floor(
            player.invulnerable * 12
        ) % 2 === 0
    ) {

        ctx.globalAlpha =
            0.45;
    }


    // ================================================
    // OUTER ENERGY RING
    // ================================================

    ctx.save();

    ctx.rotate(-rotation);

    ctx.strokeStyle =
        "rgba(0,217,255,0.35)";

    ctx.lineWidth =
        2;

    ctx.shadowBlur =
        20;

    ctx.shadowColor =
        "#00d9ff";

    ctx.beginPath();

    ctx.arc(
        0,
        0,
        40 + pulse,
        0,
        Math.PI * 2
    );

    ctx.stroke();


    ctx.strokeStyle =
        "rgba(111,66,193,0.75)";

    ctx.beginPath();

    ctx.arc(
        0,
        0,
        34,
        -0.7,
        1.8
    );

    ctx.stroke();

    ctx.restore();


    // ================================================
    // DIRECTION INDICATOR
    // ================================================

    ctx.strokeStyle =
        "rgba(0,217,255,0.45)";

    ctx.lineWidth =
        1;

    ctx.setLineDash([
        4,
        6
    ]);

    ctx.beginPath();

    ctx.moveTo(
        18,
        0
    );

    ctx.lineTo(
        58,
        0
    );

    ctx.stroke();

    ctx.setLineDash([]);


    // ================================================
    // BOOST FLAME
    // ================================================

    if (player.boost) {

        const flame =
            25 +
            Math.sin(now * 20) * 8;

        ctx.save();

        ctx.shadowBlur =
            30;

        ctx.shadowColor =
            "#00d9ff";

        const gradient =
            ctx.createLinearGradient(
                -10,
                0,
                -flame,
                0
            );

        gradient.addColorStop(
            0,
            "#ffffff"
        );

        gradient.addColorStop(
            0.35,
            "#00d9ff"
        );

        gradient.addColorStop(
            1,
            "rgba(0,217,255,0)"
        );

        ctx.fillStyle =
            gradient;

        ctx.beginPath();

        ctx.moveTo(
            -12,
            -7
        );

        ctx.lineTo(
            -flame,
            0
        );

        ctx.lineTo(
            -12,
            7
        );

        ctx.closePath();

        ctx.fill();

        ctx.restore();
    }


    // ================================================
    // ROBOT BODY
    // ================================================

    ctx.shadowBlur =
        28;

    ctx.shadowColor =
        "#00d9ff";

    ctx.fillStyle =
        "#071522";

    ctx.strokeStyle =
        "#00d9ff";

    ctx.lineWidth =
        2;

    ctx.beginPath();

    ctx.moveTo(
        24,
        0
    );

    ctx.lineTo(
        14,
        -16
    );

    ctx.lineTo(
        4,
        -21
    );

    ctx.lineTo(
        -14,
        -17
    );

    ctx.lineTo(
        -23,
        -7
    );

    ctx.lineTo(
        -23,
        7
    );

    ctx.lineTo(
        -14,
        17
    );

    ctx.lineTo(
        4,
        21
    );

    ctx.lineTo(
        14,
        16
    );

    ctx.closePath();

    ctx.fill();

    ctx.stroke();


    // ================================================
    // INNER ARMOR
    // ================================================

    ctx.shadowBlur =
        0;

    ctx.fillStyle =
        "rgba(0,217,255,0.08)";

    ctx.strokeStyle =
        "rgba(0,217,255,0.45)";

    ctx.lineWidth =
        1;

    ctx.beginPath();

    ctx.moveTo(
        11,
        -10
    );

    ctx.lineTo(
        1,
        -14
    );

    ctx.lineTo(
        -11,
        -11
    );

    ctx.lineTo(
        -16,
        0
    );

    ctx.lineTo(
        -11,
        11
    );

    ctx.lineTo(
        1,
        14
    );

    ctx.lineTo(
        11,
        10
    );

    ctx.closePath();

    ctx.fill();

    ctx.stroke();


    // ================================================
    // LEFT ARM
    // ================================================

    ctx.strokeStyle =
        "#00d9ff";

    ctx.lineWidth =
        3;

    ctx.beginPath();

    ctx.moveTo(
        -10,
        -12
    );

    ctx.lineTo(
        -22,
        -20
    );

    ctx.lineTo(
        -28,
        -15
    );

    ctx.stroke();


    // ================================================
    // RIGHT ARM
    // ================================================

    ctx.beginPath();

    ctx.moveTo(
        -10,
        12
    );

    ctx.lineTo(
        -22,
        20
    );

    ctx.lineTo(
        -28,
        15
    );

    ctx.stroke();


    // ================================================
    // ROBOT HEAD
    // ================================================

    ctx.shadowBlur =
        18;

    ctx.shadowColor =
        "#00d9ff";

    ctx.fillStyle =
        "#101f31";

    ctx.strokeStyle =
        "#ffffff";

    ctx.lineWidth =
        1.5;

    ctx.fillRect(
        -2,
        -11,
        15,
        22
    );

    ctx.strokeRect(
        -2,
        -11,
        15,
        22
    );


    // ================================================
    // ANTENNA
    // ================================================

    ctx.strokeStyle =
        "#00d9ff";

    ctx.lineWidth =
        1.5;

    ctx.beginPath();

    ctx.moveTo(
        5,
        -11
    );

    ctx.lineTo(
        5,
        -19
    );

    ctx.stroke();


    ctx.fillStyle =
        "#35ff9c";

    ctx.shadowBlur =
        15;

    ctx.shadowColor =
        "#35ff9c";

    ctx.beginPath();

    ctx.arc(
        5,
        -21,
        2.5 + pulse * 0.3,
        0,
        Math.PI * 2
    );

    ctx.fill();


    // ================================================
    // AI VISOR
    // ================================================

    ctx.shadowBlur =
        20;

    ctx.shadowColor =
        "#00d9ff";

    ctx.fillStyle =
        "#00d9ff";

    ctx.fillRect(
        2,
        -4,
        10,
        5
    );


    // ================================================
    // VISOR HIGHLIGHT
    // ================================================

    ctx.fillStyle =
        "#ffffff";

    ctx.globalAlpha *=
        0.8;

    ctx.fillRect(
        3,
        -3,
        3,
        1
    );


    // ================================================
    // NEURAL CORE
    // ================================================

    ctx.globalAlpha =
        1;

    ctx.shadowBlur =
        30;

    ctx.shadowColor =
        "#35ff9c";

    ctx.fillStyle =
        "#35ff9c";

    ctx.beginPath();

    ctx.arc(
        -5,
        0,
        5 + pulse * 0.4,
        0,
        Math.PI * 2
    );

    ctx.fill();


    // ================================================
    // CORE CENTER
    // ================================================

    ctx.fillStyle =
        "#ffffff";

    ctx.beginPath();

    ctx.arc(
        -5,
        0,
        2,
        0,
        Math.PI * 2
    );

    ctx.fill();


    // ================================================
    // STATUS LIGHTS
    // ================================================

    ctx.shadowBlur =
        12;

    ctx.shadowColor =
        "#00d9ff";

    ctx.fillStyle =
        "#00d9ff";

    ctx.fillRect(
        -13,
        -4,
        2,
        2
    );

    ctx.fillRect(
        -13,
        2,
        2,
        2
    );


    // ================================================
    // SHIELD ARC
    // ================================================

    ctx.shadowBlur =
        12;

    ctx.shadowColor =
        "#00d9ff";

    ctx.strokeStyle =
        "rgba(0,217,255,0.5)";

    ctx.lineWidth =
        1;

    ctx.beginPath();

    ctx.arc(
        0,
        0,
        29 + pulse,
        -1.2,
        1.2
    );

    ctx.stroke();


    // ================================================
    // BOOST PARTICLES
    // ================================================

    if (player.boost) {

        for (
            let i = 0;
            i < 3;
            i++
        ) {

            const px =
                -20 -
                Math.random() * 18;

            const py =
                (Math.random() - 0.5) * 12;

            ctx.fillStyle =
                "#00d9ff";

            ctx.shadowBlur =
                15;

            ctx.beginPath();

            ctx.arc(
                px,
                py,
                1.5 +
                Math.random() * 2,
                0,
                Math.PI * 2
            );

            ctx.fill();
        }
    }


    ctx.restore();
}

// ================================================
// DRAW PARTICLES
// ================================================

function drawParticles() {

    for (const particle of world.particles) {

        const alpha =
            particle.life /
            particle.maxLife;

        let color;

        if (
            particle.type ===
            "explosion"
        ) {
            color = "255,65,108";
        }

        else if (
            particle.type ===
            "boost"
        ) {
            color = "0,217,255";
        }

        else {
            color = "53,255,156";
        }

        ctx.fillStyle =
            `rgba(${color},${alpha})`;

        ctx.beginPath();

        ctx.arc(
            particle.x,
            particle.y,
            particle.size *
                alpha,
            0,
            Math.PI * 2
        );

        ctx.fill();
    }
}


// ================================================
// DRAW RADAR BLIPS
// ================================================

function drawRadarBlips() {

    // DOM radar is visual only.
    // This function intentionally keeps
    // the actual game rendering separate.
}


// ================================================
// RENDER
// ================================================

function render(time) {

    ctx.save();

    if (game.shake > 0) {

        ctx.translate(
            random(
                -game.shake,
                game.shake
            ),
            random(
                -game.shake,
                game.shake
            )
        );
    }

    drawBackground(time);

    drawObstacles(time);

    drawPortal(time);

    drawCores(time);

    drawDrones(time);

    drawParticles();

    drawPlayer();

    ctx.restore();
}


// ================================================
// GAME LOOP
// ================================================

function gameLoop(timestamp) {

    if (!game.running) {
        return;
    }

    if (game.paused) {
        return;
    }

    if (!game.lastTime) {
        game.lastTime =
            timestamp;
    }

    let dt =
        (timestamp -
            game.lastTime) /
        1000;

    game.lastTime =
        timestamp;

    dt =
        Math.min(
            dt,
            0.05
        );

    update(dt);

    render(
        timestamp / 1000
    );

    if (game.running) {

        requestAnimationFrame(
            gameLoop
        );
    }
}


// ================================================
// HUD
// ================================================

function updateHUD() {

    timerElement.textContent =
        Math.ceil(game.time);

    energyText.textContent =
        `${Math.round(game.energy)}%`;

    shieldText.textContent =
        `${Math.round(game.shield)}%`;

    const xpRequired =
        game.level * 500;

    xpText.textContent =
        `${Math.round(game.xp)} / ${xpRequired}`;

    energyBar.style.width =
        `${game.energy}%`;

    shieldBar.style.width =
        `${game.shield}%`;

    xpBar.style.width =
        `${Math.min(
            100,
            (game.xp /
                xpRequired) *
                100
        )}%`;

    objectiveCount.textContent =
        game.collected;

    objectiveTotal.textContent =
        game.objectiveTotal;

    threatCount.textContent =
        world.drones.length;

    coreCount.textContent =
        game.cores;

    scoreElement.textContent =
        formatScore(
            game.score
        );

    levelElement.textContent =
        String(
            game.level
        ).padStart(2, "0");


    if (
        game.missionComplete
    ) {

        objectiveElement.textContent =
            "REACH THE NEURAL GATE";

    } else {

        objectiveElement.textContent =
            "COLLECT 5 ENERGY CORES";
    }
}


// ================================================
// GAME OVER
// ================================================

function endGame() {

    if (!game.running) {
        return;
    }

    game.running = false;

    document.getElementById(
        "finalScore"
    ).textContent =
        formatScore(
            game.score
        );

    document.getElementById(
        "finalLevel"
    ).textContent =
        game.level;

    document.getElementById(
        "finalCores"
    ).textContent =
        game.cores;

    document.getElementById(
        "finalXP"
    ).textContent =
        Math.floor(game.xp);

    gameScreen.classList.remove(
        "active"
    );

    gameOverScreen.classList.add(
        "active"
    );
}


// ================================================
// VICTORY
// ================================================

function victory() {

    if (!game.running) {
        return;
    }

    game.running = false;

    game.score +=
        Math.floor(
            game.time * 10
        );

    document.getElementById(
        "victoryScore"
    ).textContent =
        formatScore(
            game.score
        );

    gameScreen.classList.remove(
        "active"
    );

    victoryScreen.classList.add(
        "active"
    );
}


// ================================================
// BUTTON EVENTS
// ================================================

startButton.addEventListener(
    "click",
    startGame
);

restartButton.addEventListener(
    "click",
    startGame
);

victoryRestart.addEventListener(
    "click",
    startGame
);

resumeButton.addEventListener(
    "click",
    togglePause
);


// ================================================
// INITIAL STATE
// ================================================

startScreen.classList.add(
    "active"
);

console.log(
    "NEURAL//CORE SYSTEM READY"
);
