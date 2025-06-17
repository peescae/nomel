// helpUI.js

import { playSfx } from './musicManager.js';

/**
 * ホムンクルス画像とヘルプウィンドウの表示を管理するモジュール。
 */

let guideMessages = {}; // guideMessage.jsonの内容を保持する変数
let imagePaths = {}; // imagePathsを保持する変数

// ドラッグ関連の状態変数
let isDraggingHomunculus = false;
let homunculusOffsetX, homunculusOffsetY;

// DOMContentLoadedイベントリスナーをasync関数として定義し、fetchをawaitできるようにします。
document.addEventListener('DOMContentLoaded', async () => {
    const homunculusContainer = document.getElementById('homunculus-container');
    const homunculusImage = document.getElementById('homunculus-image');
    const homunculusSpeechBubble = document.getElementById('homunculus-speech-bubble');
    const helpOverlay = document.getElementById('help-overlay');
    const helpModalCloseButton = document.getElementById('help-modal-close-button');
    const leftAlchemyImage = document.getElementById('left-alchemy-image');
    const rightAlchemyImage = document.getElementById('right-alchemy-image');

    // 必要なDOM要素が全て存在するか確認します。
    if (homunculusContainer && homunculusImage && homunculusSpeechBubble && helpOverlay && helpModalCloseButton && leftAlchemyImage && rightAlchemyImage) {
        // ヘルプオーバーレイが初期表示されないように、念のため明示的に非表示にします。
        // style.cssでdisplay: none;が設定されていることが望ましいですが、ここでも設定します。
        helpOverlay.style.display = 'none'; 

        // imagePaths.jsonをfetchで非同期に読み込みます。
        try {
            const response = await fetch('./imagePaths.json');
            // HTTPエラー（404など）が発生した場合にエラーをスローします。
            if (!response.ok) {
                throw new Error(`imagePaths.jsonの読み込みに失敗しました: ${response.statusText}`);
            }
            imagePaths = await response.json(); // JSONとしてパースします。
            console.log("imagePathsを正常に読み込みました:", imagePaths); // デバッグ用ログ
        } catch (error) {
            console.error("imagePaths.jsonの読み込み中にエラーが発生しました:", error);
        }

        // guideMessage.jsonをfetchで非同期に読み込みます。
        try {
            const response = await fetch('./guideMessage.json');
            if (!response.ok) {
                throw new Error(`guideMessage.jsonの読み込みに失敗しました: ${response.statusText}`);
            }
            guideMessages = await response.json(); // JSONとしてパースします。
            console.log("guideMessage.jsonを正常に読み込みました:", guideMessages); // デバッグ用ログ
            // 初期メッセージを表示
            displayGuideMessage('初期表示'); 
        } catch (error) {
            console.error("guideMessage.jsonの読み込み中にエラーが発生しました:", error);
        }

        // 読み込んだimagePathsからホムンクルスの画像パスを設定します。
        const homunculusImagePath = imagePaths["ホムンクルス"];
        if (homunculusImagePath) {
            homunculusImage.src = homunculusImagePath;
            console.log("ホムンクルス画像のsrcを設定しました:", homunculusImagePath); // デバッグ用ログ
        } else {
            console.error("imagePaths.jsonに「ホムンクルス」の画像パスが見つかりません。");
            // 画像が見つからない場合、画像を非表示にするか、代替テキストを設定します。
            homunculusImage.style.display = 'none'; 
        }

        // 錬金術師の画像を初期状態では非表示にする（CSSでも設定済みだが念のため）
        leftAlchemyImage.style.display = 'none';
        rightAlchemyImage.style.display = 'none';

        // ホムンクルス画像をダブルクリックでヘルプウィンドウを表示します。
        homunculusImage.addEventListener('dblclick', () => { // 'click' を 'dblclick' に変更
            console.log("ホムンクルス画像がダブルクリックされました。"); // デバッグ用ログ
            playSfx("選択").catch(e => console.error("効果音の再生に失敗しました:", e));
            helpOverlay.style.display = 'flex'; // オーバーレイを表示
        });

        // 閉じるボタンクリックでヘルプウィンドウを非表示にします。
        helpModalCloseButton.addEventListener('click', () => {
            console.log("ヘルプモーダルの閉じるボタンがクリックされました。"); // デバッグ用ログ
            playSfx("選択").catch(e => console.error("効果音の再生に失敗しました:", e));
            helpOverlay.style.display = 'none'; // オーバーレイを非表示
        });

        // オーバーレイのどこをクリックしても閉じられるようにしますが、
        // モーダルのコンテンツ領域へのクリックは無視します。
        helpOverlay.addEventListener('click', (event) => {
            // イベントのターゲットがオーバーレイ自体である場合のみ閉じます。
            // これにより、モーダルコンテンツ内の要素をクリックしても閉じないようになります。
            if (event.target === helpOverlay) {
                console.log("ヘルプオーバーレイがモーダルコンテンツ外でクリックされました。"); // デバッグ用ログ
                helpOverlay.style.display = 'none';
            }
        });

        // ホムンクルスの初期位置を設定
        const setHomunculusInitialPosition = () => {
            const viewportWidth = window.innerWidth;
            const containerWidth = homunculusContainer.offsetWidth;

            // 初期位置を画面右上に設定（マージンを考慮）
            let initialTop = 25;
            let initialLeft = viewportWidth - containerWidth - 25;

            // 画面サイズが小さい場合の調整 (例: 768px以下の場合)
            if (viewportWidth <= 768) {
                initialTop = 10;
                initialLeft = viewportWidth - containerWidth - 10;
            }

            // 最小値チェック（画面の端からはみ出さないように）
            initialLeft = Math.max(initialLeft, 0);
            initialTop = Math.max(initialTop, 0);

            homunculusContainer.style.left = `${initialLeft}px`;
            homunculusContainer.style.top = `${initialTop}px`;
        };

        // 初期位置をDOMContentLoadedとリサイズ時に設定
        setHomunculusInitialPosition();
        window.addEventListener('resize', setHomunculusInitialPosition);


        // ドラッグイベントリスナーの設定
        homunculusContainer.addEventListener('mousedown', (e) => {
            // ホムンクルス画像または錬金術師画像上でのみドラッグ開始
            if (e.target === homunculusImage || e.target === leftAlchemyImage || e.target === rightAlchemyImage) {
                isDraggingHomunculus = true;
                homunculusOffsetX = e.clientX - homunculusContainer.getBoundingClientRect().left;
                homunculusOffsetY = e.clientY - homunculusContainer.getBoundingClientRect().top;
                homunculusContainer.style.cursor = 'grabbing';
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDraggingHomunculus) return;

            e.preventDefault(); // デフォルトのドラッグ動作（テキスト選択など）を防ぐ

            let newLeft = e.clientX - homunculusOffsetX;
            let newTop = e.clientY - homunculusOffsetY;

            // 画面境界内での移動を制限
            const maxX = window.innerWidth - homunculusContainer.offsetWidth;
            const maxY = window.innerHeight - homunculusContainer.offsetHeight;

            newLeft = Math.max(0, Math.min(newLeft, maxX));
            newTop = Math.max(0, Math.min(newTop, maxY));

            homunculusContainer.style.left = `${newLeft}px`;
            homunculusContainer.style.top = `${newTop}px`;

            // 吹き出しの位置はコンテナのflexboxで自動調整される
        });

        document.addEventListener('mouseup', () => {
            isDraggingHomunculus = false;
            homunculusContainer.style.cursor = 'grab';
        });

        // タッチイベントリスナーの設定 (モバイル対応)
        homunculusContainer.addEventListener('touchstart', (e) => {
            if (e.target === homunculusImage || e.target === leftAlchemyImage || e.target === rightAlchemyImage) {
                e.preventDefault(); // デフォルトのスクロール動作などを防ぐ
                isDraggingHomunculus = true;
                const touch = e.touches[0];
                homunculusOffsetX = touch.clientX - homunculusContainer.getBoundingClientRect().left;
                homunculusOffsetY = touch.clientY - homunculusContainer.getBoundingClientRect().top;
                homunculusContainer.style.cursor = 'grabbing';
            }
        });

        document.addEventListener('touchmove', (e) => {
            if (!isDraggingHomunculus) return;

            e.preventDefault(); // デフォルトのスクロール動作などを防ぐ
            const touch = e.touches[0];

            let newLeft = touch.clientX - homunculusOffsetX;
            let newTop = touch.clientY - homunculusOffsetY;

            const maxX = window.innerWidth - homunculusContainer.offsetWidth;
            const maxY = window.innerHeight - homunculusContainer.offsetHeight;

            newLeft = Math.max(0, Math.min(newLeft, maxX));
            newTop = Math.max(0, Math.min(newTop, maxY));

            homunculusContainer.style.left = `${newLeft}px`;
            homunculusContainer.style.top = `${newTop}px`;
        });

        document.addEventListener('touchend', () => {
            isDraggingHomunculus = false;
            homunculusContainer.style.cursor = 'grab';
        });

    } else {
        console.error("必要なDOM要素が見つかりません。helpUI.jsの初期化に失敗しました。");
        console.error("存在しない要素: ", {
            homunculusContainer: !!homunculusContainer,
            homunculusImage: !!homunculusImage,
            homunculusSpeechBubble: !!homunculusSpeechBubble,
            helpOverlay: !!helpOverlay,
            helpModalCloseButton: !!helpModalCloseButton,
            leftAlchemyImage: !!leftAlchemyImage,
            rightAlchemyImage: !!rightAlchemyImage
        });
    }
});

/**
 * ガイドメッセージをホムンクルスの吹き出しに表示する関数。
 * @param {string} messageKey - guideMessage.json に定義されたメッセージのキー。
 */
export function displayGuideMessage(messageKey) {
    const homunculusSpeechBubble = document.getElementById('homunculus-speech-bubble');
    if (homunculusSpeechBubble && guideMessages[messageKey]) {
        // メッセージ内容を更新
        homunculusSpeechBubble.innerHTML = guideMessages[messageKey].text;
        homunculusSpeechBubble.style.opacity = '1';
        homunculusSpeechBubble.style.visibility = 'visible';

        // アニメーションクラスを一旦削除
        homunculusSpeechBubble.classList.remove('bounce-animation');

        // アニメーションを再トリガーするために、強制的にリフローを発生させる
        void homunculusSpeechBubble.offsetWidth;

        // アニメーションクラスを再度追加して、アニメーションを再生
        homunculusSpeechBubble.classList.add('bounce-animation');
    } else {
        console.warn(`ガイドメッセージのキー「${messageKey}」が見つからないか、homunculus-speech-bubble要素が見つかりません。`);
    }
}
