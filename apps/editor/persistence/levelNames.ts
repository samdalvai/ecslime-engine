import { loadLevelFromLocalStorage } from './levelPersistence';
import { getAllLevelIdsFromLocalStorage } from './persistence';

export const isLevelNameTaken = (name: string, exceptLevelId?: string): boolean =>
    getAllLevelIdsFromLocalStorage().some(id => {
        if (id === exceptLevelId) return false;
        const level = loadLevelFromLocalStorage(id);
        return level?.name.trim().toLowerCase() === name.trim().toLowerCase();
    });

export const resolveLevelName = (requestedName: string, exceptLevelId?: string): string | null => {
    const name = requestedName.trim();
    return name && !isLevelNameTaken(name, exceptLevelId) ? name : null;
};
