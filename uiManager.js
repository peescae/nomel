// uiManager.js

/**
 * @file ゲームのUI表示と管理に関連するロジックを提供するモジュール。
 * メッセージログ、UI要素の更新、ツールチップの表示/非表示などを担当します。
 */

// game.js からは直接インポートしないが、データ構造は共有しているため、参照として型定義を保持
// import { Monster } from './monster.js'; // 必要に応じてMonsterクラスをインポート
// data.jsからGAME_CONSTANTSとcoinAttributesMapをインポート
import { GAME_CONSTANTS, coinAttributesMap } from './data.js';

let monsterTooltipElement; // ポップアップ表示用の単一のtooltip要素
let areaTooltipElement;    // エリア情報ポップアップ用の単一のtooltip要素
let coinTooltipElement;    // 硬貨情報ポップアップ用の単一のtooltip要素
let lifeTooltipElement;    // 生い立ち情報ポップアップ用の単一のtooltip要素
let favourTooltipElement;  // 神の寵愛情報ポップアップ用の単一のtooltip要素

let draggedItem = null; // ドラッグ中の要素を保持

// 硬貨表示の状態を管理する変数
let showCoinsInPartyList = true; // 初期値はtrue（表示）

// imagePaths.jsonから画像パスをロード
let imagePaths = {};
let imagePathsLoaded = false; // 画像パスのロード状態を追跡するフラグ
fetch('./imagePaths.json')
    .then(response => response.json())
    .then(data => {
        imagePaths = data;
        imagePathsLoaded = true; // ロード完了
        console.log('Image paths loaded:', imagePaths);
    })
    .catch(error => {
        console.error('Error loading image paths:', error);
    });

/**
 * モン娘の硬貨情報ポップアップ要素を生成する。
 * 初回のみ呼び出され、bodyにアタッチされる。
 */
function createMonsterTooltipElement() {
    if (!monsterTooltipElement) { // 既に存在する場合は作成しない
        monsterTooltipElement = document.createElement('div');
        monsterTooltipElement.id = 'monster-tooltip';
        // スタイルを直接設定（またはstyle.cssから読み込む）
        monsterTooltipElement.style.cssText = `
            position: absolute;
            background-color: #3b3f47;
            border: 1px solid #61dafb;
            border-radius: 5px;
            padding: 10px;
            color: #f8f8f2;
            font-size: 0.9em;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.2s ease-in-out;
            z-index: 1000;
            max-width: 320px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
            visibility: hidden;
        `;
        document.body.appendChild(monsterTooltipElement);
    }
}

/**
 * エリア情報ポップアップ要素を生成する。
 * 初回のみ呼び出され、bodyにアタッチされる。
 */
function createAreaTooltipElement() {
    if (!areaTooltipElement) { // 既に存在する場合は作成しない
        areaTooltipElement = document.createElement('div');
        areaTooltipElement.id = 'area-tooltip';
        areaTooltipElement.style.cssText = `
            position: absolute;
            background-color: #3b3f47;
            border: 1px solid #61dafb;
            border-radius: 5px;
            padding: 10px;
            color: #f8f8f2;
            font-size: 0.9em;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.2s;
            z-index: 1000;
            max-width: 480px;
            word-wrap: break-word;
        `;
        document.body.appendChild(areaTooltipElement);
    }
}

/**
 * 硬貨情報ポップアップ要素を生成する。
 * 初回のみ呼び出され、bodyにアタッチされる。
 */
function createCoinTooltipElement() {
    if (!coinTooltipElement) { // 既に存在する場合は作成しない
        coinTooltipElement = document.createElement('div');
        coinTooltipElement.id = 'coin-tooltip';
        coinTooltipElement.style.cssText = `
            position: absolute;
            background-color: #3b3f47;
            border: 1px solid #61dafb;
            border-radius: 5px;
            padding: 10px;
            color: #f8f8f2;
            font-size: 0.9em;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.2s ease-in-out;
            z-index: 1000;
            max-width: 320px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
            visibility: hidden;
        `;
        document.body.appendChild(coinTooltipElement);
    }
}


/**
 * 生い立ち情報ポップアップ要素を生成する。
 * 初回のみ呼び出され、bodyにアタッチされる。
 */
function createLifeTooltipElement() {
    if (!lifeTooltipElement) { // 既に存在する場合は作成しない
        lifeTooltipElement = document.createElement('div');
        lifeTooltipElement.id = 'life-tooltip';
        lifeTooltipElement.style.cssText = `
            position: absolute;
            background-color: #3b3f47;
            border: 1px solid #a2ff7e; /* 生い立ちの色 */
            border-radius: 5px;
            padding: 10px;
            color: #f8f8f2;
            font-size: 0.9em;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.2s ease-in-out;
            z-index: 1000;
            max-width: 250px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
            visibility: hidden;
        `;
        document.body.appendChild(lifeTooltipElement);
    }
}

/**
 * 神の寵愛情報ポップアップ要素を生成する。
 * 初回のみ呼び出され、bodyにアタッチされる。
 */
function createFavourTooltipElement() {
    if (!favourTooltipElement) { // 既に存在する場合は作成しない
        favourTooltipElement = document.createElement('div');
        favourTooltipElement.id = 'favour-tooltip';
        favourTooltipElement.style.cssText = `
            position: absolute;
            background-color: #3b3f47;
            border: 1px solid #FFD700; /* 神の寵愛の色（例: ゴールド）*/
            border-radius: 5px;
            padding: 10px;
            color: #f8f8f2;
            font-size: 0.9em;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.2s ease-in-out;
            z-index: 1000;
            max-width: 250px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
            visibility: hidden;
        `;
        document.body.appendChild(favourTooltipElement);
    }
}

