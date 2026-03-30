// Аудиосистема для игры с программным синтезом звуков

const Audio = (function() {
    let audioContext = null;
    let isInitialized = false;
    let masterGain = null;

    // Настройки громкости
    const volumes = {
        master: 0.7,
        music: 0.5,
        engine: 0.4,
        drift: 0.3,
        sfx: 0.7
    };

    // Загруженные музыкальные треки
    const musicTracks = [];
    let currentMusicIndex = 0;
    let currentMusic = null;

    // Инициализация аудио контекста
    function init() {
        if (isInitialized) return;

        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            masterGain = audioContext.createGain();
            masterGain.gain.value = volumes.master;
            masterGain.connect(audioContext.destination);
            isInitialized = true;
            console.log('Audio system initialized');
        } catch (e) {
            console.warn('Web Audio API not supported:', e);
        }
    }

    // Загрузка музыки
    async function loadMusic(url) {
        if (!audioContext) init();
        if (!audioContext) return null;

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Failed to load ${url}`);
            
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

            musicTracks.push(audioBuffer);
            console.log(`Loaded music track ${musicTracks.length}: ${url}`);
            
            // Обновляем UI с новым треком
            if (window.updateTrackName) {
                window.updateTrackName();
            }
            
            return audioBuffer;
        } catch (e) {
            console.warn('Failed to load music:', e);
            return null;
        }
    }

    // Воспроизведение музыки
    function playMusic() {
        if (musicTracks.length === 0 || !audioContext) return null;

        if (currentMusic) {
            currentMusic.stop();
        }

        const buffer = musicTracks[currentMusicIndex];
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.loop = true;

        const gainNode = audioContext.createGain();
        gainNode.gain.value = volumes.music;

        source.connect(gainNode);
        gainNode.connect(masterGain);
        source.start(0);

        currentMusic = {
            source: source,
            gainNode: gainNode,
            stop: () => {
                source.stop();
                gainNode.disconnect();
            },
            setVolume: (vol) => {
                gainNode.gain.value = vol;
            }
        };

        // Переключение на следующий трек после окончания
        source.onended = () => {
            currentMusicIndex = (currentMusicIndex + 1) % musicTracks.length;
            if (currentMusic && currentMusic.source === source) {
                playMusic();
                // Обновляем название трека в UI
                if (window.updateTrackName) {
                    window.updateTrackName();
                }
            }
        };

        return currentMusic;
    }

    // Переключение музыки
    function nextTrack() {
        currentMusicIndex = (currentMusicIndex + 1) % musicTracks.length;
        playMusic();
    }

    function prevTrack() {
        currentMusicIndex = (currentMusicIndex - 1 + musicTracks.length) % musicTracks.length;
        playMusic();
    }

    // Остановка музыки
    function stopMusic() {
        if (currentMusic) {
            currentMusic.stop();
            currentMusic = null;
        }
    }

    // Настройка громкости
    function setVolume(type, value) {
        if (type === 'master') {
            volumes.master = Math.max(0, Math.min(1, value));
            if (masterGain) {
                masterGain.gain.value = volumes.master;
            }
        } else if (volumes.hasOwnProperty(type)) {
            volumes[type] = Math.max(0, Math.min(1, value));
            
            // Применяем громкость к текущей музыке
            if (type === 'music' && currentMusic) {
                currentMusic.gainNode.gain.value = volumes.music;
            }
        }
    }

    function getVolume(type) {
        if (type === 'master') return volumes.master;
        return volumes[type] || 0;
    }

    // === СИНТЕЗ ЗВУКА ДВИГАТЕЛЯ ===
    let engineNodes = null;

    function startEngine(carType = 'ae86') {
        if (!audioContext || engineNodes) return;

        // Настройки двигателя для разных машин
        const engineConfig = {
            ae86: { baseFreq: 60, filterFreq: 350, lfoFreq: 18, lfoGain: 40 },
            silvia: { baseFreq: 50, filterFreq: 300, lfoFreq: 12, lfoGain: 60 },
            gripMachine: { baseFreq: 35, filterFreq: 250, lfoFreq: 10, lfoGain: 70 } // Dodge - низкий бас
        };
        
        const config = engineConfig[carType] || engineConfig.ae86;

        // Создаём узел для двигателя
        const baseOsc = audioContext.createOscillator();
        baseOsc.type = 'sawtooth';
        baseOsc.frequency.value = config.baseFreq;

        const filter = audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = config.filterFreq;
        filter.Q.value = 1.5;

        const gainNode = audioContext.createGain();
        gainNode.gain.value = 0;

        // LFO для модуляции (вибрация двигателя)
        const lfo = audioContext.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = config.lfoFreq;
        const lfoGain = audioContext.createGain();
        lfoGain.gain.value = config.lfoGain;

        baseOsc.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(masterGain);

        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);

        baseOsc.start();
        lfo.start();

        engineNodes = {
            osc: baseOsc,
            filter: filter,
            gain: gainNode,
            lfo: lfo,
            lfoGain: lfoGain,
            carType: carType
        };
    }

    function updateEngine(speed, throttle) {
        if (!engineNodes || !audioContext) return;

        const now = audioContext.currentTime;
        
        // Настройки для разных машин
        const engineConfig = {
            ae86: { baseFreq: 60, filterOpen: 700, filterClosed: 350 },
            silvia: { baseFreq: 50, filterOpen: 600, filterClosed: 300 },
            gripMachine: { baseFreq: 35, filterOpen: 500, filterClosed: 250 }
        };
        
        const config = engineConfig[engineNodes.carType] || engineConfig.ae86;

        // Частота зависит от скорости
        const baseFreq = config.baseFreq + speed * 0.1;
        const targetFreq = throttle > 0 ? baseFreq + 30 : baseFreq;

        engineNodes.osc.frequency.setTargetAtTime(targetFreq, now, 0.1);

        // Фильтр открывается при газе
        const targetFilter = throttle > 0 ? config.filterOpen : config.filterClosed;
        engineNodes.filter.frequency.setTargetAtTime(targetFilter, now, 0.1);

        // Громкость
        const targetGain = throttle > 0 ? volumes.engine * 0.7 : volumes.engine * 0.3;
        engineNodes.gain.gain.setTargetAtTime(targetGain, now, 0.1);
    }

    function stopEngine() {
        if (engineNodes) {
            engineNodes.osc.stop();
            engineNodes.lfo.stop();
            engineNodes.osc.disconnect();
            engineNodes.lfo.disconnect();
            engineNodes = null;
        }
    }

    // === СИНТЕЗ ЗВУКА ДРИФТА (ВИЗГ ШИН) ===
    let driftNodes = null;

    function startDrift() {
        if (!audioContext || driftNodes) return;

        // Создаём многослойный шум для реалистичного звука шин
        
        // Слой 1: Розовый шум - основа звука
        const bufferSize = 2 * audioContext.sampleRate;
        const noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
        const output = noiseBuffer.getChannelData(0);

        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            b3 = 0.86650 * b3 + white * 0.3104856;
            b4 = 0.55000 * b4 + white * 0.5329522;
            b5 = -0.7616 * b5 - white * 0.0168980;
            output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
            output[i] *= 0.11;
            b6 = white * 0.115926;
        }

        const noise1 = audioContext.createBufferSource();
        noise1.buffer = noiseBuffer;
        noise1.loop = true;

        // Слой 2: Белый шум для резкости
        const whiteNoiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
        const whiteOutput = whiteNoiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            whiteOutput[i] = Math.random() * 2 - 1;
        }

        const noise2 = audioContext.createBufferSource();
        noise2.buffer = whiteNoiseBuffer;
        noise2.loop = true;

        // Фильтры для слоя 1 (основной тон шин)
        const bandpass1 = audioContext.createBiquadFilter();
        bandpass1.type = 'bandpass';
        bandpass1.frequency.value = 600;
        bandpass1.Q.value = 0.6;

        // Фильтры для слоя 2 (резкость/скрип)
        const highpass = audioContext.createBiquadFilter();
        highpass.type = 'highpass';
        highpass.frequency.value = 800;

        const bandpass2 = audioContext.createBiquadFilter();
        bandpass2.type = 'bandpass';
        bandpass2.frequency.value = 1200;
        bandpass2.Q.value = 0.5;

        // Микшер слоёв
        const mix1 = audioContext.createGain();
        mix1.gain.value = 0.7;
        const mix2 = audioContext.createGain();
        mix2.gain.value = 0.4;

        const gainNode = audioContext.createGain();
        gainNode.gain.value = 0;

        // Подключение
        noise1.connect(bandpass1);
        bandpass1.connect(mix1);

        noise2.connect(highpass);
        highpass.connect(bandpass2);
        bandpass2.connect(mix2);

        mix1.connect(gainNode);
        mix2.connect(gainNode);
        gainNode.connect(masterGain);

        noise1.start();
        noise2.start();

        driftNodes = {
            noise1: noise1,
            noise2: noise2,
            bandpass1: bandpass1,
            bandpass2: bandpass2,
            gain: gainNode
        };
    }

    function updateDrift(isDrifting, speed) {
        if (!driftNodes || !audioContext) return;

        const now = audioContext.currentTime;
        const speedFactor = Math.min(speed, 800) / 800;
        const targetGain = isDrifting ? volumes.drift * (0.5 + speedFactor * 0.5) : 0;

        driftNodes.gain.gain.setTargetAtTime(targetGain, now, 0.05);

        // Частоты фильтров зависят от скорости - более высокий тон при большей скорости
        const baseFreq = 500 + speed * 0.8;
        driftNodes.bandpass1.frequency.setTargetAtTime(baseFreq, now, 0.1);
        driftNodes.bandpass2.frequency.setTargetAtTime(baseFreq * 1.5, now, 0.1);
    }

    function stopDrift() {
        if (driftNodes) {
            driftNodes.noise1.stop();
            driftNodes.noise2.stop();
            driftNodes.noise1.disconnect();
            driftNodes.noise2.disconnect();
            driftNodes = null;
        }
    }

    // Звук переключения передач
    function playShiftSound() {
        if (!audioContext) return;

        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(150, audioContext.currentTime);
        osc.frequency.exponentialRampToValueAtTime(80, audioContext.currentTime + 0.1);

        gain.gain.setValueAtTime(0.3, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

        osc.connect(gain);
        gain.connect(masterGain);

        osc.start();
        osc.stop(audioContext.currentTime + 0.1);
    }

    // Resume audio context (нужно для некоторых браузеров)
    function resume() {
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume();
        }
    }

    // Загрузка звуков по умолчанию (только музыка)
    async function loadDefaultSounds() {
        // Загрузка всех треков из папки audio/music
        const musicFiles = [
            'audio/music/Hacking To The Gate.mp3',
            'audio/music/Holding Out for a Hero _ Eurobeat.mp3',
            'audio/music/Tokyo Drift - Eurobeat .mp3',
            'audio/music/Белая Ночь (Eurobeat ) .mp3'
        ];
        
        const loadedTracks = new Set();
        
        for (const file of musicFiles) {
            const trackName = file.split('/').pop().replace(/\.mp3$/i, '').trim();
            
            if (loadedTracks.has(trackName)) continue;
            
            const buffer = await loadMusic(file);
            if (buffer) {
                loadedTracks.add(trackName);
                if (window.trackNames) {
                    window.trackNames.push(trackName);
                }
            }
        }
    }

    // Воспроизведение случайного трека
    function playRandomTrack() {
        if (musicTracks.length === 0 || !audioContext) return null;
        
        // Выбираем случайный трек, отличный от текущего
        let randomIndex;
        if (musicTracks.length > 1) {
            do {
                randomIndex = Math.floor(Math.random() * musicTracks.length);
            } while (randomIndex === currentMusicIndex && musicTracks.length > 1);
        } else {
            randomIndex = 0;
        }
        
        currentMusicIndex = randomIndex;
        return playMusic();
    }

    // Получить индекс текущего трека
    function getCurrentTrackIndex() {
        return currentMusicIndex;
    }

    // Получить количество треков
    function getTrackCount() {
        return musicTracks.length;
    }

    return {
        init,
        loadMusic,
        playMusic,
        playRandomTrack,
        stopMusic,
        nextTrack,
        prevTrack,
        setVolume,
        getVolume,
        startEngine,
        updateEngine,
        stopEngine,
        startDrift,
        updateDrift,
        stopDrift,
        playShiftSound,
        resume,
        loadDefaultSounds,
        isInitialized: () => isInitialized,
        getCurrentTrackIndex,
        getTrackCount
    };
})();
