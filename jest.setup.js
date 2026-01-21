/**
 * Jestセットアップファイル
 * 
 * テスト実行前の共通設定を行います。
 */

// LocalStorageのモック
class LocalStorageMock {
  constructor() {
    this.store = {};
  }

  clear() {
    this.store = {};
  }

  getItem(key) {
    return this.store[key] || null;
  }

  setItem(key, value) {
    this.store[key] = String(value);
  }

  removeItem(key) {
    delete this.store[key];
  }

  get length() {
    return Object.keys(this.store).length;
  }

  key(index) {
    const keys = Object.keys(this.store);
    return keys[index] || null;
  }
}

global.localStorage = new LocalStorageMock();

// DeviceMotionEventのモック
global.DeviceMotionEvent = class DeviceMotionEvent extends Event {
  constructor(type, eventInitDict) {
    super(type, eventInitDict);
    this.acceleration = eventInitDict?.acceleration || null;
    this.accelerationIncludingGravity = eventInitDict?.accelerationIncludingGravity || null;
    this.rotationRate = eventInitDict?.rotationRate || null;
    this.interval = eventInitDict?.interval || 0;
  }
};

// コンソールのエラーとワーニングを抑制（必要に応じて）
// global.console = {
//   ...console,
//   error: jest.fn(),
//   warn: jest.fn(),
// };
