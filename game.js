// game.js

import { coinAttributesMap, monsterTemplates, areaTypes, GAME_CONSTANTS, delicacies, FINAL_BOSS_ENCOUNTERS, life, dailyCharange } from './data.js';
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
    showLifeTooltip,
    hideLifeTooltip,
    toggleCoinDisplay,
    createCoinTooltipHtml,
    showCoinTooltip,
    setImagePaths,
    createButtons,
    getGroupedCoinDisplay,
    showDailyChallengeTooltip,
    hideDailyChallengeTooltip
} from './uiManager.js';
import { conductFight } from './battle.js';
import { updateEstimatedFoodGain, calculateEstimatedMilkGain } from './food.js'; // calculateEstimatedMilkGainをインポート
import { initMusicPlayer, playMusic, playSfx, stopMusic, setAudioBuffers as setMusicAudioBuffers } from './musicManager.js';
import { displayGuideMessage } from './helpUI.js';
import { showSpeechBubble } from './speechBubbleManager.js';
import { preloadAllAssets } from './preloadManager.js';
import { initializeMonsterGuide } from './guideUI.js'; // guideUI.jsからインポート

// coinAttributesMapをグローバルスコープで利用可能にする
// HTMLのonmouseover属性などから直接呼び出すため
window.coinAttributesMap = coinAttributesMap;

// game.js内でグローバルにアクセスできるように、uiManagerの関数をwindowオブジェクトに割り当て
// HTMLのonmouseover属性などから直接呼び出すため
window.showCoinTooltip = (event, coinId, map, countByMonsterFlag) => { // countByMonsterFlagを受け取るように変更
    // uiManager.js からインポートされた showCoinTooltip 関数を呼び出す
    showCoinTooltip(event, coinId, map, game, countByMonsterFlag); // gameオブジェクトとフラグを渡す
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
    food: 0,
    milk: 0,
    days: 0,
    maxDays: 20,
    party: [], // 仲間のモン娘
    currentPhase: 'initial', // 現在のフェーズを管理
    battleAllowance: 0, // 襲撃中に発生した戦闘手当
    currentSeed: '', // 現在使用中のシード値
    currentArea: null, // 現在の地形情報
    upkeep: 0, // 食費
    estimatedFoodGain: 0, // 予想食料獲得量
    estimatedMilkGain: 0, // 予想ミルク獲得量を追加
    expeditionParty: [], // 派遣されるモン娘の配列 (珍味判定用)
    favour: [], // 神の寵愛で得た硬貨の配列
    playerLife: null, // プレイヤーの生い立ち
    coinSizeLimit: 0, // 硬貨枚数の制限
    tradeCountByFood: 0, // 食料の交換回数
    tradeCountByMilk: 0, // ミルクの交換回数
    isDailyChallengeMode: false, // 日替わりチャレンジモードかどうか
    dailyChallenges: [], // 選ばれた日替わりチャレンジ
};
// uiManager.js からアクセスできるように game オブジェクトを window に公開
window.game = game;

let random; // 疑似乱数生成関数
let imagePaths; // 画像パスを保持する変数
let audioBuffers; // プリロードされたオーディオバッファを保持する変数

/**
 * 日付を基にしたシード値を生成する関数。
 * @returns {string} YYYYMMDD形式のシード値。
 */
function getDateSeed() {
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    return `${year}${month}${day}`;
}

/**
 * 日替わりチャレンジを3つ選択する関数。
 * タイプが重複しないように選出する。
 * @param {number} seed - 乱数生成のためのシード値。
 * @returns {Array<Object>} 選ばれた3つの日替わりチャレンジ。
 */
function selectDailyChallenges(seed) {
    const dailyChallengeRandom = mulberry32(seed);
    const selectedChallenges = [];
    const usedTypes = new Set();
    const availableChallenges = [...dailyCharange]; // 元の配列を破壊しないようにコピー

    // 3つのチャレンジを選択
    while (selectedChallenges.length < 3 && availableChallenges.length > 0) {
        const randomIndex = Math.floor(dailyChallengeRandom() * availableChallenges.length);
        const challenge = availableChallenges[randomIndex];

        // タイプの重複をチェック
        const hasDuplicateType = challenge.type.some(type => usedTypes.has(type));

        if (!hasDuplicateType) {
            selectedChallenges.push(challenge);
            challenge.type.forEach(type => usedTypes.add(type));
            availableChallenges.splice(randomIndex, 1); // 選んだチャレンジはリストから削除
        } else {
            // 重複するタイプがある場合は、そのチャレンジを一時的に除外して再試行
            // ただし、無限ループにならないように、既に選択済みのチャレンジは除外する
            availableChallenges.splice(randomIndex, 1);
        }
    }

    // もし3つ選べなかった場合（例: タイプがすべて重複している場合など）、残りのチャレンジからランダムに追加する
    while (selectedChallenges.length < 3 && dailyCharange.length > 0) {
        const randomIndex = Math.floor(dailyChallengeRandom() * dailyCharange.length);
        const challenge = dailyCharange[randomIndex];
        if (!selectedChallenges.includes(challenge)) {
            selectedChallenges.push(challenge);
        }
    }

    return selectedChallenges;
}

/**
 * 指定された名前の日替わりチャレンジが現在有効かどうかを判定します。
 * @param {string} challengeName - 検索するチャレンジの名前。
 * @returns {boolean} 指定されたチャレンジが存在すれば true、そうでなければ false。
 */
function isDailyChallengeActive(challengeName) {
    // game.dailyChallenges 配列が存在し、かつ空でないことを確認
    if (game.isDailyChallengeMode && game.dailyChallenges && game.dailyChallenges.length > 0) {
        return game.dailyChallenges.some(challenge => challenge.name === challengeName);
    }
    return false; // 配列が存在しないか空の場合は false を返す
}

/**
 * モン娘加入フェーズで提示するモン娘のテンプレートを生成する。
 * @returns {monsterTemplates[]} モン娘のテンプレート
 */
function selectOfferMonsterTemplates() {
    let monsterList;
    if (isDailyChallengeActive('廃刀令')) {
        monsterList = monsterTemplates.filter(m =>
            !game.party.some(p => p.name === m.name) && !m.coins.includes('enemy') && !m.coins.includes('iron') && !m.coins.includes('bow')
        );
    }
    else if (isDailyChallengeActive('渇水')) {
        monsterList = monsterTemplates.filter(m =>
            !game.party.some(p => p.name === m.name) && !m.coins.includes('enemy') && !m.coins.includes('water') && !m.coins.includes('snow') && !m.coins.includes('fishing')
        );
    }
    else if (isDailyChallengeActive('大原動機')) {
        monsterList = monsterTemplates.filter(m =>
            !game.party.some(p => p.name === m.name) && !m.coins.includes('enemy') && !m.coins.includes('forest')
        );
    }
    else {
        monsterList = monsterTemplates.filter(m =>
            !game.party.some(p => p.name === m.name) && !m.coins.includes('enemy')
        );
    }
    return monsterList;
}

/**
 * １：モン娘の加入フェーズ (ゲーム開始時のみ)。
 * プレイヤーは最大数までモン娘を仲間に加えることができる。
 */
async function offerMonstersToJoin() {
    game.currentPhase = 'joinPhase';
    logMessage(`<br/><div id="game-messages-phase">--- モン娘加入フェーズ ---</div>`);
    displayGuideMessage('モン娘加入フェーズ1人目');
    clearActionArea(); // サブウィンドウを非表示にするために呼び出す

    let initialChoices = [];
    // 現在パーティにいない、かつ'enemy'属性を持たない全てのモン娘テンプレート
    let availableTemplatesForOffer = selectOfferMonsterTemplates();

    // 重み付けを考慮して3体のモン娘を仮選択
    initialChoices = getUniqueRandomMonsters(game, 3, availableTemplatesForOffer, true, 0, game.coinSizeLimit, random);

    // 選択肢をシャッフルして表示順をランダムにする
    initialChoices.sort(() => 0.5 - random());

    // createButtons関数に渡すボタンデータの配列を構築
    const initialButtons = initialChoices.map(monster => ({
        id: monster.name, // data-valueとしてモン娘の名前を使用
        text: `<img src="${imagePaths[monster.name] || './image/default.png'}" alt="${monster.name}" class="monster-image">`,
        className: 'choice-button monster-choice-button',
        monster: monster // ツールチップのためにモンスターオブジェクトを渡す
    }));

    createButtons(initialButtons); // uiManagerのcreateButtonsを使用してボタンを生成

    const initialChoiceName = await waitForButtonClick(); // uiManagerのwaitForButtonClickを使用
    const chosenInitialMonster = initialChoices.find(m => m.name === initialChoiceName);
    game.party.push(chosenInitialMonster);
    game.milk--;

    // 加入の効果音を再生
    showSpeechBubble([chosenInitialMonster], '加入', random);
    playSfx("加入").catch(e => console.error("効果音の再生に失敗しました:", e));
    logMessage(`<span class="monster-name-color">${chosenInitialMonster.name}</span> を雇ったよ！`);
    updateUI(game, coinAttributesMap, [], null, false, null); // UIを更新して表示を反映

    // パーティ人数設定
    let maxPartySize;
    if (isDailyChallengeActive('新婚旅行')) {
        maxPartySize = 1;
    }
    else if (isDailyChallengeActive('両手に花')) {
        maxPartySize = 2;
    }
    else {
        maxPartySize = GAME_CONSTANTS.MAX_PARTY_SIZE;
    }

    // 2回目以降の選択: プレイヤーは最大3体までモン娘を加入可能
    while (game.party.length < maxPartySize) {
        displayGuideMessage('モン娘加入フェーズ2人目以降');

        let subsequentChoices = [];
        let currentAvailableTemplates = selectOfferMonsterTemplates();

        // 重み付けを考慮して3体のモン娘を仮選択
        subsequentChoices = getUniqueRandomMonsters(game, 3, currentAvailableTemplates, true, 0, game.coinSizeLimit, random);

        // 選択肢をシャッフル
        subsequentChoices.sort(() => 0.5 - random());

        const subsequentButtons = subsequentChoices.map(monster => ({
            id: monster.name,
            text: `<img src="${imagePaths[monster.name] || './image/default.png'}" alt="${monster.name}" class="monster-image">`,
            className: 'choice-button monster-choice-button',
            monster: monster // ツールチップのためにモンスターオブジェクトを渡す
        }));

        // MAX_PARTY_SIZE未満の場合のみ「仲間加入を終了」ボタンを追加
        if (game.party.length < GAME_CONSTANTS.MAX_PARTY_SIZE) {
            subsequentButtons.push({ id: 'finish', text: '仲間加入を終了', className: 'action-button' });
        }
        createButtons(subsequentButtons); // uiManagerのcreateButtonsを使用してボタンを生成

        const choiceName = await waitForButtonClick(); // uiManagerのwaitForButtonClickを使用

        if (choiceName === 'finish') {
            displayGuideMessage('モン娘加入打ち切り');
            break; // ループを抜ける
        }

        const chosenMonster = subsequentChoices.find(m => m.name === choiceName);
        game.party.push(chosenMonster);
        game.milk--;
        // 加入の効果音を再生
        showSpeechBubble([chosenMonster], '加入', random);
        playSfx("加入").catch(e => console.error("効果音の再生に失敗しました:", e));
        logMessage(`<span class="monster-name-color">${chosenMonster.name}</span> を雇ったよ！`);
        updateUI(game, coinAttributesMap, [], null, false, null);
    }

    // MAX_PARTY_SIZEになった時点で自動的に終了メッセージを表示
    displayGuideMessage('出発');

    // 最終的な「出発」ボタンを表示
    createButtons([{ id: 'continue', text: '出発', className: 'action-button' }]);
    await waitForButtonClick();

    clearActionArea(); // モン娘加入フェーズ終了時にactionAreaをクリア
}

