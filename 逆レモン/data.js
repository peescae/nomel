// data.js

/**
 * @file ゲームで使用する定数データを定義するモジュール。
 * 硬貨属性、モン娘テンプレート、地形タイプなどが含まれる。
 */

// 硬貨属性の定義
// 各硬貨のID、日本語名、ヘルプテキスト（特殊効果の説明）を含む。
export const coinAttributesMap = [
    { id: 'plain', name: '野', color: 'rgb(91, 202, 47)', help: '特殊効果なし。' },
    { id: 'forest', name: '森', color: 'rgb(35, 88, 14)', help: '特殊効果なし。' },
    { id: 'dark', name: '闇', color: 'rgb(29, 9, 73)', help: '特殊効果なし。' },
    { id: 'sky', name: '空', color: 'rgb(88, 237, 248)', help: '特殊効果なし。' },
    { id: 'magic', name: '魔', color: 'rgb(132, 0, 255)', help: '味方全体の魔の総数が敵全体の魔の総数を超える場合、必ず表になる。' },
    { id: 'flower', name: '花', color: 'rgb(233, 112, 202)', help: '表の場合、味方全体の戦闘手当に0.8を乗算する。' },
    { id: 'fishing', name: '漁', color: 'rgb(0, 85, 134)', help: '表の場合、水の硬貨を持つ全ての敵の戦力値に1を減算する。探索時、この硬貨を水の硬貨として扱う。' },
    { id: 'water', name: '水', color: 'rgb(0, 162, 255)', help: '特殊効果なし。' },
    { id: 'snow', name: '雪', color: 'rgb(173, 216, 230)', help: '特殊効果なし。' },
    { id: 'trap', name: '罠', color: 'rgb(129, 86, 55)', help: '待機時、襲撃確率に0.6を乗算する。' },
    { id: 'bow', name: '弓', color: 'rgb(102, 96, 96)', help: '表の場合、空の硬貨を持つ全ての敵の戦力値に1を減算する。' },
    { id: 'iron', name: '鉄', color: 'rgb(150, 150, 150)', help: '表の場合、この硬貨が産出する戦力値に2を乗算する。' },
    { id: 'scale', name: '鱗', color: 'rgb(123, 155, 92)', help: '裏の場合、一度だけ硬貨を振り直す。' },
    { id: 'blood', name: '血', color: 'rgb(180, 0, 0)', help: '戦闘手当に1を減算する。' },
    { id: 'oni', name: '鬼', color: 'rgb(200, 50, 0)', help: '必ず表になる。' },
    { id: 'power', name: '力', color: 'rgb(255, 165, 0)', help: '表の場合、この硬貨が産出する戦力値に2を乗算する。' },
    { id: 'thunder', name: '雷', color: 'rgb(255, 255, 0)', help: '表の場合、雷の硬貨を持たない全ての敵の戦力値に1を減算する。' },
    { id: 'fire', name: '火', color: 'rgb(255, 69, 0)', help: '表の場合、火の硬貨を持たない全ての敵の戦力値に1を減算する。' },
    { id: 'poison', name: '毒', color: 'rgb(128, 0, 128)', help: '表の場合、毒の硬貨を持たない全ての敵の戦力値に1を減算する。' },
    { id: 'enemy', name: '敵', color: 'rgb(50, 50, 50)', help: '敵専用。必ず表になる。' },
];

