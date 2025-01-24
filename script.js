console.log("%cI know this website is mid and silly, I just made it quickly to host my cv is all, don't let it distract from my actual experience and capabilities.", 'font-size: 20px; font-weight: bold; color: blue;');

const colors = ['#ff6347', '#ff1493', '#ffd700', '#adff2f', '#00bfff', '#ff4500', '#7fff00', '#ff69b4', '#8a2be2'];

var bg_paintDensity_far = 200;
var bg_paintDensity_mid = 200;
var bg_paintDensity_close = 200;
var bg_3dCubesDensity = 500;

const ParticleSystem_interpolate = {
    config: {
        particlesPerFrame: 1,
        maxParticles: 200,
        particleLifetime: 300,
        inactivityTimeout: 500,
        particleSpread: 5,
        interpolationPoints: 5
    },

    state: {
        particles: new Set(),
        lastX: 0,
        lastY: 0,
        lastClientX: 0,
        lastClientY: 0,
        previousX: null,
        previousY: null,
        isActive: false,
        inactivityTimer: null,
        containerElement: null
    },

    init() {
        this.state.containerElement = document.createElement('div');
        this.state.containerElement.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 9999;';
        document.body.appendChild(this.state.containerElement);

        document.addEventListener('pointermove', this.handlepointermove.bind(this), { passive: true });

        this.animate();
    },

    createParticle(x, y) {
        const particle = document.createElement('div');
        particle.className = 'particle';

        particle.style.cssText = `
      position: absolute;
      left: ${x + this.config.particleSpread}px;
      top: ${y + this.config.particleSpread}px;
      opacity: 0;
      transition: all 0.3s ease-out;
    `;

        this.state.containerElement.appendChild(particle);
        this.state.particles.add(particle);

        particle.getBoundingClientRect();

        particle.style.opacity = '1';
        particle.style.transform = 'translate3d(-50%, -50%, 0) scale(0)';

        setTimeout(() => {
            if (this.state.particles.has(particle)) {
                this.state.particles.delete(particle);
                particle.remove();
            }
        }, this.config.particleLifetime);
    },

    handlepointermove(e) {

        this.state.previousX = this.state.lastX || e.clientX;
        this.state.previousY = this.state.lastY || e.clientY;

        this.state.lastClientX = e.clientX;
        this.state.lastClientY = e.clientY;
        this.updatePosition();
        this.activate();
    },

    handleScroll() {
        this.state.previousX = this.state.lastX;
        this.state.previousY = this.state.lastY;
        this.updatePosition();
        this.activate();
    },

    updatePosition() {
        this.state.lastX = this.state.lastClientX;
        this.state.lastY = this.state.lastClientY;
    },

    activate() {
        this.state.isActive = true;

        if (this.state.inactivityTimer) {
            clearTimeout(this.state.inactivityTimer);
        }

        this.state.inactivityTimer = setTimeout(() => {
            this.state.isActive = false;
            this.state.inactivityTimer = null;
        }, this.config.inactivityTimeout);
    },

    interpolatePoints(x1, y1, x2, y2, count) {
        const points = [];
        for (let i = 0; i <= count; i++) {
            const ratio = i / count;
            points.push({
                x: x1 + (x2 - x1) * ratio,
                y: y1 + (y2 - y1) * ratio
            });
        }
        return points;
    },

    generateParticles() {
        if (!this.state.isActive || !this.state.lastX || !this.state.lastY ||
            this.state.particles.size >= this.config.maxParticles) {
            return;
        }

        const spread = this.config.particleSpread;

        if (this.state.previousX !== null && this.state.previousY !== null) {
            const distance = Math.hypot(
                this.state.lastX - this.state.previousX,
                this.state.lastY - this.state.previousY
            );

            if (distance > 10) {
                const points = this.interpolatePoints(
                    this.state.previousX,
                    this.state.previousY,
                    this.state.lastX,
                    this.state.lastY,
                    this.config.interpolationPoints
                );

                points.forEach(point => {
                    for (let i = 0; i < this.config.particlesPerFrame; i++) {
                        const randomX = point.x + (Math.random() * 2 - 1) * spread;
                        const randomY = point.y + (Math.random() * 2 - 1) * spread;
                        this.createParticle(randomX, randomY);
                    }
                });
                return;
            }
        }

        for (let i = 0; i < this.config.particlesPerFrame; i++) {
            const randomX = this.state.lastX + (Math.random() * 2 - 1) * spread;
            const randomY = this.state.lastY + (Math.random() * 2 - 1) * spread;
            this.createParticle(randomX, randomY);
        }
    },

    animate() {
        this.generateParticles();
        requestAnimationFrame(this.animate.bind(this));
    }
};

