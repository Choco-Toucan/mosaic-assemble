# 游戏模块

## 目录结构

```
game/
├── src/
│   ├── main.ts              # Phaser Game 配置与启动
│   ├── scenes/
│   │   └── GameScene.ts     # 主游戏场景：棋盘渲染与玩家输入
│   ├── systems/
│   │   ├── BoardState.ts    # 棋盘状态管理（三态标记逻辑）
│   │   └── SoundManager.ts  # 音效管理（Web Audio API 程序化生成）
│   ├── objects/             # 游戏对象（待扩展）
│   ├── utils/               # 工具函数（待扩展）
│   └── assets/
│       └── audio/           # 音效素材
├── index.html               # 入口 HTML
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## 核心模块说明

### main.ts

Phaser 游戏实例的入口配置：
- 画布 960×960，深色背景
- 缩放模式 `Scale.FIT` + 居中
- 禁用右键菜单

### GameScene

主场景，负责：
- **棋盘渲染**：使用 `RenderTexture` + `Graphics` 绘制 100×100 网格，性能优于 10000 个独立对象
- **输入处理**：`pointerdown` / `pointermove` / `pointerup` 三事件协作，支持按住拖拽连续标记
- **坐标映射**：根据指针世界坐标计算所在格子行列

### BoardState

棋盘状态管理，不包含渲染逻辑：
- 一维 `CellMark[]` 存储 10000 个格子状态（0=None, 1=A, 2=B）
- `markLeft()` / `markRight()` 实现三态循环切换
- `inBounds()` 边界检查

### SoundManager

程序化音效（无需外部音频文件）：
- 标记 A：高频短促 sine 音（800→1200Hz）
- 标记 B：低频短促 sine 音（400→300Hz）
- 取消标记：短白噪声
- 支持快速连续触发不冲突

## 操作说明

| 操作 | 效果 |
|------|------|
| 左键点击/拖拽 | 标记为 a |
| 右键点击/拖拽 | 标记为 b |
| R 键 | 重置棋盘 |

## 三态切换规则

```
未标记 ──左键──→ 标记 a ──左键──→ 未标记
未标记 ──右键──→ 标记 b ──右键──→ 未标记
标记 a  ──右键──→ 标记 b
标记 b  ──左键──→ 标记 a
```