// モン娘のテンプレート定義
// 各モン娘の名前、所持硬貨、維持費を含む。
export const monsterTemplates = [
    { name: 'インプ', coins: ['sky', 'dark', 'magic'], upkeep: 3 }, // 3枚, 維持費3
    { name: 'ゴブリン', coins: ['plain', 'forest', 'dark'], upkeep: 3 }, // 3枚, 維持費3
    { name: 'コロポックル', coins: ['forest', 'snow', 'fishing'], upkeep: 3 }, // 3枚, 維持費3
    { name: 'フェアリー', coins: ['forest', 'flower', 'sky'], upkeep: 3 }, // 3枚, 維持費3
    { name: 'ユキンコ', coins: ['snow', 'snow', 'snow'], upkeep: 3 }, // 3枚, 維持費3
    { name: 'シェリーコート', coins: ['water', 'water', 'water'], upkeep: 3 }, // 3枚, 維持費3
    { name: 'ローン', coins: ['water', 'snow', 'fishing'], upkeep: 3 }, // 3枚, 維持費3
    { name: 'グレムリン', coins: ['thunder', 'thunder', 'thunder'], upkeep: 3 }, // 3枚, 維持費3
    { name: 'チョンチョン', coins: ['blood', 'sky', 'sky'], upkeep: 3 }, // 3枚, 維持費3
    { name: 'アルラウネ', coins: ['forest', 'flower', 'poison'], upkeep: 3 }, // 3枚, 維持費3
    { name: 'マイコニド', coins: ['forest', 'dark', 'poison'], upkeep: 3 }, // 3枚, 維持費3
    { name: 'ユキオンナ', coins: ['snow', 'snow', 'magic', 'magic'], upkeep: 4 }, // 4枚, 維持費4
    { name: 'ルサルカ', coins: ['water', 'water', 'magic', 'magic'], upkeep: 4 }, // 4枚, 維持費4
    { name: 'ドリアード', coins: ['forest', 'forest', 'magic', 'magic'], upkeep: 4 }, // 4枚, 維持費4
    { name: 'ネコマタ', coins: ['forest', 'forest', 'dark', 'magic'], upkeep: 4 }, // 4枚, 維持費4
    { name: 'メリサンド', coins: ['scale', 'scale', 'water', 'sky'], upkeep: 4 }, // 4枚, 維持費4
    { name: 'ハーピー', coins: ['forest', 'forest', 'sky', 'sky'], upkeep: 4 }, // 4枚, 維持費4
    { name: 'セイレーン', coins: ['water', 'water', 'sky', 'sky'], upkeep: 4 }, // 4枚, 維持費4
    { name: 'セルキー', coins: ['water', 'snow', 'fishing', 'fishing', 'iron'], upkeep: 5 }, // 5枚, 維持費5
    { name: 'ジョローグモ', coins: ['forest', 'forest', 'dark', 'dark', 'trap'], upkeep: 5 }, // 5枚, 維吉費5
    { name: 'ラミア', coins: ['scale', 'scale', 'forest', 'dark', 'blood'], upkeep: 5 }, // 5枚, 維持費5
    { name: 'セントール', coins: ['plain', 'plain', 'plain', 'bow', 'bow'], upkeep: 5 }, // 5枚, 維持費5
    { name: 'ワーウルフ', coins: ['plain', 'plain', 'forest', 'forest', 'iron'], upkeep: 5 }, // 5枚, 維持費5
    { name: 'リザードマン', coins: ['scale', 'scale', 'forest', 'forest', 'iron'], upkeep: 5 }, // 5枚, 維持費5
    { name: 'サハギン', coins: ['scale', 'scale', 'water', 'water', 'iron'], upkeep: 5 }, // 5枚, 維持費5
    { name: 'オニ', coins: ['oni', 'oni', 'oni', 'forest', 'iron'], upkeep: 5 }, // 5枚, 維持費5
    { name: 'ヴィーヴル', coins: ['scale', 'dark', 'dark', 'sky', 'sky'], upkeep: 5 }, // 5枚, 維持費5
    { name: 'キクロプス', coins: ['oni', 'oni', 'oni', 'thunder', 'thunder', 'iron', 'iron'], upkeep: 7 }, // 7枚, 維持費7
    { name: 'カリブディス', coins: ['water', 'water', 'water', 'water', 'power', 'power', 'power', 'power'], upkeep: 8 }, // 8枚, 維持費8
    { name: 'ドラゴニュート', coins: ['scale', 'scale', 'sky', 'sky', 'fire', 'fire', 'poison', 'poison'], upkeep: 8 }, // 8枚, 維持費8
    { name: 'グーラLv1', coins: ['enemy', 'oni', 'power'], upkeep: 3 }, // 3枚, 維持費3
    { name: 'グーラLv2', coins: ['enemy', 'oni', 'power', 'power'], upkeep: 4 }, // 4枚, 維持費4
    { name: 'グーラLv3', coins: ['enemy', 'oni', 'power', 'power', 'power'], upkeep: 5 }, // 5枚, 維持費5
    { name: 'ガーゴイル', coins: ['enemy', 'iron', 'iron', 'sky'], upkeep: 4 }, // 4枚, 維持費4
    { name: 'サキュバス', coins: ['enemy', 'flower', 'dark', 'magic'], upkeep: 4 }, // 4枚, 維持費4
    { name: 'アクロ王', coins: ['enemy', 'snow', 'oni', 'oni', 'iron', 'iron'], upkeep: 6 }, // 6枚, 維持費6
    { name: 'スライム', coins: ['enemy', 'water', 'water', 'poison', 'poison', 'flower', 'flower'], upkeep: 7 }, // 7枚, 維持費7
    { name: 'スフィンクス', coins: ['enemy', 'plain', 'plain', 'plain', 'sky', 'sky', 'sky', 'magic', 'magic'], upkeep: 9 }, // 9枚, 維持費9
    { name: 'エキドナLv1', coins: ['enemy', 'scale', 'scale', 'scale', 'poison', 'poison', 'dark', 'dark'], upkeep: 8 }, // 8枚, 維持費8
    { name: 'エキドナLv2', coins: ['enemy', 'scale', 'scale', 'scale', 'poison', 'poison', 'poison', 'dark', 'dark', 'dark'], upkeep: 10 }, // 10枚, 維持費10
    { name: 'エキドナLv3', coins: ['enemy', 'scale', 'scale', 'scale', 'poison', 'poison', 'poison', 'poison', 'dark', 'dark', 'dark', 'dark'], upkeep: 12 }, // 12枚, 維持費12
    { name: 'ニドヘグLv1', coins: ['enemy', 'scale', 'scale', 'scale', 'scale', 'scale', 'scale', 'scale', 'scale', 'forest', 'forest', 'dark', 'dark'], upkeep: 13 }, // 13枚, 維持費13
    { name: 'ニドヘグLv2', coins: ['enemy', 'scale', 'scale', 'scale', 'scale', 'scale', 'scale', 'scale', 'scale', 'forest', 'forest', 'forest', 'dark', 'dark', 'dark'], upkeep: 15 }, // 15枚, 維持費15
    { name: 'ニドヘグLv3', coins: ['enemy', 'scale', 'scale', 'scale', 'scale', 'scale', 'scale', 'scale', 'scale', 'forest', 'forest', 'forest', 'forest', 'dark', 'dark', 'dark', 'dark'], upkeep: 17 }, // 17枚, 維持費17
    { name: 'セドナLv1', coins: ['enemy', 'scale', 'scale', 'scale', 'scale', 'scale', 'water', 'water', 'snow', 'snow'], upkeep: 10 }, // 10枚, 維持費10
    { name: 'セドナLv2', coins: ['enemy', 'scale', 'scale', 'scale', 'scale', 'scale', 'water', 'water', 'water', 'snow', 'snow', 'snow'], upkeep: 12 }, // 12枚, 維持費12
    { name: 'セドナLv3', coins: ['enemy', 'scale', 'scale', 'scale', 'scale', 'scale', 'water', 'water', 'water', 'water', 'snow', 'snow', 'snow', 'snow'], upkeep: 14 }, // 14枚, 維持費14
];