var mouse_lastClientX = 0;
var mouse_lastClientY = 0;

const ParticleSystem_extra = {
    config: {
        maxParticles: 200,
        particleLifetime: 300,
        particleSpread: 60,
        samplingRate: 16,
        inactivityTimeout: 250,
        particlesPerFrame: 1,
        maxParticlesPerFrame: 1
    },

    state: {
        particles: new Set(),
        mouseX: 0,
        mouseY: 0,
        lastX: 0,
        lastY: 0,
        velocityX: 0,
        velocityY: 0,
        lastTimestamp: 0,
        isTracking: false,
        containerElement: null,
        inactivityTimer: null,
    },

    init() {
        this.state.containerElement = document.createElement('div');
        this.state.containerElement.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 9999;';
        document.body.appendChild(this.state.containerElement);

        window.addEventListener('pointermove', this.handlePointerMove.bind(this), { passive: true });

        this.startTracking();
    },

    createParticle(x, y) {
        if (this.state.particles.size >= this.config.maxParticles) {
            return null;
        }

        const particle = document.createElement('div');
        particle.className = 'particle';

        particle.style.cssText = `
      position: absolute;
      left: ${x}px;
      top: ${y}px;
      opacity: 0;
      transition: all ${this.config.particleLifetime}ms ease-out;
    `;

        this.state.containerElement.appendChild(particle);
        this.state.particles.add(particle);

        particle.getBoundingClientRect();

        particle.style.opacity = '1';
        particle.style.transform = 'translate3d(-50%, -50%, 0) scale(0)';

        const removeParticle = () => {
            if (this.state.particles.has(particle)) {
                this.state.particles.delete(particle);
                particle.remove();
            }
        };

        const timer = setTimeout(removeParticle, this.config.particleLifetime);
        particle.addEventListener('transitionend', () => {
            clearTimeout(timer);
            removeParticle();
        }, { once: true });

        return particle;
    },

    resetInactivityTimer() {
        if (this.state.inactivityTimer) {
            clearTimeout(this.state.inactivityTimer);
        }

        this.state.isTracking = true;
        this.state.inactivityTimer = setTimeout(() => {
            this.state.isTracking = false;
            this.state.inactivityTimer = null;
            this.state.velocityX = 0;
            this.state.velocityY = 0;
        }, this.config.inactivityTimeout);
    },

    handlePointerMove(e) {
        this.state.mouseX = e.clientX;
        this.state.mouseY = e.clientY;

        const timestamp = performance.now();
        const dt = timestamp - this.state.lastTimestamp;

        if (dt > 0) {
            this.state.velocityX = (this.state.mouseX - this.state.lastX) / dt;
            this.state.velocityY = (this.state.mouseY - this.state.lastY) / dt;
        }

        this.state.lastX = this.state.mouseX;
        this.state.lastY = this.state.mouseY;
        this.state.lastTimestamp = timestamp;

        this.resetInactivityTimer();
    },
    handleScroll() {
        this.resetInactivityTimer();
    },

    startTracking() {
        let lastDrawTime = performance.now();

        const track = () => {
            const now = performance.now();
            const dt = now - lastDrawTime;

            if (this.state.isTracking && dt >= this.config.samplingRate) {
                if (this.state.particles.size >= this.config.maxParticles) {
                    lastDrawTime = now;
                    requestAnimationFrame(track);
                    return;
                }

                const predictedX = this.state.mouseX + this.state.velocityX * dt;
                const predictedY = this.state.mouseY + this.state.velocityY * dt;

                const speed = Math.sqrt(this.state.velocityX ** 2 + this.state.velocityY ** 2);
                const speedFactor = Math.min(speed / 200, 1);
                const particlesThisFrame = Math.min(
                    Math.ceil(this.config.particlesPerFrame * (1 + speedFactor * 2)),
                    this.config.maxParticlesPerFrame
                );

                const remainingSlots = this.config.maxParticles - this.state.particles.size;
                const steps = Math.min(particlesThisFrame, remainingSlots);

                for (let i = 0; i < steps; i++) {
                    const t = i / steps;
                    const x = this.state.lastX + (predictedX - this.state.lastX) * t;
                    const y = this.state.lastY + (predictedY - this.state.lastY) * t;

                    const spread = Math.min(this.config.particleSpread * (1 + speedFactor), 1000);

                    if (!this.createParticle(
                            x + (Math.random() * 2 - 1) * spread,
                            y + (Math.random() * 2 - 1) * spread
                        )) {
                        break;
                    }
                }

                lastDrawTime = now;
            }

            requestAnimationFrame(track);
        };

        track();
    }
};

