/**
 * StorageManager - ローカルストレージへのデータ保存と読み込みを管理するコンポーネント
 * 
 * 要件: 2.1, 2.3, 2.4, 7.2
 */

class StorageManager {
  constructor() {
    this.KEYS = {
      STEP_DATA: 'stepCounter_currentData',
      RESET_TIME: 'stepCounter_resetTime',
      HISTORY: 'stepCounter_history'
    };
    this.DEFAULT_RESET_TIME = '00:00'; // デフォルトは午前0時
  }

  /**
   * 歩数データを保存
   * @param {Object} data - 保存する歩数データ
   * @param {number} data.steps - 歩数（0以上の整数）
   * @param {number} data.timestamp - 最終更新時刻（Unix時間ミリ秒）
   * @returns {boolean} 保存に成功した場合はtrue、失敗した場合はfalse
   * 
   * 要件: 2.1
   */
  saveStepData(data) {
    try {
      // データの検証
      if (typeof data !== 'object' || data === null) {
        throw new Error('Invalid data: must be an object');
      }
      if (typeof data.steps !== 'number' || data.steps < 0 || !Number.isInteger(data.steps)) {
        throw new Error('Invalid steps: must be a non-negative integer');
      }
      if (typeof data.timestamp !== 'number' || data.timestamp < 0) {
        throw new Error('Invalid timestamp: must be a non-negative number');
      }

      localStorage.setItem(this.KEYS.STEP_DATA, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Failed to save step data:', error);
      return false;
    }
  }

  /**
   * 歩数データを読み込み
   * @returns {Object|null} 保存された歩数データ、または読み込みに失敗した場合はnull
   * 
   * 要件: 2.1
   */
  loadStepData() {
    try {
      const data = localStorage.getItem(this.KEYS.STEP_DATA);
      if (!data) {
        return null;
      }

      const parsed = JSON.parse(data);
      
      // データの検証
      if (typeof parsed !== 'object' || parsed === null) {
        throw new Error('Invalid data format');
      }
      if (typeof parsed.steps !== 'number' || parsed.steps < 0) {
        throw new Error('Invalid steps in saved data');
      }
      if (typeof parsed.timestamp !== 'number' || parsed.timestamp < 0) {
        throw new Error('Invalid timestamp in saved data');
      }

      return parsed;
    } catch (error) {
      console.error('Failed to load step data:', error);
      return null;
    }
  }

  /**
   * リセット時刻を取得
   * @returns {string} リセット時刻（HH:MM形式）
   * 
   * 要件: 2.4
   */
  getResetTime() {
    try {
      const resetTime = localStorage.getItem(this.KEYS.RESET_TIME);
      
      // 保存されたリセット時刻がない場合はデフォルト値を返す
      if (!resetTime) {
        return this.DEFAULT_RESET_TIME;
      }

      // 時刻形式の検証
      if (!/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(resetTime)) {
        console.warn('Invalid reset time format in storage, using default');
        return this.DEFAULT_RESET_TIME;
      }

      return resetTime;
    } catch (error) {
      console.error('Failed to get reset time:', error);
      return this.DEFAULT_RESET_TIME;
    }
  }

  /**
   * リセット時刻を設定
   * @param {string} time - リセット時刻（HH:MM形式、00:00〜23:59）
   * @returns {boolean} 設定に成功した場合はtrue、失敗した場合はfalse
   * 
   * 要件: 2.4
   */
  setResetTime(time) {
    try {
      // 時刻形式の検証（HH:MM）
      if (!/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(time)) {
        throw new Error('Invalid time format: must be HH:MM (00:00-23:59)');
      }

      localStorage.setItem(this.KEYS.RESET_TIME, time);
      return true;
    } catch (error) {
      console.error('Failed to set reset time:', error);
      return false;
    }
  }

  /**
   * 履歴を保存
   * @param {Object} entry - 保存する履歴エントリ
   * @param {number} entry.steps - その日の歩数（0以上の整数）
   * @param {string} entry.date - 日付（ISO 8601形式）
   * @returns {boolean} 保存に成功した場合はtrue、失敗した場合はfalse
   * 
   * 要件: 2.3
   */
  saveHistory(entry) {
    try {
      // エントリの検証
      if (typeof entry !== 'object' || entry === null) {
        throw new Error('Invalid entry: must be an object');
      }
      if (typeof entry.steps !== 'number' || entry.steps < 0 || !Number.isInteger(entry.steps)) {
        throw new Error('Invalid steps: must be a non-negative integer');
      }
      if (typeof entry.date !== 'string' || !entry.date) {
        throw new Error('Invalid date: must be a non-empty string');
      }

      const history = this.loadHistory();
      history.push(entry);
      
      // 最新30日分のみ保持
      const recentHistory = history.slice(-30);
      
      localStorage.setItem(this.KEYS.HISTORY, JSON.stringify(recentHistory));
      return true;
    } catch (error) {
      console.error('Failed to save history:', error);
      return false;
    }
  }

  /**
   * 履歴を読み込み
   * @returns {Array} 履歴エントリの配列、または読み込みに失敗した場合は空配列
   * 
   * 要件: 2.3
   */
  loadHistory() {
    try {
      const history = localStorage.getItem(this.KEYS.HISTORY);
      
      if (!history) {
        return [];
      }

      const parsed = JSON.parse(history);
      
      // 配列であることを検証
      if (!Array.isArray(parsed)) {
        throw new Error('Invalid history format: must be an array');
      }

      // 各エントリの検証
      for (const entry of parsed) {
        if (typeof entry !== 'object' || entry === null) {
          throw new Error('Invalid history entry: must be an object');
        }
        if (typeof entry.steps !== 'number' || entry.steps < 0) {
          throw new Error('Invalid steps in history entry');
        }
        if (typeof entry.date !== 'string' || !entry.date) {
          throw new Error('Invalid date in history entry');
        }
      }

      return parsed;
    } catch (error) {
      console.error('Failed to load history:', error);
      return [];
    }
  }

  /**
   * すべてのデータをクリア（テスト用）
   * @returns {boolean} クリアに成功した場合はtrue、失敗した場合はfalse
   */
  clearAll() {
    try {
      localStorage.removeItem(this.KEYS.STEP_DATA);
      localStorage.removeItem(this.KEYS.RESET_TIME);
      localStorage.removeItem(this.KEYS.HISTORY);
      return true;
    } catch (error) {
      console.error('Failed to clear all data:', error);
      return false;
    }
  }
}

// エクスポート（Node.js環境用）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StorageManager;
}

// エクスポート（ブラウザ環境用）
if (typeof window !== 'undefined') {
  window.StorageManager = StorageManager;
}
