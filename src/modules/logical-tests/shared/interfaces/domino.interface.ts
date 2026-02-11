/**
 * Interfaces for domino question data structures.
 */

/** A single domino tile in a layout. */
export interface DominoTile {
  id: number;
  topValue: number | null;
  bottomValue: number | null;
  x: number;
  y: number;
  isEditable: boolean;
  isHidden?: boolean;
}

/** Arrow/visual guide between domino tiles. */
export interface DominoArrow {
  fromId: number;
  toId: number;
  direction?: string;
}

/** Layout configuration for a domino question. */
export interface DominoLayout {
  rows?: number;
  cols?: number;
  [key: string]: unknown;
}

/** Candidate's answer for a domino question. */
export interface DominoAnswer {
  topValue: number;
  bottomValue: number;
}
