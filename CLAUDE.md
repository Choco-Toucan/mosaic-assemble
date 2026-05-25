# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Language

用中文交流，但对于交流中的一些技术关键字，还保持英文。代码使用英文。注释和提交信息使用中文。


## Remote

- GitHub: `git@github.com:Choco-Toucan/mosaic-assemble.git`
每次提交都要包含变更信息，不要太过冗长，保持简洁，使用中文

每次提交到远端以后，将本次提交的变更内容通过飞书机器人webhook的方式进行发送
webhook的url为：https://open.feishu.cn/open-apis/bot/v2/hook/2a4dabbe-eba5-45f3-92a4-06e695113364

注意，该webhook可能为多个场景使用，所以通知内容要丰富些，包含
 - 项目
 - 分支
 - 作者
 - 提交时间，细到秒
 - 变更摘要
 - 以及对应的构建信息
 使用规范化的消息卡片。


## 概览
这是一个关于新一代类扫雷的游戏项目
其中游戏本地的代码在`game`目录下。
采用Phaser 3 + TypeScript + Vite 构建游戏本地代码。

项目根目录和`game`游戏目录下都要求包含一个readme.md，内容为项目的介绍。用于新同事来快速掌握本项目的结构、功能、核心业务流程、注意点等，用中文，保持一定的结构性和样式。

## 需求
@doc/spec.md