/**
 * ポップアップの位置を計算し設定するヘルパー関数。
 * @param {HTMLElement} tooltipElement - ポップアップのDOM要素。
 * @param {MouseEvent} event - マウスイベントオブジェクト。
 */
function positionTooltip(tooltipElement, event) {
    let clientX = event.clientX;
    let clientY = event.clientY;

    let left = clientX + 10;
    let top = clientY + 10;

    const tooltipWidth = tooltipElement.offsetWidth;
    const tooltipHeight = tooltipElement.offsetHeight;

    // 画面の右端からはみ出さないように調整
    if (left + tooltipWidth > window.innerWidth - 20) { // 右端に20pxのマージン
        left = clientX - tooltipWidth - 10; // マウスポインタの左に表示
        if (left < 20) { // 左端からもはみ出す場合
            left = (window.innerWidth - tooltipWidth) / 2; // 中央に表示
        }
    }
    // 画面の下端からはみ出さないように調整
    if (top + tooltipHeight > window.innerHeight - 20) { // 下端に20pxのマージン
        top = window.innerHeight - tooltipHeight - 20;
    }
    // 画面の上端からはみ出さないように調整
    if (top < 20) {
        top = 20;
    }

    tooltipElement.style.left = `${left + window.scrollX}px`;
    tooltipElement.style.top = `${top + window.scrollY}px`;
    tooltipElement.style.opacity = '1';
    tooltipElement.style.visibility = 'visible';
}

/**
 * モン娘の硬貨情報ポップアップを表示する。
 * @param {object} monster - 表示対象のモン娘オブジェクト。（Monsterクラスのインスタンス）
 * @param {MouseEvent} event - マウスイベントオブジェクト。
 * @param {Array} coinAttributesMap - data.jsから提供されるcoinAttributesMap。
 */
export function showMonsterTooltip(monster, event, coinAttributesMap) {
    createMonsterTooltipElement();

    let tooltipContent = `<h4>${monster.name}</h4>`;
    if (monster.allCoins.length === 0) {
        tooltipContent += '<p>硬貨を持っていません。</p>';
    } else {
        tooltipContent += '<h5>先天の硬貨</h5>';
        monster.coinAttributes.forEach(coinId => {
            const coinInfo = coinAttributesMap.find(c => c.id === coinId);
            if (coinInfo) {
                tooltipContent += `<p>${getCoinAttributeName(coinId, coinAttributesMap)}: <span class="coin-description">${coinInfo.help}</span></p>`;
            } else {
                tooltipContent += `<p><span class="coin-attribute-name">${coinId}</span>: 説明なし</p>`;
            }
        });
        if (monster.additionalCoins.length > 0) {
            tooltipContent += '<h5>後天の硬貨</h5>';
            monster.additionalCoins.forEach(coinId => {
                const coinInfo = coinAttributesMap.find(c => c.id === coinId);
                if (coinInfo) {
                    tooltipContent += `<p>${getCoinAttributeName(coinId, coinAttributesMap)}: <span class="coin-description">${coinInfo.help}</span></p>`;
                } else {
                    tooltipContent += `<p><span class="coin-attribute-name">${coinId}</span>: 説明なし</p>`;
                }
            });
        }
    }
    monsterTooltipElement.innerHTML = tooltipContent;
    positionTooltip(monsterTooltipElement, event);
}

/**
 * エリアの硬貨情報ポップアップを表示する。
 * @param {object} area - 表示対象のエリアオブジェクト。
 * @param {MouseEvent} event - マウスイベントオブジェクト。
 * @param {Array} coinAttributesMap - data.jsから提供されるcoinAttributesMap。
 * @param {object} gameData - 現在のゲーム状態オブジェクト。
 */
export function showAreaTooltip(area, event, coinAttributesMap, gameData) {
    createAreaTooltipElement();
    if (!areaTooltipElement) return; // 要素が作成されなかった場合は何もしない

    let tooltipContent = `<h4>${area.name}の属性硬貨</h4>`;
    if (area.coinAttributes.length === 0) {
        tooltipContent += '<p>関連する硬貨がありません。</p>';
    } else {
        // 硬貨属性をカウントし、まとめた表示形式でツールチップに表示
        const coinCounts = {};
        area.coinAttributes.forEach(coinId => {
            coinCounts[coinId] = (coinCounts[coinId] || 0) + 1;
        });

        Object.keys(coinCounts).forEach(coinId => {
            const count = coinCounts[coinId];
            const coinInfo = coinAttributesMap.find(c => c.id === coinId);
            if (coinInfo) {
                const coinName = getCoinAttributeName(coinId, coinAttributesMap);
                const formattedName = count > 1 ? `${coinName}×${count}` : coinName;
                tooltipContent += `<p>${formattedName}: <span class="coin-description">${coinInfo.help}</span></p>`;

                // 味方のパーティが持つ該当硬貨の総枚数を計算
                const partyCoinCount = gameData.party.reduce((totalCount, monster) => {
                    return totalCount + monster.allCoins.filter(c => c === coinId).length;
                }, 0);
                tooltipContent += `<p style="text-align: right; color: #a2ff7e;">所持枚数: ${partyCoinCount}</p>`;
            } else {
                tooltipContent += `<p><span class="coin-attribute-name">${coinId}</span>: 説明なし</p>`;
            }
        });
    }
    // エリア固有のヘルプテキストがあれば追加
    if (area.help) {
        tooltipContent += `<p><strong>効果:</strong> ${area.help}</p>`;
    }

    areaTooltipElement.innerHTML = tooltipContent;
    positionTooltip(areaTooltipElement, event);
}

