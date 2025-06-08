// game.js

import { coinAttributesMap, monsterTemplates, areaTypes, GAME_CONSTANTS, delicacies, FINAL_BOSS_ENCOUNTERS } from './data.js';
import { Monster, generateAreaSpecificEnemies, generateSpecialRaidEnemies, getUniqueRandomMonsters } from './monster.js';
import { mulberry32 } from './rng.js';
import {
    logMessage,
    updateUI,
    waitForButtonClick,
    clearActionArea,
    toggleInitialSetupArea,
    showMonsterTooltip,
    showAreaTooltip,
    hideMonsterTooltip,
    hideAreaTooltip,
    getCoinAttributeName,
    createButtons,
} from './uiManager.js';
import { conductFight } from './battle.js';
import { updateEstimatedFoodGain } from './food.js';
import { initMusicPlayer, playMusic, playSfx, stopMusic } from './musicManager.js'; // musicManagerをインポート

// coinAttributesMapをグローバルスコープで利用可能にする
// HTMLのonmouseover属性などから直接呼び出すため
window.coinAttributesMap = coinAttributesMap;

// game.js内でグローバルにアクセスできるように、uiManagerの関数をwindowオブジェクトに割り当て
// HTMLのonmouseover属性などから直接呼び出すため
window.showCoinTooltip = (event, coinId, map) => {
    // uiManager.js からインポートされた showCoinTooltip 関数を呼び出す
    const coinInfo = map.find(c => c.id === coinId);
    if (!coinInfo) return; // 硬貨情報がなければ何もしない

    // ツールチップ要素の作成と設定
    let tooltipElement = document.getElementById('coin-tooltip');
    if (!tooltipElement) {
        tooltipElement = document.createElement('div');
        tooltipElement.id = 'coin-tooltip';
        // style.cssで定義されたスタイルが適用されるように、ここでは基本的なことのみ設定
        tooltipElement.style.position = 'absolute';
        tooltipElement.style.pointerEvents = 'none'; // マウスイベントをブロックしない
        tooltipElement.style.opacity = '0';
        tooltipElement.style.visibility = 'hidden';
        document.body.appendChild(tooltipElement);
    }

    tooltipElement.innerHTML = `<h4>${coinInfo.name}の硬貨</h4><p><span class="coin-description">${coinInfo.help}</span></p>`;

    // ツールチップの位置を計算
    const targetRect = event.currentTarget.getBoundingClientRect();
    let left = targetRect.right + 10;
    let top = targetRect.top;

    // 画面の右端からはみ出さないように調整
    if (left + tooltipElement.offsetWidth > window.innerWidth - 20) {
        left = targetRect.left - tooltipElement.offsetWidth - 10;
        if (left < 20) left = (window.innerWidth - tooltipElement.offsetWidth) / 2;
    }
    // 画面の下端からはみ出さないように調整
    if (top + tooltipElement.offsetHeight > window.innerHeight - 20) {
        top = window.innerHeight - tooltipElement.offsetHeight - 20;
    }
    if (top < 20) top = 20;


    tooltipElement.style.left = `${left + window.scrollX}px`;
    tooltipElement.style.top = `${top + window.scrollY}px`;
    tooltipElement.style.opacity = '1';
    tooltipElement.style.visibility = 'visible';
};

window.hideCoinTooltip = () => {
    const tooltipElement = document.getElementById('coin-tooltip');
    if (tooltipElement) {
        tooltipElement.style.opacity = '0';
        tooltipElement.style.visibility = 'hidden';
    }
};


// ゲームの状態を管理するオブジェクト
const game = {
    food: 100,
    milk: 3,
    days: 0,
    maxDays: 20,
    party: [], // 仲間のモン娘
    currentPhase: 'initial', // 現在のフェーズを管理
    battleAllowance: 0, // 襲撃中に発生した戦闘手当
    currentSeed: '', // 現在使用中のシード値
    currentArea: null, // 現在の地形情報
    upkeep: 0, // 維持費
    estimatedFoodGain: 0, // 予想食料獲得量
    expeditionParty: [], // 派遣されるモン娘の配列 (珍味判定用)
    favour: [], // 神の寵愛で得た硬貨の配列
};

let random; // 疑似乱数生成関数
let soundPaths;

/**
 * １：モン娘の加入フェーズ (ゲーム開始時のみ)。
 * プレイヤーは最大数までモン娘を仲間に加えることができる。
 */
async function offerMonstersToJoin() {
    logMessage(`<br/>`);
    logMessage(`<div id="game-messages-phase">--- モン娘加入フェーズ ---</div>`);
    game.currentPhase = 'joinPhase';

    // 最初の選択: プレイヤーは必ず1体選ぶ必要がある
    logMessage(`最初に雇う仲間を3人の中から選んでね。`);
    clearActionArea();

    let initialChoices = [];
    // 現在パーティにいない、かつ'enemy'属性を持たない全てのモン娘テンプレート
    let availableTemplatesForOffer = monsterTemplates.filter(m =>
        !game.party.some(p => p.name === m.name) && !m.coins.includes('enemy')
    );

    // 重み付けを考慮して3体のモン娘を仮選択
    initialChoices = getUniqueRandomMonsters(3, availableTemplatesForOffer, true, 0, Infinity, random);

    // 選択肢をシャッフルして表示順をランダムにする
    initialChoices.sort(() => 0.5 - random());

    const actionArea = document.getElementById('action-area');
    initialChoices.forEach((monster, index) => {
        const button = document.createElement('button');
        button.className = 'choice-button';
        button.innerHTML = `<span class="monster-name-color">${monster.name}</span><br>
                            ${monster.coinAttributes.map(attrId => getCoinAttributeName(attrId, coinAttributesMap)).join(' ')}`;
        button.dataset.value = index.toString();
        actionArea.appendChild(button);

        // マウスイベントリスナー
        button.addEventListener('mouseover', (event) => showMonsterTooltip(monster, event.currentTarget, coinAttributesMap));
        button.addEventListener('mouseout', hideMonsterTooltip);
    });

    const initialChoiceIndex = parseInt(await waitForButtonClick());
    const chosenInitialMonster = initialChoices[initialChoiceIndex];
    game.party.push(chosenInitialMonster);
    game.milk--;
    // 加入の効果音を再生
    if (soundPaths && soundPaths["加入"]) {
        playSfx(soundPaths["加入"]).catch(e => console.error("加入の効果音の再生に失敗しました:", e));
    }
    logMessage(`<span class="monster-name-color">${chosenInitialMonster.name}</span> を雇ったよ！`);
    updateUI(game, coinAttributesMap, [], null, false, null, GAME_CONSTANTS.MAX_PARTY_SIZE); // UIを更新して表示を反映

    // 2回目以降の選択: プレイヤーは最大3体までモン娘を加入可能
    while (game.party.length < GAME_CONSTANTS.MAX_PARTY_SIZE) {
        logMessage(`もっと仲間を増やそうか？（現在の仲間数: ${game.party.length} / ${GAME_CONSTANTS.MAX_PARTY_SIZE}）`);

        let subsequentChoices = [];
        // 現在パーティにいない、かつ'enemy'属性を持たないモン娘のみを対象とする
        let currentAvailableTemplates = monsterTemplates.filter(m =>
            !game.party.some(p => p.name === m.name) && !m.coins.includes('enemy')
        );

        // 重み付けを考慮して3体のモン娘を仮選択
        subsequentChoices = getUniqueRandomMonsters(3, currentAvailableTemplates, true, 0, Infinity, random);

        // 選択肢をシャッフル
        subsequentChoices.sort(() => 0.5 - random());

        clearActionArea(); // 各ループの開始時にクリア
        subsequentChoices.forEach((monster, index) => {
            const button = document.createElement('button');
            button.className = 'choice-button';
            button.innerHTML = `<span class="monster-name-color">${monster.name}</span><br>
                                ${monster.coinAttributes.map(attrId => getCoinAttributeName(attrId, coinAttributesMap)).join(' ')}`;
            button.dataset.value = index.toString(); // エリアのインデックスを返す
            actionArea.appendChild(button);

            // マウスイベントリスナー
            button.addEventListener('mouseover', (event) => showMonsterTooltip(monster, event.currentTarget, coinAttributesMap));
            button.addEventListener('mouseout', hideMonsterTooltip);
        });

        // MAX_PARTY_SIZE未満の場合のみ「仲間加入を終了」ボタンを表示
        if (game.party.length < GAME_CONSTANTS.MAX_PARTY_SIZE) {
            const finishButton = document.createElement('button');
            finishButton.innerText = "仲間加入を終了";
            finishButton.dataset.value = 'finish';
            actionArea.appendChild(finishButton);
        }

        const choice = await waitForButtonClick();

        if (choice === 'finish') {
            logMessage("モン娘の勧誘を打ち切ったよ。");
            break; // ループを抜ける
        }

        const chosenMonsterIndex = parseInt(choice);
        if (chosenMonsterIndex >= 0 && chosenMonsterIndex < subsequentChoices.length) {
            const chosenMonster = subsequentChoices[chosenMonsterIndex];
            game.party.push(chosenMonster);
            game.milk--;
            // 加入の効果音を再生
            if (soundPaths && soundPaths["加入"]) {
                playSfx(soundPaths["加入"]).catch(e => console.error("加入の効果音の再生に失敗しました:", e));
            }
            logMessage(`<span class="monster-name-color">${chosenMonster.name}</span> を雇ったよ！`);
            updateUI(game, coinAttributesMap, [], null, false, null, GAME_CONSTANTS.MAX_PARTY_SIZE);
        } else {
            logMessage("無効な選択です。");
        }
    }

    // MAX_PARTY_SIZEになった時点で自動的に終了メッセージを表示
    if (game.party.length >= GAME_CONSTANTS.MAX_PARTY_SIZE) {
        logMessage(`仲間も集まったし、冒険に出発しよう！`);
    }
    clearActionArea(); // モン娘加入フェーズ終了時にactionAreaをクリア
}

