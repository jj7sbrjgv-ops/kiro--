@echo off
echo 歩数計アプリのサーバーを起動中...
echo.
echo ブラウザで以下のURLを開いてください:
echo http://localhost:8000
echo.
echo サーバーを停止するには Ctrl+C を押してください
echo.
python -m http.server 8000
