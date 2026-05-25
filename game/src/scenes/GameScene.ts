import Phaser from 'phaser';
import { BoardState, CellMark, BOARD_SIZE } from '../systems/BoardState';
import { SoundManager } from '../systems/SoundManager';

/** 格子像素尺寸 */
const CELL_SIZE = 9;

/** 棋盘渲染颜色 — 三种状态同色系但有足够区分度 */
const COLORS = {
  cellNone: 0x1a3040,
  cellA: 0x305878,
  cellB: 0x2d6868,
  gridLine: 0x253a4a,
  regionBorder: 0x5a8aaa,
} as const;

export class GameScene extends Phaser.Scene {
  private board!: BoardState;
  private boardTexture!: Phaser.GameObjects.RenderTexture;
  private sfx!: SoundManager;
  private boardPixelSize = 0;
  private margin = 0;
  private isPointerDown = false;
  private lastMarkedCell = -1;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.board = new BoardState(BOARD_SIZE);
    this.sfx = new SoundManager();

    this.boardPixelSize = BOARD_SIZE * CELL_SIZE;
    this.margin = (this.scale.width - this.boardPixelSize) / 2;

    // 创建渲染纹理，原点设为左上角避免点击移位
    this.boardTexture = this.add.renderTexture(0, 0, this.boardPixelSize, this.boardPixelSize);
    this.boardTexture.setOrigin(0, 0);
    this.boardTexture.setPosition(this.margin, this.margin);

    this.drawFullBoard();

    // 输入处理
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.isPointerDown = true;
      this.lastMarkedCell = -1;
      this.handleMark(pointer);
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isPointerDown) {
        this.handleMark(pointer);
      }
    });

    this.input.on('pointerup', () => {
      this.isPointerDown = false;
      this.lastMarkedCell = -1;
    });

    this.input.keyboard?.on('keydown-R', () => {
      this.board.reset();
      this.drawFullBoard();
    });
  }

  private handleMark(pointer: Phaser.Input.Pointer): void {
    const col = Math.floor((pointer.x - this.margin) / CELL_SIZE);
    const row = Math.floor((pointer.y - this.margin) / CELL_SIZE);

    if (!this.board.inBounds(row, col)) return;

    const cellIndex = row * BOARD_SIZE + col;
    if (cellIndex === this.lastMarkedCell) return;

    const oldMark = this.board.getMark(row, col);

    let newMark: CellMark;
    if (pointer.rightButtonDown()) {
      newMark = this.board.markRight(row, col);
    } else {
      newMark = this.board.markLeft(row, col);
    }

    if (newMark !== oldMark) {
      this.lastMarkedCell = cellIndex;
      this.playMarkSound(newMark);
      this.drawCell(row, col, newMark);
    }
  }

  private drawFullBoard(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    const size = BOARD_SIZE;

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const mark = this.board.getMark(r, c);
        g.fillStyle(this.getCellColor(mark));
        g.fillRect(c * CELL_SIZE, r * CELL_SIZE, CELL_SIZE, CELL_SIZE);
      }
    }

    g.lineStyle(1, COLORS.gridLine, 0.5);
    const total = size * CELL_SIZE;
    for (let i = 0; i <= size; i++) {
      const pos = i * CELL_SIZE;
      g.lineBetween(pos, 0, pos, total);
      g.lineBetween(0, pos, total, pos);
    }

    this.boardTexture.clear();
    this.boardTexture.draw(g);
    g.destroy();
  }

  private drawCell(row: number, col: number, mark: CellMark): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);

    g.fillStyle(this.getCellColor(mark));
    g.fillRect(0, 0, CELL_SIZE, CELL_SIZE);

    g.lineStyle(1, COLORS.gridLine, 0.5);
    g.strokeRect(0, 0, CELL_SIZE, CELL_SIZE);

    this.boardTexture.draw(g, col * CELL_SIZE, row * CELL_SIZE);
    g.destroy();
  }

  private playMarkSound(newMark: CellMark): void {
    if (newMark === CellMark.None) {
      this.sfx.playUnmark();
    } else if (newMark === CellMark.A) {
      this.sfx.playMarkA();
    } else {
      this.sfx.playMarkB();
    }
  }

  private getCellColor(mark: CellMark): number {
    switch (mark) {
      case CellMark.A:
        return COLORS.cellA;
      case CellMark.B:
        return COLORS.cellB;
      default:
        return COLORS.cellNone;
    }
  }
}