/**
 * ２：探索エリアの選択フェーズ。
 * 現在の日数に基づいて選択可能な地形をフィルタリングし、プレイヤーに選択させる。
 * @returns {Promise<object>} 選択された地形オブジェクト。
 */
async function selectExplorationArea() {
    logMessage(`<br/>`);
    logMessage(`\n<div id="game-messages-phase">--- 探索エリア選択フェーズ ---</div>`);
    game.currentPhase = 'areaSelection';

    // 現在の日数に基づいて最大属性数を決定
    const maxAttributesAllowed = 2 + Math.floor(game.days / 5);

    // フィルターされた地形リストを作成
    const availableAreas = areaTypes.filter(area => area.coinAttributes.length <= maxAttributesAllowed);

    const areaChoices = [];
    // フィルターされた地形からランダムに3つ（またはそれ以下）を選択
    const shuffledFilteredAreas = [...availableAreas].sort(() => 0.5 - random());
    areaChoices.push(...shuffledFilteredAreas.slice(0, 3));

    logMessage("どっちに進もう？");
    clearActionArea(); // このフェーズの開始時にactionAreaをクリア
    game.estimatedFoodGain = 0; // エリア選択時は予想食料をリセット
    updateUI(game, coinAttributesMap, [], null, false, null, GAME_CONSTANTS.MAX_PARTY_SIZE); // UIを更新して表示を反映

    const actionArea = document.getElementById('action-area');
    areaChoices.forEach((area, index) => {
        const button = document.createElement('button');
        button.className = 'choice-button';
        // HTML要素を直接innerHTMLに設定する
        // ここを修正: createCoinTooltipHtml の代わりに getCoinAttributeName を使用
        button.innerHTML = `${index + 1}: <span class="monster-name-color">${area.name}</span> ${area.coinAttributes.map(attrId => getCoinAttributeName(attrId, coinAttributesMap)).join(' ')}`;
        button.dataset.value = area.id; // エリアのIDを返すように変更
        actionArea.appendChild(button);

        // マウスイベントリスナー
        button.addEventListener('mouseover', (event) => showAreaTooltip(area, event.currentTarget, coinAttributesMap));
        button.addEventListener('mouseout', hideAreaTooltip); // hideAreaTooltip を使用
    });

    const chosenId = await waitForButtonClick();
    const chosenArea = areaTypes.find(area => area.id === chosenId); // IDで検索
    game.currentArea = chosenArea; // ゲームの状態に現在の地形を保存
    updateUI(game, coinAttributesMap, [], null, false, null, GAME_CONSTANTS.MAX_PARTY_SIZE); // UIを更新して現在の地形を表示
    clearActionArea();
    return chosenArea; // 探索エリアオブジェクト全体を返す
}

/**
 * ３：探索に派遣する仲間モン娘の選択フェーズ。
 * プレイヤーはパーティの中から探索に派遣するモン娘を選択する。
 * @param {object} currentArea - 現在の地形情報。
 * @returns {Promise<{expeditionParty: Monster[], restingParty: Monster[]}>} 派遣されるモン娘と待機するモン娘の配列。
 */
