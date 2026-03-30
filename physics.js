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
        this.maxSpeed = 800; // макс продольная скорость (px/s)
        this.acceleration = 900; // сила двигателя (px/s^2) — уменьшено для менее агрессивного разгона
        this.brakeForce = 3000; // сила торможения (px/s^2)
        this.reverseSpeed = 200; // макс скорость заднего хода (px/s)

        // Дампинг / сопротивления (коэффициенты в единицах 1/с)
        this.linearDrag = 1.1; // общее продольное сопротивление (баланс инерции и сопротивления)
        this.angularDrag = 3.0; // затухание угловой скорости
        this.driftSpeedLoss = 0.3; // потеря скорости при дрифте (в единицах 1/с)

        // Параметры заноса
        this.grip = 4.0; // чем больше — тем лучше сцепление (1..10)
        this.lateralGrip = 8.0; // боковое трение при нормальном сцеплении
        this.handbrakeLateralGrip = 1.5; // боковое трение при ручнике (меньше = сильнее скольжение)
        this.slipAngle = 0; // текущий угол скольжения

        // Управление поворотом
        this.steerSpeed = 6.0; // чувствительность руля — увеличено, чтобы руль сильнее влиял на поворот
        this.handbrakeSteerFactor = 1.8; // усиление поворота на ручнике
        // Физический выворот передних колёс
        this.frontWheelAngle = 0; // текущий угол передних колёс
        this.maxWheelAngle = Math.PI / 6; // ~30 градусов
        this.wheelTurnSpeed = 6.0; // рад/с при малой скорости
        this.wheelResponseDrop = 0.7; // снижение отзывчивости на высокой скорости (0..1)
        // Двигаемся в дрифт-положение не только от ручника
        this.drifting = false;
        // Минимальная продольная скорость (px/s) для того, чтобы руль влиял на поворот
        this.minSteerSpeed = 5;

        // Размеры автомобиля
        this.width = 50;
        this.height = 25;

        // Состояние управления
        this.throttle = 0;
        this.steerInput = 0;
        this.handbrake = false;

        // Трансмиссия (значения по умолчанию, переопределяются в applyCarConfig)
        this.currentGear = 1;
        this.maxGears = 5;
        this.gearRatios = [0, 3.5, 2.0, 1.4, 1.0, 0.8];
        this.finalDrive = 4.0;
        this.rpm = 1000;
        this.idleRpm = 800;
        this.maxRpm = 7500;
        this.minRpmPower = 2000;
        this.maxRpmPower = 6500;
        this.shiftCooldown = 0;
        this.clutchEngaged = true;
    }

    // Переключение передач
    shiftGear(up) {
        if (this.shiftCooldown > 0) return;

        // up = true -> переключение ВВЕРХ (1->2), up = false -> ВНИЗ (2->1)
        const newGear = up ? this.currentGear + 1 : this.currentGear - 1;

        if (newGear >= 1 && newGear <= this.maxGears) {
            this.currentGear = newGear;
            this.shiftCooldown = 0.25;
            this.clutchEngaged = false;

            // Звук переключения
            if (typeof Audio !== 'undefined' && Audio.playShiftSound) {
                Audio.playShiftSound();
            }

            // При переключении ВВЕРХ RPM падает, ВНИЗ - растёт
            if (up) {
                this.rpm = Math.max(this.idleRpm, this.rpm * 0.55);
            } else {
                this.rpm = Math.min(this.maxRpm * 0.85, this.rpm * 1.5);
            }

            setTimeout(() => {
                this.clutchEngaged = true;
            }, 120);

            return true;
        }
        return false;
    }

    update(dt, input) {
        // Обработка ввода
        this.throttle = input.up ? 1 : 0; // Газ вперед (W)
        this.steerInput = input.left ? -1 : (input.right ? 1 : 0);
        this.handbrake = input.handbrake; // Только ручник для дрифта

        // Переключение передач (E - вверх, Q - вниз)
        if (input.shiftUp) {
            this.shiftGear(true);
        }
        if (input.shiftDown) {
            this.shiftGear(false);
        }

        // Переходим в локальные координаты автомобиля
        const forward = { x: Math.cos(this.angle), y: Math.sin(this.angle) };
        const right = { x: -forward.y, y: forward.x };

        // Проекции текущей скорости на локальные оси
        let forwardVel = this.velocityX * forward.x + this.velocityY * forward.y;
        let lateralVel = this.velocityX * right.x + this.velocityY * right.y;

        // --- обновление физического угла передних колёс
        const speedFactorWheel = Math.min(1, Math.abs(forwardVel) / this.maxSpeed);
        const lowSpeedMultiplier = 1 + (1 - speedFactorWheel);
        const targetWheelAngle = this.steerInput * this.maxWheelAngle * lowSpeedMultiplier;
        const maxDelta = this.wheelTurnSpeed * (1 - speedFactorWheel * this.wheelResponseDrop) * dt;
        let wheelDelta = targetWheelAngle - this.frontWheelAngle;
        if (wheelDelta > maxDelta) wheelDelta = maxDelta;
        if (wheelDelta < -maxDelta) wheelDelta = -maxDelta;
        this.frontWheelAngle += wheelDelta;

        // === Расчёт оборотов двигателя ===
        // В реальности RPM привязаны к скорости через передачу
        // Используем коэффициент масштабирования для конвертации px/s в "игровые" км/ч
        const speedScale = 0.05; // Конвертация px/s в условные м/с
        const wheelRadius = 0.3; // метра
        const speedMps = Math.abs(forwardVel) * speedScale;
        const rpmFromSpeed = (speedMps * this.gearRatios[this.currentGear] * this.finalDrive * 60) / (2 * Math.PI * wheelRadius);
        
        if (this.throttle && this.clutchEngaged) {
            // При газе RPM стремятся к рабочим + растут от скорости
            const targetRpm = Math.max(rpmFromSpeed, this.minRpmPower + (this.maxRpmPower - this.minRpmPower) * 0.7);
            this.rpm = Math.min(this.maxRpm, this.rpm + (targetRpm - this.rpm) * dt * 4);
        } else if (this.clutchEngaged) {
            // Без газа RPM падают к значению от скорости, но не ниже холостых
            this.rpm = Math.max(this.idleRpm, rpmFromSpeed);
        } else {
            // Сцепление выжато - RPM плавно падают
            this.rpm = Math.max(this.idleRpm, this.rpm - dt * 800);
        }

        // Автоматическое переключение - только по достижении макс. оборотов
        if (this.clutchEngaged && this.shiftCooldown <= 0) {
            if (this.rpm >= this.maxRpm && this.currentGear < this.maxGears) {
                this.shiftGear(true);
            } else if (this.rpm <= this.idleRpm + 300 && this.currentGear > 1) {
                this.shiftGear(false);
            }
        }

        // Движение вперед/назад (двигатель) - ускорение зависит от передачи
        if (this.throttle && this.clutchEngaged) {
            const gearRatio = this.gearRatios[this.currentGear];
            // Мощность зависит от RPM
            const rpmRange = this.maxRpmPower - this.minRpmPower;
            const rpmPos = (this.rpm - this.minRpmPower) / rpmRange;
            const rpmFactor = Math.max(0.5, 0.7 + 0.3 * (1 - Math.pow(Math.min(1, rpmPos * 2 - 1), 2)));
            
            // Ускорение: на низких передачах больше, на высоких меньше
            const gearFactor = Math.pow(gearRatio, 0.4);
            const powerMultiplier = gearFactor * rpmFactor * 0.8;
            
            forwardVel += this.acceleration * powerMultiplier * dt;
        }

        // Ограничение максимальной скорости для текущей передачи
        // Чем выше передача (меньше gearRatio), тем выше макс. скорость
        const gearRatio = this.gearRatios[this.currentGear];
        const maxSpeedForGear = ((this.maxRpm * 2 * Math.PI * wheelRadius) / (gearRatio * this.finalDrive * 60)) / speedScale;
        if (forwardVel > maxSpeedForGear) {
            forwardVel = maxSpeedForGear;
        }

        // Задний ход - только клавиша S
        if (input.down) {
            // Разрешаем задний ход на любых скоростях (даже если машина движется вперед - тормозим)
            if (forwardVel > 0) {
                // Если движемся вперед - тормозим
                forwardVel -= this.brakeForce * 0.5 * dt;
            } else {
                // Если остановились или движемся назад - разгоняемся назад
                forwardVel -= this.acceleration * 0.5 * dt;
            }
        }

        // Ограничение продольной скорости
        if (forwardVel > this.maxSpeed) forwardVel = this.maxSpeed;
        if (forwardVel < -this.reverseSpeed) forwardVel = -this.reverseSpeed;

        // Определяем, начинаем ли мы дрифтать "переходом"
        const slipAngle = Math.atan2(lateralVel, Math.max(1e-4, Math.abs(forwardVel)));
        const enterDrift = Math.abs(slipAngle) > 0.25 && Math.abs(this.steerInput) > 0.2 && Math.abs(forwardVel) > this.maxSpeed * 0.25;
        if (this.handbrake || enterDrift) {
            this.drifting = true;
        } else if (this.drifting && Math.abs(slipAngle) < 0.12 && !this.handbrake) {
            this.drifting = false;
        }

        // Боковое трение (чем меньше значение — тем сильнее скольжение)
        let lateralGrip = this.drifting ? (this.handbrake ? this.handbrakeLateralGrip : this.lateralGrip * 0.3) : this.lateralGrip;
        lateralVel *= Math.max(0, 1 - lateralGrip * dt);

        // Продольный дрэг
        forwardVel *= Math.max(0, 1 - this.linearDrag * dt);

        // При дрифте скорость дополнительно снижается
        if (this.drifting) {
            forwardVel *= Math.max(0, 1 - this.driftSpeedLoss * dt);
        }

        // Управление поворотом: используем физический угол передних колёс
        // Управление поворотом теперь зависит от продольной скорости: без скорости — поворот невозможен
        const speedFactor = Math.min(1, Math.abs(forwardVel) / this.maxSpeed);
        const wheelRatio = this.frontWheelAngle / this.maxWheelAngle; //
        const driveInfluence = (Math.abs(forwardVel) > this.minSteerSpeed) ? speedFactor : 0;
        const steerEffect = wheelRatio * this.steerSpeed * driveInfluence;
        const steerMultiplier = this.handbrake ? this.handbrakeSteerFactor : 1.0;
        this.angularVelocity += steerEffect * steerMultiplier * (forwardVel >= 0 ? 1 : -1) * dt;

        // Затухание угловой скорости
        this.angularVelocity *= Math.max(0, 1 - this.angularDrag * dt);

        // Обновляем угол
        this.angle += this.angularVelocity * dt;

        // Пересчитываем мировой вектор скорости из локальных компонент
        this.velocityX = forward.x * forwardVel + right.x * lateralVel;
        this.velocityY = forward.y * forwardVel + right.y * lateralVel;

        // Обновление позиции
        this.x += this.velocityX * dt;
        this.y += this.velocityY * dt;

        // Угол скольжения
        this.slipAngle = Math.atan2(lateralVel, Math.max(1e-4, Math.abs(forwardVel)));

        // Обновление cooldown переключения
        if (this.shiftCooldown > 0) {
            this.shiftCooldown -= dt;
        }
    }

    getSpeed() {
        return Math.sqrt(this.velocityX ** 2 + this.velocityY ** 2);
    }

    getRpm() {
        return this.rpm;
    }

    getGear() {
        return this.currentGear;
    }

    getDriftAngle() {
        return (this.slipAngle * 180 / Math.PI).toFixed(1);
    }

    isDrifting() {
        return Math.abs(this.slipAngle) > 0.2 || this.handbrake;
    }
}
