/**
 * StepCounter - 歩数の計測とカウント管理を担当するコアコンポーネント
 * 
 * 要件:
 * - 1.1: 加速度センサーが動きを検出した場合、その動きを分析して歩数としてカウントする
 * - 1.2: 歩数が増加した場合、更新された歩数を即座に画面に表示する
 * - 2.1: 歩数が更新された場合、ローカルストレージに即座に保存する
 * - 3.1: リセット時刻に到達した場合、歩数カウンターを0にリセットする
 * - 6.1: 歩数が負の値にならないことを保証する
 */
class StepCounter {
  /**
   * StepCounterのコンストラクタ
   * @param {StorageManager} storageManager - ストレージマネージャーのインスタンス
   * @param {SensorAdapter} sensorAdapter - センサーアダプターのインスタンス
   */
  constructor(storageManager, sensorAdapter) {
    this.currentSteps = 0;
    this.storageManager = storageManager;
    this.sensorAdapter = sensorAdapter;
    this.lastAcceleration = null;
    this.stepThreshold = 0.5; // 歩数として認識する加速度の閾値（m/s²）- より敏感に
    this.observers = []; // オブザーバーパターン用のリスナー配列
    this.lastStepTime = 0; // 最後に歩数をカウントした時刻
    this.minStepInterval = 200; // 最小歩数間隔（ミリ秒）- より短く
    this.motionCount = 0; // デバッグ用：モーションイベントのカウント
    this.maxMagnitude = 0; // デバッグ用：最大加速度の記録
  }

  /**
   * 初期化：保存されたデータを読み込む
   * @returns {Promise<void>}
   * 
   * 要件: 2.2 - アプリ起動時のデータ読み込み
   * 注意: センサーの起動は別途行う必要があります（iOS対応のため）
   */
  async initialize() {
    const savedData = this.storageManager.loadStepData();
    
    if (savedData && this.isCurrentPeriod(savedData.timestamp)) {
      // 現在の日次期間内のデータの場合、歩数を復元
      this.currentSteps = savedData.steps;
    } else {
      // 古いデータまたはデータがない場合、0で初期化
      this.currentSteps = 0;
      // 初期状態を保存
      this.storageManager.saveStepData({
        steps: 0,
        timestamp: Date.now()
      });
    }
    
    console.log('StepCounter initialized with', this.currentSteps, 'steps');
  }

  /**
   * センサーのリスニングを開始
   * @returns {Promise<void>}
   */
  async startSensorListening() {
    try {
      await this.sensorAdapter.startListening(this.onMotionDetected.bind(this));
      console.log('Sensor listening started successfully');
    } catch (error) {
      console.error('Failed to start sensor listening:', error);
      throw error;
    }
  }

  /**
   * 動きを検出したときの処理
   * @param {Object} acceleration - 加速度データ
   * @param {number} acceleration.x - X軸の加速度（m/s²）
   * @param {number} acceleration.y - Y軸の加速度（m/s²）
   * @param {number} acceleration.z - Z軸の加速度（m/s²）
   * 
   * 要件: 1.1 - 動きを分析して歩数としてカウント
   */
  onMotionDetected(acceleration) {
    this.motionCount++; // デバッグ用
    
    // 加速度の大きさを計算
    const magnitude = Math.sqrt(
      acceleration.x ** 2 + 
      acceleration.y ** 2 + 
      acceleration.z ** 2
    );
    
    // デバッグ情報を通知（より詳細に）
    this.notifyMotionDetected(acceleration, magnitude);
    
    if (this.isStep(acceleration)) {
      this.incrementStep();
    }
  }

  /**
   * 歩数として認識するかの判定
   * @param {Object} acceleration - 加速度データ
   * @param {number} acceleration.x - X軸の加速度（m/s²）
   * @param {number} acceleration.y - Y軸の加速度（m/s²）
   * @param {number} acceleration.z - Z軸の加速度（m/s²）
   * @returns {boolean} 歩数として認識する場合はtrue
   * 
   * 要件: 1.1 - 加速度センサーのデータを分析
   */
  isStep(acceleration) {
    // 加速度の大きさを計算（ベクトルの長さ）
    const magnitude = Math.sqrt(
      acceleration.x ** 2 + 
      acceleration.y ** 2 + 
      acceleration.z ** 2
    );
    
    // 最小歩数間隔のチェック（誤検知を防ぐ）
    const now = Date.now();
    const timeSinceLastStep = now - this.lastStepTime;
    
    // 閾値を超えており、かつ最小間隔が経過している場合のみ歩数として認識
    const isStepDetected = magnitude > this.stepThreshold && timeSinceLastStep >= this.minStepInterval;
    
    if (isStepDetected) {
      this.lastStepTime = now;
      console.log(`✅ 歩数検出! magnitude=${magnitude.toFixed(2)} > threshold=${this.stepThreshold}`);
      return true;
    }
    
    return false;
  }

