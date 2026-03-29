// Основной игровой файл

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Элементы UI
const speedElement = document.getElementById('speed');
const driftAngleElement = document.getElementById('drift-angle');

// Настройка размера канваса
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Состояние ввода
const input = {
    up: false,
    down: false,
    left: false,
    right: false,
    handbrake: false
};

// Обработчики клавиатуры
document.addEventListener('keydown', (e) => {
    switch(e.code) {
        case 'KeyW':
        case 'ArrowUp':
            input.up = true;
            break;
        case 'KeyS':
        case 'ArrowDown':
            input.down = true;
            break;
        case 'KeyA':
        case 'ArrowLeft':
            input.left = true;
            break;
        case 'KeyD':
        case 'ArrowRight':
            input.right = true;
            break;
        case 'Space':
            input.handbrake = true;
            break;
    }
});

document.addEventListener('keyup', (e) => {
    switch(e.code) {
        case 'KeyW':
        case 'ArrowUp':
            input.up = false;
            break;
        case 'KeyS':
        case 'ArrowDown':
            input.down = false;
            break;
        case 'KeyA':
        case 'ArrowLeft':
            input.left = false;
            break;
        case 'KeyD':
        case 'ArrowRight':
            input.right = false;
            break;
        case 'Space':
            input.handbrake = false;
            break;
    }
});

// Создание автомобиля
const car = new CarPhysics(canvas.width / 2, canvas.height / 2);

// Камера
const camera = {
    x: 0,
    y: 0,
    smoothness: 0.1
};

function updateCamera(dt) {
    // Плавное слежение за автомобилем
    const targetX = car.x - canvas.width / 2;
    const targetY = car.y - canvas.height / 2;
    
    camera.x += (targetX - camera.x) * camera.smoothness;
    camera.y += (targetY - camera.y) * camera.smoothness;
}

// Отрисовка трассы
const track = {
    checkpoints: [
        {x: 0, y: 0},
        {x: 800, y: 0},
        {x: 1200, y: 400},
        {x: 800, y: 800},
        {x: 0, y: 800},
        {x: -400, y: 400},
        {x: 0, y: 0}
    ],
    width: 120
};

function drawTrack() {
    ctx.save();
    ctx.strokeStyle = '#3a3a5a';
    ctx.lineWidth = track.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.beginPath();
    ctx.moveTo(track.checkpoints[0].x, track.checkpoints[0].y);
    for (let i = 1; i < track.checkpoints.length; i++) {
        ctx.lineTo(track.checkpoints[i].x, track.checkpoints[i].y);
    }
    ctx.closePath();
    ctx.stroke();
    
    // Разметка
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.setLineDash([30, 30]);
    ctx.stroke();
    
    ctx.restore();
}

// Отрисовка автомобиля
function drawCar() {
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);
    
    // Тень
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(-car.width/2 + 5, -car.height/2 + 5, car.width, car.height);
    
    // Корпус - белый AE86 стиль
    const gradient = ctx.createLinearGradient(-car.width/2, 0, car.width/2, 0);
    gradient.addColorStop(0, '#f5f5f5');
    gradient.addColorStop(1, '#e8e8e8');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(-car.width/2, -car.height/2, car.width, car.height);
    
    // Крыша
    ctx.fillStyle = '#2a2a4a';
    ctx.fillRect(-car.width/4, -car.height/2 + 3, car.width/2, car.height - 6);
    
    // Фары
    ctx.fillStyle = '#ffffaa';
    ctx.fillRect(car.width/2 - 3, -car.height/2 + 2, 3, 6);
    ctx.fillRect(car.width/2 - 3, car.height/2 - 8, 3, 6);
    
    // Задние фонари
    ctx.fillStyle = '#ff4444';
    ctx.fillRect(-car.width/2, -car.height/2 + 2, 3, 6);
    ctx.fillRect(-car.width/2, car.height/2 - 8, 3, 6);
    
    // Следы шин при заносе
    if (car.isDrifting() && car.getSpeed() > 100) {
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(-car.width/2 - 10, -car.height/2, 20, 4);
        ctx.fillRect(-car.width/2 - 10, car.height/2 - 4, 20, 4);
        ctx.globalAlpha = 1;
    }
    
    ctx.restore();
}

// Частицы дыма от заноса
let smokeParticles = [];

function createSmokeParticle() {
    if (car.isDrifting() && car.getSpeed() > 150) {
        smokeParticles.push({
            x: car.x - Math.cos(car.angle) * car.width/2,
            y: car.y - Math.sin(car.angle) * car.width/2,
            vx: (Math.random() - 0.5) * 50,
            vy: (Math.random() - 0.5) * 50,
            life: 1,
            size: Math.random() * 10 + 5
        });
    }
}

function updateSmokeParticles(dt) {
    for (let i = smokeParticles.length - 1; i >= 0; i--) {
        const p = smokeParticles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt * 2;
        p.size += dt * 10;
        
        if (p.life <= 0) {
            smokeParticles.splice(i, 1);
        }
    }
}

function drawSmokeParticles() {
    for (const p of smokeParticles) {
        ctx.globalAlpha = p.life * 0.4;
        ctx.fillStyle = '#888888';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
}

// Обновление UI
function updateUI() {
    const speedKmh = (car.getSpeed() * 0.36).toFixed(0); // Конвертация в км/ч
    speedElement.textContent = speedKmh;
    driftAngleElement.textContent = car.getDriftAngle();
    
    if (car.isDrifting()) {
        driftAngleElement.parentElement.style.color = '#ffcc00';
    } else {
        driftAngleElement.parentElement.style.color = '#fff';
    }
}

// Игровой цикл
let lastTime = 0;

function gameLoop(timestamp) {
    const dt = Math.min((timestamp - lastTime) / 1000, 0.1); // Ограничение dt
    lastTime = timestamp;
    
    // Очистка
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Обновление физики
    car.update(dt, input);
    updateCamera(dt);
    createSmokeParticle();
    updateSmokeParticles(dt);
    
    // Применение камеры
    ctx.save();
    ctx.translate(-camera.x, -camera.y);
    
    // Отрисовка
    drawTrack();
    drawSmokeParticles();
    drawCar();
    
    ctx.restore();
    
    // Обновление UI
    updateUI();
    
    requestAnimationFrame(gameLoop);
}

// Старт игры
requestAnimationFrame(gameLoop);

console.log('Дрифт игра запущена! Используйте WASD для управления, Пробел для ручника.');
