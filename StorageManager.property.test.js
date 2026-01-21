/**
 * StorageManager のプロパティベーステスト
 * 
 * Feature: step-counter-app
 * 
 * **Validates: Requirements 2.1, 2.3, 2.4, 4.3**
 */

const fc = require('fast-check');
const StorageManager = require('./StorageManager');

describe('StorageManager - Property-Based Tests', () => {
  let storageManager;

  beforeEach(() => {
    // 各テストの前に完全に新しいlocalStorageモックを作成
    const store = {};
    global.localStorage = {
      getItem: jest.fn((key) => store[key] || null),
      setItem: jest.fn((key, value) => { store[key] = value; }),
      removeItem: jest.fn((key) => { delete store[key]; }),
      clear: jest.fn(() => { Object.keys(store).forEach(key => delete store[key]); })
    };

    storageManager = new StorageManager();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * プロパティ3: 歩数データのラウンドトリップ
   * 
   * 任意の歩数データ（歩数とタイムスタンプ）に対して、
   * 保存してから読み込むと同等のデータが返されるべきである
   * 
   * **Validates: Requirements 2.1, 2.3**
   */
  describe('Property 3: 歩数データのラウンドトリップ', () => {
    test('任意の有効な歩数データを保存して読み込むと同等のデータが返される', () => {
      fc.assert(
        fc.property(
          // 歩数: 0以上の整数
          fc.nat(),
          // タイムスタンプ: 0以上の数値（Unix時間ミリ秒）
          fc.nat({ max: Date.now() + 365 * 24 * 60 * 60 * 1000 }), // 現在から1年後まで
          (steps, timestamp) => {
            // 各プロパティテストの前にストレージをクリア
            storageManager.clearAll();

            const originalData = { steps, timestamp };
            
            // データを保存
            const saveResult = storageManager.saveStepData(originalData);
            
            // 保存が成功することを確認
            expect(saveResult).toBe(true);
            
            // データを読み込み
            const loadedData = storageManager.loadStepData();
            
            // 読み込んだデータが元のデータと同等であることを確認
            expect(loadedData).not.toBeNull();
            expect(loadedData.steps).toBe(originalData.steps);
            expect(loadedData.timestamp).toBe(originalData.timestamp);
          }
        ),
        { numRuns: 100 } // 最低100回の反復を実行
      );
    });

    test('複数回の保存と読み込みでデータの整合性が保たれる', () => {
      fc.assert(
        fc.property(
          // 複数の歩数データを生成
          fc.array(
            fc.record({
              steps: fc.nat(),
              timestamp: fc.nat({ max: Date.now() + 365 * 24 * 60 * 60 * 1000 })
            }),
            { minLength: 1, maxLength: 10 }
          ),
          (dataArray) => {
            // 各プロパティテストの前にストレージをクリア
            storageManager.clearAll();

            // 各データを順番に保存して読み込み
            for (const originalData of dataArray) {
              const saveResult = storageManager.saveStepData(originalData);
              expect(saveResult).toBe(true);
              
              const loadedData = storageManager.loadStepData();
              expect(loadedData).not.toBeNull();
              expect(loadedData.steps).toBe(originalData.steps);
              expect(loadedData.timestamp).toBe(originalData.timestamp);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('境界値の歩数データでもラウンドトリップが成功する', () => {
      fc.assert(
        fc.property(
          // 境界値を含む歩数: 0, 小さい値, 大きい値
          fc.oneof(
            fc.constant(0),
            fc.nat({ max: 100 }),
            fc.nat({ max: Number.MAX_SAFE_INTEGER })
          ),
          // 境界値を含むタイムスタンプ: 0, 現在時刻, 未来の時刻
          fc.oneof(
            fc.constant(0),
            fc.constant(Date.now()),
            fc.nat({ max: Date.now() + 365 * 24 * 60 * 60 * 1000 })
          ),
          (steps, timestamp) => {
            // 各プロパティテストの前にストレージをクリア
            storageManager.clearAll();

            const originalData = { steps, timestamp };
            
            const saveResult = storageManager.saveStepData(originalData);
            expect(saveResult).toBe(true);
            
            const loadedData = storageManager.loadStepData();
            expect(loadedData).not.toBeNull();
            expect(loadedData.steps).toBe(originalData.steps);
            expect(loadedData.timestamp).toBe(originalData.timestamp);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * プロパティ4: リセット時刻のラウンドトリップ
   * 
   * 任意の有効なリセット時刻（HH:MM形式）に対して、
   * 保存してから読み込むと同じ時刻が返されるべきである
   * 
   * **Validates: Requirements 2.4, 4.3**
   */
  describe('Property 4: リセット時刻のラウンドトリップ', () => {
    test('任意の有効なリセット時刻を保存して読み込むと同じ時刻が返される', () => {
      fc.assert(
        fc.property(
          // 時: 0-23
          fc.integer({ min: 0, max: 23 }),
          // 分: 0-59
          fc.integer({ min: 0, max: 59 }),
          (hour, minute) => {
            // 各プロパティテストの前にストレージをクリア
            storageManager.clearAll();

            // HH:MM形式の時刻文字列を生成
            const originalTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
            
            // リセット時刻を設定
            const setResult = storageManager.setResetTime(originalTime);
            
            // 設定が成功することを確認
            expect(setResult).toBe(true);
            
            // リセット時刻を取得
            const loadedTime = storageManager.getResetTime();
            
            // 取得した時刻が元の時刻と同じであることを確認
            expect(loadedTime).toBe(originalTime);
          }
        ),
        { numRuns: 100 } // 最低100回の反復を実行
      );
    });

    test('複数回の設定と取得でリセット時刻の整合性が保たれる', () => {
      fc.assert(
        fc.property(
          // 複数のリセット時刻を生成
          fc.array(
            fc.record({
              hour: fc.integer({ min: 0, max: 23 }),
              minute: fc.integer({ min: 0, max: 59 })
            }),
            { minLength: 1, maxLength: 10 }
          ),
          (timeArray) => {
            // 各プロパティテストの前にストレージをクリア
            storageManager.clearAll();

            // 各時刻を順番に設定して取得
            for (const { hour, minute } of timeArray) {
              const originalTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
              
              const setResult = storageManager.setResetTime(originalTime);
              expect(setResult).toBe(true);
              
              const loadedTime = storageManager.getResetTime();
              expect(loadedTime).toBe(originalTime);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('境界値のリセット時刻でもラウンドトリップが成功する', () => {
      fc.assert(
        fc.property(
          // 境界値を含む時刻: 00:00, 23:59, その他のランダムな時刻
          fc.oneof(
            fc.constant({ hour: 0, minute: 0 }),    // 00:00
            fc.constant({ hour: 23, minute: 59 }),  // 23:59
            fc.constant({ hour: 12, minute: 0 }),   // 12:00
            fc.constant({ hour: 0, minute: 59 }),   // 00:59
            fc.constant({ hour: 23, minute: 0 }),   // 23:00
            fc.record({
              hour: fc.integer({ min: 0, max: 23 }),
              minute: fc.integer({ min: 0, max: 59 })
            })
          ),
          ({ hour, minute }) => {
            // 各プロパティテストの前にストレージをクリア
            storageManager.clearAll();

            const originalTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
            
            const setResult = storageManager.setResetTime(originalTime);
            expect(setResult).toBe(true);
            
            const loadedTime = storageManager.getResetTime();
            expect(loadedTime).toBe(originalTime);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('無効な時刻形式は拒否され、デフォルト値が保持される', () => {
      fc.assert(
        fc.property(
          // 無効な時刻形式を生成
          fc.oneof(
            fc.constant('25:00'),           // 無効な時
            fc.constant('12:60'),           // 無効な分
            fc.constant('24:00'),           // 24時は無効
            fc.constant('-1:00'),           // 負の値
            fc.constant('12:5'),            // 1桁の分
            fc.constant('1:30'),            // 1桁の時
            fc.constant('invalid'),         // 完全に無効
            fc.constant('12:30:00'),        // 秒を含む
            fc.constant(''),                // 空文字列
            fc.string().filter(s => !/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(s)) // その他の無効な文字列
          ),
          (invalidTime) => {
            // 各プロパティテストの前にストレージをクリア
            storageManager.clearAll();

            // 無効な時刻を設定しようとする
            const setResult = storageManager.setResetTime(invalidTime);
            
            // 設定が失敗することを確認
            expect(setResult).toBe(false);
            
            // デフォルト値が返されることを確認
            const loadedTime = storageManager.getResetTime();
            expect(loadedTime).toBe('00:00');
          }
        ),
        { numRuns: 100 }
      );
    });

    test('有効な時刻を設定した後、無効な時刻で上書きしようとしても元の値が保持される', () => {
      fc.assert(
        fc.property(
          // 有効な時刻
          fc.record({
            hour: fc.integer({ min: 0, max: 23 }),
            minute: fc.integer({ min: 0, max: 59 })
          }),
          // 無効な時刻
          fc.oneof(
            fc.constant('25:00'),
            fc.constant('12:60'),
            fc.constant('invalid')
          ),
          ({ hour, minute }, invalidTime) => {
            // 各プロパティテストの前にストレージをクリア
            storageManager.clearAll();

            // 有効な時刻を設定
            const validTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
            const setResult1 = storageManager.setResetTime(validTime);
            expect(setResult1).toBe(true);
            
            // 無効な時刻で上書きしようとする
            const setResult2 = storageManager.setResetTime(invalidTime);
            expect(setResult2).toBe(false);
            
            // 元の有効な時刻が保持されていることを確認
            const loadedTime = storageManager.getResetTime();
            expect(loadedTime).toBe(validTime);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * プロパティ4: リセット時刻のラウンドトリップ
   * 
   * 任意の有効なリセット時刻（HH:MM形式）に対して、
   * 保存してから読み込むと同じ時刻が返されるべきである
   * 
   * **Validates: Requirements 2.4, 4.3**
   */
  describe('Property 4: リセット時刻のラウンドトリップ', () => {
    test('任意の有効なリセット時刻を保存して読み込むと同じ時刻が返される', () => {
      fc.assert(
        fc.property(
          // 時: 0-23
          fc.integer({ min: 0, max: 23 }),
          // 分: 0-59
          fc.integer({ min: 0, max: 59 }),
          (hour, minute) => {
            // 各プロパティテストの前にストレージをクリア
            storageManager.clearAll();

            // HH:MM形式の時刻文字列を生成
            const originalTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
            
            // リセット時刻を設定
            const setResult = storageManager.setResetTime(originalTime);
            
            // 設定が成功することを確認
            expect(setResult).toBe(true);
            
            // リセット時刻を取得
            const loadedTime = storageManager.getResetTime();
            
            // 取得した時刻が元の時刻と同じであることを確認
            expect(loadedTime).toBe(originalTime);
          }
        ),
        { numRuns: 100 } // 最低100回の反復を実行
      );
    });

    test('複数回の設定と取得でリセット時刻の整合性が保たれる', () => {
      fc.assert(
        fc.property(
          // 複数のリセット時刻を生成
          fc.array(
            fc.record({
              hour: fc.integer({ min: 0, max: 23 }),
              minute: fc.integer({ min: 0, max: 59 })
            }),
            { minLength: 1, maxLength: 10 }
          ),
          (timeArray) => {
            // 各プロパティテストの前にストレージをクリア
            storageManager.clearAll();

            // 各時刻を順番に設定して取得
            for (const { hour, minute } of timeArray) {
              const originalTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
              
              const setResult = storageManager.setResetTime(originalTime);
              expect(setResult).toBe(true);
              
              const loadedTime = storageManager.getResetTime();
              expect(loadedTime).toBe(originalTime);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('境界値のリセット時刻でもラウンドトリップが成功する', () => {
      fc.assert(
        fc.property(
          // 境界値を含む時刻: 00:00, 23:59, その他のランダムな時刻
          fc.oneof(
            fc.constant({ hour: 0, minute: 0 }),    // 00:00
            fc.constant({ hour: 23, minute: 59 }),  // 23:59
            fc.constant({ hour: 12, minute: 0 }),   // 12:00
            fc.constant({ hour: 0, minute: 59 }),   // 00:59
            fc.constant({ hour: 23, minute: 0 }),   // 23:00
            fc.record({
              hour: fc.integer({ min: 0, max: 23 }),
              minute: fc.integer({ min: 0, max: 59 })
            })
          ),
          ({ hour, minute }) => {
            // 各プロパティテストの前にストレージをクリア
            storageManager.clearAll();

            const originalTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
            
            const setResult = storageManager.setResetTime(originalTime);
            expect(setResult).toBe(true);
            
            const loadedTime = storageManager.getResetTime();
            expect(loadedTime).toBe(originalTime);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('無効な時刻形式は拒否され、デフォルト値が保持される', () => {
      fc.assert(
        fc.property(
          // 無効な時刻形式を生成
          fc.oneof(
            fc.constant('25:00'),           // 無効な時
            fc.constant('12:60'),           // 無効な分
            fc.constant('24:00'),           // 24時は無効
            fc.constant('-1:00'),           // 負の値
            fc.constant('12:5'),            // 1桁の分
            fc.constant('1:30'),            // 1桁の時
            fc.constant('invalid'),         // 完全に無効
            fc.constant('12:30:00'),        // 秒を含む
            fc.constant(''),                // 空文字列
            fc.string().filter(s => !/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(s)) // その他の無効な文字列
          ),
          (invalidTime) => {
            // 各プロパティテストの前にストレージをクリア
            storageManager.clearAll();

            // 無効な時刻を設定しようとする
            const setResult = storageManager.setResetTime(invalidTime);
            
            // 設定が失敗することを確認
            expect(setResult).toBe(false);
            
            // デフォルト値が返されることを確認
            const loadedTime = storageManager.getResetTime();
            expect(loadedTime).toBe('00:00');
          }
        ),
        { numRuns: 100 }
      );
    });

    test('有効な時刻を設定した後、無効な時刻で上書きしようとしても元の値が保持される', () => {
      fc.assert(
        fc.property(
          // 有効な時刻
          fc.record({
            hour: fc.integer({ min: 0, max: 23 }),
            minute: fc.integer({ min: 0, max: 59 })
          }),
          // 無効な時刻
          fc.oneof(
            fc.constant('25:00'),
            fc.constant('12:60'),
            fc.constant('invalid')
          ),
          ({ hour, minute }, invalidTime) => {
            // 各プロパティテストの前にストレージをクリア
            storageManager.clearAll();

            // 有効な時刻を設定
            const validTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
            const setResult1 = storageManager.setResetTime(validTime);
            expect(setResult1).toBe(true);
            
            // 無効な時刻で上書きしようとする
            const setResult2 = storageManager.setResetTime(invalidTime);
            expect(setResult2).toBe(false);
            
            // 元の有効な時刻が保持されていることを確認
            const loadedTime = storageManager.getResetTime();
            expect(loadedTime).toBe(validTime);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
