/**
 * Jest設定ファイル
 * 
 * テストフレームワークの設定を定義します。
 */

module.exports = {
  // テスト環境としてjsdomを使用（ブラウザ環境をシミュレート）
  testEnvironment: 'jsdom',
  
  // テストファイルのパターン
  testMatch: [
    '**/__tests__/**/*.js',
    '**/*.test.js'
  ],
  
  // カバレッジ収集の対象ファイル
  collectCoverageFrom: [
    '*.js',
    '!jest.config.js',
    '!coverage/**'
  ],
  
  // カバレッジの閾値
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  
  // モジュール変換の設定
  transform: {},
  
  // セットアップファイル
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  
  // タイムアウト設定（プロパティベーステストのため長めに設定）
  testTimeout: 10000,
  
  // 詳細な出力
  verbose: true
};
