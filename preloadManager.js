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
 * @param {Function} progressCallback - 進捗を報告するためのコールバック関数 (currentLoaded, total) => void
 * @returns {Promise<void>}
 */
async function preloadImages(paths, progressCallback) {
    const imagePromises = [];
    let loadedCount = 0;
    const totalImages = Object.keys(paths).length;

    if (totalImages === 0) {
        progressCallback(0, 0, 'image'); // ロードする画像がない場合
        return;
    }

    for (const key in paths) {
        const path = paths[key];
        const img = new Image();
        img.src = path;
        imagePromises.push(new Promise((resolve) => {
            img.onload = () => {
                loadedCount++;
                progressCallback(loadedCount, totalImages, 'image');
                resolve();
            };
            img.onerror = () => {
                console.warn(`Failed to load image: ${path}`);
                loadedCount++; // エラーでもカウントを進める
                progressCallback(loadedCount, totalImages, 'image');
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
 * @param {Function} progressCallback - 進捗を報告するためのコールバック関数 (currentLoaded, total) => void
 * @returns {Promise<void>}
 */
async function preloadAudio(paths, audioContext, progressCallback) {
    const audioPromises = [];
    let loadedCount = 0;
    const totalAudio = Object.keys(paths).length;

    if (totalAudio === 0) {
        progressCallback(0, 0, 'audio'); // ロードするオーディオがない場合
        return;
    }

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
                loadedCount++;
                progressCallback(loadedCount, totalAudio, 'audio');
            })
            .catch(error => {
                console.warn(`Failed to load audio: ${path}`, error);
                loadedCount++; // エラーでもカウントを進める
                progressCallback(loadedCount, totalAudio, 'audio');
            })
        );
    }
    await Promise.all(audioPromises);
    console.log('All audio preloaded.');
}

/**
 * すべてのマルチメディアファイルを一括でプリロードする。
 * @param {AudioContext} audioContext - AudioContextインスタンス
 * @param {Function} updateOverallProgress - 全体の進捗を更新するためのコールバック関数
 * @returns {Promise<{imagePaths: Object.<string, string>, musicPaths: Object.<string, {path: string, start?: number, end?: number, volume?: number}>, soundPaths: Object.<string, {path: string, volume?: number}>, audioBuffers: Object.<string, AudioBuffer}>}
 * プリロードされた画像パス、音楽パス、効果音パス、オーディオバッファを含むオブジェクト
 */
export async function preloadAllAssets(audioContext, updateOverallProgress) {
    console.log('Starting asset preloading...');

    // JSONファイルの読み込みを並行して行う
    const [images, music, sounds] = await Promise.all([
        fetchJson('./imagePaths.json'),
        fetchJson('./musicPaths.json'),
        fetchJson('./soundPaths.json')
    ]);

    allImagePaths = images;

    let loadedImages = 0;
    let totalImages = Object.keys(images).length;
    let loadedAudio = 0;
    let totalAudio = Object.keys(music).length + Object.keys(sounds).length;

    const totalAssets = totalImages + totalAudio;
    let currentTotalLoaded = 0;

    const imageProgressCallback = (current, total, type) => {
        loadedImages = current;
        currentTotalLoaded = loadedImages + loadedAudio;
        updateOverallProgress(currentTotalLoaded, totalAssets);
    };

    const audioProgressCallback = (current, total, type) => {
        loadedAudio = current;
        currentTotalLoaded = loadedImages + loadedAudio;
        updateOverallProgress(currentTotalLoaded, totalAssets);
    };
    
    // 画像とオーディオのプリロードを並行して行う
    await Promise.all([
        preloadImages(allImagePaths, imageProgressCallback),
        preloadAudio(music, audioContext, audioProgressCallback),
        preloadAudio(sounds, audioContext, audioProgressCallback)
    ]);

    console.log('All assets preloaded successfully.');
    return {
        imagePaths: allImagePaths,
        musicPaths: music,
        soundPaths: sounds,
        audioBuffers: audioBuffers
    };
}
