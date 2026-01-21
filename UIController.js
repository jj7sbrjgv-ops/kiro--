/**
 * UIController - ユーザーインターフェースの表示と操作を管理するコンポーネント
 * 
 * 要件:
 * - 1.2: 歩数が増加した場合、更新された歩数を即座に画面に表示する
 * - 4.1: リセット時刻を設定するためのユーザーインターフェースを提供する
 * - 4.2: ユーザーがリセット時刻を変更した場合、新しいリセット時刻を検証し、有効な時刻形式であることを確認する
 * - 5.1: 現在の歩数を大きく見やすいフォントで表示する
 * - 5.2: 次のリセット予定時刻を表示する
 * - 5.3: リセット時刻を変更するための設定画面を提供する
 * - 5.4: 画面が表示されている場合、歩数の更新をリアルタイムで反映する
 */
class UIController {
  /**
   * UIControllerのコンストラクタ
   * @param {StepCounter} stepCounter - 歩数カウンターのインスタンス
   * @param {ResetTimer} resetTimer - リセットタイマーのインスタンス
   */
  constructor(stepCounter, resetTimer) {
    this.stepCounter = stepCounter;
    this.resetTimer = resetTimer;
    this.elements = {};
  }

  /**
   * UI要素を初期化
   * 
   * 要件:
   * - 4.1: リセット時刻を設定するためのユーザーインターフェースを提供する
   * - 5.3: リセット時刻を変更するための設定画面を提供する
   */
  initialize() {
    // DOM要素を取得
    this.elements = {
      stepDisplay: document.getElementById('step-display'),
      nextResetDisplay: document.getElementById('next-reset'),
      resetTimeInput: document.getElementById('reset-time-input'),
      saveButton: document.getElementById('save-reset-time'),
      errorMessage: document.getElementById('error-message'),
      permissionButton: document.getElementById('request-permission-btn'),
      manualCountButton: document.getElementById('manual-count-btn'),
      debugInfo: document.getElementById('debug-info'),
      sensorStatus: document.getElementById('sensor-status'),
      sensorStatusText: document.getElementById('sensor-status-text'),
      iosSettingsHelp: document.getElementById('ios-settings-help')
    };

    // デバッグ情報を表示
    this.showDebugInfo();

    // 必須要素の存在確認
    const requiredElements = ['stepDisplay', 'nextResetDisplay', 'resetTimeInput', 'saveButton', 'errorMessage'];
    for (const elementName of requiredElements) {
      if (!this.elements[elementName]) {
        throw new Error(`Required UI element not found: ${elementName}`);
      }
    }

    // イベントリスナーを設定
    this.setupEventListeners();

    // 現在のリセット時刻を入力フィールドに設定
    const currentResetTime = this.resetTimer.storageManager.getResetTime();
    this.elements.resetTimeInput.value = currentResetTime;

    // 初期表示を更新
    this.updateDisplay();
  }

