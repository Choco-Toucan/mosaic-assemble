# 马赛克拼图（Mosaic Assemble）

新一代类扫雷逻辑推理游戏。核心创新在于将棋盘划分为多个**不规则区域**，玩家通过数字线索推理每个格子的类型，逐区域完成标记。

## 玩法概要

- **棋盘**：100×100 格子，划分为 6 个不规则区域（区域边界采用马赛克化曲线）
- **格子类型**：每个格子为 a 或 b 类型，格子上的数字表示其九宫格范围内同区域的 a 类型数量
- **操作**：左键标记 a、右键标记 b，支持按住拖拽连续标记；三态循环（未标记 ↔ a ↔ b）
- **超标判定**：区域内标记超标时数字变红，玩家据此回溯纠正
- **胜利条件**：所有区域的全部格子均正确标记

## 技术栈

| 层面 | 选型 |
|------|------|
| 游戏引擎 | Phaser 3.90 |
| 语言 | TypeScript 6.0 |
| 构建工具 | Vite 8 |
| 运行时 | Node.js 24 |

## 项目结构

```
mosaic-assemble/
├── game/                    # 游戏代码
│   ├── src/
│   │   ├── main.ts          # Phaser Game 入口
│   │   ├── scenes/          # 场景
│   │   ├── objects/         # 游戏对象
│   │   ├── systems/         # 游戏系统（棋盘状态、区域生成、音效等）
│   │   ├── utils/           # 工具函数
│   │   └── assets/          # 静态资源
│   ├── index.html
│   ├── package.json
│   └── readme.md
├── doc/
│   ├── spec.md              # 游戏设计规格
│   └── tech.md              # 技术约定
├── CLAUDE.md                # Claude Code 配置
└── readme.md                # 本文件
```

## 快速开始

```bash
cd game
npm install
npm run dev
```

浏览器打开 `http://localhost:5173` 即可开始游戏。

## 构建

```bash
cd game
npm run build    # 输出到 game/dist/
npm run preview  # 预览构建结果
```

## 文档

- [设计规格](doc/spec.md)
- [技术约定](doc/tech.md)
- [游戏模块说明](game/readme.md)
