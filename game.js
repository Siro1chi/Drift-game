// Основной игровой файл

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Элементы UI
const carNameElement = document.getElementById('car-name');
const speedElement = document.getElementById('speed');
const timerElement = document.getElementById('timer');
const scoreElement = document.getElementById('score');
const gearElement = document.getElementById('gear');
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

    const dodgeImg = new Image();
    dodgeImg.src = 'Dodge.png';
    dodgeImg.onload = () => {
        carSprites.dodge = dodgeImg;
        console.log('Dodge sprite loaded successfully');
    };
    dodgeImg.onerror = () => {
        console.warn('Failed to load Dodge.png');
    };
}
loadCarSprites();

// Состояние ввода
const input = {
    up: false,
    down: false,
    left: false,
    right: false,
    handbrake: false,
    shiftUp: false,
    shiftDown: false
};

// Таймер и очки
let timer = 0;
let timerRunning = false;
let score = 0;
let lastCrossTime = 0;
const CROSS_COOLDOWN = 1.0; // секунды

// Рекорды
const RECORDS_KEY = 'drift_game_records';
let records = JSON.parse(localStorage.getItem(RECORDS_KEY)) || [];

let currentCarType = 'ae86'; // тип текущей машины

// Функция для пересоздания машины с новым типом
function changeCar(carType) {
    currentCarType = carType;
    car = new CarPhysics(canvas.width / 2, canvas.height / 2);
    applyCarConfig(car, carType);
    if (carNameElement) carNameElement.textContent = CarsConfig[carType].name;
    console.log(`Выбрана машина: ${CarsConfig[carType].name}`);
    
    // Сброс камеры на машину
    camera.x = car.x - (canvas.width / 2) / camera.scale;
    camera.y = car.y - (canvas.height / 2) / camera.scale;
    
    // Перезапуск двигателя с новым тембром
    if (audioInitialized) {
        Audio.stopEngine();
        Audio.startEngine(carType);
    }
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
        case 'KeyE':
        case 'NumpadAdd':
            input.shiftUp = true;
            break;
        case 'KeyQ':
        case 'NumpadSubtract':
            input.shiftDown = true;
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
        case 'KeyE':
        case 'NumpadAdd':
            input.shiftUp = false;
            break;
        case 'KeyQ':
        case 'NumpadSubtract':
            input.shiftDown = false;
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
    scale: 1.0,
    velocityOffset: { x: 0, y: 0 } // Смещение от скорости
};