const backgroundCanvas = document.getElementById('backgroundLayer');
const foregroundCanvas = document.getElementById('foregroundLayer');
const paintCanvas = document.getElementById('paintCanvas');

const bgCtx = backgroundCanvas.getContext('2d');
const fgCtx = foregroundCanvas.getContext('2d');
const paintCtx = paintCanvas.getContext('2d');

paintCanvas.width = window.innerWidth;
paintCanvas.height = window.innerHeight;

function drawColourOrb(x, y, color, size, gravity, velocity) {
    const dripLength = Math.max(size, 10);
    paintCtx.beginPath();
    paintCtx.arc(x, y, size, 0, 2 * Math.PI);
    paintCtx.fillStyle = color;
    paintCtx.globalAlpha = 0.6;
    paintCtx.fill();

    paintCtx.beginPath();
    paintCtx.moveTo(x, y);
    paintCtx.lineTo(x + velocity.x, y + velocity.y + dripLength);
    paintCtx.strokeStyle = color;
    paintCtx.lineWidth = size * 2;
    paintCtx.globalAlpha = 0.6;
    paintCtx.stroke();

    velocity.y += gravity;
    x += velocity.x;
    y += velocity.y;

    paintCtx.beginPath();
    paintCtx.arc(x, y, size, 0, 2 * Math.PI);
    paintCtx.fillStyle = color;
    paintCtx.globalAlpha = 0.6;
    paintCtx.fill();
}

function generateBackground() {
    const numSplatters = bg_paintDensity_far;
    const gravity = 50;
    const dropletSize = 20;
    paintCtx.clearRect(0, 0, paintCanvas.width, paintCanvas.height);
    for (let i = 0; i < numSplatters; i++) {
        const x = Math.random() * paintCanvas.width;
        const y = Math.random() * paintCanvas.height;
        const color = colors[Math.floor(Math.random() * colors.length)];
        const size = Math.random() * dropletSize;
        const velocity = { x: (Math.random() * 100 - 1) * (Math.random() < 0.5 ? -1 : 1), y: (Math.random() * 100 - 1) * (Math.random() < 0.5 ? -1 : 1) };
        drawColourOrb(x, y, color, size, gravity, velocity);
    }
}

function drawLayer(ctx, density, colorArray, sizeMultiplier) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    for (let i = 0; i < density; i++) {
        const x = Math.random() * ctx.canvas.width;
        const y = Math.random() * ctx.canvas.height;
        const size = Math.random() * sizeMultiplier;
        const color = colorArray[Math.floor(Math.random() * colorArray.length)];

        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.5;
        ctx.fill();
    }
}

function generateBackgrounds() {
    drawLayer(bgCtx, bg_paintDensity_mid, colors, 30);
    drawLayer(fgCtx, bg_paintDensity_close, colors, 20);
}

function updateParallax() {

    const paintOffsetX = (mouse_lastClientX * 0.1 + window.scrollX) * 0.1;
    const paintOffsetY = (mouse_lastClientY * 0.2 - window.scrollY) * 0.1;

    const bgOffsetX = (mouse_lastClientX * 0.1 + window.scrollX) * 0.2;
    const bgOffsetY = (mouse_lastClientY * 0.2 - window.scrollY) * 0.2;

    const fgOffsetX = (mouse_lastClientX * 0.1 + window.scrollX) * 0.4;
    const fgOffsetY = (mouse_lastClientY * 0.2 - window.scrollY) * 0.4;

    paintCanvas.style.transform = `translate3d(${paintOffsetX}px, ${paintOffsetY}px, 0)`;
    backgroundCanvas.style.transform = `translate3d(${bgOffsetX}px, ${bgOffsetY}px, 0)`;
    foregroundCanvas.style.transform = `translate3d(${fgOffsetX}px, ${fgOffsetY}px, 0)`;

    requestAnimationFrame(updateParallax);
}

