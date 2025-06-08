// rng.js

/**
 * @file 疑似乱数生成器 (Mulberry32) を定義するモジュール。
 */

/**
 * 疑似乱数生成器 (Mulberry32)。
 * シード値を受け取り、乱数を生成する関数を返す。
 * @param {string|number} seed - 乱数生成のシード値。文字列の場合、ハッシュして数値に変換される。
 * @returns {Function} 0から1の範囲の乱数を生成する関数。
 */
export function mulberry32(seed) {
    // シード値が文字列の場合、ハッシュして数値に変換
    if (typeof seed === 'string') {
        let h1 = 1779033703, h2 = 314413405;
        for (let i = 0; i < seed.length; i++) {
            let ch = seed.charCodeAt(i);
            h1 = h1 ^ ch;
            h1 = Math.imul(h1, 3432918353);
            h1 = (h1 << 13 | h1 >>> 19);
            h2 = h2 ^ ch;
            h2 = Math.imul(h2, 597399067);
            h2 = (h2 << 17 | h2 >>> 15);
        }
        seed = (h1 ^ h2) >>> 0; // 32-bit unsigned integer
    } else if (typeof seed !== 'number') {
        // 数値でも文字列でもない場合はタイムスタンプをシードにする
        seed = Date.now();
    }
    console.log(`mulberry32: Initializing with numeric seed: ${seed}`); // デバッグログ
    let a = seed >>> 0; // シードを符号なし32ビット整数に変換
    return function() {
        // 標準的なMulberry32の実装に修正
        let t = a + 0x6D2B79F5 >>> 0;
        a = t;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t = t ^ t >>> 7;
        t = t ^ t >>> 15;
        return (t >>> 0) / 4294967296; // 0から1の範囲に正規化
    };
}
