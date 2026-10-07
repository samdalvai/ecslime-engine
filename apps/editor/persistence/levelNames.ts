import { LevelMap } from 'ecslime-engine';

import { getAllLevelKeysFromLocalStorage } from './persistence';

export const getLevelName = (levelId: string, level: LevelMap): string => {
    return typeof level.name === 'string' && level.name.trim() ? level.name.trim() : levelId;
};

const nameKey = (name: string) => name.trim().toLowerCase();

const storedLevels = (): { id: string; level: LevelMap }[] =>
    getAllLevelKeysFromLocalStorage().map(id => ({
        id,
        level: JSON.parse(localStorage.getItem(id) as string) as LevelMap,
    }));

export const isLevelNameTaken = (name: string, exceptLevelId?: string): boolean =>
    storedLevels().some(({ id, level }) => id !== exceptLevelId && nameKey(getLevelName(id, level)) === nameKey(name));

const availableName = (base: string, isTaken: (name: string) => boolean): string => {
    if (!isTaken(base)) return base;
    let suffix = 2;
    while (isTaken(`${base} (${suffix})`)) suffix++;
    return `${base} (${suffix})`;
};

// A blank request uses the stable storage ID; an explicit duplicate is rejected.
export const resolveLevelName = (levelId: string, requestedName: string | undefined, exceptLevelId?: string): string | null => {
    const name = requestedName?.trim();
    if (name) return isLevelNameTaken(name, exceptLevelId) ? null : name;
    return availableName(levelId, candidate => isLevelNameTaken(candidate, exceptLevelId));
};