window.addEventListener('resize', () => {
    resizeCanvases();
    generateBackground();
    generateBackgrounds();
});

function resizeCanvases() {
    [backgroundCanvas, foregroundCanvas, paintCanvas].forEach(canvas => {
        canvas.width = window.innerWidth + 200;
        canvas.height = 2000
    });
}

resizeCanvases();
generateBackground();
generateBackgrounds();
updateParallax();

const heartSphere = document.getElementById('heartSphere');
const numHeartFaces = 25;
const radius = 50;

for (let i = 0; i < numHeartFaces; i++) {
    const heartFace = document.createElement('div');
    heartFace.classList.add('heartFace');

    const theta = (i / numHeartFaces) * Math.PI * 2;
    const phi = (Math.random() * Math.PI) - Math.PI / 2;

    const x = radius * Math.cos(phi) * Math.cos(theta);
    const y = radius * Math.cos(phi) * Math.sin(theta);
    const z = radius * Math.sin(phi);

    heartFace.style.transform = `translate3d(${x}px, ${y}px, ${z}px) rotateY(${theta}rad) rotateX(${phi}rad)`;

    heartFace.addEventListener('click', el => el.target.style.background = `radial-gradient(circle, ${colors[Math.floor(Math.random() * colors.length)]}, #ff4500)`)

    heartSphere.appendChild(heartFace);
}

