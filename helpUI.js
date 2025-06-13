// helpUI.js

// imagePaths.jsonをimportする代わりに、fetchで動的に読み込むように変更します。
// import imagePaths from './imagePaths.json'; 

/**
 * ホムンクルス画像とヘルプウィンドウの表示を管理するモジュール。
 */

let guideMessages = {}; // guideMessage.jsonの内容を保持する変数

// DOMContentLoadedイベントリスナーをasync関数として定義し、fetchをawaitできるようにします。
document.addEventListener('DOMContentLoaded', async () => {
    const homunculusImage = document.getElementById('homunculus-image');
    const homunculusSpeechBubble = document.getElementById('homunculus-speech-bubble'); // 追加
    const helpOverlay = document.getElementById('help-overlay');
    const helpModalCloseButton = document.getElementById('help-modal-close-button');
    const leftAlchemyImage = document.getElementById('left-alchemy-image');
    const rightAlchemyImage = document.getElementById('right-alchemy-image');

    // 必要なDOM要素が全て存在するか確認します。
    if (homunculusImage && homunculusSpeechBubble && helpOverlay && helpModalCloseButton && leftAlchemyImage && rightAlchemyImage) {
        // ヘルプオーバーレイが初期表示されないように、念のため明示的に非表示にします。
        // style.cssでdisplay: none;が設定されていることが望ましいですが、ここでも設定します。
        helpOverlay.style.display = 'none'; 

        let imagePaths = {}; // imagePathsを初期化

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

        // ホムンクルス画像クリックでヘルプウィンドウを表示します。
        homunculusImage.addEventListener('click', () => {
            console.log("ホムンクルス画像がクリックされました。"); // デバッグ用ログ
            helpOverlay.style.display = 'flex'; // オーバーレイを表示
        });

        // 閉じるボタンクリックでヘルプウィンドウを非表示にします。
        helpModalCloseButton.addEventListener('click', () => {
            console.log("ヘルプモーダルの閉じるボタンがクリックされました。"); // デバッグ用ログ
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
    } else {
        console.error("必要なDOM要素が見つかりません。helpUI.jsの初期化に失敗しました。");
        console.error("存在しない要素: ", {
            homunculusImage: !!homunculusImage,
            homunculusSpeechBubble: !!homunculusSpeechBubble, // 追加
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
        homunculusSpeechBubble.innerHTML = guideMessages[messageKey].text;
        homunculusSpeechBubble.style.opacity = '1';
        homunculusSpeechBubble.style.visibility = 'visible';
    } else {
        console.warn(`ガイドメッセージのキー「${messageKey}」が見つからないか、homunculus-speech-bubble要素が見つかりません。`);
    }
}

