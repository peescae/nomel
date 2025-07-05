// guideUI.js (delicacyHelpUI.js からリネーム)

import { delicacies, coinAttributesMap, monsterTemplates, FINAL_BOSS_ENCOUNTERS } from './data.js';
import { playSfx } from './musicManager.js';
import { createCoinTooltipHtml } from './uiManager.js'; // uiManagerから関数をインポート

/**
 * 珍味ヘルプとモン娘図鑑ウィンドウの表示を管理するモジュール。
 */

let isDraggingGuide = false;
let guideOffsetX, guideOffsetY;
let guideModal; // モーダル要素を保持する変数
let currentSortKey = 'coins'; // 初期ソートキーを'coins'に変更 (モン娘図鑑用)
let sortAscending = true; // ソート順 (true: 昇順, false: 降順) (モン娘図鑑用)
let bossSortKey = 'coins'; // 初期ソートキーを'coins'に変更 (ボス図鑑用)
let bossSortAscending = true; // ソート順 (true: 昇順, false: 降順) (ボス図鑑用)

let monsterGuideData = []; // モン娘図鑑のデータを保持 (enemy属性なし)
let bossGuideData = []; // ボス図鑑のデータを保持 (enemy属性あり)

/**
 * コインIDから硬貨属性の名前を取得するヘルパー関数。
 * uiManager.js からエクスポートされていないため、ここで再定義します。
 * @param {string} coinId - 硬貨のID。
 * @param {Array<object>} map - coinAttributesMap。
 * @returns {string} 硬貨の日本語名。
 */
function getCoinAttributeName(coinId, map) {
    const coin = map.find(c => c.id === coinId);
    return coin ? coin.name : coinId;
}

/**
 * モン娘図鑑のデータを初期化し、ソートして表示する。
 * @param {object} monsterGuideJson - monsterGuide.jsonから読み込んだデータ。
 * @param {object} imagePaths - imagePaths.jsonから読み込んだ画像パス。
 */
export function initializeMonsterGuide(monsterGuideJson, imagePaths) {
    monsterGuideData = []; // データをクリア
    bossGuideData = []; // データをクリア

    monsterTemplates.forEach(template => {
        const guideInfo = monsterGuideJson[template.name] || {};
        const monster = {
            name: template.name,
            image: imagePaths[template.name] || './image/default.png',
            coins: template.coins,
            danger: guideInfo.危険度 || '不明',
            species: guideInfo.大種族 || '不明',
            description: guideInfo.解説 || '解説なし。'
        };

        // 'enemy'属性を持つモン娘はボス図鑑にのみ追加
        if (monster.coins.includes('enemy')) {
            bossGuideData.push(monster);
        }
        // それ以外は通常のモン娘図鑑に追加
        else {
            monsterGuideData.push(monster);
        }
    });

    renderMonsterGuide(); // 初期表示 (モン娘図鑑)
    renderBossGuide(); // 初期表示 (ボス図鑑)
}

/**
 * モン娘図鑑をソートして表示する。
 */
function renderMonsterGuide() {
    const monsterListDiv = document.getElementById('monster-list');
    if (!monsterListDiv) {
        console.error("DOM element 'monster-list' not found.");
        return;
    }
    monsterListDiv.innerHTML = ''; // クリア

    // データをソート
    const sortedMonsters = [...monsterGuideData].sort((a, b) => {
        let valA, valB;
        if (currentSortKey === 'danger') {
            // 危険度をカスタムソート (甲, 乙, 丙, 不明, －)
            const dangerOrder = { '甲': 1, '乙': 2, '丙': 3, '不明': 4, '－': 5 };
            valA = dangerOrder[a.danger] || 99;
            valB = dangerOrder[b.danger] || 99;
        } else if (currentSortKey === 'name') {
            valA = a.name;
            valB = b.name;
        } else if (currentSortKey === 'species') {
            valA = a.species;
            valB = b.species;
        } else if (currentSortKey === 'coins') { // 硬貨の枚数でソート
            valA = a.coins.length;
            valB = b.coins.length;
        }

        if (valA < valB) return sortAscending ? -1 : 1;
        if (valA > valB) return sortAscending ? 1 : -1;
        return 0;
    });

    sortedMonsters.forEach(monster => {
        const monsterItem = document.createElement('div');
        monsterItem.className = 'monster-guide-item';

        const coinsHtml = monster.coins.map(coinId =>
            createCoinTooltipHtml(coinId, coinAttributesMap)
        ).join(' ');

        monsterItem.innerHTML = `
            <img src="${monster.image}" alt="${monster.name}">
            <div class="monster-guide-info">
                <h4>${monster.name}</h4>
                <p><strong>硬貨:</strong> <span class="coin-attributes">${coinsHtml}</span></p>
                <p><strong>危険度:</strong> ${monster.danger}</p>
                <p><strong>大種族:</strong> ${monster.species}</p>
                <p><strong>解説:</strong> ${monster.description}</p>
            </div>
        `;
        monsterListDiv.appendChild(monsterItem);
    });
}

