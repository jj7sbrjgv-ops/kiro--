# 歩数計アプリ

スマートフォン向けの歩数計アプリケーション。HTML、CSS、JavaScriptを使用して実装されています。

## 機能

- デバイスの加速度センサーを使用した自動歩数カウント
- 24時間ごとの自動リセット（カスタマイズ可能）
- ローカルストレージによるデータ永続化
- レスポンシブデザイン（スマートフォン最適化）
- ダークモード対応

## セットアップ

### 依存関係のインストール

```bash
npm install
```

### テストの実行

```bash
# すべてのテストを実行
npm test

# ウォッチモードでテストを実行
npm run test:watch

# カバレッジレポートを生成
npm run test:coverage
```

## 使用方法

1. `index.html` をブラウザで開く
2. センサーへのアクセス権限を許可する（必要な場合）
3. 歩数が自動的にカウントされます
4. 設定セクションでリセット時刻をカスタマイズできます

## プロジェクト構造

```
.
├── index.html          # メインHTMLファイル
├── styles.css          # スタイルシート
├── app.js              # アプリケーションエントリーポイント
├── package.json        # プロジェクト設定
├── jest.config.js      # Jest設定
├── jest.setup.js       # Jestセットアップ
└── README.md           # このファイル
```

## 技術スタック

- **HTML5**: セマンティックマークアップ
- **CSS3**: レスポンシブデザイン、Flexbox、CSS変数
- **JavaScript (ES6+)**: モジュール、クラス、async/await
- **Jest**: テストフレームワーク
- **fast-check**: プロパティベーステスト
- **DeviceMotion API**: 加速度センサーアクセス
- **LocalStorage API**: データ永続化

## ブラウザサポート

- Chrome/Edge (最新版)
- Safari (iOS 13+)
- Firefox (最新版)

## ライセンス

MIT
