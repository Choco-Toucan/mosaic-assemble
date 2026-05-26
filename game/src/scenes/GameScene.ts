import Phaser from 'phaser';
import { BoardState, CellMark, BOARD_SIZE } from '../systems/BoardState';
import { SoundManager } from '../systems/SoundManager';

/** 世界空间中每个格子的像素尺寸 */
const CELL_SIZE = 20;
/** 缩放限制 */
const ZOOM_MIN = 0.25;
const ZOOM_MAX = 3.0;
const ZOOM_STEP = 1.1;
/** 方向键平移速度（世界坐标 px/s） */
const PAN_SPEED = 600;

const COLORS = {
  cellNone: 0x1a3040,
  cellA: 0x305878,
  cellB: 0x2d6868,
  gridLine: 0x253a4a,
} as const;

export class GameScene extends Phaser.Scene {
  private board!: BoardState;
  private boardImage!: Phaser.GameObjects.RenderTexture;
  private sfx!: SoundManager;
  private worldSize = 0;
  private isMarking = false;
  private isPanning = false;
  /** 当前拖拽意图：'mark' 只做标记，'unmark' 只做取消，null 尚未确定 */
  private markIntent: 'mark' | 'unmark' | null = null;
  private lastMarkedCell = -1;
  private panStartX = 0;
  private panStartY = 0;
  private panStartScrollX = 0;
  private panStartScrollY = 0;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.board = new BoardState(BOARD_SIZE);
    this.sfx = new SoundManager();
    this.worldSize = BOARD_SIZE * CELL_SIZE;

    // 棋盘纹理放在世界原点
    this.boardImage = this.add.renderTexture(0, 0, this.worldSize, this.worldSize);
    this.boardImage.setOrigin(0, 0);

    // 相机设置
    const cam = this.cameras.main;
    cam.setBounds(0, 0, this.worldSize, this.worldSize);
    cam.centerOn(this.worldSize / 2, this.worldSize / 2);

    this.drawFullBoard();

    // 方向键
    this.cursors = this.input.keyboard!.createCursorKeys();

