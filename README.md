# 2D Drift Game

Простая игра с дрифтом и реалистичной 2D физикой.

## Особенности

- Реалистичная физика заноса
- Снос задней оси
- Подгазовка
- Ручной тормоз
- Система частиц (дым из-под колёс)
- Следы шин на асфальте
- Процедурная генерация закольцованного трека
- Ночное освещение с эффектом фар
- Аудиосистема с динамическими звуками двигателя и дрифта

## Управление

- **W / Стрелка вверх** - Газ
- **S / Стрелка вниз** - Тормоз/Задний ход
- **A / Стрелка влево** - Поворот влево
- **D / Стрелка вправо** - Поворот вправо
- **Пробел** - Ручной тормоз
- **1/2/3** - Выбор машины

## Запуск

Просто откройте `index.html` в любом современном браузере.

```bash
# Или используйте локальный сервер, например:
python -m http.server 8000
```

Затем откройте в браузере: `http://localhost:8000`

---

## 🎵 Добавление музыки и звуков

### Рекомендуемые форматы

| Тип | Формат | Описание |
|-----|--------|----------|
| **Музыка** | `.ogg` (основной), `.mp3` (резерв) | Phonk, drift phonk, японский андерграунд |
| **Звуки** | `.wav` или `.ogg` | Короткие эффекты (двигатель, шины, переключения) |

### Структура папок

```
Drift-game/
├── audio/
│   ├── music/
│   │   ├── track1.ogg
│   │   ├── track2.ogg
│   │   └── track3.ogg
│   └── sfx/
│       ├── gearshift.wav
│       └── handbrake.wav
├── index.html
├── game.js
└── ...
```

### Как добавить музыку

В `game.js` найдите функцию `initAudio()` и добавьте загрузку треков:

```javascript
async function initAudio() {
    if (audioInitialized) return;
    Audio.init();
    Audio.resume();
    
    // Загрузка музыки
    await Audio.loadMusic('audio/music/track1.ogg');
    await Audio.loadMusic('audio/music/track2.ogg');
    await Audio.loadMusic('audio/music/track3.ogg');
    
    // Загрузка звуков
    await Audio.loadSound('gearshift', 'audio/sfx/gearshift.wav', 'sfx');
    await Audio.loadSound('handbrake', 'audio/sfx/handbrake.wav', 'sfx');
    
    Audio.startEngine();
    Audio.startDrift();
    audioInitialized = true;
    console.log('Audio initialized');
}
```

### Поиск музыки

Рекомендуемые жанры для дрифта:
- **Drift Phonk** - агрессивный бит с дисторшированным басом
- **Japanese Underground** - токийский андерграунд
- **Nightcore** - ускоренные ремиксы

Где искать:
- [YouTube Audio Library](https://www.youtube.com/audiolibrary) - бесплатная музыка
- [OpenGameArt](https://opengameart.org/) - бесплатные звуки и музыка
- [Freesound](https://freesound.org/) - звуковые эффекты

### Настройка громкости

В `audio.js` измените значения в объекте `volumes`:

```javascript
const volumes = {
    master: 0.7,    // Общая громкость (0-1)
    music: 0.5,     // Музыка
    engine: 0.6,    // Двигатель
    drift: 0.4,     // Звук дрифта (шины)
    sfx: 0.7        // Звуковые эффекты
};
```
