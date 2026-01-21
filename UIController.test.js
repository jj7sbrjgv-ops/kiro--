/**
 * UIController ユニットテスト
 * 
 * テスト対象:
 * - リセット時刻設定UIの存在（要件 4.1）
 * - 設定画面の存在（要件 5.3）
 * - 無効な入力時のエラーメッセージ表示（要件 4.2）
 * - UI要素の初期化
 * - 歩数表示の更新
 * - 次回リセット時刻の表示
 */

const UIController = require('./UIController');

describe('UIController', () => {
  let uiController;
  let mockStepCounter;
  let mockResetTimer;
  let mockStorageManager;
  let mockElements;

  beforeEach(() => {
    // DOM要素のモック
    const stepDisplay = { textContent: '' };
    const nextResetDisplay = { textContent: '' };
    const resetTimeInput = { value: '00:00', addEventListener: jest.fn() };
    const saveButton = { addEventListener: jest.fn() };
    const errorMessage = { textContent: '', className: '' };

    mockElements = {
      stepDisplay,
      nextResetDisplay,
      resetTimeInput,
      saveButton,
      errorMessage
    };

    // document.getElementByIdのモック - グローバルに設定
    if (typeof global.document === 'undefined') {
      global.document = {};
    }
    
    global.document.getElementById = jest.fn((id) => {
      const elementMap = {
        'step-display': stepDisplay,
        'next-reset': nextResetDisplay,
        'reset-time-input': resetTimeInput,
        'save-reset-time': saveButton,
        'error-message': errorMessage
      };
      return elementMap[id] || null;
    });

    // StorageManagerのモック
    mockStorageManager = {
      getResetTime: jest.fn(() => '00:00'),
      setResetTime: jest.fn(() => true)
    };

    // StepCounterのモック
    mockStepCounter = {
      getCurrentSteps: jest.fn(() => 0),
      addObserver: jest.fn(),
      removeObserver: jest.fn()
    };

    // ResetTimerのモック
    mockResetTimer = {
      storageManager: mockStorageManager,
      getNextResetTime: jest.fn(() => Date.now() + 24 * 60 * 60 * 1000),
      updateResetTime: jest.fn(() => true)
    };

    uiController = new UIController(mockStepCounter, mockResetTimer);
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('初期化', () => {
    test('すべての必須UI要素が正しく取得される', () => {
      // Debug: check if getElementById is working
      const stepDisplayElement = document.getElementById('step-display');
      expect(stepDisplayElement).toBeTruthy();
      expect(stepDisplayElement).toBe(mockElements.stepDisplay);
      
      uiController.initialize();

      expect(uiController.elements.stepDisplay).toBe(mockElements.stepDisplay);
      expect(uiController.elements.nextResetDisplay).toBe(mockElements.nextResetDisplay);
      expect(uiController.elements.resetTimeInput).toBe(mockElements.resetTimeInput);
      expect(uiController.elements.saveButton).toBe(mockElements.saveButton);
      expect(uiController.elements.errorMessage).toBe(mockElements.errorMessage);
    });

    test('リセット時刻設定UIが存在する（要件 4.1）', () => {
      uiController.initialize();

      expect(uiController.elements.resetTimeInput).toBeDefined();
      expect(uiController.elements.saveButton).toBeDefined();
    });

    test('設定画面が存在する（要件 5.3）', () => {
      uiController.initialize();

      // リセット時刻の入力フィールドと保存ボタンが設定画面の一部
      expect(uiController.elements.resetTimeInput).toBeDefined();
      expect(uiController.elements.saveButton).toBeDefined();
    });

    test('必須要素が見つからない場合、エラーをスローする', () => {
      // step-displayが見つからない場合
      document.getElementById = jest.fn((id) => {
        if (id === 'step-display') return null;
        return mockElements[id] || null;
      });

      expect(() => {
        uiController.initialize();
      }).toThrow('Required UI element not found: stepDisplay');
    });

    test('イベントリスナーが正しく設定される', () => {
      uiController.initialize();

      expect(mockElements.saveButton.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
      expect(mockStepCounter.addObserver).toHaveBeenCalledWith(expect.any(Function));
    });

    test('現在のリセット時刻が入力フィールドに設定される', () => {
      mockStorageManager.getResetTime.mockReturnValue('06:30');

      uiController.initialize();

      expect(mockElements.resetTimeInput.value).toBe('06:30');
    });

    test('初期表示が更新される', () => {
      mockStepCounter.getCurrentSteps.mockReturnValue(1234);

      uiController.initialize();

      expect(mockElements.stepDisplay.textContent).toBe('1,234');
    });
  });

  describe('表示の更新', () => {
    beforeEach(() => {
      uiController.initialize();
    });

    test('歩数が正しく表示される（カンマ区切り）', () => {
      mockStepCounter.getCurrentSteps.mockReturnValue(12345);

      uiController.updateDisplay();

      expect(mockElements.stepDisplay.textContent).toBe('12,345');
    });

    test('歩数が0の場合も正しく表示される', () => {
      mockStepCounter.getCurrentSteps.mockReturnValue(0);

      uiController.updateDisplay();

      expect(mockElements.stepDisplay.textContent).toBe('0');
    });

    test('次回リセット時刻が正しく表示される', () => {
      const nextResetTime = new Date('2024-01-15T06:00:00').getTime();
      mockResetTimer.getNextResetTime.mockReturnValue(nextResetTime);

      uiController.updateDisplay();

      // 日本語ロケールで日時が表示されることを確認
      expect(mockElements.nextResetDisplay.textContent).toContain('2024');
      expect(mockElements.nextResetDisplay.textContent).toContain('01');
      expect(mockElements.nextResetDisplay.textContent).toContain('15');
    });

    test('歩数カウンターのオブザーバーとして登録され、更新時に表示が更新される', () => {
      // オブザーバーコールバックを取得
      const observerCallback = mockStepCounter.addObserver.mock.calls[0][0];

      mockStepCounter.getCurrentSteps.mockReturnValue(100);
      observerCallback();

      expect(mockElements.stepDisplay.textContent).toBe('100');
    });
  });

  describe('リセット時刻の変更', () => {
    beforeEach(() => {
      uiController.initialize();
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('有効な時刻形式の場合、リセット時刻が更新される', () => {
      mockElements.resetTimeInput.value = '06:30';

      uiController.handleResetTimeChange();

      expect(mockResetTimer.updateResetTime).toHaveBeenCalledWith('06:30');
    });

    test('有効な時刻形式の場合、成功メッセージが表示される', () => {
      mockElements.resetTimeInput.value = '06:30';

      uiController.handleResetTimeChange();

      expect(mockElements.errorMessage.textContent).toBe('リセット時刻を更新しました');
      expect(mockElements.errorMessage.className).toBe('message success');
    });

    test('無効な時刻形式の場合、エラーメッセージが表示される（要件 4.2）', () => {
      mockElements.resetTimeInput.value = '25:00'; // 無効な時刻

      uiController.handleResetTimeChange();

      expect(mockElements.errorMessage.textContent).toBe('有効な時刻形式（HH:MM）を入力してください');
      expect(mockElements.errorMessage.className).toBe('message error');
      expect(mockResetTimer.updateResetTime).not.toHaveBeenCalled();
    });

    test('無効な時刻形式: 24:00', () => {
      mockElements.resetTimeInput.value = '24:00';

      uiController.handleResetTimeChange();

      expect(mockElements.errorMessage.textContent).toBe('有効な時刻形式（HH:MM）を入力してください');
      expect(mockElements.errorMessage.className).toBe('message error');
    });

    test('無効な時刻形式: 12:60', () => {
      mockElements.resetTimeInput.value = '12:60';

      uiController.handleResetTimeChange();

      expect(mockElements.errorMessage.textContent).toBe('有効な時刻形式（HH:MM）を入力してください');
      expect(mockElements.errorMessage.className).toBe('message error');
    });

    test('無効な時刻形式: abc', () => {
      mockElements.resetTimeInput.value = 'abc';

      uiController.handleResetTimeChange();

      expect(mockElements.errorMessage.textContent).toBe('有効な時刻形式（HH:MM）を入力してください');
      expect(mockElements.errorMessage.className).toBe('message error');
    });

    test('リセット時刻の更新に失敗した場合、エラーメッセージが表示される', () => {
      mockElements.resetTimeInput.value = '06:30';
      mockResetTimer.updateResetTime.mockReturnValue(false);

      uiController.handleResetTimeChange();

      expect(mockElements.errorMessage.textContent).toBe('リセット時刻の更新に失敗しました');
      expect(mockElements.errorMessage.className).toBe('message error');
    });

    test('成功メッセージは3秒後に消える', () => {
      mockElements.resetTimeInput.value = '06:30';

      uiController.handleResetTimeChange();

      expect(mockElements.errorMessage.textContent).toBe('リセット時刻を更新しました');

      jest.advanceTimersByTime(3000);

      expect(mockElements.errorMessage.textContent).toBe('');
      expect(mockElements.errorMessage.className).toBe('message');
    });

    test('エラーメッセージは3秒後に消える', () => {
      mockElements.resetTimeInput.value = 'invalid';

      uiController.handleResetTimeChange();

      expect(mockElements.errorMessage.textContent).toBe('有効な時刻形式（HH:MM）を入力してください');

      jest.advanceTimersByTime(3000);

      expect(mockElements.errorMessage.textContent).toBe('');
      expect(mockElements.errorMessage.className).toBe('message');
    });
  });

  describe('エラーメッセージ表示', () => {
    beforeEach(() => {
      uiController.initialize();
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('エラーメッセージが正しく表示される', () => {
      uiController.showError('テストエラー');

      expect(mockElements.errorMessage.textContent).toBe('テストエラー');
      expect(mockElements.errorMessage.className).toBe('message error');
    });

    test('エラーメッセージは3秒後に消える', () => {
      uiController.showError('テストエラー');

      jest.advanceTimersByTime(3000);

      expect(mockElements.errorMessage.textContent).toBe('');
      expect(mockElements.errorMessage.className).toBe('message');
    });
  });

  describe('成功メッセージ表示', () => {
    beforeEach(() => {
      uiController.initialize();
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('成功メッセージが正しく表示される', () => {
      uiController.showSuccess('テスト成功');

      expect(mockElements.errorMessage.textContent).toBe('テスト成功');
      expect(mockElements.errorMessage.className).toBe('message success');
    });

    test('成功メッセージは3秒後に消える', () => {
      uiController.showSuccess('テスト成功');

      jest.advanceTimersByTime(3000);

      expect(mockElements.errorMessage.textContent).toBe('');
      expect(mockElements.errorMessage.className).toBe('message');
    });
  });

  describe('境界値テスト', () => {
    beforeEach(() => {
      uiController.initialize();
    });

    test('有効な時刻: 00:00', () => {
      mockElements.resetTimeInput.value = '00:00';

      uiController.handleResetTimeChange();

      expect(mockResetTimer.updateResetTime).toHaveBeenCalledWith('00:00');
    });

    test('有効な時刻: 23:59', () => {
      mockElements.resetTimeInput.value = '23:59';

      uiController.handleResetTimeChange();

      expect(mockResetTimer.updateResetTime).toHaveBeenCalledWith('23:59');
    });

    test('有効な時刻: 12:00', () => {
      mockElements.resetTimeInput.value = '12:00';

      uiController.handleResetTimeChange();

      expect(mockResetTimer.updateResetTime).toHaveBeenCalledWith('12:00');
    });

    test('大きな歩数の表示: 1,000,000', () => {
      mockStepCounter.getCurrentSteps.mockReturnValue(1000000);

      uiController.updateDisplay();

      expect(mockElements.stepDisplay.textContent).toBe('1,000,000');
    });
  });
});
