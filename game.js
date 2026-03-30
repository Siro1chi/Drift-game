// Основной игровой файл

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Элементы UI
const carNameElement = document.getElementById('car-name');
const speedElement = document.getElementById('speed');
const driftAngleElement = document.getElementById('drift-angle');

// Настройка размера канваса
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Загрузка спрайтов автомобилей
const carSprites = {};
function loadCarSprites() {
    console.log('Loading car sprites...');
    
    const ae86Img = new Image();
    ae86Img.src = 'AE86.png';
    ae86Img.onload = () => {
        carSprites.ae86 = ae86Img;
        console.log('AE86 sprite loaded successfully');
    };
    ae86Img.onerror = () => {
        console.warn('Failed to load AE86.png');
    };
    
    const silviaImg = new Image();
    silviaImg.src = 'Silvia.png';
    silviaImg.onload = () => {
        carSprites.silvia = silviaImg;
        console.log('Silvia sprite loaded successfully');
    };
    silviaImg.onerror = () => {
        console.warn('Failed to load Silvia.png');
    };
}
loadCarSprites();

// Состояние ввода
const input = {
    up: false,
    down: false,
    left: false,
    right: false,
    handbrake: false
};

let currentCarType = 'ae86'; // тип текущей машины

// Функция для пересоздания машины с новым типом
function changeCar(carType) {
    currentCarType = carType;
    car = new CarPhysics(canvas.width / 2, canvas.height / 2);
    applyCarConfig(car, carType);
    if (carNameElement) carNameElement.textContent = CarsConfig[carType].name;
    console.log(`Выбрана машина: ${CarsConfig[carType].name}`);
}

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
        case 'Digit1':
            changeCar('ae86');
            break;
        case 'Digit2':
            changeCar('silvia');
            break;
        case 'Digit3':
            changeCar('gripMachine');
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
let car = new CarPhysics(canvas.width / 2, canvas.height / 2);
applyCarConfig(car, currentCarType);

// Камера
const camera = {
    x: 0,
    y: 0,
    smoothness: 0.1,
    scale: 1.0  
};

function updateCamera(dt) {
    // Плавное слежение за автомобилем с учетом масштаба
    const targetX = car.x - (canvas.width / 2) / camera.scale;
    const targetY = car.y - (canvas.height / 2) / camera.scale;
    
    camera.x += (targetX - camera.x) * camera.smoothness;
    camera.y += (targetY - camera.y) * camera.smoothness;
}

// Отрисовка трассы / декораций вынесена в track.js
function drawTrack() {
    Track.drawTrack(ctx);
}

function drawDecorations() {
    Track.drawDecorations(ctx);
}

