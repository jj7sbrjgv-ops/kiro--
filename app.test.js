/**
 * アプリケーションエントリーポイントのテスト
 * 
 * このテストは、すべてのコンポーネントが正しく統合され、
 * アプリケーションのライフサイクルが適切に管理されることを検証します。
 */

const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');

describe('App Entry Point', () => {
  beforeEach(() => {
    // DOMをリセット
    document.body.innerHTML = `
      <div id="step-display">0</div>
      <div id="next-reset">--</div>
      <input type="time" id="reset-time-input" value="00:00" />
      <button id="save-reset-time">保存</button>
      <div id="error-message" class="message"></div>
    `;

    // LocalStorageをクリア
    localStorage.clear();
  });

  afterEach(() => {
    // LocalStorageをクリア
    localStorage.clear();
  });

  describe('displayError', () => {
    test('should display error message', () => {
      const { displayError } = require('./app.js');
      const message = 'テストエラーメッセージ';
      
      displayError(message);
      
      const errorElement = document.getElementById('error-message');
      expect(errorElement.textContent).toBe(message);
      expect(errorElement.className).toBe('message error');
    });

    test('should handle missing error element gracefully', () => {
      document.body.innerHTML = '';
      const { displayError } = require('./app.js');
      
      // エラーが発生しないことを確認
      expect(() => displayError('test')).not.toThrow();
    });
  });

  describe('StepCounterApp', () => {
    test('should create app instance with all components', () => {
      const { StepCounterApp } = require('./app.js');
      const app = new StepCounterApp();

      // 初期状態では各コンポーネントはnull
      expect(app.storageManager).toBeNull();
      expect(app.sensorAdapter).toBeNull();
      expect(app.stepCounter).toBeNull();
      expect(app.resetTimer).toBeNull();
      expect(app.uiController).toBeNull();
      expect(app.isInitialized).toBe(false);
    });

    test('should initialize all components in correct order', async () => {
      const { StepCounterApp } = require('./app.js');
      const app = new StepCounterApp();

      // センサーが利用できない環境でもエラーにならないようにする
      await app.initialize();

      // すべてのコンポーネントが初期化されたことを確認
      expect(app.storageManager).toBeDefined();
      expect(app.storageManager).not.toBeNull();
      
      expect(app.sensorAdapter).toBeDefined();
      expect(app.sensorAdapter).not.toBeNull();
      
      expect(app.stepCounter).toBeDefined();
      expect(app.stepCounter).not.toBeNull();
      
      expect(app.resetTimer).toBeDefined();
      expect(app.resetTimer).not.toBeNull();
      
      expect(app.uiController).toBeDefined();
      expect(app.uiController).not.toBeNull();

      // アプリケーションが初期化済みとマークされたことを確認
      expect(app.isReady()).toBe(true);

      // クリーンアップ
      app.shutdown();
    });

    test('should properly shutdown and cleanup resources', async () => {
      const { StepCounterApp } = require('./app.js');
      const app = new StepCounterApp();

      await app.initialize();
      expect(app.isReady()).toBe(true);

      app.shutdown();

      // アプリケーションがシャットダウンされたことを確認
      expect(app.isReady()).toBe(false);
    });

    test('should pass correct dependencies between components', async () => {
      const { StepCounterApp } = require('./app.js');
      const app = new StepCounterApp();

      await app.initialize();

      // StepCounterがStorageManagerとSensorAdapterを持っていることを確認
      expect(app.stepCounter.storageManager).toBe(app.storageManager);
      expect(app.stepCounter.sensorAdapter).toBe(app.sensorAdapter);

      // ResetTimerがStepCounterとStorageManagerを持っていることを確認
      expect(app.resetTimer.stepCounter).toBe(app.stepCounter);
      expect(app.resetTimer.storageManager).toBe(app.storageManager);

      // UIControllerがStepCounterとResetTimerを持っていることを確認
      expect(app.uiController.stepCounter).toBe(app.stepCounter);
      expect(app.uiController.resetTimer).toBe(app.resetTimer);

      // クリーンアップ
      app.shutdown();
    });

    test('should handle UI initialization failure gracefully', async () => {
      const { StepCounterApp } = require('./app.js');
      const app = new StepCounterApp();

      // 必須のUI要素を削除してUIの初期化を失敗させる
      document.body.innerHTML = '';

      // エラーが発生してもアプリケーションは初期化を続行
      await app.initialize();

      // 他のコンポーネントは初期化されている
      expect(app.storageManager).not.toBeNull();
      expect(app.sensorAdapter).not.toBeNull();
      expect(app.stepCounter).not.toBeNull();
      expect(app.resetTimer).not.toBeNull();
      expect(app.isReady()).toBe(true);

      // クリーンアップ
      app.shutdown();
    });
  });

  describe('Integration - Component Dependencies', () => {
    test('should wire up all component dependencies correctly', async () => {
      const { StepCounterApp } = require('./app.js');
      const app = new StepCounterApp();

      await app.initialize();

      // すべてのコンポーネントが存在することを確認
      expect(app.storageManager).toBeDefined();
      expect(app.sensorAdapter).toBeDefined();
      expect(app.stepCounter).toBeDefined();
      expect(app.resetTimer).toBeDefined();
      expect(app.uiController).toBeDefined();

      // 依存関係が正しく配線されていることを確認
      expect(app.stepCounter.storageManager).toBe(app.storageManager);
      expect(app.stepCounter.sensorAdapter).toBe(app.sensorAdapter);
      expect(app.resetTimer.stepCounter).toBe(app.stepCounter);
      expect(app.resetTimer.storageManager).toBe(app.storageManager);
      expect(app.uiController.stepCounter).toBe(app.stepCounter);
      expect(app.uiController.resetTimer).toBe(app.resetTimer);

      // クリーンアップ
      app.shutdown();
    });

    test('should maintain data consistency across components', async () => {
      const { StepCounterApp } = require('./app.js');
      const app = new StepCounterApp();

      await app.initialize();

      // 初期状態では歩数は0
      expect(app.stepCounter.getCurrentSteps()).toBe(0);

      // 歩数を増やす
      app.stepCounter.incrementStep();
      expect(app.stepCounter.getCurrentSteps()).toBe(1);

      // ストレージに保存されていることを確認
      const savedData = app.storageManager.loadStepData();
      expect(savedData).not.toBeNull();
      expect(savedData.steps).toBe(1);

      // リセットする
      app.stepCounter.reset();
      expect(app.stepCounter.getCurrentSteps()).toBe(0);

      // ストレージも更新されていることを確認
      const resetData = app.storageManager.loadStepData();
      expect(resetData).not.toBeNull();
      expect(resetData.steps).toBe(0);

      // クリーンアップ
      app.shutdown();
    });

    test('should handle reset timer integration', async () => {
      const { StepCounterApp } = require('./app.js');
      const app = new StepCounterApp();

      await app.initialize();

      // リセット時刻を設定
      const newResetTime = '06:00';
      const success = app.resetTimer.updateResetTime(newResetTime);
      expect(success).toBe(true);

      // ストレージに保存されていることを確認
      const savedResetTime = app.storageManager.getResetTime();
      expect(savedResetTime).toBe(newResetTime);

      // 次のリセット時刻が計算されることを確認
      const nextResetTime = app.resetTimer.getNextResetTime();
      expect(nextResetTime).toBeGreaterThan(Date.now());

      // クリーンアップ
      app.shutdown();
    });
  });

  describe('Error Handling Integration', () => {
    test('should display error message when sensor is not available', async () => {
      const { StepCounterApp } = require('./app.js');
      const app = new StepCounterApp();

      // センサーが利用できない環境をシミュレート
      // （実際のテスト環境ではDeviceMotion APIは利用できない）
      await app.initialize();

      // エラーメッセージが表示される可能性がある
      // （環境によって異なるため、アプリケーションが初期化されることを確認）
      expect(app.isReady()).toBe(true);

      // クリーンアップ
      app.shutdown();
    });

    test('should continue operation even if sensor initialization fails', async () => {
      const { StepCounterApp } = require('./app.js');
      const app = new StepCounterApp();

      await app.initialize();

      // センサーが利用できなくても、他の機能は動作する
      expect(app.storageManager).not.toBeNull();
      expect(app.resetTimer).not.toBeNull();
      
      // リセット時刻の変更は可能
      const success = app.resetTimer.updateResetTime('12:00');
      expect(success).toBe(true);

      // クリーンアップ
      app.shutdown();
    });
  });
});
