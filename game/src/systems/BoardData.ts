/** 格子真实类型 */
export type CellType = 'a' | 'b';

/** 生成棋盘时每个格子的完整数据 */
export interface CellData {
  /** 真实类型 */
  type: CellType;
  /** 所属区域编号 */
  regionId: number;
  /** 计算出的数字：九宫格范围内同区域 a 类型格子的数量（包含自身） */
  number: number;
  /** 同区域内九宫格的邻居数 + 1（2 ≤ m ≤ 9） */
  m: number;
  /** 数字是否可见 */
  visible: boolean;
}

/**
 * 棋盘生成数据
 * 包含区域划分、类型分配、数字计算结果
 */
export class BoardData {
  readonly size: number;
  readonly regionCount: number;
  readonly cells: CellData[];

  constructor(size: number, regionCount: number, cells: CellData[]) {
    this.size = size;
    this.regionCount = regionCount;
    this.cells = cells;
  }

  getCell(row: number, col: number): CellData | null {
    if (!this.inBounds(row, col)) return null;
    return this.cells[row * this.size + col];
  }

  /** 获取指定格子的九宫格邻居坐标（包含自身，只取同区域的） */
  getSameRegionNeighbors(row: number, col: number): Array<{ row: number; col: number }> {
    const cell = this.getCell(row, col);
    if (!cell) return [];

    const result: Array<{ row: number; col: number }> = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const nr = row + dr;
        const nc = col + dc;
        const neighbor = this.getCell(nr, nc);
        if (neighbor && neighbor.regionId === cell.regionId) {
          result.push({ row: nr, col: nc });
        }
      }
    }
    return result;
  }

  /** 获取每个区域的格子坐标列表 */
  getRegionCells(regionId: number): Array<{ row: number; col: number }> {
    const result: Array<{ row: number; col: number }> = [];
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (this.cells[r * this.size + c].regionId === regionId) {
          result.push({ row: r, col: c });
        }
      }
    }
    return result;
  }

  inBounds(row: number, col: number): boolean {
    return row >= 0 && row < this.size && col >= 0 && col < this.size;
  }
}
