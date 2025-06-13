// monster.js

/**
 * @file モン娘のデータ構造と、モン娘の生成・表示に関連するロジックを定義するモジュール。
 */

// 必要なデータをインポート
import { monsterTemplates, coinAttributesMap, GAME_CONSTANTS } from './data.js'; 

// モン娘の基本構造
export class Monster {
    /**
     * 新しいモン娘インスタンスを作成する。
     * @param {string} name - モン娘の名前。
     * @param {string[]} coinAttributes - モン娘が持つ硬貨属性の配列。
     * @param {number} upkeep - モン娘の食費。
     * @param {boolean} hasBeenSentToBattle - ボス戦などで一度派遣されたかどうか。
     */
    constructor(name, coinAttributes, upkeep = 0, hasBeenSentToBattle = false) {
        this.name = name;
        this.coinAttributes = coinAttributes;
        this.upkeep = upkeep;
        this.hasBeenSentToBattle = hasBeenSentToBattle;
    }

    /**
     * モン娘の「強さ」を表す硬貨の総数を取得する。
     * @returns {number} 硬貨の総数。
     */
    get totalCoins() {
        return this.coinAttributes.length;
    }
}

/**
 * 重複しないランダムなモン娘を生成する。
 * @param {object[]} game - ゲームの状態を管理するオブジェクト。
 * @param {number} count - 生成するモン娘の数。
 * @param {object[]} templatesPool - 選択肢の元となるモン娘テンプレートの配列。
 * @param {boolean} useWeighting - 重み付けを適用するかどうか。
 * @param {number} minCoins - 硬貨枚数によるフィルタリングの最小値 (0は無制限)。
 * @param {number} maxCoins - 硬貨枚数によるフィルタリングの最大値 (Infinityは無制限)。
 * @param {Function} random - 疑似乱数生成関数。
 * @returns {Monster[]} 生成されたモン娘の配列。
 */
export function getUniqueRandomMonsters(game, count, templatesPool, useWeighting = false, minCoins = 0, maxCoins = Infinity, random) {
    let currentAvailableTemplates = [...templatesPool]; // 渡されたプールをコピーして使用

    // 硬貨枚数によるフィルタリングを最初に行う
    if (minCoins > 0 || maxCoins < Infinity) {
        currentAvailableTemplates = currentAvailableTemplates.filter(template => {
            const numCoins = template.coins.length;
            return numCoins >= minCoins && numCoins <= maxCoins;
        });
    }

    const uniqueMonsters = [];

    // 硬貨枚数に応じた重み付けマップ
    let weights;
    if (game.days === 0) {
        weights = {
            3: 400,
            4: 100,
            5: 10,
            6: 4,
            7: 2,
            8: 1
        };
    }
    else if (game.days < GAME_CONSTANTS.BOSS_DAYS) {
        weights = {
            3: 100,
            4: 40,
            5: 10,
            6: 4,
            7: 2,
            8: 1
        };
    }
    else {
        weights = {
            3: 8,
            4: 8,
            5: 4,
            6: 2,
            7: 1,
            8: 1
        };
    }

    for (let i = 0; i < count; i++) {
        if (currentAvailableTemplates.length === 0) {
            break; // フィルタリングされたプールにモン娘が残っていない場合
        }

        let selectedTemplate = null;
        if (useWeighting) {
            let totalWeight = 0;
            const weightedTemplates = currentAvailableTemplates.map(template => {
                const numCoins = template.coins.length;
                // 定義されていない枚数にはデフォルトの重み1を適用
                const weight = weights[numCoins] !== undefined ? weights[numCoins] : 1; 
                totalWeight += weight;
                return { template, weight };
            });

            if (totalWeight === 0) { // 全ての重みが0の場合や、重みが定義されていない場合
                selectedTemplate = currentAvailableTemplates[Math.floor(random() * currentAvailableTemplates.length)];
            } else {
                let randomWeight = random() * totalWeight;
                for (const weightedItem of weightedTemplates) {
                    randomWeight -= weightedItem.weight;
                    if (randomWeight <= 0) {
                        selectedTemplate = weightedItem.template;
                        break;
                    }
                }
                // 浮動小数点数の問題で選択されなかった場合のフォールバック
                if (!selectedTemplate && weightedTemplates.length > 0) {
                    selectedTemplate = weightedTemplates[0].template;
                }
            }
        } else {
            const randomIndex = Math.floor(random() * currentAvailableTemplates.length);
            selectedTemplate = currentAvailableTemplates[randomIndex];
        }

        if (selectedTemplate) {
            uniqueMonsters.push(new Monster(selectedTemplate.name, [...selectedTemplate.coins], selectedTemplate.upkeep));
            // 選択されたモン娘を、この関数呼び出し内の今後の選択肢から除外
            currentAvailableTemplates = currentAvailableTemplates.filter(t => t.name !== selectedTemplate.name);
        } else {
            break; // モン娘を選択できなかった場合
        }
    }
    return uniqueMonsters;
}

