// delicacyHelpUI.js

import { delicacies, coinAttributesMap } from './data.js';
import { playSfx } from './musicManager.js'; // 効果音のためにmusicManagerをインポート

/**
 * 珍味ヘルプウィンドウの表示を管理するモジュール。
 */

let isDraggingDelicacyHelp = false;
let delicacyOffsetX, delicacyOffsetY;
let delicacyHelpModal; // モーダル要素を保持する変数

/**
 * コインIDから硬貨属性の名前を取得するヘルパー関数。
 * uiManager.js からエクスポートされていないため、ここで再定義します。
 * @param {string} coinId - 硬貨のID。
 * @param {Array<object>} map - coinAttributesMap。
 * @returns {string} 硬貨の日本語名。
 */
function getCoinAttributeName(coinId, map) {
    const coin = map.find(c => c.id === coinId);
    return coin ? coin.name : coinId;
}

/**
 * 硬貨属性のHTML表示を生成するヘルパー関数。
 * uiManager.js からエクスポートされていないため、ここで再定義します。
 * @param {string} coinId - 硬貨のID。
 * @param {Array<object>} map - coinAttributesMap。
 * @returns {string} 硬貨属性を表示するHTML文字列。
 */
function createCoinTooltipHtml(coinId, map) {
    const coin = map.find(c => c.id === coinId);
    if (!coin) return coinId; // 見つからない場合はIDをそのまま返す

    const color = coin.color;
    const name = coin.name;
    const helpText = coin.help;

    // スタイルを直接適用したspanタグとして返却
    return `<span class="coin-attribute-circle" style="--circle-color: ${color};"
                onmouseover="window.showCoinTooltip(event, '${coinId}', window.coinAttributesMap)"
                onmouseout="window.hideCoinTooltip()">
                ${name}
            </span>`;
}


