/**
 * StepCounter ユニットテスト
 * 
 * テスト対象:
 * - アプリ起動時のデータ読み込み（要件 2.2）
 * - 古いデータでの初期化時のリセット（要件 3.4, 6.4）
 * - 加速度データの分析と歩数カウント（要件 1.1）
 * - オブザーバーパターンによるUI更新通知（要件 1.2）
 */

const StepCounter = require('./StepCounter');

describe('StepCounter', () => {
  let stepCounter;
  let mockStorageManager;
  let mockSensorAdapter;

  beforeEach(() => {
    // StorageManagerのモック
    mockStorageManager = {
      loadStepData: jest.fn(),
      saveStepData: jest.fn(),
      getResetTime: jest.fn(() => '00:00'),
      setResetTime: jest.fn(),
      saveHistory: jest.fn(),
      loadHistory: jest.fn(() => [])
    };

    // SensorAdapterのモック
    mockSensorAdapter = {
      isAvailable: jest.fn(() => true),
      requestPermission: jest.fn(async () => true),
      startListening: jest.fn(async (callback) => {
        mockSensorAdapter.callback = callback;
      }),
      stopListening: jest.fn(),
      callback: null
    };

    stepCounter = new StepCounter(mockStorageManager, mockSensorAdapter);
  });

  describe('初期化', () => {
    test('保存されたデータがない場合、0で初期化される', async () => {
      mockStorageManager.loadStepData.mockReturnValue(null);

      await stepCounter.initialize();

      expect(stepCounter.getCurrentSteps()).toBe(0);
      expect(mockStorageManager.saveStepData).toHaveBeenCalledWith({
        steps: 0,
        timestamp: expect.any(Number)
      });
    });

    test('現在の日次期間内のデータがある場合、歩数を復元する（要件 2.2）', async () => {
      const now = Date.now();
      mockStorageManager.loadStepData.mockReturnValue({
        steps: 1234,
        timestamp: now - 1000 // 1秒前
      });
      mockStorageManager.getResetTime.mockReturnValue('00:00');

      await stepCounter.initialize();

      expect(stepCounter.getCurrentSteps()).toBe(1234);
    });

    test('古いデータ（前の日次期間）がある場合、0で初期化される（要件 3.4, 6.4）', async () => {
      // 昨日のタイムスタンプ（25時間前）
      const yesterday = Date.now() - (25 * 60 * 60 * 1000);
      mockStorageManager.loadStepData.mockReturnValue({
        steps: 5678,
        timestamp: yesterday
      });
      mockStorageManager.getResetTime.mockReturnValue('00:00');

      await stepCounter.initialize();

      expect(stepCounter.getCurrentSteps()).toBe(0);
      expect(mockStorageManager.saveStepData).toHaveBeenCalledWith({
        steps: 0,
        timestamp: expect.any(Number)
      });
    });

    test('センサーのリスニングを開始する', async () => {
      mockStorageManager.loadStepData.mockReturnValue(null);

      await stepCounter.initialize();

      expect(mockSensorAdapter.startListening).toHaveBeenCalled();
    });

    test('センサーが利用できない場合、エラーをスローする（要件 1.4, 7.1）', async () => {
      mockStorageManager.loadStepData.mockReturnValue(null);
      mockSensorAdapter.startListening.mockRejectedValue(
        new Error('DeviceMotion API is not available')
      );

      await expect(stepCounter.initialize()).rejects.toThrow(
        'DeviceMotion API is not available'
      );
    });
  });

  describe('歩数カウント', () => {
    beforeEach(async () => {
      mockStorageManager.loadStepData.mockReturnValue(null);
      await stepCounter.initialize();
    });

    test('閾値を超える加速度で歩数がカウントされる（要件 1.1）', () => {
      const initialSteps = stepCounter.getCurrentSteps();

      // 閾値（1.2）を超える加速度
      stepCounter.onMotionDetected({ x: 1.0, y: 1.0, z: 0.5 });

      expect(stepCounter.getCurrentSteps()).toBe(initialSteps + 1);
    });

    test('閾値以下の加速度では歩数がカウントされない（要件 1.1）', () => {
      const initialSteps = stepCounter.getCurrentSteps();

      // 閾値（1.2）以下の加速度
      stepCounter.onMotionDetected({ x: 0.1, y: 0.1, z: 0.1 });

      expect(stepCounter.getCurrentSteps()).toBe(initialSteps);
    });

    test('最小歩数間隔内の連続した動きは1歩としてカウントされる', () => {
      const initialSteps = stepCounter.getCurrentSteps();

      // 1回目の歩数
      stepCounter.onMotionDetected({ x: 1.0, y: 1.0, z: 0.5 });
      expect(stepCounter.getCurrentSteps()).toBe(initialSteps + 1);

      // 最小間隔（300ms）内の2回目の動き - カウントされない
      stepCounter.onMotionDetected({ x: 1.0, y: 1.0, z: 0.5 });
      expect(stepCounter.getCurrentSteps()).toBe(initialSteps + 1);
    });

    test('歩数が増加したときにストレージに保存される（要件 2.1）', () => {
      mockStorageManager.saveStepData.mockClear();

      stepCounter.onMotionDetected({ x: 1.0, y: 1.0, z: 0.5 });

      expect(mockStorageManager.saveStepData).toHaveBeenCalledWith({
        steps: 1,
        timestamp: expect.any(Number)
      });
    });
  });

  describe('リセット機能', () => {
    beforeEach(async () => {
      mockStorageManager.loadStepData.mockReturnValue({
        steps: 100,
        timestamp: Date.now()
      });
      await stepCounter.initialize();
    });

    test('リセットすると歩数が0になる（要件 3.1）', () => {
      expect(stepCounter.getCurrentSteps()).toBe(100);

      stepCounter.reset();

      expect(stepCounter.getCurrentSteps()).toBe(0);
    });

    test('リセット後にストレージに保存される', () => {
      mockStorageManager.saveStepData.mockClear();

      stepCounter.reset();

      expect(mockStorageManager.saveStepData).toHaveBeenCalledWith({
        steps: 0,
        timestamp: expect.any(Number)
      });
    });
  });

  describe('オブザーバーパターン', () => {
    beforeEach(async () => {
      mockStorageManager.loadStepData.mockReturnValue(null);
      await stepCounter.initialize();
    });

    test('オブザーバーを追加できる', () => {
      const observer = jest.fn();
      stepCounter.addObserver(observer);

      stepCounter.incrementStep();

      expect(observer).toHaveBeenCalledWith(1);
    });

    test('複数のオブザーバーに通知される（要件 1.2）', () => {
      const observer1 = jest.fn();
      const observer2 = jest.fn();
      stepCounter.addObserver(observer1);
      stepCounter.addObserver(observer2);

      stepCounter.incrementStep();

      expect(observer1).toHaveBeenCalledWith(1);
      expect(observer2).toHaveBeenCalledWith(1);
    });

    test('オブザーバーを削除できる', () => {
      const observer = jest.fn();
      stepCounter.addObserver(observer);
      stepCounter.removeObserver(observer);

      stepCounter.incrementStep();

      expect(observer).not.toHaveBeenCalled();
    });

    test('リセット時にオブザーバーに通知される', () => {
      const observer = jest.fn();
      stepCounter.addObserver(observer);
      observer.mockClear();

      stepCounter.reset();

      expect(observer).toHaveBeenCalledWith(0);
    });

    test('オブザーバーでエラーが発生しても他のオブザーバーに通知される', () => {
      const errorObserver = jest.fn(() => {
        throw new Error('Observer error');
      });
      const normalObserver = jest.fn();
      
      stepCounter.addObserver(errorObserver);
      stepCounter.addObserver(normalObserver);

      // エラーが発生してもクラッシュしない
      expect(() => stepCounter.incrementStep()).not.toThrow();
      
      // 正常なオブザーバーは呼び出される
      expect(normalObserver).toHaveBeenCalledWith(1);
    });
  });

  describe('歩数の非負性（要件 6.1）', () => {
    test('getCurrentSteps()は常に0以上の値を返す', async () => {
      mockStorageManager.loadStepData.mockReturnValue(null);
      await stepCounter.initialize();

      // 初期状態
      expect(stepCounter.getCurrentSteps()).toBeGreaterThanOrEqual(0);

      // 歩数を増やした後
      stepCounter.incrementStep();
      expect(stepCounter.getCurrentSteps()).toBeGreaterThanOrEqual(0);

      // リセット後
      stepCounter.reset();
      expect(stepCounter.getCurrentSteps()).toBeGreaterThanOrEqual(0);
    });

    test('内部状態が負の値になっても、getCurrentSteps()は0を返す', async () => {
      mockStorageManager.loadStepData.mockReturnValue(null);
      await stepCounter.initialize();

      // 内部状態を強制的に負の値にする（通常は起こらないが、防御的プログラミング）
      stepCounter.currentSteps = -10;

      expect(stepCounter.getCurrentSteps()).toBe(0);
    });
  });

  describe('日次期間の判定（要件 6.3）', () => {
    test('現在の日次期間内のタイムスタンプはtrueを返す', () => {
      mockStorageManager.getResetTime.mockReturnValue('00:00');
      
      // 1時間前のタイムスタンプ
      const recentTimestamp = Date.now() - (60 * 60 * 1000);
      
      expect(stepCounter.isCurrentPeriod(recentTimestamp)).toBe(true);
    });

    test('前の日次期間のタイムスタンプはfalseを返す', () => {
      mockStorageManager.getResetTime.mockReturnValue('00:00');
      
      // 25時間前のタイムスタンプ（前日）
      const oldTimestamp = Date.now() - (25 * 60 * 60 * 1000);
      
      expect(stepCounter.isCurrentPeriod(oldTimestamp)).toBe(false);
    });

    test('カスタムリセット時刻での日次期間判定', () => {
      // リセット時刻を6:00に設定
      mockStorageManager.getResetTime.mockReturnValue('06:00');
      
      const now = new Date();
      const currentHour = now.getHours();
      
      // 現在時刻が6:00以降の場合、今日の6:00以降のタイムスタンプはtrue
      // 現在時刻が6:00未満の場合、昨日の6:00以降のタイムスタンプはtrue
      const testTime = new Date();
      if (currentHour >= 6) {
        testTime.setHours(7, 0, 0, 0); // 今日の7:00
      } else {
        testTime.setDate(testTime.getDate() - 1);
        testTime.setHours(7, 0, 0, 0); // 昨日の7:00
      }
      
      expect(stepCounter.isCurrentPeriod(testTime.getTime())).toBe(true);
    });
  });

  describe('センサーの停止', () => {
    test('stopListening()でセンサーのリスニングを停止できる', async () => {
      mockStorageManager.loadStepData.mockReturnValue(null);
      await stepCounter.initialize();

      stepCounter.stopListening();

      expect(mockSensorAdapter.stopListening).toHaveBeenCalled();
    });
  });
});