/**
 * 地形に合った敵モン娘を生成する。
 * @param {number} count - 生成する敵の数。
 * @param {object} currentArea - 現在の地形情報。
 * @param {number} currentDays - 現在の日数。
 * @param {Function} random - 疑似乱数生成関数。
 * @returns {Monster[]} 生成された敵モン娘の配列。
 */
export function generateAreaSpecificEnemies(count, currentArea, currentDays, random) {
    // 現在の日数に応じて敵の最大硬貨枚数を決定
    const maxCoinsAllowed = 3 + Math.floor((currentDays - 1) / GAME_CONSTANTS.ENEMY_COIN_SCALING_DAYS);

    // フィルターされたモン娘テンプレートリストを作成 (enemy属性を持たないもののみ)
    const availableMonsterTemplates = monsterTemplates.filter(template => 
        template.coins.length <= maxCoinsAllowed && !template.coins.includes('enemy')
    );

    const compatibleMonsters = [];
    const incompatibleMonsters = [];

    availableMonsterTemplates.forEach(template => { // フィルターされたリストを使用
        const monsterCoins = template.coins;
        // 地形とモン娘の硬貨属性が1つでも一致すれば compatible
        if (monsterCoins.some(coin => currentArea.coinAttributes.includes(coin))) {
            compatibleMonsters.push(template);
        } else {
            incompatibleMonsters.push(template);
        }
    });

    const generatedEnemies = [];
    for (let i = 0; i < count; i++) {
        let selectedTemplate;
        // 70%の確率で compatible なモン娘を選ぶ
        if (random() < 0.7 && compatibleMonsters.length > 0) {
            selectedTemplate = compatibleMonsters[Math.floor(random() * compatibleMonsters.length)];
        } else {
            // compatibleなモン娘がいない場合、または30%の確率でincompatibleなモン娘を選ぶ場合
            // フィルターされた全体のリストから選ぶ
            selectedTemplate = availableMonsterTemplates[Math.floor(random() * availableMonsterTemplates.length)];
        }
        generatedEnemies.push(new Monster(selectedTemplate.name, [...selectedTemplate.coins], selectedTemplate.upkeep));
    }
    return generatedEnemies;
}

/**
 * 特殊襲撃用の敵モン娘を生成する。
 * @param {number} count - 生成する敵の数。
 * @param {number} currentDays - 現在の日数。
 * @param {Function} random - 疑似乱数生成関数。
 * @returns {Monster[]} 生成されたモン娘の配列。
 */
export function generateSpecialRaidEnemies(count, currentDays, random) {
    // 現在の日数に応じて敵の最大硬貨枚数を決定 (通常の敵と同じスケーリング)
    const maxCoinsAllowed = 3 + Math.floor((currentDays - 1) / GAME_CONSTANTS.ENEMY_COIN_SCALING_DAYS);

    // 名前に「グーラ」を含むモン娘テンプレートのみを対象とする
    const goolaTemplates = monsterTemplates.filter(template => 
        template.name.includes('グーラ') && template.coins.length <= maxCoinsAllowed
    );

    const generatedEnemies = [];
    for (let i = 0; i < count; i++) {
        if (goolaTemplates.length === 0) {
            // 敵テンプレートがない場合は生成を停止
            break;
        }
        const randomIndex = Math.floor(random() * goolaTemplates.length);
        const selectedTemplate = goolaTemplates[randomIndex];
        generatedEnemies.push(new Monster(selectedTemplate.name, [...selectedTemplate.coins], selectedTemplate.upkeep));
    }
    return generatedEnemies;
}
