// musicManager.js

let audioContext;
let currentSource; // 現在再生中の音楽のAudioBufferSourceNode
let soundPaths = {}; // 効果音ファイルパスと設定
let musicPaths = {}; // 音楽ファイルパスと設定
let musicGainNode; // 音楽の音量調節用GainNode
let sfxGainNode;   // 効果音の音量調節用GainNode
let preloadedAudioBuffers = {}; // プリロードされたオーディオバッファを保持

/**
 * 外部からオーディオバッファを設定するための関数。
 * @param {Object.<string, AudioBuffer>} buffers - プリロードされたオーディオバッファオブジェクト。
 */
export function setAudioBuffers(buffers) {
    preloadedAudioBuffers = buffers;
    console.log('Audio buffers set in musicManager:', preloadedAudioBuffers);
}

/**
 * 音楽プレイヤーを初期化し、音量スライダーのイベントリスナーを設定します。
 * @param {AudioContext} context - 共有のAudioContextインスタンス。
 * @param {Object} initialMusicPaths - musicPaths.jsonから読み込まれた音楽パスと設定。
 * @param {Object} initialSoundPaths - soundPaths.jsonから読み込まれた効果音パスと設定。
 */
export async function initMusicPlayer(context, initialMusicPaths, initialSoundPaths) {
    try {
        audioContext = context;
        musicPaths = initialMusicPaths;
        soundPaths = initialSoundPaths;

        // GainNodeを初期化
        musicGainNode = audioContext.createGain();
        musicGainNode.connect(audioContext.destination);

        sfxGainNode = audioContext.createGain();
        sfxGainNode.connect(audioContext.destination);

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

        console.log("Music player initialized.");

    } catch (error) {
        console.error("Error initializing music player:", error);
    }
}

/**
 * 指定された音楽を再生します。
 * 既に音楽が再生中の場合は、現在の音楽を停止してから新しい音楽を再生します。
 * @param {string} name - 再生する音楽の名前
 */
export async function playMusic(name) {
    if (!audioContext || !musicGainNode) {
        console.error("AudioContext or musicGainNode is not initialized.");
        return;
    }

    // 現在再生中の音楽があれば停止
    if (currentSource) {
        stopMusic();
    }

    const musicInfo = musicPaths[name];
    if (!musicInfo || !musicInfo.path) {
        console.error(`Music path not found for level: ${name}`);
        return;
    }

    // プリロードされたバッファを使用
    const audioBuffer = preloadedAudioBuffers[name];
    if (!audioBuffer) {
        console.error(`Audio buffer for ${name} not preloaded.`);
        return;
    }

    try {
        currentSource = audioContext.createBufferSource();
        currentSource.buffer = audioBuffer;
        currentSource.loop = true; // ループを有効にする
        currentSource.loopStart = musicInfo.start;
        currentSource.loopEnd = musicInfo.end;

        // 各音楽ファイルに設定された基本音量を適用
        if (musicInfo.volume !== undefined) {
            const tempGainNode = audioContext.createGain();
            tempGainNode.gain.value = musicInfo.volume; // 個別の音量
            currentSource.connect(tempGainNode);
            tempGainNode.connect(musicGainNode); // マスター音量（スライダーで設定）
        } else {
            currentSource.connect(musicGainNode);
        }

        currentSource.start(0); // すぐに再生開始
        console.log(`Playing music: ${name}`); // Debug log
    } catch (error) {
        console.error(`Error playing music for name ${name}:`, error);
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
 * @param {string} sfxName - 再生する効果音の名前。
 */
export async function playSfx(sfxName) {
    if (!audioContext || !sfxGainNode) {
        console.error("AudioContext or sfxGainNode is not initialized for SFX.");
        return;
    }

    const sfxInfo = soundPaths[sfxName];
    if (!sfxInfo || !sfxInfo.path) {
        console.error(`Sound effect path not found for: ${sfxName}`);
        return;
    }

    // プリロードされたバッファを使用
    const audioBuffer = preloadedAudioBuffers[sfxName];
    if (!audioBuffer) {
        console.error(`Audio buffer for ${sfxName} not preloaded.`);
        return;
    }

    try {
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;

        // 各効果音ファイルに設定された基本音量を適用
        if (sfxInfo.volume !== undefined) {
            const tempGainNode = audioContext.createGain();
            tempGainNode.gain.value = sfxInfo.volume; // 個別の音量
            source.connect(tempGainNode);
            tempGainNode.connect(sfxGainNode); // マスター音量（スライダーで設定）
        } else {
            source.connect(sfxGainNode); // 効果音用GainNodeに接続
        }

        source.start(0);
        source.onended = () => {
            source.disconnect(); // 再生終了後にリソースを解放
        };
    } catch (error) {
        console.error(`Error playing sound effect: ${sfxInfo.path}`, error);
    }
}
