# 经典 2D 贪吃蛇（Canvas）

一个无需任何依赖、可直接部署到 GitHub Pages 的经典网页贪吃蛇。

## 特性
- 深色背景（`#0b1020`）+ 绿色蛇身（`#2ecc71`）+ 红色圆形食物（`#ff4d4f`）
- 细网格渲染与更亮蛇头（含眼睛）
- 键盘控制：方向键 / W A S D（方向直觉一致）
- 手机触控方向按钮（上/下/左/右）
- 按钮控制：Start / Pause / Restart
- 空格键可直接 Restart
- 固定 Tick：初始 `150ms`，每吃 5 个食物加速 `10ms`，最低 `60ms`
- 分数 + 本地排行榜 Top 5（`localStorage`）
- 背景音乐开关（WebAudio）
- 撞墙/撞自己结束，满盘显示 `🎉 You Win!`

## 操作
- `↑ ↓ ← →` 或 `W A S D`：移动
- `Space`：Restart
- 点击按钮：Start / Pause / Restart

## 本地运行
```bash
python3 -m http.server 8000
```
访问 `http://localhost:8000`。

## GitHub Pages
纯静态页面（无 npm、无 build、无 CDN），可直接部署到 `main / (root)`。