/**
 * 硬貨情報ポップアップを表示する。
 * @param {MouseEvent} event - マウスイベントオブジェクト。
 * @param {string} coinId - 硬貨のID。
 * @param {Array} map - 硬貨属性の定義マップ。
 * @param {object} gameData - 現在のゲーム状態オブジェクト。
 * @param {boolean} [countByMonster=false] - trueの場合、硬貨の総数ではなく、その硬貨を持つモン娘の人数を数える。
 */
export function showCoinTooltip(event, coinId, map, gameData, countByMonster = false) {
    createCoinTooltipElement();
    if (!coinTooltipElement) return;

    const coinInfo = map.find(c => c.id === coinId);
    if (!coinInfo) return;

    let tooltipContent = `<h4>${coinInfo.name}の硬貨</h4><p><span class="coin-description">${coinInfo.help}</span></p>`;

    // 味方のパーティが持つ該当硬貨の総枚数を計算 (gameDataが存在する場合のみ)
    if (gameData && gameData.party) {
        let count;
        let label;
        if (countByMonster) {
            // その硬貨を持つモン娘の人数を数える
            count = gameData.party.filter(monster => monster.allCoins.includes(coinId)).length;
            label = '所持人数';
        } else {
            // 硬貨の総数を数える
            count = gameData.party.reduce((totalCount, monster) => {
                return totalCount + monster.allCoins.filter(c => c === coinId).length;
            }, 0);
            label = '所持枚数';
        }
        tooltipContent += `<p style="text-align: right; color: #a2ff7e;">${label}: ${count}</p>`;
    }
    
    coinTooltipElement.innerHTML = tooltipContent;
    positionTooltip(coinTooltipElement, event);
}

/**
 * プレイヤーの生い立ち情報ポップアップを表示する。
 * @param {object} lifeData - 表示対象の生い立ちオブジェクト。
 * @param {MouseEvent} event - マウスイベントオブジェクト。
 */
export function showLifeTooltip(lifeData, event) {
    createLifeTooltipElement();
    if (!lifeTooltipElement) return;

    lifeTooltipElement.innerHTML = `<h4>おじさんは ${lifeData.name}</h4><p>${lifeData.help}</p>`;
    positionTooltip(lifeTooltipElement, event);
}

/**
 * 神の寵愛情報ポップアップを表示する。
 * @param {MouseEvent} event - マウスイベントオブジェクト。
 */
export function showFavourTooltip(event) {
    createFavourTooltipElement();
    if (!favourTooltipElement) return;

    favourTooltipElement.innerHTML = `<h4>神の寵愛</h4><p>ここに表示されている硬貨を持つ仲間の戦力値を加算する。</p>`;
    positionTooltip(favourTooltipElement, event); // マウスイベントオブジェクトを渡す
}

/**
 * モン娘の硬貨情報ポップアップを非表示にする。
 */
export function hideMonsterTooltip() {
    if (monsterTooltipElement) {
        monsterTooltipElement.style.opacity = '0';
        monsterTooltipElement.style.visibility = 'hidden';
    }
}

/**
 * エリアの硬貨情報ポップアップを非表示にする。
 */
export function hideAreaTooltip() {
    if (areaTooltipElement) {
        areaTooltipElement.style.opacity = '0';
        areaTooltipElement.style.visibility = 'hidden';
    }
}

/**
 * 硬貨情報ポップアップを非表示にする。
 */
export function hideCoinTooltip() {
    if (coinTooltipElement) {
        coinTooltipElement.style.opacity = '0';
        coinTooltipElement.style.visibility = 'hidden';
    }
}

/**
 * プレイヤーの生い立ち情報ポップアップを非表示にする。
 */
export function hideLifeTooltip() {
    if (lifeTooltipElement) {
        lifeTooltipElement.style.opacity = '0';
        lifeTooltipElement.style.visibility = 'hidden';
    }
}

/**
 * 神の寵愛情報ポップアップを非表示にする。
 */
export function hideFavourTooltip() {
    if (favourTooltipElement) {
        favourTooltipElement.style.opacity = '0';
        favourTooltipElement.style.visibility = 'hidden';
    }
}

/**
 * 硬貨属性のIDから日本語名を取得する。
 * @param {string} attributeId - 硬貨属性のID。
 * @param {Array} coinAttributesMap - data.jsから提供されるcoinAttributesMap。
 * @param {number} [opacity=1] - 硬貨の不透明度。
 * @returns {string} 硬貨属性の日本語名、またはIDが見つからない場合はそのままのID。
 */
export function getCoinAttributeName(attributeId, coinAttributesMap, opacity = 1) {
    const attribute = coinAttributesMap.find(attr => attr.id === attributeId);
    if (attribute && attribute.color) {
        return `<span class="coin-attribute-circle" style="--circle-color: ${attribute.color}; opacity: ${opacity}">${attribute.name}</span>`;
    }
    return attribute ? attribute.name : attributeId;
}

/**
 * ★★★ START: 新しい硬貨ツールチップ生成関数 ★★★
 * 硬貨属性のIDから、ツールチップ表示用のHTML文字列を生成する。
 * @param {string} coinId - 硬貨属性のID (e.g., 'plain', 'magic')。
 * @param {object[]} map - 硬貨属性の定義マップ。
 * @param {boolean} [isAdditional=false] - 追加硬貨かどうか。
 * @param {number} [opacity=1] - 硬貨の不透明度。
 * @param {boolean} [countByMonsterForTooltip=false] - ツールチップで人数カウントを行うか。
 * @returns {string} ツールチップ表示用のHTML文字列。
 */