async function sendMonstersOnExpedition(currentArea) {
    logMessage(`<br/>`);
    logMessage(`\n<div id="game-messages-phase">--- 探索派遣フェーズ ---</div>`);
    game.currentPhase = 'expeditionSelection';

    if (game.party.length === 0) {
        logMessage("仲間がいません。探索に派遣するモン娘がいません。");
        const actionArea = document.getElementById('action-area');
        actionArea.innerHTML = '<button data-value="continue">次へ</button>';
        await waitForButtonClick();
        game.estimatedFoodGain = 0; // 予想食料をリセット
        updateUI(game, coinAttributesMap, [], null, false, null, GAME_CONSTANTS.MAX_PARTY_SIZE); // UIを更新して表示を反映
        game.currentPhase = 'idle'; // フェーズをアイドルに戻す
        return { expeditionParty: [], restingParty: [] };
    }

    // ログメッセージの硬貨属性をツールチップ対応にする
    const areaCoinHtml = currentArea.coinAttributes.map(attrId => {
        // createCoinTooltipHtml を呼び出して、スタイル付きのHTMLを生成
        return createCoinTooltipHtml(attrId, coinAttributesMap);
    }).join(' ');

    logMessage(`探索に派遣するモン娘を選ぼう！　地域の硬貨属性 (${areaCoinHtml}) に適したモン娘を選んでね。`);
    logMessage("仲間モン娘の枠をクリックして派遣/待機を切り替えてね。");

    const expeditionParty = []; // 派遣されるモン娘
    // restingParty は動的に計算されるため、ここでは初期化しない

    const partyList = document.getElementById('party-list');
    // partyList の要素にクリックイベントリスナーを設定
    // ここで一度全てを更新し、イベントリスナーを付与
    updateUI(game, coinAttributesMap, expeditionParty, currentArea, true, game.party, GAME_CONSTANTS.MAX_PARTY_SIZE); // 選択フェーズ用のUI更新, 全員選択可能

    const actionArea = document.getElementById('action-area');
    clearActionArea();
    const finishButton = document.createElement('button');
    finishButton.innerText = "派遣を決定";
    finishButton.dataset.value = 'finish-expedition'; // data-value を変更
    actionArea.appendChild(finishButton);

    return new Promise(resolve => {
        const partySelectionListener = (event) => {
            let clickedLi = event.target.closest('li'); // クリックされたli要素、またはその子要素からliを探す
            if (clickedLi && clickedLi.dataset.index !== undefined) {
                const index = parseInt(clickedLi.dataset.index);
                const monster = game.party[index];

                console.log(`Clicked: ${monster.name}`);
                console.log(`Before toggle - expeditionParty: ${expeditionParty.map(m => m.name).join(', ')}`);

                if (expeditionParty.includes(monster)) {
                    // 派遣中から待機中に戻す
                    expeditionParty.splice(expeditionParty.indexOf(monster), 1);
                    console.log(`${monster.name} was dispatched, moving to resting.`);
                } else {
                    // 待機中から派遣中にする
                    expeditionParty.push(monster);
                    console.log(`${monster.name} was resting, dispatching.`);
                }
                console.log(`After toggle - expeditionParty: ${expeditionParty.map(m => m.name).join(', ')}`);

                // UIを即時更新
                updateEstimatedFoodGain(game, expeditionParty, currentArea); // 直接呼び出す
                console.log(`After updateEstimatedFoodGain - game.estimatedFoodGain: ${game.estimatedFoodGain}`);
                updateUI(game, coinAttributesMap, expeditionParty, currentArea, true, game.party, GAME_CONSTANTS.MAX_PARTY_SIZE); // これが updateEstimatedFoodGain を呼び出す
            }
        };

        const finalizeExpeditionListener = async (event) => {
            let clickedButton = event.target.closest('button');
            if (clickedButton && clickedButton.dataset.value === 'finish-expedition') {
                // イベントリスナーを削除
                if (partyList) partyList.removeEventListener('click', partySelectionListener);
                if (actionArea) actionArea.removeEventListener('click', finalizeExpeditionListener);

                // 最終的な待機中のモン娘リストを計算
                const finalRestingParty = game.party.filter(m => !expeditionParty.includes(m));

                logMessage(`探索に派遣されるモン娘: ${expeditionParty.map(m => `<span class="monster-name-color">${m.name}</span>`).join(', ') || 'なし'}`);
                logMessage(`キャンプで待機するモン娘: ${finalRestingParty.map(m => `<span class="monster-name-color">${m.name}</span>`).join(', ') || 'なし'}`);

                // 派遣されたモン娘を保持する
                game.expeditionParty = expeditionParty;

                clearActionArea(); // ボタンをクリア
                game.currentPhase = 'idle'; // フェーズをアイドルに戻す
                game.estimatedFoodGain = 0; // 派遣決定後、予想食料獲得量をリセット
                updateUI(game, coinAttributesMap, [], null, false, null, GAME_CONSTANTS.MAX_PARTY_SIZE); // UIを通常状態に戻す
                resolve({ expeditionParty, restingParty: finalRestingParty });
            }
        };

        if (partyList) partyList.addEventListener('click', partySelectionListener);
        if (actionArea) actionArea.addEventListener('click', finalizeExpeditionListener);
    });
}

/**
 * ボス戦に派遣する仲間モン娘を選択するフェーズ。
 * @param {Monster[]} availableMonsters - 今回の戦闘で選択可能なモン娘の配列。
 * @returns {Promise<Monster[]>} 選択されたモン娘の配列。
 */
async function selectBattleParty(availableMonsters) {
    game.currentPhase = 'bossExpeditionSelection'; // ボス戦専用のフェーズ名を使用
    const selectedParty = [];

    logMessage("仲間モン娘の枠をクリックして派遣/待機を切り替えてね。");
    logMessage("連戦になるから、戦力の配分には気を付けて。");

    const partyList = document.getElementById('party-list');
    // UIを更新して、選択可能なモン娘と使用済みのモン娘を区別して表示
    updateUI(game, coinAttributesMap, selectedParty, game.currentArea, true, availableMonsters, GAME_CONSTANTS.MAX_PARTY_SIZE); // 選択フェーズUIを有効化し、選択可能プールを渡す

    const actionArea = document.getElementById('action-area');
    clearActionArea();
    const finishButton = document.createElement('button');
    finishButton.innerText = "派遣を決定";
    finishButton.dataset.value = 'finish-battle-expedition'; // data-value を変更
    actionArea.appendChild(finishButton);

    return new Promise(resolve => {
        const partySelectionListener = (event) => {
            let clickedLi = event.target.closest('li');
            if (clickedLi && clickedLi.dataset.index !== undefined) {
                const index = parseInt(clickedLi.dataset.index);
                const monster = game.party[index]; // game.party から元のモンスターを取得

                // 選択可能なモンスターリストに含まれているかチェック
                if (!availableMonsters.includes(monster) || monster.hasBeenSentToBattle) {
                    return; // 選択不可なモンスターは無視
                }

                if (selectedParty.includes(monster)) {
                    selectedParty.splice(selectedParty.indexOf(monster), 1);
                } else {
                    selectedParty.push(monster);
                }
                // UIを即時更新
                updateUI(game, coinAttributesMap, selectedParty, game.currentArea, true, availableMonsters, GAME_CONSTANTS.MAX_PARTY_SIZE);
            }
        };

        const finalizeSelectionListener = async (event) => {
            let clickedButton = event.target.closest('button');
            if (clickedButton && clickedButton.dataset.value === 'finish-battle-expedition') {
                if (selectedParty.length === 0) {
                    logMessage("最低1体のモン娘を派遣する必要があります。");
                    return; // 選択されていない場合は再選択を促す
                }
                // イベントリスナーを削除
                if (partyList) partyList.removeEventListener('click', partySelectionListener);
                if (actionArea) actionArea.removeEventListener('click', finalizeSelectionListener);

                clearActionArea();
                game.currentPhase = 'idle'; // フェーズをアイドルに戻す
                updateUI(game, coinAttributesMap, [], null, false, null, GAME_CONSTANTS.MAX_PARTY_SIZE); // UIを通常状態に戻す
                resolve(selectedParty);
            }
        };

        if (partyList) partyList.addEventListener('click', partySelectionListener);
        if (actionArea) actionArea.addEventListener('click', finalizeSelectionListener);
    });
}


/**
 * ４：襲撃の撃退フェーズ。
 * コイントスで敵を撃退し、失敗すると食料がゼロになる。硬貨属性が結果に影響する。
 * @param {Monster[]} restingParty - キャンプで待機中のモン娘の配列。
 * @param {object} currentArea - 現在の地形情報。
 * @returns {Promise<boolean|string>} 襲撃を撃退できたか、またはゲームオーバーで終了した場合はfalse。
 */
