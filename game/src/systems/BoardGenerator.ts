import { BoardData } from './BoardData';
import type { CellData, CellType } from './BoardData';

/** 棋盘生成参数 */
export interface BoardGenOptions {
  size: number;
  regionCount: number;
  /** 初始数字可见比例 (0~1) */
  visibleRatio: number;
  /** a 类型占比 (0~1)，默认 0.5 */
  typeARatio: number;
}

/**
 * 棋盘生成器
 * 使用 Voronoi 算法划分区域，随机分配格子类型，计算数字
 */
export function generateBoard(options: BoardGenOptions): BoardData {
  const { size, regionCount, visibleRatio, typeARatio = 0.5 } = options;

  // 1. 生成区域种子点（避免太靠近边界和彼此）
  const seeds = generateSeeds(size, regionCount);

  // 2. Voronoi 分区：每个格子归属最近的种子点
  const regionIds = voronoiAssign(size, seeds);

  // 3. 随机分配 a/b 类型
  const types = assignTypes(size, typeARatio);

  // 4. 计算每个格子的数字
  const cells: CellData[] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const idx = r * size + c;
      const { m, countA } = countSameRegionNeighbors(r, c, size, regionIds, types);
      cells[idx] = {
        type: types[idx],
        regionId: regionIds[idx],
        number: countA,
        m,
        visible: false,
      };
    }
  }

  // 5. 随机设置部分数字可见
  setInitialVisibility(cells, size, visibleRatio);

  return new BoardData(size, regionCount, cells);
}

/** 生成区域种子点 */
function generateSeeds(size: number, count: number): Array<{ row: number; col: number }> {
  const margin = Math.floor(size * 0.12);
  const seeds: Array<{ row: number; col: number }> = [];
  const minDist = size / (count + 1) * 0.8;

  for (let i = 0; i < count; i++) {
    let bestSeed: { row: number; col: number } | null = null;
    let bestMinDist = 0;
    // 多次尝试取离已有种子最远的位置
    for (let attempt = 0; attempt < 30; attempt++) {
      const row = margin + Math.floor(Math.random() * (size - margin * 2));
      const col = margin + Math.floor(Math.random() * (size - margin * 2));
      let closest = Infinity;
      for (const s of seeds) {
        const d = dist(row, col, s.row, s.col);
        if (d < closest) closest = d;
      }
      if (closest > bestMinDist) {
        bestMinDist = closest;
        bestSeed = { row, col };
      }
      // 如果已经足够远就接受
      if (closest >= minDist) break;
    }
    seeds.push(bestSeed!);
  }
  return seeds;
}

/** 将每个格子分配给最近的种子点（Voronoi） */
function voronoiAssign(size: number, seeds: Array<{ row: number; col: number }>): number[] {
  const result = new Array<number>(size * size);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      let closest = 0;
      let minDist = Infinity;
      for (let i = 0; i < seeds.length; i++) {
        const d = dist(r, c, seeds[i].row, seeds[i].col);
        if (d < minDist) {
          minDist = d;
          closest = i;
        }
      }
      result[r * size + c] = closest;
    }
  }
  return result;
}

/** 随机分配 a/b 类型 */
function assignTypes(size: number, typeARatio: number): CellType[] {
  const total = size * size;
  const countA = Math.floor(total * typeARatio);
  // 生成确定数量的 a，打乱
  const types: CellType[] = new Array(total);
  for (let i = 0; i < total; i++) {
    types[i] = i < countA ? 'a' : 'b';
  }
  // Fisher-Yates 洗牌
  for (let i = total - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [types[i], types[j]] = [types[j], types[i]];
  }
  return types;
}

/** 统计某个格子九宫格内同区域的 a 类型数量 */
function countSameRegionNeighbors(
  row: number,
  col: number,
  size: number,
  regionIds: number[],
  types: CellType[],
): { m: number; countA: number } {
  const centerRegion = regionIds[row * size + col];
  let m = 0;
  let countA = 0;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const nr = row + dr;
      const nc = col + dc;
      if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
      if (regionIds[nr * size + nc] !== centerRegion) continue;
      m++;
      if (types[nr * size + nc] === 'a') countA++;
    }
  }
  return { m, countA };
}

/** 随机设置指定比例的数字为可见 */
function setInitialVisibility(cells: CellData[], size: number, ratio: number): void {
  const total = size * size;
  const visibleCount = Math.floor(total * ratio);
  // 随机选格子设为可见
  const indices = Array.from({ length: total }, (_, i) => i);
  for (let i = total - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  for (let i = 0; i < visibleCount; i++) {
    cells[indices[i]].visible = true;
  }
}

function dist(r1: number, c1: number, r2: number, c2: number): number {
  return Math.hypot(r2 - r1, c2 - c1);
}