// Отрисовка автомобиля
function drawCar() {
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);
    
    // Тень
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(-car.width/2 + 5, -car.height/2 + 5, car.width, car.height);

    // Колёса: рисуем 4 прямоугольника; передние — визуально повернуты
    const wheelW = 4; // уменьшены по всем осям
    const wheelH = 12;
    const axleOffsetX = car.width * 0.4;
    const axleOffsetY = car.height / 2.2;

    // Задние колёса (не поворачиваются визуально) — рисуем под корпусом
    ctx.fillStyle = '#383838';
    ctx.fillRect(-axleOffsetX - wheelH/2, -axleOffsetY - wheelW/2, wheelH, wheelW);
    ctx.fillRect(-axleOffsetX - wheelH/2, axleOffsetY - wheelW/2, wheelH, wheelW);

    // Передние колёса (поворачиваются относительно корпуса)
    ctx.save();
    ctx.translate(axleOffsetX, -axleOffsetY);
    ctx.rotate(car.frontWheelAngle * 0.5); // угол сокращен вдвое
    ctx.fillStyle = '#383838';
    ctx.fillRect(-wheelH/2, -wheelW/2, wheelH, wheelW);
    ctx.restore();

    ctx.save();
    ctx.translate(axleOffsetX, axleOffsetY);
    ctx.rotate(car.frontWheelAngle * 0.5);
    ctx.fillStyle = '#383838';
    ctx.fillRect(-wheelH/2, -wheelW/2, wheelH, wheelW);
    ctx.restore();

    // Фары — два конуса света, исходящие из положения фар
    const coneLength = 140; // более широкий дальний конус
    const coneWidth = car.height * 2.0; // шире конус
    const headlightOffsets = [
        { x: car.width/2, y: -car.height/2 + 5 },
        { x: car.width/2, y: car.height/2 - 5 }
    ];

    for (const hl of headlightOffsets) {
        const g = ctx.createLinearGradient(hl.x, hl.y, hl.x + coneLength, hl.y);
        g.addColorStop(0, 'rgba(174, 246, 255, 0.4)');
        g.addColorStop(1, 'rgba(183, 248, 243, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(hl.x, hl.y - 4);
        ctx.lineTo(hl.x + coneLength, hl.y - coneWidth);
        ctx.lineTo(hl.x + coneLength, hl.y + coneWidth);
        ctx.lineTo(hl.x, hl.y + 4);
        ctx.closePath();
        ctx.fill();
    }

    // Корпус - цвет из конфига машины
    const bodyColor = car.carColor || '#f5f5f5';
    const roofColor = car.carRoofColor || '#2a2a4a';
    const carType = car.carType || 'ae86';

    // Для AE86 рисуем фары и стоп-огни ПОД спрайтом корпуса
    if (carType === 'ae86') {

        // Задние фонари
        ctx.fillStyle = '#ff4444';
        ctx.fillRect(-car.width/2 - 8, -car.height/2 + 2, 3, 6);
        ctx.fillRect(-car.width/2 - 8, car.height/2 - 8, 3, 6);
    }

    if (carType === 'ae86') {
        // AE86: отрисовка спрайта
        const scale = 1.5;
        ctx.save();
        ctx.rotate(Math.PI/2); // 90 градусов вправо
        ctx.drawImage(carSprites.ae86, -car.height/2 * scale, -car.width/2 * scale, car.height * scale, car.width * scale);
        ctx.restore();
    } else if (carType === 'silvia') {
        // Silvia: отрисовка спрайта
        const scale = 2.0;
        ctx.save();
        ctx.rotate(Math.PI/2); // 90 градусов вправо
        ctx.drawImage(carSprites.silvia, -car.height/2.2 * scale, -car.width/2 * scale, car.height * scale, car.width * scale);
        ctx.restore();
    } else {
        // Grip: простой прямоугольник
        ctx.fillStyle = bodyColor;
        ctx.fillRect(-car.width/2, -car.height/2, car.width, car.height);

        ctx.fillStyle = roofColor;
        ctx.fillRect(-car.width/6, -car.height/2 + 3, car.width/2, car.height - 6);
    }

    // Фары - яркие желтые (для всех кроме AE86 и Silvia, которые рисуют их под спрайтом)
    if (carType !== 'ae86' && carType !== 'silvia') {
        ctx.fillStyle = '#51ceff';
        ctx.fillRect(car.width/2 - 3, -car.height/2 + 2, 3, 6);
        ctx.fillRect(car.width/2 - 3, car.height/2 - 8, 3, 6);
    }

    // Задние фонали (для Grip - они внутри корпуса, для AE86 и Silvia уже нарисованы под спрайтом)
    if (carType !== 'ae86' && carType !== 'silvia') {
        ctx.fillStyle = '#ff4444';
        ctx.fillRect(-car.width/2, -car.height/2 + 2, 3, 6);
        ctx.fillRect(-car.width/2, car.height/2 - 8, 3, 6);
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
    const speedKmh = (car.getSpeed() * 0.09).toFixed(0); // Конвертация в км/ч (разделили на 2 от предыдущего значения)
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
    
    // Очистка фона — чёрный для ночи
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Обновление физики
    car.update(dt, input);
    updateCamera(dt);
    createSmokeParticle();
    updateSmokeParticles(dt);

    // Обновление аудио
    if (audioInitialized) {
        Audio.updateEngine(car.getSpeed(), car.throttle);
        Audio.updateDrift(car.isDrifting(), car.getSpeed());
    }
    
    // Применение камеры
    ctx.save();
    ctx.scale(camera.scale, camera.scale);
    ctx.translate(-camera.x, -camera.y);

    // Отрисовка
    drawTrack();
    drawDecorations();
    drawSmokeParticles();
    drawCar();

    ctx.restore();

    // Ночной фильтр - полупрозрачный тёмный overlay
    drawNightFilter();

    // Обновление UI
    updateUI();

    requestAnimationFrame(gameLoop);
}

// Ночной фильтр - полупрозрачный тёмный overlay
function drawNightFilter() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// Инициализация аудио при первом взаимодействии
let audioInitialized = false;
async function initAudio() {
    if (audioInitialized) return;
    Audio.init();
    Audio.resume();
    
    // Загрузка музыки и звуков
    await Audio.loadDefaultSounds();
    
    Audio.startEngine();
    Audio.startDrift();
    audioInitialized = true;
    console.log('Audio initialized');
}

// Обработчик для инициализации аудио
document.addEventListener('click', initAudio, { once: true });
document.addEventListener('keydown', initAudio, { once: true });

// Глобальные функции для кнопок
let audioEnabled = true;
let musicEnabled = false;
let musicVolume = 50;
let sfxVolume = 70;
window.trackNames = []; // Массив имён треков (заполняется при загрузке)

function toggleAudio() {
    audioEnabled = !audioEnabled;
    Audio.setVolume('master', audioEnabled ? 0.7 : 0);
    initAudio();
}

async function toggleMusic() {
    musicEnabled = !musicEnabled;
    const btn = document.getElementById('play-btn');

    if (musicEnabled) {
        btn.textContent = '⏸';
        await initAudio();
        Audio.playRandomTrack();
        updateTrackName();
    } else {
        btn.textContent = '▶';
        Audio.stopMusic();
    }
}

function setMusicVolume(value) {
    musicVolume = parseInt(value);
    Audio.setVolume('music', musicVolume / 100);
}

function setSfxVolume(value) {
    sfxVolume = parseInt(value);
    Audio.setVolume('engine', sfxVolume / 100);
    Audio.setVolume('drift', sfxVolume / 100);
}

function prevTrack() {
    if (!musicEnabled) {
        toggleMusic();
    }
    Audio.prevTrack();
    updateTrackName();
}

function nextTrack() {
    if (!musicEnabled) {
        toggleMusic();
    }
    Audio.nextTrack();
    updateTrackName();
}

function playRandomTrack() {
    musicEnabled = true;
    const btn = document.getElementById('play-btn');
    btn.textContent = '⏸';
    initAudio();
    Audio.playRandomTrack();
    updateTrackName();
}

function updateTrackName() {
    const trackNameEl = document.getElementById('track-name');
    if (Audio.isInitialized() && Audio.getTrackCount() > 0 && window.trackNames.length > 0) {
        const index = Audio.getCurrentTrackIndex();
        trackNameEl.textContent = window.trackNames[index] || 'Неизвестный трек';
    } else {
        trackNameEl.textContent = 'Нет трека';
    }
}

// Глобальные функции
window.toggleAudio = toggleAudio;
window.toggleMusic = toggleMusic;
window.setMusicVolume = setMusicVolume;
window.setSfxVolume = setSfxVolume;
window.prevTrack = prevTrack;
window.nextTrack = nextTrack;
window.playRandomTrack = playRandomTrack;

// Старт игры
requestAnimationFrame(gameLoop);

console.log('Дрифт игра запущена! Используйте WASD для управления, Пробел для ручника.');
