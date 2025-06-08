// battle.js

import { Monster } from './monster.js';
import { playCoinTossAnimation } from './coinAnimation.js';
import {
    logMessage,
    updateUI,
    waitForButtonClick,
    clearActionArea,
    showCombatLogModal,
    getCoinAttributeName
} from './uiManager.js';
import { coinAttributesMap, GAME_CONSTANTS } from './data.js';
import { playSfx } from './musicManager.js'; // playSfxをインポート


/**
 * 戦闘を処理する関数。ボス戦と通常戦闘の両方に対応。
 * @param {object} game - 現在のゲーム状態オブジェクト (game.jsのgameオブジェクト全体)。
 * @param {Monster[]} party - プレイヤーのパーティのモン娘配列 (conductFightがgame.partyを直接操作するため、gameオブジェクト全体を渡す必要がある)。
 * @param {Monster[]} enemies - 敵のモン娘配列。
 * @param {Function} random - 疑似乱数生成関数。
 * @param {object} currentArea - 現在の地形情報。
 * @param {boolean} isBossBattle - ボス戦かどうかを示すフラグ。
 * @returns {Promise<object>} 戦闘結果 (won: boolean)。
 */
export async function conductFight(game, party, enemies, random, currentArea, isBossBattle = false) {
    let selectedPartyMonsters = [];
    let currentFightFoodAllowance;

    // soundPaths.json から効果音のパスを読み込む
    let soundPaths;
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

    // game.jsで定義されている createCoinTooltipHtml を battle.js でも使用できるように定義
    // uiManager.jsのgetCoinAttributeNameとcoinAttributesMapを使用
    const createCoinTooltipHtml = (coinId, map, opacity = 1) => {
        const styledCoinHtml = getCoinAttributeName(coinId, map, opacity);
        // HTMLのonclick属性などが埋め込まれたHTML文字列を返す
        return `<span class="coin-tooltip-target" data-coin-id="${coinId}" onmouseover="window.showCoinTooltip(event, '${coinId}', window.coinAttributesMap)" onmouseout="window.hideCoinTooltip()">${styledCoinHtml}</span>`;
    };

    if (isBossBattle) {
        // ボス戦では、現在使用可能なモン娘のみを選択肢として提示
        const availableMonsters = party.filter(m => !m.hasBeenSentToBattle);
        if (availableMonsters.length === 0) {
            return { won: false, foodGain: 0, milkGain: 0 };
        }

        // ここに敵モン娘の情報を表示する処理を追加
        logMessage("対戦相手の情報:");
        enemies.forEach(enemy => {
            const enemyCoinHtml = enemy.coinAttributes.map(attrId => createCoinTooltipHtml(attrId, coinAttributesMap)).join(' ');
            logMessage(`- <span class="monster-name-color">${enemy.name}</span> ( ${enemyCoinHtml} )`);
        });
        logMessage("上記の敵を相手に戦うモン娘を選んでください！");

        selectedPartyMonsters = await selectBattleParty(game, availableMonsters); // gameオブジェクトを渡す
        if (selectedPartyMonsters.length === 0) {
            logMessage("モン娘が選択されませんでした。戦闘を回避します。");
            return { won: false, foodGain: 0, milkGain: 0 };
        }
        // 派遣されたモン娘にhasBeenSentToBattleフラグを立てる
        selectedPartyMonsters.forEach(m => {
            m.hasBeenSentToBattle = true;
        });
    } else {
        selectedPartyMonsters = party; // 通常の探索戦闘では全員参加
    }

    // 戦闘ログを一時的に保持する配列
    const combatLogMessages = [];

    // 戦闘開始メッセージ
    combatLogMessages.push(`<h3>戦闘開始！</h3>`);
    enemies.forEach(enemyMonster => {
        const enemyCoinHtml = enemyMonster.coinAttributes.map(attrId => createCoinTooltipHtml(attrId, coinAttributesMap)).join(' ');
        combatLogMessages.push(`<p>敵: <span class="monster-name-color">${enemyMonster.name}</span> ( ${enemyCoinHtml} )</p>`);
    });

    const partyList = document.getElementById('party-list');
    selectedPartyMonsters.forEach(monster => {
        const li = partyList ? partyList.querySelector(`li[data-index="${game.party.indexOf(monster)}"]`) : null;
        if (li) {
            li.classList.add('resting-in-raid'); // 戦闘中のスタイルを適用
        }
    });

    let fightAttempts = 0;
    combatLogMessages.push(`<p>コイントスで撃退しましょう！<br>**${GAME_CONSTANTS.RAID_MAX_ATTEMPTS}回まで**コイントスに挑戦できます。</p>`);

    // 初回のポップアップ表示
    await showCombatLogModal(`戦闘ログ コイントス(${fightAttempts + 1}回目)`, combatLogMessages.join(''), 'コイントス開始');
    combatLogMessages.length = 0; // ポップアップ表示後、ログをクリア

    let wins = 0;
    while (fightAttempts < GAME_CONSTANTS.RAID_MAX_ATTEMPTS) {
        await playCoinTossAnimation(random);
        fightAttempts++;

        // game.js から updateUI を呼び出すための依存関係は、conductFight の引数として game オブジェクトを渡すことで解決
        updateUI(game, coinAttributesMap, enemies, currentArea, false, null, GAME_CONSTANTS.MAX_PARTY_SIZE); // 敵を表示

        let partyActualCombatPower = 0;
        let enemyActualCombatPower = 0;
        const partyIndividualCombatPowers = [];
        const enemyIndividualCombatPowers = [];

        // 味方モン娘のコイントス結果
        const partyCoinOutcomes = selectedPartyMonsters.map(monster => {
            const outcomes = monster.coinAttributes.map(coinAttr => {
                let isHead;
                // 地形と硬貨が一致する場合は必ず表
                if (currentArea.coinAttributes.includes(coinAttr)) {
                    isHead = true;
                } else if (['oni', 'enemy'].includes(coinAttr)) {
                    isHead = true;
                } else {
                    isHead = random() < 0.5;
                }
                if (['scale'].includes(coinAttr) && !isHead) {
                    isHead = random() < 0.5;
                }
                return { type: coinAttr, isHead: isHead };
            });
            return { monster: monster, outcomes: outcomes };
        });

        // 敵モン娘のコイントス結果
        const allEnemyCoinOutcomes = enemies.map(enemyMonster => {
            const outcomes = enemyMonster.coinAttributes.map(coinAttr => {
                let isHead;
                // 地形と硬貨が一致する場合は必ず表
                if (currentArea.coinAttributes.includes(coinAttr)) {
                    isHead = true;
                } else if (['oni', 'enemy'].includes(coinAttr)) {
                    isHead = true;
                } else {
                    isHead = random() < 0.5;
                }
                if (['scale'].includes(coinAttr) && !isHead) {
                    isHead = random() < 0.5;
                }
                return { type: coinAttr, isHead: isHead };
            });
            return { monster: enemyMonster, outcomes: outcomes };
        });

        combatLogMessages.push("<h4>--- コイントス結果 ---</h4>");
        partyCoinOutcomes.forEach(mOutcome => {
            let outcomeStr = mOutcome.outcomes.map(c => {
                const opacity = c.isHead ? 1 : GAME_CONSTANTS.COIN_TAIL_OPACITY;
                const coinNameHtml = createCoinTooltipHtml(c.type, coinAttributesMap, opacity);
                return `${coinNameHtml}`;
            }).join(' ');
            combatLogMessages.push(`<p>味方 <span class="monster-name-color">${mOutcome.monster.name}</span>: ${outcomeStr}</p>`);
        });
        allEnemyCoinOutcomes.forEach(mOutcome => {
            let enemyOutcomeStr = mOutcome.outcomes.map(c => {
                const opacity = c.isHead ? 1 : GAME_CONSTANTS.COIN_TAIL_OPACITY;
                const coinNameHtml = createCoinTooltipHtml(c.type, coinAttributesMap, opacity);
                return `${coinNameHtml}`;
            }).join(' ');
            combatLogMessages.push(`<p>敵 <span class="monster-name-color">${mOutcome.monster.name}</span>: ${enemyOutcomeStr}</p>`);
        });
        combatLogMessages.push("<p>--------------------</p>");

        const partyMagicCoins = partyCoinOutcomes.flatMap(m => m.outcomes).filter(c => c.type === 'magic');
        const enemyMagicCoins = allEnemyCoinOutcomes.flatMap(m => m.outcomes).filter(c => c.type === 'magic');

        if (partyMagicCoins.length > enemyMagicCoins.length) {
            partyMagicCoins.forEach(coin => coin.isHead = true);
            combatLogMessages.push(`<p>味方の${createCoinTooltipHtml('magic', coinAttributesMap)}の力が敵を上回り、全ての魔の硬貨が表になりました！</p>`);
        }
        if (partyMagicCoins.length < enemyMagicCoins.length) {
            enemyMagicCoins.forEach(coin => coin.isHead = true);
            combatLogMessages.push(`<p>敵の${createCoinTooltipHtml('magic', coinAttributesMap)}の力が味方を上回り、全ての魔の硬貨が表になりました！</p>`);
        }

        partyIndividualCombatPowers.push(...partyCoinOutcomes.map(mOutcome => {
            let currentMonsterPower = 0;
            mOutcome.outcomes.forEach(coin => {
                if (coin.isHead) {
                    currentMonsterPower += ((coin.type === 'iron' || coin.type === 'power') ? 2 : 1);
                }
            });
            return { monster: mOutcome.monster, power: currentMonsterPower, originalOutcomes: mOutcome.outcomes };
        }));

        enemyIndividualCombatPowers.push(...allEnemyCoinOutcomes.map(mOutcome => {
            let currentEnemyPower = 0;
            mOutcome.outcomes.forEach(coin => {
                if (coin.isHead) {
                    currentEnemyPower += ((coin.type === 'iron' || coin.type === 'power') ? 2 : 1);
                }
            });
            return { monster: mOutcome.monster, power: currentEnemyPower, originalOutcomes: mOutcome.outcomes };
        }));

        // 神の寵愛を戦力値に加算
        applyFavourEffectsToIndividualMonsters(game, partyIndividualCombatPowers, coinAttributesMap);

        // 漁、弓、毒、雷、火の硬貨の特殊効果 (味方側)
        let partyFishingHeads = partyCoinOutcomes.flatMap(m => m.outcomes).filter(c => c.type === 'fishing' && c.isHead).length;
        let partyBowHeads = partyCoinOutcomes.flatMap(m => m.outcomes).filter(c => c.type === 'bow' && c.isHead).length;
        let partyPoisonHeads = partyCoinOutcomes.flatMap(m => m.outcomes).filter(c => c.type === 'poison' && c.isHead).length;
        let partyThunderHeads = partyCoinOutcomes.flatMap(m => m.outcomes).filter(c => c.type === 'thunder' && c.isHead).length;
        let partyFireHeads = partyCoinOutcomes.flatMap(m => m.outcomes).filter(c => c.type === 'fire' && c.isHead).length;

        if (partyFishingHeads > 0) {
            for (const e of enemyIndividualCombatPowers) {
                if (e.originalOutcomes.some(o => o.type === 'water')) {
                    e.power = Math.max(0, e.power - partyFishingHeads);
                    combatLogMessages.push(`<p>味方の${createCoinTooltipHtml('fishing', coinAttributesMap)}の力で、敵モン娘「<span class="monster-name-color">${e.monster.name}</span>」(${createCoinTooltipHtml('water', coinAttributesMap)}硬貨持ち)の戦力値が ${partyFishingHeads} 減少しました！</p>`);
                }
            }
        }
        if (partyBowHeads > 0) {
            for (const e of enemyIndividualCombatPowers) {
                if (e.originalOutcomes.some(o => o.type === 'sky')) {
                    e.power = Math.max(0, e.power - partyBowHeads);
                    combatLogMessages.push(`<p>味方の${createCoinTooltipHtml('bow', coinAttributesMap)}の力で、敵モン娘「<span class="monster-name-color">${e.monster.name}</span>」(${createCoinTooltipHtml('sky', coinAttributesMap)}硬貨持ち)の戦力値が ${partyBowHeads} 減少しました！</p>`);
                }
            }
        }
        if (partyPoisonHeads > 0) {
            for (const e of enemyIndividualCombatPowers) {
                if (!e.originalOutcomes.some(o => o.type === 'poison')) {
                    e.power = Math.max(0, e.power - partyPoisonHeads);
                    combatLogMessages.push(`<p>味方の${createCoinTooltipHtml('poison', coinAttributesMap)}の力で、敵モン娘「<span class="monster-name-color">${e.monster.name}</span>」(${createCoinTooltipHtml('poison', coinAttributesMap)}硬貨なし)の戦力値が ${partyPoisonHeads} 減少しました！</p>`);
                }
            }
        }
        if (partyThunderHeads > 0) {
            for (const e of enemyIndividualCombatPowers) {
                if (!e.originalOutcomes.some(o => o.type === 'thunder')) {
                    e.power = Math.max(0, e.power - partyThunderHeads);
                    combatLogMessages.push(`<p>味方の${createCoinTooltipHtml('thunder', coinAttributesMap)}の力で、敵モン娘「<span class="monster-name-color">${e.monster.name}</span>」(${createCoinTooltipHtml('thunder', coinAttributesMap)}硬貨なし)の戦力値が ${partyThunderHeads} 減少しました！</p>`);
                }
            }
        }
        if (partyFireHeads > 0) {
            for (const e of enemyIndividualCombatPowers) {
                if (!e.originalOutcomes.some(o => o.type === 'fire')) {
                    e.power = Math.max(0, e.power - partyFireHeads);
                    combatLogMessages.push(`<p>味方の${createCoinTooltipHtml('fire', coinAttributesMap)}の力で、敵モン娘「<span class="monster-name-color">${e.monster.name}</span>」(${createCoinTooltipHtml('fire', coinAttributesMap)}硬貨なし)の戦力値が ${partyFireHeads} 減少しました！</p>`);
                }
            }
        }

        // 漁、弓、毒の硬貨の特殊効果 (敵側)
        let enemyFishingHeads = allEnemyCoinOutcomes.flatMap(m => m.outcomes).filter(c => c.type === 'fishing' && c.isHead).length;
        let enemyBowHeads = allEnemyCoinOutcomes.flatMap(m => m.outcomes).filter(c => c.type === 'bow' && c.isHead).length;
        let enemyPoisonHeads = allEnemyCoinOutcomes.flatMap(m => m.outcomes).filter(c => c.type === 'poison' && c.isHead).length;
        let enemyThunderHeads = allEnemyCoinOutcomes.flatMap(m => m.outcomes).filter(c => c.type === 'thunder' && c.isHead).length;
        let enemyFireHeads = allEnemyCoinOutcomes.flatMap(m => m.outcomes).filter(c => c.type === 'fire' && c.isHead).length;

        if (enemyFishingHeads > 0) {
            for (const p of partyIndividualCombatPowers) {
                if (p.originalOutcomes.some(o => o.type === 'water')) {
                    p.power = Math.max(0, p.power - enemyFishingHeads);
                    combatLogMessages.push(`<p>敵の${createCoinTooltipHtml('fishing', coinAttributesMap)}の力で、味方モン娘「<span class="monster-name-color">${p.monster.name}</span>」(${createCoinTooltipHtml('water', coinAttributesMap)}硬貨持ち)の戦力値が ${enemyFishingHeads} 減少しました！</p>`);
                }
            }
        }
        if (enemyBowHeads > 0) {
            for (const p of partyIndividualCombatPowers) {
                if (p.originalOutcomes.some(o => o.type === 'sky')) {
                    p.power = Math.max(0, p.power - enemyBowHeads);
                    combatLogMessages.push(`<p>敵の${createCoinTooltipHtml('bow', coinAttributesMap)}の力で、味方モン娘「<span class="monster-name-color">${p.monster.name}</span>」(${createCoinTooltipHtml('sky', coinAttributesMap)}硬貨持ち)の戦力値が ${enemyBowHeads} 減少しました！</p>`);
                }
            }
        }
        if (enemyPoisonHeads > 0) {
            for (const p of partyIndividualCombatPowers) {
                if (!p.originalOutcomes.some(o => o.type === 'poison')) {
                    p.power = Math.max(0, p.power - enemyPoisonHeads);
                    combatLogMessages.push(`<p>敵の${createCoinTooltipHtml('poison', coinAttributesMap)}の力で、味方モン娘「<span class="monster-name-color">${p.monster.name}</span>」(${createCoinTooltipHtml('poison', coinAttributesMap)}硬貨なし)の戦力値が ${enemyPoisonHeads} 減少しました！</p>`);
                }
            }
        }
        if (enemyThunderHeads > 0) {
            for (const p of partyIndividualCombatPowers) {
                if (!p.originalOutcomes.some(o => o.type === 'thunder')) {
                    p.power = Math.max(0, p.power - enemyThunderHeads);
                    combatLogMessages.push(`<p>敵の${createCoinTooltipHtml('thunder', coinAttributesMap)}の力で、味方モン娘「<span class="monster-name-color">${p.monster.name}</span>」(${createCoinTooltipHtml('thunder', coinAttributesMap)}硬貨なし)の戦力値が ${enemyThunderHeads} 減少しました！</p>`);
                }
            }
        }
        if (enemyFireHeads > 0) {
            for (const p of partyIndividualCombatPowers) {
                if (!p.originalOutcomes.some(o => o.type === 'fire')) {
                    p.power = Math.max(0, p.power - enemyFireHeads);
                    combatLogMessages.push(`<p>敵の${createCoinTooltipHtml('fire', coinAttributesMap)}の力で、味方モン娘「<span class="monster-name-color">${p.monster.name}</span>」(${createCoinTooltipHtml('fire', coinAttributesMap)}硬貨なし)の戦力値が ${enemyFireHeads} 減少しました！</p>`);
                }
            }
        }

        partyActualCombatPower = partyIndividualCombatPowers.reduce((sum, m) => sum + m.power, 0);
        enemyActualCombatPower = enemyIndividualCombatPowers.reduce((sum, m) => sum + m.power, 0);

        combatLogMessages.push("<h4>--- 個別戦力値 ---</h4>");
        for (const m of partyIndividualCombatPowers) { // For...ofループを使用
            combatLogMessages.push(`<p>味方 <span class="monster-name-color">${m.monster.name}</span>: 戦力値 ${m.power}</p>`);
        }
        for (const e of enemyIndividualCombatPowers) { // For...ofループを使用
            combatLogMessages.push(`<p>敵 <span class="monster-name-color">${e.monster.name}</span>: 戦力値 ${e.power}</p>`);
        }
        combatLogMessages.push("<p>--------------------</p>");

        // 戦闘手当計算
        // game.battleAllowance の計算はgame.jsのメインループに任せる
        currentFightFoodAllowance = selectedPartyMonsters.reduce((sum, monster) => sum + monster.totalCoins, 0) * fightAttempts;

        // 血の硬貨の特殊効果 (戦闘手当減少)
        const bloodAmounts = partyCoinOutcomes.flatMap(m => m.outcomes).filter(c => c.type === 'blood').length;
        if (bloodAmounts > 0) {
            currentFightFoodAllowance = Math.max(0, currentFightFoodAllowance - bloodAmounts);
            combatLogMessages.push(`<p>味方の${createCoinTooltipHtml('blood', coinAttributesMap)}の力で、戦闘手当が ${bloodAmounts} 減少しました！ (現在の手当: ${currentFightFoodAllowance})</p>`);
        }

        // 花の硬貨の特殊効果 (戦闘手当減少)
        const flowerHeads = partyCoinOutcomes.flatMap(m => m.outcomes).filter(c => c.type === 'flower' && c.isHead).length;
        if (flowerHeads > 0) {
            const originalAllowance = currentFightFoodAllowance;
            const reductionFactor = Math.pow(GAME_CONSTANTS.RAID_FLOWER_REDUCTION_FACTOR, flowerHeads);
            currentFightFoodAllowance = Math.max(0, Math.ceil(currentFightFoodAllowance * reductionFactor));
            const reducedAmount = originalAllowance - currentFightFoodAllowance;
            combatLogMessages.push(`<p>味方の${createCoinTooltipHtml('flower', coinAttributesMap)}の力で、戦闘手当が ${reducedAmount} 減少しました！ (現在の手当: ${currentFightFoodAllowance})</p>`);
        }

        // 総戦闘手当の保持
        game.battleAllowance = currentFightFoodAllowance;

        // 総戦力値の比較
        combatLogMessages.push(`<p>味方総戦力値: ${partyActualCombatPower}, 敵総戦力値: ${enemyActualCombatPower}</p>`);

        if (partyActualCombatPower >= enemyActualCombatPower) {
            combatLogMessages.push("<p><strong>勝利！</strong></p>");
            wins++; // 勝利カウントを増やす

            if (soundPaths && soundPaths["勝利"]) {
                playSfx(soundPaths["勝利"]).catch(e => console.error("勝利の効果音の再生に失敗しました:", e));
            }
        } else {
            combatLogMessages.push("<p><strong>敗北。</strong></p>");

            if (soundPaths && soundPaths["敗北"]) {
                playSfx(soundPaths["敗北"]).catch(e => console.error("敗北の効果音の再生に失敗しました:", e));
            }
        }

        // 戦闘ログポップアップを表示し、ユーザーが閉じるのを待つ
        await showCombatLogModal(`戦闘ログ コイントス(${fightAttempts}回目)`, combatLogMessages.join(''), '閉じる');
        combatLogMessages.length = 0; // ポップアップ表示後、ログをクリア

        if (wins >= 1) {
            break; // 勝利したらループを抜ける
        }
    }

    // 戦闘結果の最終判定
    if (wins >= 1) {
        logMessage("勝利！");
        // スタイルを解除
        selectedPartyMonsters.forEach(monster => {
            const li = partyList ? partyList.querySelector(`li[data-index="${game.party.indexOf(monster)}"]`) : null;
            if (li) {
                li.classList.remove('resting-in-raid');
            }
        });
        return { won: true, foodGain: 0, milkGain: 0 };
    } else {
        logMessage("負けちゃった！");
        clearActionArea();
        const actionArea = document.getElementById('action-area');
        if (actionArea) actionArea.innerHTML = '<button data-value="gameover-confirm">負けちゃった</button>';
        await waitForButtonClick();
        // スタイルを解除
        selectedPartyMonsters.forEach(monster => {
            const li = partyList ? partyList.querySelector(`li[data-index="${game.party.indexOf(monster)}"]`) : null;
            if (li) {
                li.classList.remove('resting-in-raid');
            }
        });
        return { won: false, foodGain: 0, milkGain: 0 };
    }
}

