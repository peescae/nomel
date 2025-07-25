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
    { id: 'flower', name: '花', color: 'rgb(233, 112, 202)', help: '味方全体の戦闘手当に0.8を乗算する。' },
    { id: 'fishing', name: '漁', color: 'rgb(0, 85, 134)', help: '表の場合、水の硬貨を持つ全ての敵の戦力値に1を減算する。半減まで可能。探索時、この硬貨を水の硬貨として扱う。' },
    { id: 'water', name: '水', color: 'rgb(0, 162, 255)', help: '特殊効果なし。' },
    { id: 'snow', name: '雪', color: 'rgb(173, 216, 230)', help: '特殊効果なし。' },
    { id: 'trap', name: '罠', color: 'rgb(129, 86, 55)', help: '待機時、全ての敵の戦力値に1を減算する。半減まで可能。' },
    { id: 'bow', name: '弓', color: 'rgb(102, 96, 96)', help: '表の場合、空の硬貨を持つ全ての敵の戦力値に1を減算する。半減まで可能。探索時、この硬貨を空の硬貨として扱う。' },
    { id: 'iron', name: '鉄', color: 'rgb(150, 150, 150)', help: '表の場合、この硬貨が産出する戦力値に1を加算する。' },
    { id: 'scale', name: '鱗', color: 'rgb(123, 155, 92)', help: '裏の場合、一度だけ硬貨を振り直す。' },
    { id: 'blood', name: '血', color: 'rgb(180, 0, 0)', help: '表の場合、自分の血の硬貨を全て表にし、戦闘手当を0にする。' },
    { id: 'oni', name: '鬼', color: 'rgb(200, 50, 0)', help: '必ず表になる。' },
    { id: 'power', name: '力', color: 'rgb(255, 165, 0)', help: '表の場合、この硬貨が産出する戦力値に1を加算する。' },
    { id: 'thunder', name: '雷', color: 'rgb(255, 255, 0)', help: '表の場合、雷の硬貨を持たない全ての敵の戦力値に1を減算する。半減まで可能。' },
    { id: 'fire', name: '火', color: 'rgb(255, 69, 0)', help: '表の場合、火の硬貨を持たない全ての敵の戦力値に1を減算する。半減まで可能。' },
    { id: 'poison', name: '毒', color: 'rgb(128, 0, 128)', help: '表の場合、毒の硬貨を持たない全ての敵の戦力値に1を減算する。半減まで可能。' },
    { id: 'enemy', name: '敵', color: 'rgb(50, 50, 50)', help: '敵専用。全ての地形に一致する。' },
    { id: 'machine', name: '機', color: 'rgb(50, 50, 50)', help: '敵専用。毒を無効化する。' },
];