/**
 * ２：探索エリアの選択フェーズ。
 * 現在の日数に基づいて選択可能な地形をフィルタリングし、プレイヤーに選択させる。
 * @returns {Promise<object>} 選択された地形オブジェクト。
 */
async function selectExplorationArea() {
    game.currentPhase = 'areaSelection';
    logMessage(`<br/><div id="game-messages-phase">--- 探索エリア選択フェーズ ---</div>`);
    displayGuideMessage('探索エリア選択フェーズ'); // ガイドメッセージを表示

    // 現在の日数に基づいて最大属性数を決定
    const maxAttributesAllowed = 2 + Math.floor(game.days / GAME_CONSTANTS.AREA_COIN_SCALING_DAYS);

    // フィルターされた地形リストを作成
    let availableAreas = areaTypes.filter(area => area.coinAttributes.length <= maxAttributesAllowed);

    // 日替わりチャレンジのフィルタリング
    if (isDailyChallengeActive('廃刀令')) {
        availableAreas = availableAreas.filter(area => !area.coinAttributes.includes('iron') && !area.coinAttributes.includes('bow'));
    }
    else if (isDailyChallengeActive('渇水')) {
        availableAreas = availableAreas.filter(area => !area.coinAttributes.includes('water') && !area.coinAttributes.includes('snow') && !area.coinAttributes.includes('fishing'));
    }
    else if (isDailyChallengeActive('大原動機')) {
        availableAreas = availableAreas.filter(area => !area.coinAttributes.includes('forest'));
    }
    else if (isDailyChallengeActive('奈落')) {
        availableAreas = availableAreas.filter(area => area.coinAttributes.includes('dark'));
    }

    const areaChoices = [];
    // フィルターされた地形からランダムに3つ（またはそれ以下）を選択
    const shuffledFilteredAreas = [...availableAreas].sort(() => 0.5 - random());
    let numberOfOptions = GAME_CONSTANTS.SELECT_AREA_SIZE;
    if (game.playerLife.name === '冒険家') numberOfOptions = GAME_CONSTANTS.SELECT_AREA_ADVENTURER;
    if (isDailyChallengeActive('新婚旅行') || isDailyChallengeActive('両手に花') || isDailyChallengeActive('三銃士') || isDailyChallengeActive('縄張り')) numberOfOptions++;
    areaChoices.push(...shuffledFilteredAreas.slice(0, numberOfOptions));

    clearActionArea(); // このフェーズの開始時にactionAreaをクリア
    game.estimatedFoodGain = 0; // エリア選択時は予想食料をリセット
    game.estimatedMilkGain = 0; // エリア選択時は予想ミルクをリセット
    updateUI(game, coinAttributesMap, [], null, false, null); // UIを更新して表示を反映

    const areaButtons = areaChoices.map((area, index) => {
        // 硬貨属性をカウントし、まとめた表示形式にする
        const coinCounts = {};
        area.coinAttributes.forEach(coinId => {
            coinCounts[coinId] = (coinCounts[coinId] || 0) + 1;
        });

        const formattedCoinAttributes = Object.keys(coinCounts).map(coinId => {
            const count = coinCounts[coinId];
            const coinName = getCoinAttributeName(coinId, coinAttributesMap);
            return count > 1 ? `${coinName}×${count}` : coinName;
        }).join(' ');

        return {
            id: area.id,
            text: `${index + 1}: <span class="monster-name-color">${area.name}</span> ${formattedCoinAttributes}`,
            className: 'choice-button',
            area: area // ツールチップのためにエリアオブジェクトを渡す
        };
    });

    createButtons(areaButtons); // uiManagerのcreateButtonsを使用してボタンを生成

    const chosenId = await waitForButtonClick();

    playSfx("選択").catch(e => console.error("効果音の再生に失敗しました:", e));

    const chosenArea = areaTypes.find(area => area.id === chosenId); // IDで検索
    game.currentArea = chosenArea; // ゲームの状態に現在の地形を保存
    updateUI(game, coinAttributesMap, [], null, false, null); // UIを更新して現在の地形を表示
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
    game.currentPhase = 'expeditionSelection';
    logMessage(`<br/><div id="game-messages-phase">--- 探索派遣フェーズ ---</div>`);
    displayGuideMessage('探索派遣フェーズ');

    // ログメッセージの硬貨属性をツールチップ対応にする
    const areaCoinHtml = currentArea.coinAttributes.map(attrId => {
        return createCoinTooltipHtml(attrId, coinAttributesMap);
    }).join(' ');

    logMessage(`地域の属性 (${areaCoinHtml})`);

    const expeditionParty = []; // 派遣されるモン娘
    // restingParty は動的に計算されるため、ここでは初期化しない

    const partyList = document.getElementById('party-list');
    // partyList の要素にクリックイベントリスナーを設定
    // ここで一度全てを更新し、イベントリスナーを付与
    updateUI(game, coinAttributesMap, expeditionParty, currentArea, true, game.party); // 選択フェーズ用のUI更新, 全員選択可能

    // uiManagerのcreateButtonsを使用して「派遣を決定」ボタンを生成
    createButtons([{
        id: 'finish-expedition',
        text: '派遣を決定',
        className: 'action-button'
    }]);

    return new Promise(resolve => {
        const partySelectionListener = (event) => {
            let clickedLi = event.target.closest('li'); // クリックされたli要素、またはその子要素からliを探す
            if (clickedLi && clickedLi.dataset.index !== undefined) {
                const index = parseInt(clickedLi.dataset.index);
                const monster = game.party[index];

                console.log(`Clicked: ${monster.name}`);
                console.log(`Before toggle - expeditionParty: ${expeditionParty.map(m => m.name).join(', ')}`);

                playSfx("選択").catch(e => console.error("効果音の再生に失敗しました:", e));

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
                updateEstimatedFoodGain(game, expeditionParty, currentArea);
                game.estimatedMilkGain = calculateEstimatedMilkGain(game, expeditionParty, currentArea); // 予想ミルク獲得量を計算
                console.log(`After updateEstimatedFoodGain - game.estimatedFoodGain: ${game.estimatedFoodGain}`);
                console.log(`After calculateEstimatedMilkGain - game.estimatedMilkGain: ${game.estimatedMilkGain}`);
                updateUI(game, coinAttributesMap, expeditionParty, currentArea, true, game.party);
            }
        };

        // 「派遣を決定」ボタンのクリックリスナーはwaitForButtonClick()が担当するため、ここでは不要
        // partyList にイベントリスナーを設定
        if (partyList) partyList.addEventListener('click', partySelectionListener);

        // waitForButtonClick() の解決を待つ
        waitForButtonClick().then(chosenId => {
            if (chosenId === 'finish-expedition') {
                // イベントリスナーを削除
                if (partyList) partyList.removeEventListener('click', partySelectionListener);

                // 最終的な待機中のモン娘リストを計算
                const finalRestingParty = game.party.filter(m => !expeditionParty.includes(m));

                logMessage(`探索に派遣されるモン娘: ${expeditionParty.map(m => `<span class="monster-name-color">${m.name}</span>`).join(', ') || 'なし'}`);
                logMessage(`キャンプで待機するモン娘: ${finalRestingParty.map(m => `<span class="monster-name-color">${m.name}</span>`).join(', ')}`);

                // 派遣されたモン娘を保持する
                game.expeditionParty = expeditionParty;

                playSfx("移動").catch(e => console.error("効果音の再生に失敗しました:", e));

                clearActionArea(); // ボタンをクリア
                game.currentPhase = 'idle'; // フェーズをアイドルに戻す
                game.estimatedFoodGain = 0; // 派遣決定後、予想食料獲得量をリセット
                game.estimatedMilkGain = 0; // 派遣決定後、予想ミルク獲得量をリセット
                updateUI(game, coinAttributesMap, [], null, false, null); // UIを通常状態に戻す
                resolve({ expeditionParty, restingParty: finalRestingParty });
            }
        });
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
    game.currentPhase = 'raidPhase';
    logMessage(`<br/><div id="game-messages-phase">--- 襲撃フェーズ ---</div>`);

    const partyList = document.getElementById('party-list');
    // 襲撃フェーズ開始時に待機中のモン娘に特別なスタイルを適用
    restingParty.forEach(monster => {
        const li = partyList ? partyList.querySelector(`li[data-index="${game.party.indexOf(monster)}"]`) : null;
        if (li) {
            li.classList.add('resting-in-raid');
        }
    });

    // 襲撃の種類の設定
    const raidPool = {
        'special': GAME_CONSTANTS.RAID_BASE_SPECIAL_CHANCE,
        'duel': GAME_CONSTANTS.RAID_BASE_DUEL_CHANCE,
        'normal': GAME_CONSTANTS.RAID_BASE_NORMAL_CHANCE,
    }
    const raidTypeRoll = random();
    let raidType = 'none';
    let raidRate = 0;
    for (const prop in raidPool) {
        raidRate += raidPool[prop];
        if (raidTypeRoll < raidRate) {
            raidType = prop;
            break;
        }
    }

    // 1日目の場合、特殊襲撃にする。
    if (game.days === 1) {
        raidType = 'special';
    }

    let enemies = [];
    let numEnemies;
    switch (raidType) {
        case 'special':
            displayGuideMessage('襲撃');
            logMessage("強敵が襲撃してきたよ！");
            numEnemies = 1 + Math.floor((game.days - 1) / GAME_CONSTANTS.ENEMY_COUNT_SCALING_DAYS);
            enemies = generateSpecialRaidEnemies(numEnemies, game.days, random);
            break;

        case 'duel':
            displayGuideMessage('決闘');
            logMessage("決闘を申し込まれたよ！");
            numEnemies = 1;
            enemies = generateAreaSpecificEnemies(numEnemies, currentArea, game.days + 1, random);
            // 全てのパーティメンバーのhasBeenSentToBattleフラグをリセット
            game.party.forEach(monster => monster.hasBeenSentToBattle = false);
            break;

        case 'normal':
            displayGuideMessage('襲撃');
            logMessage("モン娘が襲撃してきたよ！");
            numEnemies = 1 + Math.floor((game.days - 1) / GAME_CONSTANTS.ENEMY_COUNT_SCALING_DAYS);
            enemies = generateAreaSpecificEnemies(numEnemies, currentArea, game.days, random);
            break;

        default:
            displayGuideMessage('平和');
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
        const enemyCoinHtml = getGroupedCoinDisplay(enemy.allCoins, coinAttributesMap);
        logMessage(` - <span class="monster-name-color">${enemy.name}</span>  (${enemy.totalCoins})  ${enemyCoinHtml}`);
    });

    if (restingParty.length === 0) {
        logMessage("キャンプに誰もいないよ！");

        if (raidType === 'duel') {
            playSfx("NG").catch(e => console.error("効果音の再生に失敗しました:", e));

            logMessage("おじさんのミルクが搾り取られちゃった。");
            game.milk--;
            updateUI(game, coinAttributesMap, [], null, false, null);
            // uiManagerのcreateButtons関数を使用してボタンを生成
            createButtons([{ id: 'continue', text: '次へ', className: 'action-button' }]);
            await waitForButtonClick();

            playSfx("選択").catch(e => console.error("効果音の再生に失敗しました:", e));

            // スタイルを解除
            game.party.forEach(monster => {
                const li = partyList ? partyList.querySelector(`li[data-index="${game.party.indexOf(monster)}"]`) : null;
                if (li) {
                    li.classList.remove('resting-in-raid');
                }
            });
        }
        else {
            playSfx("逃走").catch(e => console.error("効果音の再生に失敗しました:", e));
            logMessage("なんとか逃げ切れたけど、全ての食料を置いてきちゃった。");
            game.food = 0;
            updateUI(game, coinAttributesMap, [], null, false, null);
            // uiManagerのcreateButtons関数を使用してボタンを生成
            createButtons([{ id: 'continue', text: '次へ', className: 'action-button' }]);
            await waitForButtonClick();

            playSfx("選択").catch(e => console.error("効果音の再生に失敗しました:", e));

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

    // 戦闘ロジックを呼び出す
    const battleResult = await conductFight(game, restingParty, enemies, random, currentArea, raidType);

    if (!battleResult.won) {
        displayGuideMessage('襲撃敗北');

        if (raidType === 'duel') {
            // 決闘敗北時の処理
            logMessage("決闘に負けて、おじさんのミルクが搾り取られちゃった。");
            game.milk--;
            updateUI(game, coinAttributesMap, [], null, false, null);
        }
        else {
            playSfx("逃走").catch(e => console.error("効果音の再生に失敗しました:", e));
            logMessage("なんとか逃げ切れたけど、全ての食料を置いてきちゃった。");
            game.food = 0;
            updateUI(game, coinAttributesMap, [], null, false, null);
        }
        clearActionArea();
        // uiManagerのcreateButtons関数を使用してボタンを生成
        createButtons([{ id: 'gameover-confirm', text: 'あらら', className: 'action-button' }]);
        await waitForButtonClick();

        playSfx("選択").catch(e => console.error("効果音の再生に失敗しました:", e));

        // スタイルを解除
        game.party.forEach(monster => {
            const li = partyList ? partyList.querySelector(`li[data-index="${game.party.indexOf(monster)}"]`) : null;
            if (li) {
                li.classList.remove('resting-in-raid');
            }
        });
    } else {
        displayGuideMessage('襲撃勝利');

        // 敵モン娘のcoinAttributesに'enemy'が含まれていない、かつ特殊襲撃ではない場合のみ仲間に加える候補とする
        const recruitableEnemies = enemies.filter(enemy =>
            enemy && enemy.coinAttributes && !enemy.coinAttributes.includes('enemy') && raidType !== 'special'
        );

        if (raidType === 'special') {
            // 特殊襲撃勝利時の報酬
            const foodRewards = enemies.reduce((sum, monster) => sum + monster.upkeep, 0) * GAME_CONSTANTS.SPECIAL_RAID_BONUS;
            game.food += foodRewards;
            logMessage(`食料を${foodRewards}獲得したよ！`);
            updateUI(game, coinAttributesMap, [], game.currentArea, false, null);
        }

        if (recruitableEnemies.length > 0 && !isDailyChallengeActive('新婚旅行') && !isDailyChallengeActive('両手に花') && !isDailyChallengeActive('三銃士')) {
            raidType === 'duel' ? displayGuideMessage('決闘後の勧誘') : displayGuideMessage('ミルクで勧誘');

            // uiManagerのcreateButtons関数に渡すボタンデータの配列を構築
            const recruitButtons = recruitableEnemies.map(enemy => ({
                id: enemy.name,
                text: `<img src="${imagePaths[enemy.name] || './image/default.png'}" alt="${enemy.name}" class="monster-image">`,
                className: 'choice-button',
                monster: enemy // ツールチップのためにモンスターオブジェクトを渡す
            }));
            recruitButtons.push({ id: 'skip', text: '断る', className: 'action-button' });

            while (true) {
                createButtons(recruitButtons); // uiManagerのcreateButtonsを使用してボタンを生成
                const choice = await waitForButtonClick();
                if (choice === 'skip') {
                    playSfx("選択").catch(e => console.error("効果音の再生に失敗しました:", e));
                    logMessage("敵を勧誘せずに先に進むよ。");
                    break;
                } else {
                    const chosenEnemy = recruitableEnemies.find(m => m.name === choice);
                    if (game.playerLife.name === '炉裏魂' && chosenEnemy.coinAttributes.length > game.coinSizeLimit) {
                        playSfx("NG").catch(e => console.error("効果音の再生に失敗しました:", e));
                        displayGuideMessage('炉裏魂ゆえに');
                    }
                    else if (isDailyChallengeActive('排他的') && !game.party.some(m => m.name === chosenEnemy.name)) {
                        playSfx("NG").catch(e => console.error("効果音の再生に失敗しました:", e));
                        displayGuideMessage('排他的');
                    }
                    else if (isDailyChallengeActive('高地人') && game.party.some(m => m.name === chosenEnemy.name)) {
                        playSfx("NG").catch(e => console.error("効果音の再生に失敗しました:", e));
                        displayGuideMessage('高地人');
                    }
                    else if (raidType === 'duel') {
                        playSfx("加入").catch(e => console.error("効果音の再生に失敗しました:", e));
                        logMessage(`<span class="monster-name-color">${chosenEnemy.name}</span> が仲間に加わったよ！`);
                        showSpeechBubble([chosenEnemy], '加入', random);
                        // 戦闘勝利後はMAX_PARTY_SIZEの制限なく加入可能
                        game.party.push(chosenEnemy);
                        updateUI(game, coinAttributesMap, [], null, false, null); // 食費更新のためUI更新
                        break;
                    }
                    else if (game.milk > 0) {
                        playSfx("加入").catch(e => console.error("効果音の再生に失敗しました:", e));
                        game.milk--; // ミルクを1消費
                        logMessage(`おじさんのミルクで <span class="monster-name-color">${chosenEnemy.name}</span> が仲間に加わったよ！`);
                        showSpeechBubble([chosenEnemy], '加入', random);
                        // 戦闘勝利後はMAX_PARTY_SIZEの制限なく加入可能
                        game.party.push(chosenEnemy);
                        updateUI(game, coinAttributesMap, [], null, false, null); // 食費更新のためUI更新
                        break;
                    } else {
                        playSfx("NG").catch(e => console.error("効果音の再生に失敗しました:", e));
                        displayGuideMessage('ミルク不足');
                    }
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
 * 帝国の侵略兵器の襲撃イベントを処理する。
 * 仲間の人数に応じて発生確率が変動し、特定の敵「機」の硬貨を持つ敵が襲撃してくる。
 * ボス戦と同様に戦う仲間を選び、選択された仲間は次の戦闘に参加できないようにする。
 * @param {Monster[]} restingParty - キャンプで待機中のモン娘の配列。
 * @param {object} currentArea - 現在の地形情報。
 * @returns {Promise<boolean>} 襲撃を撃退できた場合true、敗北した場合false。
 */
async function handleImperialInvasionRaid(restingParty, currentArea) {
    game.currentPhase = 'imperialRaidPhase';
    logMessage(`<br/><div id="game-messages-phase">--- 帝国の侵略兵器の襲撃 ---</div>`);
    displayGuideMessage('帝国の侵略兵器');

    const partyList = document.getElementById('party-list');

    let battleResult; 
    if (restingParty.length > 0) {
        showSpeechBubble(restingParty, '帝国', random);

        // 襲撃フェーズ開始時に待機中のモン娘に特別なスタイルを適用
        restingParty.forEach(monster => {
            const li = partyList ? partyList.querySelector(`li[data-index="${game.party.indexOf(monster)}"]`) : null;
            if (li) {
                li.classList.add('resting-in-raid');
            }
        });

        let enemies = [];
        // 敵は「機」の硬貨を持つモン娘の中からランダムに抽選
        const imperialWeaponTemplates = monsterTemplates.filter(t => t.coins.includes('machine') && t.coins.includes('enemy'));

        // 敵の数は、通常の襲撃と同様に、日数に応じて加算
        const numEnemies = 1 + Math.floor((game.days - 1) / GAME_CONSTANTS.ENEMY_COUNT_SCALING_DAYS);

        for (let i = 0; i < numEnemies; i++) {
            const randomIndex = Math.floor(random() * imperialWeaponTemplates.length);
            const selectedTemplate = imperialWeaponTemplates[randomIndex];
            const chosenTalker = selectedTemplate.talker && selectedTemplate.talker.length > 0
                ? selectedTemplate.talker[Math.floor(random() * selectedTemplate.talker.length)]
                : 'none';
            const newEnemy = new Monster(selectedTemplate.name, [...selectedTemplate.coins], selectedTemplate.upkeep, false, chosenTalker);

            if (isDailyChallengeActive('新兵器')) {
                if (game.days > GAME_CONSTANTS.BOSS_DAYS) {
                    let maxAdditionalCoins = game.days - GAME_CONSTANTS.BOSS_DAYS + 1;
                    if (isDailyChallengeActive('巨人')) maxAdditionalCoins = Math.floor(maxAdditionalCoins / 2);
                    else maxAdditionalCoins = Math.floor(maxAdditionalCoins / 4);

                    const numAdditionalCoins = Math.floor(random() * (maxAdditionalCoins + 1));

                    for (let j = 0; j < numAdditionalCoins; j++) {
                        if (newEnemy.coinAttributes.length > 0) {
                            const randomCoin = newEnemy.coinAttributes[Math.floor(random() * newEnemy.coinAttributes.length)];
                            newEnemy.additionalCoins.push(randomCoin);
                        }
                    }
                }
            }

            // 追加硬貨を付与（少な目）
            enemies.push(newEnemy);
        }

        // ボス戦と同様に戦わせる仲間を選んでください。ここで選択した仲間は、ボス戦と同様に、次の戦闘に参加させられません。
        battleResult = await conductFight(game, game.party, enemies, random, currentArea, 'boss'); // 'boss'タイプで仲間選択を強制
    }
    else {
        logMessage("戦えるモン娘が残っていないよ！");
        battleResult = { won: false, foodGain: 0, milkGain: 0 }; 
    }

    if (!battleResult.won) {
        displayGuideMessage('襲撃敗北');
        playSfx("逃走").catch(e => console.error("効果音の再生に失敗しました:", e));
        logMessage("なんとか逃げ切れたけど、全ての食料を置いてきちゃった。");
        game.food = 0;
        updateUI(game, coinAttributesMap, [], null, false, null);
        clearActionArea();
        // uiManagerのcreateButtons関数を使用してボタンを生成
        createButtons([{ id: 'gameover-confirm', text: 'あらら', className: 'action-button' }]);
        await waitForButtonClick();

        playSfx("選択").catch(e => console.error("効果音の再生に失敗しました:", e));

        // スタイルを解除
        game.party.forEach(monster => {
            const li = partyList ? partyList.querySelector(`li[data-index="${game.party.indexOf(monster)}"]`) : null;
            if (li) {
                li.classList.remove('resting-in-raid');
            }
        });
        return false; // ゲームオーバーの可能性あり
    } else {
        displayGuideMessage('襲撃勝利');
        updateUI(game, coinAttributesMap, [], game.currentArea, false, null);

        clearActionArea();
        // スタイルを解除
        game.party.forEach(monster => {
            const li = partyList ? partyList.querySelector(`li[data-index="${game.party.indexOf(monster)}"]`) : null;
            if (li) {
                li.classList.remove('resting-in-raid');
            }
        });
        return true; // 襲撃撃退成功
    }
}


/**
 * 10日目のボス戦を処理する。
 * ガーゴイルと連続で戦闘する。
 * @param {object} currentArea - 現在の地形情報 (戦闘のコイントスに影響)。
 * @returns {Promise<boolean>} 全てのボスに勝利した場合true、敗北した場合false。
*/
async function handleBossBattle(currentArea) {
    game.currentPhase = 'bossBattle';
    logMessage("<br>--- ボス戦開始！ ---");

    if (isDailyChallengeActive('三銃士')) displayGuideMessage('ボス戦2');
    else if (isDailyChallengeActive('新婚旅行') || isDailyChallengeActive('両手に花')) displayGuideMessage('ボス戦3');
    else displayGuideMessage('ボス戦1');

    playMusic('ボス');

    // monsterTemplatesからガーゴイルのテンプレートを取得
    const gargoyleTemplate = monsterTemplates.find(t => t.name === 'ガーゴイル');

    // 3体のガーゴイルを生成。個別のインスタンスとして保持
    const allGargoyles = [
        new Monster('ガーゴイル', [...gargoyleTemplate.coins], gargoyleTemplate.upkeep),
        new Monster('ガーゴイル', [...gargoyleTemplate.coins], gargoyleTemplate.upkeep),
        new Monster('ガーゴイル', [...gargoyleTemplate.coins], gargoyleTemplate.upkeep)
    ];

    // 全てのパーティメンバーのhasBeenSentToBattleフラグをリセット
    game.party.forEach(monster => monster.hasBeenSentToBattle = false);

    // 食料報酬
    let foodRewards = 0;

    // 戦闘開始回数
    let battleStartCount = 0;
    if (isDailyChallengeActive('三銃士')) battleStartCount = 1;
    if (isDailyChallengeActive('新婚旅行') || isDailyChallengeActive('両手に花')) battleStartCount = 2;

    for (let i = battleStartCount; i < allGargoyles.length; i++) {
        // 現在の戦闘に登場するガーゴイルの数を動的に決定 (1体目:1体, 2体目:2体, 3体目:3体)
        const enemiesForThisFight = allGargoyles.slice(0, i + 1);

        logMessage(`\n--- 第${i + 1}戦: ${enemiesForThisFight.length}体のガーゴイルとの戦闘 ---`);

        // 戦闘ロジックを呼び出す
        // gameオブジェクトを渡す
        const battleResult = await conductFight(game, game.party, enemiesForThisFight, random, currentArea, 'boss');

        if (!battleResult.won) {
            return false; // ゲームオーバー
        } else {
            switch (i) {
                case 0:
                    displayGuideMessage('ボス戦2');
                    break;
                case 1:
                    displayGuideMessage('ボス戦3');
                    break;
                case 2:
                    displayGuideMessage('ボス戦勝利');
                    break;
                default:
            }
            // 敵表示をクリア
            updateUI(game, coinAttributesMap, [], game.currentArea, false, null);
        }

        // 敵の硬貨の枚数分の食料報酬を獲得
        foodRewards += allGargoyles.reduce((sum, monster) => sum + monster.upkeep, 0) * 2;
    }

    // ボス戦勝利時の報酬
    game.food += foodRewards;
    logMessage(`食料を${foodRewards}獲得したよ！`);
    updateUI(game, coinAttributesMap, [], game.currentArea, false, null);

    await stopMusic(true);

    return true; // 全てのガーゴイルに勝利
}

/**
 * ラスボス戦を開始する。
 * プレイヤーに3つの地形から選択させ、選択された地形に応じて3連戦を行う。
 * @returns {Promise<void>} ラスボス戦が終了したときに解決するPromise。
 */
async function startFinalBossBattle() {
    clearActionArea();
    logMessage("連邦の中枢に到達！");

    if (isDailyChallengeActive('三銃士')) displayGuideMessage('ボス戦2');
    else if (isDailyChallengeActive('新婚旅行') || isDailyChallengeActive('両手に花')) displayGuideMessage('ボス戦3');
    else displayGuideMessage('ボス戦1');

    game.currentPhase = 'finalBossAreaSelection';

    playMusic('ボス');

    // 硬貨属性が8つある地形をフィルタリング (mansion, fortress, swampなど)
    const eligibleAreas = areaTypes.filter(area => area.coinAttributes && area.coinAttributes.length === 8);
    const mansionArea = eligibleAreas.find(area => area.id === 'mansion');
    let otherEligibleAreas = eligibleAreas.filter(area => area.id !== 'mansion');

    // 選択肢となる3つの地形を決定
    let chosenAreas = [];
    if (mansionArea) {
        chosenAreas.push(mansionArea); // 館を固定で追加
    }
    if (isDailyChallengeActive('奈落')) {
        // 残りの2つを闇属性から選択
        chosenAreas.push(eligibleAreas.find(area => area.id === 'darkness'));
        chosenAreas.push(eligibleAreas.find(area => area.id === 'forestArea'));
    }
    else {
        // 残りの2つをランダムに選択（重複なし）
        let numberOfOptions = GAME_CONSTANTS.SELECT_AREA_SIZE;
        if (game.playerLife.name === '冒険家') numberOfOptions = GAME_CONSTANTS.SELECT_AREA_ADVENTURER;
        if (isDailyChallengeActive('新婚旅行') || isDailyChallengeActive('両手に花') || isDailyChallengeActive('三銃士') || isDailyChallengeActive('縄張り')) numberOfOptions++;
        while (chosenAreas.length < numberOfOptions && otherEligibleAreas.length > 0) {
            const randomIndex = Math.floor(random() * otherEligibleAreas.length);
            const selectedArea = otherEligibleAreas.splice(randomIndex, 1)[0];
            chosenAreas.push(selectedArea);
        }
    }

    const areaButtons = chosenAreas.map((area, index) => {
        // 硬貨属性をカウントし、まとめた表示形式にする
        const coinCounts = {};
        area.coinAttributes.forEach(coinId => {
            coinCounts[coinId] = (coinCounts[coinId] || 0) + 1;
        });

        const formattedCoinAttributes = Object.keys(coinCounts).map(coinId => {
            const count = coinCounts[coinId];
            const coinName = getCoinAttributeName(coinId, coinAttributesMap);
            return count > 1 ? `${coinName}×${count}` : coinName;
        }).join(' ');

        return {
            id: area.id,
            text: `${index + 1}: <span class="monster-name-color">${area.name}</span> (${formattedCoinAttributes})`,
            className: 'choice-button',
            area: area // ツールチップのためにエリアオブジェクトを渡す
        };
    });
    createButtons(areaButtons); // uiManagerのcreateButtonsを使用してボタンを生成
    
    const chosenAreaId = await waitForButtonClick();
    const finalBossArea = areaTypes.find(area => area.id === chosenAreaId);

    playSfx("移動").catch(e => console.error("効果音の再生に失敗しました:", e));

    logMessage(`敵は${finalBossArea.name}にあり！`);
    game.currentArea = finalBossArea; // 現在の地形を設定
    updateUI(game, coinAttributesMap, [], game.currentArea, false, null);

    const encounters = FINAL_BOSS_ENCOUNTERS[finalBossArea.id];

    // 戦闘の前に、パーティメンバーのhasBeenSentToBattleフラグをリセット
    game.party.forEach(monster => monster.hasBeenSentToBattle = false);

    // 戦闘開始回数
    let battleStartCount = 0;
    if (isDailyChallengeActive('三銃士')) battleStartCount = 1;
    if (isDailyChallengeActive('新婚旅行') || isDailyChallengeActive('両手に花')) battleStartCount = 2;

    // 3連戦のループ
    for (let i = battleStartCount; i < encounters.length; i++) {
        logMessage(`\nラスボス戦：第${i + 1}戦目開始！`);
        const enemiesToGenerateData = encounters[i];
        const finalBossEnemies = [];

        for (const enemyData of enemiesToGenerateData) {
            const template = monsterTemplates.find(mt => mt.name === enemyData.name);
            for (let k = 0; k < enemyData.count; k++) {
                // ラスボスはenemy属性を持つため、そのまま生成
                // talker属性を追加
                const chosenTalker = template.talker && template.talker.length > 0
                    ? template.talker[Math.floor(random() * template.talker.length)]
                    : 'none';
                let enemy = new Monster(template.name, [...template.coins], template.upkeep, false, chosenTalker);

                // 追加の硬貨を付与
                let maxAdditionalCoins = game.days - GAME_CONSTANTS.BOSS_DAYS;
                if (!isDailyChallengeActive('巨人')) maxAdditionalCoins = Math.floor((maxAdditionalCoins) / 2);

                const numAdditionalCoins = Math.floor(random() * (maxAdditionalCoins + 1));

                for (let j = 0; j < numAdditionalCoins; j++) {
                    if (enemy.coinAttributes.length > 0) {
                        const randomCoin = enemy.coinAttributes[Math.floor(random() * enemy.coinAttributes.length)];
                        enemy.additionalCoins.push(randomCoin);
                    }
                }
                // 敵リストに追加
                finalBossEnemies.push(enemy);
            }
        }

        game.currentEnemies = finalBossEnemies; // 現在の敵を設定 (UI更新用)
        updateUI(game, coinAttributesMap, [], game.currentEnemies, false, null);

        // 戦闘ロジックを呼び出す
        const battleResult = await conductFight(game, game.party, game.currentEnemies, random, game.currentArea, 'boss');

        if (!battleResult.won) {
            endGame(false); // ゲームオーバー
            return;
        } else {
            switch (i) {
                case 0:
                    displayGuideMessage('ボス戦2');
                    break;
                case 1:
                    displayGuideMessage('ボス戦3');
                    break;
                case 2:
                    displayGuideMessage('ボス戦勝利');
                    break;
                default:
            }
            // 敵表示をクリア
            updateUI(game, coinAttributesMap, [], game.currentArea, false, null);
        }
    }

    endGame(true); // ゲームクリア
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

        // 日替わりチャレンジのフィルタリング
        if (isDailyChallengeActive('廃刀令')) {
            potentialTemplates = potentialTemplates.filter(m => !m.coins.includes('iron') && !m.coins.includes('bow'));
        }
        else if (isDailyChallengeActive('渇水')) {
            potentialTemplates = potentialTemplates.filter(m => !m.coins.includes('water') && !m.coins.includes('snow') && !m.coins.includes('fishing'));
        }
        else if (isDailyChallengeActive('大原動機')) {
            potentialTemplates = potentialTemplates.filter(m => !m.coins.includes('forest'));
        }

        if (isDailyChallengeActive('排他的')) {
            const filterdTemplates = potentialTemplates.filter(template => game.party.some(m => m.name === template.name));
            if (filterdTemplates.length > 0) potentialTemplates = filterdTemplates;
        }
        else if (isDailyChallengeActive('高地人')) {
            const filterdTemplates = potentialTemplates = potentialTemplates.filter(template => !game.party.some(m => m.name === template.name));
            if (filterdTemplates.length > 0) potentialTemplates = filterdTemplates;
        }

        if (potentialTemplates.length > 0) {
            // 硬貨の枚数に応じた重み付けを適用して1体選択
            const chosenMonsters = getUniqueRandomMonsters(game, 1, potentialTemplates, true, 0, game.coinSizeLimit, random);
            if (chosenMonsters.length > 0) {
                monsterToOffer = chosenMonsters[0];
            }
        }
    }
    else {
        // 敵属性以外の全てのモン娘を対象とする
        let potentialTemplates = monsterTemplates.filter(template => !template.coins.includes('enemy'));

        // 日替わりチャレンジのフィルタリング
        if (isDailyChallengeActive('廃刀令')) {
            potentialTemplates = potentialTemplates.filter(m => !m.coins.includes('iron') && !m.coins.includes('bow'));
        }
        else if (isDailyChallengeActive('渇水')) {
            potentialTemplates = potentialTemplates.filter(m => !m.coins.includes('water') && !m.coins.includes('snow') && !m.coins.includes('fishing'));
        }
        else if (isDailyChallengeActive('大原動機')) {
            potentialTemplates = potentialTemplates.filter(m => !m.coins.includes('forest'));
        }

        if (isDailyChallengeActive('排他的')) {
            const filterdTemplates = potentialTemplates.filter(template => game.party.some(m => m.name === template.name));
            if (filterdTemplates.length > 0) potentialTemplates = filterdTemplates;
        }
        else if (isDailyChallengeActive('高地人')) {
            const filterdTemplates = potentialTemplates = potentialTemplates.filter(template => !game.party.some(m => m.name === template.name));
            if (filterdTemplates.length > 0) potentialTemplates = filterdTemplates;
        }

        monsterToOffer = getUniqueRandomMonsters(game, 1, potentialTemplates, false, 0, game.coinSizeLimit, random)[0];
    }

    // 追加の硬貨を付与
    let maxAdditionalCoins = game.days - GAME_CONSTANTS.BOSS_DAYS + 1;
    if (!isDailyChallengeActive('巨人')) maxAdditionalCoins = Math.floor((maxAdditionalCoins) / 2);

    let numAdditionalCoins = Math.floor(random() * (maxAdditionalCoins + 1));
    for (let j = 0; j < numAdditionalCoins; j++) {
        if (monsterToOffer.coinAttributes.length > 0) {
            const randomCoin = monsterToOffer.coinAttributes[Math.floor(random() * monsterToOffer.coinAttributes.length)];
            monsterToOffer.additionalCoins.push(randomCoin);
        }
    }

    logMessage(`<span class="monster-name-color">${monsterToOffer.name}</span> が仲間になりたそうにこちらを見ているよ！`);
    displayGuideMessage('ミルクで勧誘');

    // createButtons関数に渡すボタンデータの配列を構築
    const recruitButtons = [{
        id: monsterToOffer.name,
        text: `<img src="${imagePaths[monsterToOffer.name] || './image/default.png'}" alt="${monsterToOffer.name}" class="monster-image">`,
        className: 'choice-button',
        monster: monsterToOffer // ツールチップのためにモンスターオブジェクトを渡す
    }];
    recruitButtons.push({ id: 'skip', text: '断る', className: 'action-button' });

    while (true) {
        createButtons(recruitButtons); // uiManagerのcreateButtonsを使用してボタンを生成
        const choice = await waitForButtonClick();
        if (choice === 'skip') {
            playSfx("選択").catch(e => console.error("効果音の再生に失敗しました:", e));
            logMessage("敵を勧誘せずに先に進むよ。");
            break;
        }
        else {
            if (isDailyChallengeActive('排他的') && !game.party.some(m => m.name === monsterToOffer.name)) {
                playSfx("NG").catch(e => console.error("効果音の再生に失敗しました:", e));
                displayGuideMessage('排他的');
            }
            else if (isDailyChallengeActive('高地人') && game.party.some(m => m.name === monsterToOffer.name)) {
                playSfx("NG").catch(e => console.error("効果音の再生に失敗しました:", e));
                displayGuideMessage('高地人');
            }
            else if (game.milk >= 1) {
                playSfx("加入").catch(e => console.error("効果音の再生に失敗しました:", e));

                game.milk--;
                game.party.push(monsterToOffer);
                logMessage(`<span class="monster-name-color">${monsterToOffer.name}</span> が仲間になったよ！`);
                showSpeechBubble([monsterToOffer], '加入', random);
                updateUI(game, coinAttributesMap, [], null, false, null);
                break;
            } else {
                playSfx("NG").catch(e => console.error("効果音の再生に失敗しました:", e));
                displayGuideMessage('ミルク不足');
            }
        }
    }

    clearActionArea();
}

/**
 * 妹加入イベントを処理する。
 * @param {Monster[]} partyList
 * @param {Function} random - 疑似乱数生成関数。
 * @returns {Promise<void>}
 */
async function handleSisterEvent(partyList, random) {
    clearActionArea(); // ボタンをクリア

    // partyListからランダムに1人のモン娘を選出
    const randomIndex = Math.floor(random() * partyList.length);
    const selectedMonster = partyList[randomIndex];

    logMessage(`${selectedMonster.name}の生き別れた血の繋がっていない妹が現れた！`);

    // 選出されたモン娘の複製を作成
    const sisterMonster = new Monster(
        selectedMonster.name,
        [...selectedMonster.coinAttributes],
        selectedMonster.upkeep,
        selectedMonster.hasBeenSentToBattle,
        selectedMonster.talker
    );
    // 追加硬貨も複製
    sisterMonster.additionalCoins = [...selectedMonster.additionalCoins];

    // 複製したモン娘を仲間に加える
    partyList.push(sisterMonster);
    logMessage(`${sisterMonster.name}が仲間になった！`);

    playSfx("加入").catch(e => console.error("効果音の再生に失敗しました:", e));
    showSpeechBubble(game.party, '加入', random);
    displayGuideMessage('妹');

    // UIを更新して新しい仲間を表示
    updateUI(game, coinAttributesMap, [], game.currentArea, false, null);

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
    let availableCoins = coinAttributesMap.filter(coin => coin.id !== 'enemy' && coin.id !== 'machine');

    // 味方モン娘が所持している硬貨と、既に神の寵愛で得た硬貨を収集
    const partyCoins = new Set();
    game.party.forEach(monster => {
        monster.coinAttributes.forEach(coinId => partyCoins.add(coinId));
        monster.additionalCoins.forEach(coinId => partyCoins.add(coinId));
    });
    game.favour.forEach(coinId => partyCoins.add(coinId));

    // availableCoinsを更にフィルタリング（味方モン娘達が所持している硬貨、またはプレイヤーが所持している神の寵愛）
    availableCoins = availableCoins.filter(coin => partyCoins.has(coin.id));

    // 日替わりチャレンジのフィルタリング
    if (isDailyChallengeActive('一神教')) {
        availableCoins = availableCoins.filter(coin => coin.id === game.favour[0]);
    }

    // ランダムに1つ選択
    const chosenCoin = availableCoins[Math.floor(random() * availableCoins.length)];
    game.favour.push(chosenCoin.id); // game.favour に硬貨のIDを追加

    const coinHtml = createCoinTooltipHtml(chosenCoin.id, coinAttributesMap);
    logMessage(`神様から ${coinHtml} の硬貨を授かったよ！`);

    // 寵愛の効果音を再生
    playSfx("寵愛").catch(e => console.error("効果音の再生に失敗しました:", e));

    updateUI(game, coinAttributesMap, [], null, false, null); // UIを更新して表示を反映

    clearActionArea();
}

/**
 * 食料を対価にプレイヤーがランダムな硬貨を獲得するイベントを処理する。
 * @returns {Promise<void>}
 */
async function handleFoodSacrificeEvent() {
    clearActionArea();
    logMessage(`<br><div id="game-messages-phase">--- 祈り ---</div>`);
    displayGuideMessage('祈り');

    while (true) {
        const foodCost = GAME_CONSTANTS.TRADE_FOOD_INITIAL_COST + game.tradeCountByFood * GAME_CONSTANTS.TRADE_FOOD_SCALING_COST;

        const sacrificeButtons = [{
            id: 'sacrifice',
            text: `神様に食料を捧げる(${foodCost})`,
            className: 'action-button'
        }, {
            id: 'skipEvent',
            text: `また今度`,
            className: 'action-button'
        }];
        createButtons(sacrificeButtons); // uiManagerのcreateButtonsを使用してボタンを生成

        const initialChoice = await waitForButtonClick();
        clearActionArea();

        if (initialChoice === 'skipEvent') {
            playSfx("選択").catch(e => console.error("効果音の再生に失敗しました:", e));
            logMessage("今夜はやめておくよ。");
            break;
        }

        if (initialChoice === 'sacrifice') {
            if (game.food < foodCost) {
                // NGの効果音を再生
                playSfx("NG").catch(e => console.error("効果音の再生に失敗しました:", e));
                displayGuideMessage('食料不足');
                // 食料が足りない場合はボタンを再表示して選択を促す
                createButtons(sacrificeButtons);
                continue; // ループを続行して再入力を待つ
            }

            playSfx("選択").catch(e => console.error("効果音の再生に失敗しました:", e));

            let availableCoins = coinAttributesMap.filter(coin => coin.id !== 'enemy' && coin.id !== 'machine');
            const chosenCoins = [];

            // 日替わりチャレンジのフィルタリング
            if (isDailyChallengeActive('一神教')) {
                availableCoins = availableCoins.filter(coin => coin.id === game.favour[0]);
                chosenCoins.push(availableCoins[0]);
            }
            else {
                while (chosenCoins.length < 4) {
                    const randomIndex = Math.floor(random() * availableCoins.length);
                    const selectedCoin = availableCoins[randomIndex];
                    if (!chosenCoins.includes(selectedCoin)) {
                        chosenCoins.push(selectedCoin);
                    }
                }
            }

            displayGuideMessage('硬貨選択');
            const coinChoiceButtons = chosenCoins.map((coin, index) => ({
                id: index.toString(),
                text: createCoinTooltipHtml(coin.id, coinAttributesMap, false, 1, true),
                className: 'choice-button'
            }));
            createButtons(coinChoiceButtons); // uiManagerのcreateButtonsを使用してボタンを生成

            const coinChoice = await waitForButtonClick();
            hideCoinTooltip(); // Tooltip hidden regardless of user choice
            clearActionArea(); // Clear buttons after coin selection

            const chosenCoinIndex = parseInt(coinChoice);
            const acquiredCoin = chosenCoins[chosenCoinIndex];
            game.food -= foodCost;
            game.tradeCountByFood++;
            game.favour.push(acquiredCoin.id); // favour に硬貨のIDを追加

            const acquiredCoinHtml = createCoinTooltipHtml(acquiredCoin.id, coinAttributesMap);
            logMessage(`食料 ${foodCost} を捧げて、${acquiredCoinHtml} の硬貨を授かったよ！`);
            // 寵愛の効果音を再生
            playSfx("寵愛").catch(e => console.error("効果音の再生に失敗しました:", e));

            updateUI(game, coinAttributesMap, [], null, false, null);

            continue; // ループを続行して再入力を待つ
        }
    }
    clearActionArea(); // ループを抜けた後もクリア
}

/**
 * 仲間の人数分のミルクを消費して仲間全員に追加の硬貨を与えるイベントを処理する。
 * @returns {Promise<void>}
 */
async function handleMilkPartyEvent() {
    while (true) {
        if ((game.milk >= game.party.length && game.food >= 0) || (game.milk >= game.party.length * 2)) {
            logMessage(`<br><div id="game-messages-phase">--- ミルクパーティ ---</div>`);
            displayGuideMessage('ミルクパーティ');

            const partyButtons = [{
                id: 'strengthen',
                text: `仲間全員を強化する(ミルク${game.party.length}杯)`,
                className: 'action-button'
            }, {
                id: 'skip_strengthen',
                text: 'やめておく',
                className: 'action-button'
            }];
            createButtons(partyButtons); // uiManagerのcreateButtonsを使用してボタンを生成

            const choice = await waitForButtonClick();
            clearActionArea();

            if (choice === 'strengthen') {
                game.milk -= game.party.length;
                game.party.forEach(monster => {
                    // 生まれ持った硬貨の中からランダムに1つ選ぶ
                    if (monster.coinAttributes.length > 0) {
                        const randomCoin = monster.coinAttributes[Math.floor(random() * monster.coinAttributes.length)];
                        monster.additionalCoins.push(randomCoin);
                        const coinHtml = createCoinTooltipHtml(randomCoin, coinAttributesMap, true); // isAdditional を true に設定
                        logMessage(`<span class="monster-name-color">${monster.name}</span> は ${coinHtml} の硬貨を獲得！`);
                    }
                });
                playSfx("寵愛").catch(e => console.error("効果音の再生に失敗しました:", e));
                showSpeechBubble(game.party, '食後', random);
                updateUI(game, coinAttributesMap, [], null, false, null);
            } else {
                logMessage(`残念ながらミルクパーティは延期となりました。`);
                showSpeechBubble(game.party, '延期', random);
                playSfx("選択").catch(e => console.error("効果音の再生に失敗しました:", e));
                updateUI(game, coinAttributesMap, [], null, false, null);
                break;
            }
        }
        else {
            break;
        }
    }
}

/**
 * ５：野営フェーズ。
 * 探索で食料を獲得し、食費と戦闘手当を消費する。食料が尽きた場合の処理も含む。
 * @param {Monster[]} expeditionParty - 探索に派遣されたモン娘の配列。
 * @param {object} currentArea - 現在の地形情報。
 * @returns {Promise<boolean|string>} 野営成功でtrue、ゲームオーバーでfalse、ミルク消費で'recovered'。
 */
async function conductCamp(expeditionParty, currentArea) {
    game.currentPhase = 'campPhase';
    logMessage(`<br><div id="game-messages-phase">--- 野営フェーズ ---</div>`);
    playSfx("野営").catch(e => console.error("効果音の再生に失敗しました:", e));
    displayGuideMessage('野営');

    let foodGained = 0;
    expeditionParty.forEach(monster => {
        let monsterFoodContribution = GAME_CONSTANTS.FOOD_SUPPLY;

        // 漁の硬貨を水の硬貨として扱うための調整
        const effectiveAreaCoinAttributesForFood = [...currentArea.coinAttributes];

        monster.allCoins.forEach(monsterCoinAttr => {
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
    logMessage(`探索で食料を${foodGained}獲得したよ。`);
    updateUI(game, coinAttributesMap, [], null, false, null);

    // 食費の計算
    game.upkeep = game.party.reduce((total, monster) => total + monster.upkeep, 0);
    let totalFoodConsumption = game.upkeep + game.battleAllowance;

    logMessage(`仲間の食費: ${game.upkeep}`);
    logMessage(`総戦闘手当: ${game.battleAllowance}`);
    logMessage(`合計食料消費量: ${totalFoodConsumption}`);

    if (game.playerLife.name === '農家') {
        logMessage(`農家の力で効率良く食料を消費したよ。合計食料消費量: ${totalFoodConsumption} → ${Math.floor(totalFoodConsumption * GAME_CONSTANTS.FARMER_SAVINGS)}`);
        totalFoodConsumption = Math.floor(totalFoodConsumption * GAME_CONSTANTS.FARMER_SAVINGS);
    }

    game.food -= totalFoodConsumption;
    game.battleAllowance = 0; // 戦闘手当をリセット

    logMessage(`残り食料: ${game.food}`);

    game.food < 0 ? showSpeechBubble(game.party, '空腹', random) : showSpeechBubble(game.party, '食後', random);

    // 珍味獲得の判定をここに追加
    let delicacyFound = false;
    for (const member of game.expeditionParty) { // 派遣されたモン娘のみを対象にする
        for (const delicacy of delicacies) {
            // 探索モン娘の属性と珍味のexplorerCoinAttributesに共通の属性があるかチェック
            const monsterAttributeMatch = delicacy.explorerCoinAttributes.every(attr => member.allCoins.includes(attr));
            // 探索エリアの属性と珍味のareaCoinAttributesに共通の属性があるかチェック
            const areaAttributeMatch = delicacy.areaCoinAttributes.every(attr => currentArea.coinAttributes.includes(attr));

            if (monsterAttributeMatch && areaAttributeMatch) {
                game.milk += delicacy.milkConversion;
                logMessage(`${member.name}が${delicacy.name}を見つけてきたよ！　栄養満点だからおじさんが食べなよ。`);
                delicacyFound = true;
                updateUI(game, coinAttributesMap, [], currentArea, false, null);
                break; // この珍味は獲得したので次のモン娘へ
            }
        }
        if (delicacyFound) {
            delicacyFound = false; // 次のモン娘のためにリセット
        }
    }

    updateUI(game, coinAttributesMap, [], null, false, null);

    // 食料を対価に硬貨を獲得するイベントを発生させる
    if (!isDailyChallengeActive('無信仰')) {
        await handleFoodSacrificeEvent();
    }

    // 仲間の人数分のミルクを消費して仲間全員に追加の硬貨を与えるイベントを発生させる。
    if (!isDailyChallengeActive('禁酒法')) {
        await handleMilkPartyEvent();
    }

    // 食料が尽きた際の救済処置
    if (game.food < 0) {
        const milkCost = game.party.length;
        if (game.milk >= milkCost && !isDailyChallengeActive('禁酒法')) {
            game.milk -= milkCost;
            game.food = 0; // 食料を最低値に回復
            logMessage(`食料が尽きたけど、仲間モン娘 ${milkCost} 人にミルクを支払って冒険を続行だ！`);
            updateUI(game, coinAttributesMap, [], null, false, null);
            // uiManagerのcreateButtons関数を使用してボタンを生成
            createButtons([{ id: 'continue-after-milk', text: '続行', className: 'action-button' }]);
            await waitForButtonClick();
            return 'recovered'; // ゲーム続行
        } else {
            logMessage("食料もミルクも尽きちゃった。");
            // uiManagerのcreateButtons関数を使用してボタンを生成
            createButtons([{ id: 'gameover-confirm', text: 'あらら', className: 'action-button' }]);
            await waitForButtonClick();
            return false; // ゲームオーバー
        }
    }
    return true; // 通常の野営成功（日数は進む）
}

/**
 * ゲームを終了する際の処理。
 * @param {boolean} isCleared - ゲームがクリアされたかどうか。
 */
function endGame(isCleared) {
    clearActionArea();
    toggleInitialSetupArea(true); // 初期セットアップエリアを再表示
    updateUI(game, coinAttributesMap, [], null, false, null); // UIを初期状態にリセット

    const homunculusContainer = document.getElementById('homunculus-container');
    const homunculusImage = document.getElementById('homunculus-image');
    const rightAlchemyImage = document.getElementById('right-alchemy-image');
    const leftAlchemyImage = document.getElementById('left-alchemy-image');

    if (isCleared) {
        displayGuideMessage('クリア');

        playMusic('ゲームクリア'); // 「勝利」から「ゲームクリア」に変更
        logMessage("やったね！　王子を救出したよ！");
        logMessage("<br>");
        logMessage("そして100億円で高名な錬金術師を雇い、遂に僕もフラスコの外に出られたよ！");
        logMessage("おじさん、ありがとう！");

        // ゲームクリア後のホムンクルスと錬金術師の表示
        if (homunculusImage && imagePaths["外に出たホムンクルス"]) {
            homunculusImage.src = imagePaths["外に出たホムンクルス"];
            homunculusImage.style.width = '128px'; // 画像サイズの調整
            homunculusImage.style.height = 'auto'; // 画像サイズの調整
            homunculusImage.style.borderRadius = '0'; // 円形を解除
            homunculusImage.style.boxShadow = 'none'; // シャドウを解除
        }
        if (leftAlchemyImage && rightAlchemyImage && imagePaths["錬金術師"]) {
            leftAlchemyImage.src = imagePaths["錬金術師"];
            rightAlchemyImage.src = imagePaths["錬金術師"];
            leftAlchemyImage.style.display = 'block';
            rightAlchemyImage.style.display = 'block';
        }

    } else {
        stopMusic();

        displayGuideMessage('ハッピーエンド');

        // ハッピーエンドの効果音を再生
        playSfx("ハッピーエンド").catch(e => console.error("効果音の再生に失敗しました:", e));

        logMessage("おじさんはモン娘達に食べられてしまいました。");
    }
    // uiManagerのcreateButtons関数を使用してボタンを生成
    createButtons([{ id: 'restart', text: 'ゲームを最初からやり直す', className: 'action-button' }]);
    waitForButtonClick().then(action => {
        if (action === 'restart') {
            resetGameToInitialState();
        }
    });
}

/**
 * イベントを発生させる。
 * @param {Monster[]} partyList - プレイヤーのパーティのモン娘配列。
 * @param {Object} currentArea - 地形。
 */
async function event(partyList, currentArea) {
    game.currentPhase = 'event';
    logMessage(`<br><div id="game-messages-phase">--- イベントフェーズ ---</div>`);

    // イベントの種類設定
    const eventPool = {
        'favour': GAME_CONSTANTS.FAVOUR_EVENT_CHANCE,
        'sister': GAME_CONSTANTS.SISTER_EVENT_CHANCE,
        'recruit': GAME_CONSTANTS.RECRUIT_EVENT_CHANCE,
    }
    const eventTypeRoll = random();
    let eventType = 'none';
    let eventRate = 0;
    for (const prop in eventPool) {
        eventRate += eventPool[prop];
        if (eventTypeRoll < eventRate) {
            eventType = prop;
            break;
        }
    }

    // ミルクが空で勧誘イベントが発生した場合、イベントなしに置き換える。
    if (eventType === 'recruit' && game.milk < 1) {
        eventType = 'none';
    }

    // 日替わりチャレンジによるイベントの書き換え
    if (isDailyChallengeActive('妹の日')) {
        eventType = 'sister';
    }
    if (isDailyChallengeActive('神寵者')) {
        eventType = 'favour';
    }
    if (isDailyChallengeActive('無信仰') && eventType === 'favour') {
        eventType = 'none';
    }
    if ((isDailyChallengeActive('新婚旅行') || isDailyChallengeActive('両手に花') || isDailyChallengeActive('三銃士')) && (eventType === 'sister' || eventType === 'recruit')) {
        eventType = 'none';
    }

    switch (eventType) {
        case 'favour':
            logMessage("神様からの贈り物だ！");
            await handleFavourEvent(); // 神の寵愛イベントを処理
            break;

        case 'sister':
            logMessage("友好的なモン娘がやってきた！");
            await handleSisterEvent(partyList, random); // 妹加入イベントを処理
            break;

        case 'recruit':
            logMessage("友好的なモン娘がやってきた！");
            await handleRecruitmentEvent(currentArea); // 仲間勧誘イベントを処理
            break;

        default:
            logMessage("特に何も起こらなかったよ。");
    }
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
    updateUI(game, coinAttributesMap, [], null, false, null); // UIを更新して、初期セットアップエリアが非表示になったことを反映

    displayGuideMessage('初期表示');

    await offerMonstersToJoin();
    // 初期加入フェーズで食料が尽きることは通常ないが、念のためチェック
    if (game.food < 0) {
        resetGameToInitialState();
        return;
    }

    while (game.days < GAME_CONSTANTS.MAX_DAYS) {
        game.days++;

        // 11日目を迎えたらレベル2の音楽を再生
        if (game.days === GAME_CONSTANTS.BOSS_DAYS + 1) {
            playMusic('レベル2');
        }

        logMessage(`<br><div id="game-messages-days">\n=== ${game.days}日目 ===</div>`);
        document.getElementById('days-display').innerText = game.days;

        let currentArea;
        let expeditionParty;
        let restingParty;
        let raidResult;

        // 20日目の開始時にラスボス戦を開始
        if (game.days === GAME_CONSTANTS.MAX_DAYS) { // 20日目になったらすぐにラスボス戦
            // 警告の効果音を再生
            playSfx("警告").catch(e => console.error("効果音の再生に失敗しました:", e));

            await startFinalBossBattle();
            return; // ラスボス戦終了後はゲームループを抜ける

        } else if (game.days === GAME_CONSTANTS.BOSS_DAYS) {
            // 警告の効果音を再生
            playSfx("警告").catch(e => console.error("効果音の再生に失敗しました:", e));

            logMessage("\n--- 関所の番人、現る！ ---");
            game.currentPhase = 'areaSelection'; // 地形選択フェーズ
            currentArea = await selectExplorationArea(); // ボス戦でも地形選択は必要
            if (game.food < 0) break;

            const bossBattleSuccess = await handleBossBattle(currentArea); // currentAreaを渡す
            if (!bossBattleSuccess) {
                endGame(false);
                return; // ゲームオーバー
            } else {
                updateUI(game, coinAttributesMap, [], game.currentArea, false, null);
                // ボス戦後は全員待機状態に戻る
                expeditionParty = [];
                restingParty = game.party;
            }
        } else {
            // 通常のゲームフロー

            // 夜明けの効果音を再生
            playSfx("夜明け").catch(e => console.error("効果音の再生に失敗しました:", e));

            showSpeechBubble(game.party, '起床', random);

            currentArea = await selectExplorationArea();
            if (game.food < 0) break; // エリア選択後に食料が尽きることはないが、念のため

            showSpeechBubble(game.party, '探索', random);

            const parties = await sendMonstersOnExpedition(currentArea);
            expeditionParty = parties.expeditionParty;
            restingParty = parties.restingParty;
            if (game.food < 0) break; // 派遣選択後に食料が尽きることはないが、念のため

            raidResult = await handleRaid(restingParty, currentArea);
            if (!raidResult) break; // 襲撃でゲームオーバーになった場合

            // イベントフェーズに入る前にワンクッション置く
            game.currentPhase = 'campPreparation';
            // uiManagerのcreateButtons関数を使用してボタンを生成
            createButtons([{ id: 'conduct-camp', text: '次へ', className: 'action-button' }]);
            await waitForButtonClick();

            showSpeechBubble(restingParty, '雑談', random);

            // イベント発生
            await event(game.party, currentArea); // partyListをgame.partyに変更
        }

        // 帝国の侵略兵器の襲撃イベント判定
        let isImperialRaid = false;
        if (isDailyChallengeActive('休戦中') || game.days === GAME_CONSTANTS.BOSS_DAYS || game.days === GAME_CONSTANTS.MAX_DAYS) {
            isImperialRaid = false;
        }
        else if (isDailyChallengeActive('戦争中') || game.party.length > GAME_CONSTANTS.RAID_EMPIRE_MIN_PARTY_SIZE) {
            isImperialRaid = true;
        }

        if (isImperialRaid) {
            const baseChance = Math.floor(game.party.length / GAME_CONSTANTS.RAID_EMPIRE_CHANCE);
            const numChecks = Math.floor(game.party.length / GAME_CONSTANTS.RAID_EMPIRE_COUNT);
            let imperialRaidOccurred = false;

            // 全てのパーティメンバーのhasBeenSentToBattleフラグをリセット
            expeditionParty.forEach(monster => monster.hasBeenSentToBattle = true);
            restingParty.forEach(monster => monster.hasBeenSentToBattle = false);

            for (let i = 0; i < numChecks; i++) {
                let raidChance = random();
                if (isDailyChallengeActive('戦争中') && !imperialRaidOccurred) raidChance = 0;

                if (raidChance < (baseChance / 100)) { // 確率計算
                    playSfx('警告');

                    if (!imperialRaidOccurred) playMusic('帝国');

                    imperialRaidOccurred = true;

                    const imperialRaidSuccess = await handleImperialInvasionRaid(game.party.filter(m => !m.hasBeenSentToBattle), currentArea);

                    if (!imperialRaidSuccess) break;

                    if (game.days < GAME_CONSTANTS.BOSS_DAYS) break; // 10日以前は、2回以上の襲撃は発生しないようにする
                }
            }
            // 襲撃発生後、hasBeenSentToBattleフラグをリセット
            if (imperialRaidOccurred) {
                game.days < GAME_CONSTANTS.BOSS_DAYS ? playMusic('レベル1') : playMusic('レベル2');
                game.party.forEach(monster => monster.hasBeenSentToBattle = false);
            }
        }

        // 野営フェーズに入る前にワンクッション置く
        game.currentPhase = 'campPreparation';
        // uiManagerのcreateButtons関数を使用してボタンを生成
        createButtons([{ id: 'conduct-camp', text: '野営する', className: 'action-button' }]);
        await waitForButtonClick();

        let campResult = await conductCamp(expeditionParty, currentArea);
        if (!campResult) { // campResultがfalseの場合（ゲームオーバー）
            break;
        }

        updateUI(game, coinAttributesMap, [], null, false, null); // 1日の終了後、UIを通常状態に戻すためにもう一度呼び出し

        game.milk++; // 日ごとにミルクを1杯加算
        if (game.playerLife.name === '炉裏魂') {
            game.milk++;
        }

        if (isDailyChallengeActive('新婚旅行') || isDailyChallengeActive('両手に花') || isDailyChallengeActive('三銃士')) {
            game.milk++;
        }

        if (game.days < GAME_CONSTANTS.MAX_DAYS && game.food >= 0) { // MAX_DAYSの前日までは次の日へ進むボタン
            // uiManagerのcreateButtons関数を使用してボタンを生成
            createButtons([{ id: 'next-day', text: '次の日へ', className: 'action-button' }]);
            await waitForButtonClick();
        }
    }

    // ゲームループ終了後の最終判定
    if (game.food < 0 || game.milk < 0) {
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
    game.estimatedFoodGain = 0; // 予想食料獲得量もリセット
    game.estimatedMilkGain = 0; // 予想ミルク獲得量もリセット
    game.upkeep = 0; // 食費もリセット
    game.currentPhase = 'initial';
    game.favour = [];
    game.playerLife = null;
    game.tradeCountByFood = 0;
    game.tradeCountByMilk = 0;
    game.isDailyChallengeMode = false; // 日替わりチャレンジモードをリセット
    game.dailyChallenges = []; // 日替わりチャレンジをリセット

    // パーティメンバーのhasBeenSentToBattleフラグを初期化（ゲーム開始時にもリセット）
    game.party.forEach(monster => monster.hasBeenSentToBattle = false);

    const gameMessages = document.getElementById('game-messages');
    if (gameMessages) gameMessages.innerHTML = '<p>冒険に出発だ！</p>';
    clearActionArea();
    toggleInitialSetupArea(true);

    // ホムンクルスの画像を初期状態に戻す
    const homunculusImage = document.getElementById('homunculus-image');
    if (homunculusImage && imagePaths["ホムンクルス"]) {
        homunculusImage.src = imagePaths["ホムンクルス"];
        homunculusImage.style.borderRadius = ''; // スタイルをリセット
        homunculusImage.style.boxShadow = ''; // スタイルをリセット
    }

    const rightAlchemyImage = document.getElementById('right-alchemy-image');
    const leftAlchemyImage = document.getElementById('left-alchemy-image');

    if (leftAlchemyImage) {
        leftAlchemyImage.style.display = 'none';
    }
    if (rightAlchemyImage) {
        rightAlchemyImage.style.display = 'none';
    }

    // 日替わりチャレンジを再選択し、UIを更新
    const dateSeed = getDateSeed();
    game.dailyChallenges = selectDailyChallenges(dateSeed);
    updateUI(game, coinAttributesMap, [], null, false, null); // UIを通常状態に戻す
}

/**
 * ゲームの初期状態を設定し、ゲームループを開始する共通関数。
 * @param {boolean} isDailyChallenge - 日替わりチャレンジモードかどうか。
 * @param {string} seed - 使用するシード値。
 */
async function initializeGame(isDailyChallenge, seed) {
    game.currentSeed = seed;
    random = mulberry32(seed); // 乱数生成器を初期化

    game.isDailyChallengeMode = isDailyChallenge;
    if (isDailyChallenge) {
        game.dailyChallenges = selectDailyChallenges(seed); // 日替わりチャレンジモードの場合はチャレンジを選択
    } else {
        game.dailyChallenges = []; // 通常モードの場合はクリア
    }

    // data.js の life からランダムに1つ選択し、プレイヤーの生い立ちにする
    const randomLifeIndex = Math.floor(random() * life.length);
    game.playerLife = life[randomLifeIndex];
    console.log("選択された生い立ち:", game.playerLife);

    game.food = GAME_CONSTANTS.INITIAL_FOOD; // 初期食料
    game.milk = GAME_CONSTANTS.INITIAL_MILK; // 初期ミルク
    game.days = 0;
    game.party = [];
    game.battleAllowance = 0;
    game.currentArea = null;
    game.estimatedFoodGain = 0; // 予想食料獲得量もリセット
    game.estimatedMilkGain = 0; // 予想ミルク獲得量もリセット
    game.upkeep = 0; // 食費もリセット
    game.currentPhase = 'initial'; // フェーズを初期状態に戻す
    game.favour = []; // 神の寵愛もリセット
    game.coinSizeLimit = game.playerLife.name === '炉裏魂' ? 3 : Infinity;
    game.tradeCountByFood = 0;
    game.tradeCountByMilk = 0;

    // パーティメンバーのhasBeenSentToBattleフラグを初期化（ゲーム開始時にもリセット）
    game.party.forEach(monster => monster.hasBeenSentToBattle = false);

    const gameMessages = document.getElementById('game-messages');
    if (gameMessages) {
        gameMessages.innerHTML = ''; // メッセージエリアをクリア
        logMessage(isDailyChallenge ? "日替わりチャレンジが始まるよ！" : "過酷な旅路が始まるよ！");
    } else {
        console.error("DOM element 'game-messages' not found at game start.");
    }

    // 生い立ち画像を表示
    const playerLifeImage = document.getElementById('player-life-image');
    if (playerLifeImage && game.playerLife && imagePaths[game.playerLife.name]) {
        playerLifeImage.src = imagePaths[game.playerLife.name];
        playerLifeImage.style.display = 'block'; // 画像を表示
        // 生い立ち画像にツールチップイベントリスナーを追加
        // 既存のイベントリスナーを削除してから追加（重複登録防止）
        if (playerLifeImage._tooltipMouseOverListener) {
            playerLifeImage.removeEventListener('mouseover', playerLifeImage._tooltipMouseOverListener);
        }
        if (playerLifeImage._tooltipMouseOutListener) {
            playerLifeImage.removeEventListener('mouseout', playerLifeImage._tooltipMouseOutListener);
        }
        playerLifeImage._tooltipMouseOverListener = (event) => showLifeTooltip(game.playerLife, event.currentTarget);
        playerLifeImage._tooltipMouseOutListener = hideLifeTooltip;
        playerLifeImage.addEventListener('mouseover', playerLifeImage._tooltipMouseOverListener);
        playerLifeImage.addEventListener('mouseout', playerLifeImage._tooltipMouseOutListener);
    } else {
        console.warn("プレイヤーの生い立ち画像または対応する画像パスが見つかりませんでした。");
        if (playerLifeImage) {
            playerLifeImage.style.display = 'none'; // 画像を非表示
        }
    }

    if (!isDailyChallengeActive('無信仰')) {
        // enemy属性を除く全ての硬貨をフィルタリング
        const availableCoins = coinAttributesMap.filter(coin => coin.id !== 'enemy' && coin.id !== 'machine');
        // ランダムに1つ神の寵愛を取得
        const chosenCoin = availableCoins[Math.floor(random() * availableCoins.length)];
        game.favour.push(chosenCoin.id); // game.favour に硬貨のIDを追加
    }

    updateUI(game, coinAttributesMap, [], null, false, null); // UIを通常状態に戻す

    playMusic('レベル1'); // ゲーム開始時にレベル1の音楽を再生

    gameLoop();
}


// DOMContentLoaded イベントで要素を取得し、イベントリスナーを設定
document.addEventListener('DOMContentLoaded', async () => { // asyncを追加
    // DOM要素の取得 - ここでconstで宣言し、直接使用する
    const startGameButton = document.getElementById('start-game-button');
    const startDailyChallengeButton = document.getElementById('start-daily-challenge-button'); // 追加
    const seedInput = document.getElementById('seed-input');
    const gameMessages = document.getElementById('game-messages');
    const playerLifeImage = document.getElementById('player-life-image');
    const toggleCoinDisplayButton = document.getElementById('toggle-coin-display-button');
    const dailyChallengeDisplay = document.getElementById('daily-challenge-display'); // 追加

    const loadingOverlay = document.getElementById('loading-overlay');
    const progressBarFill = document.getElementById('progress-bar-fill');
    const progressPercentage = document.getElementById('progress-percentage');

    // ローディング画面を表示
    loadingOverlay.style.display = 'flex';

    // AudioContextの初期化
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();

    // 進捗更新用のコールバック関数
    const updateOverallProgress = (loaded, total) => {
        const percentage = total === 0 ? 100 : Math.floor((loaded / total) * 100);
        if (progressBarFill) {
            progressBarFill.style.width = `${percentage}%`;
        }
        if (progressPercentage) {
            progressPercentage.innerText = `${percentage}%`;
        }
    };

    // 全てのアセットをプリロード
    console.log('Preloading all assets...');
    const preloadedAssets = await preloadAllAssets(audioContext, updateOverallProgress);
    imagePaths = preloadedAssets.imagePaths;
    audioBuffers = preloadedAssets.audioBuffers;

    // UI Managerに画像パスをセット
    setImagePaths(imagePaths);
    // Music Managerにオーディオバッファをセット
    setMusicAudioBuffers(audioBuffers); // musicManager.js の setAudioBuffers を呼び出す
    await initMusicPlayer(audioContext, preloadedAssets.musicPaths, preloadedAssets.soundPaths); // musicManagerの初期化にaudioContextとpathsを渡す

    // monsterGuide.jsonを読み込む
    const monsterGuideJson = await fetch('./monsterGuide.json').then(res => res.json()).catch(e => { console.error("Error loading monsterGuide.json:", e); return {}; });
    // guideUIの初期化
    initializeMonsterGuide(monsterGuideJson, imagePaths);

    console.log('Asset preloading complete. Game is ready to start.');

    // ローディング画面を非表示
    loadingOverlay.style.display = 'none';

    // 日替わりチャレンジの初期設定
    const dateSeed = getDateSeed();
    game.dailyChallenges = selectDailyChallenges(dateSeed);

    // 硬貨表示切り替えボタンのイベントリスナー
    if (toggleCoinDisplayButton) {
        toggleCoinDisplayButton.addEventListener('click', () => {
            toggleCoinDisplay();
        });
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
            initializeGame(false, seedValue);
        });
    } else {
        console.error("DOM element 'start-game-button' が見つかりませんでした。ゲームを開始できません。");
    }

    // 日替わりチャレンジボタンのイベントリスナー
    if (startDailyChallengeButton) {
        // マウスオーバーでツールチップ表示
        startDailyChallengeButton.addEventListener('mouseover', (event) => showDailyChallengeTooltip(game.dailyChallenges, event));
        startDailyChallengeButton.addEventListener('mouseout', hideDailyChallengeTooltip);

        startDailyChallengeButton.addEventListener('click', () => {
            console.log("日替わりチャレンジボタンがクリックされました。");
            const dateSeed = (seedInput.value.trim() === '') ? getDateSeed() : seedInput.value.trim();
            initializeGame(true, dateSeed);
        });
    } else {
        console.error("DOM element 'start-daily-challenge-button' が見つかりませんでした。");
    }

    // 初期UI表示
    updateUI(game, coinAttributesMap, [], null, false, null);
});