/**
 * 神の寵愛 (favour) の効果を適用し、戦闘に参加した個々のモン娘の戦力値に加算する。
 * @param {object} game - ゲームの状態オブジェクト。
 * @param {Array<Object>} partyIndividualCombatPowers - 戦闘に参加しているモン娘とその個別戦力値の配列。
 * 各要素は { monster: Monsterインスタンス, currentMonsterPower: number } の形式を想定。
 * @param {object} coinAttributesMap - 硬貨属性のマップ。
 */
function applyFavourEffectsToIndividualMonsters(game, partyIndividualCombatPowers, coinAttributesMap) {
    if (!game.favour || game.favour.length === 0) {
        return; // 神の寵愛がない場合は何もしない
    }

    game.favour.forEach(favourCoinId => {
        partyIndividualCombatPowers.forEach(powerEntry => {
            const monster = powerEntry.monster;
            // モン娘が寵愛と同じ硬貨属性を持っているかチェック
            if (monster.coinAttributes.includes(favourCoinId)) {
                // 寵愛と同じ属性を持つモン娘の総硬貨数を戦力値を加算
                powerEntry.power ++; // 個別の戦力値に加算
            }
        });
    });
}

/**
 * ボス戦に派遣する仲間モン娘を選択するフェーズ。
 * @param {object} game - 現在のゲーム状態オブジェクト。
 * @param {Monster[]} availableMonsters - 今回の戦闘で選択可能なモン娘の配列。
 * @returns {Promise<Monster[]>} 選択されたモン娘の配列。
 */
async function selectBattleParty(game, availableMonsters) {
    game.currentPhase = 'bossExpeditionSelection'; // ボス戦専用のフェーズ名を使用
    const selectedParty = [];

    logMessage("仲間モン娘の枠をクリックして派遣/待機を切り替えます。");

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