// モン娘のテンプレート定義
// 各モン娘の名前、所持硬貨、食費を含む。
export const monsterTemplates = [
    { name: 'インプ', coins: ['sky', 'dark', 'magic'], upkeep: 3, talker: ['真面目な', '元気な', '真面目で元気な', '荒っぽい'] },
    { name: 'ゴブリン', coins: ['plain', 'forest', 'dark'], upkeep: 3, talker: ['元気な', '荒っぽい'] },
    { name: 'コロポックル', coins: ['forest', 'snow', 'fishing'], upkeep: 3, talker: ['真面目な', '元気な', '真面目で元気な', 'ゆるい'] },
    { name: 'フェアリー', coins: ['forest', 'flower', 'sky'], upkeep: 3, talker: ['元気な', 'ゆるい'] },
    { name: 'ユキンコ', coins: ['snow', 'snow', 'snow'], upkeep: 3, talker: ['真面目な', 'ゆるい'] },
    { name: 'シェリーコート', coins: ['water', 'water', 'water'], upkeep: 3, talker: ['元気な', 'ゆるい'] },
    { name: 'ローン', coins: ['water', 'snow', 'fishing'], upkeep: 3, talker: ['元気な', 'ゆるい'] },
    { name: 'グレムリン', coins: ['thunder', 'thunder', 'thunder'], upkeep: 3, talker: ['元気な', '荒っぽい'] },
    { name: 'チョンチョン', coins: ['blood', 'sky', 'sky'], upkeep: 3, talker: ['真面目な', '真面目で元気な', '上品な'] },
    { name: 'アルラウネ', coins: ['forest', 'flower', 'poison'], upkeep: 3, talker: ['真面目な', '元気な', '真面目で元気な', 'ゆるい', 'ぶっきらぼうな', '上品な'] },
    { name: 'マイコニド', coins: ['forest', 'dark', 'poison'], upkeep: 3, talker: ['真面目な', 'ゆるい', 'ぶっきらぼうな', '上品な'] },
    { name: 'ユキオンナ', coins: ['snow', 'snow', 'magic', 'magic'], upkeep: 4, talker: ['真面目な', 'ぶっきらぼうな', '上品な'] },
    { name: 'ルサルカ', coins: ['water', 'water', 'magic', 'magic'], upkeep: 4, talker: ['真面目な', '真面目で元気な', 'ぶっきらぼうな', '上品な'] },
    { name: 'ドリアード', coins: ['forest', 'forest', 'magic', 'magic'], upkeep: 4, talker: ['真面目な', 'ゆるい', 'ぶっきらぼうな', '上品な'] },
    { name: 'ネコマタ', coins: ['forest', 'forest', 'dark', 'magic'], upkeep: 4, talker: ['真面目な', '元気な', '真面目で元気な', 'ゆるい', '荒っぽい', 'ぶっきらぼうな', '上品な'] },
    { name: 'ラミア', coins: ['scale', 'forest', 'dark', 'blood'], upkeep: 4, talker: ['真面目な', 'ぶっきらぼうな', '上品な'] },
    { name: 'メリサンド', coins: ['scale', 'scale', 'water', 'sky'], upkeep: 4, talker: ['真面目な', '真面目で元気な', '上品な'] },
    { name: 'ハーピー', coins: ['forest', 'forest', 'sky', 'sky'], upkeep: 4, talker: ['元気な', 'ゆるい', '荒っぽい', 'ぶっきらぼうな'] },
    { name: 'セイレーン', coins: ['water', 'water', 'sky', 'sky'], upkeep: 4, talker: ['真面目な', '元気な', '真面目で元気な', 'ゆるい', '荒っぽい', 'ぶっきらぼうな', '上品な'] },
    { name: 'ベイコク', coins: ['forest', 'plain', 'dark', 'bow'], upkeep: 4, talker: ['荒っぽい', 'ぶっきらぼうな'] },
    { name: 'セルキー', coins: ['water', 'snow', 'fishing', 'fishing', 'iron'], upkeep: 5, talker: ['真面目な', '元気な', '真面目で元気な', 'ゆるい', '荒っぽい', 'ぶっきらぼうな'] },
    { name: 'ジョローグモ', coins: ['forest', 'forest', 'dark', 'dark', 'trap'], upkeep: 5, talker: ['真面目な', '上品な'] },
    { name: 'セントール', coins: ['plain', 'plain', 'plain', 'bow', 'bow'], upkeep: 5, talker: ['真面目な', '真面目で元気な', '荒っぽい', 'ぶっきらぼうな'] },
    { name: 'ワーウルフ', coins: ['plain', 'plain', 'forest', 'forest', 'iron'], upkeep: 5, talker: ['真面目な', '元気な', '真面目で元気な', 'ゆるい', '荒っぽい', 'ぶっきらぼうな'] },
    { name: 'リザードマン', coins: ['scale', 'scale', 'forest', 'forest', 'iron'], upkeep: 5, talker: ['真面目な', '元気な', '真面目で元気な', 'ゆるい', '荒っぽい', 'ぶっきらぼうな'] },
    { name: 'サハギン', coins: ['scale', 'scale', 'water', 'water', 'iron'], upkeep: 5, talker: ['真面目な', '元気な', '真面目で元気な', 'ゆるい', '荒っぽい', 'ぶっきらぼうな'] },
    { name: 'オニ', coins: ['oni', 'oni', 'oni', 'forest', 'iron'], upkeep: 5, talker: ['真面目な', '元気な', '真面目で元気な', '荒っぽい', 'ぶっきらぼうな'] },
    { name: 'ヴァンパイア', coins: ['oni', 'dark', 'magic', 'blood', 'blood'], upkeep: 5, talker: ['真面目な', 'ぶっきらぼうな', '上品な'] },
    { name: 'ヴィーヴル', coins: ['scale', 'scale', 'dark', 'dark', 'sky', 'sky'], upkeep: 6, talker: ['真面目な', '真面目で元気な', '荒っぽい', 'ぶっきらぼうな', '上品な'] },
    { name: 'キクロプス', coins: ['oni', 'oni', 'oni', 'thunder', 'thunder', 'iron', 'iron'], upkeep: 7, talker: ['真面目な', '元気な', '真面目で元気な', 'ゆるい', '荒っぽい', 'ぶっきらぼうな'] },
    { name: 'カリブディス', coins: ['water', 'water', 'water', 'water', 'power', 'power', 'power', 'power'], upkeep: 8, talker: ['真面目な', '元気な', '真面目で元気な', 'ゆるい', '荒っぽい', 'ぶっきらぼうな', '上品な'] },
    { name: 'ドラゴニュート', coins: ['scale', 'scale', 'sky', 'sky', 'fire', 'fire', 'poison', 'poison'], upkeep: 8, talker: ['真面目な', '元気な', '真面目で元気な', 'ゆるい', '荒っぽい', 'ぶっきらぼうな', '上品な'] },
    { name: 'ツチグモLv1', coins: ['enemy', 'machine'], upkeep: 2, talker: ['none'] },
    { name: 'ツチグモLv2', coins: ['enemy', 'machine', 'machine'], upkeep: 3, talker: ['none'] },
    { name: 'タタリモッケ', coins: ['enemy', 'machine', 'sky'], upkeep: 3, talker: ['none'] },
    { name: 'ヒノクルマ', coins: ['enemy', 'machine', 'fire'], upkeep: 3, talker: ['none'] },
    { name: 'エンプーサ', coins: ['enemy', 'scale', 'blood'], upkeep: 3, talker: ['真面目な', '元気な', '真面目で元気な', 'ゆるい', 'ぶっきらぼうな', '上品な'] },
    { name: 'グーラLv1', coins: ['enemy', 'oni', 'blood'], upkeep: 3, talker: ['荒っぽい', '不愛想な', '粗暴な'] },
    { name: 'グーラLv2', coins: ['enemy', 'oni', 'blood', 'power'], upkeep: 4, talker: ['荒っぽい', '不愛想な', '粗暴な'] },
    { name: 'グーラLv3', coins: ['enemy', 'oni', 'blood', 'power', 'power'], upkeep: 5, talker: ['荒っぽい', '不愛想な', '粗暴な'] },
    { name: 'ガーゴイル', coins: ['enemy', 'iron', 'iron', 'iron', 'sky'], upkeep: 5, talker: ['真面目な', '真面目で元気な', 'ぶっきらぼうな'] },
    { name: 'サキュバス', coins: ['enemy', 'flower', 'dark', 'magic'], upkeep: 4, talker: ['真面目な', '元気な', '真面目で元気な', 'ゆるい', 'ぶっきらぼうな', '上品な'] },
    { name: 'アテルイ', coins: ['enemy', 'snow', 'oni', 'oni', 'iron', 'iron', 'bow', 'bow'], upkeep: 8, talker: ['真面目で元気な'] },
    { name: 'スライム', coins: ['enemy', 'forest', 'forest', 'water', 'water', 'flower', 'flower', 'poison', 'poison', 'poison', 'poison', 'poison', 'poison', 'poison', 'poison'], upkeep: 15, talker: ['ゆるい'] },
    { name: 'スフィンクス', coins: ['enemy', 'plain', 'plain', 'plain', 'plain', 'sky', 'sky', 'sky', 'sky', 'magic', 'magic', 'magic', 'magic'], upkeep: 13, talker: ['真面目な'] },
    { name: 'エキドナLv1', coins: ['enemy', 'scale', 'scale', 'scale', 'scale', 'poison', 'poison', 'poison', 'poison', 'dark', 'dark', 'dark', 'dark'], upkeep: 13, talker: ['上品な'] },
    { name: 'エキドナLv2', coins: ['enemy', 'scale', 'scale', 'scale', 'scale', 'scale', 'poison', 'poison', 'poison', 'poison', 'poison', 'dark', 'dark', 'dark', 'dark', 'dark'], upkeep: 16, talker: ['上品な'] },
    { name: 'エキドナLv3', coins: ['enemy', 'scale', 'scale', 'scale', 'scale', 'scale', 'scale', 'poison', 'poison', 'poison', 'poison', 'poison', 'poison', 'dark', 'dark', 'dark', 'dark', 'dark', 'dark'], upkeep: 19, talker: ['上品な'] },
    { name: 'ニドヘグLv1', coins: ['enemy', 'scale', 'scale', 'scale', 'scale', 'scale', 'scale', 'scale', 'scale', 'scale', 'scale', 'scale', 'scale', 'scale', 'scale', 'scale', 'scale', 'scale', 'scale', 'scale', 'scale', 'scale', 'forest', 'forest', 'forest', 'dark', 'dark', 'dark'], upkeep: 28, talker: ['荒っぽい'] },
    { name: 'ニドヘグLv2', coins: ['enemy', 'scale', 'scale', 'scale', 'scale', 'scale', 'scale', 'scale', 'scale', 'scale', 'scale', 'scale', 'scale', 'scale', 'scale', 'scale', 'scale', 'scale', 'scale', 'scale', 'scale', 'scale', 'scale', 'scale', 'scale', 'scale', 'scale', 'scale', 'forest', 'forest', 'forest', 'forest', 'dark', 'dark', 'dark', 'dark'], upkeep: 36, talker: ['荒っぽい'] },
    { name: 'ニドヘグLv3', coins: ['enemy', 'scale', 'scale', 'scale', 'scale', 'scale', 'scale', 'scale', 'scale', 'scale', 'scale', 'scale', 'scale', 'scale', 'scale', 'scale', 'scale', 'scale', 'scale', 'scale', 'scale', 'scale', 'scale', 'scale', 'scale', 'scale', 'scale', 'scale', 'scale', 'scale', 'scale', 'scale', 'scale', 'scale', 'forest', 'forest', 'forest', 'forest', 'forest', 'dark', 'dark', 'dark', 'dark', 'dark'], upkeep: 44, talker: ['荒っぽい'] },
    { name: 'セドナLv1', coins: ['enemy', 'scale', 'scale', 'scale', 'scale', 'scale', 'water', 'water', 'water', 'snow', 'snow', 'snow'], upkeep: 12, talker: ['ぶっきらぼうな'] },
    { name: 'セドナLv2', coins: ['enemy', 'scale', 'scale', 'scale', 'scale', 'scale', 'water', 'water', 'water', 'water', 'snow', 'snow', 'snow', 'snow'], upkeep: 14, talker: ['ぶっきらぼうな'] },
    { name: 'セドナLv3', coins: ['enemy', 'scale', 'scale', 'scale', 'scale', 'scale', 'water', 'water', 'water', 'water', 'water', 'snow', 'snow', 'snow', 'snow', 'snow'], upkeep: 16, talker: ['ぶっきらぼうな'] },
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
    { id: 'waterForest', name: '拠水林', coinAttributes: ['water', 'water', 'forest'] },
    { id: 'jungle', name: '密林', coinAttributes: ['forest', 'dark'] },
    { id: 'peatCave', name: '泥炭洞', coinAttributes: ['forest', 'water', 'dark'] },
    { id: 'cherryBlossomTrees', name: '桜並木', coinAttributes: ['forest', 'flower'] },
    { id: 'deepJungle', name: '樹海', coinAttributes: ['forest', 'forest', 'dark', 'dark'] },
    { id: 'caveWarehouse', name: '洞穴倉庫', coinAttributes: ['forest', 'water', 'snow', 'dark'] },
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
    { id: 'onigashima', name: '鬼ヶ島', coinAttributes: ['oni', 'oni', 'forest', 'forest', 'water', 'sky'] },
    { id: 'dragonPlace', name: '竜宮城', coinAttributes: ['water', 'water', 'water', 'scale', 'scale', 'scale'] },
    { id: 'fairyland', name: '妖精郷', coinAttributes: ['forest', 'forest', 'flower', 'flower', 'magic', 'magic'] },
    { id: 'ninjaHouse', name: '忍者屋敷', coinAttributes: ['forest', 'forest', 'dark', 'dark', 'trap', 'trap'] },
    { id: 'spotrtsGym', name: 'ジム', coinAttributes: ['power', 'power', 'power'] },
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
    { name: '食火鶏', explorerCoinAttributes : ['fire'], areaCoinAttributes : ['plain'], milkConversion: 1 },
    { name: '海鞘', explorerCoinAttributes : ['forest'], areaCoinAttributes : ['water'], milkConversion: 1 },
    { name: '飛び魚', explorerCoinAttributes : ['sky'], areaCoinAttributes : ['water'], milkConversion: 1 },
    { name: '花鯛', explorerCoinAttributes : ['flower'], areaCoinAttributes : ['water'], milkConversion: 1 },
    { name: '雪鱒', explorerCoinAttributes : ['snow'], areaCoinAttributes : ['water'], milkConversion: 1 },
    { name: '秋刀魚', explorerCoinAttributes : ['iron'], areaCoinAttributes : ['water'], milkConversion: 1 },
    { name: '海蛇', explorerCoinAttributes : ['scale'], areaCoinAttributes : ['water'], milkConversion: 1 },
    { name: '八目鰻', explorerCoinAttributes : ['blood'], areaCoinAttributes : ['water'], milkConversion: 1 },
    { name: '蛍烏賊', explorerCoinAttributes : ['thunder'], areaCoinAttributes : ['water'], milkConversion: 1 },
    { name: '地鴫', explorerCoinAttributes : ['plain'], areaCoinAttributes : ['sky'], milkConversion: 1 },
    { name: '川蝉', explorerCoinAttributes : ['water'], areaCoinAttributes : ['sky'], milkConversion: 1 },
    { name: '鷹の爪', explorerCoinAttributes : ['sky'], areaCoinAttributes : ['forest'], milkConversion: 1 },
    { name: '花鹿', explorerCoinAttributes : ['flower'], areaCoinAttributes : ['forest'], milkConversion: 1 },
    { name: '槌の子', explorerCoinAttributes : ['scale'], areaCoinAttributes : ['forest'], milkConversion: 1 },
    { name: 'プロテイン', explorerCoinAttributes : ['power'], areaCoinAttributes : ['power'], milkConversion: 1 },
    { name: '土栗', explorerCoinAttributes : ['plain'], areaCoinAttributes : ['forest', 'dark'], milkConversion: 1 },
    { name: '木耳', explorerCoinAttributes : ['water'], areaCoinAttributes : ['forest', 'dark'], milkConversion: 1 },
    { name: '花弁茸', explorerCoinAttributes : ['flower'], areaCoinAttributes : ['forest', 'dark'], milkConversion: 1 },
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
        [{ name: 'サキュバス', count: 6 }], // 2戦目
        [{ name: 'サキュバス', count: 10 }], // 3戦目
    ],
    // 砦でのラスボス戦
    fortress: [
        [{ name: 'アテルイ', count: 1 }, { name: 'キクロプス', count: 1 }, { name: 'ワーウルフ', count: 4 }, { name: 'セントール', count: 4 }], // 1戦目
        [{ name: 'アテルイ', count: 1 }, { name: 'キクロプス', count: 1 }, { name: 'オニ', count: 6 }], // 2戦目
        [{ name: 'アテルイ', count: 1 }, { name: 'キクロプス', count: 1 }] // 3戦目
    ],
    // 沼でのラスボス戦
    swamp: [
        [{ name: 'スライム', count: 1 }], // 1戦目
        [{ name: 'スライム', count: 2 }], // 2戦目
        [{ name: 'スライム', count: 4 }]  // 3戦目
    ],
    // 砂でのラスボス戦
    sand: [
        [{ name: 'スフィンクス', count: 1 }], // 1戦目
        [{ name: 'スフィンクス', count: 3 }], // 2戦目
        [{ name: 'スフィンクス', count: 5 }]  // 3戦目
    ],
    // 闇でのラスボス戦
    darkness: [
        [{ name: 'エキドナLv1', count: 1 }, { name: 'リザードマン', count: 6 }], // 1戦目
        [{ name: 'エキドナLv2', count: 1 }, { name: 'ドラゴニュート', count: 3 }], // 2戦目
        [{ name: 'エキドナLv3', count: 1 }] // 3戦目
    ],
    // 森でのラスボス戦
    forestArea: [
        [{ name: 'ニドヘグLv1', count: 1 }], // 1戦目
        [{ name: 'ニドヘグLv2', count: 1 }], // 2戦目
        [{ name: 'ニドヘグLv3', count: 1 }]  // 3戦目
    ],
    // 海でのラスボス戦
    sea: [
        [{ name: 'セドナLv1', count: 1 }, { name: 'シェリーコート', count: 5 }], // 1戦目
        [{ name: 'セドナLv2', count: 1 }, { name: 'ルサルカ', count: 5 }], // 2戦目
        [{ name: 'セドナLv3', count: 1 }, { name: 'サハギン', count: 5 }] // 3戦目
    ]
};

