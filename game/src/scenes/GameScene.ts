import Phaser from 'phaser';
import { BoardState, CellMark, BOARD_SIZE } from '../systems/BoardState';
import { BoardData } from '../systems/BoardData';
import { generateBoard } from '../systems/BoardGenerator';
import { SoundManager } from '../systems/SoundManager';

const CELL_SIZE = 20;
const ZOOM_MIN = 0.25;
const ZOOM_MAX = 3.0;
const ZOOM_STEP = 1.1;
const PAN_SPEED = 600;

const COLORS = {
  cellNone: 0x1a3040,
  cellA: 0x305878,
  cellB: 0x2d6868,
  gridLine: 0x253a4a,
  regionBorder: 0x5a8aaa,
} as const;

const TEXT_NORMAL = '#aabbcc';
const TEXT_OVERLIMIT = '#ff4444';
const TEXT_VERIFIED = '#44cc66';

const TOTAL_CELLS = BOARD_SIZE * BOARD_SIZE;

export class GameScene extends Phaser.Scene {
  private board!: BoardState;
  private boardData!: BoardData;
  private boardImage!: Phaser.GameObjects.RenderTexture;
  private sfx!: SoundManager;
  private worldSize = 0;
  private isMarking = false;
  private isPanning = false;
  private markIntent: 'mark' | 'unmark' | null = null;
  /** 拖拽锁定的区域编号，-1 表示未锁定 */
  private markRegionId = -1;
  private lastMarkedCell = -1;
  private panStartX = 0;
  private panStartY = 0;
  private panStartScrollX = 0;
  private panStartScrollY = 0;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
  /** 按 cellIndex 索引的数字 Text，null 表示不可见 */
  private numberTexts: (Phaser.GameObjects.Text | null)[] = [];

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.board = new BoardState(BOARD_SIZE);
    this.sfx = new SoundManager();
    this.worldSize = BOARD_SIZE * CELL_SIZE;
    this.numberTexts = new Array<Phaser.GameObjects.Text | null>(TOTAL_CELLS).fill(null);

    this.boardData = generateBoard({
      size: BOARD_SIZE,
      regionCount: 6,
      visibleRatio: 0.2,
      typeARatio: 0.5,
    });

