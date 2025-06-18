// battle.js

import { Monster } from './monster.js';
import { playCoinTossAnimation } from './coinAnimation.js';
import {
    logMessage,
    updateUI,
    waitForButtonClick,
    clearActionArea,
    showCombatLogModal,
    createCoinTooltipHtml,
    getGroupedCoinDisplay // 新しく追加した関数をインポート
} from './uiManager.js';
import { coinAttributesMap, GAME_CONSTANTS } from './data.js';
import { playSfx } from './musicManager.js'; // playSfxをインポート
import { showSpeechBubble } from './speechBubbleManager.js';

/**
 * 戦闘を処理する関数。ボス戦と通常戦闘の両方に対応。
 * @param {object} game - 現在のゲーム状態オブジェクト (game.jsのgameオブジェクト全体)。
 * @param {Monster[]} party - プレイヤーのパーティのモン娘配列 (conductFightがgame.partyを直接操作するため、gameオブジェクト全体を渡す必要がある)。
 * @param {Monster[]} enemies - 敵のモン娘配列。
 * @param {Function} random - 疑似乱数生成関数。
 * @param {object} currentArea - 現在の地形情報。
 * @param {String} battleType - 戦闘の種類。
 * @returns {Promise<object>} 戦闘結果 (won: boolean)。
 */