async function handleRaid(restingParty, currentArea) {
    logMessage(`<br/>`);
    logMessage(`\n<div id="game-messages-phase">--- 襲撃フェーズ ---</div>`);
    game.currentPhase = 'raidPhase';

    const partyList = document.getElementById('party-list');
    // 襲撃フェーズ開始時に待機中のモン娘に特別なスタイルを適用
    restingParty.forEach(monster => {
        const li = partyList ? partyList.querySelector(`li[data-index="${game.party.indexOf(monster)}"]`) : null;
        if (li) {
            li.classList.add('resting-in-raid');
        }
    });

    // 襲撃確率の計算
    const totalBaseRaidChance = GAME_CONSTANTS.RAID_BASE_NORMAL_CHANCE + GAME_CONSTANTS.RAID_BASE_SPECIAL_CHANCE;
    let actualTotalRaidChance = totalBaseRaidChance;

    // --- 罠の硬貨による襲撃確率減少 ---
    const trapCoinsInRestingParty = restingParty.reduce((count, monster) => {
        return count + monster.coinAttributes.filter(attr => attr === 'trap').length;
    }, 0);

    if (trapCoinsInRestingParty > 0) {
        const reductionFactor = Math.pow(GAME_CONSTANTS.RAID_TRAP_REDUCTION_FACTOR, trapCoinsInRestingParty);
        actualTotalRaidChance *= reductionFactor;
        logMessage(`キャンプの${createCoinTooltipHtml('trap', coinAttributesMap)}硬貨 ${trapCoinsInRestingParty} 枚により、襲撃確率が ${reductionFactor.toFixed(2)} 倍に減少！`);
    }
    logMessage(`現在の襲撃発生確率: ${(actualTotalRaidChance * 100).toFixed(1)}%`);

    const raidRoll = random();
    let eventType = 'none'; // 'none', 'normal', 'special', 'recruit_event', 'favour'

    // 確率判定
    if (raidRoll < actualTotalRaidChance) {
        const adjustedSpecialRaidThreshold = (GAME_CONSTANTS.RAID_BASE_SPECIAL_CHANCE / totalBaseRaidChance);

        if (raidRoll < adjustedSpecialRaidThreshold) {
            eventType = 'special';
        } else {
            eventType = 'normal';
        }
    }
    else {
        const eventRoll = random();
        if (eventRoll < GAME_CONSTANTS.FAVOUR_EVENT_CHANCE) {
            eventType = 'favour';
        } else {
            eventType = 'recruit_event';
        }
    }

    let enemies = [];
    if (eventType === 'special') {
        logMessage("強敵が襲撃してきたよ！");
        const numEnemies = 1 + Math.floor((game.days - 1) / GAME_CONSTANTS.ENEMY_COIN_SCALING_DAYS);
        enemies = generateSpecialRaidEnemies(numEnemies, game.days, random);
    } else if (eventType === 'normal') {
        logMessage("モン娘が襲撃してきたよ！");
        const numEnemies = 1 + Math.floor((game.days - 1) / GAME_CONSTANTS.ENEMY_COIN_SCALING_DAYS);
        enemies = generateAreaSpecificEnemies(numEnemies, currentArea, game.days, random);
    } else if (eventType === 'recruit_event') {
        logMessage("友好的なモン娘がやってきた！");
        await handleRecruitmentEvent(currentArea); // 仲間勧誘イベントを処理
        // イベント後、スタイルを解除して次のフェーズへ進む
        game.party.forEach(monster => {
            const li = partyList ? partyList.querySelector(`li[data-index="${game.party.indexOf(monster)}"]`) : null;
            if (li) {
                li.classList.remove('resting-in-raid');
            }
        });
        return true; // イベント処理後、襲撃フェーズを成功として終了
    } else if (eventType === 'favour') {
        logMessage("神様からの贈り物だ！");
        await handleFavourEvent(); // 神の寵愛イベントを処理
        // イベント後、スタイルを解除して次のフェーズへ進む
        game.party.forEach(monster => {
            const li = partyList ? partyList.querySelector(`li[data-index="${game.party.indexOf(monster)}"]`) : null;
            if (li) {
                li.classList.remove('resting-in-raid');
            }
        });
        return true; // イベント処理後、襲撃フェーズを成功として終了
    } else { // eventType === 'none'
        logMessage("襲撃はないみたい。");
        // 襲撃がない場合でもスタイルを解除
        game.party.forEach(monster => {
            const li = partyList ? partyList.querySelector(`li[data-index="${game.party.indexOf(monster)}"]`) : null;
            if (li) {
                li.classList.remove('resting-in-raid');
            }
        });
        return true;
    }

    logMessage(`敵モン娘 ${enemies.length} 体が出現！`);
    enemies.forEach(enemy => {
        const enemyCoinHtml = enemy.coinAttributes.map(attrId => createCoinTooltipHtml(attrId, coinAttributesMap)).join(' ');
        logMessage(` - <span class="monster-name-color">${enemy.name}</span> ( ${enemyCoinHtml} )`);
    });

    if (restingParty.length === 0) {
        logMessage("キャンプに誰もいないよ！");
        logMessage("なんとか逃げ切れたけど、全ての食料を置いてきちゃった。");
        game.food = 0;
        logMessage(`現在の食料: ${game.food}`);
        updateUI(game, coinAttributesMap, [], null, false, null, GAME_CONSTANTS.MAX_PARTY_SIZE);
        const actionArea = document.getElementById('action-area');
        if (actionArea) actionArea.innerHTML = '<button data-value="continue">次へ</button>';
        await waitForButtonClick();
        // スタイルを解除
        game.party.forEach(monster => {
            const li = partyList ? partyList.querySelector(`li[data-index="${game.party.indexOf(monster)}"]`) : null;
            if (li) {
                li.classList.remove('resting-in-raid');
            }
        });
        return true; // 食料ゼロでゲームオーバーは後続のフェーズで判定
    }

    const actionArea = document.getElementById('action-area');

    // 戦闘ロジックを呼び出す
    const battleResult = await conductFight(game, restingParty, enemies, random, currentArea, false);

    if (!battleResult.won) {
        logMessage("なんとか逃げ切れたけど、全ての食料を置いてきちゃった。");
        game.food = 0;
        logMessage(`現在の食料: ${game.food}`);
        updateUI(game, coinAttributesMap, [], null, false, null, GAME_CONSTANTS.MAX_PARTY_SIZE);
        clearActionArea();
        actionArea.innerHTML = '<button data-value="continue">次へ</button>';
        await waitForButtonClick();
        // スタイルを解除
        game.party.forEach(monster => {
            const li = partyList ? partyList.querySelector(`li[data-index="${game.party.indexOf(monster)}"]`) : null;
            if (li) {
                li.classList.remove('resting-in-raid');
            }
        });
    } else {
        // 敵モン娘のcoinAttributesに'enemy'が含まれていない、かつ特殊襲撃ではない場合のみ仲間に加える候補とする
        const recruitableEnemies = enemies.filter(enemy =>
            enemy && enemy.coinAttributes && !enemy.coinAttributes.includes('enemy') && eventType !== 'special'
        );

        if (recruitableEnemies.length > 0) {
            logMessage("倒した敵を勧誘する？ (ミルク1杯消費)");
            clearActionArea();
            recruitableEnemies.forEach((enemy, index) => {
                const button = document.createElement('button');
                button.className = 'choice-button';
                // モン娘全体のツールチップは残し、個々の硬貨のツールチップを削除
                // getCoinAttributeName を直接使用して、ツールチップ属性なしで硬貨名を表示
                const enemyCoinHtml = enemy.coinAttributes.map(attrId => getCoinAttributeName(attrId, coinAttributesMap)).join(' ');
                button.innerHTML = `<span class="monster-name-color">${enemy.name}</span> ( ${enemyCoinHtml} ) を仲間にする`;
                button.dataset.value = index.toString();
                actionArea.appendChild(button);

                // モン娘全体のツールチップイベントリスナーをボタンに直接付与
                button.addEventListener('mouseover', (event) => showMonsterTooltip(enemy, event.currentTarget, coinAttributesMap));
                button.addEventListener('mouseout', hideMonsterTooltip);

            });
            const skipButton = document.createElement('button');
            skipButton.innerText = "スキップ";
            skipButton.dataset.value = 'skip';
            actionArea.appendChild(skipButton);

            const choice = await waitForButtonClick();
            if (choice === 'skip') {
                logMessage("敵を勧誘せずに先に進むよ。");
            } else {
                const chosenEnemyIndex = parseInt(choice);
                if (chosenEnemyIndex >= 0 && chosenEnemyIndex < recruitableEnemies.length) {
                    const chosenEnemy = recruitableEnemies[chosenEnemyIndex];
                    if (game.milk > 0) {
                        // 同じ種族のモン娘を仲間にできるように、この制約を削除
                        game.milk--; // ミルクを1消費
                        logMessage(`おじさんのミルクで <span class="monster-name-color">${chosenEnemy.name}</span> が仲間に加わったよ！`);
                        // 戦闘勝利後はMAX_PARTY_SIZEの制限なく加入可能
                        game.party.push(chosenEnemy);
                        updateUI(game, coinAttributesMap, [], null, false, null, GAME_CONSTANTS.MAX_PARTY_SIZE); // 維持費更新のためUI更新
                    } else {
                        logMessage("おじさんのミルクが空っぽだから、そのモン娘は仲間にできないね。");
                    }
                } else {
                    logMessage("無効な選択です。");
                }
            }
        }
        clearActionArea();
        // スタイルを解除
        game.party.forEach(monster => {
            const li = partyList ? partyList.querySelector(`li[data-index="${game.party.indexOf(monster)}"]`) : null;
            if (li) {
                li.classList.remove('resting-in-raid');
            }
        });
    }

    return true; // 食料ゼロでゲームオーバーは後続のフェーズで判定
}


