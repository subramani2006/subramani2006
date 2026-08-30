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

    const dpr =
        Math.min(
            window.devicePixelRatio || 1,
            2
        );

    canvas.width =
        width * dpr;

    canvas.height =
        height * dpr;

    canvas.style.width =
        `${width}px`;

    canvas.style.height =
        `${height}px`;

    ctx.setTransform(
        dpr,
        0,
        0,
        dpr,
        0,
        0
    );
}

window.addEventListener(
    "resize",
    resizeCanvas
);

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

window.addEventListener(
    "keydown",
    (event) => {

        keys[
            event.key.toLowerCase()
        ] = true;

        if (
            [
                "arrowup",
                "arrowdown",
                "arrowleft",
                "arrowright",
                " "
            ].includes(
                event.key.toLowerCase()
            )
        ) {
            event.preventDefault();
        }

        if (
            event.key.toLowerCase() === "p"
        ) {
            togglePause();
        }
    }
);

window.addEventListener(
    "keyup",
    (event) => {

        keys[
            event.key.toLowerCase()
        ] = false;
    }
);


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

    return Math.random() *
        (max - min) +
        min;
}


function randomInt(min, max) {

    return Math.floor(
        random(min, max + 1)
    );
}


function distance(a, b) {

    return Math.hypot(
        a.x - b.x,
        a.y - b.y
    );
}


function clamp(
    value,
    min,
    max
) {

    return Math.max(
        min,
        Math.min(max, value)
    );
}


function formatScore(value) {

    return String(
        Math.floor(value)
    ).padStart(
        6,
        "0"
    );
}


// ================================================
// NOTIFICATION
// ================================================

let notificationTimer;


