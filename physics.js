// Физический движок для дрифта

class CarPhysics {
    constructor(x, y) {
        // Позиция
        this.x = x;
        this.y = y;
        
        // Скорость (вектор)
        this.velocityX = 0;
        this.velocityY = 0;
        
        // Угол автомобиля (в радианах)
        this.angle = 0;
        
        // Угловая скорость
        this.angularVelocity = 0;
        
        // Параметры автомобиля
        this.maxSpeed = 800; // пикселей в секунду
        this.acceleration = 300;
        this.brakeForce = 500;
        this.friction = 0.98; // Сопротивление качению
        this.drag = 0.995; // Сопротивление воздуха
        
        // Параметры заноса
        this.grip = 0.92; // Сцепление с дорогой (меньше = легче занос)
        this.slipAngle = 0; // Угол скольжения
        this.driftFactor = 0.15; // Насколько сильно сносит
        
        // Размеры автомобиля
        this.width = 50;
        this.height = 25;
        
        // Состояние управления
        this.throttle = 0;
        this.brake = 0;
        this.steerInput = 0;
        this.handbrake = false;
    }
    
    update(dt, input) {
        // Обработка ввода
        this.throttle = input.up ? 1 : 0;
        this.brake = input.down ? 1 : 0;
        this.steerInput = input.left ? -1 : (input.right ? 1 : 0);
        this.handbrake = input.handbrake;
        
        // Подгазовка (имитация)
        if (input.up && !input.down) {
            // Увеличиваем обороты
        }
        
        // Ускорение/торможение
        const speed = Math.sqrt(this.velocityX ** 2 + this.velocityY ** 2);
        
        if (this.throttle) {
            const accelX = Math.cos(this.angle) * this.acceleration * dt;
            const accelY = Math.sin(this.angle) * this.acceleration * dt;
            this.velocityX += accelX;
            this.velocityY += accelY;
        }
        
        if (this.brake) {
            this.velocityX *= 0.95;
            this.velocityY *= 0.95;
        }
        
        // Ограничение максимальной скорости
        const currentSpeed = Math.sqrt(this.velocityX ** 2 + this.velocityY ** 2);
        if (currentSpeed > this.maxSpeed) {
            const ratio = this.maxSpeed / currentSpeed;
            this.velocityX *= ratio;
            this.velocityY *= ratio;
        }
        
        // Поворот (зависит от скорости)
        const steerAuthority = Math.min(currentSpeed / 200, 1);
        const steerForce = this.steerInput * 3 * steerAuthority * dt;
        
        if (this.handbrake) {
            // На ручнике поворачиваем резче, но теряем сцепление
            this.angularVelocity += this.steerInput * 5 * dt;
            this.grip = 0.7;
        } else {
            this.angularVelocity += steerForce;
            this.grip = 0.92;
        }
        
        // Затухание угловой скорости
        this.angularVelocity *= 0.9;
        
        // Обновляем угол
        this.angle += this.angularVelocity;
        
        // Расчет угла скольжения (разница между направлением движения и углом авто)
        const moveAngle = Math.atan2(this.velocityY, this.velocityX);
        let angleDiff = moveAngle - this.angle;
        
        // Нормализация угла
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        
        this.slipAngle = angleDiff;
        
        // Применение сил сцепления/заноса
        if (Math.abs(this.slipAngle) > 0.3 || this.handbrake) {
            // Машина в заносе
            const driftGrip = this.handbrake ? 0.5 : this.grip;
            
            // Сохраняем больше инерции при заносе
            this.velocityX *= this.drag;
            this.velocityY *= this.drag;
            
            // Постепенное выравнивание направления
            const lateralSlip = Math.sin(this.slipAngle) * (1 - driftGrip);
            this.velocityX -= Math.cos(this.angle) * lateralSlip * this.driftFactor;
            this.velocityY -= Math.sin(this.angle) * lateralSlip * this.driftFactor;
        } else {
            // Нормальное движение с хорошим сцеплением
            this.velocityX *= this.friction;
            this.velocityY *= this.friction;
            
            // Выравниваем направление движения с углом автомобиля
            const forwardSpeed = this.velocityX * Math.cos(this.angle) + 
                                this.velocityY * Math.sin(this.angle);
            this.velocityX = Math.cos(this.angle) * forwardSpeed;
            this.velocityY = Math.sin(this.angle) * forwardSpeed;
        }
        
        // Обновление позиции
        this.x += this.velocityX * dt;
        this.y += this.velocityY * dt;
    }
    
    getSpeed() {
        return Math.sqrt(this.velocityX ** 2 + this.velocityY ** 2);
    }
    
    getDriftAngle() {
        return (this.slipAngle * 180 / Math.PI).toFixed(1);
    }
    
    isDrifting() {
        return Math.abs(this.slipAngle) > 0.2 || this.handbrake;
    }
}