  /**
   * イベントリスナーを設定
   * 
   * 要件:
   * - 4.1: リセット時刻を設定するためのユーザーインターフェースを提供する
   * - 5.4: 画面が表示されている場合、歩数の更新をリアルタイムで反映する
   */
  setupEventListeners() {
    // 保存ボタンのクリックイベント
    this.elements.saveButton.addEventListener('click', () => {
      this.handleResetTimeChange();
    });

    // 手動カウントボタン
    if (this.elements.manualCountButton) {
      this.elements.manualCountButton.addEventListener('click', () => {
        this.stepCounter.incrementStep();
        this.showSuccess('1歩追加しました');
      });
    }

    // センサー権限リクエストボタン（iOS用）
    if (this.elements.permissionButton) {
      // iOSの場合は常にボタンを表示
      const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
      
      if (isIOS) {
        this.elements.permissionButton.style.display = 'block';
        // 手動カウントボタンも表示（センサーが使えない場合の代替手段）
        if (this.elements.manualCountButton) {
          this.elements.manualCountButton.style.display = 'block';
        }
      }
      
      this.elements.permissionButton.addEventListener('click', async (event) => {
        // イベント伝播を停止
        event.preventDefault();
        event.stopPropagation();
        
        try {
          console.log('=== センサー権限ボタンがクリックされました ===');
          console.log('DeviceMotionEvent:', typeof DeviceMotionEvent);
          console.log('requestPermission:', typeof DeviceMotionEvent?.requestPermission);
          
          // iOS 13+の場合、ここで直接権限をリクエスト（ユーザージェスチャー内で実行）
          if (typeof DeviceMotionEvent !== 'undefined' && 
              typeof DeviceMotionEvent.requestPermission === 'function') {
            console.log('iOS 13+: requestPermission を呼び出します');
            
            try {
              // 権限リクエストを直接実行（awaitなし）
              const permissionPromise = DeviceMotionEvent.requestPermission();
              console.log('Permission promise created:', permissionPromise);
              
              const permission = await permissionPromise;
              console.log('権限の結果:', permission);
              
              if (permission === 'granted') {
                console.log('✅ 権限が許可されました');
                
                // 権限取得後、センサーのリスニングを開始（権限リクエストはスキップ）
                this.stepCounter.sensorAdapter.permissionGranted = true;
                await this.stepCounter.sensorAdapter.startListening(
                  this.stepCounter.onMotionDetected.bind(this.stepCounter),
                  true // skipPermission = true
                );
                
                this.showSuccess('✅ センサーが起動しました！歩いてみてください');
                this.elements.permissionButton.style.display = 'none';
                
                // iOS設定案内を非表示
                if (this.elements.iosSettingsHelp) {
                  this.elements.iosSettingsHelp.style.display = 'none';
                }
                
                console.log('センサーの起動に成功しました');
              } else if (permission === 'denied') {
                console.error('❌ 権限が拒否されました');
                this.showError('センサーへのアクセスが拒否されました');
                
                // iOS設定案内を表示
                if (this.elements.iosSettingsHelp) {
                  this.elements.iosSettingsHelp.style.display = 'block';
                }
                
                // 手動カウントボタンを強調表示
                if (this.elements.manualCountButton) {
                  this.elements.manualCountButton.style.display = 'block';
                  this.elements.manualCountButton.style.background = '#28a745';
                  this.elements.manualCountButton.textContent = '👆 手動カウントを使う';
                }
              } else {
                console.warn('⚠️ 不明な権限状態:', permission);
                this.showError('権限の状態が不明です: ' + permission);
              }
            } catch (permError) {
              console.error('❌ requestPermission でエラー:', permError);
              this.showError('権限リクエストでエラーが発生しました: ' + permError.message);
              
              // iOS設定案内を表示
              if (this.elements.iosSettingsHelp) {
                this.elements.iosSettingsHelp.style.display = 'block';
              }
            }
          } else {
            // iOS 13未満、またはAndroidなど
            console.log('権限リクエスト不要な環境です');
            
            // センサーのリスニングを開始
            await this.stepCounter.startSensorListening();
            
            this.showSuccess('✅ センサーが起動しました！歩いてみてください');
            this.elements.permissionButton.style.display = 'none';
            console.log('センサーの起動に成功しました');
          }
          
        } catch (error) {
          console.error('❌ センサーの起動に失敗:', error);
          console.error('Error stack:', error.stack);
          this.showError('センサーの起動に失敗: ' + error.message);
          
          // iOS設定案内を表示
          if (this.elements.iosSettingsHelp) {
            this.elements.iosSettingsHelp.style.display = 'block';
          }
          
          // 手動カウントボタンを強調表示
          if (this.elements.manualCountButton) {
            this.elements.manualCountButton.style.display = 'block';
            this.elements.manualCountButton.style.background = '#28a745';
            this.elements.manualCountButton.textContent = '👆 手動カウントを使う';
          }
        }
      });
    }

    // 歩数カウンターの変更を監視（リアルタイム更新）
    this.stepCounter.addObserver(() => {
      this.updateDisplay();
    });
  }

