// speechBubbleManager.js

/**
 * @file モン娘の吹き出し表示を管理するモジュール。
 */

let speechBubbleElement; // 吹き出しのDOM要素
let talkData = {}; // monsterTalk.json のデータを保持

/**
 * monsterTalk.json から台詞データをロードする。
 * @returns {Promise<void>}
 */
async function loadMonsterTalkData() {
    if (Object.keys(talkData).length === 0) { // データがまだロードされていない場合のみロード
        try {
            const response = await fetch('./monsterTalk.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            talkData = await response.json();
            console.log('Monster talk data loaded:', talkData);
        } catch (error) {
            console.error('Error loading monsterTalk.json:', error);
        }
    }
}

/**
 * 吹き出し要素を初期化する。
 * 初回のみ呼び出され、bodyにアタッチされる。
 */
function createSpeechBubbleElement() {
    if (!speechBubbleElement) {
        speechBubbleElement = document.createElement('div');
        speechBubbleElement.id = 'monster-speech-bubble';
        speechBubbleElement.classList.add('monster-speech-bubble'); // スタイルを適用するためのクラス
        document.body.appendChild(speechBubbleElement);
    }
}

/**
 * 仲間モン娘に吹き出しで喋らせる関数。
 * @param {Array<Object>} party - 仲間モン娘の配列。各モン娘は `name` と `talker` 属性を持つ。
 * @param {string} category - 台詞のカテゴリ ('起床', '探索' など)。
 * @param {Function} random - 疑似乱数生成関数。
 */
export async function showSpeechBubble(party, category, random) {
    await loadMonsterTalkData(); // 台詞データをロード

    if (!speechBubbleElement) {
        createSpeechBubbleElement(); // 吹き出し要素を作成
    }

    if (!party || party.length === 0) {
        console.warn("パーティにモン娘がいません。吹き出しを表示できません。");
        return;
    }

    // パーティからランダムに1人モン娘を選択
    const chosenMonster = party[Math.floor(random() * party.length)];
    const monsterTalker = chosenMonster.talker; // モン娘のtalker属性を取得

    // monsterTalk.jsonから該当する台詞を検索
    const relevantTalks = Object.values(talkData).filter(
        talk => talk.talker === monsterTalker && talk.category === category
    );

    if (relevantTalks.length === 0) {
        console.warn(`"${monsterTalker}" の "${category}" カテゴリの台詞が見つかりませんでした。`);
        return;
    }

    // 該当する台詞の中からランダムに1つ選択
    const chosenTalk = relevantTalks[Math.floor(random() * relevantTalks.length)];

    // 吹き出しにテキストと画像をセット
    speechBubbleElement.innerHTML = `
        <img src="./image/${chosenMonster.name}.png" alt="${chosenMonster.name}" class="monster-speech-image">
        <span>${chosenTalk.text}</span>
    `;

    // 吹き出しを表示
    speechBubbleElement.style.opacity = '1';
    speechBubbleElement.style.visibility = 'visible';

    // 一定時間後に吹き出しを非表示にする
    setTimeout(() => {
        speechBubbleElement.style.opacity = '0';
        speechBubbleElement.style.visibility = 'hidden';
    }, 1600); // 1.6秒後に非表示
}
