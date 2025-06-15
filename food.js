// food.js

import { Monster } from './monster.js';
import { GAME_CONSTANTS } from './data.js';

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