function showNotification(text) {

    notification.textContent =
        text;

    notification.classList.add(
        "show"
    );

    clearTimeout(
        notificationTimer
    );

    notificationTimer =
        setTimeout(() => {

            notification.classList.remove(
                "show"
            );

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


    // ============================================
    // STARS
    // ============================================

    for (
        let i = 0;
        i < 180;
        i++
    ) {

        world.stars.push({

            x:
                random(
                    0,
                    width
                ),

            y:
                random(
                    0,
                    height
                ),

            size:
                random(
                    0.5,
                    2
                ),

            alpha:
                random(
                    0.15,
                    0.8
                ),

            speed:
                random(
                    0.1,
                    0.6
                )
        });
    }


    // ============================================
    // OBSTACLES
    // ============================================

    const obstacleCount =
        16 +
        game.level * 3;

    for (
        let i = 0;
        i < obstacleCount;
        i++
    ) {

        let obstacle;

        let safe = false;

        let attempts = 0;

        while (
            !safe &&
            attempts < 100
        ) {

            obstacle = {

                x:
                    random(
                        80,
                        width - 80
                    ),

                y:
                    random(
                        100,
                        height - 100
                    ),

                w:
                    random(
                        40,
                        110
                    ),

                h:
                    random(
                        30,
                        90
                    )
            };


            const dx =
                obstacle.x -
                player.x;

            const dy =
                obstacle.y -
                player.y;


            safe =
                Math.hypot(
                    dx,
                    dy
                ) > 150;

            attempts++;
        }


        if (safe) {

            world.obstacles.push(
                obstacle
            );
        }
    }


    // ============================================
    // ENERGY CORES
    // ============================================

    for (
        let i = 0;
        i < game.objectiveTotal;
        i++
    ) {

        spawnCore();
    }


    // ============================================
    // DRONES
    // ============================================

    const droneCount =
        3 +
        game.level * 2;

    for (
        let i = 0;
        i < droneCount;
        i++
    ) {

        spawnDrone();
    }


    // ============================================
    // PORTAL
    // ============================================

    world.portals.push({

        x:
            width - 100,

        y:
            height - 100,

        radius:
            35,

        pulse:
            0
    });


    // ============================================
    // SCAN LINES
    // ============================================

    for (
        let i = 0;
        i < 5;
        i++
    ) {

        world.scanLines.push({

            y:
                random(
                    0,
                    height
                ),

            speed:
                random(
                    20,
                    60
                )
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


    while (
        !valid &&
        attempts < 100
    ) {

        position = {

            x:
                random(
                    70,
                    width - 70
                ),

            y:
                random(
                    100,
                    height - 70
                ),

            radius:
                10,

            pulse:
                random(
                    0,
                    Math.PI * 2
                )
        };


        valid = true;


        for (
            const obstacle
            of world.obstacles
        ) {

            if (

                position.x >
                    obstacle.x - 25 &&

                position.x <
                    obstacle.x +
                    obstacle.w +
                    25 &&

                position.y >
                    obstacle.y - 25 &&

                position.y <
                    obstacle.y +
                    obstacle.h +
                    25

            ) {

                valid = false;

                break;
            }
        }


        attempts++;
    }


    if (valid) {

        world.cores.push(
            position
        );
    }
}


// ================================================
// DRONE SPAWN
// ================================================

function spawnDrone() {

    const side =
        randomInt(
            0,
            3
        );

    let x;
    let y;


    if (side === 0) {

        x = -30;

        y =
            random(
                80,
                height - 80
            );
    }


    else if (side === 1) {

        x =
            width + 30;

        y =
            random(
                80,
                height - 80
            );
    }


    else if (side === 2) {

        x =
            random(
                50,
                width - 50
            );

        y = -30;
    }


    else {

        x =
            random(
                50,
                width - 50
            );

        y =
            height + 30;
    }


    world.drones.push({

        x,

        y,

        radius:
            14,

        speed:
            random(
                35,
                65
            ) +
            game.level * 5,

        angle:
            0,

        health:
            100,

        pulse:
            random(
                0,
                Math.PI * 2
            ),

        orbit:
            random(
                0,
                Math.PI * 2
            )
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
            random(
                -50,
                50
            ),

        vy:
            options.vy ??
            random(
                -50,
                50
            ),

        life:
            options.life ??
            random(
                0.4,
                1
            ),

        maxLife:
            options.life ??
            random(
                0.4,
                1
            ),

        size:
            options.size ??
            random(
                1,
                4
            ),

        type:
            options.type ??
            "energy"
    };


    world.particles.push(
        particle
    );
}


// ================================================
// EXPLOSION
// ================================================

function explosion(
    x,
    y,
    amount = 25
) {

    for (
        let i = 0;
        i < amount;
        i++
    ) {

        createParticle(
            x,
            y,
            {

                vx:
                    random(
                        -160,
                        160
                    ),

                vy:
                    random(
                        -160,
                        160
                    ),

                life:
                    random(
                        0.4,
                        1.2
                    ),

                size:
                    random(
                        1,
                        4
                    ),

                type:
                    "explosion"
            }
        );
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

    game.timerAccumulator = 0;


    player.x =
        width / 2;

    player.y =
        height / 2;

    player.vx = 0;

    player.vy = 0;

    player.angle = 0;

    player.trail = [];

    player.boost = false;

    player.invulnerable = 0;


    createWorld();

    updateHUD();

    showNotification(
        "NEURAL CORE INITIALIZED"
    );


    requestAnimationFrame(
        gameLoop
    );
}


// ================================================
// START GAME
// ================================================

function startGame() {

    startScreen.classList.remove(
        "active"
    );

    gameOverScreen.classList.remove(
        "active"
    );

    victoryScreen.classList.remove(
        "active"
    );

    gameScreen.classList.add(
        "active"
    );


    resetGame();


    /*
     IMPORTANT:
     resetGame() already starts
     the animation loop.

     We therefore do NOT call
     requestAnimationFrame() here.
    */

    game.running = true;

    game.paused = false;

    game.lastTime =
        performance.now();
}


// ================================================
// PAUSE
// ================================================

function togglePause() {

    if (!game.running) {

        return;
    }


    game.paused =
        !game.paused;


    pauseOverlay.classList.toggle(
        "active",
        game.paused
    );


    if (!game.paused) {

        game.lastTime =
            performance.now();

        requestAnimationFrame(
            gameLoop
        );
    }
}


// ================================================
// RESUME BUTTON
// ================================================

if (resumeButton) {

    resumeButton.addEventListener(
        "click",
        () => {

            if (game.paused) {

                togglePause();
            }
        }
    );
}


// ================================================
// START / RESTART BUTTONS
// ================================================

if (startButton) {

    startButton.addEventListener(
        "click",
        startGame
    );
}


if (restartButton) {

    restartButton.addEventListener(
        "click",
        startGame
    );
}


if (victoryRestart) {

    victoryRestart.addEventListener(
        "click",
        startGame
    );
}


// ================================================
// UPDATE PLAYER
// ================================================

function updatePlayer(dt) {

    let dx = 0;
    let dy = 0;


    // Keyboard movement

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


    // Normalize diagonal movement

    if (dx !== 0 || dy !== 0) {

        const length =
            Math.hypot(
                dx,
                dy
            );

        dx /= length;
        dy /= length;
    }


    // Boost

    player.boost =
        keys["shift"] &&
        game.energy > 0 &&
        (dx !== 0 || dy !== 0);


    const currentSpeed =
        player.boost
            ? player.boostSpeed
            : player.speed;


    // Energy consumption

    if (player.boost) {

        game.energy -=
            25 * dt;

        game.energy =
            clamp(
                game.energy,
                0,
                100
            );
    }

    else {

        game.energy +=
            8 * dt;

        game.energy =
            clamp(
                game.energy,
                0,
                100
            );
    }


    // Smooth velocity

    const targetVX =
        dx * currentSpeed;

    const targetVY =
        dy * currentSpeed;


    const acceleration =
        10 * dt;


    player.vx +=
        (targetVX - player.vx) *
        acceleration;

    player.vy +=
        (targetVY - player.vy) *
        acceleration;


    // Stop when no movement

    if (dx === 0 && dy === 0) {

        player.vx *=
            Math.max(
                0,
                1 - 12 * dt
            );

        player.vy *=
            Math.max(
                0,
                1 - 12 * dt
            );
    }


    const nextX =
        player.x +
        player.vx * dt;

    const nextY =
        player.y +
        player.vy * dt;


    // ============================================
    // OBSTACLE COLLISION
    // ============================================

    let blockedX = false;
    let blockedY = false;


    for (
        const obstacle
        of world.obstacles
    ) {

        const nearestX =
            clamp(
                nextX,
                obstacle.x,
                obstacle.x +
                    obstacle.w
            );

        const nearestY =
            clamp(
                nextY,
                obstacle.y,
                obstacle.y +
                    obstacle.h
            );


        const distanceX =
            nextX -
            nearestX;

        const distanceY =
            nextY -
            nearestY;


        const distanceSquared =
            distanceX * distanceX +
            distanceY * distanceY;


        if (
            distanceSquared <
            player.radius *
            player.radius
        ) {

            blockedX = true;
            blockedY = true;

            if (
                Math.abs(
                    distanceX
                ) >
                Math.abs(
                    distanceY
                )
            ) {

                blockedY = false;
            }

            else {

                blockedX = false;
            }

            break;
        }
    }


    if (!blockedX) {

        player.x =
            nextX;
    }

    else {

        player.vx = 0;
    }


    if (!blockedY) {

        player.y =
            nextY;
    }

    else {

        player.vy = 0;
    }


    // ============================================
    // WORLD BOUNDS
    // ============================================

    player.x =
        clamp(
            player.x,
            player.radius,
            width -
                player.radius
        );

    player.y =
        clamp(
            player.y,
            player.radius + 65,
            height -
                player.radius
        );


    // ============================================
    // ROTATION
    // ============================================

    if (
        Math.abs(player.vx) >
            1 ||
        Math.abs(player.vy) >
            1
    ) {

        const targetAngle =
            Math.atan2(
                player.vy,
                player.vx
            );

        let difference =
            targetAngle -
            player.angle;


        while (
            difference >
            Math.PI
        ) {
            difference -=
                Math.PI * 2;
        }


        while (
            difference <
            -Math.PI
        ) {
            difference +=
                Math.PI * 2;
        }


        player.angle +=
            difference *
            Math.min(
                1,
                dt * 10
            );
    }


    // ============================================
    // TRAIL
    // ============================================

    const moving =
        Math.abs(player.vx) >
            5 ||
        Math.abs(player.vy) >
            5;


    if (moving || player.boost) {

        player.trail.push({

            x:
                player.x,

            y:
                player.y,

            life:
                player.boost
                    ? 0.45
                    : 0.30
        });
    }


    for (
        let i =
            player.trail.length - 1;
        i >= 0;
        i--
    ) {

        player.trail[i].life -=
            dt;

        if (
            player.trail[i].life <= 0
        ) {

            player.trail.splice(
                i,
                1
            );
        }
    }


    if (
        player.trail.length > 35
    ) {

        player.trail.splice(
            0,
            player.trail.length - 35
        );
    }


    // ============================================
    // INVULNERABILITY
    // ============================================

    if (
        player.invulnerable > 0
    ) {

        player.invulnerable -=
            dt;
    }


    // ============================================
    // COLLECT CORES
    // ============================================

    for (
        let i =
            world.cores.length - 1;
        i >= 0;
        i--
    ) {

        const core =
            world.cores[i];


        if (
            distance(
                player,
                core
            ) <
            player.radius +
            core.radius +
            8
        ) {

            collectCore(
                i
            );
        }
    }
}


// ================================================
// COLLECT CORE
// ================================================

function collectCore(index) {

    const core =
        world.cores[index];


    explosion(
        core.x,
        core.y,
        18
    );


    game.cores++;

    game.collected++;

    game.score +=
        100;

    game.xp +=
        100;


    world.cores.splice(
        index,
        1
    );


    showNotification(
        `ENERGY CORE ACQUIRED ${game.cores}/${game.objectiveTotal}`
    );


    // Restore a little energy

    game.energy =
        clamp(
            game.energy + 12,
            0,
            100
        );


    checkLevelUp();


    // Mission complete

    if (
        game.cores >=
        game.objectiveTotal
    ) {

        completeMission();
    }
}


// ================================================
// LEVEL UP
// ================================================

function checkLevelUp() {

    const requiredXP =
        game.level * 250;


    if (
        game.xp >=
        requiredXP
    ) {

        game.xp -=
            requiredXP;

        game.level++;


        game.score +=
            250;


        showNotification(
            `LEVEL ${game.level} REACHED`
        );


        // Add stronger threats

        spawnDrone();

        spawnDrone();


        // Add more particles

        explosion(
            player.x,
            player.y,
            35
        );
    }
}


// ================================================
// UPDATE DRONES
// ================================================

function updateDrones(dt) {

    for (
        const drone
        of world.drones
    ) {

        drone.pulse +=
            dt * 4;

        drone.orbit +=
            dt * 1.5;


        const dx =
            player.x -
            drone.x;

        const dy =
            player.y -
            drone.y;


        const distanceToPlayer =
            Math.hypot(
                dx,
                dy
            );


        if (
            distanceToPlayer >
            0
        ) {

            const nx =
                dx /
                distanceToPlayer;

            const ny =
                dy /
                distanceToPlayer;


            const orbitAmount =
                Math.sin(
                    drone.orbit
                ) *
                0.35;


            const moveX =
                nx -
                ny *
                orbitAmount;

            const moveY =
                ny +
                nx *
                orbitAmount;


            drone.x +=
                moveX *
                drone.speed *
                dt;

            drone.y +=
                moveY *
                drone.speed *
                dt;


            drone.angle =
                Math.atan2(
                    dy,
                    dx
                );
        }


        // ========================================
        // WORLD BOUNDS
        // ========================================

        drone.x =
            clamp(
                drone.x,
                -60,
                width + 60
            );

        drone.y =
            clamp(
                drone.y,
                40,
                height + 60
            );


        // ========================================
        // PLAYER COLLISION
        // ========================================

        if (
            distance(
                player,
                drone
            ) <
            player.radius +
            drone.radius
        ) {

            damagePlayer(
                18
            );


            // Push drone away

            const pushX =
                drone.x -
                player.x;

            const pushY =
                drone.y -
                player.y;

            const pushLength =
                Math.hypot(
                    pushX,
                    pushY
                ) || 1;


            drone.x +=
                (pushX /
                    pushLength) *
                25;

            drone.y +=
                (pushY /
                    pushLength) *
                25;
        }


        // ========================================
        // DRONE PARTICLES
        // ========================================

        if (
            Math.random() <
            dt * 5
        ) {

            createParticle(
                drone.x,
                drone.y,
                {

                    vx:
                        random(
                            -15,
                            15
                        ),

                    vy:
                        random(
                            -15,
                            15
                        ),

                    life:
                        random(
                            0.2,
                            0.5
                        ),

                    size:
                        random(
                            1,
                            2
                        ),

                    type:
                        "drone"
                }
            );
        }
    }
}


// ================================================
// DAMAGE PLAYER
// ================================================

function damagePlayer(amount) {

    if (
        player.invulnerable >
        0
    ) {

        return;
    }


    player.invulnerable =
        0.8;


    game.shield -=
        amount;


    game.shield =
        clamp(
            game.shield,
            0,
            100
        );


    game.shake =
        10;


    explosion(
        player.x,
        player.y,
        12
    );


    showNotification(
        `SHIELD IMPACT -${amount}`
    );


    if (
        game.shield <= 0
    ) {

        gameOver();
    }
}


// ================================================
// UPDATE CORES
// ================================================

function updateCores(dt) {

    for (
        const core
        of world.cores
    ) {

        core.pulse +=
            dt * 5;
    }
}


// ================================================
// UPDATE PARTICLES
// ================================================

function updateParticles(dt) {

    for (
        let i =
            world.particles.length - 1;
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
            Math.pow(
                0.08,
                dt
            );

        particle.vy *=
            Math.pow(
                0.08,
                dt
            );


        particle.life -=
            dt;


        if (
            particle.life <= 0
        ) {

            world.particles.splice(
                i,
                1
            );
        }
    }
}


// ================================================
// UPDATE STARS
// ================================================

function updateStars(dt) {

    for (
        const star
        of world.stars
    ) {

        star.alpha +=
            Math.sin(
                performance.now() *
                0.001 *
                star.speed
            ) *
            dt *
            0.2;
    }
}


// ================================================
// UPDATE SCAN LINES
// ================================================

function updateScanLines(dt) {

    for (
        const line
        of world.scanLines
    ) {

        line.y +=
            line.speed *
            dt;


        if (
            line.y >
            height
        ) {

            line.y =
                60;
        }
    }
}


// ================================================
// UPDATE PORTALS
// ================================================

function updatePortals(dt) {

    for (
        const portal
        of world.portals
    ) {

        portal.pulse +=
            dt * 3;
    }
}


// ================================================
// COMPLETE MISSION
// ================================================

function completeMission() {

    if (
        game.missionComplete
    ) {

        return;
    }


    game.missionComplete =
        true;

    game.score +=
        1000;

    game.xp +=
        500;


    game.running =
        false;


    explosion(
        player.x,
        player.y,
        80
    );


    setTimeout(
        () => {

            gameScreen.classList.remove(
                "active"
            );

            victoryScreen.classList.add(
                "active"
            );

            updateFinalScore();

        },
        800
    );
}


// ================================================
// GAME OVER
// ================================================

function gameOver() {

    if (
        !game.running
    ) {

        return;
    }


    game.running =
        false;


    game.paused =
        false;


    pauseOverlay.classList.remove(
        "active"
    );


    explosion(
        player.x,
        player.y,
        60
    );


    setTimeout(
        () => {

            gameScreen.classList.remove(
                "active"
            );

            gameOverScreen.classList.add(
                "active"
            );


            updateFinalScore();

        },
        500
    );
}


// ================================================
// FINAL SCORE
// ================================================

function updateFinalScore() {

    const elements =
        document.querySelectorAll(
            "[data-final-score]"
        );


    elements.forEach(
        element => {

            element.textContent =
                formatScore(
                    game.score
                );
        }
    );
}

// ================================================
// DRAW BACKGROUND
// ================================================

function drawBackground() {

    ctx.fillStyle = "#020711";

    ctx.fillRect(
        0,
        0,
        width,
        height
    );


    // Deep space gradient

    const gradient =
        ctx.createRadialGradient(
            width / 2,
            height / 2,
            50,
            width / 2,
            height / 2,
            Math.max(
                width,
                height
            )
        );

    gradient.addColorStop(
        0,
        "#081a2a"
    );

    gradient.addColorStop(
        0.5,
        "#030c17"
    );

    gradient.addColorStop(
        1,
        "#01040a"
    );

    ctx.fillStyle =
        gradient;

    ctx.fillRect(
        0,
        0,
        width,
        height
    );


    // ============================================
    // STARS
    // ============================================

    for (
        const star
        of world.stars
    ) {

        ctx.globalAlpha =
            clamp(
                star.alpha,
                0.05,
                1
            );

        ctx.fillStyle =
            "#9eeaff";

        ctx.beginPath();

        ctx.arc(
            star.x,
            star.y,
            star.size,
            0,
            Math.PI * 2
        );

        ctx.fill();
    }


    ctx.globalAlpha =
        1;


    // ============================================
    // GRID
    // ============================================

    ctx.strokeStyle =
        "rgba(0,217,255,0.08)";

    ctx.lineWidth =
        1;


    for (
        let x = 0;
        x < width;
        x += world.gridSize
    ) {

        ctx.beginPath();

        ctx.moveTo(
            x,
            60
        );

        ctx.lineTo(
            x,
            height
        );

        ctx.stroke();
    }


    for (
        let y = 60;
        y < height;
        y += world.gridSize
    ) {

        ctx.beginPath();

        ctx.moveTo(
            0,
            y
        );

        ctx.lineTo(
            width,
            y
        );

        ctx.stroke();
    }


    // ============================================
    // SCAN LINES
    // ============================================

    for (
        const line
        of world.scanLines
    ) {

        const scanGradient =
            ctx.createLinearGradient(
                0,
                line.y - 20,
                0,
                line.y + 20
            );

        scanGradient.addColorStop(
            0,
            "rgba(0,217,255,0)"
        );

        scanGradient.addColorStop(
            0.5,
            "rgba(0,217,255,0.08)"
        );

        scanGradient.addColorStop(
            1,
            "rgba(0,217,255,0)"
        );

        ctx.fillStyle =
            scanGradient;

        ctx.fillRect(
            0,
            line.y - 20,
            width,
            40
        );
    }


    // ============================================
    // VIGNETTE
    // ============================================

    const vignette =
        ctx.createRadialGradient(
            width / 2,
            height / 2,
            Math.min(
                width,
                height
            ) * 0.25,
            width / 2,
            height / 2,
            Math.max(
                width,
                height
            ) * 0.75
        );

    vignette.addColorStop(
        0,
        "rgba(0,0,0,0)"
    );

    vignette.addColorStop(
        1,
        "rgba(0,0,0,0.65)"
    );

    ctx.fillStyle =
        vignette;

    ctx.fillRect(
        0,
        0,
        width,
        height
    );
}


// ================================================
// DRAW OBSTACLES
// ================================================

function drawObstacles() {

    for (
        const obstacle
        of world.obstacles
    ) {

        ctx.save();


        // Outer glow

        ctx.shadowBlur =
            18;

        ctx.shadowColor =
            "#6f42c1";


        ctx.fillStyle =
            "#07111e";

        ctx.strokeStyle =
            "#6f42c1";

        ctx.lineWidth =
            1.5;


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


        ctx.shadowBlur =
            0;


        // Inner lines

        ctx.strokeStyle =
            "rgba(0,217,255,0.25)";

        ctx.lineWidth =
            1;


        ctx.beginPath();

        ctx.moveTo(
            obstacle.x + 8,
            obstacle.y + 8
        );

        ctx.lineTo(
            obstacle.x +
                obstacle.w -
                8,
            obstacle.y +
                obstacle.h -
                8
        );

        ctx.stroke();


        ctx.beginPath();

        ctx.moveTo(
            obstacle.x +
                obstacle.w -
                8,
            obstacle.y + 8
        );

        ctx.lineTo(
            obstacle.x + 8,
            obstacle.y +
                obstacle.h -
                8
        );

        ctx.stroke();


        ctx.restore();
    }
}


// ================================================
// DRAW CORES
// ================================================

function drawCores() {

    for (
        const core
        of world.cores
    ) {

        const pulse =
            Math.sin(
                core.pulse
            ) * 3;


        ctx.save();


        // Glow

        ctx.shadowBlur =
            30;

        ctx.shadowColor =
            "#35ff9c";


        // Outer ring

        ctx.strokeStyle =
            "rgba(53,255,156,0.35)";

        ctx.lineWidth =
            2;


        ctx.beginPath();

        ctx.arc(
            core.x,
            core.y,
            18 + pulse,
            0,
            Math.PI * 2
        );

        ctx.stroke();


        // Core diamond

        ctx.fillStyle =
            "#35ff9c";

        ctx.strokeStyle =
            "#ffffff";

        ctx.lineWidth =
            1;


        ctx.beginPath();

        ctx.moveTo(
            core.x,
            core.y - 11
        );

        ctx.lineTo(
            core.x + 8,
            core.y
        );

        ctx.lineTo(
            core.x,
            core.y + 11
        );

        ctx.lineTo(
            core.x - 8,
            core.y
        );

        ctx.closePath();

        ctx.fill();

        ctx.stroke();


        // Core center

        ctx.fillStyle =
            "#ffffff";

        ctx.beginPath();

        ctx.arc(
            core.x,
            core.y,
            2,
            0,
            Math.PI * 2
        );

        ctx.fill();


        ctx.restore();
    }
}


// ================================================
// DRAW PORTALS
// ================================================

function drawPortals() {

    for (
        const portal
        of world.portals
    ) {

        const pulse =
            Math.sin(
                portal.pulse
            );


        ctx.save();


        ctx.translate(
            portal.x,
            portal.y
        );


        ctx.rotate(
            portal.pulse * 0.3
        );


        ctx.shadowBlur =
            35;

        ctx.shadowColor =
            "#6f42c1";


        ctx.strokeStyle =
            "rgba(111,66,193,0.8)";

        ctx.lineWidth =
            3;


        ctx.beginPath();

        ctx.arc(
            0,
            0,
            portal.radius +
                pulse * 4,
            0,
            Math.PI * 2
        );

        ctx.stroke();


        ctx.strokeStyle =
            "rgba(0,217,255,0.65)";

        ctx.lineWidth =
            1;


        ctx.beginPath();

        ctx.arc(
            0,
            0,
            portal.radius - 9,
            0,
            Math.PI * 2
        );

        ctx.stroke();


        ctx.fillStyle =
            "rgba(0,217,255,0.08)";


        ctx.beginPath();

        ctx.arc(
            0,
            0,
            portal.radius - 12,
            0,
            Math.PI * 2
        );

        ctx.fill();


        ctx.restore();
    }
}


// ================================================
// DRAW DRONES
// ================================================

function drawDrones() {

    for (
        const drone
        of world.drones
    ) {

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


        // Drone glow

        ctx.shadowBlur =
            22;

        ctx.shadowColor =
            "#ff315c";


        // Outer ring

        ctx.strokeStyle =
            "rgba(255,49,92,0.5)";

        ctx.lineWidth =
            2;


        ctx.beginPath();

        ctx.arc(
            0,
            0,
            23 + pulse,
            0,
            Math.PI * 2
        );

        ctx.stroke();


        // Main body

        ctx.fillStyle =
            "#160912";

        ctx.strokeStyle =
            "#ff315c";

        ctx.lineWidth =
            2;


        ctx.beginPath();

        ctx.moveTo(
            18,
            0
        );

        ctx.lineTo(
            6,
            -12
        );

        ctx.lineTo(
            -12,
            -10
        );

        ctx.lineTo(
            -18,
            0
        );

        ctx.lineTo(
            -12,
            10
        );

        ctx.lineTo(
            6,
            12
        );

        ctx.closePath();

        ctx.fill();

        ctx.stroke();


        // Eye

        ctx.shadowBlur =
            15;

        ctx.shadowColor =
            "#ff315c";

        ctx.fillStyle =
            "#ff315c";


        ctx.beginPath();

        ctx.arc(
            5,
            0,
            5,
            0,
            Math.PI * 2
        );

        ctx.fill();


        ctx.fillStyle =
            "#ffffff";


        ctx.beginPath();

        ctx.arc(
            6,
            -1,
            1.5,
            0,
            Math.PI * 2
        );

        ctx.fill();


        // Side wings

        ctx.strokeStyle =
            "#ff315c";

        ctx.lineWidth =
            2;


        ctx.beginPath();

        ctx.moveTo(
            -5,
            -8
        );

        ctx.lineTo(
            -15,
            -17
        );

        ctx.stroke();


        ctx.beginPath();

        ctx.moveTo(
            -5,
            8
        );

        ctx.lineTo(
            -15,
            17
        );

        ctx.stroke();


        ctx.restore();
    }
}


// ================================================
// DRAW PARTICLES
// ================================================

function drawParticles() {

    for (
        const particle
        of world.particles
    ) {

        const alpha =
            clamp(
                particle.life /
                particle.maxLife,
                0,
                1
            );


        ctx.save();


        ctx.globalAlpha =
            alpha;


        if (
            particle.type ===
            "explosion"
        ) {

            ctx.fillStyle =
                "#35ff9c";

            ctx.shadowColor =
                "#35ff9c";
        }

        else if (
            particle.type ===
            "drone"
        ) {

            ctx.fillStyle =
                "#ff315c";

            ctx.shadowColor =
                "#ff315c";
        }

        else {

            ctx.fillStyle =
                "#00d9ff";

            ctx.shadowColor =
                "#00d9ff";
        }


        ctx.shadowBlur =
            12;


        ctx.beginPath();

        ctx.arc(
            particle.x,
            particle.y,
            particle.size,
            0,
            Math.PI * 2
        );

        ctx.fill();


        ctx.restore();
    }
}


// ================================================
// ADVANCED AI ROBOT
// ================================================

function drawPlayer() {

    const now =
        performance.now() /
        1000;


    // ============================================
    // ENERGY TRAIL
    // ============================================

    for (
        let i = 0;
        i < player.trail.length;
        i++
    ) {

        const point =
            player.trail[i];


        const alpha =
            Math.max(
                0,
                point.life /
                0.35
            );


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


    // ============================================
    // ANIMATION
    // ============================================

    const pulse =
        Math.sin(
            now * 5
        ) * 2;


    const hover =
        Math.sin(
            now * 4
        ) * 2;


    const ringRotation =
        now * 1.8;


    ctx.save();


    ctx.translate(
        player.x,
        player.y + hover
    );


    ctx.rotate(
        player.angle
    );


    // ============================================
    // DAMAGE FLASH
    // ============================================

    if (
        player.invulnerable > 0 &&
        Math.floor(
            player.invulnerable *
            12
        ) % 2 === 0
    ) {

        ctx.globalAlpha =
            0.45;
    }


    // ============================================
    // ROTATING ENERGY RING
    // ============================================

    ctx.save();


    ctx.rotate(
        -ringRotation
    );


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


    // ============================================
    // TARGET / DIRECTION LINE
    // ============================================

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


    // ============================================
    // BOOST ENGINE
    // ============================================

    if (
        player.boost
    ) {

        const flame =
            25 +
            Math.sin(
                now * 20
            ) * 8;


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


    // ============================================
    // ROBOT BODY
    // ============================================

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


    // ============================================
    // INNER ARMOR
    // ============================================

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


    // ============================================
    // LEFT ARM
    // ============================================

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


    // ============================================
    // RIGHT ARM
    // ============================================

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


    // ============================================
    // ROBOT HEAD
    // ============================================

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


    // ============================================
    // ANTENNA
    // ============================================

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
        2.5 +
            pulse * 0.3,
        0,
        Math.PI * 2
    );

    ctx.fill();


    // ============================================
    // AI VISOR
    // ============================================

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


    // ============================================
    // VISOR HIGHLIGHT
    // ============================================

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


    // ============================================
    // NEURAL CORE
    // ============================================

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
        5 +
            pulse * 0.4,
        0,
        Math.PI * 2
    );

    ctx.fill();


    // Core center

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


    // ============================================
    // STATUS LIGHTS
    // ============================================

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


    // ============================================
    // SHIELD ARC
    // ============================================

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


    // ============================================
    // BOOST PARTICLES
    // ============================================

    if (
        player.boost
    ) {

        for (
            let i = 0;
            i < 3;
            i++
        ) {

            const px =
                -20 -
                Math.random() *
                18;


            const py =
                (
                    Math.random() -
                    0.5
                ) * 12;


            ctx.fillStyle =
                "#00d9ff";

            ctx.shadowBlur =
                15;


            ctx.beginPath();

            ctx.arc(
                px,
                py,
                1.5 +
                    Math.random() *
                    2,
                0,
                Math.PI * 2
            );

            ctx.fill();
        }
    }


    ctx.restore();
}


// ================================================
// DRAW HUD EFFECT
// ================================================

function drawHUDOverlay() {

    // Top scan line

    ctx.save();


    ctx.strokeStyle =
        "rgba(0,217,255,0.15)";

    ctx.lineWidth =
        1;


    ctx.beginPath();

    ctx.moveTo(
        0,
        60
    );

    ctx.lineTo(
        width,
        60
    );

    ctx.stroke();


    // Corner brackets

    const size =
        25;


    ctx.strokeStyle =
        "rgba(0,217,255,0.35)";

    ctx.lineWidth =
        2;


    // Top left

    ctx.beginPath();

    ctx.moveTo(
        10,
        80
    );

    ctx.lineTo(
        10 + size,
        80
    );

    ctx.moveTo(
        10,
        80
    );

    ctx.lineTo(
        10,
        80 + size
    );

    ctx.stroke();


    // Top right

    ctx.beginPath();

    ctx.moveTo(
        width - 10,
        80
    );

    ctx.lineTo(
        width - 10 - size,
        80
    );

    ctx.moveTo(
        width - 10,
        80
    );

    ctx.lineTo(
        width - 10,
        80 + size
    );

    ctx.stroke();


    ctx.restore();
}

// ================================================
// UPDATE HUD
// ================================================

function updateHUD() {

    // Timer

    const minutes =
        Math.floor(
            Math.max(
                0,
                game.time
            ) / 60
        );

    const seconds =
        Math.floor(
            Math.max(
                0,
                game.time
            ) % 60
        );


    if (timerElement) {

        timerElement.textContent =
            `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }


    // Energy

    if (energyText) {

        energyText.textContent =
            `${Math.round(game.energy)}%`;
    }


    if (energyBar) {

        energyBar.style.width =
            `${game.energy}%`;
    }


    // Shield

    if (shieldText) {

        shieldText.textContent =
            `${Math.round(game.shield)}%`;
    }


    if (shieldBar) {

        shieldBar.style.width =
            `${game.shield}%`;
    }


    // XP

    const requiredXP =
        game.level * 250;

    const xpPercent =
        clamp(
            (game.xp / requiredXP) * 100,
            0,
            100
        );


    if (xpText) {

        xpText.textContent =
            `${Math.round(game.xp)} / ${requiredXP}`;
    }


    if (xpBar) {

        xpBar.style.width =
            `${xpPercent}%`;
    }


    // Objective

    if (objectiveCount) {

        objectiveCount.textContent =
            game.cores;
    }


    if (objectiveTotal) {

        objectiveTotal.textContent =
            game.objectiveTotal;
    }


    // Threats

    if (threatCount) {

        threatCount.textContent =
            world.drones.length;
    }


    // Cores

    if (coreCount) {

        coreCount.textContent =
            game.cores;
    }


    // Score

    if (scoreElement) {

        scoreElement.textContent =
            formatScore(game.score);
    }


    // Level

    if (levelElement) {

        levelElement.textContent =
            game.level;
    }


    // Objective text

    if (objectiveElement) {

        if (
            game.missionComplete
        ) {

            objectiveElement.textContent =
                "MISSION COMPLETE";
        }

        else {

            objectiveElement.textContent =
                "COLLECT ALL ENERGY CORES";
        }
    }
}


// ================================================
// UPDATE GAME TIMER
// ================================================

function updateTimer(dt) {

    game.timerAccumulator +=
        dt;


    if (
        game.timerAccumulator >=
        1
    ) {

        const elapsed =
            Math.floor(
                game.timerAccumulator
            );


        game.timerAccumulator -=
            elapsed;


        game.time -=
            elapsed;


        if (
            game.time <= 0
        ) {

            game.time = 0;

            gameOver();
        }
    }
}


// ================================================
// UPDATE GAME
// ================================================

function updateGame(dt) {

    if (
        !game.running ||
        game.paused
    ) {

        return;
    }


    // Limit extremely large
    // delta values.

    dt =
        Math.min(
            dt,
            0.05
        );


    updateTimer(dt);

    updatePlayer(dt);

    updateDrones(dt);

    updateCores(dt);

    updateParticles(dt);

    updateStars(dt);

    updateScanLines(dt);

    updatePortals(dt);


    // Slowly regenerate shield

    if (
        game.shield > 0 &&
        game.shield < 100
    ) {

        game.shield +=
            2 * dt;

        game.shield =
            clamp(
                game.shield,
                0,
                100
            );
    }


    // Score for surviving

    game.score +=
        dt * 2;


    // Camera shake

    if (
        game.shake > 0
    ) {

        game.shake -=
            dt * 20;

        if (
            game.shake < 0
        ) {

            game.shake = 0;
        }
    }


    updateHUD();
}


// ================================================
// DRAW GAME
// ================================================

function drawGame() {

    ctx.clearRect(
        0,
        0,
        width,
        height
    );


    // ============================================
    // CAMERA SHAKE
    // ============================================

    ctx.save();


    if (
        game.shake > 0
    ) {

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


    // ============================================
    // WORLD
    // ============================================

    drawBackground();

    drawObstacles();

    drawPortals();

    drawCores();

    drawDrones();

    drawParticles();

    drawPlayer();


    ctx.restore();


    // ============================================
    // HUD EFFECT
    // ============================================

    drawHUDOverlay();
}


// ================================================
// MAIN GAME LOOP
// ================================================

function gameLoop(timestamp) {

    /*
    IMPORTANT:

    Do not create another animation loop
    inside startGame().

    This function controls the entire game.
    */


    if (
        !game.running
    ) {

        return;
    }


    if (
        !game.lastTime
    ) {

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


    if (
        !game.paused
    ) {

        updateGame(dt);

        drawGame();
    }


    if (
        game.running
    ) {

        requestAnimationFrame(
            gameLoop
        );
    }
}


// ================================================
// WINDOW VISIBILITY
// ================================================

document.addEventListener(
    "visibilitychange",
    () => {

        if (
            document.hidden
        ) {

            if (
                game.running &&
                !game.paused
            ) {

                game.paused =
                    true;

                if (
                    pauseOverlay
                ) {

                    pauseOverlay.classList.add(
                        "active"
                    );
                }
            }
        }
    }
);


// ================================================
// MOUSE / TOUCH SUPPORT
// ================================================

let pointerActive =
    false;

let pointerStartX =
    0;

let pointerStartY =
    0;


canvas.addEventListener(
    "pointerdown",
    (event) => {

        pointerActive =
            true;

        pointerStartX =
            event.clientX;

        pointerStartY =
            event.clientY;
    }
);


canvas.addEventListener(
    "pointermove",
    (event) => {

        if (
            !pointerActive ||
            !game.running ||
            game.paused
        ) {

            return;
        }


        const dx =
            event.clientX -
            pointerStartX;

        const dy =
            event.clientY -
            pointerStartY;


        // Clear movement keys

        keys["w"] = false;
        keys["a"] = false;
        keys["s"] = false;
        keys["d"] = false;


        if (
            Math.abs(dx) >
            15
        ) {

            if (
                dx > 0
            ) {

                keys["d"] = true;
            }

            else {

                keys["a"] = true;
            }
        }


        if (
            Math.abs(dy) >
            15
        ) {

            if (
                dy > 0
            ) {

                keys["s"] = true;
            }

            else {

                keys["w"] = true;
            }
        }
    }
);


function stopPointerMovement() {

    pointerActive =
        false;

    keys["w"] = false;
    keys["a"] = false;
    keys["s"] = false;
    keys["d"] = false;
}


canvas.addEventListener(
    "pointerup",
    stopPointerMovement
);

canvas.addEventListener(
    "pointercancel",
    stopPointerMovement
);

canvas.addEventListener(
    "pointerleave",
    stopPointerMovement
);


// ================================================
// ESCAPE = PAUSE
// ================================================

window.addEventListener(
    "keydown",
    (event) => {

        if (
            event.key === "Escape"
        ) {

            togglePause();
        }
    }
);


// ================================================
// INITIAL UI STATE
// ================================================

function initializeUI() {

    if (startScreen) {

        startScreen.classList.add(
            "active"
        );
    }


    if (gameScreen) {

        gameScreen.classList.remove(
            "active"
        );
    }


    if (gameOverScreen) {

        gameOverScreen.classList.remove(
            "active"
        );
    }


    if (victoryScreen) {

        victoryScreen.classList.remove(
            "active"
        );
    }


    if (pauseOverlay) {

        pauseOverlay.classList.remove(
            "active"
        );
    }


    updateHUD();
}


// ================================================
// INITIALIZE
// ================================================

initializeUI();


// ================================================
// SAFETY: PREVENT DOUBLE START
// ================================================

window.addEventListener(
    "beforeunload",
    () => {

        game.running =
            false;
    }
);


/*
=========================================================
 CONTROLS

 W / A / S / D
 Arrow Keys
 SHIFT = BOOST
 P = PAUSE
 ESC = PAUSE

 OBJECTIVE

 Collect all energy cores
 while avoiding enemy drones.

 VICTORY

 Collect every core.

 DEFEAT

 Shield reaches zero
 OR mission timer reaches zero.
=========================================================
*/




