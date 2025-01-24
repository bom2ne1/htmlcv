if (isMobile) {
    console.log("GAME, is mobile . hide game, particles, etc");
    document.getElementById('gameBox').remove()
} else {
    console.log("GAME, is not mobile .");

    var shouldRender = false;
    var animationFrameId;

    const colors = ['#ff6347', '#ff1493', '#ffd700', '#adff2f', ];

    const gameCanvas = document.getElementById('gameCanvas');
    const gameCtx = gameCanvas.getContext('2d');

    function resizeCanvas() {
        gameCanvas.width = window.innerWidth;
        gameCanvas.height = window.innerHeight;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    var hitCount = 0;

    let mouseSensitivity = 0.002;
    let mouseX = 0;
    let isPointerLocked = false;

    const wallTexture = new Image();
    wallTexture.src = './sprites/wall2.png';

    const enemySprite = new Image();

    enemySprite.src = './sprites/taxman.png';
    const SPRITE_WIDTH = 64;
    const SPRITE_HEIGHT = 64;

    const bloodSprite = new Image();
    bloodSprite.src = './sprites/blood2.png';

    const BLOOD_SPRITE_SIZE = 32;
    const BLOOD_SPRITE_FRAMES = 4;
    const BLOOD_BASE_SIZE = 0.2;
    const GRAVITY = 0.4;
    const GROUND_LEVEL = 0;

    const spearSprite = new Image();
    spearSprite.src = './sprites/zogspear.png';
    const SPEAR_FRAMES = 6;

    const TILE_SIZE = 256;
    var FOVDeg = 90

    var FOV = FOVDeg * (Math.PI / 180)
    var NUM_RAYS = gameCanvas.width;
    const MAX_DEPTH = TILE_SIZE * 8;
    const RAY_STEP = 1;

    class Particle {
        constructor(x, y, angle) {
            this.x = x;
            this.y = y;
            this.vx = Math.cos(angle) * (Math.random() * 2 + 1);
            this.vy = Math.sin(angle) * (Math.random() * 2 + 1);
            this.life = 1.0;
            this.size = Math.random() * 3 + 2;
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;
            this.vy += 0.1;
            this.life -= 0.02;
            return this.life > 0;
        }
    }

    class BloodSprite {
        constructor(x, y, z, angle) {
            this.x = x;
            this.y = y;
            this.z = z;
            this.angle = angle;

            const speed = Math.random() * 5 + 0.5;
            this.velocity = {
                x: Math.cos(angle) * speed,
                y: Math.sin(angle) * speed,
                z: Math.random() * 2 + 1
            };

            this.frame = Math.floor(Math.random() * BLOOD_SPRITE_FRAMES);
            this.scale = (Math.random() * 0.3 + 0.2) * BLOOD_BASE_SIZE;
            this.rotation = Math.random() * Math.PI * 2;

            this.life = 200.0;
            this.fadeStart = 0.3;
            this.stuck = false;
            this.wallStuck = false;
            this.finalScale = this.scale;

            this.wallNormal = null;
            this.wallOffset = 0.1;
        }

        update() {
            if (!this.stuck) {
                const prevX = this.x;
                const prevY = this.y;

                this.x += this.velocity.x;
                this.y += this.velocity.y;
                this.z += this.velocity.z;
                this.velocity.z -= GRAVITY;

                if (this.z <= GROUND_LEVEL - TILE_SIZE / 2) {
                    this.z = GROUND_LEVEL - TILE_SIZE / 2;
                    this.stuck = true;
                    this.rotation = Math.random() * Math.PI * 2;
                    this.frame = Math.floor(Math.random() * BLOOD_SPRITE_FRAMES);
                    this.finalScale = this.scale * 1.2;
                }

                if (isWall(this.x, this.y)) {
                    this.stuck = true;
                    this.wallStuck = true;
                    this.z = GROUND_LEVEL - TILE_SIZE / 2;

                    const gridX = Math.floor(this.x / TILE_SIZE);
                    const gridY = Math.floor(this.y / TILE_SIZE);

                    const cellX = gridX * TILE_SIZE;
                    const cellY = gridY * TILE_SIZE;
                    const relX = this.x - cellX;
                    const relY = this.y - cellY;

                    if (relX < relY && relX < TILE_SIZE - relY) {

                        this.x = cellX - this.wallOffset;
                        this.wallNormal = { x: -1, y: 0 };
                    } else if (relX > relY && relX > TILE_SIZE - relY) {

                        this.x = cellX + TILE_SIZE + this.wallOffset;
                        this.wallNormal = { x: 1, y: 0 };
                    } else if (relY < relX && relY < TILE_SIZE - relX) {

                        this.y = cellY - this.wallOffset;
                        this.wallNormal = { x: 0, y: -1 };
                    } else {

                        this.y = cellY + TILE_SIZE + this.wallOffset;
                        this.wallNormal = { x: 0, y: 1 };
                    }

                    this.rotation = Math.random() * Math.PI * 2;
                    this.frame = Math.floor(Math.random() * BLOOD_SPRITE_FRAMES);
                    this.finalScale = this.scale * 1.2;
                }
            }

            if (!this.stuck || this.life < this.fadeStart) {
                this.life -= 0.01;
            }

            return this.life > 0;
        }
    }

    class Decal {
        constructor(x, y, size) {
            this.x = x;
            this.y = y;
            this.size = size;
            this.alpha = 1.0;
        }
    }

    class Enemy {
        constructor(x, y) {
            this.x = x;
            this.y = y;
            this.health = 10;
            this.isAlive = true;
            this.hitAnimation = 0;
            this.deathAnimation = 0;
            this.frame = 0;
            this.frameTime = 0;
        }

        takeDamage(damage) {
            hitCount++;
            if (document.getElementById('gg3')) {
                document.getElementById('gg3').style.padding = "2px"
                document.getElementById('gg3').innerText = hitCount
            }

            if (!this.isAlive) return;

            this.health -= damage;
            this.hitAnimation = 20;

            if (this.health <= 0) {
                this.isAlive = false;
                this.hitAnimation = 20;
                this.deathAnimation = 80;
                createGibs(this.x, this.y);
                startFireworks()
            }
        }

        update() {
            if (this.hitAnimation > 0) this.hitAnimation--;

            this.frameTime++;
            if (this.frameTime > 30) {
                this.frame = (this.frame + 1) % 4;
                this.frameTime = 0;
            }
        }
    }

    class AlliedUnit {
        constructor(x, y, config) {

            this.x = x;
            this.y = y;

            this.type = config.type || 'generic';
            this.health = config.health || 20;
            this.maxHealth = this.health;
            this.damage = config.damage || 10;
            this.attackRange = config.attackRange || TILE_SIZE * 2;
            this.attackCooldown = 0;
            this.attackSpeed = config.attackSpeed || 30;

            this.isAlive = true;
            this.hitAnimation = 0;
            this.isFlipped = false;
            this.frame = 0;
            this.frameTime = 0;

            this.spriteConfig = config.spriteConfig || {
                spriteSheet: enemySprite,
                spriteWidth: SPRITE_WIDTH,
                spriteHeight: SPRITE_HEIGHT,
                animationFrames: 4
            };
        }

        findNearestEnemy(enemies) {
            return enemies.reduce((nearest, enemy) => {
                if (!enemy.isAlive) return nearest;

                const currentDistance = nearest ?
                    Math.sqrt(Math.pow(nearest.x - this.x, 2) + Math.pow(nearest.y - this.y, 2)) :
                    Infinity;

                const newDistance = Math.sqrt(Math.pow(enemy.x - this.x, 2) + Math.pow(enemy.y - this.y, 2));

                return newDistance < currentDistance ? enemy : nearest;
            }, null);
        }

        update(enemies) {

            this.frameTime++;
            if (this.frameTime > 30) {
                this.frame = (this.frame + 1) % this.spriteConfig.animationFrames;
                this.frameTime = 0;
            }

            const nearestEnemy = this.findNearestEnemy(enemies);

            if (nearestEnemy) {
                this.isFlipped = nearestEnemy.x < this.x;

                if (this.attackCooldown <= 0) {
                    const dx = nearestEnemy.x - this.x;
                    const dy = nearestEnemy.y - this.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance <= this.attackRange) {
                        nearestEnemy.takeDamage(this.damage);
                        createBloodEffect(nearestEnemy.x, nearestEnemy.y, nearestEnemy.isAlive ? 'hit' : 'death');
                        this.attackCooldown = this.attackSpeed;
                    }
                } else {
                    this.attackCooldown--;
                }
            }
        }

        takeDamage(damage) {
            if (!this.isAlive) return;

            this.health -= damage;
            this.hitAnimation = 20;

            if (this.health <= 0) {
                this.isAlive = false;
                this.health = 0;

                createGibs(this.x, this.y);
            }
        }
    }

    class Franklin extends AlliedUnit {
        constructor(x, y) {
            super(x, y, {
                type: 'Franklin',
                health: 50,
                damage: 15,
                attackRange: TILE_SIZE * 1.5,
                attackSpeed: 25,
                spriteConfig: {
                    spriteSheet: enemySprite,
                    spriteWidth: SPRITE_WIDTH,
                    spriteHeight: SPRITE_HEIGHT,
                    animationFrames: 4
                }
            });
        }

        berserkMode() {

            this.damage *= 1.5;
            this.attackSpeed /= 2;
        }
    }

    class Heathcliff extends AlliedUnit {
        constructor(x, y) {
            super(x, y, {
                type: 'Heathcliff',
                health: 30,
                damage: 10,
                attackRange: TILE_SIZE * 4,
                attackSpeed: 40,
                spriteConfig: {
                    spriteSheet: enemySprite,
                    spriteWidth: SPRITE_WIDTH,
                    spriteHeight: SPRITE_HEIGHT,
                    animationFrames: 4
                }
            });
        }
    }

    class Keithan extends AlliedUnit {
        constructor(x, y) {
            super(x, y, {
                type: 'Keithan',
                health: 75,
                damage: 25,
                attackRange: TILE_SIZE * 1.2,
                attackSpeed: 15,
                spriteConfig: {
                    spriteSheet: enemySprite,
                    spriteWidth: SPRITE_WIDTH,
                    spriteHeight: SPRITE_HEIGHT,
                    animationFrames: 4
                }
            });
        }
    }

    class Sassenach extends AlliedUnit {
        constructor(x, y) {
            super(x, y, {
                type: 'Sassenach',
                health: 75,
                damage: 25,
                attackRange: TILE_SIZE * 1.2,
                attackSpeed: 15,
                spriteConfig: {
                    spriteSheet: enemySprite,
                    spriteWidth: SPRITE_WIDTH,
                    spriteHeight: SPRITE_HEIGHT,
                    animationFrames: 4
                }
            });
        }

    }

    const map = [
        [1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1],
    ];

    const player = {
        x: TILE_SIZE * 1.5,
        y: TILE_SIZE * 3,
        angle: 0,
        speed: TILE_SIZE / 25,
        rotationSpeed: FOV * 0.01,
        isAttacking: false,
        attackCooldown: 0
    };

    gameCanvas.addEventListener('click', () => {
        return
        if (!isPointerLocked) {
            gameCanvas.requestPointerLock();
        }
    });

    document.addEventListener('pointerlockchange', () => {
        isPointerLocked = document.pointerLockElement === canvas;
    });

    document.addEventListener('mousemove', (e) => {
        if (isPointerLocked) {

            mouseX += e.movementX * mouseSensitivity;
            player.angle = mouseX;
        }
    });

    const weapon = {
        attacking: false,
        frame: 0,
        frameTime: 0,
        returnSpeed: 0.2,
        damage: 20,
        position: {
            x: 0,
            y: 0,
            rotation: 0
        },

        bob: {
            angle: 0,
            speed: 0.1,
            amount: 0.05
        }
    };

    const enemies = [new Enemy(TILE_SIZE * 5.5, TILE_SIZE * 3)];

    const allied = [

    ];

    const particles = [];
    const decals = [];
    const bloodSprites = [];

    const keys = {};
    window.addEventListener('keydown', (e) => {
        if (!shouldRender) { return }
        keys[e.key] = true;
        if (e.key === ' ') {
            // event.preventDefault()
            attack();
        }

        if (e.key === 'Escape') {
            document.exitPointerLock();
        }
    });

    document.getElementById('minimize-feedback').addEventListener('keydown', function(event) {
        if (event.key === ' ') {
            event.preventDefault(); // Prevents the spacebar from clicking the button
        }
    });

    window.addEventListener('keyup', (e) => (keys[e.key] = false));

    function createGibs(x, y) {
        for (let i = 0; i < 20; i++) {
            const angle = Math.random() * Math.PI * 2;
            particles.push(new Particle(x, y, angle));
        }

    }

    function attack() {
        if (player.attackCooldown > 0 || weapon.attacking) return;

        weapon.attacking = true;
        weapon.frame = 0;
        player.attackCooldown = 20;

    }

    function createBloodEffect(x, y, isAlive) {

        var particleCount = isAlive ? 10 : 20;
        var heightVariation = isAlive ? TILE_SIZE * 0.01 : TILE_SIZE * 0.7;

        particleCount *= 2
        heightVariation *= 2

        const baseAngle = Math.random() * Math.PI * 2;
        for (let i = 0; i < particleCount; i++) {

            const spreadAngle = baseAngle + (Math.random() - 0.5) * Math.PI;
            const distance = Math.random() * 0.5;

            bloodSprites.push(new BloodSprite(
                x + Math.cos(spreadAngle) * distance,
                y + Math.sin(spreadAngle) * distance,
                Math.random() * heightVariation - (hitCount > 1 ? 100 : 0),
                spreadAngle
            ));
        }
    }

    function normalizeAngle(angle) {
        angle = angle % (Math.PI * 2);
        if (angle < -Math.PI) angle += Math.PI * 2;
        if (angle > Math.PI) angle -= Math.PI * 2;
        return angle;
    }

    function renderWeapon(WIDTH, HEIGHT) {

        if (keys['ArrowUp'] || keys['w'] || keys['W'] || keys['ArrowDown'] || keys['s'] || keys['S']) {
            weapon.bob.angle += weapon.bob.speed;
        } else {
            weapon.bob.angle = 0;
        }

        const bobOffset = Math.sin(weapon.bob.angle) * weapon.bob.amount;

        gameCtx.save();

        const weaponScale = HEIGHT * 0.6;
        const weaponX = WIDTH / 2;
        const weaponY = HEIGHT - weaponScale / 2 + bobOffset * weaponScale;

        if (weapon.attacking) {
            weapon.frameTime++;
            if (weapon.frameTime > 2) {
                weapon.frame++;
                weapon.frameTime = 0;

                if (weapon.frame == 4) {

                    enemies.forEach(enemy => {

                        const dx = enemy.x - player.x;
                        const dy = enemy.y - player.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);

                        if (distance < TILE_SIZE * 2) {
                            const angleToEnemy = Math.atan2(dy, dx);
                            const angleDiff = Math.abs(normalizeAngle(angleToEnemy - player.angle));

                            if (angleDiff < FOV / 2) {
                                logEvent('stab');
                                enemy.takeDamage(weapon.damage);
                                createBloodEffect(enemy.x, enemy.y, enemy.isAlive);
                            }
                        }
                    });
                }

                if (weapon.frame >= SPEAR_FRAMES) {
                    weapon.frame = 0;
                    weapon.attacking = false;
                }
            }
        }

        gameCtx.translate(weaponX, weaponY);
        if (weapon.attacking) {

            const attackProgress = weapon.frame / SPEAR_FRAMES;
            const thrustAmount = Math.sin(attackProgress * Math.PI) * weaponScale * 0.3;
            const rotateAmount = Math.sin(attackProgress * Math.PI) * Math.PI / 8;

            gameCtx.translate(0, -thrustAmount / 2);

        }

        gameCtx.drawImage(
            spearSprite,
            weapon.frame * 256, 0,
            256, 256,
            -weaponScale / 2, -weaponScale / 2,
            weaponScale, weaponScale
        );

        gameCtx.restore();
    }

    function renderBloodSprites(WIDTH, HEIGHT, zBuffer) {

        bloodSprites.sort((a, b) => {
            const distA = Math.pow(a.x - player.x, 2) + Math.pow(a.y - player.y, 2);
            const distB = Math.pow(b.x - player.x, 2) + Math.pow(b.y - player.y, 2);
            return distB - distA;
        });

        bloodSprites.forEach((sprite, index) => { renderBloodSprite(sprite, index, WIDTH, HEIGHT, zBuffer) });
    }

    function renderBloodSprite(sprite, index, WIDTH, HEIGHT, zBuffer) {
        if (!sprite.update()) {
            bloodSprites.splice(index, 1);
            return;
        }

        const dx = sprite.x - player.x;
        const dy = sprite.y - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        let spriteAngle = Math.atan2(dy, dx);
        let relativeAngle = normalizeAngle(spriteAngle - player.angle);

        const margin = sprite.wallStuck ? FOV * 0.2 : 0;
        if (Math.abs(relativeAngle) < (FOV / 2 + margin)) {
            const distanceToProjection = (WIDTH / 2) / Math.tan(FOV / 2);
            const correctedDistance = distance * Math.cos(relativeAngle);

            const spriteScreenX = WIDTH / 2 + Math.tan(relativeAngle) * distanceToProjection;

            const size = (TILE_SIZE * (sprite.stuck ? sprite.finalScale : sprite.scale) * distanceToProjection) / correctedDistance;

            const verticalPosition = sprite.z * (distanceToProjection / correctedDistance);
            const spriteScreenY = HEIGHT / 2 - verticalPosition;

            let isVisible = false;
            if (sprite.wallStuck) {

                const checkPoints = 3;
                for (let i = 0; i < checkPoints; i++) {
                    const checkX = Math.floor(spriteScreenX + (i - checkPoints / 2) * (size / checkPoints));
                    if (checkX >= 0 && checkX < WIDTH) {

                        if (correctedDistance <= zBuffer[checkX] + 10) {
                            isVisible = true;
                            break;
                        }
                    }
                }
            } else {
                isVisible = correctedDistance > 0 &&
                    spriteScreenX + size / 2 >= 0 &&
                    spriteScreenX - size / 2 <= WIDTH &&
                    correctedDistance < zBuffer[Math.floor(spriteScreenX)];
            }

            if (isVisible) {
                gameCtx.save();
                gameCtx.globalAlpha = sprite.life;

                gameCtx.translate(spriteScreenX, spriteScreenY);
                gameCtx.rotate(sprite.rotation);

                gameCtx.drawImage(
                    bloodSprite,
                    sprite.frame * BLOOD_SPRITE_SIZE, 0,
                    BLOOD_SPRITE_SIZE, BLOOD_SPRITE_SIZE,
                    -size / 2, -size / 2,
                    size, size
                );

                if (false) {
                    gameCtx.strokeStyle = 'red';
                    if (sprite.stuck) {
                        gameCtx.strokeStyle = 'blue';
                    }
                    if (sprite.wallStuck) {
                        gameCtx.strokeStyle = 'purple';
                    }
                    gameCtx.lineWidth = 2;
                    gameCtx.strokeRect(-size / 2, -size / 2, size, size);

                    gameCtx.beginPath();
                    gameCtx.moveTo(0, 0);
                    gameCtx.lineTo(0, -20);
                    gameCtx.stroke();
                }

                gameCtx.restore();
            }

        }

    }

    function renderSprites(WIDTH, HEIGHT, zBuffer) {

        const allSprites = [
            ...enemies.map(enemy => ({
                type: 'enemy',
                x: enemy.x,
                y: enemy.y,
                distance: Math.sqrt(Math.pow(enemy.x - player.x, 2) + Math.pow(enemy.y - player.y, 2)),
                enemy: enemy
            })),
            ...bloodSprites.map(bloodSprite => ({
                type: 'blood',
                x: bloodSprite.x,
                y: bloodSprite.y,
                distance: Math.sqrt(Math.pow(bloodSprite.x - player.x, 2) + Math.pow(bloodSprite.y - player.y, 2)),
                bloodSprite: bloodSprite
            }))
        ];

        allSprites.sort((a, b) => b.distance - a.distance);

        allSprites.forEach(sprite => {
            const dx = sprite.x - player.x;
            const dy = sprite.y - player.y;
            const distance = sprite.distance;
            const angle = Math.atan2(dy, dx);

            const distanceToProjection = (WIDTH / 2) / Math.tan(FOV / 2);
            const spriteScreenX = WIDTH / 2 + Math.tan(angle - player.angle) * distanceToProjection;
            const correctedDistance = distance * Math.cos(angle - player.angle);

            if (Math.abs(normalizeAngle(angle - player.angle)) < FOV / 2) {

                if (sprite.type === 'enemy') {
                    const spriteHeight = (TILE_SIZE / distance) * distanceToProjection;
                    const spriteWidth = (TILE_SIZE / distance) * distanceToProjection;
                    const spriteTop = (HEIGHT - spriteHeight) / 2;

                    if (correctedDistance < zBuffer[Math.floor(spriteScreenX)]) {
                        const enemy = sprite.enemy;
                        let frameX = enemy.frame * SPRITE_WIDTH;

                        if (enemy.hitAnimation > 0) {
                            frameX = 4 * SPRITE_WIDTH;
                        } else if (!enemy.isAlive) {
                            frameX = 5 * SPRITE_WIDTH;
                        }

                        gameCtx.save();
                        gameCtx.drawImage(
                            enemySprite,
                            frameX, 0, SPRITE_WIDTH, SPRITE_HEIGHT,
                            spriteScreenX - spriteWidth / 2,
                            spriteTop,
                            spriteWidth,
                            spriteHeight
                        );
                        gameCtx.restore();
                    }
                } else if (sprite.type === 'blood') {
                    const bloodSprite2 = sprite.bloodSprite;

                    const size = (TILE_SIZE * (bloodSprite2.stuck ? bloodSprite2.finalScale : bloodSprite2.scale) * distanceToProjection) / correctedDistance;
                    const verticalPosition = bloodSprite2.z * (distanceToProjection / correctedDistance);
                    const spriteScreenY = HEIGHT / 2 - verticalPosition;

                    let isVisible = correctedDistance > 0 &&
                        spriteScreenX + size / 2 >= 0 &&
                        spriteScreenX - size / 2 <= WIDTH &&
                        correctedDistance < zBuffer[Math.floor(spriteScreenX)];

                    if (isVisible) {
                        gameCtx.save();
                        gameCtx.globalAlpha = bloodSprite2.life;

                        gameCtx.translate(spriteScreenX, spriteScreenY);
                        gameCtx.rotate(bloodSprite2.rotation);

                        gameCtx.drawImage(
                            bloodSprite2,
                            bloodSprite2.frame * BLOOD_SPRITE_SIZE, 0,
                            BLOOD_SPRITE_SIZE, BLOOD_SPRITE_SIZE,
                            -size / 2, -size / 2,
                            size, size
                        );

                        gameCtx.restore();
                    }
                }
            }
        });
    }

    function renderEnemy(enemy, WIDTH, HEIGHT, zBuffer) {
        if (!enemy.isAlive && enemy.deathAnimation <= 0) return;

        const dx = enemy.x - player.x;
        const dy = enemy.y - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);

        const distanceToProjection = (WIDTH / 2) / Math.tan(FOV / 2);
        const spriteScreenX = WIDTH / 2 + Math.tan(angle - player.angle) * distanceToProjection;
        const spriteHeight = (TILE_SIZE / distance) * distanceToProjection;
        const spriteWidth = (TILE_SIZE / distance) * distanceToProjection;

        if (Math.abs(normalizeAngle(angle - player.angle)) < FOV / 2) {
            const spriteTop = (HEIGHT - spriteHeight) / 2;

            if (distance < zBuffer[Math.floor(spriteScreenX)]) {

                let frameX = enemy.frame * SPRITE_WIDTH;
                if (enemy.hitAnimation > 0) {

                    frameX = 4 * SPRITE_WIDTH;
                } else if (!enemy.isAlive) {
                    frameX = 5 * SPRITE_WIDTH;
                }

                gameCtx.save();

                if (enemy.hitAnimation > 0) {

                }
                gameCtx.imageSmoothingEnabled = false;
                gameCtx.drawImage(
                    enemySprite,
                    frameX, 0, SPRITE_WIDTH, SPRITE_HEIGHT,
                    spriteScreenX - spriteWidth / 2,
                    spriteTop + 30,
                    spriteWidth,
                    spriteHeight
                );
                gameCtx.restore();
            }
        }
    }

    function renderAllies(WIDTH, HEIGHT, zBuffer) {
        allied.sort((a, b) => Math.sqrt(Math.pow(b.x - player.x, 2) + Math.pow(b.y - player.y, 2)) - Math.sqrt(Math.pow(a.x - player.x, 2) + Math.pow(a.y - player.y, 2)));
        allied.forEach(alliedUnit => {
            renderAlliedUnit(alliedUnit, WIDTH, HEIGHT, zBuffer)
        });
    }

    function renderAlliedUnit(alliedUnit, WIDTH, HEIGHT, zBuffer) {
        if (!alliedUnit.isAlive) return;

        const dx = alliedUnit.x - player.x;
        const dy = alliedUnit.y - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);

        const distanceToProjection = (WIDTH / 2) / Math.tan(FOV / 2);
        const spriteScreenX = WIDTH / 2 + Math.tan(angle - player.angle) * distanceToProjection;
        const spriteHeight = (TILE_SIZE / distance) * distanceToProjection;
        const spriteWidth = (TILE_SIZE / distance) * distanceToProjection;

        if (Math.abs(normalizeAngle(angle - player.angle)) < FOV / 2) {
            const spriteTop = (HEIGHT - spriteHeight) / 2;

            if (distance < zBuffer[Math.floor(spriteScreenX)]) {
                let frameX = alliedUnit.frame * alliedUnit.spriteConfig.spriteWidth;

                gameCtx.save();

                if (alliedUnit.isFlipped) {
                    gameCtx.translate(spriteScreenX, spriteTop);
                    gameCtx.scale(-1, 1);
                    gameCtx.translate(-spriteScreenX, -spriteTop);
                }

                gameCtx.drawImage(
                    alliedUnit.spriteConfig.spriteSheet,
                    frameX, 0,
                    alliedUnit.spriteConfig.spriteWidth,
                    alliedUnit.spriteConfig.spriteHeight,
                    spriteScreenX - spriteWidth / 2,
                    spriteTop,
                    spriteWidth,
                    spriteHeight
                );

                gameCtx.restore();
            }
        }
    }

    var gradientBgOffset = 0;

    var ripples = [];

    const stars = [];
    for (let i = 0; i < 100; i++) {
        stars.push({
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight * .75,
            size: Math.random() * 2,
            speed: Math.random() * .05
        });
    }

    var fireworks = [];

    function createFireworks() {
        fireworks.push({
            x: Math.random() * window.innerWidth,
            y: window.innerHeight * .75,
            vy: -Math.random() * 6 - 6,
            exploded: false,
            particles: []
        });
    }

    function startFireworks() {
        logEvent('startFireworks');
        for (let i = 0; i < 10; i++) {
            createFireworks()
        }

        setInterval(createFireworks, 300);
    }

    var noiseImageData = ''
    var noiseFrameTime = 0;

    function addDirtNoise(ctx, width, height, baseColor) {
        noiseFrameTime++
        if (noiseImageData) {
            ctx.putImageData(noiseImageData, 0, height);
            return
        }
        noiseFrameTime = 0

        const imageData = ctx.getImageData(0, height, width, height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {

            data[i] = 155;
            data[i + 1] = 118;
            data[i + 2] = 83;

            const variation = Math.random() * 30 - 15;
            data[i] += variation;
            data[i + 1] += variation;
            data[i + 2] += variation;
        }
        noiseImageData = imageData
        ctx.putImageData(imageData, 0, height);
    }

    var generatedStones = []

    function addStones(ctx, width, height) {
        if (!generatedStones.length) {
            for (let i = 0; i < 500; i++) {
                generatedStones.push([Math.random(), Math.random(), Math.random(), Math.random()])
            }
        } else {
            for (let i = 0; i < generatedStones.length; i++) {
                const x = generatedStones[i][0] * width;
                const y = generatedStones[i][1] * height + height;
                const size = generatedStones[i][2] * 3 + 1;
                ctx.fillStyle = `rgba(60, 42, 30, ${generatedStones[i][3]})`;
                ctx.beginPath();
                ctx.arc(x, y, size, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    function render() {
        if (document.getElementById('gg')) { document.getElementById('gg').remove() }
        var WIDTH = window.innerWidth;
        var HEIGHT = window.innerHeight;

        NUM_RAYS = gameCanvas.width;

        gameCtx.fillStyle = '#222';
        gameCtx.fillRect(0, 0, WIDTH, HEIGHT / 2);
        gameCtx.fillStyle = '#444';
        gameCtx.fillRect(0, HEIGHT / 2, WIDTH, HEIGHT / 2);

        stars.forEach(star => {
            star.y += star.speed;
            star.x += star.speed * 2;
            if (star.y > HEIGHT * .75) star.y = 0;
            if (star.x > WIDTH) star.x = 0;

            gameCtx.fillStyle = '#fff';
            gameCtx.beginPath();
            gameCtx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            gameCtx.fill();
        });

        fireworks.forEach((fw, i) => {
            if (!fw.exploded) {
                fw.y += fw.vy;
                gameCtx.fillStyle = '#ff0';
                gameCtx.beginPath();
                gameCtx.arc(fw.x, fw.y, 3, 0, Math.PI * 2);
                gameCtx.fill();

                if (fw.vy > -2 || fw.y < 20) {
                    fw.exploded = true;
                    for (let j = 0; j < 50; j++) {
                        fw.particles.push({
                            x: fw.x,
                            y: fw.y,
                            vx: Math.random() * 4 - 2,
                            vy: Math.random() * 4 - 2,
                            life: 100
                        });
                    }
                } else if (fw.y < 450) {
                    fw.vy *= 0.975
                }
            } else {
                fw.particles.forEach((p, j) => {
                    p.x += p.vx;
                    p.y += p.vy;
                    p.life--;

                    gameCtx.fillStyle = colors[Math.floor(Math.random() * colors.length)]
                    gameCtx.beginPath();
                    gameCtx.arc(p.x, p.y, 2, 0, Math.PI * 2);
                    gameCtx.fill();

                    if (p.life <= 0) fw.particles.splice(j, 1);
                });

                if (fw.particles.length === 0) fireworks.splice(i, 1);
            }
        });

        gameCtx.fillStyle = '#9b7653';
        gameCtx.fillRect(0, HEIGHT / 2, WIDTH, HEIGHT / 2);

        var zBuffer = new Array(WIDTH).fill(Infinity);

        for (let i = 0; i < NUM_RAYS; i++) {
            var rayAngle = player.angle - FOV / 2 + (i / NUM_RAYS) * FOV;
            var hit = castRay(rayAngle);
            var correctedDist = hit.distance * Math.cos(rayAngle - player.angle);
            zBuffer[i] = correctedDist;

            var distanceToProjection = (WIDTH / 2) / Math.tan(FOV / 2);
            var wallHeight = (TILE_SIZE / correctedDist) * distanceToProjection;
            var wallTop = Math.max(0, (HEIGHT - wallHeight) / 2);
            var wallBottom = Math.min(HEIGHT, (HEIGHT + wallHeight) / 2);

            let textureX;
            if (Math.floor(hit.rayX / TILE_SIZE) === hit.rayX / TILE_SIZE) {

                textureX = hit.rayY % TILE_SIZE;
            } else {

                textureX = hit.rayX % TILE_SIZE;
            }

            textureX = Math.floor(textureX / TILE_SIZE * wallTexture.width);

            gameCtx.drawImage(
                wallTexture,
                textureX, 0, 1, wallTexture.height,
                i, wallTop, 1, wallBottom - wallTop
            );

            var brightness = Math.min(1, 1 - (hit.distance / MAX_DEPTH));
            gameCtx.globalAlpha = 1 - (1 - brightness);
            gameCtx.fillStyle = 'black';
            gameCtx.fillRect(i, wallTop, 1, wallBottom - wallTop);
            gameCtx.globalAlpha = 1;
        }

        const allSprites = [
            ...enemies.map(enemy => ({
                type: 'enemy',
                x: enemy.x,
                y: enemy.y,
                distance: Math.sqrt(Math.pow(enemy.x - player.x, 2) + Math.pow(enemy.y - player.y, 2)),
                enemy: enemy
            })),
            ...bloodSprites.map((bloodSprite, index) => ({
                type: 'blood',
                index: index,
                x: bloodSprite.x,
                y: bloodSprite.y,
                distance: Math.sqrt(Math.pow(bloodSprite.x - player.x, 2) + Math.pow(bloodSprite.y - player.y, 2)),
                bloodSprite: bloodSprite
            })),
            ...allied.map(alliedUnit => ({
                type: 'alliedUnit',
                x: alliedUnit.x,
                y: alliedUnit.y,
                distance: Math.sqrt(Math.pow(alliedUnit.x - player.x, 2) + Math.pow(alliedUnit.y - player.y, 2)),
                alliedUnit: alliedUnit
            }))
        ];

        allSprites.sort((a, b) => Math.sqrt(Math.pow(b.x - player.x, 2) + Math.pow(b.y - player.y, 2)) - Math.sqrt(Math.pow(a.x - player.x, 2) + Math.pow(a.y - player.y, 2)));

        allSprites.forEach(spriteToRender => {
            if (spriteToRender.type == 'enemy') {
                renderEnemy(spriteToRender.enemy, WIDTH, HEIGHT, zBuffer)
            } else if (spriteToRender.type == 'blood') {
                renderBloodSprite(spriteToRender.bloodSprite, spriteToRender.index, WIDTH, HEIGHT, zBuffer)
            } else if (spriteToRender.type == 'alliedUnit') {
                renderAlliedUnit(spriteToRender.alliedUnit, WIDTH, HEIGHT, zBuffer)
            }
        });

        renderWeapon(WIDTH, HEIGHT);

        gameCtx.save();
        gameCtx.globalCompositeOperation = 'lighter';
        particles.forEach((particle, index) => {
            if (!particle.update()) {
                particles.splice(index, 1);
                return;
            }

            gameCtx.fillStyle = `rgba(255, 0, 0, ${particle.life})`;
            gameCtx.beginPath();
            gameCtx.arc(
                WIDTH / 2 + (particle.x - player.x) * 10,
                HEIGHT / 2 + (particle.y - player.y) * 10,
                particle.size,
                0,
                Math.PI * 2
            );
            gameCtx.fill();
        });
        gameCtx.restore();

        if (player.attackCooldown > 0) player.attackCooldown--;
        enemies.forEach(enemy => enemy.update());
        allied.forEach(alliedUnit => alliedUnit.update(enemies));

        if (keys['ArrowUp'] || keys['w'] || keys['W']) {
            const newX = player.x + Math.cos(player.angle) * player.speed;
            const newY = player.y + Math.sin(player.angle) * player.speed;
            if (!isWall(newX, player.y)) player.x = newX;
            if (!isWall(player.x, newY)) player.y = newY;
        }
        if (keys['ArrowDown'] || keys['s'] || keys['S']) {
            const newX = player.x - Math.cos(player.angle) * player.speed;
            const newY = player.y - Math.sin(player.angle) * player.speed;
            if (!isWall(newX, player.y)) player.x = newX;
            if (!isWall(player.x, newY)) player.y = newY;
        }
        if (keys['ArrowLeft'] || keys['a'] || keys['A']) player.angle -= player.rotationSpeed;
        if (keys['ArrowRight'] || keys['d'] || keys['D']) player.angle += player.rotationSpeed;

        if (!shouldRender) { return }
        animationFrameId = requestAnimationFrame(render);
    }

    function isWall(x, y) {
        const gridX = Math.floor(x / TILE_SIZE);
        const gridY = Math.floor(y / TILE_SIZE);
        return gridY < 0 || gridX < 0 || gridY >= map.length || gridX >= map[0].length || map[gridY][gridX] === 1;
    }

    function castRay(angle) {
        let rayX = player.x;
        let rayY = player.y;
        let distance = 0;

        while (distance < MAX_DEPTH) {
            rayX += Math.cos(angle) * RAY_STEP;
            rayY += Math.sin(angle) * RAY_STEP;
            distance += RAY_STEP;

            if (isWall(rayX, rayY)) {
                return {
                    distance,
                    rayX,
                    rayY
                };
            }
        }
        return { distance: MAX_DEPTH, rayX, rayY };
    }

    function handleIntersection(entries, observer) {
        entries.forEach(entry => {
            shouldRender = entry.isIntersecting;
            if (shouldRender) {
                console.log('game entered viewport, start rendering');
                requestAnimationFrame(render);
                // observer.unobserve(entry.target);
            } else {
                console.log('Game exitd viewport, pause rendering');
                cancelAnimationFrame(animationFrameId)
            }
        });
    }

    const observer = new IntersectionObserver(handleIntersection, {
        root: null,
        rootMargin: '-400px',
        threshold: 0,
    });

    requestAnimationFrame(render);
    observer.observe(gameCanvas);

}