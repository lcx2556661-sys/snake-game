# 3D Snake Game

一个基于 **Three.js** 的 3D 贪吃蛇小游戏。

## 功能
- 🍎 食物发光（自发光 + 点光源脉冲）
- 🎮 鼠标控制视角（拖拽旋转、滚轮缩放）
- 🎵 背景音乐（内置 WebAudio，可开关）
- 🏆 分数排行榜（本地存储 Top 5 展示）
- 💀 游戏结束界面（本局得分 + 排名）
- 📱 手机触控方向键

## GitHub Pages 兼容
- 使用本地 `vendor/three.min.js` 与 `vendor/OrbitControls.js`（无外网依赖）
- 不依赖 ES module 打包，浏览器可直接运行

## 操作
- `W/A/S/D` 或方向键：控制蛇移动
- `Space`：重新开始
- 鼠标：旋转/缩放视角
- 右下角：手机触控按钮

## 本地运行
```bash
python3 -m http.server 8000
```
打开 `http://localhost:8000` 即可。


## Pages 更新提示
- 若刚合并后仍看到旧报错，请先强制刷新（`Ctrl+F5` / `Cmd+Shift+R`），或等待 GitHub Pages 部署完成后再访问。


## Bugfix
- 修复自撞误判：非吃食物移动时允许蛇头进入“当前尾巴格”（尾巴同 tick 会移除）。
- 修复食物生成死循环：棋盘占满或多次尝试失败时直接通关结束，避免卡死。


## Final Features

- 3D Snake (Three.js)
- Keyboard + Touch Controls
- Local Leaderboard
- Background Music Toggle
- GitHub Pages Ready
- Win condition when board is full
- Infinite-loop safe food placement
- Correct tail collision handling
