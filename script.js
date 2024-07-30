const cursor = document.createElement('div');
cursor.className = 'cursor';
document.body.appendChild(cursor);

const particlesPerFrame = 5;
const maxParticles = 1000;
let currParticles = 0;

function createParticle(x, y) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    document.body.appendChild(particle);

    particle.style.left = `${x}px`;
    particle.style.top = `${y}px`;

    requestAnimationFrame(() => {
        particle.style.opacity = 1;
        particle.style.transform = `translate(-50%, -50%) scale(0)`;
    });

    setTimeout(() => {
        particle.remove();
        currParticles--;
    }, 300);
}

let lastClientX = 0;
let lastClientY = 0;
let lastX = 0;
let lastY = 0;

document.addEventListener('mousemove', (e) => {
    lastClientX = e.clientX;
    lastClientY = e.clientY;
    lastX = lastClientX + window.scrollX;
    lastY = lastClientY + window.scrollY
    requestAnimationFrame(updateCursorLoc);
});

function updateCursorLoc() {
    cursor.style.left = `${lastX}px`;
    cursor.style.top = `${lastY}px`;
}

window.addEventListener('scroll', (e) => {
    lastX = lastClientX + window.scrollX;
    lastY = lastClientY + window.scrollY;
    requestAnimationFrame(updateCursorLoc);
});

function generateParticles() {
    if (lastX && lastY) {
        if (currParticles < maxParticles) {
            for (let i = 0; i < particlesPerFrame; i++) {
                createParticle(lastX + Math.random() * 10 - 5, lastY + Math.random() * 10 - 5);
                currParticles++;
            }
        }
    }
    requestAnimationFrame(generateParticles);
}

generateParticles();


///////////////////////////////////////////


const canvas = document.getElementById('paintCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const colors = ['#ff6347', '#ff1493', '#ffd700', '#adff2f', '#00bfff', '#ff4500', '#7fff00', '#ff69b4', '#8a2be2'];

function drawColourOrb(x, y, color, size, gravity, velocity) {
    const dripLength = Math.max(size, 10);
    ctx.beginPath();
    ctx.arc(x, y, size, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.6;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + velocity.x, y + velocity.y + dripLength);
    ctx.strokeStyle = color;
    ctx.lineWidth = size * 2;
    ctx.globalAlpha = 0.6;
    ctx.stroke();

    velocity.y += gravity;
    x += velocity.x;
    y += velocity.y;

    ctx.beginPath();
    ctx.arc(x, y, size, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.6;
    ctx.fill();
}

function generateBackground() {
    const numSplatters = 500;
    const gravity = 50;
    const dropletSize = 20;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < numSplatters; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const color = colors[Math.floor(Math.random() * colors.length)];
        const size = Math.random() * dropletSize;
        const velocity = { x: (Math.random() * 100 - 1) * (Math.random() < 0.5 ? -1 : 1), y: (Math.random() * 100 - 1) * (Math.random() < 0.5 ? -1 : 1) };
        drawColourOrb(x, y, color, size, gravity, velocity);
    }
}

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    generateBackground();
});

generateBackground();