/**
 * ボス図鑑をソートして表示する。
 */
function renderBossGuide() {
    const bossMonsterListDiv = document.getElementById('boss-monster-list');
    if (!bossMonsterListDiv) {
        console.error("DOM element 'boss-monster-list' not found.");
        return;
    }
    bossMonsterListDiv.innerHTML = ''; // クリア

    // データをソート
    const sortedBossMonsters = [...bossGuideData].sort((a, b) => {
        let valA, valB;
        if (bossSortKey === 'danger') {
            // 危険度をカスタムソート (甲, 乙, 丙, 不明, －)
            const dangerOrder = { '甲': 1, '乙': 2, '丙': 3, '不明': 4, '－': 5 };
            valA = dangerOrder[a.danger] || 99;
            valB = dangerOrder[b.danger] || 99;
        } else if (bossSortKey === 'name') {
            valA = a.name;
            valB = b.name;
        } else if (bossSortKey === 'species') {
            valA = a.species;
            valB = b.species;
        } else if (bossSortKey === 'coins') { // 硬貨の枚数でソート
            valA = a.coins.length;
            valB = b.coins.length;
        }

        if (valA < valB) return bossSortAscending ? -1 : 1;
        if (valA > valB) return bossSortAscending ? 1 : -1;
        return 0;
    });

    sortedBossMonsters.forEach(monster => {
        const monsterItem = document.createElement('div');
        monsterItem.className = 'monster-guide-item';

        const coinsHtml = monster.coins.map(coinId =>
            createCoinTooltipHtml(coinId, coinAttributesMap)
        ).join(' ');

        monsterItem.innerHTML = `
            <img src="${monster.image}" alt="${monster.name}">
            <div class="monster-guide-info">
                <h4>${monster.name}</h4>
                <p><strong>硬貨:</strong> <span class="coin-attributes">${coinsHtml}</span></p>
                <p><strong>危険度:</strong> ${monster.danger}</p>
                <p><strong>大種族:</strong> ${monster.species}</p>
                <p><strong>解説:</strong> ${monster.description}</p>
            </div>
        `;
        bossMonsterListDiv.appendChild(monsterItem);
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    const monsterGuideButton = document.getElementById('monster-guide-button'); // 統合された図鑑ボタン
    const guideOverlay = document.getElementById('guide-overlay'); // オーバーレイを共通化
    const guideModalCloseButton = document.getElementById('guide-modal-close-button');
    guideModal = document.getElementById('guide-modal'); // モーダルを共通化
    const guideModalTitle = document.getElementById('guide-modal-title'); // タイトルを共通化
    const delicacyContentDiv = document.getElementById('delicacy-content');
    const monsterGuideContentDiv = document.getElementById('monster-guide-content');
    const bossGuideContentDiv = document.getElementById('boss-guide-content'); // ボス図鑑コンテンツ
    const tabDelicacyButton = document.getElementById('tab-delicacy');
    const tabMonsterGuideButton = document.getElementById('tab-monster-guide');
    const tabBossGuideButton = document.getElementById('tab-boss-guide'); // ボス図鑑タブボタン
    const sortBySelect = document.getElementById('sort-by'); // モン娘図鑑用ソート
    const sortOrderToggleButton = document.getElementById('sort-order-toggle'); // モン娘図鑑用ソート
    const bossSortBySelect = document.getElementById('boss-sort-by'); // ボス図鑑用ソート
    const bossSortOrderToggleButton = document.getElementById('boss-sort-order-toggle'); // ボス図鑑用ソート
    const delicacyListDiv = document.getElementById('delicacy-list');

    // monsterGuide.jsonとimagePaths.jsonを読み込む
    const [monsterGuideJson, imagePathsJson] = await Promise.all([
        fetch('./monsterGuide.json').then(res => res.json()).catch(e => { console.error("Error loading monsterGuide.json:", e); return {}; }),
        fetch('./imagePaths.json').then(res => res.json()).catch(e => { console.error("Error loading imagePaths.json:", e); return {}; })
    ]);

    // initializeMonsterGuideを呼び出してデータをセット
    initializeMonsterGuide(monsterGuideJson, imagePathsJson);

    if (!monsterGuideButton || !guideOverlay || !guideModalCloseButton || !guideModal || !guideModalTitle || !delicacyContentDiv || !monsterGuideContentDiv || !bossGuideContentDiv || !tabDelicacyButton || !tabMonsterGuideButton || !tabBossGuideButton || !sortBySelect || !sortOrderToggleButton || !bossSortBySelect || !bossSortOrderToggleButton || !delicacyListDiv) {
        console.error("ガイドウィンドウのDOM要素の一部が見つかりません。");
        return;
    }

    // 珍味リストを生成して表示
    delicacies.forEach(delicacy => {
        const delicacyItem = document.createElement('div');
        delicacyItem.className = 'delicacy-item';

        const explorerCoinsHtml = delicacy.explorerCoinAttributes.map(coinId =>
            createCoinTooltipHtml(coinId, coinAttributesMap)
        ).join(' ');

        const areaCoinsHtml = delicacy.areaCoinAttributes.map(coinId =>
            createCoinTooltipHtml(coinId, coinAttributesMap)
        ).join(' ');

        delicacyItem.innerHTML = `
            <p>
            <strong style="color:rgb(255, 174, 0);">珍味名: ${delicacy.name}</strong><br>
            <strong>探索者:</strong> <span class="coin-attributes">${explorerCoinsHtml}</span><br>
            <strong>地形:</strong> <span class="coin-attributes">${areaCoinsHtml}</span>
            </p>
        `;
        delicacyListDiv.appendChild(delicacyItem);
    });

    /**
     * ガイドウィンドウの初期位置を設定する。
     */
    const setGuideInitialPosition = () => {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const modalWidth = guideModal.offsetWidth;
        const modalHeight = guideModal.offsetHeight;

        // 画面中央より少し右上に配置
        let initialLeft = (viewportWidth / 2) - (modalWidth / 2) + 50;
        let initialTop = (viewportHeight / 2) - (modalHeight / 2) - 50;

        // 画面境界内に収まるように調整
        initialLeft = Math.max(0, Math.min(initialLeft, viewportWidth - modalWidth));
        initialTop = Math.max(0, Math.min(initialTop, viewportHeight - modalHeight));

        guideModal.style.left = `${initialLeft}px`;
        guideModal.style.top = `${initialTop}px`;
        guideModal.style.position = 'absolute'; // 絶対位置指定を有効にする
    };

    /**
     * タブを切り替える関数。
     * @param {string} tabId - 切り替えるタブのID ('delicacy', 'monster-guide', または 'boss-guide')。
     */
    const switchTab = (tabId) => {
        playSfx("選択").catch(e => console.error("効果音の再生に失敗しました:", e));

        // すべてのタブコンテンツを非表示にし、アクティブクラスを削除
        delicacyContentDiv.style.display = 'none';
        monsterGuideContentDiv.style.display = 'none';
        bossGuideContentDiv.style.display = 'none'; // ボス図鑑コンテンツも非表示に
        tabDelicacyButton.classList.remove('active');
        tabMonsterGuideButton.classList.remove('active');
        tabBossGuideButton.classList.remove('active'); // ボス図鑑タブも非アクティブに

        // 選択されたタブコンテンツを表示し、アクティブクラスを追加
        if (tabId === 'delicacy') {
            delicacyContentDiv.style.display = 'block';
            tabDelicacyButton.classList.add('active');
            guideModalTitle.textContent = '珍味';
            guideModal.style.borderColor = '#ffcc00'; // 珍味の色
            guideModalTitle.style.color = '#ffcc00';
        } else if (tabId === 'monster-guide') {
            monsterGuideContentDiv.style.display = 'block';
            tabMonsterGuideButton.classList.add('active');
            guideModalTitle.textContent = 'モン娘図鑑';
            guideModal.style.borderColor = '#61dafb'; // 図鑑の色 (例: 青)
            guideModalTitle.style.color = '#61dafb';
            renderMonsterGuide(); // 図鑑表示時に再描画
        } else if (tabId === 'boss-guide') { // ボス図鑑タブの処理
            bossGuideContentDiv.style.display = 'block';
            tabBossGuideButton.classList.add('active');
            guideModalTitle.textContent = 'ボス図鑑';
            guideModal.style.borderColor = '#ff6161'; // ボス図鑑の色 (例: 赤)
            guideModalTitle.style.color = '#ff6161';
            renderBossGuide(); // ボス図鑑表示時に再描画
        }
    };

    // 図鑑ボタンクリックでガイドウィンドウを表示/非表示をトグル
    monsterGuideButton.addEventListener('click', () => {
        if (guideOverlay.style.display === 'flex') { // ガイドが既に開いている場合
            guideOverlay.style.display = 'none'; // 非表示にする
        } else {
            guideOverlay.style.display = 'flex'; // 表示する
            switchTab('monster-guide'); // モン娘図鑑タブをデフォルトで表示
            setGuideInitialPosition(); // 表示時に初期位置を設定
        }
    });

    // 閉じるボタンクリックでガイドウィンドウを非表示
    guideModalCloseButton.addEventListener('click', () => {
        playSfx("選択").catch(e => console.error("効果音の再生に失敗しました:", e));
        guideOverlay.style.display = 'none';
    });

    // タブボタンのイベントリスナー
    tabDelicacyButton.addEventListener('click', () => switchTab('delicacy'));
    tabMonsterGuideButton.addEventListener('click', () => switchTab('monster-guide'));
    tabBossGuideButton.addEventListener('click', () => switchTab('boss-guide')); // ボス図鑑タブのイベントリスナー

    // モン娘図鑑用ソートコントロールのイベントリスナー
    sortBySelect.addEventListener('change', (e) => {
        currentSortKey = e.target.value;
        renderMonsterGuide();
    });

    sortOrderToggleButton.addEventListener('click', () => {
        sortAscending = !sortAscending;
        sortOrderToggleButton.textContent = sortAscending ? '昇順' : '降順';
        renderMonsterGuide();
    });

    // ボス図鑑用ソートコントロールのイベントリスナー
    bossSortBySelect.addEventListener('change', (e) => {
        bossSortKey = e.target.value;
        renderBossGuide();
    });

    bossSortOrderToggleButton.addEventListener('click', () => {
        bossSortAscending = !bossSortAscending;
        bossSortOrderToggleButton.textContent = bossSortAscending ? '昇順' : '降順';
        renderBossGuide();
    });

    // ドラッグイベントリスナーの設定 (Guide Modal)
    guideModal.addEventListener('mousedown', (e) => {
        // ヘッダー部分またはモーダル自体をドラッグ可能にする
        const target = e.target.closest('#guide-modal-title') || e.target;
        if (target === guideModal || target.id === 'guide-modal-title') {
            isDraggingGuide = true;
            guideOffsetX = e.clientX - guideModal.getBoundingClientRect().left;
            guideOffsetY = e.clientY - guideModal.getBoundingClientRect().top;
            guideModal.style.cursor = 'grabbing';
            e.preventDefault(); // テキスト選択などを防ぐ
        }
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDraggingGuide) return;

        let newLeft = e.clientX - guideOffsetX;
        let newTop = e.clientY - guideOffsetY;

        // 画面境界内での移動を制限
        const maxX = window.innerWidth - guideModal.offsetWidth;
        const maxY = window.innerHeight - guideModal.offsetHeight;

        newLeft = Math.max(0, Math.min(newLeft, maxX));
        newTop = Math.max(0, Math.min(newTop, maxY));

        guideModal.style.left = `${newLeft}px`;
        guideModal.style.top = `${newTop}px`;
    });

    document.addEventListener('mouseup', () => {
        isDraggingGuide = false;
        if (guideModal) {
            guideModal.style.cursor = 'grab';
        }
    });

    // タッチイベントリスナーの設定 (モバイル対応)
    guideModal.addEventListener('touchstart', (e) => {
        const target = e.target.closest('#guide-modal-title') || e.target;
        if (target === guideModal || target.id === 'guide-modal-title') {
            e.preventDefault(); // デフォルトのスクロール動作などを防ぐ
            isDraggingGuide = true;
            const touch = e.touches[0];
            guideOffsetX = touch.clientX - guideModal.getBoundingClientRect().left;
            guideOffsetY = touch.clientY - guideModal.getBoundingClientRect().top;
            guideModal.style.cursor = 'grabbing';
        }
    });

    document.addEventListener('touchmove', (e) => {
        if (!isDraggingGuide) return;

        e.preventDefault(); // デフォルトのスクロール動作などを防ぐ
        const touch = e.touches[0];

        let newLeft = touch.clientX - guideOffsetX;
        let newTop = touch.clientY - guideOffsetY;

        const maxX = window.innerWidth - guideModal.offsetWidth;
        const maxY = window.innerHeight - guideModal.offsetHeight;

        newLeft = Math.max(0, Math.min(newLeft, maxX));
        newTop = Math.max(0, Math.min(newTop, maxY));

        guideModal.style.left = `${newLeft}px`;
        guideModal.style.top = `${newTop}px`;
    });

    document.addEventListener('touchend', () => {
        isDraggingGuide = false;
        if (guideModal) {
            guideModal.style.cursor = 'grab';
        }
    });

    // リサイズ時にモーダルの位置を再調整
    window.addEventListener('resize', setGuideInitialPosition);
});
