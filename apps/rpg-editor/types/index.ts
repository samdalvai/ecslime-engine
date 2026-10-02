import * as GameSystems from '../../rpg-game/systems';

export type EditorSettings = {
    activeSystems: Record<keyof typeof GameSystems, boolean>;
    snapToGrid: boolean;
    showGrid: boolean;
    gridSquareSide: number;
    selectedLevel: string | null;
};
