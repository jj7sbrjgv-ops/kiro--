/**
 * SensorAdapter - デバイスの加速度センサーとの通信を担当するコンポーネント
 * 
 * 要件:
 * - 1.1: 加速度センサーのデータにアクセス
 * - 1.3: センサーへのアクセス権限を要求
 * - 1.4: センサーアクセス拒否時のエラーハンドリング
 * - 7.1: センサー利用不可時のエラーハンドリング
 */
class SensorAdapter {
  constructor() {
    this.isListening = false;
    this.callback = null;
    this.boundHandleMotion = null;
  }

  /**
   * センサーの利用可否を確認
   * @returns {boolean} センサーが利用可能な場合はtrue
   */
  isAvailable() {
    return 'DeviceMotionEvent' in window;
  }

  /**
   * 権限をリクエスト（iOS 13+で必要）
   * @returns {Promise<boolean>} 権限が付与された場合はtrue
   */
  async requestPermission() {
    // iOS 13+では明示的な権限リクエストが必要
    if (typeof DeviceMotionEvent !== 'undefined' && 
        typeof DeviceMotionEvent.requestPermission === 'function') {
      try {
        console.log('Requesting DeviceMotion permission...');
        const permission = await DeviceMotionEvent.requestPermission();
        console.log('Permission response:', permission);
        return permission === 'granted';
      } catch (error) {
        console.error('Permission request failed:', error);
        return false;
      }
    }
    // 権限リクエストが不要な環境（Android、古いiOSなど）
    console.log('Permission request not required');
    return true;
  }

  /**
   * センサーのリスニングを開始
   * @param {Function} callback - 加速度データを受け取るコールバック関数
   * @throws {Error} センサーが利用できない場合、または権限が拒否された場合
   */
  async startListening(callback) {
    console.log('startListening called, isListening:', this.isListening);
    
    if (this.isListening) {
      console.log('Already listening, skipping');
      return;
    }

    // センサーの利用可否を確認
    if (!this.isAvailable()) {
      console.error('DeviceMotion API is not available');
      throw new Error('DeviceMotion API is not available');
    }

    console.log('DeviceMotion API is available');

    // 権限をリクエスト
    const hasPermission = await this.requestPermission();
    console.log('Permission result:', hasPermission);
    
    if (!hasPermission) {
      console.error('DeviceMotion permission denied');
      throw new Error('DeviceMotion permission denied');
    }

    this.callback = callback;
    this.isListening = true;

    // イベントリスナーをバインド（後で削除できるように）
    this.boundHandleMotion = this.handleMotion.bind(this);
    window.addEventListener('devicemotion', this.boundHandleMotion);
    console.log('devicemotion event listener added');
  }

  /**
   * センサーのリスニングを停止
   */
  stopListening() {
    if (!this.isListening) {
      return;
    }

    if (this.boundHandleMotion) {
      window.removeEventListener('devicemotion', this.boundHandleMotion);
      this.boundHandleMotion = null;
    }
    
    this.isListening = false;
    this.callback = null;
  }

  /**
   * モーションイベントを処理
   * @param {DeviceMotionEvent} event - デバイスモーションイベント
   */
  handleMotion(event) {
    console.log('handleMotion called');
    
    if (!this.callback) {
      console.warn('No callback registered');
      return;
    }
    
    if (!event.accelerationIncludingGravity) {
      console.warn('No acceleration data in event');
      return;
    }

    // 加速度データを抽出（nullの場合は0を使用）
    const acceleration = {
      x: event.accelerationIncludingGravity.x || 0,
      y: event.accelerationIncludingGravity.y || 0,
      z: event.accelerationIncludingGravity.z || 0
    };

    console.log('Acceleration data:', acceleration);
    this.callback(acceleration);
  }
}

// Node.js環境（テスト用）とブラウザ環境の両方に対応
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SensorAdapter;
}