document.addEventListener('DOMContentLoaded', () => {
    const delicacyHelpButton = document.getElementById('delicacy-help-button');
    const delicacyHelpOverlay = document.getElementById('delicacy-help-overlay');
    const delicacyModalCloseButton = document.getElementById('delicacy-modal-close-button');
    delicacyHelpModal = document.getElementById('delicacy-help-modal');
    const delicacyListDiv = document.getElementById('delicacy-list');

    if (!delicacyHelpButton || !delicacyHelpOverlay || !delicacyModalCloseButton || !delicacyHelpModal || !delicacyListDiv) {
        console.error("珍味ヘルプウィンドウのDOM要素が見つかりません。");
        return;
    }

    // 珍味リストを生成して表示
    delicacies.forEach(delicacy => {
        const delicacyItem = document.createElement('div');
        delicacyItem.className = 'delicacy-item';

        const explorerCoinsHtml = delicacy.explorerCoinAttributes.map(coinId =>
            createCoinTooltipHtml(coinId, coinAttributesMap)
        ).join(' ');

        const areaCoinsHtml = delicacy.areaCoinAttributes.map(coinId =>
            createCoinTooltipHtml(coinId, coinAttributesMap)
        ).join(' ');

        delicacyItem.innerHTML = `
            <p>
            <strong style="color:rgb(255, 174, 0);">${delicacy.name}</strong>
            <strong>探索者:</strong> <span class="coin-attributes">${explorerCoinsHtml}</span>
            <strong>地形:</strong> <span class="coin-attributes">${areaCoinsHtml}</span>
            </p>
        `;
        delicacyListDiv.appendChild(delicacyItem);
    });

    // 初期位置を設定
    const setDelicacyHelpInitialPosition = () => {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const modalWidth = delicacyHelpModal.offsetWidth;
        const modalHeight = delicacyHelpModal.offsetHeight;

        // 画面中央より少し右上に配置
        let initialLeft = (viewportWidth / 2) - (modalWidth / 2) + 50;
        let initialTop = (viewportHeight / 2) - (modalHeight / 2) - 50;

        // 画面境界内に収まるように調整
        initialLeft = Math.max(0, Math.min(initialLeft, viewportWidth - modalWidth));
        initialTop = Math.max(0, Math.min(initialTop, viewportHeight - modalHeight));

        delicacyHelpModal.style.left = `${initialLeft}px`;
        delicacyHelpModal.style.top = `${initialTop}px`;
        delicacyHelpModal.style.position = 'absolute'; // 絶対位置指定を有効にする
    };

    // ボタンクリックでヘルプウィンドウを表示/非表示をトグル
    delicacyHelpButton.addEventListener('click', () => {
        playSfx("選択").catch(e => console.error("効果音の再生に失敗しました:", e));
        if (delicacyHelpOverlay.style.display === 'flex') {
            delicacyHelpOverlay.style.display = 'none'; // 非表示にする
        } else {
            delicacyHelpOverlay.style.display = 'flex'; // 表示する
            setDelicacyHelpInitialPosition(); // 表示時に初期位置を設定
        }
    });

    // 閉じるボタンクリックでヘルプウィンドウを非表示
    delicacyModalCloseButton.addEventListener('click', () => {
        playSfx("選択").catch(e => console.error("効果音の再生に失敗しました:", e));
        delicacyHelpOverlay.style.display = 'none';
    });

    // ドラッグイベントリスナーの設定 (Delicacy Help Modal)
    delicacyHelpModal.addEventListener('mousedown', (e) => {
        // ヘッダー部分またはモーダル自体をドラッグ可能にする
        const target = e.target.closest('#delicacy-help-modal-title') || e.target;
        if (target === delicacyHelpModal || target.id === 'delicacy-help-modal-title') {
            isDraggingDelicacyHelp = true;
            delicacyOffsetX = e.clientX - delicacyHelpModal.getBoundingClientRect().left;
            delicacyOffsetY = e.clientY - delicacyHelpModal.getBoundingClientRect().top;
            delicacyHelpModal.style.cursor = 'grabbing';
            e.preventDefault(); // テキスト選択などを防ぐ
        }
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDraggingDelicacyHelp) return;

        let newLeft = e.clientX - delicacyOffsetX;
        let newTop = e.clientY - delicacyOffsetY;

        // 画面境界内での移動を制限
        const maxX = window.innerWidth - delicacyHelpModal.offsetWidth;
        const maxY = window.innerHeight - delicacyHelpModal.offsetHeight;

        newLeft = Math.max(0, Math.min(newLeft, maxX));
        newTop = Math.max(0, Math.min(newTop, maxY));

        delicacyHelpModal.style.left = `${newLeft}px`;
        delicacyHelpModal.style.top = `${newTop}px`;
    });

    document.addEventListener('mouseup', () => {
        isDraggingDelicacyHelp = false;
        if (delicacyHelpModal) {
            delicacyHelpModal.style.cursor = 'grab';
        }
    });

    // タッチイベントリスナーの設定 (モバイル対応)
    delicacyHelpModal.addEventListener('touchstart', (e) => {
        const target = e.target.closest('#delicacy-help-modal-title') || e.target;
        if (target === delicacyHelpModal || target.id === 'delicacy-help-modal-title') {
            e.preventDefault(); // デフォルトのスクロール動作などを防ぐ
            isDraggingDelicacyHelp = true;
            const touch = e.touches[0];
            delicacyOffsetX = touch.clientX - delicacyHelpModal.getBoundingClientRect().left;
            delicacyOffsetY = touch.clientY - delicacyHelpModal.getBoundingClientRect().top;
            delicacyHelpModal.style.cursor = 'grabbing';
        }
    });

    document.addEventListener('touchmove', (e) => {
        if (!isDraggingDelicacyHelp) return;

        e.preventDefault(); // デフォルトのスクロール動作などを防ぐ
        const touch = e.touches[0];

        let newLeft = touch.clientX - delicacyOffsetX;
        let newTop = touch.clientY - delicacyOffsetY;

        const maxX = window.innerWidth - delicacyHelpModal.offsetWidth;
        const maxY = window.innerHeight - delicacyHelpModal.offsetHeight;

        newLeft = Math.max(0, Math.min(newLeft, maxX));
        newTop = Math.max(0, Math.min(newTop, maxY));

        delicacyHelpModal.style.left = `${newLeft}px`;
        delicacyHelpModal.style.top = `${newTop}px`;
    });

    document.addEventListener('touchend', () => {
        isDraggingDelicacyHelp = false;
        if (delicacyHelpModal) {
            delicacyHelpModal.style.cursor = 'grab';
        }
    });

    // リサイズ時にモーダルの位置を再調整
    window.addEventListener('resize', setDelicacyHelpInitialPosition);
});
