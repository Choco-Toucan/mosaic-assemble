# 技术约定

## 运行时环境

| 项目 | 版本/选型 |
|------|----------|
| Node.js | 24.x |
| 包管理器 | npm（跟随 Node.js 24 内置版本） |

## 技术栈

| 层面 | 选型 |
|------|------|
| 游戏引擎 | Phaser 3（最新稳定版） |
| 语言 | TypeScript |
| 构建工具 | Vite |

## 项目结构

```
mosaic-assemble/
├── game/                    # 游戏代码（Phaser 3 + TypeScript + Vite）
│   ├── src/
│   │   ├── main.ts          # 入口：Phaser Game 配置与启动
│   │   ├── scenes/          # Phaser 场景
│   │   ├── objects/         # 游戏对象（格子、区域等）
│   │   ├── systems/         # 游戏系统（区域生成、超标判定等）
│   │   ├── utils/           # 工具函数
│   │   └── assets/          # 静态资源（音效、图片等）
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── readme.md
├── doc/
│   ├── spec.md              # 游戏设计规格
│   └── tech.md              # 本文件：技术约定
├── CLAUDE.md
└── readme.md
```

## 编码约定

- 代码使用英文命名（变量、函数、类型、文件等）
- 注释和 git 提交信息使用中文
- 遵循项目根 `CLAUDE.md` 和全局 `~/.claude/rules/` 中的编码规范

## Phaser 3 配置要点

- 渲染模式：WebGL（默认），必要时回退 Canvas
- 缩放模式：按需适配，后续确定
- 物理引擎：本游戏不需要（纯逻辑网格，无物理模拟）

## 资源约定

- 音效格式：优先使用 Web Audio API 兼容格式（MP3/OGG），也可程序化生成
- 音效素材放置于 `game/src/assets/audio/`
- 图片素材放置于 `game/src/assets/images/`