export function createCoinTooltipHtml(coinId, map, isAdditional = false, opacity = 1, countByMonsterForTooltip = false) {
    // getCoinAttributeName 関数を使って、スタイルが適用されたHTMLを生成
    let styledCoinHtml = getCoinAttributeName(coinId, map, opacity);

    // 追加硬貨の場合、後光エフェクトのクラスでラップする
    if (isAdditional) {
        styledCoinHtml = `<span class="additional-coin-glow">${styledCoinHtml}</span>`;
    }

    // 生成されたHTMLをツールチップのターゲットとしてラップ
    // window.game がグローバルに利用可能であることを前提とする
    return `<span class="coin-tooltip-target" data-coin-id="${coinId}" 
            onmouseover="window.showCoinTooltip(event, '${coinId}', window.coinAttributesMap, window.game, ${countByMonsterForTooltip})" 
            onmouseout="window.hideCoinTooltip()">
            ${styledCoinHtml}
           </span>`;
}
// ★★★ END: 新しい硬貨ツールチップ生成関数 ★★★

/**
 * 硬貨属性の配列を受け取り、重複する硬貨をまとめて「〇×N」形式のHTML文字列を生成する。
 * @param {string[]} coinIdArray - 硬貨属性IDの配列。
 * @param {Array} coinAttributesMap - data.jsから提供されるcoinAttributesMap。
 * @returns {string} フォーマットされた硬貨属性のHTML文字列。
 */
export function getGroupedCoinDisplay(coinIdArray, coinAttributesMap) {
    const coinCounts = {};
    coinIdArray.forEach(coinId => {
        coinCounts[coinId] = (coinCounts[coinId] || 0) + 1;
    });

    const formattedCoins = Object.keys(coinCounts).map(coinId => {
        const count = coinCounts[coinId];
        // createCoinTooltipHtml を使って、硬貨のスタイルとツールチップを適用
        const coinHtml = createCoinTooltipHtml(coinId, coinAttributesMap);
        return count > 1 ? `${coinHtml}×${count}` : coinHtml;
    });
    return formattedCoins.join(' ');
}


/**
 * ゲームメッセージをログエリアに表示する。
 * @param {string} message - 表示するメッセージ。HTMLタグを含むことができる。
 */
export function logMessage(message) {
    const gameMessages = document.getElementById('game-messages');
    if (gameMessages) {
        const p = document.createElement('p');
        p.innerHTML = message; // 日数をメッセージに含める
        gameMessages.appendChild(p);
        gameMessages.scrollTop = gameMessages.scrollHeight; // スクロールを最下部に移動
    } else {
        console.error("DOM element 'game-messages' not found in logMessage.");
    }
}

/**
 * 硬貨表示の状態を切り替える関数。
 */
export function toggleCoinDisplay() {
    showCoinsInPartyList = !showCoinsInPartyList;
    const partyList = document.getElementById('party-list');
    if (partyList) {
        // Iterate through all monster cards in the party list
        const monsterCards = partyList.querySelectorAll('.monster-card');
        monsterCards.forEach(card => {
            const coinWrapper = card.querySelector('.coin-attributes-wrapper');
            if (coinWrapper) {
                coinWrapper.style.display = showCoinsInPartyList ? 'flex' : 'none';
                document.getElementById('toggle-coin-display-button').textContent = showCoinsInPartyList ? '硬貨ON' : '硬貨OFF';
            }
        });
    }
}


/**
 * ゲームのUI表示を更新する。
 * @param {object} gameData - 現在のゲーム状態オブジェクト。
 * @param {Array} coinAttributesMap - data.jsから提供されるcoinAttributesMap。
 * @param {object[]} [enemies=[]] - 現在の敵モン娘の配列（表示用）。
 * @param {object} [currentArea=null] - 現在の地形情報。
 * @param {boolean} [isSelectionPhase=false] - 選択フェーズかどうか。
 * @param {object[]|null} [selectableMonsterPool=null] - 選択可能なモン娘のプール (ボス戦などで使用済みを除外する場合)。
 * @param {number} maxPartySize - ゲームの最大パーティサイズ。
 */
