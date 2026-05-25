/** 格子标记状态 */
export const CellMark = {
  None: 0,
  A: 1,
  B: 2,
} as const;

export type CellMark = (typeof CellMark)[keyof typeof CellMark];

/** 棋盘尺寸 */
export const BOARD_SIZE = 100;

/**
 * 棋盘状态管理
 * 使用一维数组存储，索引 = row * BOARD_SIZE + col
 */
export class BoardState {
  readonly size: number;
  readonly cells: CellMark[];

  constructor(size: number = BOARD_SIZE) {
    this.size = size;
    this.cells = new Array<CellMark>(size * size).fill(CellMark.None);
  }

  /** 获取指定位置的标记状态 */
  getMark(row: number, col: number): CellMark {
    if (!this.inBounds(row, col)) return CellMark.None;
    return this.cells[row * this.size + col];
  }

  /** 设置指定位置的标记状态 */
  setMark(row: number, col: number, mark: CellMark): void {
    if (!this.inBounds(row, col)) return;
    this.cells[row * this.size + col] = mark;
  }

  /**
   * 左键操作：None -> A -> None（循环）
   * 如果当前是 B，则变为 A
   */
  markLeft(row: number, col: number): CellMark {
    const current = this.getMark(row, col);
    const next =
      current === CellMark.None
        ? CellMark.A
        : current === CellMark.A
          ? CellMark.None
          : CellMark.A;
    this.setMark(row, col, next);
    return next;
  }

  /**
   * 右键操作：None -> B -> None（循环）
   * 如果当前是 A，则变为 B
   */
  markRight(row: number, col: number): CellMark {
    const current = this.getMark(row, col);
    const next =
      current === CellMark.None
        ? CellMark.B
        : current === CellMark.B
          ? CellMark.None
          : CellMark.B;
    this.setMark(row, col, next);
    return next;
  }

  /** 重置整个棋盘 */
  reset(): void {
    this.cells.fill(CellMark.None);
  }

  inBounds(row: number, col: number): boolean {
    return row >= 0 && row < this.size && col >= 0 && col < this.size;
  }
}
