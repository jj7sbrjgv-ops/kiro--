/**
 * SensorAdapter ユニットテスト
 * 
 * テスト対象:
 * - センサー権限リクエスト（要件1.3）
 * - センサーアクセス拒否時の処理（要件1.4, 7.1）
 * - センサー利用不可時の処理（要件7.1）
 */

const SensorAdapter = require('./SensorAdapter');

describe('SensorAdapter', () => {
  let sensorAdapter;
  let mockCallback;

  beforeEach(() => {
    sensorAdapter = new SensorAdapter();
    mockCallback = jest.fn();
    
    // DeviceMotionEventのモックをリセット
    delete global.DeviceMotionEvent;
    delete global.window;
    
    // windowオブジェクトのモック
    global.window = {
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      DeviceMotionEvent: undefined
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('isAvailable', () => {
    test('DeviceMotionEventが存在する場合はtrueを返す', () => {
      global.window.DeviceMotionEvent = {};
      expect(sensorAdapter.isAvailable()).toBe(true);
    });

    test('DeviceMotionEventが存在しない場合はfalseを返す（要件7.1）', () => {
      delete global.window.DeviceMotionEvent;
      expect(sensorAdapter.isAvailable()).toBe(false);
    });
  });

  describe('requestPermission', () => {
    test('iOS 13+で権限が付与された場合はtrueを返す（要件1.3）', async () => {
      global.DeviceMotionEvent = {
        requestPermission: jest.fn().mockResolvedValue('granted')
      };
      global.window.DeviceMotionEvent = global.DeviceMotionEvent;

      const result = await sensorAdapter.requestPermission();
      expect(result).toBe(true);
      expect(global.DeviceMotionEvent.requestPermission).toHaveBeenCalled();
    });

    test('iOS 13+で権限が拒否された場合はfalseを返す（要件1.4）', async () => {
      global.DeviceMotionEvent = {
        requestPermission: jest.fn().mockResolvedValue('denied')
      };
      global.window.DeviceMotionEvent = global.DeviceMotionEvent;

      const result = await sensorAdapter.requestPermission();
      expect(result).toBe(false);
    });

    test('権限リクエストでエラーが発生した場合はfalseを返す（要件7.1）', async () => {
      global.DeviceMotionEvent = {
        requestPermission: jest.fn().mockRejectedValue(new Error('Permission error'))
      };
      global.window.DeviceMotionEvent = global.DeviceMotionEvent;

      const result = await sensorAdapter.requestPermission();
      expect(result).toBe(false);
    });

    test('requestPermission関数が存在しない場合はtrueを返す（Android等）', async () => {
      global.DeviceMotionEvent = {};
      global.window.DeviceMotionEvent = global.DeviceMotionEvent;

      const result = await sensorAdapter.requestPermission();
      expect(result).toBe(true);
    });

    test('DeviceMotionEventが未定義の場合はtrueを返す', async () => {
      delete global.DeviceMotionEvent;
      delete global.window.DeviceMotionEvent;

      const result = await sensorAdapter.requestPermission();
      expect(result).toBe(true);
    });
  });

  describe('startListening', () => {
    test('センサーが利用可能で権限がある場合、リスニングを開始する', async () => {
      global.DeviceMotionEvent = {
        requestPermission: jest.fn().mockResolvedValue('granted')
      };
      global.window.DeviceMotionEvent = global.DeviceMotionEvent;

      await sensorAdapter.startListening(mockCallback);

      expect(sensorAdapter.isListening).toBe(true);
      expect(sensorAdapter.callback).toBe(mockCallback);
      expect(global.window.addEventListener).toHaveBeenCalledWith(
        'devicemotion',
        expect.any(Function)
      );
    });

    test('センサーが利用できない場合はエラーをスローする（要件7.1）', async () => {
      delete global.window.DeviceMotionEvent;

      await expect(sensorAdapter.startListening(mockCallback))
        .rejects.toThrow('DeviceMotion API is not available');
      
      expect(sensorAdapter.isListening).toBe(false);
    });

    test('権限が拒否された場合はエラーをスローする（要件1.4）', async () => {
      global.DeviceMotionEvent = {
        requestPermission: jest.fn().mockResolvedValue('denied')
      };
      global.window.DeviceMotionEvent = global.DeviceMotionEvent;

      await expect(sensorAdapter.startListening(mockCallback))
        .rejects.toThrow('DeviceMotion permission denied');
      
      expect(sensorAdapter.isListening).toBe(false);
    });

    test('既にリスニング中の場合は何もしない', async () => {
      global.DeviceMotionEvent = {
        requestPermission: jest.fn().mockResolvedValue('granted')
      };
      global.window.DeviceMotionEvent = global.DeviceMotionEvent;

      await sensorAdapter.startListening(mockCallback);
      const firstCallCount = global.window.addEventListener.mock.calls.length;

      await sensorAdapter.startListening(mockCallback);
      const secondCallCount = global.window.addEventListener.mock.calls.length;

      expect(firstCallCount).toBe(secondCallCount);
    });
  });

  describe('stopListening', () => {
    test('リスニングを停止する', async () => {
      global.DeviceMotionEvent = {
        requestPermission: jest.fn().mockResolvedValue('granted')
      };
      global.window.DeviceMotionEvent = global.DeviceMotionEvent;

      await sensorAdapter.startListening(mockCallback);
      sensorAdapter.stopListening();

      expect(sensorAdapter.isListening).toBe(false);
      expect(sensorAdapter.callback).toBe(null);
      expect(global.window.removeEventListener).toHaveBeenCalledWith(
        'devicemotion',
        expect.any(Function)
      );
    });

    test('リスニング中でない場合は何もしない', () => {
      sensorAdapter.stopListening();

      expect(global.window.removeEventListener).not.toHaveBeenCalled();
    });
  });

  describe('handleMotion', () => {
    test('加速度データをコールバックに渡す', async () => {
      global.DeviceMotionEvent = {
        requestPermission: jest.fn().mockResolvedValue('granted')
      };
      global.window.DeviceMotionEvent = global.DeviceMotionEvent;

      await sensorAdapter.startListening(mockCallback);

      const mockEvent = {
        accelerationIncludingGravity: {
          x: 1.5,
          y: 2.5,
          z: 9.8
        }
      };

      sensorAdapter.handleMotion(mockEvent);

      expect(mockCallback).toHaveBeenCalledWith({
        x: 1.5,
        y: 2.5,
        z: 9.8
      });
    });

    test('加速度データがnullの場合は0を使用する', async () => {
      global.DeviceMotionEvent = {
        requestPermission: jest.fn().mockResolvedValue('granted')
      };
      global.window.DeviceMotionEvent = global.DeviceMotionEvent;

      await sensorAdapter.startListening(mockCallback);

      const mockEvent = {
        accelerationIncludingGravity: {
          x: null,
          y: 2.5,
          z: null
        }
      };

      sensorAdapter.handleMotion(mockEvent);

      expect(mockCallback).toHaveBeenCalledWith({
        x: 0,
        y: 2.5,
        z: 0
      });
    });

    test('accelerationIncludingGravityが存在しない場合は何もしない', async () => {
      global.DeviceMotionEvent = {
        requestPermission: jest.fn().mockResolvedValue('granted')
      };
      global.window.DeviceMotionEvent = global.DeviceMotionEvent;

      await sensorAdapter.startListening(mockCallback);

      const mockEvent = {};

      sensorAdapter.handleMotion(mockEvent);

      expect(mockCallback).not.toHaveBeenCalled();
    });

    test('コールバックが設定されていない場合は何もしない', () => {
      const mockEvent = {
        accelerationIncludingGravity: {
          x: 1.5,
          y: 2.5,
          z: 9.8
        }
      };

      sensorAdapter.handleMotion(mockEvent);

      expect(mockCallback).not.toHaveBeenCalled();
    });
  });
});
