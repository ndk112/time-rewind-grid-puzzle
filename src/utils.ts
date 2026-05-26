import { Level, Position, Tile, TileType } from './types';

// Predefined color palette for buttons and doors
export const COLOR_MAP: Record<string, {
  name: string;
  theme: string;
  btnActive: string;
  btnInactive: string;
  doorOpen: string;
  doorClosed: string;
  glow: string;
  text: string;
  badge: string;
}> = {
  '1': {
    name: '绯红 (Red)',
    theme: '#f43f5e', // rose-500
    btnActive: 'bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.6)] translate-y-[2px]',
    btnInactive: 'bg-rose-950 border-2 border-rose-600 shadow-[0_4px_0_#9f1239] hover:bg-rose-900',
    doorOpen: 'border-rose-500/30 bg-rose-500/10 text-rose-400 after:bg-rose-500/20 shadow-[inset_0_0_8px_rgba(244,63,94,0.2)]',
    doorClosed: 'bg-gradient-to-b from-rose-900 to-rose-950 border-rose-500/80 text-rose-200 shadow-[0_0_10px_rgba(244,63,94,0.3)]',
    glow: 'rose',
    text: 'text-rose-400',
    badge: 'bg-rose-950 text-rose-300 border-rose-800'
  },
  '2': {
    name: '蔚蓝 (Blue)',
    theme: '#0ea5e9', // sky-500
    btnActive: 'bg-sky-500 shadow-[0_0_15px_rgba(14,165,233,0.6)] translate-y-[2px]',
    btnInactive: 'bg-sky-950 border-2 border-sky-600 shadow-[0_4px_0_#0369a1] hover:bg-sky-900',
    doorOpen: 'border-sky-500/30 bg-sky-500/10 text-sky-400 after:bg-sky-500/20 shadow-[inset_0_0_8px_rgba(14,165,233,0.2)]',
    doorClosed: 'bg-gradient-to-b from-sky-900 to-sky-950 border-sky-500/80 text-sky-200 shadow-[0_0_10px_rgba(14,165,233,0.3)]',
    glow: 'sky',
    text: 'text-sky-400',
    badge: 'bg-sky-950 text-sky-300 border-sky-800'
  },
  '3': {
    name: '琥珀 (Orange)',
    theme: '#f97316',
    btnActive: 'bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.6)] translate-y-[2px]',
    btnInactive: 'bg-orange-950 border-2 border-orange-600 shadow-[0_4px_0_#9a3412] hover:bg-orange-900',
    doorOpen: 'border-orange-500/30 bg-orange-500/10 text-orange-400 after:bg-orange-500/20 shadow-[inset_0_0_8px_rgba(249,115,22,0.2)]',
    doorClosed: 'bg-gradient-to-b from-orange-900 to-orange-950 border-orange-500/80 text-orange-200 shadow-[0_0_10px_rgba(249,115,22,0.3)]',
    glow: 'orange',
    text: 'text-orange-400',
    badge: 'bg-orange-950 text-orange-300 border-orange-850'
  },
  '4': {
    name: '翠绿 (Green)',
    theme: '#22c55e',
    btnActive: 'bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.6)] translate-y-[2px]',
    btnInactive: 'bg-green-950 border-2 border-green-600 shadow-[0_4px_0_#166534] hover:bg-green-900',
    doorOpen: 'border-green-500/30 bg-green-500/10 text-green-400 after:bg-green-500/20 shadow-[inset_0_0_8px_rgba(34,197,94,0.2)]',
    doorClosed: 'bg-gradient-to-b from-green-900 to-green-950 border-green-500/80 text-green-200 shadow-[0_0_10px_rgba(34,197,94,0.3)]',
    glow: 'green',
    text: 'text-green-400',
    badge: 'bg-green-950 text-green-300 border-green-800'
  },
  '5': {
    name: '紫罗兰 (Purple)',
    theme: '#a855f7',
    btnActive: 'bg-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.6)] translate-y-[2px]',
    btnInactive: 'bg-purple-950 border-2 border-purple-600 shadow-[0_4px_0_#6b21a8] hover:bg-purple-900',
    doorOpen: 'border-purple-500/30 bg-purple-500/10 text-purple-400 after:bg-purple-500/20 shadow-[inset_0_0_8px_rgba(168,85,247,0.2)]',
    doorClosed: 'bg-gradient-to-b from-purple-900 to-purple-950 border-purple-500/80 text-purple-200 shadow-[0_0_10px_rgba(168,85,247,0.3)]',
    glow: 'purple',
    text: 'text-purple-400',
    badge: 'bg-purple-950 text-purple-300 border-purple-850'
  }
};