export async function updateUI(gameData, coinAttributesMap, enemies = [], currentArea = null, isSelectionPhase = false, selectableMonsterPool = null, maxPartySize) {
    const dayDisplay = document.getElementById('days-display'); // idを修正
    const foodDisplay = document.getElementById('food-display');
    const milkDisplay = document.getElementById('milk-display');
    const partySizeDisplay = document.getElementById('party-size-display');
    const seedDisplay = document.getElementById('seed-display');
    const currentAreaDisplay = document.getElementById('current-area-display');
    const currentAreaCoinsDisplay = document.getElementById('current-area-coins-display');
    const favourDisplay = document.getElementById('favour');
    const partyList = document.getElementById('party-list');
    const enemyInfo = document.getElementById('enemy-info');
    const enemyList = document.getElementById('enemy-list');
    const initialSetupArea = document.getElementById('initial-setup-area');
    const actionArea = document.getElementById('action-area');
    const playerLifeImage = document.getElementById('player-life-image');

    if (dayDisplay) dayDisplay.innerText = `${gameData.days}`; // gameData.days を使用
    if (milkDisplay) milkDisplay.innerText = `${gameData.milk}`;

    // 食料表示の更新
    if (foodDisplay) {
        // 探索派遣選択フェーズで、かつ予想食料獲得量がある場合（0でない場合）に「+b」形式で表示
        if (gameData.currentPhase === 'expeditionSelection' && gameData.estimatedFoodGain !== 0) {
            foodDisplay.innerHTML = `${gameData.food} + <span style="color: #FFD700;">${gameData.estimatedFoodGain}</span>`;
        } else {
            // 通常時、または予想食料獲得量が0の場合は通常の食料を表示
            foodDisplay.innerText = `${gameData.food}`;
        }
    }

    // 仲間のモン娘の食費合計を計算し表示
    gameData.upkeep = gameData.party.reduce((sum, monster) => sum + monster.upkeep, 0);
    if (partySizeDisplay) {
        partySizeDisplay.textContent = gameData.upkeep; // 食費合計を表示
    }

    if (seedDisplay) seedDisplay.innerText = gameData.currentSeed; // シード値の表示を更新

    if (currentAreaDisplay) currentAreaDisplay.innerText = gameData.currentArea ? gameData.currentArea.name : '未選択';
    if (currentAreaCoinsDisplay) {
        if (gameData.currentArea) {
            // 硬貨属性をカウントし、まとめた表示形式にする
            const coinCounts = {};
            gameData.currentArea.coinAttributes.forEach(coinId => {
                coinCounts[coinId] = (coinCounts[coinId] || 0) + 1;
            });

            const formattedCoinAttributes = Object.keys(coinCounts).map(coinId => {
                const count = coinCounts[coinId];
                const coinName = getCoinAttributeName(coinId, coinAttributesMap);
                return count > 1 ? `${coinName}×${count}` : coinName;
            }).join(' ');
            currentAreaCoinsDisplay.innerHTML = formattedCoinAttributes;

            // 既存のイベントリスナーを削除してから再設定する
            if (currentAreaCoinsDisplay._tooltipMouseOverListener) {
                currentAreaCoinsDisplay.removeEventListener('mouseover', currentAreaCoinsDisplay._tooltipMouseOverListener);
            }
            if (currentAreaCoinsDisplay._tooltipMouseOutListener) {
                currentAreaCoinsDisplay.removeEventListener('mouseout', currentAreaCoinsDisplay._tooltipMouseOutListener);
            }

            // 新しいイベントリスナーを定義し、登録
            const area = gameData.currentArea; // 現在のエリア情報をクロージャでキャプチャ
            currentAreaCoinsDisplay._tooltipMouseOverListener = (event) => {
                if (area) { // エリア情報がある場合のみツールチップを表示
                    showAreaTooltip(area, event, coinAttributesMap, gameData); // gameDataを渡す
                }
            };
            currentAreaCoinsDisplay._tooltipMouseOutListener = () => {
                hideAreaTooltip(); // マウスが離れたら即座に非表示
            };

            currentAreaCoinsDisplay.addEventListener('mouseover', currentAreaCoinsDisplay._tooltipMouseOverListener);
            currentAreaCoinsDisplay.addEventListener('mouseout', currentAreaCoinsDisplay._tooltipMouseOutListener);
        } else {
            currentAreaCoinsDisplay.innerHTML = '';
        }
    } else {
        console.warn("DOM element 'current-area-coins-display' not found in updateUI.");
    }

    if (partyList) {
        partyList.innerHTML = '';
        const displayFixedSlots = maxPartySize; // UI表示で常に確保する枠の数

        // 画像パスがまだロードされていない場合は待機
        if (!imagePathsLoaded) {
            await new Promise(resolve => {
                const interval = setInterval(() => {
                    if (imagePathsLoaded) {
                        clearInterval(interval);
                        resolve();
                    }
                }, 50);
            });
        }

        // 実際のモン娘を表示
        gameData.party.forEach((monster, index) => {
            const li = document.createElement('li');
            li.dataset.index = index; // モン娘の元のインデックスを保存
            li.dataset.monsterName = monster.name; // ドラッグ&ドロップ用に名前も保存
            li.classList.add('monster-card'); // ポップアップのターゲットとしてクラスを追加
            li.draggable = true; // ドラッグ可能にする

            // ドラッグイベントリスナーを追加
            li.addEventListener('dragstart', handleDragStart);
            li.addEventListener('dragover', handleDragOver);
            li.addEventListener('dragleave', handleDragLeave);
            // handleDrop に gameData とその他のパラメータを渡す
            li.addEventListener('drop', (e) => handleDrop(e, gameData, coinAttributesMap, enemies, currentArea, isSelectionPhase, selectableMonsterPool, maxPartySize));
            li.addEventListener('dragend', handleDragEnd);

            // マウスイベントリスナーを追加
            li.addEventListener('mouseover', (event) => showMonsterTooltip(monster, event, coinAttributesMap)); // event を渡す
            li.addEventListener('mouseout', hideMonsterTooltip);

            // モン娘の画像を追加
            const monsterImage = document.createElement('img');
            const imageUrl = imagePaths[monster.name] || './image/default.png'; // デフォルト画像をフォールバック
            monsterImage.src = imageUrl;
            monsterImage.alt = monster.name;
            monsterImage.width = 128; // 64 * 2
            monsterImage.height = 128; // 64 * 2
            monsterImage.classList.add('monster-image');
            li.appendChild(monsterImage);

            // 追加硬貨枚数オーバーレイの追加
            if (monster.additionalCoins.length > 0) {
                const overlayDiv = document.createElement('div');
                overlayDiv.className = 'additional-coin-count-overlay';
                overlayDiv.textContent = `+${monster.additionalCoins.length}`;
                li.appendChild(overlayDiv);
            }

            // 先天的な硬貨のHTMLを生成
            const normalCoinsHtml = monster.coinAttributes.map(attrId => getCoinAttributeName(attrId, coinAttributesMap)).join(' ');

            // 後天的な硬貨（追加硬貨）のHTMLを生成し、後光エフェクトクラスを追加
            const additionalCoinsHtml = monster.additionalCoins.map(attrId => {
                const coinHtml = getCoinAttributeName(attrId, coinAttributesMap);
                return `<span class="additional-coin-glow">${coinHtml}</span>`;
            }).join(' ');

            // 硬貨をラッパーDIVにまとめて追加
            const coinAttributesHtml = `<div class="coin-attributes-wrapper" style="display: ${showCoinsInPartyList ? 'flex' : 'none'};">
                                            ${normalCoinsHtml} ${additionalCoinsHtml}
                                        </div>`;
            li.innerHTML += coinAttributesHtml;

            // 選択フェーズの場合、クリック可能にする
            if (isSelectionPhase) {
                // ボス戦派遣選択フェーズで、かつ選択可能プールがある場合
                if (gameData.currentPhase === 'bossExpeditionSelection' && selectableMonsterPool) {
                    if (selectableMonsterPool.includes(monster) && !monster.hasBeenSentToBattle) {
                        li.classList.add('selectable-monster'); // クリック可能なスタイル
                        // ここで enemies は selectedParty を表す
                        if (enemies.includes(monster)) {
                            li.classList.add('dispatch-monster');
                            const statusText = document.createElement('span');
                            statusText.classList.add('status-text');
                            statusText.textContent = '出撃！';
                            li.appendChild(statusText);
                        } else {
                            li.classList.add('resting-monster');
                            const statusText = document.createElement('span');
                            statusText.classList.add('status-text');
                            statusText.textContent = '待機中';
                            li.appendChild(statusText);
                        }
                    } else {
                        // 選択可能プールに含まれていない、またはhasBeenSentToBattleがtrue
                        li.classList.add('unavailable-monster');
                        const statusText = document.createElement('span');
                        statusText.classList.add('status-text');
                        statusText.style.color = '#888888';
                        statusText.textContent = '使用済み'; // 暗い色で表示
                        li.appendChild(statusText);
                    }
                } else if (gameData.currentPhase === 'expeditionSelection') { // 通常の探索派遣フェーズ
                    // ここで enemies は expeditionParty を表す
                    if (enemies.includes(monster)) {
                        li.classList.add('selectable-monster', 'dispatch-monster');
                        const statusText = document.createElement('span');
                        statusText.classList.add('status-text');
                        statusText.textContent = '派遣中';
                        li.appendChild(statusText);
                    } else {
                        li.classList.add('selectable-monster', 'resting-monster');
                        const statusText = document.createElement('span');
                        statusText.classList.add('status-text');
                        statusText.textContent = '待機中';
                        li.appendChild(statusText);
                    }
                }
            } else {
                // 通常表示
                // 名前と硬貨は既に上記で追加されているため、ここでは何も追加しない
            }

            partyList.appendChild(li);
        });

        // パーティの数がdisplayFixedSlotsより少ない場合のみ空き枠を埋める
        if (gameData.party.length < displayFixedSlots) {
            for (let i = gameData.party.length; i < displayFixedSlots; i++) {
                const li = document.createElement('li');
                li.className = 'empty-slot'; // 空き枠用のクラスを追加
                li.innerText = ''; // 空き枠の文字を削除
                li.draggable = false; // 空き枠はドラッグ不可
                partyList.appendChild(li);
            }
        }
    } else {
        console.error("DOM element 'party-list' not found in updateUI.");
    }

    // プレイヤーの生い立ち画像の更新
    if (playerLifeImage) {
        // 既存のイベントリスナーを削除
        if (playerLifeImage._tooltipMouseOverListener) {
            playerLifeImage.removeEventListener('mouseover', playerLifeImage._tooltipMouseOverListener);
        }
        if (playerLifeImage._tooltipMouseOutListener) {
            playerLifeImage.removeEventListener('mouseout', playerLifeImage._tooltipMouseOutListener);
        }

        if (gameData.playerLife && imagePaths[gameData.playerLife.name]) {
            playerLifeImage.src = imagePaths[gameData.playerLife.name];
            playerLifeImage.style.display = 'block'; // 画像を表示

            // 新しいイベントリスナーを追加
            const lifeData = gameData.playerLife; // クロージャでキャプチャ
            playerLifeImage._tooltipMouseOverListener = (event) => {
                showLifeTooltip(lifeData, event);
            };
            playerLifeImage._tooltipMouseOutListener = () => {
                hideLifeTooltip();
            };
            playerLifeImage.addEventListener('mouseover', playerLifeImage._tooltipMouseOverListener);
            playerLifeImage.addEventListener('mouseout', playerLifeImage._tooltipMouseOutListener);
        } else {
            playerLifeImage.style.display = 'none';
        }
    }


    // 敵情報の更新
    if (enemyInfo && enemyList) {
        // isSelectionPhaseがtrueの場合でも敵を表示する必要があるため、条件を調整
        // ただし、selectionPhaseの場合はenemiesが選択中のパーティメンバーなので、敵としては表示しない
        if (enemies.length > 0 && !isSelectionPhase) { // 選択フェーズでない場合のみ敵を表示
            enemyInfo.style.display = 'block'; // 敵がいる場合表示
            enemyList.innerHTML = ''; // クリア
            enemies.forEach(enemy => {
                const li = document.createElement('li');
                li.className = 'monster-card enemy-card';
                // 敵の画像を追加
                const enemyImage = document.createElement('img');
                const enemyImageUrl = imagePaths[enemy.name] || './image/default.png';
                enemyImage.src = enemyImageUrl;
                enemyImage.alt = enemy.name;
                enemyImage.width = 128;
                enemyImage.height = 128;
                enemyImage.classList.add('monster-image');
                li.appendChild(enemyImage);

                const monsterNameDiv = document.createElement('h3');
                monsterNameDiv.innerHTML = `<span class="monster-name-color">${enemy.name}</span>`;
                li.appendChild(monsterNameDiv);

                // 硬貨の表示をグループ化して、ツールチップも対応させる
                const groupedCoinsHtml = getGroupedCoinDisplay(enemy.allCoins, coinAttributesMap);
                const monsterCoinsDiv = document.createElement('div');
                monsterCoinsDiv.classList.add('monster-coins');
                monsterCoinsDiv.innerHTML = groupedCoinsHtml;
                li.appendChild(monsterCoinsDiv);

                enemyList.appendChild(li);
            });
        } else {
            if (enemyInfo) enemyInfo.style.display = 'none'; // 敵がいない場合非表示
        }
    }

    // 神の寵愛硬貨の表示を更新
    if (favourDisplay) {
        // イベントリスナーを定義（名前付き関数として定義し、削除時に参照できるようにする）
        const favourMouseOverListener = (event) => {
            showFavourTooltip(event); // マウスイベントオブジェクトを直接渡す
        };
        const favourMouseOutListener = () => {
            hideFavourTooltip();
        };

        if (gameData.favour && gameData.favour.length > 0) {
            // 既存のリスナーを削除してから追加（重複登録防止）
            favourDisplay.removeEventListener('mouseover', favourMouseOverListener);
            favourDisplay.removeEventListener('mouseout', favourMouseOutListener);

            favourDisplay.addEventListener('mouseover', favourMouseOverListener);
            favourDisplay.addEventListener('mouseout', favourMouseOutListener);

            favourDisplay.innerHTML = '<strong>神の寵愛:</strong> ';
            // ここで game.js の createCoinTooltipHtml を呼び出す
            favourDisplay.innerHTML += gameData.favour.map(coinId => createCoinTooltipHtml(coinId, coinAttributesMap, false, 1, false)).join(' ');
            favourDisplay.style.display = 'flex'; // 硬貨がある場合に表示
        } else {
            // 硬貨がない場合はイベントリスナーを削除し、非表示にする
            favourDisplay.removeEventListener('mouseover', favourMouseOverListener);
            favourDisplay.removeEventListener('mouseout', favourMouseOutListener);
            favourDisplay.innerHTML = '';
            favourDisplay.style.display = 'none';
        }
    }

    // フェーズに応じてUIの表示/非表示を切り替える
    if (initialSetupArea) {
        if (gameData.currentPhase === 'initial') {
            initialSetupArea.style.display = 'block';
            if (actionArea) actionArea.style.display = 'block'; // 初期セットアップエリアが表示されている間はアクションエリアも表示
        } else {
            initialSetupArea.style.display = 'none';
            if (actionArea) actionArea.style.display = 'block'; // ゲーム中はアクションエリアを表示
        }
    } else {
        console.error("DOM element 'initial-setup-area' not found in updateUI.");
    }
}

