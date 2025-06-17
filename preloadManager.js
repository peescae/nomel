// preloadManager.js

/**
 * すべてのマルチメディアファイルのパスを格納するオブジェクト
 * @type {Object.<string, string>}
 */
let allImagePaths = {};
/**
 * プリロードされたオーディオバッファを格納するオブジェクト
 * @type {Object.<string, AudioBuffer>}
 */
let audioBuffers = {};

/**
 * JSONファイルをフェッチして解析するヘルパー関数
 * @param {string} url - フェッチするJSONファイルのURL
 * @returns {Promise<Object>} JSONデータ
 */
async function fetchJson(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error fetching ${url}:`, error);
        return {};
    }
}

/**
 * 画像をプリロードする関数
 * @param {Object.<string, string>} paths - 画像名とパスのマップ
 * @returns {Promise<void>}
 */
async function preloadImages(paths) {
    const imagePromises = [];
    for (const key in paths) {
        const path = paths[key];
        const img = new Image();
        img.src = path;
        imagePromises.push(new Promise((resolve) => {
            img.onload = () => resolve();
            img.onerror = () => {
                console.warn(`Failed to load image: ${path}`);
                resolve(); // エラーでも解決して処理を続行
            };
        }));
    }
    await Promise.all(imagePromises);
    console.log('All images preloaded.');
}

/**
 * オーディオファイルをプリロードする関数
 * @param {Object.<string, {path: string, start?: number, end?: number, volume?: number}>} paths - オーディオ名とパス、設定のマップ
 * @param {AudioContext} audioContext - AudioContextインスタンス
 * @returns {Promise<void>}
 */
async function preloadAudio(paths, audioContext) {
    const audioPromises = [];
    for (const key in paths) {
        const audioInfo = paths[key];
        const path = audioInfo.path;
        audioPromises.push(fetch(path)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.arrayBuffer();
            })
            .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer))
            .then(audioBuffer => {
                audioBuffers[key] = audioBuffer;
            })
            .catch(error => {
                console.warn(`Failed to load audio: ${path}`, error);
            })
        );
    }
    await Promise.all(audioPromises);
    console.log('All audio preloaded.');
}

/**
 * すべてのマルチメディアファイルを一括でプリロードする。
 * @param {AudioContext} audioContext - AudioContextインスタンス
 * @returns {Promise<{imagePaths: Object.<string, string>, musicPaths: Object.<string, {path: string, start?: number, end?: number, volume?: number}>, soundPaths: Object.<string, {path: string, volume?: number}>, audioBuffers: Object.<string, AudioBuffer>}>}
 * プリロードされた画像パス、音楽パス、効果音パス、オーディオバッファを含むオブジェクト
 */
export async function preloadAllAssets(audioContext) {
    console.log('Starting asset preloading...');

    // JSONファイルの読み込みを並行して行う
    const [images, music, sounds] = await Promise.all([
        fetchJson('./imagePaths.json'),
        fetchJson('./musicPaths.json'),
        fetchJson('./soundPaths.json')
    ]);

    allImagePaths = images;
    
    // 画像とオーディオのプリロードを並行して行う
    await Promise.all([
        preloadImages(allImagePaths),
        preloadAudio(music, audioContext),
        preloadAudio(sounds, audioContext)
    ]);

    console.log('All assets preloaded successfully.');
    return {
        imagePaths: allImagePaths,
        musicPaths: music,
        soundPaths: sounds,
        audioBuffers: audioBuffers
    };
}
