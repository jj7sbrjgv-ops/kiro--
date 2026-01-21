/**
 * StorageManager のユニットテスト
 * 
 * 要件: 2.1, 2.3, 2.4, 6.2, 7.2
 */

const StorageManager = require('./StorageManager');

describe('StorageManager', () => {
  let storageManager;
  const store = {};

  // 各テストの前にlocalStorageモックをリセット
  beforeEach(() => {
    // ストアの内容をクリア
    Object.keys(store).forEach(key => delete store[key]);
    
    // localStorageモックを作成
    global.localStorage = {
      getItem: jest.fn((key) => {
        console.log('[beforeEach mock] getItem called with key:', key);
        return store[key] || null;
      }),
      setItem: jest.fn((key, value) => {
        console.log('[beforeEach mock] setItem called with key:', key);
        store[key] = value;
      }),
      removeItem: jest.fn((key) => {
        delete store[key];
      }),
      clear: jest.fn(() => {
        Object.keys(store).forEach(key => delete store[key]);
      })
    };

    storageManager = new StorageManager();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('歩数データの保存と読み込み', () => {
    test('有効な歩数データを保存できる', () => {
      const data = { steps: 100, timestamp: Date.now() };
      const result = storageManager.saveStepData(data);
      
      expect(result).toBe(true);
    });

    test('保存した歩数データを読み込める', () => {
      const data = { steps: 100, timestamp: Date.now() };
      storageManager.saveStepData(data);
      
      const loaded = storageManager.loadStepData();
      
      expect(loaded).toEqual(data);
    });

    test('データがない場合はnullを返す', () => {
      const loaded = storageManager.loadStepData();
      
      expect(loaded).toBeNull();
    });

    test('負の歩数は保存できない', () => {
      const data = { steps: -1, timestamp: Date.now() };
      const result = storageManager.saveStepData(data);
      
      expect(result).toBe(false);
    });

    test('小数の歩数は保存できない', () => {
      const data = { steps: 10.5, timestamp: Date.now() };
      const result = storageManager.saveStepData(data);
      
      expect(result).toBe(false);
    });

    test('無効なタイムスタンプは保存できない', () => {
      const data = { steps: 100, timestamp: -1 };
      const result = storageManager.saveStepData(data);
      
      expect(result).toBe(false);
    });

    test('データ読み込み失敗時はnullを返す（要件6.2）', () => {
      // 無効なJSONを返すようにモックを上書き
      const originalGetItem = global.localStorage.getItem;
      global.localStorage.getItem = jest.fn((key) => {
        if (key === storageManager.KEYS.STEP_DATA) {
          return 'invalid json';
        }
        return originalGetItem(key);
      });
      
      const loaded = storageManager.loadStepData();
      
      expect(loaded).toBeNull();
    });

    test('破損したデータの読み込み時はnullを返す', () => {
      // 無効な形式のデータを返すようにモックを上書き
      const originalGetItem = global.localStorage.getItem;
      global.localStorage.getItem = jest.fn((key) => {
        if (key === storageManager.KEYS.STEP_DATA) {
          return JSON.stringify({ invalid: 'data' });
        }
        return originalGetItem(key);
      });
      
      const loaded = storageManager.loadStepData();
      
      expect(loaded).toBeNull();
    });
  });

  describe('リセット時刻の管理', () => {
    test('デフォルトのリセット時刻は00:00', () => {
      const resetTime = storageManager.getResetTime();
      
      expect(resetTime).toBe('00:00');
    });

    test('有効なリセット時刻を設定できる', () => {
      const result = storageManager.setResetTime('06:30');
      
      expect(result).toBe(true);
      expect(storageManager.getResetTime()).toBe('06:30');
    });

    test('無効な時刻形式は拒否される', () => {
      const result = storageManager.setResetTime('25:00');
      
      expect(result).toBe(false);
    });

    test('時刻形式でない文字列は拒否される', () => {
      const result = storageManager.setResetTime('invalid');
      
      expect(result).toBe(false);
    });

    test('境界値の時刻を設定できる（00:00）', () => {
      const result = storageManager.setResetTime('00:00');
      
      expect(result).toBe(true);
      expect(storageManager.getResetTime()).toBe('00:00');
    });

    test('境界値の時刻を設定できる（23:59）', () => {
      const result = storageManager.setResetTime('23:59');
      
      expect(result).toBe(true);
      expect(storageManager.getResetTime()).toBe('23:59');
    });

    test('無効な形式の保存データがある場合はデフォルト値を返す', () => {
      // 無効なデータを返すようにモックを上書き
      const originalGetItem = global.localStorage.getItem;
      global.localStorage.getItem = jest.fn((key) => {
        if (key === storageManager.KEYS.RESET_TIME) {
          return 'invalid';
        }
        return originalGetItem(key);
      });
      
      const resetTime = storageManager.getResetTime();
      
      expect(resetTime).toBe('00:00');
    });
  });

  describe('履歴データの管理', () => {
    test('履歴エントリを保存できる', () => {
      const entry = { steps: 5000, date: '2024-01-01T00:00:00.000Z' };
      const result = storageManager.saveHistory(entry);
      
      expect(result).toBe(true);
    });

    test('保存した履歴を読み込める', () => {
      const entry = { steps: 5000, date: '2024-01-01T00:00:00.000Z' };
      storageManager.saveHistory(entry);
      
      const history = storageManager.loadHistory();
      
      expect(history).toHaveLength(1);
      expect(history[0]).toEqual(entry);
    });

    test('複数の履歴エントリを保存できる', () => {
      const entries = [
        { steps: 5000, date: '2024-01-01T00:00:00.000Z' },
        { steps: 6000, date: '2024-01-02T00:00:00.000Z' },
        { steps: 7000, date: '2024-01-03T00:00:00.000Z' }
      ];
      
      entries.forEach(entry => storageManager.saveHistory(entry));
      
      const history = storageManager.loadHistory();
      
      expect(history).toHaveLength(3);
      expect(history).toEqual(entries);
    });

    test('履歴がない場合は空配列を返す', () => {
      const history = storageManager.loadHistory();
      
      expect(history).toEqual([]);
    });

    test('30日を超える履歴は古いものから削除される', () => {
      // 35日分の履歴を作成
      for (let i = 0; i < 35; i++) {
        const entry = { 
          steps: 1000 + i, 
          date: `2024-01-${String(i + 1).padStart(2, '0')}T00:00:00.000Z` 
        };
        storageManager.saveHistory(entry);
      }
      
      const history = storageManager.loadHistory();
      
      expect(history).toHaveLength(30);
      // 最新の30日分が保持されている
      expect(history[0].steps).toBe(1005); // 6日目から
      expect(history[29].steps).toBe(1034); // 35日目まで
    });

    test('無効な履歴エントリは保存できない', () => {
      const entry = { invalid: 'data' };
      const result = storageManager.saveHistory(entry);
      
      expect(result).toBe(false);
    });

    test('履歴読み込み失敗時は空配列を返す（要件7.2）', () => {
      // 無効なJSONを返すようにモックを上書き
      const originalGetItem = global.localStorage.getItem;
      global.localStorage.getItem = jest.fn((key) => {
        if (key === storageManager.KEYS.HISTORY) {
          return 'invalid json';
        }
        return originalGetItem(key);
      });
      
      const history = storageManager.loadHistory();
      
      expect(history).toEqual([]);
    });

    test('破損した履歴データの読み込み時は空配列を返す', () => {
      // 配列でないデータを返すようにモックを上書き
      const originalGetItem = global.localStorage.getItem;
      global.localStorage.getItem = jest.fn((key) => {
        if (key === storageManager.KEYS.HISTORY) {
          return JSON.stringify({ invalid: 'data' });
        }
        return originalGetItem(key);
      });
      
      const history = storageManager.loadHistory();
      
      expect(history).toEqual([]);
    });
  });

  describe('エラーハンドリング（要件7.2）', () => {
    test('localStorageアクセス失敗時も適切に処理される', () => {
      // 新しいStorageManagerインスタンスを作成し、setItemをモック
      const mockSetItem = jest.fn(() => {
        console.log('Mock setItem called - throwing error');
        throw new Error('Storage quota exceeded');
      });
      global.localStorage.setItem = mockSetItem;
      
      // 新しいインスタンスを作成（モックされたlocalStorageを使用）
      const testManager = new StorageManager();
      
      const data = { steps: 100, timestamp: Date.now() };
      const result = testManager.saveStepData(data);
      
      console.log('Mock was called:', mockSetItem.mock.calls.length, 'times');
      console.log('Result:', result);
      
      expect(result).toBe(false);
    });

    test('localStorage読み込み失敗時も適切に処理される', () => {
      // getItemをモック
      const mockGetItem = jest.fn(() => {
        throw new Error('Storage access denied');
      });
      global.localStorage.getItem = mockGetItem;
      
      // 新しいインスタンスを作成
      const testManager = new StorageManager();
      
      const loaded = testManager.loadStepData();
      
      expect(loaded).toBeNull();
    });

    test('リセット時刻の読み込み失敗時はデフォルト値を返す（要件7.2）', () => {
      // getItemをモック
      const mockGetItem = jest.fn(() => {
        throw new Error('Storage access denied');
      });
      global.localStorage.getItem = mockGetItem;
      
      // 新しいインスタンスを作成
      const testManager = new StorageManager();
      
      const resetTime = testManager.getResetTime();
      
      expect(resetTime).toBe('00:00');
    });

    test('リセット時刻の保存失敗時はfalseを返す（要件7.2）', () => {
      // setItemをモック
      const mockSetItem = jest.fn(() => {
        throw new Error('Storage quota exceeded');
      });
      global.localStorage.setItem = mockSetItem;
      
      // 新しいインスタンスを作成
      const testManager = new StorageManager();
      
      const result = testManager.setResetTime('06:00');
      
      expect(result).toBe(false);
    });

    test('履歴の保存失敗時はfalseを返す（要件7.2）', () => {
      // getItemをモック（履歴読み込みで失敗）
      const mockGetItem = jest.fn(() => {
        throw new Error('Storage access denied');
      });
      global.localStorage.getItem = mockGetItem;
      
      // 新しいインスタンスを作成
      const testManager = new StorageManager();
      
      const entry = { steps: 5000, date: '2024-01-01T00:00:00.000Z' };
      const result = testManager.saveHistory(entry);
      
      expect(result).toBe(false);
    });
  });

  describe('データのクリア', () => {
    test('すべてのデータをクリアできる', () => {
      // データを設定
      storageManager.saveStepData({ steps: 100, timestamp: Date.now() });
      storageManager.setResetTime('06:00');
      storageManager.saveHistory({ steps: 5000, date: '2024-01-01T00:00:00.000Z' });
      
      const result = storageManager.clearAll();
      
      expect(result).toBe(true);
    });
  });
});