/**
 * ユーザーがボタンをクリックするまで待機する。
 * @returns {Promise<string>} クリックされたボタンのdata-value属性の値。
 */
export function waitForButtonClick() {
    const actionArea = document.getElementById('action-area');
    if (!actionArea) {
        console.error("DOM element 'action-area' not found for waitForButtonClick.");
        return Promise.resolve(null);
    }
    return new Promise(resolve => {
        const listener = (event) => {
            const button = event.target.closest('button');
            if (button) {
                hideMonsterTooltip();
                hideAreaTooltip();
                hideCoinTooltip();
                hideLifeTooltip();
                hideFavourTooltip();
                actionArea.removeEventListener('click', listener);
                resolve(button.dataset.value);
            }
        };
        actionArea.addEventListener('click', listener);
    });
}

/**
 * アクションエリアのボタンを全てクリアする。
 */
export function clearActionArea() {
    const actionArea = document.getElementById('action-area');
    if (actionArea) {
        actionArea.innerHTML = '';
    } else {
        console.warn("actionArea element not found. Cannot clear.");
    }
}

/**
 * 初期セットアップエリアの表示/非表示を切り替える。
 * @param {boolean} show - 表示する場合はtrue、非表示にする場合はfalse。
 */
export function toggleInitialSetupArea(show) {
    const initialSetupArea = document.getElementById('initial-setup-area');
    if (initialSetupArea) {
        initialSetupArea.style.display = show ? 'block' : 'none';
    } else {
        console.warn("initialSetupArea element not found. Cannot toggle display.");
    }
}

