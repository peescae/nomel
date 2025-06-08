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

let draggedItem = null; // ドラッグ中の要素を保持

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
            max-width: 250px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
            visibility: hidden; /* 初期状態では非表示 */
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
            max-width: 250px;
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
            max-width: 250px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
            visibility: hidden; /* 初期状態では非表示 */
        `;
        document.body.appendChild(coinTooltipElement);
    }
}

/**
 * ポップアップの位置を計算し設定するヘルパー関数。
 * @param {HTMLElement} tooltipElement - ポップアップのDOM要素。
 * @param {HTMLElement} targetElement - マウスオーバーされたDOM要素。
 */
function positionTooltip(tooltipElement, targetElement) {
    const rect = targetElement.getBoundingClientRect();
    const tooltipWidth = tooltipElement.offsetWidth;
    const tooltipHeight = tooltipElement.offsetHeight;

    let left = rect.right + 10; // ターゲット要素の右から10px
    let top = rect.top;

    // 画面の右端からはみ出さないように調整
    if (left + tooltipWidth > window.innerWidth - 20) { // 右端に20pxのマージン
        left = rect.left - tooltipWidth - 10; // ターゲット要素の左に表示
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
 * @param {HTMLElement} targetElement - マウスオーバーされたDOM要素 (例: li.monster-card)。
 * @param {Array} coinAttributesMap - data.jsから提供されるcoinAttributesMap。
 */
export function showMonsterTooltip(monster, targetElement, coinAttributesMap) {
    createMonsterTooltipElement(); // ポップアップ要素が存在しない場合は作成

    let tooltipContent = `<h4>${monster.name}の硬貨</h4>`;
    if (monster.coinAttributes.length === 0) {
        tooltipContent += '<p>硬貨を持っていません。</p>';
    } else {
        monster.coinAttributes.forEach(coinId => {
            const coinInfo = coinAttributesMap.find(c => c.id === coinId);
            if (coinInfo) {
                tooltipContent += `<p>${getCoinAttributeName(coinId, coinAttributesMap)}: <span class="coin-description">${coinInfo.help}</span></p>`;
            } else {
                tooltipContent += `<p><span class="coin-attribute-name">${coinId}</span>: 説明なし</p>`;
            }
        });
    }
    monsterTooltipElement.innerHTML = tooltipContent;
    positionTooltip(monsterTooltipElement, targetElement);
}

/**
 * エリアの硬貨情報ポップアップを表示する。
 * @param {object} area - 表示対象のエリアオブジェクト。
 * @param {HTMLElement} targetElement - マウスオーバーされたDOM要素 (例: button.choice-button)。
 * @param {Array} coinAttributesMap - data.jsから提供されるcoinAttributesMap。
 */
export function showAreaTooltip(area, targetElement, coinAttributesMap) {
    createAreaTooltipElement(); // ポップアップ要素が存在しない場合は作成
    if (!areaTooltipElement) return; // 要素が作成されなかった場合は何もしない

    let tooltipContent = `<h4>${area.name}の属性硬貨</h4>`;
    if (area.coinAttributes.length === 0) {
        tooltipContent += '<p>関連する硬貨がありません。</p>';
    } else {
        area.coinAttributes.forEach(coinId => {
            const coinInfo = coinAttributesMap.find(c => c.id === coinId);
            if (coinInfo) {
                tooltipContent += `<p>${getCoinAttributeName(coinId, coinAttributesMap)}: <span class="coin-description">${coinInfo.help}</span></p>`;
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
    positionTooltip(areaTooltipElement, targetElement);
}

/**
 * 硬貨情報ポップアップを表示する。
 * @param {Event} event - マウスイベント。
 * @param {string} coinId - 表示対象の硬貨ID。
 * @param {Array} coinAttributesMap - data.jsから提供されるcoinAttributesMap。
 */
export function showCoinTooltip(event, coinId, coinAttributesMap) {
    createCoinTooltipElement(); // ポップアップ要素が存在しない場合は作成
    if (!coinTooltipElement) return;

    const coinInfo = coinAttributesMap.find(c => c.id === coinId);
    if (!coinInfo) {
        coinTooltipElement.innerHTML = `<p>硬貨情報が見つかりません: ${coinId}</p>`;
    } else {
        coinTooltipElement.innerHTML = `<h4>${coinInfo.name}の硬貨</h4><p><span class="coin-description">${coinInfo.help}</span></p>`;
    }
    positionTooltip(coinTooltipElement, event.currentTarget);
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
 * 硬貨属性のIDから日本語名を取得する。
 * @param {string} attributeId - 硬貨属性のID。
 * @param {Array} coinAttributesMap - data.jsから提供されるcoinAttributesMap。
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
 * ゲームのUI表示を更新する。
 * @param {object} gameData - 現在のゲーム状態オブジェクト。
 * @param {Array} coinAttributesMap - data.jsから提供されるcoinAttributesMap。
 * @param {object[]} [enemies=[]] - 現在の敵モン娘の配列（表示用）。
 * @param {object} [currentArea=null] - 現在の地形情報。
 * @param {boolean} [isSelectionPhase=false] - 選択フェーズかどうか。
 * @param {object[]|null} [selectableMonsterPool=null] - 選択可能なモン娘のプール (ボス戦などで使用済みを除外する場合)。
 * @param {number} maxPartySize - ゲームの最大パーティサイズ。
 */
export function updateUI(gameData, coinAttributesMap, enemies = [], currentArea = null, isSelectionPhase = false, selectableMonsterPool = null, maxPartySize) {
    const dayDisplay = document.getElementById('days-display'); // idを修正
    const foodDisplay = document.getElementById('food-display');
    const milkDisplay = document.getElementById('milk-display');
    const partySizeDisplay = document.getElementById('party-size-display');
    const seedDisplay = document.getElementById('seed-display');
    const currentAreaDisplay = document.getElementById('current-area-display');
    const currentAreaCoinsDisplay = document.getElementById('current-area-coins-display');
    const favourDisplay = document.getElementById('favour');
    const partyList = document.getElementById('party-list');
    const enemyInfo = document.getElementById('enemy-info'); // 敵情報の表示エリア
    const enemyList = document.getElementById('enemy-list');   // 敵のリスト
    const initialSetupArea = document.getElementById('initial-setup-area');
    const actionArea = document.getElementById('action-area');

    if (dayDisplay) dayDisplay.innerText = `${gameData.days}`; // gameData.days を使用
    if (milkDisplay) milkDisplay.innerText = `${gameData.milk}`;
    
    // 食料表示の更新
    if (foodDisplay) {
        // 探索派遣選択フェーズで、かつ予想食料獲得量がある場合（0でない場合）に「+b」形式で表示
        if (gameData.currentPhase === 'expeditionSelection' && gameData.estimatedFoodGain !== 0) {
            foodDisplay.innerHTML = `${gameData.food} + <span style="color: #FFD700;">${gameData.estimatedFoodGain}</span>`; // 色をゴールドに変更
        } else {
            // 通常時、または予想食料獲得量が0の場合は通常の食料を表示
            foodDisplay.innerText = `${gameData.food}`;
        }
    }
    
    // 仲間のモン娘の維持費合計を計算し表示
    gameData.upkeep = gameData.party.reduce((sum, monster) => sum + monster.upkeep, 0); // ここでgameData.upkeepを更新
    if (partySizeDisplay) {
        partySizeDisplay.textContent = gameData.upkeep; // 維持費合計を表示
    }

    if (seedDisplay) seedDisplay.innerText = gameData.currentSeed; // シード値の表示を更新

    if (currentAreaDisplay) currentAreaDisplay.innerText = gameData.currentArea ? gameData.currentArea.name : '未選択';
    if (currentAreaCoinsDisplay) {
        currentAreaCoinsDisplay.innerHTML = gameData.currentArea ? gameData.currentArea.coinAttributes.map(attrId => getCoinAttributeName(attrId, coinAttributesMap)).join(' ') : '';

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
                showAreaTooltip(area, event.currentTarget, coinAttributesMap);
            }
        };
        currentAreaCoinsDisplay._tooltipMouseOutListener = () => {
            hideAreaTooltip(); // マウスが離れたら即座に非表示
        };

        currentAreaCoinsDisplay.addEventListener('mouseover', currentAreaCoinsDisplay._tooltipMouseOverListener);
        currentAreaCoinsDisplay.addEventListener('mouseout', currentAreaCoinsDisplay._tooltipMouseOutListener);
    } else {
        console.warn("DOM element 'current-area-coins-display' not found in updateUI.");
    }

    if (partyList) {
        partyList.innerHTML = '';
        const displayFixedSlots = maxPartySize; // UI表示で常に確保する枠の数

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
            li.addEventListener('mouseover', (event) => showMonsterTooltip(monster, event.currentTarget, coinAttributesMap));
            li.addEventListener('mouseout', hideMonsterTooltip);
            
            // 硬貨属性のHTMLを生成
            const coinAttributesHtml = `<div class="coin-attributes-wrapper">${monster.coinAttributes.map(attrId => getCoinAttributeName(attrId, coinAttributesMap)).join(' ')}</div>`;

            // 選択フェーズの場合、クリック可能にする
            if (isSelectionPhase) {
                // ボス戦派遣選択フェーズで、かつ選択可能プールがある場合
                if (gameData.currentPhase === 'bossExpeditionSelection' && selectableMonsterPool) {
                    if (selectableMonsterPool.includes(monster) && !monster.hasBeenSentToBattle) {
                        li.classList.add('selectable-monster'); // クリック可能なスタイル
                        // ここで enemies は selectedParty を表す
                        if (enemies.includes(monster)) { 
                            li.classList.add('dispatch-monster'); // 派遣中スタイル
                            li.innerHTML = `<strong><span class="monster-name-color">${monster.name}</span></strong><br>
                                            ${coinAttributesHtml}<br>
                                            <span class="status-text">派遣中</span>`;
                        } else {
                            li.classList.add('resting-monster'); // 待機中スタイル
                            li.innerHTML = `<strong><span class="monster-name-color">${monster.name}</span></strong><br>
                                            ${coinAttributesHtml}<br>
                                            <span class="status-text">待機中</span>`;
                        }
                    } else {
                        // 選択可能プールに含まれていない、またはhasBeenSentToBattleがtrue
                        li.classList.add('unavailable-monster');
                        li.innerHTML = `<strong><span class="monster-name-color">${monster.name}</span></strong><br>
                                        ${coinAttributesHtml}<br>
                                        <span class="status-text" style="color: #888888;">使用済み</span>`; // 暗い色で表示
                    }
                } else if (gameData.currentPhase === 'expeditionSelection') { // 通常の探索派遣フェーズ
                    // ここで enemies は expeditionParty を表す
                     if (enemies.includes(monster)) {
                        li.classList.add('selectable-monster', 'dispatch-monster');
                        li.innerHTML = `<strong><span class="monster-name-color">${monster.name}</span></strong><br>
                                        ${coinAttributesHtml}<br>
                                        <span class="status-text">派遣中</span>`;
                    } else {
                        li.classList.add('selectable-monster', 'resting-monster');
                        li.innerHTML = `<strong><span class="monster-name-color">${monster.name}</span></strong><br>
                                        ${coinAttributesHtml}<br>
                                        <span class="status-text">待機中</span>`;
                    }
                }
            } else {
                // 通常表示
                li.innerHTML = `<strong><span class="monster-name-color">${monster.name}</span></strong><br>
                                ${coinAttributesHtml}<br>`;
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
                const coinsHtml = enemy.coinAttributes.map(attrId => { // enemy.coinAttributes を使用
                    const attr = coinAttributesMap.find(c => c.id === attrId);
                    return `<span class="coin-attribute" style="background-color: ${attr.color};">${attr.name}</span>`;
                }).join('');
                li.innerHTML = `
                    <h3>${enemy.name}</h3>
                    <div class="monster-coins">${coinsHtml}</div>
                `;
                enemyList.appendChild(li);
            });
        } else {
            enemyInfo.style.display = 'none'; // 敵がいない場合非表示
        }
    }

    // 神の寵愛硬貨の表示を更新
    if (favourDisplay) {
        if (gameData.favour && gameData.favour.length > 0) {
            favourDisplay.innerHTML = '神の寵愛: ';
            // ここで game.js の createCoinTooltipHtml を呼び出す
            favourDisplay.innerHTML += gameData.favour.map(coinId => window.createCoinTooltipHtml(coinId, coinAttributesMap)).join(' ');
            favourDisplay.style.display = 'flex'; // 硬貨がある場合に表示
        } else {
            favourDisplay.innerHTML = '';
            favourDisplay.style.display = 'none'; // 硬貨がない場合は非表示
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
                hideMonsterTooltip(); // ツールチップを非表示にする
                hideAreaTooltip(); // エリアツールチップも非表示にする
                hideCoinTooltip(); // コインツールチップも非表示にする
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
 * @param {string} buttonText - 閉じるボタンのテキスト。
 * @returns {Promise<void>} ユーザーが閉じるボタンをクリックしたときに解決するPromise。
 */
export function showCombatLogModal(title, content, buttonText = '閉じる') {
    return new Promise(resolve => {
        const overlay = document.createElement('div');
        overlay.classList.add('modal-overlay');

        const modal = document.createElement('div');
        modal.classList.add('modal-content');

        const titleElement = document.createElement('h3');
        titleElement.innerHTML = title;

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

        modal.appendChild(titleElement);
        modal.appendChild(contentElement);
        modal.appendChild(closeButton);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // コンテンツが溢れる場合にスクロールを最下部に移動
        //contentElement.scrollTop = contentElement.scrollHeight;
    });
}

/**
 * ドラッグ開始時の処理。
 * @param {DragEvent} event - ドラッグイベントオブジェクト。
 */
function handleDragStart(event) {
    // ドラッグ中の要素を保持
    draggedItem = event.target;
    // dataTransferオブジェクトにドラッグする要素の情報を設定
    event.dataTransfer.setData('text/plain', event.target.dataset.index);
    event.dataTransfer.effectAllowed = 'move'; // 移動のみ許可
    // ドラッグ中の要素にスタイルを適用
    setTimeout(() => {
        event.target.classList.add('dragging');
    }, 0);
}

/**
 * ドラッグ要素がドロップターゲットの上にある時の処理。
 * @param {DragEvent} event - ドラッグイベントオブジェクト。
 */
function handleDragOver(event) {
    event.preventDefault(); // デフォルトの動作（ドロップ禁止）を防止
    // 有効なドロップターゲットの場合にスタイルを適用
    if (event.target.classList.contains('monster-card') && event.target !== draggedItem) {
        event.target.classList.add('drag-over');
        event.dataTransfer.dropEffect = 'move';
    } else if (event.target.classList.contains('empty-slot')) {
        event.target.classList.add('drag-over');
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
    event.target.classList.remove('drag-over');
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
    event.target.classList.remove('drag-over');

    const targetItem = event.target.closest('.monster-card, .empty-slot'); // ドロップされた要素
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
