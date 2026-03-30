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
        }
    }

    function getVolume(type) {
        if (type === 'master') return volumes.master;
        return volumes[type] || 0;
    }

    // === СИНТЕЗ ЗВУКА ДВИГАТЕЛЯ ===
    let engineNodes = null;

    function startEngine() {
        if (!audioContext || engineNodes) return;

        // Создаём узел для двигателя - низкий рычащий звук
        const baseOsc = audioContext.createOscillator();
        baseOsc.type = 'sawtooth';
        baseOsc.frequency.value = 50;

        const filter = audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 300;
        filter.Q.value = 1.5;

        const gainNode = audioContext.createGain();
        gainNode.gain.value = 0;

        // LFO для модуляции (вибрация двигателя)
        const lfo = audioContext.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 15;
        const lfoGain = audioContext.createGain();
        lfoGain.gain.value = 50;

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
            lfoGain: lfoGain
        };
    }

    function updateEngine(speed, throttle) {
        if (!engineNodes || !audioContext) return;

        const now = audioContext.currentTime;

        // Частота зависит от скорости - низкий тон
        const baseFreq = 50 + speed * 0.1;
        const targetFreq = throttle > 0 ? baseFreq + 30 : baseFreq;

        engineNodes.osc.frequency.setTargetAtTime(targetFreq, now, 0.1);

        // Фильтр открывается при газе
        const targetFilter = throttle > 0 ? 600 : 350;
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

        // Создаём шум для визга шин
        const bufferSize = 2 * audioContext.sampleRate;
        const noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
        const output = noiseBuffer.getChannelData(0);

        // Розовый шум с характерным "скрипом"
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
            output[i] *= 0.11; // Компенсация громкости
            b6 = white * 0.115926;
        }

        const noise = audioContext.createBufferSource();
        noise.buffer = noiseBuffer;
        noise.loop = true;

        // Полосовой фильтр для характерного звука шин
        const bandpass = audioContext.createBiquadFilter();
        bandpass.type = 'bandpass';
        bandpass.frequency.value = 500;
        bandpass.Q.value = 0.8;

        // Высокие частоты для "скрипа"
        const highpass = audioContext.createBiquadFilter();
        highpass.type = 'highpass';
        highpass.frequency.value = 400;

        const gainNode = audioContext.createGain();
        gainNode.gain.value = 0;

        noise.connect(bandpass);
        bandpass.connect(highpass);
        highpass.connect(gainNode);
        gainNode.connect(masterGain);
        noise.start();

        driftNodes = {
            noise: noise,
            bandpass: bandpass,
            highpass: highpass,
            gain: gainNode
        };
    }

    function updateDrift(isDrifting, speed) {
        if (!driftNodes || !audioContext) return;

        const now = audioContext.currentTime;
        const targetGain = isDrifting ? volumes.drift * (Math.min(speed, 600) / 600) : 0;
        
        driftNodes.gain.gain.setTargetAtTime(targetGain, now, 0.05);
        
        // Частота фильтра зависит от скорости
        const targetFreq = 600 + speed * 0.5;
        driftNodes.bandpass.frequency.setTargetAtTime(targetFreq, now, 0.1);
    }

    function stopDrift() {
        if (driftNodes) {
            driftNodes.noise.stop();
            driftNodes.noise.disconnect();
            driftNodes = null;
        }
    }

    // Resume audio context (нужно для некоторых браузеров)
    function resume() {
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume();
        }
    }

    // Загрузка звуков по умолчанию (только музыка)
    async function loadDefaultSounds() {
        // Загрузка музыки из папки audio/music
        const musicFiles = [
            'audio/music/Белая Ночь (Eurobeat ) .mp3'
        ];
        for (const file of musicFiles) {
            await loadMusic(file);
        }
    }

    return {
        init,
        loadMusic,
        playMusic,
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
        resume,
        loadDefaultSounds,
        isInitialized: () => isInitialized
    };
})();