function updateCamera(dt) {
    // Плавное слежение за автомобилем с учетом масштаба
    const targetX = car.x - (canvas.width / 2) / camera.scale;
    const targetY = car.y - (canvas.height / 2) / camera.scale;

    camera.x += (targetX - camera.x) * camera.smoothness;
    camera.y += (targetY - camera.y) * camera.smoothness;
    
    // Смещение камеры в противоположную сторону от движения
    const speed = car.getSpeed();
    const maxOffset = 150; // Максимальное смещение в пикселях
    
    // Направление движения (вектор скорости)
    const velocityX = car.velocityX;
    const velocityY = car.velocityY;
    
    // Нормализуем и применяем смещение в ПРОТИВОПОЛОЖНУЮ сторону
    if (speed > 10) {
        camera.velocityOffset.x = (velocityX / speed) * Math.min(speed * 0.15, maxOffset);
        camera.velocityOffset.y = (velocityY / speed) * Math.min(speed * 0.15, maxOffset);
    } else {
        camera.velocityOffset.x = 0;
        camera.velocityOffset.y = 0;
    }
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
        if (carSprites.ae86) {
            const scale = 1.5;
            ctx.save();
            ctx.rotate(Math.PI/2);
            ctx.drawImage(carSprites.ae86, -car.height/2 * scale, -car.width/2 * scale, car.height * scale, car.width * scale);
            ctx.restore();
        } else {
            ctx.fillStyle = '#f5f5f5';
            ctx.fillRect(-car.width/2, -car.height/2, car.width, car.height);
            ctx.fillStyle = '#000000';
            ctx.fillRect(-car.width/6, -car.height/2 + 3, car.width/2, car.height - 6);
        }
    } else if (carType === 'silvia') {
        if (carSprites.silvia) {
            const scale = 2.0;
            ctx.save();
            ctx.rotate(Math.PI/2);
            ctx.drawImage(carSprites.silvia, -car.height/2.2 * scale, -car.width/2 * scale, car.height * scale, car.width * scale);
            ctx.restore();
        } else {
            ctx.fillStyle = '#e8e8e8';
            ctx.fillRect(-car.width/2, -car.height/2, car.width, car.height);
            ctx.fillStyle = '#1a1a3a';
            ctx.fillRect(-car.width/6, -car.height/2 + 3, car.width/2, car.height - 6);
        }
    } else if (carType === 'gripMachine') {
        if (carSprites.dodge) {
            const scale = 2.0;
            ctx.save();
            ctx.rotate(Math.PI/2);
            ctx.scale(1, 0.8);
            ctx.drawImage(carSprites.dodge, -car.height/2.2 * scale, -car.width/2 * scale, car.height * scale, car.width * scale);
            ctx.restore();
        } else {
            ctx.fillStyle = '#ffcc00';
            ctx.fillRect(-car.width/2, -car.height/2, car.width, car.height);
            ctx.fillStyle = '#333333';
            ctx.fillRect(-car.width/6, -car.height/2 + 3, car.width/2, car.height - 6);
        }
    } else {
        // Заглушка для неизвестных машин
        ctx.fillStyle = bodyColor;
        ctx.fillRect(-car.width/2, -car.height/2, car.width, car.height);
        ctx.fillStyle = roofColor;
        ctx.fillRect(-car.width/6, -car.height/2 + 3, car.width/2, car.height - 6);
    }

    // Фары - яркие желтые (для всех кроме AE86, Silvia и Dodge, которые рисуют их под спрайтом)
    if (carType !== 'ae86' && carType !== 'silvia' && carType !== 'gripMachine') {
        ctx.fillStyle = '#51ceff';
        ctx.fillRect(car.width/2 - 3, -car.height/2 + 2, 3, 6);
        ctx.fillRect(car.width/2 - 3, car.height/2 - 8, 3, 6);
    }

    // Задние фонали (для Dodge, AE86 и Silvia уже нарисованы под спрайтом)
    if (carType !== 'ae86' && carType !== 'silvia' && carType !== 'gripMachine') {
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
    const speedKmh = (car.getSpeed() * 0.15).toFixed(0);
    if (speedElement) speedElement.textContent = speedKmh;

    // Обновление передачи
    if (gearElement) gearElement.textContent = car.getGear();
    
    // Обновление таймера
    if (timerElement) {
        timerElement.textContent = timer.toFixed(3);
        timerElement.parentElement.style.color = timerRunning ? '#44ff44' : '#fff';
    }
    
    // Обновление очков
    if (scoreElement) scoreElement.textContent = Math.floor(score);
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
    
    // Обновление таймера и очков
    if (timerRunning) {
        timer += dt;
        // Очки начисляются только на трассе
        if (!Track.isOffTrack(car.x, car.y)) {
            score += dt * 10; // 10 очков в секунду
            
            // Бонусные очки за дрифт
            if (car.isDrifting()) {
                const driftAngle = Math.abs(car.slipAngle) * 180 / Math.PI;
                const driftBonus = driftAngle * dt * 2; // 2 очка за градус дрифта в секунду
                score += driftBonus;
            }
        }
    }
    
    // Проверка пересечения стартовой линии
    checkStartLineCross();

    // Применение камеры
    ctx.save();
    ctx.scale(camera.scale, camera.scale);
    ctx.translate(-camera.x - camera.velocityOffset.x, -camera.y - camera.velocityOffset.y);

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

    Audio.startEngine(currentCarType);
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
    if (!trackNameEl) return;
    
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

// Проверка пересечения стартовой линии
function checkStartLineCross() {
    const now = Date.now() / 1000;
    if (now - lastCrossTime < CROSS_COOLDOWN) return;
    
    // Стартовая линия в точке (0, 0) с допуском 150px
    const distToStart = Math.sqrt(car.x * car.x + car.y * car.y);
    if (distToStart < 150) {
        lastCrossTime = now;
        
        if (timerRunning) {
            // Финиш - останавливаем таймер
            timerRunning = false;
            
            // Сохраняем рекорд
            const record = {
                time: timer,
                car: CarsConfig[currentCarType].name,
                date: new Date().toLocaleDateString()
            };
            saveRecord(record);
        } else {
            // Старт - запускаем таймер
            timerRunning = true;
            timer = 0;
            score = 0;
        }
        updateRecordsDisplay();
    }
}

// Сохранение рекорда
function saveRecord(record) {
    record.score = score; // Добавляем очки в рекорд
    records.push(record);
    records.sort((a, b) => (b.score / b.time) - (a.score / a.time)); // Сортируем по результативности
    records = records.slice(0, 10); // Храним топ-10
    localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
}

// Обновление таблицы рекордов
function updateRecordsDisplay() {
    const recordsList = document.getElementById('records-list');
    if (!recordsList) return;
    
    if (records.length === 0) {
        recordsList.innerHTML = '<div style="opacity: 0.5; text-align: center; padding: 8px;">Нет рекордов</div>';
        return;
    }
    
    // Заголовок таблицы
    let html = `
        <div class="record-header">
            <span>#</span>
            <span>Машина</span>
            <span>Время</span>
            <span>Очки</span>
            <span>Рез-ть</span>
        </div>
    `;
    
    // Рекорды
    html += records.slice(0, 5).map((r, i) => {
        const efficiency = r.score / r.time;
        return `
            <div class="record-item ${i === 0 ? 'best' : ''}">
                <span>${i + 1}</span>
                <span>${r.car}</span>
                <span>${r.time.toFixed(2)}с</span>
                <span>${Math.floor(r.score)}</span>
                <span>${efficiency.toFixed(1)}</span>
            </div>
        `;
    }).join('');
    
    recordsList.innerHTML = html;
}

// Старт игры
updateRecordsDisplay(); // Показываем рекорды при загрузке

// Мобильное управление
function setupMobileControls() {
    const btnUp = document.getElementById('btn-up');
    const btnDown = document.getElementById('btn-down');
    const btnLeft = document.getElementById('btn-left');
    const btnRight = document.getElementById('btn-right');
    const btnHandbrake = document.getElementById('btn-handbrake');
    const btnShiftUp = document.getElementById('btn-shift-up');
    const btnShiftDown = document.getElementById('btn-shift-down');
    
    function addTouchEvents(btn, inputKey) {
        if (!btn) return;
        btn.addEventListener('touchstart', (e) => { e.preventDefault(); input[inputKey] = true; });
        btn.addEventListener('touchend', (e) => { e.preventDefault(); input[inputKey] = false; });
        btn.addEventListener('mousedown', (e) => { input[inputKey] = true; });
        btn.addEventListener('mouseup', (e) => { input[inputKey] = false; });
        btn.addEventListener('mouseleave', (e) => { input[inputKey] = false; });
    }
    
    addTouchEvents(btnUp, 'up');
    addTouchEvents(btnDown, 'down');
    addTouchEvents(btnLeft, 'left');
    addTouchEvents(btnRight, 'right');
    addTouchEvents(btnHandbrake, 'handbrake');
    addTouchEvents(btnShiftUp, 'shiftUp');
    addTouchEvents(btnShiftDown, 'shiftDown');
}

setupMobileControls();
requestAnimationFrame(gameLoop);