  /**
   * デバッグ情報を表示
   */
  showDebugInfo() {
    if (!this.elements.debugInfo) return;

    const updateDebugInfo = () => {
      const info = [];
      const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
      const hasRequestPermission = typeof DeviceMotionEvent !== 'undefined' && 
                                    typeof DeviceMotionEvent.requestPermission === 'function';
      
      // iOSバージョンを取得
      let iosVersion = 'N/A';
      if (isIOS) {
        const match = navigator.userAgent.match(/OS (\d+)_(\d+)/);
        if (match) {
          iosVersion = `${match[1]}.${match[2]}`;
        }
      }
      
      info.push(`ブラウザ: ${isIOS ? `iOS ${iosVersion}` : navigator.userAgent.includes('Android') ? 'Android' : 'その他'}`);
      info.push(`HTTPS: ${location.protocol === 'https:' ? '✅ はい' : '❌ いいえ'}`);
      info.push(`DeviceMotion: ${typeof DeviceMotionEvent !== 'undefined' ? '✅ 利用可能' : '❌ 利用不可'}`);
      info.push(`requestPermission: ${hasRequestPermission ? '必要（iOS 13+）' : '不要'}`);
      info.push(`権限状態: ${this.stepCounter.sensorAdapter.permissionGranted ? '✅ 許可済み' : '❌ 未許可'}`);
      info.push(`センサー起動: ${this.stepCounter.sensorAdapter.isListening ? '✅ はい' : '❌ いいえ'}`);
      info.push(`閾値: ${this.stepCounter.stepThreshold} m/s²`);
      info.push(`最小間隔: ${this.stepCounter.minStepInterval} ms`);
      info.push(`モーション検出: ${this.stepCounter.motionCount}回`);
      info.push(`最大加速度: ${this.stepCounter.maxMagnitude.toFixed(2)} m/s²`);
      
      this.elements.debugInfo.innerHTML = info.join('<br>');
      
      // センサー状態を更新
      if (this.elements.sensorStatus && this.elements.sensorStatusText) {
        if (this.stepCounter.motionCount > 0) {
          this.elements.sensorStatus.style.background = '#d4edda';
          this.elements.sensorStatus.style.color = '#155724';
          this.elements.sensorStatusText.textContent = `✅ センサー動作中 (${this.stepCounter.motionCount}回検出)`;
        } else if (this.stepCounter.sensorAdapter.isListening) {
          this.elements.sensorStatus.style.background = '#cce5ff';
          this.elements.sensorStatus.style.color = '#004085';
          this.elements.sensorStatusText.textContent = '⏳ センサー起動済み (歩いてみてください)';
        } else {
          this.elements.sensorStatus.style.background = '#fff3cd';
          this.elements.sensorStatus.style.color = '#856404';
          this.elements.sensorStatusText.textContent = '⚠️ センサー待機中 (ボタンをタップ)';
        }
      }
    };
    
    // 初回表示
    updateDebugInfo();
    
    // 定期的に更新
    setInterval(updateDebugInfo, 1000);
  }

  /**
   * 表示を更新
   * 
   * 要件:
   * - 1.2: 歩数が増加した場合、更新された歩数を即座に画面に表示する
   * - 5.1: 現在の歩数を大きく見やすいフォントで表示する
   * - 5.2: 次のリセット予定時刻を表示する
   * - 5.4: 画面が表示されている場合、歩数の更新をリアルタイムで反映する
   */
  updateDisplay() {
    // 歩数を表示（カンマ区切りで見やすく）
    const steps = this.stepCounter.getCurrentSteps();
    this.elements.stepDisplay.textContent = steps.toLocaleString('ja-JP');

    // 次のリセット時刻を表示
    const nextReset = this.resetTimer.getNextResetTime();
    const nextResetDate = new Date(nextReset);
    this.elements.nextResetDisplay.textContent = nextResetDate.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * リセット時刻の変更を処理
   * 
   * 要件:
   * - 4.2: ユーザーがリセット時刻を変更した場合、新しいリセット時刻を検証し、有効な時刻形式であることを確認する
   */
  handleResetTimeChange() {
    const newTime = this.elements.resetTimeInput.value;
    
    // 時刻形式の検証（HH:MM、00:00〜23:59）
    if (!/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(newTime)) {
      this.showError('有効な時刻形式（HH:MM）を入力してください');
      return;
    }

    // リセット時刻を更新
    const success = this.resetTimer.updateResetTime(newTime);
    
    if (success) {
      // 表示を更新
      this.updateDisplay();
      this.showSuccess('リセット時刻を更新しました');
    } else {
      this.showError('リセット時刻の更新に失敗しました');
    }
  }

  /**
   * エラーメッセージを表示
   * @param {string} message - 表示するエラーメッセージ
   * 
   * 要件: 4.2 - 無効な入力時のエラーメッセージ表示
   */
  showError(message) {
    this.elements.errorMessage.textContent = message;
    this.elements.errorMessage.className = 'message error';
    
    // 3秒後にメッセージを消す
    setTimeout(() => {
      this.elements.errorMessage.textContent = '';
      this.elements.errorMessage.className = 'message';
    }, 3000);
  }

  /**
   * 成功メッセージを表示
   * @param {string} message - 表示する成功メッセージ
   */
  showSuccess(message) {
    this.elements.errorMessage.textContent = message;
    this.elements.errorMessage.className = 'message success';
    
    // 3秒後にメッセージを消す
    setTimeout(() => {
      this.elements.errorMessage.textContent = '';
      this.elements.errorMessage.className = 'message';
    }, 3000);
  }
}

// エクスポート（Node.js環境用）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UIController;
}

// エクスポート（ブラウザ環境用）
if (typeof window !== 'undefined') {
  window.UIController = UIController;
}