/**
 * 指定されたボタンデータを元に、アクションエリアにボタンを生成して表示する。
 * @param {Array<Object>} buttons - {id: string, text: string, className?: string} 形式のボタンデータの配列。
 */
export function createButtons(buttons) {
    const actionArea = document.getElementById('action-area');
    if (!actionArea) {
        console.error("DOM element 'action-area' not found for createButtons.");
        return;
    }
    clearActionArea(); // 既存のボタンをクリア

    buttons.forEach(buttonData => {
        const button = document.createElement('button');
        button.className = buttonData.className || 'action-button'; // スタイルクラスを適用、指定がなければaction-button
        button.dataset.value = buttonData.id; // クリック時に取得する値をdata-valueに設定
        button.innerHTML = buttonData.text; // innerHTML を使用してHTMLタグを解釈させる
        actionArea.appendChild(button);
    });
}

/**
 * 戦闘ログを含むモーダルポップアップを表示し、ユーザーが閉じるのを待つ。
 * @param {string} title - ポップアップのタイトル。
 * @param {string} content - ポップアップに表示するHTMLコンテンツ（戦闘ログ）。
 * @param {string[]} enemyNames - 敵モン娘の名前の配列。
 * @param {string} buttonText - 閉じるボタンのテキスト。
 * @returns {Promise<void>} ユーザーが閉じるボタンをクリックしたときに解決するPromise。
 */