    // ---- 输入 ----

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.middleButtonDown()) {
        // 中键拖拽 → 平移
        this.isPanning = true;
        this.panStartX = pointer.x;
        this.panStartY = pointer.y;
        this.panStartScrollX = cam.scrollX;
        this.panStartScrollY = cam.scrollY;
      } else {
        // 左/右键 → 标记，根据第一格的转换方向锁定意图
        this.isMarking = true;
        this.lastMarkedCell = -1;
        this.determineIntent();
        this.handleMark();
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isPanning) {
        const dx = (pointer.x - this.panStartX) / cam.zoom;
        const dy = (pointer.y - this.panStartY) / cam.zoom;
        cam.setScroll(
          this.panStartScrollX - dx,
          this.panStartScrollY - dy,
        );
      } else if (this.isMarking) {
        this.handleMark();
      }
    });

    this.input.on('pointerup', () => {
      this.isMarking = false;
      this.isPanning = false;
      this.markIntent = null;
      this.lastMarkedCell = -1;
    });

    // 滚轮缩放 — 以鼠标指向的世界坐标为中心
    this.input.on(
      'wheel',
      (_pointer: Phaser.Input.Pointer, _objects: Phaser.GameObjects.GameObject[], _dx: number, dy: number) => {
        const pointer = this.input.activePointer;
        const oldZoom = cam.zoom;
        let newZoom = oldZoom;

        if (dy < 0) {
          newZoom = Math.min(ZOOM_MAX, oldZoom * ZOOM_STEP);
        } else if (dy > 0) {
          newZoom = Math.max(ZOOM_MIN, oldZoom / ZOOM_STEP);
        }

        if (newZoom !== oldZoom) {
          const worldX = cam.scrollX + pointer.x / oldZoom;
          const worldY = cam.scrollY + pointer.y / oldZoom;

          cam.setZoom(newZoom);

          const nsx = worldX - pointer.x / newZoom;
          const nsy = worldY - pointer.y / newZoom;
          cam.setScroll(nsx, nsy);
        }
      },
    );

    // 按 R 重置棋盘 | Home 重置视角
    this.input.keyboard?.on('keydown-R', () => {
      this.board.reset();
      this.drawFullBoard();
    });

    this.input.keyboard?.on('keydown-HOME', () => {
      cam.centerOn(this.worldSize / 2, this.worldSize / 2);
      cam.setZoom(1);
    });
  }

  update(_time: number, delta: number): void {
    const cam = this.cameras.main;
    const speed = (PAN_SPEED / cam.zoom) * (delta / 1000);

    if (this.cursors.left.isDown) cam.scrollX -= speed;
    if (this.cursors.right.isDown) cam.scrollX += speed;
    if (this.cursors.up.isDown) cam.scrollY -= speed;
    if (this.cursors.down.isDown) cam.scrollY += speed;
  }

  // ---- 标记逻辑 ----

  /** 根据按下时第一格的状态和按键，锁定本次拖拽的意图 */
  private determineIntent(): void {
    const pointer = this.input.activePointer;
    const col = Math.floor(pointer.worldX / CELL_SIZE);
    const row = Math.floor(pointer.worldY / CELL_SIZE);

    if (!this.board.inBounds(row, col)) {
      this.markIntent = 'mark';
      return;
    }

    const oldMark = this.board.getMark(row, col);

    if (pointer.rightButtonDown()) {
      // 右键：当前已是 B → 取消，否则 → 标记为 B
      this.markIntent = oldMark === CellMark.B ? 'unmark' : 'mark';
    } else {
      // 左键：当前已是 A → 取消，否则 → 标记为 A
      this.markIntent = oldMark === CellMark.A ? 'unmark' : 'mark';
    }
  }

  /** 根据锁定的意图对当前格子进行操作 */
  private handleMark(): void {
    const pointer = this.input.activePointer;
    const col = Math.floor(pointer.worldX / CELL_SIZE);
    const row = Math.floor(pointer.worldY / CELL_SIZE);

    if (!this.board.inBounds(row, col)) return;

    const cellIndex = row * BOARD_SIZE + col;
    if (cellIndex === this.lastMarkedCell) return;

    const oldMark = this.board.getMark(row, col);
    const isRight = pointer.rightButtonDown();

    let newMark: CellMark = oldMark;

    if (this.markIntent === 'mark') {
      // 整个拖拽只做标记：左键→A，右键→B
      if (isRight && oldMark !== CellMark.B) {
        newMark = CellMark.B;
      } else if (!isRight && oldMark !== CellMark.A) {
        newMark = CellMark.A;
      }
    } else {
      // 整个拖拽只做取消
      if (oldMark !== CellMark.None) {
        newMark = CellMark.None;
      }
    }

    if (newMark !== oldMark) {
      this.board.setMark(row, col, newMark);
      this.lastMarkedCell = cellIndex;
      this.playMarkSound(newMark);
      this.drawCell(row, col, newMark);
    }
  }

  // ---- 渲染 ----

  private drawFullBoard(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);

    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const mark = this.board.getMark(r, c);
        g.fillStyle(this.getCellColor(mark));
        g.fillRect(c * CELL_SIZE, r * CELL_SIZE, CELL_SIZE, CELL_SIZE);
      }
    }

    g.lineStyle(1, COLORS.gridLine, 0.3);
    for (let i = 0; i <= BOARD_SIZE; i++) {
      const pos = i * CELL_SIZE;
      g.lineBetween(pos, 0, pos, this.worldSize);
      g.lineBetween(0, pos, this.worldSize, pos);
    }

    this.boardImage.clear();
    this.boardImage.draw(g);
    g.destroy();
  }

  private drawCell(row: number, col: number, mark: CellMark): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);

    g.fillStyle(this.getCellColor(mark));
    g.fillRect(0, 0, CELL_SIZE, CELL_SIZE);
    g.lineStyle(1, COLORS.gridLine, 0.3);
    g.strokeRect(0, 0, CELL_SIZE, CELL_SIZE);

    this.boardImage.draw(g, col * CELL_SIZE, row * CELL_SIZE);
    g.destroy();
  }

  // ---- 音效 ----

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
