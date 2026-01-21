/**
 * StepCounter プロパティベーステスト
 * 
 * Feature: step-counter-app
 * 
 * テスト対象のプロパティ:
 * - プロパティ1: 加速度閾値による歩数カウント（要件 1.1）
 * - プロパティ5: リセットによる歩数の初期化（要件 3.1）
 * - プロパティ10: 歩数の非負性（要件 6.1）
 * - プロパティ11: タイムスタンプの検証（要件 6.3）
 */

const fc = require('fast-check');
const StepCounter = require('./StepCounter');

describe('StepCounter - Property-Based Tests', () => {
  let mockStorageManager;
  let mockSensorAdapter;

  beforeEach(() => {
    // StorageManagerのモック
    mockStorageManager = {
      loadStepData: jest.fn(() => null),
      saveStepData: jest.fn(() => true),
      getResetTime: jest.fn(() => '00:00'),
      setResetTime: jest.fn(() => true),
      saveHistory: jest.fn(() => true),
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
  });

  /**
   * Feature: step-counter-app, Property 1: 加速度閾値による歩数カウント
   * 
   * 任意の加速度データに対して、その大きさが閾値を超える場合にのみ歩数がカウントされるべきである
   * 
   * **Validates: Requirements 1.1**
   */
  describe('Property 1: 加速度閾値による歩数カウント', () => {
    test('任意の加速度データに対して、大きさが閾値を超える場合にのみ歩数がカウントされる', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 加速度データのジェネレーター（-20 ~ 20 m/s²の範囲）
          fc.record({
            x: fc.float({ min: -20, max: 20, noNaN: true }),
            y: fc.float({ min: -20, max: 20, noNaN: true }),
            z: fc.float({ min: -20, max: 20, noNaN: true })
          }),
          async (acceleration) => {
            // 新しいStepCounterインスタンスを作成
            const stepCounter = new StepCounter(mockStorageManager, mockSensorAdapter);
            await stepCounter.initialize();

            const initialSteps = stepCounter.getCurrentSteps();

            // 加速度の大きさを計算
            const magnitude = Math.sqrt(
              acceleration.x ** 2 + 
              acceleration.y ** 2 + 
              acceleration.z ** 2
            );

            // 最小歩数間隔をリセット（テストのため）
            stepCounter.lastStepTime = 0;

            // 加速度データを処理
            stepCounter.onMotionDetected(acceleration);

            const finalSteps = stepCounter.getCurrentSteps();
            const threshold = stepCounter.stepThreshold;

            // プロパティ: 大きさが閾値を超える場合にのみ歩数が増加する
            if (magnitude > threshold) {
              expect(finalSteps).toBe(initialSteps + 1);
            } else {
              expect(finalSteps).toBe(initialSteps);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('閾値を超える加速度でも最小間隔内では1歩のみカウントされる', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 閾値を超える加速度データのペア
          fc.tuple(
            fc.record({
              x: fc.float({ min: 1.0, max: 10, noNaN: true }),
              y: fc.float({ min: 1.0, max: 10, noNaN: true }),
              z: fc.float({ min: 0, max: 5, noNaN: true })
            }),
            fc.record({
              x: fc.float({ min: 1.0, max: 10, noNaN: true }),
              y: fc.float({ min: 1.0, max: 10, noNaN: true }),
              z: fc.float({ min: 0, max: 5, noNaN: true })
            })
          ),
          async ([accel1, accel2]) => {
            const stepCounter = new StepCounter(mockStorageManager, mockSensorAdapter);
            await stepCounter.initialize();

            const initialSteps = stepCounter.getCurrentSteps();

            // 1回目の加速度データ
            stepCounter.onMotionDetected(accel1);
            const stepsAfterFirst = stepCounter.getCurrentSteps();

            // 最小間隔内に2回目の加速度データ（間隔をリセットしない）
            stepCounter.onMotionDetected(accel2);
            const stepsAfterSecond = stepCounter.getCurrentSteps();

            // プロパティ: 1回目で歩数が増加し、2回目では増加しない
            expect(stepsAfterFirst).toBe(initialSteps + 1);
            expect(stepsAfterSecond).toBe(initialSteps + 1);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: step-counter-app, Property 5: リセットによる歩数の初期化
   * 
   * 任意の歩数に対して、リセットを実行すると歩数が0になるべきである
   * 
   * **Validates: Requirements 3.1**
   */
  describe('Property 5: リセットによる歩数の初期化', () => {
    test('任意の歩数に対して、リセットを実行すると歩数が0になる', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 0以上の整数の歩数
          fc.nat({ max: 100000 }),
          async (steps) => {
            const stepCounter = new StepCounter(mockStorageManager, mockSensorAdapter);
            
            // 初期化せずに直接歩数を設定
            stepCounter.currentSteps = steps;

            // リセットを実行
            stepCounter.reset();

            // プロパティ: リセット後は必ず0になる
            expect(stepCounter.getCurrentSteps()).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('リセット後にストレージに0が保存される', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.nat({ max: 100000 }),
          async (steps) => {
            mockStorageManager.saveStepData.mockClear();
            
            const stepCounter = new StepCounter(mockStorageManager, mockSensorAdapter);
            stepCounter.currentSteps = steps;

            stepCounter.reset();

            // プロパティ: リセット時にストレージに0が保存される
            expect(mockStorageManager.saveStepData).toHaveBeenCalledWith({
              steps: 0,
              timestamp: expect.any(Number)
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: step-counter-app, Property 10: 歩数の非負性
   * 
   * 任意の操作（初期化、増加、リセット）の後、歩数は常に0以上であるべきである
   * 
   * **Validates: Requirements 6.1**
   */
  describe('Property 10: 歩数の非負性', () => {
    test('初期化後、歩数は常に0以上である', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 保存されたデータ（nullまたは有効なデータ）
          fc.option(
            fc.record({
              steps: fc.nat({ max: 100000 }),
              timestamp: fc.nat({ max: Date.now() })
            }),
            { nil: null }
          ),
          async (savedData) => {
            mockStorageManager.loadStepData.mockReturnValue(savedData);
            
            const stepCounter = new StepCounter(mockStorageManager, mockSensorAdapter);
            await stepCounter.initialize();

            // プロパティ: 初期化後の歩数は常に0以上
            expect(stepCounter.getCurrentSteps()).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('歩数を増やした後、歩数は常に0以上である', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 初期歩数と増加回数
          fc.nat({ max: 10000 }),
          fc.nat({ max: 100 }),
          async (initialSteps, increments) => {
            const stepCounter = new StepCounter(mockStorageManager, mockSensorAdapter);
            stepCounter.currentSteps = initialSteps;

            // 指定回数だけ歩数を増やす
            for (let i = 0; i < increments; i++) {
              stepCounter.incrementStep();
            }

            // プロパティ: 歩数を増やした後も常に0以上
            expect(stepCounter.getCurrentSteps()).toBeGreaterThanOrEqual(0);
            expect(stepCounter.getCurrentSteps()).toBe(initialSteps + increments);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('リセット後、歩数は常に0である', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.nat({ max: 100000 }),
          async (steps) => {
            const stepCounter = new StepCounter(mockStorageManager, mockSensorAdapter);
            stepCounter.currentSteps = steps;

            stepCounter.reset();

            // プロパティ: リセット後は必ず0（0以上）
            expect(stepCounter.getCurrentSteps()).toBe(0);
            expect(stepCounter.getCurrentSteps()).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('内部状態が負の値でも、getCurrentSteps()は0以上を返す', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 負の整数
          fc.integer({ min: -100000, max: -1 }),
          async (negativeSteps) => {
            const stepCounter = new StepCounter(mockStorageManager, mockSensorAdapter);
            
            // 内部状態を強制的に負の値にする
            stepCounter.currentSteps = negativeSteps;

            // プロパティ: 内部状態が負でもgetCurrentSteps()は0以上を返す
            expect(stepCounter.getCurrentSteps()).toBeGreaterThanOrEqual(0);
            expect(stepCounter.getCurrentSteps()).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: step-counter-app, Property 11: タイムスタンプの検証
   * 
   * 任意の保存されたデータに対して、そのタイムスタンプが現在の日次期間内にあるかどうかが正しく判定されるべきである
   * 
   * **Validates: Requirements 6.3**
   */
  describe('Property 11: タイムスタンプの検証', () => {
    test('現在の日次期間内のタイムスタンプは正しく判定される', async () => {
      await fc.assert(
        fc.asyncProperty(
          // リセット時刻（HH:MM形式）
          fc.record({
            hours: fc.integer({ min: 0, max: 23 }),
            minutes: fc.integer({ min: 0, max: 59 })
          }),
          // 現在時刻からの相対時間（時間単位、-48 ~ 0）
          fc.integer({ min: -48, max: 0 }),
          async (resetTime, hoursAgo) => {
            const resetTimeStr = `${String(resetTime.hours).padStart(2, '0')}:${String(resetTime.minutes).padStart(2, '0')}`;
            mockStorageManager.getResetTime.mockReturnValue(resetTimeStr);

            const stepCounter = new StepCounter(mockStorageManager, mockSensorAdapter);
            
            // テスト用のタイムスタンプ（現在時刻からhoursAgo時間前）
            const testTimestamp = Date.now() + (hoursAgo * 60 * 60 * 1000);

            // 最後のリセット時刻を計算
            const lastResetTime = stepCounter.calculateLastResetTime(resetTimeStr);

            // 期待される結果
            const expectedResult = testTimestamp >= lastResetTime;

            // プロパティ: タイムスタンプが最後のリセット時刻以降ならtrue
            expect(stepCounter.isCurrentPeriod(testTimestamp)).toBe(expectedResult);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('24時間以上前のタイムスタンプは前の日次期間と判定される', async () => {
      await fc.assert(
        fc.asyncProperty(
          // リセット時刻
          fc.record({
            hours: fc.integer({ min: 0, max: 23 }),
            minutes: fc.integer({ min: 0, max: 59 })
          }),
          // 25時間以上前のタイムスタンプ
          fc.integer({ min: 25, max: 72 }),
          async (resetTime, hoursAgo) => {
            const resetTimeStr = `${String(resetTime.hours).padStart(2, '0')}:${String(resetTime.minutes).padStart(2, '0')}`;
            mockStorageManager.getResetTime.mockReturnValue(resetTimeStr);

            const stepCounter = new StepCounter(mockStorageManager, mockSensorAdapter);
            
            // 25時間以上前のタイムスタンプ
            const oldTimestamp = Date.now() - (hoursAgo * 60 * 60 * 1000);

            // プロパティ: 24時間以上前のタイムスタンプはfalse
            // （ただし、リセット時刻によっては24時間以内でもfalseになる可能性がある）
            const result = stepCounter.isCurrentPeriod(oldTimestamp);
            
            // 最後のリセット時刻を計算
            const lastResetTime = stepCounter.calculateLastResetTime(resetTimeStr);
            const expectedResult = oldTimestamp >= lastResetTime;
            
            expect(result).toBe(expectedResult);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('calculateLastResetTime()は常に現在時刻以前の時刻を返す', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            hours: fc.integer({ min: 0, max: 23 }),
            minutes: fc.integer({ min: 0, max: 59 })
          }),
          async (resetTime) => {
            const resetTimeStr = `${String(resetTime.hours).padStart(2, '0')}:${String(resetTime.minutes).padStart(2, '0')}`;
            
            const stepCounter = new StepCounter(mockStorageManager, mockSensorAdapter);
            const lastResetTime = stepCounter.calculateLastResetTime(resetTimeStr);
            const now = Date.now();

            // プロパティ: 最後のリセット時刻は常に現在時刻以前
            expect(lastResetTime).toBeLessThanOrEqual(now);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('初期化時に古いデータは破棄され、新しい日次期間として初期化される', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 古い歩数データ
          fc.record({
            steps: fc.nat({ max: 100000 }),
            // 25時間以上前のタイムスタンプ
            hoursAgo: fc.integer({ min: 25, max: 72 })
          }),
          async (oldData) => {
            const oldTimestamp = Date.now() - (oldData.hoursAgo * 60 * 60 * 1000);
            mockStorageManager.loadStepData.mockReturnValue({
              steps: oldData.steps,
              timestamp: oldTimestamp
            });
            mockStorageManager.getResetTime.mockReturnValue('00:00');

            const stepCounter = new StepCounter(mockStorageManager, mockSensorAdapter);
            await stepCounter.initialize();

            // プロパティ: 古いデータは破棄され、0で初期化される
            expect(stepCounter.getCurrentSteps()).toBe(0);
            expect(mockStorageManager.saveStepData).toHaveBeenCalledWith({
              steps: 0,
              timestamp: expect.any(Number)
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
