// Трек: процедурная генерация закольцованной трассы

const Track = (function() {
    const trackWidth = 380;
    const checkpoints = [];
    const trackPoints = []; // сглаженные точки для отрисовки

    // Генерация случайного закольцованного трека с разными участками
    function generateTrack() {
        checkpoints.length = 0;
        trackPoints.length = 0;

        const centerX = 0;
        const centerY = 0;
        const baseRadius = 3000 + Math.random() * 1000; // 3000-4000
        
        // Генерируем 4-6 сегментов трассы с разными характеристиками
        const numSegments = 4 + Math.floor(Math.random() * 3);
        const segmentAngle = (Math.PI * 2) / numSegments;
        
        let currentAngle = Math.random() * Math.PI * 2; // Начальный угол
        
        for (let seg = 0; seg < numSegments; seg++) {
            // Характеристики сегмента
            const isWinding = Math.random() > 0.5; // Извилистый или плавный
            const segmentPoints = 15 + Math.floor(Math.random() * 10); // 15-24 точки на сегмент
            const amplitude = isWinding ? 400 + Math.random() * 300 : 100 + Math.random() * 150;
            const frequency = isWinding ? 0.5 + Math.random() * 0.3 : 0.1 + Math.random() * 0.1;
            
            const startAngle = currentAngle;
            const endAngle = currentAngle + segmentAngle;
            
            for (let i = 0; i < segmentPoints; i++) {
                const t = i / segmentPoints;
                const angle = startAngle + (endAngle - startAngle) * t;
                
                // Плавные вариации радиуса в пределах сегмента
                const smoothVariation = Math.sin(t * Math.PI * frequency) * amplitude;
                const radiusVariation = baseRadius + smoothVariation;
                
                const x = centerX + Math.cos(angle) * radiusVariation;
                const y = centerY + Math.sin(angle) * radiusVariation;
                checkpoints.push({ x, y });
            }
            
            currentAngle = endAngle;
        }

        // Замыкаем трек - добавляем первые точки в конец для плавного перехода
        for (let i = 0; i < 4; i++) {
            checkpoints.push(checkpoints[i]);
        }

        // Сглаживание через Catmull-Rom сплайн
        for (let i = 0; i < checkpoints.length - 3; i++) {
            const p0 = checkpoints[i];
            const p1 = checkpoints[i + 1];
            const p2 = checkpoints[i + 2];
            const p3 = checkpoints[i + 3];

            for (let t = 0; t < 1; t += 0.02) {
                const x = catmullRom(p0.x, p1.x, p2.x, p3.x, t);
                const y = catmullRom(p0.y, p1.y, p2.y, p3.y, t);
                trackPoints.push({ x, y });
            }
        }

        // Смещаем трассу так, чтобы старт был в (0, 0)
        const startX = trackPoints[0].x;
        const startY = trackPoints[0].y;
        for (let i = 0; i < trackPoints.length; i++) {
            trackPoints[i].x -= startX;
            trackPoints[i].y -= startY;
        }

        return trackPoints;
    }

    // Catmull-Rom сплайн для одной координаты
    function catmullRom(p0, p1, p2, p3, t) {
        const t2 = t * t;
        const t3 = t2 * t;
        return 0.5 * (
            (2 * p1) +
            (-p0 + p2) * t +
            (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
            (-p0 + 3 * p1 - 3 * p2 + p3) * t3
        );
    }

    // Отрисовка трассы
    function drawTrack(ctx) {
        if (trackPoints.length === 0) generateTrack();

        ctx.save();

        // Обводка (бордюр)
        ctx.strokeStyle = '#2a2a2a';
        ctx.lineWidth = trackWidth + 40;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(trackPoints[0].x, trackPoints[0].y);
        for (let i = 1; i < trackPoints.length; i++) {
            ctx.lineTo(trackPoints[i].x, trackPoints[i].y);
        }
        ctx.closePath();
        ctx.stroke();

        // Основная дорога
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = trackWidth;
        ctx.beginPath();
        ctx.moveTo(trackPoints[0].x, trackPoints[0].y);
        for (let i = 1; i < trackPoints.length; i++) {
            ctx.lineTo(trackPoints[i].x, trackPoints[i].y);
        }
        ctx.closePath();
        ctx.stroke();

        // Центральная разметка
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 3;
        ctx.setLineDash([30, 40]);
        ctx.beginPath();
        ctx.moveTo(trackPoints[0].x, trackPoints[0].y);
        for (let i = 1; i < trackPoints.length; i++) {
            ctx.lineTo(trackPoints[i].x, trackPoints[i].y);
        }
        ctx.closePath();
        ctx.stroke();

        // Финишная линия
        const startLine = trackPoints[0];
        const nextPoint = trackPoints[1];
        const angle = Math.atan2(nextPoint.y - startLine.y, nextPoint.x - startLine.x);
        const perpAngle = angle + Math.PI / 2;

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 8;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(
            startLine.x + Math.cos(perpAngle) * trackWidth / 2,
            startLine.y + Math.sin(perpAngle) * trackWidth / 2
        );
        ctx.lineTo(
            startLine.x - Math.cos(perpAngle) * trackWidth / 2,
            startLine.y - Math.sin(perpAngle) * trackWidth / 2
        );
        ctx.stroke();

        // Шахматный паттерн на финише
        const checkSize = 20;
        const numChecks = Math.floor(trackWidth / checkSize);
        for (let i = 0; i < numChecks; i++) {
            const offset = (i - numChecks / 2) * checkSize;
            const isWhite = i % 2 === 0;
            ctx.fillStyle = isWhite ? '#ffffff' : '#000000';
            ctx.fillRect(
                startLine.x + Math.cos(perpAngle) * offset - checkSize / 2,
                startLine.y + Math.sin(perpAngle) * offset - checkSize / 2,
                checkSize,
                checkSize
            );
        }

        ctx.restore();
    }

    function drawDecorations(ctx) {
        // Декорации временно отключены
    }

    // Проверка столкновения с границами трассы
    function isOffTrack(x, y) {
        if (trackPoints.length === 0) return false;

        let minDist = Infinity;
        for (const point of trackPoints) {
            const dx = x - point.x;
            const dy = y - point.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < minDist) {
                minDist = dist;
            }
        }

        return minDist > trackWidth / 2;
    }

    // Пересоздание трека
    function regenerate() {
        generateTrack();
    }

    // Генерация при загрузке
    generateTrack();

    return {
        drawTrack,
        drawDecorations,
        checkpoints,
        trackPoints,
        width: trackWidth,
        isOffTrack,
        regenerate
    };
})();
