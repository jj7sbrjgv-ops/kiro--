/**
 * SensorAdapter - デバイスの加速度センサーとの通信を担当するコンポーネント
 * 
 * 要件:
 * - 1.1: 加速度センサーのデータにアクセス
 * - 1.3: センサーへのアクセス権限を要求
 * - 1.4: センサーアクセス拒否時のエラーハンドリング
 * - 7.1: センサー利用不可時のエラーハンドリング
 * 
 * iOS 18.2対応版
 */
class SensorAdapter {
  constructor() {
    this.isListening = false;
    this.callback = null;
    this.boundHandleMotion = null;
    this.permissionGranted = false;
  }

  /**
   * センサーの利用可否を確認
   * @returns {boolean} センサーが利用可能な場合はtrue
   */
  isAvailable() {
    return typeof DeviceMotionEvent !== 'undefined' && 'DeviceMotionEvent' in window;
  }

  /**
   * 権限をリクエスト（iOS 13+で必要）
   * @returns {Promise<boolean>} 権限が付与された場合はtrue
   */
  async requestPermission() {
    // 既に権限が付与されている場合
    if (this.permissionGranted) {
      console.log('Permission already granted');
      return true;
    }

    // iOS 13+では明示的な権限リクエストが必要
    if (typeof DeviceMotionEvent !== 'undefined' && 
        typeof DeviceMotionEvent.requestPermission === 'function') {
      try {
        console.log('Requesting DeviceMotion permission (iOS 13+)...');
        const permission = await DeviceMotionEvent.requestPermission();
        console.log('Permission response:', permission);
        
        this.permissionGranted = (permission === 'granted');
        return this.permissionGranted;
      } catch (error) {
        console.error('Permission request failed:', error);
        return false;
      }
    }
    
    // 権限リクエストが不要な環境（Android、古いiOSなど）
    console.log('Permission request not required (non-iOS or old iOS)');
    this.permissionGranted = true;
    return true;
  }

  /**
   * センサーのリスニングを開始
   * @param {Function} callback - 加速度データを受け取るコールバック関数
   * @param {boolean} skipPermission - 権限リクエストをスキップ（既に取得済みの場合）
   * @throws {Error} センサーが利用できない場合、または権限が拒否された場合
   */
  async startListening(callback, skipPermission = false) {
    console.log('startListening called, isListening:', this.isListening, 'skipPermission:', skipPermission);
    
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

    // 権限をリクエスト（スキップしない場合のみ）
    if (!skipPermission && !this.permissionGranted) {
      const hasPermission = await this.requestPermission();
      console.log('Permission result:', hasPermission);
      
      if (!hasPermission) {
        console.error('DeviceMotion permission denied');
        throw new Error('DeviceMotion permission denied');
      }
    }

    this.callback = callback;
    this.isListening = true;

    // イベントリスナーをバインド（後で削除できるように）
    this.boundHandleMotion = this.handleMotion.bind(this);
    
    // iOS 18対応: passive: false を明示的に指定
    window.addEventListener('devicemotion', this.boundHandleMotion, { passive: false });
    console.log('✅ devicemotion event listener added with passive: false');
    console.log('📱 センサーアダプター状態:', {
      isListening: this.isListening,
      hasCallback: !!this.callback,
      permissionGranted: this.permissionGranted
    });
    
    // モーションイベントが実際に発火しているか確認
    let motionEventsReceived = 0;
    const testHandler = () => {
      motionEventsReceived++;
      if (motionEventsReceived === 1) {
        console.log('✅ 最初のモーションイベントを検出');
      }
    };
    window.addEventListener('devicemotion', testHandler, { passive: false });
    
    setTimeout(() => {
      window.removeEventListener('devicemotion', testHandler);
      if (motionEventsReceived === 0) {
        console.warn('⚠️ 2秒以内にモーションイベントが検出されません - センサーが外れている候補');
      } else {
        console.log(`✅ ${motionEventsReceived}件のモーションイベントを検出しました`);
      }
    }, 2000);
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
    console.log('Sensor listening stopped');
  }

  /**
   * モーションイベントを処理
   * @param {DeviceMotionEvent} event - デバイスモーションイベント
   */
  handleMotion(event) {
    if (!this.callback) {
      console.warn('handleMotion: No callback registered');
      return;
    }
    
    // iOS 18では accelerationIncludingGravity が null の場合がある
    // acceleration, rotationRate の順で試す
    let accelData = event.accelerationIncludingGravity;
    if (!accelData) {
      accelData = event.acceleration;
    }
    if (!accelData) {
      // それでもない場合は rotationRate を使用（最後の手段）
      accelData = event.rotationRate;
    }
    
    if (!accelData) {
      console.warn('handleMotion: No acceleration data in event');
      return;
    }

    // 加速度データを抽出（null/undefinedの場合は0を使用）
    const acceleration = {
      x: (accelData.x !== null && accelData.x !== undefined) ? accelData.x : 0,
      y: (accelData.y !== null && accelData.y !== undefined) ? accelData.y : 0,
      z: (accelData.z !== null && accelData.z !== undefined) ? accelData.z : 0
    };

    // 計算可能なデータのみを処理（厳密な0チェックは削除）
    if (typeof acceleration.x === 'number' && typeof acceleration.y === 'number' && typeof acceleration.z === 'number') {
      this.callback(acceleration);
    }
  }
}

// Node.js環境（テスト用）とブラウザ環境の両方に対応
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SensorAdapter;
}

// ブラウザ環境にクラスを公開
if (typeof window !== 'undefined') {
  window.SensorAdapter = SensorAdapter;
}