// 覇権争い
export const specialParty = [
    { name: 'サキュバス', member: ['サキュバス', 'サキュバス', 'サキュバス', 'サキュバス', 'サキュバス', 'サキュバス', 'エンプーサ', 'エンプーサ', 'エンプーサ', 'エンプーサ', 'エンプーサ', 'エンプーサ'] },
    { name: 'グーラ', member: ['グーラLv2', 'グーラLv2', 'グーラLv2', 'グーラLv2', 'グーラLv2', 'グーラLv2', 'グーラLv2', 'グーラLv2', 'グーラLv2', 'グーラLv2'] },
    { name: 'ガーゴイル', member: ['ガーゴイル', 'ガーゴイル', 'ガーゴイル', 'ガーゴイル', 'ガーゴイル', 'ガーゴイル', 'ガーゴイル', 'ガーゴイル'] },
    { name: 'アテルイ', member: ['アテルイ', 'キクロプス', 'オニ', 'ワーウルフ', 'セントール', 'ユキオンナ', 'ユキンコ', 'コロポックル'] },
    { name: 'スライム', member: ['スライム', 'スライム', 'アルラウネ', 'アルラウネ', 'アルラウネ', 'アルラウネ', 'アルラウネ'] },
    { name: 'スフィンクス', member: ['スフィンクス', 'スフィンクス', 'ベイコク', 'ベイコク', 'ベイコク', 'ベイコク', 'ベイコク'] },
    { name: 'エキドナ', member: ['エキドナLv1', 'ドラゴニュート', 'リザードマン', 'リザードマン', 'リザードマン', 'リザードマン'] },
    { name: 'ニドヘグ', member: ['ニドヘグLv1', 'ゴブリン', 'ゴブリン', 'マイコニド', 'マイコニド'] },
    { name: 'セドナ', member: ['セドナLv1', 'カリブディス', 'サハギン', 'サハギン', 'ルサルカ', 'ルサルカ', 'シェリーコート', 'シェリーコート'] },
];