// Default styling fallback for other color triggers
export const DEFAULT_COLOR = {
  name: '虚空',
  theme: '#a855f7',
  btnActive: 'bg-purple-500 translate-y-[2px]',
  btnInactive: 'bg-purple-950 border-2 border-purple-600',
  doorOpen: 'border-purple-500/20 bg-purple-500/5 text-purple-400',
  doorClosed: 'bg-purple-900 border-purple-500 text-purple-200',
  glow: 'purple',
  text: 'text-purple-400',
  badge: 'bg-purple-950 text-purple-300 border-purple-800'
};

export function getColorConfig(id: string | undefined) {
  if (!id) return DEFAULT_COLOR;
  return COLOR_MAP[id] || DEFAULT_COLOR;
}

/**
 * Parses grid cell code (e.g. "B1", "D2", "#", "S" or "E") into static Tile properties.
 */
export function parseGridCell(cell: string): Tile {
  if (cell === '#') {
    return { type: 'wall' };
  } else if (cell === 'S') {
    return { type: 'start' };
  } else if (cell === 'E' || cell === '~') {
    return { type: 'exit' };
  } else if (cell.startsWith('B')) {
    const id = cell.substring(1);
    return { type: 'button', id };
  } else if (cell.startsWith('D')) {
    const id = cell.substring(1);
    return { type: 'door', id, defaultOpen: false };
  } else if (cell === '?') {
    return { type: 'teleport' };
  } else if (cell.startsWith('O')) {
    const id = cell.substring(1);
    return { type: 'door', id, defaultOpen: true };
  } else {
    return { type: 'empty' };
  }
}

/**
 * Find coordinates for specific tile codes (like Start 'S' and Exit 'E')
 */
export function findPosition(grid: string[][], target: string): Position | null {
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (grid[r][c] === target) {
        return { row: r, col: c };
      }
    }
  }
  return null;
}

/**
 * Find all teleport positions in the grid.
 */
export function findTeleportPositions(grid: string[][]): Position[] {
  const positions: Position[] = [];
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (grid[r][c] === '?') {
        positions.push({ row: r, col: c });
      }
    }
  }
  return positions;
}

/**
 * Checks if two positions are equal.
 */
export function equalPositions(p1: Position, p2: Position): boolean {
  return p1.row === p2.row && p1.col === p2.col;
}

// 地图码编解码：每个格子映射为单个字符
const ENCODE_MAP: Record<string, string> = {
  '#': '0', '.': '1', 'S': '2', '~': '3', '?': '4',
  'B1': '5', 'B2': '6', 'B3': '7', 'B4': '8', 'B5': '9',
  'B6': 'a', 'B7': 'b', 'B8': 'c', 'B9': 'd',
  'D1': 'e', 'D2': 'f', 'D3': 'g', 'D4': 'h', 'D5': 'i',
  'D6': 'j', 'D7': 'k', 'D8': 'l', 'D9': 'm',
  'O1': 'n', 'O2': 'o', 'O3': 'p', 'O4': 'q', 'O5': 'r',
  'O6': 's', 'O7': 't', 'O8': 'u', 'O9': 'v',
};
const DECODE_MAP: Record<string, string> = {};
for (const [k, v] of Object.entries(ENCODE_MAP)) {
  DECODE_MAP[v] = k;
}

export function encodeMap(grid: string[][]): string {
  return grid.map(row => row.map(c => ENCODE_MAP[c] || '1').join('')).join('x');
}

export function decodeMap(code: string): string[][] | null {
  try {
    const rows = code.split('x');
    if (rows.length < 2) return null;
    return rows.map(row => row.split('').map(c => DECODE_MAP[c] || '.'));
  } catch {
    return null;
  }
}