export function showCombatLogModal(title, content, enemyNames, buttonText = '閉じる') {
    return new Promise(resolve => {
        const overlay = document.createElement('div');
        overlay.classList.add('modal-overlay');

        const modal = document.createElement('div');
        modal.classList.add('modal-content');

        const titleElement = document.createElement('h4');
        titleElement.innerHTML = title;
        modal.appendChild(titleElement);

        const enemyImagesContainer = document.createElement('div');
        enemyImagesContainer.classList.add('enemy-images-container');

        // 敵モン娘の画像をコンテナに追加
        if (enemyNames && enemyNames.length > 0) {
            enemyNames.forEach(name => {
                const img = document.createElement('img');
                img.src = imagePaths[name] || './image/default.png'; // imagePathsからパスを取得、フォールバック
                img.alt = name;
                img.style.backgroundColor = 'rgb(100, 100, 100)';
                img.width = 128;
                img.height = 128;
                img.style.imageRendering = 'pixelated';
                img.style.margin = '2px'; // 画像間のスペース
                img.style.borderRadius = '8px'; // 角丸
                img.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)'; // 影
                enemyImagesContainer.appendChild(img);
            });
            modal.appendChild(enemyImagesContainer); // 画像コンテナをモーダルに追加
        }

        const contentElement = document.createElement('div');
        contentElement.classList.add('modal-log-content'); // スクロール可能なエリア
        contentElement.innerHTML = content; // HTMLコンテンツを許容

        const closeButton = document.createElement('button');
        closeButton.classList.add('modal-close-button');
        closeButton.textContent = buttonText;

        closeButton.addEventListener('click', () => {
            document.body.removeChild(overlay);
            resolve();
        });

        modal.appendChild(contentElement);
        modal.appendChild(closeButton);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
    });
}

/**
 * ドラッグ開始時の処理。
 * @param {DragEvent} event - ドラッグイベントオブジェクト。
 */
function handleDragStart(event) {
    // ドラッグ中の要素が画像であっても、親の.monster-card要素をドラッグ対象とする
    const targetCard = event.target.closest('.monster-card');
    if (targetCard) {
        draggedItem = targetCard;
        // dataTransferオブジェクトにドラッグする要素の情報を設定
        event.dataTransfer.setData('text/plain', targetCard.dataset.index);
        event.dataTransfer.effectAllowed = 'move'; // 移動のみ許可
        // ドラッグ中の要素にスタイルを適用
        setTimeout(() => {
            targetCard.classList.add('dragging');
        }, 0);
    }
}

/**
 * ドラッグ要素がドロップターゲットの上にある時の処理。
 * @param {DragEvent} event - ドラッグイベントオブジェクト。
 */
function handleDragOver(event) {
    event.preventDefault(); // デフォルトの動作（ドロップ禁止）を防止
    // 有効なドロップターゲットの場合にスタイルを適用
    // closest を使用して、イベントターゲットが li.monster-card または .empty-slot の子要素であっても親を検出する
    const targetItem = event.target.closest('.monster-card, .empty-slot');
    if (targetItem && targetItem !== draggedItem) {
        targetItem.classList.add('drag-over');
        event.dataTransfer.dropEffect = 'move';
    } else {
        event.dataTransfer.dropEffect = 'none';
    }
}

/**
 * ドラッグ要素がドロップターゲットから離れた時の処理。
 * @param {DragEvent} event - ドラッグイベントオブジェクト。
 */
function handleDragLeave(event) {
    // closest を使用して、イベントターゲットが li.monster-card または .empty-slot の子要素であっても親を検出する
    const targetItem = event.target.closest('.monster-card, .empty-slot');
    if (targetItem) {
        targetItem.classList.remove('drag-over');
    }
}

/**
 * ドラッグ要素がドロップされた時の処理。
 * @param {DragEvent} event - ドラッグイベントオブジェクト。
 * @param {object} gameData - 現在のゲーム状態オブジェクト。
 * @param {Array} coinAttributesMap - data.jsから提供されるcoinAttributesMap。
 * @param {object[]} enemies - 現在の敵モン娘の配列（または選択中のパーティ）。
 * @param {object} currentArea - 現在の地形情報。
 * @param {boolean} isSelectionPhase - 選択フェーズかどうか。
 * @param {object[]|null} selectableMonsterPool - 選択可能なモン娘のプール。
 * @param {number} maxPartySize - ゲームの最大パーティサイズ。
 */
function handleDrop(event, gameData, coinAttributesMap, enemies, currentArea, isSelectionPhase, selectableMonsterPool, maxPartySize) {
    event.preventDefault();
    // closest を使用して、イベントターゲットが li.monster-card または .empty-slot の子要素であっても親を検出する
    const targetItem = event.target.closest('.monster-card, .empty-slot');
    if (targetItem) {
        targetItem.classList.remove('drag-over');
    }

    if (!targetItem || draggedItem === targetItem) {
        return; // 無効なドロップ、または同じ要素へのドロップ
    }

    const fromIndex = parseInt(draggedItem.dataset.index);
    let toIndex = -1;

    // ドロップされた場所のインデックスを正確に取得
    const allListItems = Array.from(draggedItem.parentNode.children);
    toIndex = allListItems.indexOf(targetItem);

    if (fromIndex !== -1 && toIndex !== -1) {
        // パーティ配列を更新
        const [movedMonster] = gameData.party.splice(fromIndex, 1);
        gameData.party.splice(toIndex, 0, movedMonster);

        // updateUIを呼び出してUI全体を再描画し、状態を反映させる
        updateUI(gameData, coinAttributesMap, enemies, currentArea, isSelectionPhase, selectableMonsterPool, maxPartySize);
    }
}

/**
 * ドラッグ終了時の処理。
 * @param {DragEvent} event - ドラッグイベントオブジェクト。
 */
function handleDragEnd(event) {
    // ドラッグ中の要素からスタイルを削除
    if (draggedItem) {
        draggedItem.classList.remove('dragging');
        draggedItem = null;
    }
    // 全てのドロップターゲットからハイライトスタイルを削除
    document.querySelectorAll('.drag-over').forEach(item => {
        item.classList.remove('drag-over');
    });
}
