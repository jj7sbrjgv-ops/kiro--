/**
 * ResetTimer - ユニットテスト
 * 
 * このファイルは、ResetTimerクラスの基本的な機能をテストします。
 */

const ResetTimer = require('./ResetTimer');
const StepCounter = require('./StepCounter');
const StorageManager = require('./StorageManager');

describe('ResetTimer', () => {
  let resetTimer;
  let mockStepCounter;
  let mockStorageManager;

  beforeEach(() => {
    // モックのセットアップ
    jest.useFakeTimers();
    // モックの初期化
    mockStepCounter = {
      getCurrentSteps: jest.fn(),
      reset: jest.fn()
    };

    mockStorageManager = {
      getResetTime: jest.fn(),
      setResetTime: jest.fn(),
      saveHistory: jest.fn(),
      loadStepData: jest.fn()
    };

    // デフォルトのモック動作
    mockStorageManager.getResetTime.mockReturnValue('00:00');
    mockStorageManager.setResetTime.mockReturnValue(true);
    mockStorageManager.saveHistory.mockReturnValue(true);
    mockStorageManager.loadStepData.mockReturnValue(null);
    mockStepCounter.getCurrentSteps.mockReturnValue(0);

    resetTimer = new ResetTimer(mockStepCounter, mockStorageManager);
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  describe('constructor', () => {
    test('should initialize with stepCounter and storageManager', () => {
      expect(resetTimer.stepCounter).toBe(mockStepCounter);
      expect(resetTimer.storageManager).toBe(mockStorageManager);
      expect(resetTimer.timerId).toBeNull();
    });
  });

  describe('calculateNextResetTime', () => {
    test('should calculate next reset time for future time today', () => {
      // 現在時刻を2024-01-01 10:00:00に設定
      const now = new Date('2024-01-01T10:00:00');
      jest.setSystemTime(now);

      // リセット時刻を15:00に設定
      const nextReset = resetTimer.calculateNextResetTime('15:00');
      const expected = new Date('2024-01-01T15:00:00').getTime();

      expect(nextReset).toBe(expected);
    });

    test('should calculate next reset time for tomorrow if time has passed', () => {
      // 現在時刻を2024-01-01 16:00:00に設定
      const now = new Date('2024-01-01T16:00:00');
      jest.setSystemTime(now);

      // リセット時刻を15:00に設定（既に過ぎている）
      const nextReset = resetTimer.calculateNextResetTime('15:00');
      const expected = new Date('2024-01-02T15:00:00').getTime();

      expect(nextReset).toBe(expected);
    });

    test('should calculate next reset time for midnight', () => {
      // 現在時刻を2024-01-01 23:00:00に設定
      const now = new Date('2024-01-01T23:00:00');
      jest.setSystemTime(now);

      // リセット時刻を00:00に設定
      const nextReset = resetTimer.calculateNextResetTime('00:00');
      const expected = new Date('2024-01-02T00:00:00').getTime();

      expect(nextReset).toBe(expected);
    });
  });

  describe('calculateLastResetTime', () => {
    test('should calculate last reset time for today if time has passed', () => {
      // 現在時刻を2024-01-01 16:00:00に設定
      const now = new Date('2024-01-01T16:00:00');
      jest.setSystemTime(now);

      // リセット時刻を15:00に設定（既に過ぎている）
      const lastReset = resetTimer.calculateLastResetTime('15:00');
      const expected = new Date('2024-01-01T15:00:00').getTime();

      expect(lastReset).toBe(expected);
    });

    test('should calculate last reset time for yesterday if time has not passed', () => {
      // 現在時刻を2024-01-01 10:00:00に設定
      const now = new Date('2024-01-01T10:00:00');
      jest.setSystemTime(now);

      // リセット時刻を15:00に設定（まだ来ていない）
      const lastReset = resetTimer.calculateLastResetTime('15:00');
      const expected = new Date('2023-12-31T15:00:00').getTime();

      expect(lastReset).toBe(expected);
    });
  });

  describe('executeReset', () => {
    test('should save current steps to history and reset counter', () => {
      // 現在の歩数を1000に設定
      mockStepCounter.getCurrentSteps.mockReturnValue(1000);

      // リセットを実行
      resetTimer.executeReset();

      // 履歴が保存されたことを確認
      expect(mockStorageManager.saveHistory).toHaveBeenCalledWith({
        steps: 1000,
        date: expect.any(String)
      });

      // 歩数がリセットされたことを確認
      expect(mockStepCounter.reset).toHaveBeenCalled();
    });

    test('should save history with ISO date format', () => {
      mockStepCounter.getCurrentSteps.mockReturnValue(500);

      resetTimer.executeReset();

      const call = mockStorageManager.saveHistory.mock.calls[0][0];
      expect(call.date).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    test('should handle zero steps', () => {
      mockStepCounter.getCurrentSteps.mockReturnValue(0);

      resetTimer.executeReset();

      expect(mockStorageManager.saveHistory).toHaveBeenCalledWith({
        steps: 0,
        date: expect.any(String)
      });
      expect(mockStepCounter.reset).toHaveBeenCalled();
    });
  });

  describe('scheduleReset', () => {
    test('should schedule reset after specified milliseconds', () => {
      const milliseconds = 1000;
      resetTimer.scheduleReset(milliseconds);

      expect(resetTimer.timerId).not.toBeNull();
    });

    test('should clear existing timer before scheduling new one', () => {
      // 最初のタイマーをスケジュール
      resetTimer.scheduleReset(1000);
      const firstTimerId = resetTimer.timerId;

      // 2番目のタイマーをスケジュール
      resetTimer.scheduleReset(2000);

      // 新しいタイマーIDが設定されたことを確認
      expect(resetTimer.timerId).not.toBeNull();
      expect(resetTimer.timerId).not.toBe(firstTimerId);
    });

    test('should execute reset when timer fires', () => {
      mockStepCounter.getCurrentSteps.mockReturnValue(100);

      resetTimer.scheduleReset(1000);

      // タイマーを進める
      jest.advanceTimersByTime(1000);

      // リセットが実行されたことを確認
      expect(mockStorageManager.saveHistory).toHaveBeenCalled();
      expect(mockStepCounter.reset).toHaveBeenCalled();
    });

    test('should reschedule for 24 hours after reset executes', () => {
      resetTimer.scheduleReset(1000);

      // 最初のタイマーを進める
      jest.advanceTimersByTime(1000);

      // タイマーが再設定されたことを確認
      expect(resetTimer.timerId).not.toBeNull();
    });
  });

  describe('start', () => {
    test('should schedule reset for future time', () => {
      // 現在時刻を2024-01-01 10:00:00に設定
      const now = new Date('2024-01-01T10:00:00');
      jest.setSystemTime(now);

      mockStorageManager.getResetTime.mockReturnValue('15:00');
      mockStorageManager.loadStepData.mockReturnValue({
        steps: 100,
        timestamp: now.getTime()
      });

      resetTimer.start();

      // タイマーが設定されたことを確認
      expect(resetTimer.timerId).not.toBeNull();
    });

    test('should execute reset immediately if data is older than last reset time', () => {
      // 現在時刻を2024-01-01 16:00:00に設定
      const now = new Date('2024-01-01T16:00:00');
      jest.setSystemTime(now);

      mockStorageManager.getResetTime.mockReturnValue('15:00');
      
      // 昨日のデータ（リセット時刻より前）
      mockStorageManager.loadStepData.mockReturnValue({
        steps: 1000,
        timestamp: new Date('2024-01-01T10:00:00').getTime()
      });

      mockStepCounter.getCurrentSteps.mockReturnValue(1000);

      resetTimer.start();

      // リセットが即座に実行されたことを確認
      expect(mockStorageManager.saveHistory).toHaveBeenCalled();
      expect(mockStepCounter.reset).toHaveBeenCalled();
    });

    test('should not execute reset if data is newer than last reset time', () => {
      // 現在時刻を2024-01-01 16:00:00に設定
      const now = new Date('2024-01-01T16:00:00');
      jest.setSystemTime(now);

      mockStorageManager.getResetTime.mockReturnValue('15:00');
      
      // 今日のリセット後のデータ
      mockStorageManager.loadStepData.mockReturnValue({
        steps: 100,
        timestamp: new Date('2024-01-01T15:30:00').getTime()
      });

      resetTimer.start();

      // リセットが実行されていないことを確認
      expect(mockStorageManager.saveHistory).not.toHaveBeenCalled();
      expect(mockStepCounter.reset).not.toHaveBeenCalled();
    });
  });

  describe('updateResetTime', () => {
    test('should update reset time and reschedule timer', () => {
      const newResetTime = '06:00';
      mockStorageManager.setResetTime.mockReturnValue(true);

      const result = resetTimer.updateResetTime(newResetTime);

      expect(result).toBe(true);
      expect(mockStorageManager.setResetTime).toHaveBeenCalledWith(newResetTime);
      
      // タイマーが再スケジュールされたことを確認
      expect(resetTimer.timerId).not.toBeNull();
    });

    test('should return false if storage update fails', () => {
      mockStorageManager.setResetTime.mockReturnValue(false);

      const result = resetTimer.updateResetTime('06:00');

      expect(result).toBe(false);
    });
  });

  describe('stop', () => {
    test('should clear timer', () => {
      resetTimer.scheduleReset(1000);
      expect(resetTimer.timerId).not.toBeNull();

      resetTimer.stop();

      expect(resetTimer.timerId).toBeNull();
    });

    test('should do nothing if no timer is running', () => {
      expect(resetTimer.timerId).toBeNull();
      
      resetTimer.stop();

      expect(resetTimer.timerId).toBeNull();
    });
  });

  describe('getNextResetTime', () => {
    test('should return next reset time', () => {
      // 現在時刻を2024-01-01 10:00:00に設定
      const now = new Date('2024-01-01T10:00:00');
      jest.setSystemTime(now);

      mockStorageManager.getResetTime.mockReturnValue('15:00');

      const nextReset = resetTimer.getNextResetTime();
      const expected = new Date('2024-01-01T15:00:00').getTime();

      expect(nextReset).toBe(expected);
    });
  });
});