// 人生
export const life = [
    { name: '農家', help: '野営時の合計食料消費量に0.8を乗算する。' },
    { name: '冒険家', help: '地形の選択肢の数に2を加算する。' },
    { name: '軍人', help: 'コイントスの回数に2を加算する。味方全員の戦力値に1を加算する。' },
    { name: '炉裏魂', help: '野営時のミルクの生産量に1を加算する。硬貨の枚数が4枚以上の種族を仲間にできない。' },
];

// 日替わりチャレンジ
export const dailyCharange = [
    { name: '新婚旅行', type: ['ミルク', '仲間人数', '地形選択肢数'], help: '野営時のミルクの生産量に1を加算する。初日に選んだ1人までしか雇えない。ボス戦が3戦目から始まる。地形の選択肢に1を加算する。' },
    { name: '両手に花', type: ['ミルク', '仲間人数', '地形選択肢数'], help: '野営時のミルクの生産量に1を加算する。初日に選んだ2人までしか雇えない。ボス戦が3戦目から始まる。地形の選択肢に1を加算する。' },
    { name: '三銃士', type: ['ミルク', '仲間人数', '地形選択肢数'], help: '野営時のミルクの生産量に1を加算する。初日に選んだ3人までしか雇えない。ボス戦が2戦目から始まる。地形の選択肢に1を加算する。' },
    { name: '覇権争い', type: ['仲間人数', '地形選択肢数'], help: 'ボスを1人選んで出発する。追加でモン娘を雇えない。地形の選択肢に1を加算する。初期食料に2を乗算する。' },
    { name: '禁酒法', type: ['ミルク'], help: '味方にミルクを提供できない。' },
    { name: '無信仰', type: ['寵愛'], help: '神の寵愛を得られない。' },
    { name: '一神教', type: ['寵愛'], help: '神の寵愛で得られる硬貨が1種類のみになる。' },
    { name: '神寵者', type: ['寵愛', 'イベント'], help: '毎日神の寵愛を得る。' },
    { name: '廃刀令', type: ['硬貨制限'], help: '（ボス戦を除いて）鉄と弓の硬貨を持つモン娘と地形が出現しない。' },
    { name: '渇水', type: ['硬貨制限'], help: '（ボス戦を除いて）水と雪と漁の硬貨を持つモン娘と地形が出現しない。' },
    { name: '大原動機', type: ['硬貨制限'], help: '（ボス戦を除いて）森の硬貨を持つモン娘と地形が出現しない。' },
    { name: '奈落', type: ['硬貨制限'], help: '必ず地形に闇が含まれる。' },
    { name: '妹の日', type: ['仲間人数', 'イベント'], help: '毎日妹が加入する。' },
    { name: '排他的', type: ['仲間人数', '仲間制限'], help: '最初に仲間にした3人と同じ種族しか仲間にできない。' },
    { name: '高地人', type: ['仲間人数', '仲間制限'], help: '重複する種族を仲間にできない。' },
    { name: '新兵器', type: ['帝国', '追加硬貨'], help: '帝国の侵略兵器が追加の硬貨を得る。' },
    { name: '戦争中', type: ['帝国'], help: '毎日帝国の侵略兵器が襲撃してくる。' },
    { name: '休戦中', type: ['帝国'], help: '帝国の侵略兵器が襲撃してこない。' },
    { name: '地の利', type: ['戦力値'], help: '地形の属性と一致している硬貨が産出する戦力値に1を加算する。' },
    { name: '竜王戦', type: ['戦力値'], help: '鱗の硬貨が産出する戦力値に1を加算する。' },
    { name: '悪魔城', type: ['戦力値'], help: '血の硬貨が産出する戦力値に1を加算する。' },
    { name: '耐性', type: ['戦力値'], help: '硬貨の特殊効果によって減算する戦力値の上限が1/4になる。' },
    { name: '全力', type: ['コイントス'], help: '全ての硬貨が表になる。コイントスの回数が1回になる。' },
    { name: '縄張り', type: ['コイントス', '地形選択肢数'], help: '地形の属性と一致していない全ての硬貨が裏になる。地形の選択肢に1を加算する。コイントスの回数が1回になる。' },
    { name: '巨人', type: ['追加硬貨'], help: 'モン娘がより多くの追加硬貨を得て出現する。' },
    { name: '均質', type: ['追加硬貨'], help: '全てのモン娘は追加硬貨を得られない。' },
];