// 地形タイプと対応する硬貨属性の定義
export const areaTypes = [
    { id: 'wild', name: '荒野', coinAttributes: ['plain', 'sky'] },
    { id: 'flowerField', name: '花畑', coinAttributes: ['plain', 'flower', 'sky'] },
    { id: 'grassland', name: '草原', coinAttributes: ['plain', 'forest', 'sky'] },
    { id: 'greatGrassland', name: '大草原', coinAttributes: ['plain', 'plain', 'forest', 'sky'] },
    { id: 'snowField', name: '雪原', coinAttributes: ['plain', 'snow', 'sky'] },
    { id: 'greatSnowField', name: '大雪原', coinAttributes: ['plain', 'snow', 'snow', 'sky'] },
    { id: 'wetland', name: '湿原', coinAttributes: ['plain', 'water', 'sky'] },
    { id: 'greatWetland', name: '大湿原', coinAttributes: ['plain', 'water', 'water', 'sky'] },
    { id: 'forest', name: '森林', coinAttributes: ['forest'] },
    { id: 'greatForest', name: '大森林', coinAttributes: ['forest', 'forest'] },
    { id: 'coniferForest', name: '針葉樹林', coinAttributes: ['snow', 'forest'] },
    { id: 'greatConiferForest', name: '大針葉樹林', coinAttributes: ['snow', 'forest', 'forest'] },
    { id: 'rainforest', name: '熱帯雨林', coinAttributes: ['water', 'forest'] },
    { id: 'greatRainforest', name: '大熱帯雨林', coinAttributes: ['water', 'forest', 'forest'] },
    { id: 'jungle', name: '密林', coinAttributes: ['forest', 'dark'] },
    { id: 'deepJungle', name: '樹海', coinAttributes: ['forest', 'forest', 'dark', 'dark'] },
    { id: 'rockyMountain', name: '石山', coinAttributes: ['sky'] },
    { id: 'mountainForest', name: '山林', coinAttributes: ['forest', 'sky'] },
    { id: 'greatMountainForest', name: '大山林', coinAttributes: ['forest', 'forest', 'sky'] },
    { id: 'snowMountain', name: '雪山', coinAttributes: ['snow', 'sky'] },
    { id: 'greatSnowMountain', name: '大雪山', coinAttributes: ['snow', 'snow', 'sky'] },
    { id: 'volcano', name: '火山', coinAttributes: ['fire', 'poison', 'sky'] },
    { id: 'greatVolcano', name: '大火山', coinAttributes: ['fire', 'fire', 'poison', 'sky'] },
    { id: 'cave', name: '洞窟', coinAttributes: ['dark'] },
    { id: 'greatCave', name: '大洞窟', coinAttributes: ['dark', 'dark'] },
    { id: 'seaCave', name: '海蝕洞', coinAttributes: ['dark', 'water'] },
    { id: 'greatSeaCave', name: '大海蝕洞', coinAttributes: ['dark', 'dark', 'water'] },
    { id: 'volcanicCave', name: '火山洞窟', coinAttributes: ['dark', 'fire', 'poison'] },
    { id: 'greatVolcanicCave', name: '大火山洞窟', coinAttributes: ['dark', 'dark', 'fire', 'poison'] },
    { id: 'iceCave', name: '氷穴', coinAttributes: ['dark', 'snow'] },
    { id: 'greatIceCave', name: '大氷穴', coinAttributes: ['dark', 'dark', 'snow'] },
    { id: 'coast', name: '海岸', coinAttributes: ['water', 'sky'] },
    { id: 'greatCoast', name: '大海岸', coinAttributes: ['water', 'water', 'sky'] },
    { id: 'glacier', name: '氷河', coinAttributes: ['water', 'snow', 'sky'] },
    { id: 'greatGlacier', name: '大氷河', coinAttributes: ['water', 'snow', 'snow', 'sky'] },
    { id: 'superRuin', name: '超古代文明跡', coinAttributes: ['dark', 'dark', 'iron', 'iron', 'thunder', 'thunder'] },
    { id: 'mansion', name: '館', coinAttributes: ['flower', 'flower', 'flower', 'flower', 'flower', 'flower', 'flower', 'flower'] },
    { id: 'fortress', name: '砦', coinAttributes: ['snow', 'snow', 'snow', 'snow', 'iron', 'iron', 'iron', 'iron'] },
    { id: 'swamp', name: '沼', coinAttributes: ['water', 'water', 'water', 'water', 'forest', 'forest', 'forest', 'forest'] },
    { id: 'sand', name: '砂', coinAttributes: ['plain', 'plain', 'plain', 'plain', 'sky', 'sky', 'sky', 'sky'] },
    { id: 'darkness', name: '闇', coinAttributes: ['dark', 'dark', 'dark', 'dark', 'dark', 'dark', 'dark', 'dark'] },
    { id: 'forestArea', name: '森', coinAttributes: ['forest', 'forest', 'forest', 'forest', 'dark', 'dark', 'dark', 'dark'] },
    { id: 'sea', name: '海', coinAttributes: ['water', 'water', 'water', 'water', 'snow', 'snow', 'snow', 'snow'] },
];

