// food.js

import { Monster } from './monster.js';
import { GAME_CONSTANTS, delicacies } from './data.js';

/**
 * 予想食料獲得量を計算し、ゲーム状態を更新する。
 * @param {object} game - 現在のゲーム状態オブジェクト。
 * @param {Monster[]} expeditionParty - 派遣されるモン娘の配列。
 * @param {object} currentArea - 現在の地形情報。
 */
export function updateEstimatedFoodGain(game, expeditionParty, currentArea) {
    console.log("updateEstimatedFoodGain called.");
    console.log("expeditionParty for calculation:", expeditionParty.map(m => m.name));
    console.log("currentArea for calculation:", currentArea ? currentArea.name : "null");

    let estimatedFoodGained = 0;
    if (currentArea) { // currentAreaが選択されている場合のみ計算
        expeditionParty.forEach(monster => {
            let monsterFoodContribution = GAME_CONSTANTS.FOOD_SUPPLY;

            // 漁の硬貨を水の硬貨として扱うための調整
            const effectiveAreaCoinAttributesForFood = [...currentArea.coinAttributes]; // areaCoins を使用

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
            estimatedFoodGained += monsterFoodContribution;
        });
    }
    game.estimatedFoodGain = estimatedFoodGained; // gameオブジェクトの値を更新
    console.log("Calculated game.estimatedFoodGain:", game.estimatedFoodGain);
}

/**
 * 予想ミルク獲得量を計算し、ゲーム状態を更新する。
 * @param {object} game - 現在のゲーム状態オブジェクト。
 * @param {Monster[]} expeditionParty - 派遣されるモン娘の配列。
 * @param {object} currentArea - 現在の地形情報。
 * @returns {number} 予想ミルク獲得量。
 */
export function calculateEstimatedMilkGain(game, expeditionParty, currentArea) {
    console.log("calculateEstimatedMilkGain called.");
    let estimatedMilkGained = 0;

    if (currentArea && expeditionParty) {
        for (const member of expeditionParty) {
            for (const delicacy of delicacies) {
                // 探索モン娘の属性と珍味のexplorerCoinAttributesに共通の属性があるかチェック
                const monsterAttributeMatch = delicacy.explorerCoinAttributes.every(attr => member.allCoins.includes(attr));
                // 探索エリアの属性と珍味のareaCoinAttributesに共通の属性があるかチェック
                const areaAttributeMatch = delicacy.areaCoinAttributes.every(attr => currentArea.coinAttributes.includes(attr));

                // 珍味の獲得確率が100%なので、条件が合致すればミルクを獲得とみなす
                if (monsterAttributeMatch && areaAttributeMatch) {
                    estimatedMilkGained += delicacy.milkConversion;
                    break;
                }
            }
        }
    }
    return estimatedMilkGained;
}