    this.boardImage = this.add.renderTexture(0, 0, this.worldSize, this.worldSize);
    this.boardImage.setOrigin(0, 0);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, this.worldSize, this.worldSize);
    cam.centerOn(this.worldSize / 2, this.worldSize / 2);

    this.drawFullBoard();
    this.createNumberTexts();

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      W: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };

    // ---- 输入 ----

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.middleButtonDown()) {
        this.isPanning = true;
        this.panStartX = pointer.x;
        this.panStartY = pointer.y;
        this.panStartScrollX = cam.scrollX;
        this.panStartScrollY = cam.scrollY;
      } else {
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
        cam.setScroll(this.panStartScrollX - dx, this.panStartScrollY - dy);
      } else if (this.isMarking) {
        this.handleMark();
      }
    });

    this.input.on('pointerup', () => {
      this.isMarking = false;
      this.isPanning = false;
      this.markIntent = null;
      this.markRegionId = -1;
      this.lastMarkedCell = -1;
    });

    this.input.on(
      'wheel',
      (_p: Phaser.Input.Pointer, _o: Phaser.GameObjects.GameObject[], _dx: number, dy: number) => {
        const pointer = this.input.activePointer;
        const oldZoom = cam.zoom;
        let newZoom = oldZoom;

        if (dy < 0) newZoom = Math.min(ZOOM_MAX, oldZoom * ZOOM_STEP);
        else if (dy > 0) newZoom = Math.max(ZOOM_MIN, oldZoom / ZOOM_STEP);

        if (newZoom !== oldZoom) {
          const wx = cam.scrollX + pointer.x / oldZoom;
          const wy = cam.scrollY + pointer.y / oldZoom;
          cam.setZoom(newZoom);
          cam.setScroll(wx - pointer.x / newZoom, wy - pointer.y / newZoom);
        }
      },
    );

    this.input.keyboard?.on('keydown-R', () => {
      this.board.reset();
      this.drawFullBoard();
      this.resetOverlimit();
    });

    this.input.keyboard?.on('keydown-N', () => {
      this.boardData = generateBoard({
        size: BOARD_SIZE,
        regionCount: 6,
        visibleRatio: 0.2,
        typeARatio: 0.5,
      });
      this.board.reset();
      this.drawFullBoard();
      this.destroyNumberTexts();
      this.createNumberTexts();
    });

    this.input.keyboard?.on('keydown-HOME', () => {
      cam.centerOn(this.worldSize / 2, this.worldSize / 2);
      cam.setZoom(1);
    });
  }

  update(_time: number, delta: number): void {
    const cam = this.cameras.main;
    const speed = (PAN_SPEED / cam.zoom) * (delta / 1000);

    if (this.cursors.left.isDown || this.wasd.A.isDown) cam.scrollX -= speed;
    if (this.cursors.right.isDown || this.wasd.D.isDown) cam.scrollX += speed;
    if (this.cursors.up.isDown || this.wasd.W.isDown) cam.scrollY -= speed;
    if (this.cursors.down.isDown || this.wasd.S.isDown) cam.scrollY += speed;
  }

  // ---- 标记 ----

  private determineIntent(): void {
    const pointer = this.input.activePointer;
    const col = Math.floor(pointer.worldX / CELL_SIZE);
    const row = Math.floor(pointer.worldY / CELL_SIZE);

    const cellData = this.boardData.getCell(row, col);
    this.markRegionId = cellData ? cellData.regionId : -1;

    if (!this.board.inBounds(row, col)) { this.markIntent = 'mark'; return; }

    const old = this.board.getMark(row, col);
    if (pointer.rightButtonDown()) {
      this.markIntent = old === CellMark.B ? 'unmark' : 'mark';
    } else {
      this.markIntent = old === CellMark.A ? 'unmark' : 'mark';
    }
  }

  private handleMark(): void {
    const pointer = this.input.activePointer;
    const col = Math.floor(pointer.worldX / CELL_SIZE);
    const row = Math.floor(pointer.worldY / CELL_SIZE);
    if (!this.board.inBounds(row, col)) return;

    const idx = row * BOARD_SIZE + col;
    if (idx === this.lastMarkedCell) return;

    // 不跨区域操作
    const cellData = this.boardData.getCell(row, col);
    if (!cellData || cellData.regionId !== this.markRegionId) return;

    const oldMark = this.board.getMark(row, col);
    const isRight = pointer.rightButtonDown();
    let newMark: CellMark = oldMark;

    if (this.markIntent === 'mark') {
      if (isRight && oldMark !== CellMark.B) newMark = CellMark.B;
      else if (!isRight && oldMark !== CellMark.A) newMark = CellMark.A;
    } else {
      if (oldMark !== CellMark.None) newMark = CellMark.None;
    }

    if (newMark !== oldMark) {
      this.board.setMark(row, col, newMark);
      this.lastMarkedCell = idx;
      this.playMarkSound(newMark);
      this.drawCell(row, col);
      this.checkAffectedOverlimit(row, col);
    }
  }

  // ---- 超标判定 ----

  /** 检查受到 (row,col) 标记影响的所有格子是否超标，并更新数字颜色 */
  private checkAffectedOverlimit(row: number, col: number): void {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const nr = row + dr;
        const nc = col + dc;
        if (!this.boardData.inBounds(nr, nc)) continue;
        this.updateOverlimit(nr, nc);
      }
    }
  }

  private updateOverlimit(row: number, col: number): void {
    const cell = this.boardData.getCell(row, col);
    if (!cell || !cell.visible) return;

    const neighbors = this.boardData.getSameRegionNeighbors(row, col);
    let countA = 0;
    let countB = 0;
    let allMarked = true;

    for (const n of neighbors) {
      const mark = this.board.getMark(n.row, n.col);
      if (mark === CellMark.None) allMarked = false;
      else if (mark === CellMark.A) countA++;
      else if (mark === CellMark.B) countB++;
    }

    const overA = countA > cell.number;
    const overB = countB > (cell.m - cell.number);

    let color = TEXT_NORMAL;
    if (overA || overB) {
      color = TEXT_OVERLIMIT;
    } else if (allMarked && countA === cell.number && countB === (cell.m - cell.number)) {
      // 九宫格区域内全部标记完成且与数字完全匹配 → 验证正确
      color = TEXT_VERIFIED;
    }

    const text = this.numberTexts[row * BOARD_SIZE + col];
    if (text) {
      text.setColor(color);
    }
  }

  /** 重置所有数字颜色 */
  private resetOverlimit(): void {
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const text = this.numberTexts[r * BOARD_SIZE + c];
        if (text) text.setColor(TEXT_NORMAL);
      }
    }
  }

  // ---- 渲染 ----

  private drawFullBoard(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);

    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        g.fillStyle(this.getCellColor(this.board.getMark(r, c)));
        g.fillRect(c * CELL_SIZE, r * CELL_SIZE, CELL_SIZE, CELL_SIZE);
      }
    }

    g.lineStyle(1, COLORS.gridLine, 0.2);
    for (let i = 0; i <= BOARD_SIZE; i++) {
      const p = i * CELL_SIZE;
      g.lineBetween(p, 0, p, this.worldSize);
      g.lineBetween(0, p, this.worldSize, p);
    }

    this.drawRegionBorders(g);

    this.boardImage.clear();
    this.boardImage.draw(g);
    g.destroy();
  }

  private drawCell(row: number, col: number): void {
    const x = col * CELL_SIZE;
    const y = row * CELL_SIZE;
    const g = this.make.graphics({ x: 0, y: 0 }, false);

    g.fillStyle(this.getCellColor(this.board.getMark(row, col)));
    g.fillRect(0, 0, CELL_SIZE, CELL_SIZE);

    g.lineStyle(1, COLORS.gridLine, 0.2);
    g.strokeRect(0, 0, CELL_SIZE, CELL_SIZE);

    const cellData = this.boardData.getCell(row, col);
    if (!cellData) { g.destroy(); return; }

    const neighbors: Array<[number, number, number, number, number, number]> = [
      [row - 1, col, 0, 0, CELL_SIZE, 1],
      [row + 1, col, 0, CELL_SIZE - 1, CELL_SIZE, CELL_SIZE],
      [row, col - 1, 0, 0, 1, CELL_SIZE],
      [row, col + 1, CELL_SIZE - 1, 0, CELL_SIZE, CELL_SIZE],
    ];

    for (const [nr, nc, x1, y1, x2, y2] of neighbors) {
      const neighbor = this.boardData.getCell(nr, nc);
      if (!neighbor || neighbor.regionId !== cellData.regionId) {
        g.lineStyle(2, COLORS.regionBorder, 0.8);
        g.lineBetween(x1, y1, x2, y2);
      }
    }

    this.boardImage.draw(g, x, y);
    g.destroy();
  }

  private drawRegionBorders(g: Phaser.GameObjects.Graphics): void {
    g.lineStyle(2, COLORS.regionBorder, 0.8);

    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const cell = this.boardData.getCell(r, c);
        if (!cell) continue;

        const x = c * CELL_SIZE;
        const y = r * CELL_SIZE;

        const right = this.boardData.getCell(r, c + 1);
        if (right && right.regionId !== cell.regionId) {
          g.lineBetween(x + CELL_SIZE, y, x + CELL_SIZE, y + CELL_SIZE);
        }
        const below = this.boardData.getCell(r + 1, c);
        if (below && below.regionId !== cell.regionId) {
          g.lineBetween(x, y + CELL_SIZE, x + CELL_SIZE, y + CELL_SIZE);
        }
      }
    }
  }

  // ---- 数字 ----

  private createNumberTexts(): void {
    const fontSize = Math.floor(CELL_SIZE * 0.55);

    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const cell = this.boardData.getCell(r, c);
        if (!cell || !cell.visible) continue;

        const cx = c * CELL_SIZE + CELL_SIZE / 2;
        const cy = r * CELL_SIZE + CELL_SIZE / 2;

        const t = this.add.text(cx, cy, cell.number.toString(), {
          fontSize: `${fontSize}px`,
          color: TEXT_NORMAL,
          fontFamily: 'monospace',
        });
        t.setOrigin(0.5, 0.5);
        this.numberTexts[r * BOARD_SIZE + c] = t;
      }
    }
  }

  private destroyNumberTexts(): void {
    for (let i = 0; i < TOTAL_CELLS; i++) {
      const t = this.numberTexts[i];
      if (t) t.destroy();
      this.numberTexts[i] = null;
    }
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
      case CellMark.A: return COLORS.cellA;
      case CellMark.B: return COLORS.cellB;
      default: return COLORS.cellNone;
    }
  }
}
