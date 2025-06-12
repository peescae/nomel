// game.js

import { coinAttributesMap, monsterTemplates, areaTypes, GAME_CONSTANTS, delicacies, FINAL_BOSS_ENCOUNTERS, life } from './data.js';
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
    showLifeTooltip,
    hideLifeTooltip,
    toggleCoinDisplay
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
    upkeep: 0, // 食費
    estimatedFoodGain: 0, // 予想食料獲得量
    expeditionParty: [], // 派遣されるモン娘の配列 (珍味判定用)
    favour: [], // 神の寵愛で得た硬貨の配列
    playerLife: null, // プレイヤーの生い立ち
    coinSizeLimit: 0, // 硬貨枚数の制限
};
// uiManager.js からアクセスできるように game オブジェクトを window に公開
window.game = game;

let random; // 疑似乱数生成関数
let imagePaths;

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
    initialChoices = getUniqueRandomMonsters(game, 3, availableTemplatesForOffer, true, 0, game.coinSizeLimit, random);

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
    playSfx("加入").catch(e => console.error("加入の効果音の再生に失敗しました:", e));
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
        subsequentChoices = getUniqueRandomMonsters(game, 3, currentAvailableTemplates, true, 0, game.coinSizeLimit, random);

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
            playSfx("加入").catch(e => console.error("加入の効果音の再生に失敗しました:", e));
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
    // 冒険家の場合、地形を2つ追加
    if (game.playerLife.name === '冒険家') {
        areaChoices.push(...shuffledFilteredAreas.slice(0, 5));
    }
    else {
        areaChoices.push(...shuffledFilteredAreas.slice(0, 3));
    }

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

    playSfx("選択").catch(e => console.error("選択の効果音の再生に失敗しました:", e));

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

                playSfx("選択").catch(e => console.error("選択の効果音の再生に失敗しました:", e));

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

                playSfx("移動").catch(e => console.error("移動の効果音の再生に失敗しました:", e));

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

    // 1日目かつ決闘の場合、通常襲撃に変更する。
    if (game.days === 1 && raidType === 'duel') {
        raidType = 'normal';
    }

    let enemies = [];
    let numEnemies;
    switch (raidType) {
        case 'special':
            logMessage("強敵が襲撃してきたよ！");
            numEnemies = 1 + Math.floor((game.days - 1) / GAME_CONSTANTS.ENEMY_COUNT_SCALING_DAYS);
            enemies = generateSpecialRaidEnemies(numEnemies, game.days, random);
            break;

        case 'duel':
            logMessage("決闘を申し込まれたよ！");
            numEnemies = 1;
            enemies = generateAreaSpecificEnemies(numEnemies, currentArea, game.days + 1, random);
            // 全てのパーティメンバーのhasBeenSentToBattleフラグをリセット
            game.party.forEach(monster => monster.hasBeenSentToBattle = false);
            break;

        case 'normal':
            logMessage("モン娘が襲撃してきたよ！");
            numEnemies = 1 + Math.floor((game.days - 1) / GAME_CONSTANTS.ENEMY_COUNT_SCALING_DAYS);
            enemies = generateAreaSpecificEnemies(numEnemies, currentArea, game.days, random);
            break;

        default:
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
        if (raidType === 'duel') {
            logMessage("キャンプに誰もいないよ！");
            logMessage("おじさんのミルクが搾り取られちゃった。");
            game.milk--;;
            updateUI(game, coinAttributesMap, [], null, false, null, GAME_CONSTANTS.MAX_PARTY_SIZE);
            const actionArea = document.getElementById('action-area');
            if (actionArea) actionArea.innerHTML = '<button data-value="continue">次へ</button>';
            await waitForButtonClick();

            playSfx("選択").catch(e => console.error("選択の効果音の再生に失敗しました:", e));

            // スタイルを解除
            game.party.forEach(monster => {
                const li = partyList ? partyList.querySelector(`li[data-index="${game.party.indexOf(monster)}"]`) : null;
                if (li) {
                    li.classList.remove('resting-in-raid');
                }
            });
        }
        else {
            playSfx("逃走").catch(e => console.error("逃走の効果音の再生に失敗しました:", e));

            logMessage("キャンプに誰もいないよ！");
            logMessage("なんとか逃げ切れたけど、全ての食料を置いてきちゃった。");
            game.food = 0;
            updateUI(game, coinAttributesMap, [], null, false, null, GAME_CONSTANTS.MAX_PARTY_SIZE);
            const actionArea = document.getElementById('action-area');
            if (actionArea) actionArea.innerHTML = '<button data-value="continue">次へ</button>';
            await waitForButtonClick();

            playSfx("選択").catch(e => console.error("選択の効果音の再生に失敗しました:", e));

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

    const actionArea = document.getElementById('action-area');

    // 戦闘ロジックを呼び出す
    const battleResult = await conductFight(game, restingParty, enemies, random, currentArea, raidType);

    if (!battleResult.won) {
        if (raidType === 'duel') {
            // 決闘敗北時の処理
            logMessage("決闘に負けて、おじさんのミルクが搾り取られちゃった。");
            game.milk--; // ミルクを1減らす
            updateUI(game, coinAttributesMap, [], null, false, null, GAME_CONSTANTS.MAX_PARTY_SIZE);
        }
        else {
            logMessage("なんとか逃げ切れたけど、全ての食料を置いてきちゃった。");
            game.food = 0;
            logMessage(`現在の食料: ${game.food}`);
            updateUI(game, coinAttributesMap, [], null, false, null, GAME_CONSTANTS.MAX_PARTY_SIZE);
        }
        clearActionArea();
        actionArea.innerHTML = '<button data-value="gameover-confirm">あらら</button>';
        await waitForButtonClick();

        playSfx("選択").catch(e => console.error("選択の効果音の再生に失敗しました:", e));

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
            enemy && enemy.coinAttributes && !enemy.coinAttributes.includes('enemy') && raidType !== 'special'
        );

        if (raidType === 'special') {
            // 特殊襲撃勝利時の報酬
            const foodRewards = enemies.reduce((sum, monster) => sum + monster.upkeep, 0) * 3;
            game.food += foodRewards;
            logMessage(`食料を${foodRewards}獲得したよ！`);
            updateUI(game, coinAttributesMap, [], game.currentArea, false, null, GAME_CONSTANTS.MAX_PARTY_SIZE);
        }

        if (recruitableEnemies.length > 0) {
            if (raidType === 'duel') {
                logMessage("倒した敵を勧誘する？");
            }
            else {
                logMessage("倒した敵を勧誘する？ (ミルク1杯消費)");
            }

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
                playSfx("選択").catch(e => console.error("選択の効果音の再生に失敗しました:", e));
                logMessage("敵を勧誘せずに先に進むよ。");
            } else {
                const chosenEnemyIndex = parseInt(choice);
                const chosenEnemy = recruitableEnemies[chosenEnemyIndex];
                if (game.playerLife.name === '炉裏魂' && chosenEnemy.coinAttributes.length > game.coinSizeLimit) {
                    // NGの効果音を再生
                    playSfx("NG").catch(e => console.error("NGの効果音の再生に失敗しました:", e));
                    logMessage("おじさんは炉裏魂だから、その娘は仲間にできないね。");                    
                }
                else if (raidType === 'duel') {
                    // 加入の効果音を再生
                    playSfx("加入").catch(e => console.error("加入の効果音の再生に失敗しました:", e));
                    logMessage(`<span class="monster-name-color">${chosenEnemy.name}</span> が仲間に加わったよ！`);
                    // 戦闘勝利後はMAX_PARTY_SIZEの制限なく加入可能
                    game.party.push(chosenEnemy);
                    updateUI(game, coinAttributesMap, [], null, false, null, GAME_CONSTANTS.MAX_PARTY_SIZE); // 食費更新のためUI更新
                }
                else if (game.milk > 0) {
                    // 加入の効果音を再生
                    playSfx("加入").catch(e => console.error("加入の効果音の再生に失敗しました:", e));
                    game.milk--; // ミルクを1消費
                    logMessage(`おじさんのミルクで <span class="monster-name-color">${chosenEnemy.name}</span> が仲間に加わったよ！`);
                    // 戦闘勝利後はMAX_PARTY_SIZEの制限なく加入可能
                    game.party.push(chosenEnemy);
                    updateUI(game, coinAttributesMap, [], null, false, null, GAME_CONSTANTS.MAX_PARTY_SIZE); // 食費更新のためUI更新
                } else {
                    // NGの効果音を再生
                    playSfx("NG").catch(e => console.error("NGの効果音の再生に失敗しました:", e));
                    logMessage("おじさんのミルクが空っぽだから、そのモン娘は仲間にできないね。");
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

    for (let i = 0; i < allGargoyles.length; i++) {
        // 現在の戦闘に登場するガーゴイルの数を動的に決定 (1体目:1体, 2体目:2体, 3体目:3体)
        const enemiesForThisFight = allGargoyles.slice(0, i + 1);

        logMessage(`\n--- 第${i + 1}戦: ${enemiesForThisFight.length}体のガーゴイルとの戦闘 ---`);

        // 戦闘ロジックを呼び出す
        // gameオブジェクトを渡す
        const battleResult = await conductFight(game, game.party, enemiesForThisFight, random, currentArea, 'boss');

        if (!battleResult.won) {
            return false; // ゲームオーバー
        } else {
            // 敵表示をクリア
            updateUI(game, coinAttributesMap, [], game.currentArea, false, null, GAME_CONSTANTS.MAX_PARTY_SIZE);
        }

        // 敵の硬貨の枚数分の食料報酬を獲得
        foodRewards += allGargoyles.reduce((sum, monster) => sum + monster.upkeep, 0) * 2;
    }

    // ボス戦勝利時の報酬
    game.food += foodRewards;
    logMessage(`食料を${foodRewards}獲得したよ！`);
    updateUI(game, coinAttributesMap, [], game.currentArea, false, null, GAME_CONSTANTS.MAX_PARTY_SIZE);

    return true; // 全てのガーゴイルに勝利
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
        monsterToOffer = getUniqueRandomMonsters(game, 1, potentialTemplates, false, 0, game.coinSizeLimit, random)[0];
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
            playSfx("加入").catch(e => console.error("加入の効果音の再生に失敗しました:", e));

            game.milk--;
            game.party.push(monsterToOffer);
            logMessage(`<span class="monster-name-color">${monsterToOffer.name}</span> が仲間になったよ！`);
            updateUI(game, coinAttributesMap, [], null, false, null, GAME_CONSTANTS.MAX_PARTY_SIZE);
        } else {
            // NGの効果音を再生
            playSfx("NG").catch(e => console.error("NGの効果音の再生に失敗しました:", e));

            logMessage("おじさんのミルクが空っぽだから、彼女を仲間にできなかったよ。");
        }
    }
    else {
        playSfx("選択").catch(e => console.error("選択の効果音の再生に失敗しました:", e));
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

    // 選出されたモン娘の複製を作成
    // Monsterクラスのコンストラクタがname, coinAttributes, upkeepを受け取ることを確認
    const sisterMonster = new Monster(
        selectedMonster.name,
        [...selectedMonster.coinAttributes], // 硬貨属性も複製
        selectedMonster.upkeep,
        selectedMonster.hasBeenSentToBattle // フラグも複製するかどうかはゲームデザインによる
    );

    // 複製したモン娘を仲間に加える
    partyList.push(sisterMonster);
    logMessage(`${selectedMonster.name}の生き別れた血の繋がっていない妹が現れた！`);
    logMessage(`${sisterMonster.name}が仲間になった！`);

    // 加入の効果音を再生
    playSfx("加入").catch(e => console.error("加入の効果音の再生に失敗しました:", e));

    // UIを更新して新しい仲間を表示
    updateUI(game, coinAttributesMap, [], game.currentArea, false, null, GAME_CONSTANTS.MAX_PARTY_SIZE);

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

    // ランダムに1つ選択
    const chosenCoin = availableCoins[Math.floor(random() * availableCoins.length)];
    game.favour.push(chosenCoin.id); // game.favour に硬貨のIDを追加

    const coinHtml = createCoinTooltipHtml(chosenCoin.id, coinAttributesMap);
    logMessage(`神様から ${coinHtml} の硬貨を授かったよ！`);

    // 寵愛の効果音を再生
    playSfx("寵愛").catch(e => console.error("寵愛の効果音の再生に失敗しました:", e));

    updateUI(game, coinAttributesMap, [], null, false, null, GAME_CONSTANTS.MAX_PARTY_SIZE); // UIを更新して表示を反映
 
    clearActionArea();
}

/**
 * 食料を対価にプレイヤーがランダムな硬貨を獲得するイベントを処理する。
 * @returns {Promise<void>}
 */
async function handleFoodSacrificeEvent() {
    clearActionArea();
    logMessage(`<br/>`);
    logMessage(`\n<div id="game-messages-phase">--- 祈り ---</div>`);

    const foodCost = GAME_CONSTANTS.FOOD_SACRIFICE_COST + game.days * GAME_CONSTANTS.FOOD_SACRIFICE_RATE;
    logMessage(`神様に食料 ${foodCost} を捧げる？ (現在の食料: ${game.food})`);

    const actionArea = document.getElementById('action-area');
    const sacrificeButton = document.createElement('button');
    sacrificeButton.innerText = `捧げる`;
    sacrificeButton.dataset.value = 'sacrifice';
    actionArea.appendChild(sacrificeButton);

    const skipEventButton = document.createElement('button');
    skipEventButton.innerText = `また今度`;
    skipEventButton.dataset.value = 'skipEvent';
    actionArea.appendChild(skipEventButton);

    const initialChoice = await waitForButtonClick();
    clearActionArea(); // Initial choice buttons cleared

    if (initialChoice === 'skipEvent') {
        playSfx("選択").catch(e => console.error("選択の効果音の再生に失敗しました:", e));
        logMessage("今夜はやめておくよ。");
        return; // Exit the function
    }

    if (initialChoice === 'sacrifice') {
        if (game.food < foodCost) {
            // NGの効果音を再生
            playSfx("NG").catch(e => console.error("NGの効果音の再生に失敗しました:", e));

            logMessage("食料が足りないよ。");
            return;
        }

        playSfx("選択").catch(e => console.error("選択の効果音の再生に失敗しました:", e));

        const availableCoins = coinAttributesMap.filter(coin => coin.id !== 'enemy');
        const chosenCoins = [];
        while (chosenCoins.length < 3) {
            const randomIndex = Math.floor(random() * availableCoins.length);
            const selectedCoin = availableCoins[randomIndex];
            if (!chosenCoins.includes(selectedCoin)) {
                chosenCoins.push(selectedCoin);
            }
        }

        logMessage(`以下の硬貨の中から1つを選んでね。`);
        // actionArea is already cleared by previous clearActionArea()
        chosenCoins.forEach((coin, index) => {
            const button = document.createElement('button');
            button.className = 'choice-button';
            const coinHtml = createCoinTooltipHtml(coin.id, coinAttributesMap);
            button.innerHTML = `${coinHtml}`;
            button.dataset.value = index.toString();
            actionArea.appendChild(button);

            button.addEventListener('mouseover', (event) => showCoinTooltip(event, coin.id, coinAttributesMap));
            // クリックした際にツールチップを非表示にするイベントリスナーを追加
            button.addEventListener('click', () => hideCoinTooltip());
            button.addEventListener('mouseout', hideCoinTooltip);
        });

        const coinChoice = await waitForButtonClick();
        hideCoinTooltip(); // Tooltip hidden regardless of user choice
        clearActionArea(); // Clear buttons after coin selection

        const chosenCoinIndex = parseInt(coinChoice);
        const acquiredCoin = chosenCoins[chosenCoinIndex];
        game.food -= foodCost; // Deduct food only if a coin is acquired
        game.favour.push(acquiredCoin.id); // favour に硬貨のIDを追加

        const acquiredCoinHtml = createCoinTooltipHtml(acquiredCoin.id, coinAttributesMap);
        logMessage(`食料 ${foodCost} を捧げて、${acquiredCoinHtml} の硬貨を授かったよ！`);
        // 寵愛の効果音を再生
        playSfx("寵愛").catch(e => console.error("寵愛の効果音の再生に失敗しました:", e));

        updateUI(game, coinAttributesMap, [], null, false, null, GAME_CONSTANTS.MAX_PARTY_SIZE);
    }
    clearActionArea();
}


/**
 * ５：野営フェーズ。
 * 探索で食料を獲得し、食費と戦闘手当を消費する。食料が尽きた場合の処理も含む。
 * @param {Monster[]} expeditionParty - 探索に派遣されたモン娘の配列。
 * @param {object} currentArea - 現在の地形情報。
 * @returns {Promise<boolean|string>} 野営成功でtrue、ゲームオーバーでfalse、ミルク消費で'recovered'。
 */
async function conductCamp(expeditionParty, currentArea) {
    logMessage(`<br/>`);
    logMessage(`\n<div id="game-messages-phase">--- 野営フェーズ ---</div>`);
    game.currentPhase = 'campPhase';

    // 野営の効果音を再生
    playSfx("野営").catch(e => console.error("野営の効果音の再生に失敗しました:", e));

    let foodGained = 0;
    expeditionParty.forEach(monster => {
        let monsterFoodContribution = GAME_CONSTANTS.FOOD_SUPPLY;

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

    // 食費の計算
    game.upkeep = game.party.reduce((total, monster) => total + monster.upkeep, 0);
    let totalFoodConsumption = game.upkeep + game.battleAllowance;

    if (game.playerLife.name === '農家') {
        logMessage(`農家の力で効率良く食料を消費したよ。合計食料消費量: ${totalFoodConsumption} → ${Math.floor(totalFoodConsumption * GAME_CONSTANTS.FARMER_SAVINGS)}`);
        totalFoodConsumption = Math.floor(totalFoodConsumption * GAME_CONSTANTS.FARMER_SAVINGS);
    }

    logMessage(`仲間の食費: ${game.upkeep}`);
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

    // 食料を対価に硬貨を獲得するイベントを発生させる
    await handleFoodSacrificeEvent();

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
 * ゲームを終了する際の処理。
 * @param {boolean} isCleared - ゲームがクリアされたかどうか。
 */
function endGame(isCleared) {
    stopMusic(); // ゲーム終了時に音楽を停止
    clearActionArea();
    toggleInitialSetupArea(true); // 初期セットアップエリアを再表示
    updateUI(game, coinAttributesMap, [], null, false, null, GAME_CONSTANTS.MAX_PARTY_SIZE); // UIを初期状態にリセット

    const homunculusContainer = document.getElementById('homunculus-container');
    const homunculusImage = document.getElementById('homunculus-image');
    const rightAlchemyImage = document.getElementById('right-alchemy-image');
    const leftAlchemyImage = document.getElementById('left-alchemy-image');

    if (isCleared) {
        playMusic('勝利');
        logMessage("やったね！　王子を救出したよ！");
        logMessage("<br>");
        logMessage("そして王様から頂いた100億円で高名な錬金術師雇い、遂に僕もフラスコの外に出られたよ！");
        logMessage("おじさん、ありがとう！");
        
        // ゲームクリア後のホムンクルスと錬金術師の表示
        if (homunculusImage && imagePaths["外に出たホムンクルス"]) {
            homunculusImage.src = imagePaths["外に出たホムンクルス"];
            homunculusImage.style.width = '200px'; // 画像サイズの調整
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
        // ハッピーエンドの効果音を再生
        playSfx("ハッピーエンド").catch(e => console.error("ハッピーエンドの効果音の再生に失敗しました:", e));

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
    logMessage("連邦の中枢に到達！");
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

    playSfx("移動").catch(e => console.error("移動の効果音の再生に失敗しました:", e));

    logMessage(`敵は${finalBossArea.name}にあり！`);
    game.currentArea = finalBossArea; // 現在の地形を設定
    updateUI(game, coinAttributesMap, [], game.currentArea, false, null, GAME_CONSTANTS.MAX_PARTY_SIZE);

    const encounters = FINAL_BOSS_ENCOUNTERS[finalBossArea.id];

    // 戦闘の前に、パーティメンバーのhasBeenSentToBattleフラグをリセット
    game.party.forEach(monster => monster.hasBeenSentToBattle = false);

    // 3連戦のループ
    for (let i = 0; i < encounters.length; i++) {
        logMessage(`\nラスボス戦：第${i + 1}戦目開始！`);
        const enemiesToGenerateData = encounters[i];
        const finalBossEnemies = [];

        for (const enemyData of enemiesToGenerateData) {
            const template = monsterTemplates.find(mt => mt.name === enemyData.name);
            for (let k = 0; k < enemyData.count; k++) {
                // ラスボスはenemy属性を持つため、そのまま生成
                finalBossEnemies.push(new Monster(template.name, [...template.coins], template.upkeep));
            }
        }

        game.currentEnemies = finalBossEnemies; // 現在の敵を設定 (UI更新用)
        updateUI(game, coinAttributesMap, game.currentEnemies, game.currentArea, false, null, GAME_CONSTANTS.MAX_PARTY_SIZE);

        // 戦闘ロジックを呼び出す
        const battleResult = await conductFight(game, game.party, game.currentEnemies, random, game.currentArea, 'boss');

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
 * イベントを発生させる。
 * @param {Monster[]} partyList - プレイヤーのパーティのモン娘配列。
 * @param {Object} currentArea - 地形。
 */
async function event(partyList, currentArea) {
    logMessage(`<br/>`);
    logMessage(`\n<div id="game-messages-phase">--- イベントフェーズ ---</div>`);
    game.currentPhase = 'event';

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
            playSfx("警告").catch(e => console.error("警告の効果音の再生に失敗しました:", e));

            await startFinalBossBattle();
            return; // ラスボス戦終了後はゲームループを抜ける

        } else if (game.days === GAME_CONSTANTS.BOSS_DAYS) {
            // 警告の効果音を再生
            playSfx("警告").catch(e => console.error("警告の効果音の再生に失敗しました:", e));

            logMessage("\n--- 関所の番人、現る！ ---");
            game.currentPhase = 'areaSelection'; // 地形選択フェーズ
            currentArea = await selectExplorationArea(); // ボス戦でも地形選択は必要
            if (game.food < 0) break;

            const bossBattleSuccess = await handleBossBattle(currentArea); // currentAreaを渡す
            if (!bossBattleSuccess) {
                endGame(false);
                return; // ゲームオーバー
            } else {
                updateUI(game, coinAttributesMap, [], game.currentArea, false, null, GAME_CONSTANTS.MAX_PARTY_SIZE);
                // ボス戦後は全員待機状態に戻る
                expeditionParty = [];
                restingParty = game.party;
            }
        } else {
            // 通常のゲームフロー

            // 夜明けの効果音を再生
            playSfx("夜明け").catch(e => console.error("夜明けの効果音の再生に失敗しました:", e));

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

            // イベントフェーズに入る前にワンクッション置く
            game.currentPhase = 'campPreparation';
            const actionArea = document.getElementById('action-area');
            if (actionArea) {
                actionArea.innerHTML = '<button id="conduct-camp-button" data-value="conduct-camp">次へ</button>';
            }
            await waitForButtonClick(); // ボタンがクリックされるまで待機

            // イベント発生
            await event(game.party, currentArea); // partyListをgame.partyに変更
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
        if (game.playerLife.name === '炉裏魂') {
            game.milk++;
        }

        if (game.days < GAME_CONSTANTS.MAX_DAYS && game.food >= 0) { // MAX_DAYSの前日までは次の日へ進むボタン
            const actionArea = document.getElementById('action-area');
            if (actionArea) actionArea.innerHTML = '<button id="next-day-button" data-value="next-day">次の日へ</button>';
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
    game.estimatedFoodGain = 0;
    game.upkeep = 0;
    game.currentPhase = 'initial';
    game.favour = []; // 神の寵愛もリセット
    game.playerLife = null; // プレイヤーの生い立ちもリセット

    // パーティメンバーのhasBeenSentToBattleフラグを初期化（ゲーム開始時にもリセット）
    game.party.forEach(monster => monster.hasBeenSentToBattle = false);

    const gameMessages = document.getElementById('game-messages');
    if (gameMessages) gameMessages.innerHTML = '<p>冒険に出発だ！</p>';
    clearActionArea();
    toggleInitialSetupArea(true);

    // ホムンクルスの画像を初期状態に戻す
    const homunculusImage = document.getElementById('homunculus-image');
    // homunculusContainerはstyle.cssで固定位置のオーバーレイとして定義されているため、
    // ここでpositionやmarginをリセットする必要はありません。
    // homunculusImageのサイズもstyle.cssで定義されているため、ここではリセットしません。
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
    const playerLifeImage = document.getElementById('player-life-image');
    const toggleCoinDisplayButton = document.getElementById('toggle-coin-display-button');

    // 音楽プレイヤーの初期化
    await initMusicPlayer();

    // imagePaths.json から効果音のパスを読み込む
    try {
        const response = await fetch('./imagePaths.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        imagePaths = await response.json();
    } catch (error) {
        console.error("imagePaths.json の読み込み中にエラーが発生しました:", error);
    }

    // 硬貨表示切り替えボタンのイベントリスナー
    if (toggleCoinDisplayButton) {
        toggleCoinDisplayButton.addEventListener('click', () => {
            toggleCoinDisplay();
            // 削除: updateUI(game, coinAttributesMap, [], null, false, null, GAME_CONSTANTS.MAX_PARTY_SIZE);
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
            game.currentSeed = seedValue;
            random = mulberry32(seedValue); // 乱数生成器を初期化

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
            game.upkeep = 0; // 食費もリセット
            game.currentPhase = 'initial'; // フェーズを初期状態に戻す
            game.favour = []; // 神の寵愛もリセット
            game.coinSizeLimit = game.playerLife.name === '炉裏魂' ? 3 : Infinity;

            // パーティメンバーのhasBeenSentToBattleフラグを初期化（ゲーム開始時にもリセット）
            game.party.forEach(monster => monster.hasBeenSentToBattle = false);

            if (gameMessages) {
                gameMessages.innerHTML = ''; // メッセージエリアをクリア
                logMessage("過酷な旅路が始まるよ！");
            } else {
                console.error("DOM element 'game-messages' not found at game start.");
            }

            // 生い立ち画像を表示
            if (playerLifeImage && game.playerLife && imagePaths[game.playerLife.name]) {
                playerLifeImage.src = imagePaths[game.playerLife.name];
                playerLifeImage.style.display = 'block'; // 画像を表示
                // 生い立ち画像にツールチップイベントリスナーを追加
                playerLifeImage.addEventListener('mouseover', (event) => showLifeTooltip(game.playerLife, event.currentTarget));
                playerLifeImage.addEventListener('mouseout', hideLifeTooltip);
            } else {
                console.warn("プレイヤーの生い立ち画像または対応する画像パスが見つかりませんでした。");
                if (playerLifeImage) {
                    playerLifeImage.style.display = 'none'; // 画像を非表示
                }
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
