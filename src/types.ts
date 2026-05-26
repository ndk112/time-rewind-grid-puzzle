export interface Position {
  row: number;
  col: number;
}

export type TileType = 'empty' | 'wall' | 'start' | 'exit' | 'button' | 'door' | 'teleport';

export interface Tile {
  type: TileType;
  id?: string; // e.g. "1", "2" to link buttons & doors
  color?: string; // Hex or Tailwind color name
  defaultOpen?: boolean; // True if the door is open by default and closes when active
}

export interface Level {
  id: number;
  name: string;
  description: string;
  grid: string[][]; // Visual grid setup e.g. '#'=wall, '.'=empty, 'S'=start, 'E'=exit, 'B1'=button 1, 'D1'=door 1
  parSteps?: number;
  hint?: string;
}

export interface Shadow {
  id: string; // Unique identifier for the clone
  path: Position[]; // Path array of positions visited in that run
  color: string; // Specific CSS grid shadow color (e.g., cyan, purple, lime)
  currentIndex: number; // Current play step
}