// その他のゲーム定数
export const GAME_CONSTANTS = {
    MAX_PARTY_SIZE: 3, // ゲーム開始時の仲間加入フェーズでの最大人数
    INITIAL_FOOD: 70,
    INITIAL_MILK: 3,
    BOSS_DAYS: 10, // ボス戦が開始される日数
    MAX_DAYS: 20, // ラスボス戦が開始される日数
    RAID_BASE_SPECIAL_CHANCE: 0.3, // 特殊襲撃の基本確率
    RAID_BASE_DUEL_CHANCE: 0.2, // 決闘の基本確率
    RAID_BASE_NORMAL_CHANCE: 0.5,   // 通常襲撃の基本確率
    RAID_EMPIRE_MIN_PARTY_SIZE: 4, // 帝国の襲撃が発生する最低仲間人数
    RAID_EMPIRE_CHANCE: 3, // 帝国の襲撃確率(仲間の人数)
    RAID_EMPIRE_COUNT: 2, // 帝国の襲撃回数(仲間の人数)
    FAVOUR_EVENT_CHANCE: 0.1, // 神の寵愛の基本確率
    SISTER_EVENT_CHANCE: 0.2, // 妹加入の基本確率
    RECRUIT_EVENT_CHANCE: 0.7, // 仲間勧誘の基本確率
    RECRUIT_EVENT_CHANCE_OF_SPECIAL: 0.25, // 仲間勧誘イベントで、全ての種族が抽選の対象になる確率
    RAID_MAX_ATTEMPTS: 3, // 襲撃時のコイントス最大試行回数
    FOOD_SUPPLY: 3, // 探索時の食料獲得量
    FOOD_PER_COIN: 1, // 硬貨1枚あたりの基本食料獲得量
    FOOD_BONUS_MATCH: 3, // 硬貨属性一致時の追加食料獲得量
    SPECIAL_RAID_BONUS: 4, // 特殊襲撃勝利時の獲得食料係数
    TRADE_FOOD_INITIAL_COST: 30, // 食料交換の基本数量
    TRADE_FOOD_SCALING_COST: 10, // 食料交換のスケーリング量
    RAID_FLOWER_REDUCTION_FACTOR: 0.8, // 花の硬貨による戦闘手当減少係数
    ENEMY_COIN_SCALING_DAYS: 4, // 敵の硬貨枚数スケーリングの日間隔
    ENEMY_COUNT_SCALING_DAYS: 2, // 敵の出現数スケーリングの日間隔
    ENEMY_MIN_COIN_COUNT: 3, // 敵の硬貨の最小枚数
    AREA_COIN_SCALING_DAYS: 4, // 地形の硬貨枚数のスケーリングの日間隔
    COIN_TAIL_OPACITY: 0.2, // 硬貨が裏面の場合の透過率
    FARMER_SAVINGS: 0.8, // 農家が節約する食料の消費倍率
    SELECT_AREA_SIZE: 3, // 探索エリアの選択肢の数
    SELECT_AREA_ADVENTURER: 5, // 冒険家の探索エリアの選択肢の数
};