  /**
   * 歩数を増やす
   * 
   * 要件:
   * - 1.2: 歩数が増加した場合、更新された歩数を即座に画面に表示する
   * - 2.1: 歩数が更新された場合、ローカルストレージに即座に保存する
   * - 6.1: 歩数が負の値にならないことを保証する
   */
  incrementStep() {
    this.currentSteps++;
    
    // ローカルストレージに即座に保存
    this.storageManager.saveStepData({
      steps: this.currentSteps,
      timestamp: Date.now()
    });
    
    // オブザーバーに通知（UI更新）
    this.notifyObservers();
  }

  /**
   * 歩数をリセット
   * 
   * 要件:
   * - 3.1: リセット時刻に到達した場合、歩数カウンターを0にリセットする
   * - 6.1: 歩数が負の値にならないことを保証する
   */
  reset() {
    this.currentSteps = 0;
    
    // ローカルストレージに保存
    this.storageManager.saveStepData({
      steps: 0,
      timestamp: Date.now()
    });
    
    // オブザーバーに通知（UI更新）
    this.notifyObservers();
  }

  /**
   * 現在の歩数を取得
   * @returns {number} 現在の歩数（0以上の整数）
   * 
   * 要件: 6.1 - 歩数が負の値にならないことを保証
   */
  getCurrentSteps() {
    // 歩数が負の値にならないことを保証
    return Math.max(0, this.currentSteps);
  }

  /**
   * 現在の日次期間内かを確認
   * @param {number} timestamp - 確認するタイムスタンプ（Unix時間ミリ秒）
   * @returns {boolean} 現在の日次期間内の場合はtrue
   * 
   * 要件: 6.3 - タイムスタンプを検証し、データの新鮮性を確認
   */
  isCurrentPeriod(timestamp) {
    const resetTime = this.storageManager.getResetTime();
    const lastReset = this.calculateLastResetTime(resetTime);
    return timestamp >= lastReset;
  }

  /**
   * 最後のリセット時刻を計算
   * @param {string} resetTime - リセット時刻（HH:MM形式）
   * @returns {number} 最後のリセット時刻（Unix時間ミリ秒）
   */
  calculateLastResetTime(resetTime) {
    const now = new Date();
    const [hours, minutes] = resetTime.split(':').map(Number);
    
    const lastReset = new Date();
    lastReset.setHours(hours, minutes, 0, 0);
    
    // 今日のリセット時刻がまだ来ていない場合は、昨日のリセット時刻を返す
    if (lastReset > now) {
      lastReset.setDate(lastReset.getDate() - 1);
    }
    
    return lastReset.getTime();
  }

  /**
   * オブザーバーを追加（UI更新用）
   * @param {Function} observer - 歩数が更新されたときに呼び出されるコールバック関数
   * 
   * 要件: 1.2 - 更新された歩数を即座に画面に表示する
   */
  addObserver(observer) {
    if (typeof observer === 'function') {
      this.observers.push(observer);
    }
  }

  /**
   * オブザーバーを削除
   * @param {Function} observer - 削除するオブザーバー
   */
  removeObserver(observer) {
    const index = this.observers.indexOf(observer);
    if (index > -1) {
      this.observers.splice(index, 1);
    }
  }

  /**
   * すべてのオブザーバーに通知
   * 
   * 要件: 1.2 - 更新された歩数を即座に画面に表示する
   */
  notifyObservers() {
    for (const observer of this.observers) {
      try {
        observer(this.currentSteps);
      } catch (error) {
        console.error('Error notifying observer:', error);
      }
    }
  }

  /**
   * モーション検出を通知（デバッグ用）
   */
  notifyMotionDetected(acceleration, magnitude) {
    // デバッグ情報をコンソールに出力
    if (this.motionCount % 20 === 0) { // 20回に1回だけ出力
      console.log(`📱 Motion #${this.motionCount}: x=${acceleration.x.toFixed(2)}, y=${acceleration.y.toFixed(2)}, z=${acceleration.z.toFixed(2)}, magnitude=${magnitude.toFixed(2)}, threshold=${this.stepThreshold}`);
    }
    
    // 最大値を記録（デバッグ用）
    if (!this.maxMagnitude || magnitude > this.maxMagnitude) {
      this.maxMagnitude = magnitude;
      console.log(`📱 新しい最大値: ${magnitude.toFixed(2)} m/s²`);
    }
  }

  /**
   * センサーのリスニングを停止
   */
  stopListening() {
    this.sensorAdapter.stopListening();
  }
}

// エクスポート（Node.js環境用）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StepCounter;
}

// エクスポート（ブラウザ環境用）
if (typeof window !== 'undefined') {
  window.StepCounter = StepCounter;
}