function hexToRgba(hex, a) {

    hex = hex.replace(/^#/, '');

    if (hex.length === 3) {
        hex = hex.split('').map(c => c + c).join('');
    }

    let r = parseInt(hex.slice(0, 2), 16);
    let g = parseInt(hex.slice(2, 4), 16);
    let b = parseInt(hex.slice(4, 6), 16);

    return `rgba(${r}, ${g}, ${b}, ${a})`;
}

var particles_bg = [];
var starbursts_created = 0;
var starburstSpeed = 4;

function animateParticleBg() {
    particles_bg.forEach((p, i) => {

        p.x += p.vx;
        p.y += p.vy;
        p.life--;

        if (p.life <= 0) particles_bg.splice(i, 1);

        if (!p.colorType) {
            p.colorType = Math.floor(Math.random() * 3) + 1;
        }

        p.opacity = p.life / 200;

        if (p.colorType == 1) {
            if (!p.color) {
                p.color = colors[Math.floor(Math.random() * colors.length)];
            }

            fgCtx.fillStyle = hexToRgba(p.color, p.opacity)
        } else if (p.colorType == 2) {
            fgCtx.fillStyle = hexToRgba(colors[Math.floor(Math.random() * colors.length)], p.opacity)
        } else if (p.colorType == 3) {
            fgCtx.fillStyle = `rgba(255, 100, 50, ${p.opacity})`;
        }

        fgCtx.beginPath();
        fgCtx.arc(p.x, p.y, 1, 0, Math.PI * 2);
        fgCtx.fill();
    });

    requestAnimationFrame(animateParticleBg)

}

const MBCanvas = document.getElementById('mandelbrotCanvas');
const MBSizeRatio = MBCanvas.width / parseInt(MBCanvas.style.width);
class MandelbrotRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', { willReadFrequently: true });

        this.width = canvas.width;
        this.height = canvas.height;
        this.buffer = new ArrayBuffer(this.width * this.height * 4);
        this.u8Buffer = new Uint8ClampedArray(this.buffer);
        this.imageData = new ImageData(this.u8Buffer, this.width, this.height);

        this.width = canvas.width;
        this.height = canvas.height;

        this.zoomLevel = 1;
        this.offsetX = -0.5;
        this.offsetY = 0;
        this.zoomSensitivity = 0.5;
        this.minZoom = 0.5;
        this.maxZoom = 100000000000000000;
        this.colorPalette = this.generateColorPalette(1024);
    }

    generateColorPalette(size) {
        const palette = new Uint32Array(size);
        for (let i = 0; i < size; i++) {
            const hue = (i * 10) % 360;
            const s = 70,
                l = 50;

            const c = (1 - Math.abs(2 * l / 100 - 1)) * s / 100;
            const x = c * (1 - Math.abs((hue / 60) % 2 - 1));
            const m = l / 100 - c / 2;

            let r, g, b;
            if (hue < 60)[r, g, b] = [c, x, 0];
            else if (hue < 120)[r, g, b] = [x, c, 0];
            else if (hue < 180)[r, g, b] = [0, c, x];
            else if (hue < 240)[r, g, b] = [0, x, c];
            else if (hue < 300)[r, g, b] = [x, 0, c];
            else [r, g, b] = [c, 0, x];

            palette[i] = (
                (255 << 24) |
                (Math.round((b + m) * 255) << 16) |
                (Math.round((g + m) * 255) << 8) |
                Math.round((r + m) * 255)
            );
        }
        return palette;
    }

    render() {
        const start = performance.now();
        const width = this.width;
        const height = this.height;
        const palette = this.colorPalette;
        const u8Buffer = this.u8Buffer;

        const fixedZoom = this.zoomLevel * 0.5 * width;
        const fixedOffsetX = this.offsetX;
        const fixedOffsetY = this.offsetY;
        const maxIter = Math.min(1000, Math.max(200, 200 + Math.floor(50 * Math.log(this.zoomLevel))));

        const renderBatch = (startY, endY) => {
            for (let py = startY; py < endY; py++) {
                for (let px = 0; px < width; px++) {
                    const x0 = (px - width / 2) / fixedZoom + fixedOffsetX;
                    const y0 = (py - height / 2) / fixedZoom + fixedOffsetY;

                    let x = 0,
                        y = 0;
                    let iteration = 0;

                    while (x * x + y * y <= 4 && iteration < maxIter) {
                        const xTemp = x * x - y * y + x0;
                        y = 2 * x * y + y0;
                        x = xTemp;
                        iteration++;
                    }

                    const colorIndex = iteration < maxIter ?
                        Math.floor(Math.sqrt(iteration) * 10) % 1024 :
                        0;
                    const color = palette[colorIndex];

                    const index = (py * width + px) * 4;
                    u8Buffer[index] = color & 0xFF;
                    u8Buffer[index + 1] = (color >> 8) & 0xFF;
                    u8Buffer[index + 2] = (color >> 16) & 0xFF;
                    u8Buffer[index + 3] = 255;
                }
            }
        };

        const batchSize = Math.max(10, Math.floor(height / (navigator.hardwareConcurrency || 4)));
        for (let y = 0; y < height; y += batchSize) {
            renderBatch(y, Math.min(y + batchSize, height));
        }

        this.ctx.putImageData(this.imageData, 0, 0);

        const end = performance.now();
        console.log(`Render time: ${end - start}ms`, this.zoomLevel);
    }

    handleZoom(x, y, delta) {
        const zoomFactor = delta > 0 ? 1 / (1 + this.zoomSensitivity) : 1 + this.zoomSensitivity;

        const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoomLevel * zoomFactor));

        if (newZoom !== this.zoomLevel) {
            const canvasX = delta < 0 ? (x - this.width / 2) / (0.5 * this.zoomLevel * this.width) : 0;
            const canvasY = delta < 0 ? (y - this.height / 2) / (0.5 * this.zoomLevel * this.height) : 0;

            this.offsetX += canvasX * (1 - 1 / zoomFactor);
            this.offsetY += canvasY * (1 - 1 / zoomFactor);
            this.zoomLevel = newZoom;

            logMandelBrot('mandelbrotZoom', { zoomLevel: this.zoomLevel });

            if (this.zoomLevel >= 1e15) {
                this.showPrecisionWarning();
            } else {
                this.hidePrecisionWarning();
            }

            requestAnimationFrame(() => this.render());
        }
    }

    showPrecisionWarning() {
        document.getElementById('mandelbrotMessage').innerHTML = `..uh.. ?</br><code style="padding: 0 5px">Floating-point precision limit reached.</code>`;
        document.getElementById('mandelbrotMessage').style.display = 'block';
        logEvent('Zeno Limit Reached');
    }

    hidePrecisionWarning() {
        const warning = document.getElementById('mandelbrotMessage');
        document.getElementById('mandelbrotResetButtonZZ').style.display = 'block';
        document.getElementById('mandelbrotMessage').style.display = 'none';
    }

    resetZoom() {
        // this.hidePrecisionWarning();
        this.zoomLevel = 1;
        this.offsetX = -0.5;
        this.offsetY = 0;
        this.zoomSensitivity = 0.5;
        this.minZoom = 0.5;
        this.maxZoom = 100000000000000000;
        requestAnimationFrame(() => this.render());
    }
}

const MBRenderer = new MandelbrotRenderer(MBCanvas);
MBRenderer.render();