/**
 * 10日目のボス戦を処理する。
 * ガーゴイルと連続で戦闘する。
 * @param {object} currentArea - 現在の地形情報 (戦闘のコイントスに影響)。
 * @returns {Promise<boolean>} 全てのボスに勝利した場合true、敗北した場合false。
*/
async function handleBossBattle(currentArea) {
    logMessage(`<br/>`);
    logMessage("\n--- ボス戦開始！ ---");
    game.currentPhase = 'bossBattle';

    // monsterTemplatesからガーゴイルのテンプレートを取得
    const gargoyleTemplate = monsterTemplates.find(t => t.name === 'ガーゴイル');

    // 3体のガーゴイルを生成。個別のインスタンスとして保持
    const allGargoyles = [
        new Monster('ガーゴイルA', [...gargoyleTemplate.coins], gargoyleTemplate.upkeep),
        new Monster('ガーゴイルB', [...gargoyleTemplate.coins], gargoyleTemplate.upkeep),
        new Monster('ガーゴイルC', [...gargoyleTemplate.coins], gargoyleTemplate.upkeep)
    ];

    // 全てのパーティメンバーのhasBeenSentToBattleフラグをリセット
    game.party.forEach(monster => monster.hasBeenSentToBattle = false);

    for (let i = 0; i < allGargoyles.length; i++) {
        // 現在の戦闘に登場するガーゴイルの数を動的に決定 (1体目:1体, 2体目:2体, 3体目:3体)
        const enemiesForThisFight = allGargoyles.slice(0, i + 1);

        logMessage(`\n--- 第${i + 1}戦: ${enemiesForThisFight.length}体のガーゴイルとの戦闘 ---`);

        // 戦闘ロジックを呼び出す
        // gameオブジェクトを渡す
        const battleResult = await conductFight(game, game.party, enemiesForThisFight, random, currentArea, true);

        if (!battleResult.won) {
            return false; // ゲームオーバー
        } else {
            // 敵表示をクリア
            updateUI(game, coinAttributesMap, [], game.currentArea, false, null, GAME_CONSTANTS.MAX_PARTY_SIZE);
        }
    }
    return true; // 全てのガーゴイルに勝利
}


/**
 * ５：野営フェーズ。
 * 探索で食料を獲得し、維持費と戦闘手当を消費する。食料が尽きた場合の処理も含む。
 * @param {Monster[]} expeditionParty - 探索に派遣されたモン娘の配列。
 * @param {object} currentArea - 現在の地形情報。
 * @returns {Promise<boolean|string>} 野営成功でtrue、ゲームオーバーでfalse、ミルク消費で'recovered'。
 */
async function conductCamp(expeditionParty, currentArea) {
    logMessage(`<br/>`);
    logMessage(`\n<div id="game-messages-phase">--- 野営フェーズ ---</div>`);
    game.currentPhase = 'campPhase';

    // 野営の効果音を再生
    if (soundPaths && soundPaths["野営"]) {
        playSfx(soundPaths["野営"]).catch(e => console.error("野営の効果音の再生に失敗しました:", e));
    }

    let foodGained = 0;
    expeditionParty.forEach(monster => {
        let monsterFoodContribution = monster.totalCoins * GAME_CONSTANTS.FOOD_PER_COIN;

        // 漁の硬貨を水の硬貨として扱うための調整
        const effectiveAreaCoinAttributesForFood = [...currentArea.coinAttributes];

        monster.coinAttributes.forEach(monsterCoinAttr => {
            let currentMonsterCoinAttr = monsterCoinAttr;
            if (monsterCoinAttr === 'fishing' && effectiveAreaCoinAttributesForFood.includes('water')) {
                currentMonsterCoinAttr = 'water'; // 擬似的に「水」として扱う
            }

            let matchCount = 0;
            effectiveAreaCoinAttributesForFood.forEach(areaCoinAttr => {
                if (areaCoinAttr === currentMonsterCoinAttr) {
                    matchCount++;
                }
            });

            if (matchCount > 0) {
                monsterFoodContribution += (GAME_CONSTANTS.FOOD_PER_COIN * GAME_CONSTANTS.FOOD_BONUS_MATCH) * matchCount;
            }
        });

        foodGained += monsterFoodContribution;
    });
    game.food += foodGained;
    logMessage(`探索で食料を${foodGained}獲得したよ。現在の食料: ${game.food}`);
    updateUI(game, coinAttributesMap, [], null, false, null, GAME_CONSTANTS.MAX_PARTY_SIZE);

    // 維持費の計算
    game.upkeep = game.party.reduce((total, monster) => total + monster.upkeep, 0);
    const totalFoodConsumption = game.upkeep + game.battleAllowance;

    logMessage(`仲間の維持費: ${game.upkeep}`);
    logMessage(`総戦闘手当: ${game.battleAllowance}`);
    logMessage(`合計食料消費量: ${totalFoodConsumption}`);

    game.food -= totalFoodConsumption;
    game.battleAllowance = 0; // 戦闘手当をリセット

    logMessage(`残り食料: ${game.food}`);

    // 珍味獲得の判定をここに追加
    let delicacyFound = false;
    for (const member of game.expeditionParty) { // 派遣されたモン娘のみを対象にする
        for (const delicacy of delicacies) {
            // 探索モン娘の属性と珍味のexplorerCoinAttributesに共通の属性があるかチェック
            const monsterAttributeMatch = delicacy.explorerCoinAttributes.every(attr => member.coinAttributes.includes(attr));
            // 探索エリアの属性と珍味のareaCoinAttributesに共通の属性があるかチェック
            const areaAttributeMatch = delicacy.areaCoinAttributes.every(attr => currentArea.coinAttributes.includes(attr));

            if (monsterAttributeMatch && areaAttributeMatch) {
                if (random() < GAME_CONSTANTS.DELICACY_DROP_CHANCE) {
                    game.milk += delicacy.milkConversion;
                    logMessage(`${member.name}が${delicacy.name}を見つけてきたよ！　栄養満点だからおじさんが食べなよ。`);
                    delicacyFound = true;
                    updateUI(game, coinAttributesMap, [], currentArea, false, null, GAME_CONSTANTS.MAX_PARTY_SIZE); // UI更新
                    break; // この珍味は獲得したので次のモン娘へ
                }
            }
        }
        if (delicacyFound) {
            delicacyFound = false; // 次のモン娘のためにリセット
        }
    }

    updateUI(game, coinAttributesMap, [], null, false, null, GAME_CONSTANTS.MAX_PARTY_SIZE);

    // 食料が尽きた際の救済処置
    if (game.food < 0) {
        const milkCost = game.party.length;
        if (game.milk >= milkCost) {
            game.milk -= milkCost;
            game.food = 0; // 食料を最低値に回復
            logMessage(`食料が尽きたけど、仲間モン娘 ${milkCost} 人にミルクを支払って冒険を続行だ！`);
            logMessage(`現在のミルク: ${game.milk}, 現在の食料: ${game.food}`);
            updateUI(game, coinAttributesMap, [], null, false, null, GAME_CONSTANTS.MAX_PARTY_SIZE);
            const actionArea = document.getElementById('action-area');
            if (actionArea) actionArea.innerHTML = '<button data-value="continue-after-milk">続行</button>';
            await waitForButtonClick();
            return 'recovered'; // ゲーム続行
        } else {
            logMessage("食料もミルクも尽きちゃった。");
            const actionArea = document.getElementById('action-area');
            if (actionArea) actionArea.innerHTML = '<button data-value="gameover-confirm">あらら</button>';
            await waitForButtonClick();
            return false; // ゲームオーバー
        }
    }
    return true; // 通常の野営成功（日数は進む）
}

