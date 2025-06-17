// coinAnimation.js

import { playSfx } from './musicManager.js'; // playSfxをインポート

/**
 * @file 硬貨投げアニメーションのロジックを管理するモジュール。
 * 硬貨のアニメーション表示、ランダムな結果の決定、およびアニメーション終了の管理を行います。
 */

/**
 * コイントスアニメーションを再生する。
 * この関数は、指定された数のコインを画面に表示し、それぞれに投げ上げと回転のアニメーションを適用します。
 * アニメーション完了後、コインは表または裏の状態で静止し、その後フェードアウトします。
 *
 * @param {Function} random - 疑似乱数生成関数 (0から1の間の数値を返す)。
 * @returns {Promise<void>} 全てのアニメーションが完了したときに解決するPromise。
 */
export async function playCoinTossAnimation(random) {
    const animationArea = document.getElementById('coin-animation-area');
    // アニメーションエリアを初期化し、表示する
    animationArea.innerHTML = '';
    animationArea.style.display = 'flex';

    // JSONファイルをfetchで読み込む
    let imagePaths;
    try {
        const response = await fetch('./imagePaths.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        imagePaths = await response.json();
    } catch (error) {
        console.error("imagePaths.json の読み込み中にエラーが発生しました:", error);
        animationArea.style.display = 'none';
        return;
    }

    // コインの数 (今回は1枚のコイントスを想定)
    const numberOfCoins = 1;

    // コインの結果を決定 (true: 表, false: 裏)
    const isHeads = random() > 0.5;

    // 各コインのアニメーションを管理するPromiseの配列
    const animationPromises = [];

    // コイントスの画像パスを取得
    const coinImagePath = imagePaths["コイントス"];
    if (!coinImagePath) {
        console.error("imagePaths.json に 'コイントス' の画像パスが見つかりません。");
        animationArea.style.display = 'none';
        return;
    }

    // コインの拡大率
    const scaleFactor = 4;
    const originalCoinSize = 36;
    const scaledCoinSize = originalCoinSize * scaleFactor; // 36 * 4 = 144px

    // 元の打ち上げ高さ (拡大率を適用しない)
    const originalLaunchHeight = 300;

    // コイントスの効果音を再生
    playSfx("コイントス").catch(e => console.error("効果音の再生に失敗しました:", e));

    for (let i = 0; i < numberOfCoins; i++) {
        const coinContainer = document.createElement('div');
        coinContainer.className = 'coin-container';
        // コインの初期位置を画面下部中央に設定 (拡大されたサイズに合わせて調整)
        coinContainer.style.left = `calc(50% - ${scaledCoinSize / 2}px)`; // 拡大後のコインの中心
        coinContainer.style.bottom = `-50px`; // 画面下部から少し下の位置

        const coin = document.createElement('img');
        coin.className = 'coin-image';
        coin.src = coinImagePath;
        coin.alt = 'コイントス';
        coin.style.width = `${scaledCoinSize}px`; // GIF画像のサイズを拡大
        coin.style.height = `${scaledCoinSize}px`; // GIF画像のサイズを拡大

        coinContainer.appendChild(coin);
        animationArea.appendChild(coinContainer);

        animationPromises.push(new Promise(resolve => {
            // アニメーションのキーフレーム定義
            const totalDuration = 1000; // 全体の duration (ms)

            const coinKeyframes = [
                { transform: `translateY(0px)`, opacity: 1, offset: 0 }, // 初期位置 (画面下部から)
                { transform: `translateY(-${originalLaunchHeight}px)`, easing: 'ease-out', offset: 0.3 }, // 打ち上げ
                { transform: `translateY(-${originalLaunchHeight}px)`, easing: 'ease-in', offset: 0.7 }, // 落下開始
                { transform: `translateY(0px)`, opacity: 1, offset: 0.9 }, // 着地
                { transform: `translateY(0px)`, opacity: 0, offset: 1 } // フェードアウト
            ];

            const coinTiming = {
                duration: totalDuration,
                iterations: 1,
                fill: 'forwards'
            };

            const animation = coinContainer.animate(coinKeyframes, coinTiming);

            animation.onfinish = () => {
                // アニメーション終了後、最終的な状態に設定
                coinContainer.style.transform = `translateY(0px)`;
                coinContainer.style.opacity = 0; // フェードアウト済み
                resolve();
            };
        }));
    }

    // 全てのアニメーションが完了するのを待つ
    await Promise.all(animationPromises);

    // アニメーション終了後、エリアを非表示にする
    animationArea.style.display = 'none';
    animationArea.innerHTML = ''; // コイン要素を削除してクリーンアップ
}
