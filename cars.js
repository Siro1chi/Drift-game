// Кастомизация автомобилей с разными характеристиками

const CarsConfig = {
    // 1. AE86 — дрифт-машина: быстрый разгон, низкая макс скорость, узкие повороты
    ae86: {
        name: 'AE86 (Drift)',
        color: '#f5f5f5',
        roofColor: '#000000',
        maxSpeed: 850,
        acceleration: 1000,
        brakeForce: 3200,
        reverseSpeed: 400,
        linearDrag: 0.75,
        angularDrag: 3.5,
        driftSpeedLoss: 0.35,
        steerSpeed: 7.0,
        handbrakeSteerFactor: 2.0,
        maxWheelAngle: Math.PI / 5, // ~36 градусов (узкие повороты)
        wheelTurnSpeed: 7.0,
        wheelResponseDrop: 0.6,
        lateralGrip: 6.0,
        handbrakeLateralGrip: 1.2,
    },

    // 2. Silvia — трасса-машина: высокая макс скорость, мало теряет в дрифте, широкие углы
    silvia: {
        name: 'Silvia (Speed)',
        color: '#e8e8e8',
        roofColor: '#1a1a3a',
        maxSpeed: 1200,
        acceleration: 800,
        brakeForce: 2800,
        reverseSpeed: 400,
        linearDrag: 0.65,
        angularDrag: 3.0,
        driftSpeedLoss: 0.15,
        steerSpeed: 6.5,
        handbrakeSteerFactor: 1.5,
        maxWheelAngle: Math.PI / 6, // ~30 градусов
        wheelTurnSpeed: 5.5,
        wheelResponseDrop: 0.75,
        lateralGrip: 9.0,
        handbrakeLateralGrip: 2.0,
    },

    // 3. Grip Machine — гриповая машина: без явного дрифта, отличная поворачиваемость
    gripMachine: {
        name: 'Grip (Racing)',
        color: '#ffcc00',
        roofColor: '#333333',
        maxSpeed: 900,
        acceleration: 850,
        brakeForce: 3500,
        reverseSpeed: 400,
        linearDrag: 0.9,
        angularDrag: 4.0,
        driftSpeedLoss: 0.6,
        steerSpeed: 8.5,
        handbrakeSteerFactor: 1.5,
        maxWheelAngle: Math.PI / 4.5, // ~40 градусов (отличная поворачиваемость)
        wheelTurnSpeed: 7.5,
        wheelResponseDrop: 0.5,
        lateralGrip: 12.0,
        handbrakeLateralGrip: 3.5,
    }
};

// Функция для применения конфигурации к автомобилю
function applyCarConfig(car, configType = 'ae86') {
    const config = CarsConfig[configType];
    if (!config) {
        console.warn(`Car type "${configType}" not found, using ae86`);
        return applyCarConfig(car, 'ae86');
    }

    // Применяем все параметры из конфига
    Object.keys(config).forEach(key => {
        if (key !== 'name' && key !== 'color' && key !== 'roofColor' && car.hasOwnProperty(key)) {
            car[key] = config[key];
        }
    });

    car.carType = configType;
    car.carName = config.name;
    car.carColor = config.color;
    car.carRoofColor = config.roofColor;
}