/**
 * 仲間勧誘イベントを処理する。
 * 地形の属性に合うモン娘を提示し、ミルクを消費して仲間にするか選択させる。
 * 硬貨の枚数が少ないモン娘ほど出やすく、硬貨の枚数が多いモン娘ほど出にくくする。
 * @param {object} currentArea - 現在の地形情報。
 * @returns {Promise<void>}
 */
async function handleRecruitmentEvent(currentArea) {
    clearActionArea();

    let monsterToOffer = null;

    // スペシャルチャンスの発生を判定する
    const specialChance = random() < GAME_CONSTANTS.RECRUIT_EVENT_CHANCE_OF_SPECIAL;

    if (!specialChance) {
        // 地形の属性に合うモン娘を優先して探す
        let potentialTemplates = monsterTemplates.filter(template =>
            template.coins.some(coin => currentArea.coinAttributes.includes(coin)) && !template.coins.includes('enemy')
        );

        // 適切なモン娘が見つからなかった場合、敵属性を持たない全てのモン娘を対象にする
        if (potentialTemplates.length === 0) {
            potentialTemplates = monsterTemplates.filter(template => !template.coins.includes('enemy'));
            if (potentialTemplates.length > 0) {
                logMessage("この地形には適したモン娘がいませんでしたが、別のモン娘が現れました。");
            }
        }

        if (potentialTemplates.length > 0) {
            // 硬貨の枚数に応じた重み付けを適用して1体選択
            // getUniqueRandomMonsters の第3引数を true (useWeighting) に設定
            const chosenMonsters = getUniqueRandomMonsters(1, potentialTemplates, true, 0, Infinity, random);
            if (chosenMonsters.length > 0) {
                monsterToOffer = chosenMonsters[0];
            }
        }

        if (!monsterToOffer) {
            logMessage("残念ながら、仲間になってくれるモン娘はいませんでした...");
            const actionArea = document.getElementById('action-area');
            if (actionArea) actionArea.innerHTML = '<button data-value="continue">次へ</button>';
            await waitForButtonClick();
            return;
        }
    }
    else {
        // 敵属性以外の全てのモン娘を対象とする
        let potentialTemplates = monsterTemplates.filter(template => !template.coins.includes('enemy'));
        monsterToOffer = getUniqueRandomMonsters(1, potentialTemplates, false, 0, Infinity, random)[0];
    }

    const monsterCoinHtml = monsterToOffer.coinAttributes.map(attrId => createCoinTooltipHtml(attrId, coinAttributesMap)).join(' ');

    logMessage(`<span class="monster-name-color">${monsterToOffer.name}</span> が仲間になりたそうにこちらを見ているよ！<br>
                ( ${monsterCoinHtml} )<br>
                おじさんのミルクで彼女を勧誘しちゃう？ (現在のミルク: ${game.milk}杯)`);

    const actionArea = document.getElementById('action-area');
    const recruitButton = document.createElement('button');
    recruitButton.innerText = `仲間にする (ミルク1杯)`;
    recruitButton.dataset.value = 'recruit';
    actionArea.appendChild(recruitButton);

    const declineButton = document.createElement('button');
    declineButton.innerText = `断る`;
    declineButton.dataset.value = 'decline';
    actionArea.appendChild(declineButton);

    const choice = await waitForButtonClick();

    if (choice === 'recruit') {
        if (game.milk >= 1) {
            // 加入の効果音を再生
            if (soundPaths && soundPaths["加入"]) {
                playSfx(soundPaths["加入"]).catch(e => console.error("加入の効果音の再生に失敗しました:", e));
            }

            game.milk--;
            game.party.push(monsterToOffer);
            logMessage(`<span class="monster-name-color">${monsterToOffer.name}</span> が仲間になったよ！`);
            logMessage(`ミルクを1杯消費。残りミルク: ${game.milk}杯`);
            updateUI(game, coinAttributesMap, [], null, false, null, GAME_CONSTANTS.MAX_PARTY_SIZE);
        } else {
            // NGの効果音を再生
            if (soundPaths && soundPaths["NG"]) {
                playSfx(soundPaths["NG"]).catch(e => console.error("NGの効果音の再生に失敗しました:", e));
            }

            logMessage("おじさんのミルクが空っぽだから、彼女を仲間にできなかったよ。");
        }
    } else {
        logMessage("ごめんねー！");
    }
    clearActionArea();
}

/**
 * 神の寵愛イベントを処理する。
 * enemy属性を除く全ての硬貨の中からランダムに1つを取得し、game.favourに追加する。
 * @returns {Promise<void>}
 */
async function handleFavourEvent() {
    clearActionArea();

    // enemy属性を除く全ての硬貨をフィルタリング
    const availableCoins = coinAttributesMap.filter(coin => coin.id !== 'enemy');

    if (availableCoins.length > 0) {
        // ランダムに1つ選択
        const chosenCoin = availableCoins[Math.floor(random() * availableCoins.length)];
        game.favour.push(chosenCoin.id); // game.favour に硬貨のIDを追加

        const coinHtml = createCoinTooltipHtml(chosenCoin.id, coinAttributesMap);
        logMessage(`神様から ${coinHtml} の硬貨を授かったよ！`);
        updateUI(game, coinAttributesMap, [], null, false, null, GAME_CONSTANTS.MAX_PARTY_SIZE); // UIを更新して表示を反映
    } else {
        logMessage("硬貨は貰えなかったよ。");
    }

    const actionArea = document.getElementById('action-area');
    const continueButton = document.createElement('button');
    continueButton.innerText = "次へ";
    continueButton.dataset.value = 'continue';
    actionArea.appendChild(continueButton);
    await waitForButtonClick();
    clearActionArea();
}


/**
 * ゲームを終了する際の処理。
 * @param {boolean} isCleared - ゲームがクリアされたかどうか。
 */
function endGame(isCleared) {
    stopMusic(); // ゲーム終了時に音楽を停止
    clearActionArea();
    toggleInitialSetupArea(true); // 初期セットアップエリアを再表示
    updateUI(game, coinAttributesMap, [], null, false, null, GAME_CONSTANTS.MAX_PARTY_SIZE); // UIを初期状態にリセット

    if (isCleared) {
        logMessage("おめでとうございます！王子を救出しました！");
        logMessage("王様から100億円の報奨金が贈られます！");
    } else {
        logMessage("おじさんはモン娘達に食べられてしまいました。");
        logMessage("ハッピーエンド❤");
    }
    const actionArea = document.getElementById('action-area');
    if (actionArea) actionArea.innerHTML = '<button data-value="restart">ゲームを最初からやり直す</button>';
    waitForButtonClick().then(action => {
        if (action === 'restart') {
            resetGameToInitialState();
        }
    });
}

