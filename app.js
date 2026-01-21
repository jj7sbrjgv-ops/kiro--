/**
 * 歩数計アプリケーション - エントリーポイント
 * 
 * このファイルはアプリケーションの初期化とコンポーネントの統合を担当します。
 * 
 * 要件: すべて
 */

// ブラウザ環境とNode.js環境の両方に対応
// ブラウザ環境では、各コンポーネントファイルがwindowオブジェクトに登録される
// Node.js環境（テスト用）では、requireでインポートする
const StorageManager = typeof window !== 'undefined' ? window.StorageManager : require('./StorageManager.js');
const SensorAdapter = typeof window !== 'undefined' ? window.SensorAdapter : require('./SensorAdapter.js');
const StepCounter = typeof window !== 'undefined' ? window.StepCounter : require('./StepCounter.js');
const ResetTimer = typeof window !== 'undefined' ? window.ResetTimer : require('./ResetTimer.js');
const UIController = typeof window !== 'undefined' ? window.UIController : require('./UIController.js');

// グローバル変数（アプリケーションのライフサイクル管理用）
let app = null;

/**
 * アプリケーションクラス
 * すべてのコンポーネントを統合し、ライフサイクルを管理します
 */
class StepCounterApp {
    constructor() {
        this.storageManager = null;
        this.sensorAdapter = null;
        this.stepCounter = null;
        this.resetTimer = null;
        this.uiController = null;
        this.isInitialized = false;
    }

    /**
     * アプリケーションを初期化
     * 
     * 要件:
     * - 1.3: センサーへのアクセス権限を要求
     * - 1.4: センサーアクセス拒否時のエラーハンドリング
     * - 2.2: アプリ起動時のデータ読み込み
     * - 3.4: アプリが起動していない間にリセット時刻を過ぎた場合の処理
     * - 7.1: センサー利用不可時のエラーハンドリング
     * - 7.2: ストレージアクセス失敗時のエラーハンドリング
     * - 7.3: エラー発生時のユーザーへの通知
     * - 7.4: エラー発生時でも基本的な機能を維持
     */
    async initialize() {
        try {
            console.log('歩数計アプリケーションを起動中...');

            // 1. StorageManagerの初期化
            console.log('StorageManagerを初期化中...');
            this.storageManager = new StorageManager();

            // 2. SensorAdapterの初期化
            console.log('SensorAdapterを初期化中...');
            this.sensorAdapter = new SensorAdapter();

            // センサーの利用可否を確認
            if (!this.sensorAdapter.isAvailable()) {
                console.warn('DeviceMotion APIが利用できません');
                displayError('加速度センサーが利用できません。手動カウント機能のみ利用可能です。');
                // センサーが利用できなくても、アプリケーションは継続
            }

            // 3. StepCounterの初期化
            console.log('StepCounterを初期化中...');
            this.stepCounter = new StepCounter(this.storageManager, this.sensorAdapter);

            // 保存されたデータを読み込み、センサーのリスニングを開始
            try {
                await this.stepCounter.initialize();
                console.log('StepCounterの初期化に成功しました');
            } catch (error) {
                console.error('センサーの初期化に失敗しました:', error);
                
                // センサーエラーの種類に応じたメッセージを表示
                if (error.message.includes('permission denied')) {
                    displayError('加速度センサーへのアクセスが拒否されました。設定から権限を許可してください。');
                } else if (error.message.includes('not available')) {
                    displayError('加速度センサーが利用できません。手動カウント機能のみ利用可能です。');
                } else {
                    displayError('センサーの初期化に失敗しました。一部の機能が制限される可能性があります。');
                }
                
                // センサーが利用できなくても、アプリケーションは継続
                // 手動カウント機能や設定変更は利用可能
            }

            // 4. ResetTimerの初期化
            console.log('ResetTimerを初期化中...');
            this.resetTimer = new ResetTimer(this.stepCounter, this.storageManager);
            
            // タイマーを開始（過去のリセット時刻チェックを含む）
            this.resetTimer.start();
            console.log('ResetTimerの初期化に成功しました');

            // 5. UIControllerの初期化
            console.log('UIControllerを初期化中...');
            this.uiController = new UIController(this.stepCounter, this.resetTimer);
            
            try {
                this.uiController.initialize();
                console.log('UIControllerの初期化に成功しました');
            } catch (error) {
                console.error('UIの初期化に失敗しました:', error);
                displayError('UIの初期化に失敗しました。一部の機能が利用できない可能性があります。');
                // UIエラーでもアプリケーションは継続
            }

            this.isInitialized = true;
            console.log('アプリケーションの起動に成功しました');

        } catch (error) {
            console.error('アプリケーションの起動に失敗しました:', error);
            displayError('アプリケーションの起動に失敗しました。ページを再読み込みしてください。');
            throw error;
        }
    }

    /**
     * アプリケーションをシャットダウン
     * リソースをクリーンアップします
     */
    shutdown() {
        console.log('アプリケーションをシャットダウン中...');

        try {
            // センサーのリスニングを停止
            if (this.stepCounter) {
                this.stepCounter.stopListening();
            }

            // タイマーを停止
            if (this.resetTimer) {
                this.resetTimer.stop();
            }

            this.isInitialized = false;
            console.log('アプリケーションのシャットダウンに成功しました');
        } catch (error) {
            console.error('アプリケーションのシャットダウンに失敗しました:', error);
        }
    }

    /**
     * アプリケーションが初期化されているかを確認
     * @returns {boolean} 初期化されている場合はtrue
     */
    isReady() {
        return this.isInitialized;
    }
}

// アプリケーションの初期化
document.addEventListener('DOMContentLoaded', async () => {
    try {
        app = new StepCounterApp();
        await app.initialize();
    } catch (error) {
        console.error('致命的なエラーが発生しました:', error);
    }
});

// ページのアンロード時にクリーンアップ
window.addEventListener('beforeunload', () => {
    if (app) {
        app.shutdown();
    }
});

/**
 * エラーメッセージを表示する
 * @param {string} message - 表示するエラーメッセージ
 */
function displayError(message) {
    const errorElement = document.getElementById('error-message');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.className = 'message error';
        
        // 5秒後にメッセージを消す
        setTimeout(() => {
            errorElement.textContent = '';
            errorElement.className = 'message';
        }, 5000);
    }
}

// エクスポート（テスト用）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        StepCounterApp,
        displayError
    };
}