// 珍味の定義
export const delicacies = [
    { name: '飛び魚', explorerCoinAttributes : ['sky'], areaCoinAttributes : ['water'], milkConversion: 1 },
    { name: '秋刀魚', explorerCoinAttributes : ['iron'], areaCoinAttributes : ['water'], milkConversion: 1 },
    { name: '鷹の爪', explorerCoinAttributes : ['sky'], areaCoinAttributes : ['forest'], milkConversion: 1 },
    { name: '花弁茸', explorerCoinAttributes : ['flower'], areaCoinAttributes : ['forest'], milkConversion: 1 },
    { name: '川蝉', explorerCoinAttributes : ['water'], areaCoinAttributes : ['sky'], milkConversion: 1 },
    { name: '蛍烏賊', explorerCoinAttributes : ['thunder'], areaCoinAttributes : ['water'], milkConversion: 1 },
    { name: '槌の子', explorerCoinAttributes : ['plain'], areaCoinAttributes : ['forest'], milkConversion: 1 },
    { name: '食火鶏', explorerCoinAttributes : ['fire'], areaCoinAttributes : ['plain'], milkConversion: 1 },
    { name: '木耳', explorerCoinAttributes : ['water'], areaCoinAttributes : ['forest'], milkConversion: 1 },
    { name: '天狗茸', explorerCoinAttributes : ['magic'], areaCoinAttributes : ['forest', 'dark'], milkConversion: 1 },
    { name: '火炎茸', explorerCoinAttributes : ['fire'], areaCoinAttributes : ['forest', 'dark'], milkConversion: 1 },
    { name: '夜光茸', explorerCoinAttributes : ['thunder'], areaCoinAttributes : ['forest', 'dark'], milkConversion: 1 },
    { name: '鬼茸', explorerCoinAttributes : ['oni'], areaCoinAttributes : ['forest', 'dark'], milkConversion: 1 },
    { name: '鶴茸', explorerCoinAttributes : ['sky'], areaCoinAttributes : ['forest', 'dark'], milkConversion: 1 },
];