MBCanvas.addEventListener('wheel', (e) => {
    e.preventDefault();

    const x = e.offsetX * MBSizeRatio
    const y = e.offsetY * MBSizeRatio
    MBRenderer.handleZoom(x, y, e.deltaY);
});

MBCanvas.addEventListener('click', (e) => {
    e.preventDefault();

    const x = e.offsetX * MBSizeRatio
    const y = e.offsetY * MBSizeRatio
    MBRenderer.handleZoom(x, y, -100);
});

// document.getElementById('mandelbrotResetButton').addEventListener('click', (e) => {
//     e.preventDefault();
//     MBRenderer.resetZoom()
// });

// document.getElementById('mandelbrotResetButton').addEventListener('wheel', (e) => {
//     e.preventDefault();

//     const x = e.offsetX * MBSizeRatio
//     const y = e.offsetY * MBSizeRatio
//     MBRenderer.handleZoom(x, y, e.deltaY);
// });

document.getElementById('mandelbrotResetButtonZZ').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('mandelbrotMessage').innerHTML = `Can you find Zeno?<br><br><code style="padding: 0 5px; font-weight: normal"><span style='font-weight: 800; font-size: 16px;'>+ Zoom In +</span><br>ScrollUp or LeftClick<br><br><span style='font-weight: 800; font-size: 16px;'>- Zoom Out -</span><br>ScrollDown or RightClick</code><br><br>`;
    document.getElementById('mandelbrotMessage').style.display = 'block';
    document.getElementById('mandelbrotResetButtonZZ').style.display = 'none';
    MBRenderer.resetZoom()
});




MBCanvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();

    const x = e.offsetX * MBSizeRatio
    const y = e.offsetY * MBSizeRatio
    MBRenderer.handleZoom(x, y, 100);
});

if (!isMobile) {
    document.addEventListener('pointermove', (e) => {
        mouse_lastClientX = e.clientX;
        mouse_lastClientY = e.clientY;
    });

    window.addEventListener('click', (e) => {

        const rect = foregroundCanvas.getBoundingClientRect();

        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        let colorType = Math.floor(Math.random() * 4);

        starbursts_created++;
        for (let i = 0; i < 50; i++) {
            particles_bg.push({
                colorType: colorType,
                x: mouseX,
                y: mouseY,
                vx: Math.random() * starburstSpeed - starburstSpeed / 2,
                vy: Math.random() * starburstSpeed - starburstSpeed / 2,
                opacity: 1,
                maxLife: 50 * starbursts_created + 50,
                life: 50 * starbursts_created + 50
            });
        }

    });
    animateParticleBg()
    ParticleSystem_interpolate.init();
    ParticleSystem_extra.init();
}





const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('threejsCubeCanvas'), antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let intersectedObject = null;

const mouseParallax = {
    x: 0,
    y: 0
};

let scrollPercent = 0;

const animationPatterns = [

    (cube, progress) => {
        const scale = 1 + Math.sin(progress * Math.PI) * 0.5;
        cube.scale.set(scale, scale, scale);
        if (cube.glow) cube.glow.scale.set(scale * 1.2, scale * 1.2, scale * 1.2);
        cube.rotation.y += 0.3;
    },

    (cube, progress) => {
        const bounce = Math.abs(Math.sin(progress * Math.PI * 2));
        cube.position.y = cube.userData.originalPosition.y + bounce * 2;
        if (cube.glow) cube.glow.position.y = cube.position.y;
        cube.rotation.z += 0.05;
    },

    (cube, progress) => {
        const angle = progress * Math.PI * 2;
        const radius = progress * 2;
        cube.position.x = cube.userData.originalPosition.x + Math.cos(angle) * radius;
        cube.position.z = cube.userData.originalPosition.z + Math.sin(angle) * radius;
        if (cube.glow) {
            cube.glow.position.x = cube.position.x;
            cube.glow.position.z = cube.position.z;
        }
        cube.scale.setScalar(1 + progress * 0.5);
        if (cube.glow) cube.glow.scale.setScalar((1 + progress * 0.5) * 1.2);
    }
];