/**
 * ラスボス戦を開始する。
 * プレイヤーに3つの地形から選択させ、選択された地形に応じて3連戦を行う。
 * @returns {Promise<void>} ラスボス戦が終了したときに解決するPromise。
 */
async function startFinalBossBattle() {
    logMessage("連邦の中枢に到達！　ラスボスは何処！？");
    game.currentPhase = 'finalBossAreaSelection';

    // 硬貨属性が8つある地形をフィルタリング (mansion, fortress, swampなど)
    const eligibleAreas = areaTypes.filter(area => area.coinAttributes && area.coinAttributes.length === 8);
    const mansionArea = eligibleAreas.find(area => area.id === 'mansion');
    let otherEligibleAreas = eligibleAreas.filter(area => area.id !== 'mansion');

    // 選択肢となる3つの地形を決定
    let chosenAreas = [];
    if (mansionArea) {
        chosenAreas.push(mansionArea); // 館を固定で追加
    }
    // 残りの2つをランダムに選択（重複なし）
    while (chosenAreas.length < 3 && otherEligibleAreas.length > 0) {
        const randomIndex = Math.floor(random() * otherEligibleAreas.length);
        const selectedArea = otherEligibleAreas.splice(randomIndex, 1)[0];
        chosenAreas.push(selectedArea);
    }
    // 選択肢をシャッフル
    chosenAreas.sort(() => 0.5 - random());

    // UIに地形選択ボタンを表示
    const areaButtons = chosenAreas.map(area => {
        // ここを修正: createCoinTooltipHtml の代わりに getCoinAttributeName を使用
        const areaCoinHtml = area.coinAttributes.map(attrId => getCoinAttributeName(attrId, coinAttributesMap)).join(' ');
        return {
            id: area.id,
            text: `${area.name} (${areaCoinHtml})`, // innerHTML用
            className: 'choice-button' // スタイルを適用
        };
    });
    createButtons(areaButtons);

    const chosenAreaId = await waitForButtonClick();
    const finalBossArea = areaTypes.find(area => area.id === chosenAreaId);

    logMessage(`敵は${finalBossArea.name}にあり！`);
    game.currentArea = finalBossArea; // 現在の地形を設定
    updateUI(game, coinAttributesMap, [], game.currentArea, false, null, GAME_CONSTANTS.MAX_PARTY_SIZE);

    const encounters = FINAL_BOSS_ENCOUNTERS[finalBossArea.id];

    if (!encounters || encounters.length === 0) {
        logMessage("この地形のラスボスデータがありません。ゲームオーバー。");
        endGame(false); // ゲームオーバー
        return;
    }

    // 戦闘の前に、パーティメンバーのhasBeenSentToBattleフラグをリセット
    game.party.forEach(monster => monster.hasBeenSentToBattle = false);

    // 3連戦のループ
    for (let i = 0; i < encounters.length; i++) {
        logMessage(`\nラスボス戦：第${i + 1}戦目開始！`);
        const enemiesToGenerateData = encounters[i];
        const finalBossEnemies = [];

        for (const enemyData of enemiesToGenerateData) {
            const template = monsterTemplates.find(mt => mt.name === enemyData.name);
            if (template) {
                for (let k = 0; k < enemyData.count; k++) {
                    // ラスボスはenemy属性を持つため、そのまま生成
                    finalBossEnemies.push(new Monster(template.name, [...template.coins], template.upkeep));
                }
            } else {
                logMessage(`エラー: ラスボス「${enemyData.name}」のモン娘テンプレートが見つかりません。ゲームオーバー。`);
                endGame(false); // ゲームオーバー
                return;
            }
        }

        game.currentEnemies = finalBossEnemies; // 現在の敵を設定 (UI更新用)
        updateUI(game, coinAttributesMap, game.currentEnemies, game.currentArea, false, null, GAME_CONSTANTS.MAX_PARTY_SIZE);

        // 戦闘ロジックを呼び出す
        const battleResult = await conductFight(game, game.party, game.currentEnemies, random, game.currentArea, true); // trueはボス戦フラグ

        if (!battleResult.won) {
            endGame(false); // ゲームオーバー
            return;
        } else {
            // 敵表示をクリア
            updateUI(game, coinAttributesMap, [], game.currentArea, false, null, GAME_CONSTANTS.MAX_PARTY_SIZE);
        }
    }

    logMessage("全てのラスボスを打ち破り、王子を救出しました！");
    endGame(true); // ゲームクリア
}


/**
 * ゲームのメインループ。
 * 各フェーズを順番に実行し、ゲームの終了条件をチェックする。
 */
async function gameLoop() {
    // ゲーム開始時に初期セットアップエリアを非表示にし、フェーズを更新
    game.currentPhase = 'joinPhase';
    toggleInitialSetupArea(false); // 初期セットアップエリアを非表示にする
    clearActionArea();
    updateUI(game, coinAttributesMap, [], null, false, null, GAME_CONSTANTS.MAX_PARTY_SIZE); // UIを更新して、初期セットアップエリアが非表示になったことを反映

    await offerMonstersToJoin();
    // 初期加入フェーズで食料が尽きることは通常ないが、念のためチェック
    if (game.food < 0) {
        resetGameToInitialState();
        return;
    }

    while (game.days < GAME_CONSTANTS.MAX_DAYS) { // 修正: 20日目になったらラスボス戦へ
        game.days++;

        // 11日目を迎えたらレベル2の音楽を再生
        if (game.days === 11) {
            playMusic('レベル2');
        }

        logMessage(`<br/>`);
        logMessage(`<div id="game-messages-days">\n=== ${game.days}日目 ===</div>`);
        document.getElementById('days-display').innerText = game.days;

        let currentArea;
        let expeditionParty;
        let restingParty;
        let raidResult;

        // 20日目の開始時にラスボス戦を開始
        if (game.days === GAME_CONSTANTS.MAX_DAYS) { // 20日目になったらすぐにラスボス戦
            // 警告の効果音を再生
            if (soundPaths && soundPaths["警告"]) {
                playSfx(soundPaths["警告"]).catch(e => console.error("警告の効果音の再生に失敗しました:", e));
            }

            await startFinalBossBattle();
            return; // ラスボス戦終了後はゲームループを抜ける

        } else if (game.days === GAME_CONSTANTS.BOSS_DAYS) {
            // 警告の効果音を再生
            if (soundPaths && soundPaths["警告"]) {
                playSfx(soundPaths["警告"]).catch(e => console.error("警告の効果音の再生に失敗しました:", e));
            }

            logMessage("\n--- 関所の番人、現る！ ---");
            game.currentPhase = 'areaSelection'; // 地形選択フェーズ
            currentArea = await selectExplorationArea(); // ボス戦でも地形選択は必要
            if (game.food < 0) break;

            const bossBattleSuccess = await handleBossBattle(currentArea); // currentAreaを渡す
            if (!bossBattleSuccess) {
                endGame(false);
                return; // ゲームオーバー
            } else {
                // ボス戦勝利時の報酬
                game.food += 30;
                logMessage(`食料を30獲得したよ！　現在の食料: ${game.food}`);
                updateUI(game, coinAttributesMap, [], null, false, null, GAME_CONSTANTS.MAX_PARTY_SIZE);
                // ボス戦後は全員待機状態に戻る
                expeditionParty = [];
                restingParty = game.party;
            }
        } else {
            // 通常のゲームフロー

            // 夜明けの効果音を再生
            if (soundPaths && soundPaths["夜明け"]) {
                playSfx(soundPaths["夜明け"]).catch(e => console.error("夜明けの効果音の再生に失敗しました:", e));
            }

            currentArea = await selectExplorationArea();
            if (game.food < 0) break; // エリア選択後に食料が尽きることはないが、念のため

            const parties = await sendMonstersOnExpedition(currentArea);
            expeditionParty = parties.expeditionParty;
            restingParty = parties.restingParty;
            if (game.food < 0) break; // 派遣選択後に食料が尽きることはないが、念のため

            raidResult = await handleRaid(restingParty, currentArea);
            if (!raidResult) {
                break; // 襲撃でゲームオーバーになった場合
            }
        }

        // 野営フェーズに入る前にワンクッション置く
        game.currentPhase = 'campPreparation';
        const actionArea = document.getElementById('action-area');
        if (actionArea) {
            actionArea.innerHTML = '<button id="conduct-camp-button" data-value="conduct-camp">野営する</button>';
        }
        await waitForButtonClick(); // ボタンがクリックされるまで待機

        let campResult = await conductCamp(expeditionParty, currentArea);
        if (!campResult) { // campResultがfalseの場合（ゲームオーバー）
            break;
        }

        if (campResult === 'recovered') {
            logMessage("おじさんのこくまろミルクのパワーで冒険を続行するよ！");
        }

        updateUI(game, coinAttributesMap, [], null, false, null, GAME_CONSTANTS.MAX_PARTY_SIZE); // 1日の終了後、UIを通常状態に戻すためにもう一度呼び出し

        game.milk++; // 日ごとにミルクを1杯加算

        if (game.days < GAME_CONSTANTS.MAX_DAYS && game.food >= 0) { // MAX_DAYSの前日までは次の日へ進むボタン
            const actionArea = document.getElementById('action-area');
            if (actionArea) actionArea.innerHTML = '<button id="next-day-button" data-value="next-day">次の日へ</button>';
            await waitForButtonClick();
        }
    }

    // ゲームループ終了後の最終判定 (食料が尽きたか)
    if (game.food < 0) {
        endGame(false); // 食料切れでゲームオーバー
    }
    // ここで直接resetGameToInitialStateを呼ばない。endGameが呼ぶか、ユーザーの「やり直す」ボタンが呼ぶ。
}