// ラスボス戦のエンカウント情報
export const FINAL_BOSS_ENCOUNTERS = {
    // 館でのラスボス戦
    mansion: [
        [{ name: 'サキュバス', count: 3 }], // 1戦目
        [{ name: 'サキュバス', count: 5 }], // 2戦目
        [{ name: 'サキュバス', count: 7 }], // 3戦目
    ],
    // 砦でのラスボス戦
    fortress: [
        [{ name: 'アクロ王', count: 1 }, { name: 'キクロプス', count: 1 }, { name: 'オニ', count: 2 }, { name: 'セントール', count: 2 }], // 1戦目
        [{ name: 'アクロ王', count: 1 }, { name: 'キクロプス', count: 1 }, { name: 'オニ', count: 1 }, { name: 'セントール', count: 1 }], // 2戦目
        [{ name: 'アクロ王', count: 1 }, { name: 'キクロプス', count: 1 }] // 3戦目
    ],
    // 沼でのラスボス戦
    swamp: [
        [{ name: 'スライム', count: 1 }], // 1戦目: スライム1体
        [{ name: 'スライム', count: 2 }], // 2戦目: スライム2体
        [{ name: 'スライム', count: 4 }]  // 3戦目: スライム4体
    ],
    // 砂でのラスボス戦
    sand: [
        [{ name: 'スフィンクス', count: 1 }], // 1戦目: スフィンクス1体
        [{ name: 'スフィンクス', count: 2 }], // 2戦目: スフィンクス2体
        [{ name: 'スフィンクス', count: 3 }]  // 3戦目: スフィンクス3体
    ],
    // 闇でのラスボス戦
    darkness: [
        [{ name: 'エキドナLv1', count: 1 }, { name: 'リザードマン', count: 2 }], // 1戦目
        [{ name: 'エキドナLv2', count: 1 }, { name: 'ドラゴニュート', count: 2 }], // 2戦目
        [{ name: 'エキドナLv3', count: 1 }] // 3戦目
    ],
    // 森でのラスボス戦
    forestArea: [
        [{ name: 'ニドヘグLv1', count: 1 }], // 1戦目: ニドヘグLv1 1体
        [{ name: 'ニドヘグLv2', count: 1 }], // 2戦目: ニドヘグLv2 1体
        [{ name: 'ニドヘグLv3', count: 1 }]  // 3戦目: ニドヘグLv3 1体
    ],
    // 海でのラスボス戦
    sea: [
        [{ name: 'セドナLv1', count: 1 }, { name: 'サハギン', count: 2 }], // 1戦目
        [{ name: 'セドナLv2', count: 1 }, { name: 'サハギン', count: 2 }], // 2戦目
        [{ name: 'セドナLv3', count: 1 }, { name: 'サハギン', count: 2 }] // 3戦目
    ]
};