const cubes = [];
for (let i = 0; i < bg_3dCubesDensity; i++) {
    const geometry = new THREE.BoxGeometry();
    const material = new THREE.MeshPhongMaterial({
        color: new THREE.Color(Math.random(), Math.random(), Math.random()),
        emissive: new THREE.Color(0, 0, 0),
        wireframe: Math.random() > 0.85 ? true : false
    });
    const cube = new THREE.Mesh(geometry, material);

    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        wireframe: true
    });
    const glowCube = new THREE.Mesh(geometry, glowMaterial);
    cube.glow = glowCube;

    cube.rotation.x = Math.random();
    cube.rotation.y = Math.random();
    cube.rotation.z = Math.random();

    cube.position.x = Math.random() * 60 - 30;
    cube.position.y = Math.random() * 60 - 30;
    cube.position.z = Math.random() * 60 - 30;

    glowCube.position.copy(cube.position);
    glowCube.scale.multiplyScalar(1.2); 

    cube.userData = {
        originalPosition: cube.position.clone(),
        originalScale: cube.scale.clone(),
        originalColor: material.color.clone(),
        rotationSpeed: {
            x: (Math.random() - 0.5) * 0.005,
            y: (Math.random() - 0.5) * 0.005,
            z: (Math.random() - 0.5) * 0.005
        },
        parallaxStrength: Math.random() * 2 + 0.5,
        hovered: false,
        transitionProgress: 0,
        animationPattern: 0 
    };

    scene.add(cube);
    scene.add(glowCube);
    cubes.push(cube);
}

const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(0, 1, 1);
scene.add(directionalLight);

camera.position.z = 30;
let hoveredCube = null;
let shouldRayCast = false;

document.addEventListener('mousemove', (event) => {

    if (event.target.id == 'mainmain') {
        shouldRayCast = true;
    } else {
        shouldRayCast = false;

    }
    mouseParallax.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouseParallax.y = -(event.clientY / window.innerHeight) * 2 + 1;

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

});

window.addEventListener('scroll', () => {
    scrollPercent = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight);
});

function animate() {
    requestAnimationFrame(animate);
    var intersects = [];
    if (shouldRayCast) {
        raycaster.setFromCamera(mouse, camera);
        intersects = raycaster.intersectObjects(cubes);

    }
    cubes.forEach(cube => {
        if (!intersects.find(intersect => intersect.object === cube)) {
            if (cube.userData.hovered) {
                cube.userData.hovered = false;
            }
        }
    });

    if (intersects.length > 0) {
        const hoveredCube = intersects[0].object;
        hoveredCube.userData.hovered = true;
    }

    cubes.forEach(cube => {

        cube.rotation.x += cube.userData.rotationSpeed.x;
        cube.rotation.y += cube.userData.rotationSpeed.y;
        cube.rotation.z += cube.userData.rotationSpeed.z;
        if (cube.glow) {
            cube.glow.rotation.copy(cube.rotation);
        }

        const strength = cube.userData.parallaxStrength;
        cube.position.x = cube.userData.originalPosition.x + (mouseParallax.x * strength);
        cube.position.y = cube.userData.originalPosition.y + (mouseParallax.y * strength);
        cube.position.z = cube.userData.originalPosition.z + (scrollPercent * 10 * strength);
        if (cube.glow) {
            cube.glow.position.copy(cube.position);
        }

        if (cube.userData.hovered) {
            cube.userData.transitionProgress = Math.min(1, cube.userData.transitionProgress + 0.1);
        } else {
            cube.userData.transitionProgress = Math.max(0, cube.userData.transitionProgress - 0.1);

            cube.scale.lerp(cube.userData.originalScale, 0.1);
            cube.position.lerp(new THREE.Vector3(
                cube.userData.originalPosition.x + (mouseParallax.x * strength),
                cube.userData.originalPosition.y + (mouseParallax.y * strength),
                cube.userData.originalPosition.z + (scrollPercent * 10 * strength)
            ), 0.1);
            if (cube.glow) {
                cube.glow.position.copy(cube.position);
                cube.glow.scale.copy(cube.scale).multiplyScalar(1.2);
            }
        }

        if (cube.userData.transitionProgress > 0) {
            animationPatterns[cube.userData.animationPattern](cube, cube.userData.transitionProgress);
        }

        const progress = cube.userData.transitionProgress;
        cube.material.emissive.setRGB(progress, progress, progress);
        if (cube.glow) {
            cube.glow.material.opacity = progress * 0.5;
        }

        const targetColor = cube.userData.hovered ?
            new THREE.Color(1, 1, 1) :
            cube.userData.originalColor;
        cube.material.color.lerp(targetColor, 0.1);
    });

    camera.position.y = -scrollPercent * 10;

    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height);
});

animate();