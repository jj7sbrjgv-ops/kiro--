/**
 * ResetTimer - 24時間周期でのリセットを管理するコンポーネント
 * 
 * 要件:
 * - 3.1: 現在時刻がリセット時刻に到達した場合、歩数カウンターを0にリセットする
 * - 3.2: リセットが実行された場合、前日の歩数データを履歴として保存する
 * - 3.3: リセットが実行された場合、次のリセット時刻を24時間後に設定する
 * - 3.4: アプリが起動していない間にリセット時刻を過ぎた場合、次回起動時にリセットを実行する
 * - 4.4: リセット時刻が変更された場合、次のリセット予定時刻を再計算する
 */
class ResetTimer {
  /**
   * ResetTimerのコンストラクタ
   * @param {StepCounter} stepCounter - 歩数カウンターのインスタンス
   * @param {StorageManager} storageManager - ストレージマネージャーのインスタンス
   */
  constructor(stepCounter, storageManager) {
    this.stepCounter = stepCounter;
    this.storageManager = storageManager;
    this.timerId = null;
  }

  /**
   * タイマーを開始
   * 
   * 要件:
   * - 3.3: 次のリセット時刻を24時間後に設定する
   * - 3.4: アプリが起動していない間にリセット時刻を過ぎた場合、次回起動時にリセットを実行する
   */
  start() {
    const resetTime = this.storageManager.getResetTime();
    const nextReset = this.calculateNextResetTime(resetTime);
    const now = Date.now();
    
    // 既にリセット時刻を過ぎている場合は即座にリセット
    // これは、アプリが起動していない間にリセット時刻を過ぎた場合の処理
    const lastReset = this.calculateLastResetTime(resetTime);
    const savedData = this.storageManager.loadStepData();
    
    // 保存されたデータが最後のリセット時刻より前の場合、リセットが必要
    if (savedData && savedData.timestamp < lastReset) {
      this.executeReset();
    }
    
    // 次のリセットまでの時間を計算
    const timeUntilReset = nextReset - now;
    this.scheduleReset(timeUntilReset);
  }

  /**
   * リセットをスケジュール
   * @param {number} milliseconds - リセットまでの時間（ミリ秒）
   * 
   * 要件: 3.3 - 次のリセット時刻を24時間後に設定する
   */
  scheduleReset(milliseconds) {
    // 既存のタイマーをクリア
    if (this.timerId) {
      clearTimeout(this.timerId);
    }
    
    this.timerId = setTimeout(() => {
      this.executeReset();
      // 次の24時間後にリセットをスケジュール
      this.scheduleReset(24 * 60 * 60 * 1000);
    }, milliseconds);
  }

  /**
   * リセットを実行
   * 
   * 要件:
   * - 3.1: 現在時刻がリセット時刻に到達した場合、歩数カウンターを0にリセットする
   * - 3.2: リセットが実行された場合、前日の歩数データを履歴として保存する
   */
  executeReset() {
    // 現在の歩数を履歴として保存
    const currentSteps = this.stepCounter.getCurrentSteps();
    this.storageManager.saveHistory({
      steps: currentSteps,
      date: new Date().toISOString()
    });
    
    // 歩数をリセット
    this.stepCounter.reset();
  }

  /**
   * 次のリセット時刻を計算
   * @param {string} resetTime - リセット時刻（HH:MM形式）
   * @returns {number} 次のリセット時刻（Unix時間ミリ秒）
   * 
   * 要件: 3.3 - 次のリセット時刻を24時間後に設定する
   */
  calculateNextResetTime(resetTime) {
    const now = new Date();
    const [hours, minutes] = resetTime.split(':').map(Number);
    
    const nextReset = new Date();
    nextReset.setHours(hours, minutes, 0, 0);
    
    // 既に今日のリセット時刻を過ぎている場合は明日に設定
    if (nextReset <= now) {
      nextReset.setDate(nextReset.getDate() + 1);
    }
    
    return nextReset.getTime();
  }

  /**
   * 最後のリセット時刻を計算
   * @param {string} resetTime - リセット時刻（HH:MM形式）
   * @returns {number} 最後のリセット時刻（Unix時間ミリ秒）
   * 
   * 要件: 3.4 - アプリが起動していない間にリセット時刻を過ぎた場合の判定に使用
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
   * リセット時刻を更新
   * @param {string} newResetTime - 新しいリセット時刻（HH:MM形式）
   * 
   * 要件: 4.4 - リセット時刻が変更された場合、次のリセット予定時刻を再計算する
   */
  updateResetTime(newResetTime) {
    // リセット時刻を保存
    const success = this.storageManager.setResetTime(newResetTime);
    
    if (success) {
      // タイマーを再スケジュール
      this.start();
    }
    
    return success;
  }

  /**
   * タイマーを停止
   */
  stop() {
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  /**
   * 次のリセット時刻を取得（表示用）
   * @returns {number} 次のリセット時刻（Unix時間ミリ秒）
   */
  getNextResetTime() {
    const resetTime = this.storageManager.getResetTime();
    return this.calculateNextResetTime(resetTime);
  }
}

// エクスポート（Node.js環境用）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ResetTimer;
}

// エクスポート（ブラウザ環境用）
if (typeof window !== 'undefined') {
  window.ResetTimer = ResetTimer;
}