export async function conductFight(game, party, enemies, random, currentArea, battleType) {
    let selectedPartyMonsters = [];
    let currentFightFoodAllowance;

    switch (battleType) {
        case 'boss':
            // ボス戦では、現在使用可能なモン娘のみを選択肢として提示
            const availableMonstersBoss = party.filter(m => !m.hasBeenSentToBattle);

            // ここに敵モン娘の情報を表示する処理を追加
            logMessage("対戦相手の情報:");
            enemies.forEach(enemy => {
                // 硬貨の表示をグループ化して表示
                const enemyCoinHtml = getGroupedCoinDisplay(enemy.allCoins, coinAttributesMap);
                logMessage(`- <span class="monster-name-color">${enemy.name}</span>  (${enemy.totalCoins})  ${enemyCoinHtml}`);
            });

            selectedPartyMonsters = await selectBattleParty(game, availableMonstersBoss, battleType);

            // 派遣されたモン娘にhasBeenSentToBattleフラグを立てる
            selectedPartyMonsters.forEach(m => {
                m.hasBeenSentToBattle = true;
            });
            break;

        case 'duel':
            // 決闘では、プレイヤーは仲間モン娘の中から一人選択して戦わせる
            // enemiesには常に1体の敵が渡される想定
            const availableMonstersDuel = party; // 決闘では全員選択可能

            // 決闘では1体のみ選択
            selectedPartyMonsters = await selectBattleParty(game, availableMonstersDuel, battleType);

            // 全てのパーティメンバーのhasBeenSentToBattleフラグをリセット
            game.party.forEach(monster => monster.hasBeenSentToBattle = false);
            break;

        default:
            selectedPartyMonsters = party; // 通常の探索戦闘では全員参加
    }

    // 戦闘ログを一時的に保持する配列
    const combatLogMessages = [];
    // 敵モン娘の画像パスを保持する配列
    const enemyImagePaths = [];

    // 戦闘開始メッセージ
    playSfx("戦闘開始").catch(e => console.error("効果音の再生に失敗しました:", e));
    combatLogMessages.push(`<h3>戦闘開始！</h3>`);
    enemies.forEach(enemyMonster => {
        // 硬貨の表示をグループ化して表示
        const enemyCoinHtml = getGroupedCoinDisplay(enemyMonster.allCoins, coinAttributesMap);
        combatLogMessages.push(`<p>敵: <span class="monster-name-color">${enemyMonster.name}</span>  (${enemyMonster.totalCoins})  ${enemyCoinHtml}</p>`);
        // 敵モン娘の画像パスを追加
        enemyImagePaths.push(enemyMonster.name);
    });

    const partyList = document.getElementById('party-list');
    selectedPartyMonsters.forEach(monster => {
        const li = partyList ? partyList.querySelector(`li[data-index="${game.party.indexOf(monster)}"]`) : null;
        if (li) {
            li.classList.add('resting-in-raid'); // 戦闘中のスタイルを適用
        }
    });

    let maxFightAttempts = GAME_CONSTANTS.RAID_MAX_ATTEMPTS;
    if (game.playerLife.name === '軍人') {
        maxFightAttempts += 2;
    }

    let fightAttempts = 0;
    combatLogMessages.push(`<p>**${maxFightAttempts}回まで**コイントスできるよ。</p>`);

    // 初回のポップアップ表示時に敵の画像パスを渡す
    await showCombatLogModal(`戦闘ログ コイントス(${fightAttempts + 1}回目)`, combatLogMessages.join(''), enemyImagePaths, 'コイントス開始');
    combatLogMessages.length = 0; // ポップアップ表示後、ログをクリア

    let wins = 0;

    while (fightAttempts < maxFightAttempts) {
        await playCoinTossAnimation(random);
        fightAttempts++;

        // game.js から updateUI を呼び出すための依存関係は、conductFight の引数として game オブジェクトを渡すことで解決
        updateUI(game, coinAttributesMap, enemies, currentArea, false, null, GAME_CONSTANTS.MAX_PARTY_SIZE); // 敵を表示

        let partyActualCombatPower = 0;
        let enemyActualCombatPower = 0;
        const partyIndividualCombatPowers = [];
        const enemyIndividualCombatPowers = [];

        // 味方モン娘のコイントス結果 (追加硬貨フラグを保持)
        const partyCoinOutcomes = selectedPartyMonsters.map(monster => {
            const normalOutcomes = monster.coinAttributes.map(coinAttr => ({ type: coinAttr, isAdditional: false }));
            const additionalOutcomes = monster.additionalCoins.map(coinAttr => ({ type: coinAttr, isAdditional: true }));
            const allOutcomes = [...normalOutcomes, ...additionalOutcomes];

            const outcomes = allOutcomes.map(outcome => {
                let isHead;
                if (currentArea.coinAttributes.includes(outcome.type)) {
                    isHead = true;
                } else if (['oni', 'enemy'].includes(outcome.type)) {
                    isHead = true;
                } else {
                    isHead = random() < 0.5;
                }
                if (['scale'].includes(outcome.type) && !isHead) {
                    isHead = random() < 0.5;
                }
                return { type: outcome.type, isHead: isHead, isAdditional: outcome.isAdditional };
            });
            return { monster: monster, outcomes: outcomes };
        });

        // 敵モン娘のコイントス結果 (追加硬貨フラグを保持)
        const allEnemyCoinOutcomes = enemies.map(enemyMonster => {
            const normalOutcomes = enemyMonster.coinAttributes.map(coinAttr => ({ type: coinAttr, isAdditional: false }));
            const additionalOutcomes = enemyMonster.additionalCoins.map(coinAttr => ({ type: coinAttr, isAdditional: true }));
            const allOutcomes = [...normalOutcomes, ...additionalOutcomes];

            const outcomes = allOutcomes.map(outcome => {
                let isHead;
                if (currentArea.coinAttributes.includes(outcome.type)) {
                    isHead = true;
                } else if (['oni', 'enemy'].includes(outcome.type)) {
                    isHead = true;
                } else {
                    isHead = random() < 0.5;
                }
                if (['scale'].includes(outcome.type) && !isHead) {
                    isHead = random() < 0.5;
                }
                return { type: outcome.type, isHead: isHead, isAdditional: outcome.isAdditional };
            });
            return { monster: enemyMonster, outcomes: outcomes };
        });

        combatLogMessages.push("<h4>--- コイントス結果 ---</h4>");
        partyCoinOutcomes.forEach(mOutcome => {
            let outcomeStr = mOutcome.outcomes.map(c => {
                const opacity = c.isHead ? 1 : GAME_CONSTANTS.COIN_TAIL_OPACITY;
                return createCoinTooltipHtml(c.type, coinAttributesMap, c.isAdditional, opacity);
            }).join(' ');
            combatLogMessages.push(`<p>味方 <span class="monster-name-color">${mOutcome.monster.name}</span>: ${outcomeStr}</p>`);
        });
        allEnemyCoinOutcomes.forEach(mOutcome => {
            let enemyOutcomeStr = mOutcome.outcomes.map(c => {
                const opacity = c.isHead ? 1 : GAME_CONSTANTS.COIN_TAIL_OPACITY;
                return createCoinTooltipHtml(c.type, coinAttributesMap, c.isAdditional, opacity);
            }).join(' ');
            combatLogMessages.push(`<p>敵 <span class="monster-name-color">${mOutcome.monster.name}</span>: ${enemyOutcomeStr}</p>`);
        });
        combatLogMessages.push("<p>--------------------</p>");

        const partyMagicCoins = partyCoinOutcomes.flatMap(m => m.outcomes).filter(c => c.type === 'magic');
        const enemyMagicCoins = allEnemyCoinOutcomes.flatMap(m => m.outcomes).filter(c => c.type === 'magic');

        if (partyMagicCoins.length > enemyMagicCoins.length) {
            partyMagicCoins.forEach(coin => coin.isHead = true);
            combatLogMessages.push(`<p>味方の${createCoinTooltipHtml('magic', coinAttributesMap)}の力が敵を上回り、全ての魔の硬貨が表になった！</p>`);
        }
        if (partyMagicCoins.length < enemyMagicCoins.length) {
            enemyMagicCoins.forEach(coin => coin.isHead = true);
            combatLogMessages.push(`<p>敵の${createCoinTooltipHtml('magic', coinAttributesMap)}の力が味方を上回り、全ての魔の硬貨が表になった！</p>`);
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

        // 軍人の場合、味方全員の戦力値を加算
        if (game.playerLife.name === '軍人') {
            combatLogMessages.push(`<p>おじさんの戦闘指揮で味方全員の戦力値が上昇！</p>`);
            partyIndividualCombatPowers.forEach(powerEntry => {powerEntry.power++;});
        }

        // 神の寵愛を戦力値に加算
        applyFavourEffectsToIndividualMonsters(game, partyIndividualCombatPowers);

        // 罠の硬貨を戦力値に減算
        calcTrapCoinPower(selectedPartyMonsters, enemyIndividualCombatPowers, coinAttributesMap, combatLogMessages, battleType);

        // 漁、弓、毒、雷、火の硬貨の特殊効果 (味方側)
        let partyFishingHeads = partyCoinOutcomes.flatMap(m => m.outcomes).filter(c => c.type === 'fishing' && c.isHead).length;
        let partyBowHeads = partyCoinOutcomes.flatMap(m => m.outcomes).filter(c => c.type === 'bow' && c.isHead).length;
        let partyPoisonHeads = partyCoinOutcomes.flatMap(m => m.outcomes).filter(c => c.type === 'poison' && c.isHead).length;
        let partyThunderHeads = partyCoinOutcomes.flatMap(m => m.outcomes).filter(c => c.type === 'thunder' && c.isHead).length;
        let partyFireHeads = partyCoinOutcomes.flatMap(m => m.outcomes).filter(c => c.type === 'fire' && c.isHead).length;

        if (partyFishingHeads > 0) {
            for (const e of enemyIndividualCombatPowers) {
                if (e.originalOutcomes.some(o => o.type === 'water')) {
                    e.power = Math.max(Math.floor(e.monster.totalCoins / 2), e.power - partyFishingHeads);
                    combatLogMessages.push(`<p>味方の${createCoinTooltipHtml('fishing', coinAttributesMap)}の力で、敵モン娘「<span class="monster-name-color">${e.monster.name}</span>」(${createCoinTooltipHtml('water', coinAttributesMap)}硬貨持ち)の戦力値が減少！</p>`);
                }
            }
        }
        if (partyBowHeads > 0) {
            for (const e of enemyIndividualCombatPowers) {
                if (e.originalOutcomes.some(o => o.type === 'sky')) {
                    e.power = Math.max(Math.floor(e.monster.totalCoins / 2), e.power - partyBowHeads);
                    combatLogMessages.push(`<p>味方の${createCoinTooltipHtml('bow', coinAttributesMap)}の力で、敵モン娘「<span class="monster-name-color">${e.monster.name}</span>」(${createCoinTooltipHtml('sky', coinAttributesMap)}硬貨持ち)の戦力値が減少！</p>`);
                }
            }
        }
        if (partyPoisonHeads > 0) {
            for (const e of enemyIndividualCombatPowers) {
                if (!e.originalOutcomes.some(o => o.type === 'poison')) {
                    e.power = Math.max(Math.floor(e.monster.totalCoins / 2), e.power - partyPoisonHeads);
                    combatLogMessages.push(`<p>味方の${createCoinTooltipHtml('poison', coinAttributesMap)}の力で、敵モン娘「<span class="monster-name-color">${e.monster.name}</span>」(${createCoinTooltipHtml('poison', coinAttributesMap)}硬貨なし)の戦力値が減少！</p>`);
                }
            }
        }
        if (partyThunderHeads > 0) {
            for (const e of enemyIndividualCombatPowers) {
                if (!e.originalOutcomes.some(o => o.type === 'thunder')) {
                    e.power = Math.max(Math.floor(e.monster.totalCoins / 2), e.power - partyThunderHeads);
                    combatLogMessages.push(`<p>味方の${createCoinTooltipHtml('thunder', coinAttributesMap)}の力で、敵モン娘「<span class="monster-name-color">${e.monster.name}</span>」(${createCoinTooltipHtml('thunder', coinAttributesMap)}硬貨なし)の戦力値が減少！</p>`);
                }
            }
        }
        if (partyFireHeads > 0) {
            for (const e of enemyIndividualCombatPowers) {
                if (!e.originalOutcomes.some(o => o.type === 'fire')) {
                    e.power = Math.max(Math.floor(e.monster.totalCoins / 2), e.power - partyFireHeads);
                    combatLogMessages.push(`<p>味方の${createCoinTooltipHtml('fire', coinAttributesMap)}の力で、敵モン娘「<span class="monster-name-color">${e.monster.name}</span>」(${createCoinTooltipHtml('fire', coinAttributesMap)}硬貨なし)の戦力値が減少！</p>`);
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
                    p.power = Math.max(Math.floor(p.monster.totalCoins / 2), p.power - enemyFishingHeads);
                    combatLogMessages.push(`<p>敵の${createCoinTooltipHtml('fishing', coinAttributesMap)}の力で、味方モン娘「<span class="monster-name-color">${p.monster.name}</span>」(${createCoinTooltipHtml('water', coinAttributesMap)}硬貨持ち)の戦力値が減少！</p>`);
                }
            }
        }
        if (enemyBowHeads > 0) {
            for (const p of partyIndividualCombatPowers) {
                if (p.originalOutcomes.some(o => o.type === 'sky')) {
                    p.power = Math.max(Math.floor(p.monster.totalCoins / 2), p.power - enemyBowHeads);
                    combatLogMessages.push(`<p>敵の${createCoinTooltipHtml('bow', coinAttributesMap)}の力で、味方モン娘「<span class="monster-name-color">${p.monster.name}</span>」(${createCoinTooltipHtml('sky', coinAttributesMap)}硬貨持ち)の戦力値が減少！</p>`);
                }
            }
        }
        if (enemyPoisonHeads > 0) {
            for (const p of partyIndividualCombatPowers) {
                if (!p.originalOutcomes.some(o => o.type === 'poison')) {
                    p.power = Math.max(Math.floor(p.monster.totalCoins / 2), p.power - enemyPoisonHeads);
                    combatLogMessages.push(`<p>敵の${createCoinTooltipHtml('poison', coinAttributesMap)}の力で、味方モン娘「<span class="monster-name-color">${p.monster.name}</span>」(${createCoinTooltipHtml('poison', coinAttributesMap)}硬貨なし)の戦力値が減少！</p>`);
                }
            }
        }
        if (enemyThunderHeads > 0) {
            for (const p of partyIndividualCombatPowers) {
                if (!p.originalOutcomes.some(o => o.type === 'thunder')) {
                    p.power = Math.max(Math.floor(p.monster.totalCoins / 2), p.power - enemyThunderHeads);
                    combatLogMessages.push(`<p>敵の${createCoinTooltipHtml('thunder', coinAttributesMap)}の力で、味方モン娘「<span class="monster-name-color">${p.monster.name}</span>」(${createCoinTooltipHtml('thunder', coinAttributesMap)}硬貨なし)の戦力値が減少！</p>`);
                }
            }
        }
        if (enemyFireHeads > 0) {
            for (const p of partyIndividualCombatPowers) {
                if (!p.originalOutcomes.some(o => o.type === 'fire')) {
                    p.power = Math.max(Math.floor(p.monster.totalCoins / 2), p.power - enemyFireHeads);
                    combatLogMessages.push(`<p>敵の${createCoinTooltipHtml('fire', coinAttributesMap)}の力で、味方モン娘「<span class="monster-name-color">${p.monster.name}</span>」(${createCoinTooltipHtml('fire', coinAttributesMap)}硬貨なし)の戦力値が減少！</p>`);
                }
            }
        }

        partyActualCombatPower = partyIndividualCombatPowers.reduce((sum, m) => sum + m.power, 0);
        enemyActualCombatPower = enemyIndividualCombatPowers.reduce((sum, m) => sum + m.power, 0);

        combatLogMessages.push("<h4>--- 個別戦力値 ---</h4>");
        for (const m of partyIndividualCombatPowers) {
            combatLogMessages.push(`<p>味方 <span class="monster-name-color">${m.monster.name}</span>: 戦力値 ${m.power}</p>`);
        }
        for (const e of enemyIndividualCombatPowers) {
            combatLogMessages.push(`<p>敵 <span class="monster-name-color">${e.monster.name}</span>: 戦力値 ${e.power}</p>`);
        }
        combatLogMessages.push("<p>--------------------</p>");

        // 戦闘手当計算
        // game.battleAllowance の計算はgame.jsのメインループに任せる
        currentFightFoodAllowance = selectedPartyMonsters.reduce((sum, monster) => sum + monster.coinAttributes.length, 0) * fightAttempts;

        // 血の硬貨の特殊効果 (戦闘手当減少)
        // 血の硬貨で表を出したモン娘の戦闘手当をゼロにする
        partyCoinOutcomes.forEach(mOutcome => {
            if (mOutcome.outcomes.some(c => c.type === 'blood' && c.isHead)) {
                // 血の硬貨が表の場合、このモン娘の戦闘手当を0にする
                currentFightFoodAllowance -= mOutcome.monster.totalCoins * fightAttempts;
                currentFightFoodAllowance = Math.max(0, currentFightFoodAllowance); // 0を下回らないようにする
                combatLogMessages.push(`<p>味方${createCoinTooltipHtml('blood', coinAttributesMap)}の力で、<span class="monster-name-color">${mOutcome.monster.name}</span> の戦闘手当がゼロになった！</p>`);
            }
        });

        // 花の硬貨の特殊効果 (戦闘手当減少)
        const flowerCounts = partyCoinOutcomes.flatMap(m => m.outcomes).filter(c => c.type === 'flower').length;
        if (flowerCounts > 0) {
            const originalAllowance = currentFightFoodAllowance;
            const reductionFactor = Math.pow(GAME_CONSTANTS.RAID_FLOWER_REDUCTION_FACTOR, flowerCounts);
            currentFightFoodAllowance = Math.max(0, Math.ceil(currentFightFoodAllowance * reductionFactor));
            const reducedAmount = originalAllowance - currentFightFoodAllowance;
            combatLogMessages.push(`<p>味方の${createCoinTooltipHtml('flower', coinAttributesMap)}の力で、戦闘手当が ${reducedAmount} 減少しました！</p>`);
        }

        // 総戦闘手当の保持
        game.battleAllowance += currentFightFoodAllowance;

        // 戦闘手当
        combatLogMessages.push(`<p>戦闘手当: ${currentFightFoodAllowance}</p>`);

        // 総戦力値の比較
        combatLogMessages.push(`<p>味方総戦力値: ${partyActualCombatPower}, 敵総戦力値: ${enemyActualCombatPower}</p>`);

        if (partyActualCombatPower >= enemyActualCombatPower) {
            combatLogMessages.push("<p><strong>勝利！</strong></p>");
            wins++; // 勝利カウントを増やす

            playSfx("勝利").catch(e => console.error("効果音の再生に失敗しました:", e));
        } else {
            combatLogMessages.push("<p><strong>敗北。</strong></p>");

            playSfx("敗北").catch(e => console.error("効果音の再生に失敗しました:", e));
        }

        // 戦闘ログポップアップを表示し、ユーザーが閉じるのを待つ
        await showCombatLogModal(`戦闘ログ コイントス(${fightAttempts}回目)`, combatLogMessages.join(''), enemyImagePaths, '閉じる');
        combatLogMessages.length = 0; // ポップアップ表示後、ログをクリア

        if (wins >= 1) {
            break; // 勝利したらループを抜ける
        }
    }

    // 戦闘結果の最終判定
    if (wins >= 1) {
        showSpeechBubble(selectedPartyMonsters, '勝利', random);
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
        showSpeechBubble(selectedPartyMonsters, '敗北', random);
        logMessage("負けちゃった！");
        clearActionArea();
        const actionArea = document.getElementById('action-area');
        if (actionArea) actionArea.innerHTML = '<button data-value="gameover-confirm">負けちゃった</button>';
        await waitForButtonClick();

        playSfx("選択").catch(e => console.error("効果音の再生に失敗しました:", e));

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
 * @param {Array<object>} partyIndividualCombatPowers - 戦闘に参加しているモン娘とその個別戦力値の配列。
 */
function applyFavourEffectsToIndividualMonsters(game, partyIndividualCombatPowers) {
    if (!game.favour || game.favour.length === 0) {
        return; // 神の寵愛がない場合は何もしない
    }

    game.favour.forEach(favourCoinId => {
        partyIndividualCombatPowers.forEach(powerEntry => {
            const monster = powerEntry.monster;
            // モン娘が寵愛と同じ硬貨属性を持っているかチェック (追加硬貨も含む)
            if (monster.allCoins.includes(favourCoinId)) {
                // 寵愛と同じ属性を持つモン娘の総硬貨数を戦力値を加算
                powerEntry.power++; // 個別の戦力値に加算
            }
        });
    });
}

/**
 * 罠の効果を反映し、戦闘に参加した個々のモン娘の戦力値に減算する。
 * @param {Monster[]} partyIndividualCombatPowers - 戦闘に参加しているモン娘とその個別戦力値の配列。
 * @param {Array<object>} enemyIndividualCombatPowers - 戦闘に参加している敵モン娘とその個別戦力値の配列。
 * @param {object[]} coinAttributesMap - 硬貨属性のマップ。
 * @param {string[]} combatLogMessages - 戦闘ログメッセージを格納する配列。
 * @param {string} battleType - 戦闘の種類。
 */
function calcTrapCoinPower(partyIndividualCombatPowers, enemyIndividualCombatPowers, coinAttributesMap, combatLogMessages, battleType) {
    if (battleType === 'normal' || battleType === 'special') {
        // 通常襲撃、または特殊襲撃でない場合は何もしない

        let trapCoinCount = 0;
        // 仲間モン娘が持つ'trap'属性の硬貨の総数を数える (追加硬貨も含む)
        partyIndividualCombatPowers.forEach(p => {
            p.allCoins.forEach(coinAttr => {
                if (coinAttr === 'trap') {
                    trapCoinCount++;
                }
            });
        });

        if (trapCoinCount > 0) {
            // 'trap'硬貨の枚数分、敵モン娘の戦力値(power)を減算
            enemyIndividualCombatPowers.forEach(e => {
                const originalPower = e.power;
                e.power = Math.max(Math.floor(e.monster.totalCoins / 2), e.power - trapCoinCount);
                if (originalPower !== e.power) {
                    combatLogMessages.push(`<p>味方の${createCoinTooltipHtml('trap', coinAttributesMap)}の力で、敵モン娘「<span class="monster-name-color">${e.monster.name}</span>」の戦力値が減少！</p>`);
                }
            });
        }
    }
}

/**
 * ボス戦に派遣する仲間モン娘を選択するフェーズ。
 * @param {object} game - 現在のゲーム状態オブジェクト。
 * @param {Monster[]} availableMonsters - 今回の戦闘で選択可能なモン娘の配列。
 * @param {String} battleType - 戦闘の種類。
 * @returns {Promise<Monster[]>} 選択されたモン娘の配列。
 */
async function selectBattleParty(game, availableMonsters, battleType) {
    game.currentPhase = 'bossExpeditionSelection'; // ボス戦専用のフェーズ名を使用
    const selectedParty = [];

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
                if (!availableMonsters.includes(monster)) {
                    return; // 選択不可なモンスターは無視
                }

                if (selectedParty.includes(monster)) {
                    selectedParty.splice(selectedParty.indexOf(monster), 1);
                } else {
                    if (battleType === 'duel' && selectedParty.length >= 1) {
                        // 決闘で既に1体選択されている場合、新しいモンスターを選択したら古いものを置き換える
                        selectedParty.pop();
                    }
                    selectedParty.push(monster);
                }

                playSfx("選択").catch(e => console.error("効果音の再生に失敗しました:", e));

                updateUI(game, coinAttributesMap, selectedParty, game.currentArea, true, availableMonsters, GAME_CONSTANTS.MAX_PARTY_SIZE);
            }
        };

        const finalizeSelectionListener = async (event) => {
            let clickedButton = event.target.closest('button');
            if (clickedButton && clickedButton.dataset.value === 'finish-battle-expedition') {
                if (selectedParty.length === 0) {
                    logMessage("必ず1人はモン娘を選んで！");
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
