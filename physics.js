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
        this.maxSpeed = 1200; // пикселей в секунду
        this.acceleration = 600; // Уменьшено ускорение для более реалистичной физики
        this.brakeForce = 600;
        this.friction = 0.96; // Сопротивление качению
        this.drag = 0.985; // Сопротивление воздуха
        
        // Параметры заноса
        this.grip = 0.92; // Сцепление с дорогой (меньше = легче занос)
        this.slipAngle = 0; // Угол скольжения
        this.driftFactor = 0.08; // Насколько сильно сносит
        this.lateralFriction = 0.88; // Боковое трение для инерции в заносе
        
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
        
        // Поворот (зависит от скорости) - на 80-100 км/ч базовая скорость, на низких скоростях в 2.5 раза выше
        const speedKmh = currentSpeed * 0.36; // конвертация в км/ч
        const maxSpeedRef = 90; // 80-100 км/ч - референсная скорость
        let steerAuthority;
        
        if (speedKmh >= maxSpeedRef) {
            steerAuthority = 1.0;
        } else {
            // На низких скоростях поворот в 2.5 раза сильнее
            steerAuthority = 1.0 + (1.5 * (1 - speedKmh / maxSpeedRef));
        }
        
        const baseSteerForce = 0.15; // Базовая сила поворота
        const steerForce = this.steerInput * baseSteerForce * steerAuthority * dt;
        
        if (this.handbrake) {
            // На ручнике поворачиваем резче, но теряем сцепление
            this.angularVelocity += this.steerInput * 0.5 * steerAuthority * dt;
            this.grip = 0.65;
        } else {
            this.angularVelocity += steerForce;
            this.grip = 0.92;
        }
        
        // Затухание угловой скорости (увеличено для более плавного поворота)
        this.angularVelocity *= 0.85;
        
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
            // Машина в заносе - сохраняем инерцию и боковое скольжение
            const driftGrip = this.handbrake ? 0.5 : this.grip;
            
            // Сохраняем инерцию движения (важно для реалистичного дрифта)
            this.velocityX *= this.drag;
            this.velocityY *= this.drag;
            
            // Боковое трение (меньше = больше скольжение вбок)
            const lateralSpeed = -this.velocityX * Math.sin(this.angle) + this.velocityY * Math.cos(this.angle);
            const forwardSpeed = this.velocityX * Math.cos(this.angle) + this.velocityY * Math.sin(this.angle);
            
            // Постепенное уменьшение боковой скорости с сохранением инерции
            const newLateralSpeed = lateralSpeed * this.lateralFriction;
            
            // Пересчитываем вектор скорости
            this.velocityX = forwardSpeed * Math.cos(this.angle) - newLateralSpeed * Math.sin(this.angle);
            this.velocityY = forwardSpeed * Math.sin(this.angle) + newLateralSpeed * Math.cos(this.angle);
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