/**
 * ゲームの状態とUIを初期状態に戻す関数。
 */
function resetGameToInitialState() {
    stopMusic(); // ゲームリセット時に音楽を停止
    game.food = GAME_CONSTANTS.INITIAL_FOOD;
    game.milk = GAME_CONSTANTS.INITIAL_MILK;
    game.days = 0;
    game.party = [];
    game.battleAllowance = 0;
    game.currentSeed = '';
    game.currentArea = null;
    game.estimatedFoodGain = 0;
    game.upkeep = 0;
    game.currentPhase = 'initial';
    game.favour = []; // 神の寵愛もリセット

    // パーティメンバーのhasBeenSentToBattleフラグをリセット
    game.party.forEach(monster => monster.hasBeenSentToBattle = false);

    const gameMessages = document.getElementById('game-messages');
    if (gameMessages) gameMessages.innerHTML = '<p>冒険に出発だ！</p>';
    clearActionArea();
    toggleInitialSetupArea(true);
    updateUI(game, coinAttributesMap, [], null, false, null, GAME_CONSTANTS.MAX_PARTY_SIZE); // UIを通常状態に戻す
}

/**
 * 硬貨属性のIDから、ツールチップ表示用のHTML文字列を生成する。
 * @param {string} coinId - 硬貨属性のID (e.g., 'plain', 'magic')。
 * @param {object[]} map - 硬貨属性の定義マップ。
 * @returns {string} ツールチップ表示用のHTML文字列。
 */
function createCoinTooltipHtml(coinId, map) {
    // getCoinAttributeName 関数を使って、スタイルが適用されたHTMLを生成
    const styledCoinHtml = getCoinAttributeName(coinId, map);

    // 生成されたHTMLをツールチップのターゲットとしてラップ
    // onmouseoverとonmouseout属性を再度追加
    return `<span class="coin-tooltip-target" data-coin-id="${coinId}" onmouseover="window.showCoinTooltip(event, '${coinId}', window.coinAttributesMap)" onmouseout="window.hideCoinTooltip()">${styledCoinHtml}</span>`;
}
// createCoinTooltipHtml をグローバルスコープに公開
window.createCoinTooltipHtml = createCoinTooltipHtml;


// DOMContentLoaded イベントで要素を取得し、イベントリスナーを設定
document.addEventListener('DOMContentLoaded', async () => { // asyncを追加
    // DOM要素の取得 - ここでconstで宣言し、直接使用する
    const startGameButton = document.getElementById('start-game-button');
    const seedInput = document.getElementById('seed-input');
    const gameMessages = document.getElementById('game-messages');

    // 音楽プレイヤーの初期化
    await initMusicPlayer();

    // soundPaths.json から効果音のパスを読み込む
    try {
        const response = await fetch('./soundPaths.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        soundPaths = await response.json();
    } catch (error) {
        console.error("soundPaths.json の読み込み中にエラーが発生しました:", error);
        // 効果音の読み込みに失敗してもアニメーションは続行
    }

    // ゲーム開始ボタンのイベントリスナーをここで設定
    if (startGameButton) {
        startGameButton.addEventListener('click', () => {
            console.log("ゲーム開始ボタンがクリックされました。"); // デバッグ用ログ
            let seedValue = seedInput.value.trim();
            if (seedValue === '') {
                seedValue = Date.now().toString();
                console.log(`startGameButton: Seed input was empty, using Date.now() as seed: ${seedValue}`); // デバッグログ
            } else {
                console.log(`startGameButton: Using provided seed: ${seedValue}`); // デバッグログ
            }
            game.currentSeed = seedValue;
            random = mulberry32(seedValue); // 乱数生成器を初期化

            game.food = GAME_CONSTANTS.INITIAL_FOOD; // 初期食料
            game.milk = GAME_CONSTANTS.INITIAL_MILK; // 初期ミルク
            game.days = 0;
            game.party = [];
            game.battleAllowance = 0;
            game.currentArea = null;
            game.estimatedFoodGain = 0; // 予想食料獲得量もリセット
            game.upkeep = 0; // 維持費もリセット
            game.currentPhase = 'initial'; // フェーズを初期状態に戻す
            game.favour = []; // 神の寵愛もリセット

            // パーティメンバーのhasBeenSentToBattleフラグを初期化（ゲーム開始時にもリセット）
            game.party.forEach(monster => monster.hasBeenSentToBattle = false);


            if (gameMessages) {
                gameMessages.innerHTML = ''; // メッセージエリアをクリア
                logMessage("過酷な旅路が始まるよ！");
            } else {
                console.error("DOM element 'game-messages' not found at game start.");
            }

            updateUI(game, coinAttributesMap, [], null, false, null, GAME_CONSTANTS.MAX_PARTY_SIZE); // UIを通常状態に戻す

            playMusic('レベル1'); // ゲーム開始時にレベル1の音楽を再生

            gameLoop();
        });
    } else {
        console.error("DOM要素 'start-game-button' が見つかりませんでした。ゲームを開始できません。");
    }

    // 初期UI表示
    updateUI(game, coinAttributesMap, [], null, false, null, GAME_CONSTANTS.MAX_PARTY_SIZE);
});
