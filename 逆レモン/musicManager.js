// musicManager.js

let audioContext;
let currentSource; // 現在再生中の音楽のAudioBufferSourceNode
let musicPaths = {}; // musicPaths.jsonから読み込んだパスを格納
let musicGainNode; // 音楽の音量調節用GainNode
let sfxGainNode;   // 効果音の音量調節用GainNode

/**
 * 音楽プレイヤーを初期化し、音楽ファイルのパスを読み込み、音量スライダーのイベントリスナーを設定します。
 */
export async function initMusicPlayer() {
    try {
        // AudioContextが既に存在する場合は再利用
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        // GainNodeを初期化
        musicGainNode = audioContext.createGain();
        musicGainNode.connect(audioContext.destination);

        sfxGainNode = audioContext.createGain();
        sfxGainNode.connect(audioContext.destination);

        // musicPaths.jsonを読み込み、パスを保存
        const response = await fetch('./musicPaths.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        musicPaths = await response.json();
        console.log("Music paths loaded:", musicPaths); // Debug log

        // スライダー要素を取得
        const musicVolumeSlider = document.getElementById('music-volume');
        const sfxVolumeSlider = document.getElementById('sfx-volume');

        // スライダーの初期値を設定し、GainNodeに適用
        if (musicVolumeSlider) {
            musicGainNode.gain.value = parseFloat(musicVolumeSlider.value) / 10;
            musicVolumeSlider.addEventListener('input', (event) => {
                musicGainNode.gain.value = parseFloat(event.target.value) / 10;
            });
        }

        if (sfxVolumeSlider) {
            sfxGainNode.gain.value = parseFloat(sfxVolumeSlider.value) / 10;
            sfxVolumeSlider.addEventListener('input', (event) => {
                sfxGainNode.gain.value = parseFloat(event.target.value) / 10;
            });
        }

    } catch (error) {
        console.error("Error initializing music player or loading music paths:", error);
    }
}

/**
 * 指定されたレベルの音楽を再生します。
 * 既に音楽が再生中の場合は、現在の音楽を停止してから新しい音楽を再生します。
 * @param {string} level - 再生する音楽のレベル (例: 'レベル1', 'レベル2')
 */
export async function playMusic(level) {
    if (!audioContext || !musicGainNode) {
        console.error("AudioContext or musicGainNode is not initialized.");
        return;
    }

    // 現在再生中の音楽があれば停止
    if (currentSource) {
        stopMusic();
    }

    const path = musicPaths[level];
    if (!path) {
        console.error(`Music path not found for level: ${level}`);
        return;
    }

    try {
        console.log(`Attempting to load and play music: ${path}`); // Debug log
        const response = await fetch(path);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        currentSource = audioContext.createBufferSource();
        currentSource.buffer = audioBuffer;
        currentSource.loop = true; // ループを有効にする
        currentSource.loopStart = 4; // 4秒からループ開始
        currentSource.loopEnd = 8; // 8秒でループ終了

        // MusicGainNodeに接続
        currentSource.connect(musicGainNode);

        currentSource.start(0); // すぐに再生開始
        console.log(`Playing music: ${level}`); // Debug log
    } catch (error) {
        console.error(`Error playing music for level ${level}:`, error);
    }
}

/**
 * 現在再生中の音楽を停止します。
 */
export function stopMusic() {
    if (currentSource) {
        try {
            // フェードアウトは実装しない。すぐに停止。
            currentSource.stop();
            console.log("Music stopped."); // Debug log
        } catch (error) {
            console.warn("Error stopping current music source (may already be stopped):", error);
        } finally {
            currentSource = null;
        }
    }
}

/**
 * 効果音を再生します。
 * @param {string} sfxPath - 再生する効果音のパス。
 */
export async function playSfx(sfxPath) {
    if (!audioContext || !sfxGainNode) {
        console.error("AudioContext or sfxGainNode is not initialized for SFX.");
        return;
    }

    try {
        const response = await fetch(sfxPath);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(sfxGainNode); // 効果音用GainNodeに接続
        source.start(0);
        source.onended = () => {
            source.disconnect(); // 再生終了後にリソースを解放
        };
    } catch (error) {
        console.error(`Error playing sound effect: ${sfxPath}`, error);
    }
}