// その他のゲーム定数
export const GAME_CONSTANTS = {
    MAX_PARTY_SIZE: 3, // ゲーム開始時の仲間加入フェーズでの最大人数
    INITIAL_FOOD: 60,
    INITIAL_MILK: 3,
    BOSS_DAYS: 10, // ボス戦が開始される日数
    MAX_DAYS: 20, // ラスボス戦が開始される日数
    RAID_BASE_SPECIAL_CHANCE: 0.1, // 特殊襲撃の基本確率
    RAID_BASE_NORMAL_CHANCE: 0.5,   // 通常襲撃の基本確率
    RECRUIT_EVENT_CHANCE: 0.7, // 仲間勧誘の基本確率
    FAVOUR_EVENT_CHANCE: 0.3, // 神の寵愛の基本確率
    RECRUIT_EVENT_CHANCE_OF_SPECIAL: 0.2, // 仲間勧誘イベントで、全ての種族が抽選の対象になる確率
    RAID_MAX_ATTEMPTS: 3, // 襲撃時のコイントス最大試行回数
    FOOD_PER_COIN: 1, // 硬貨1枚あたりの基本食料獲得量
    FOOD_BONUS_MATCH: 3, // 硬貨属性一致時の追加食料獲得量
    RAID_TRAP_REDUCTION_FACTOR: 0.6, // 罠の硬貨による襲撃確率減少係数
    RAID_FLOWER_REDUCTION_FACTOR: 0.8, // 花の硬貨による戦闘手当減少係数
    ENEMY_COIN_SCALING_DAYS: 4, // 敵の硬貨枚数スケーリングの日間隔
    DELICACY_DROP_CHANCE: 0.1, // 珍味の獲得確率
    COIN_TAIL_OPACITY: 0.2, // 硬貨が裏面の場合の透過率
};
