import { AssetStore, Entity, LevelMap, Registry, serializeEntities, serializeLevel } from 'ecslime-engine';

import { levelStorageKey } from './persistence';

export const serializeStoredLevel = (levelId: string, registry: Registry, assetStore: AssetStore): LevelMap => {
    registry.update();
    const storedLevel = loadLevelFromLocalStorage(levelId);
    if (!storedLevel) throw new Error('Could not read level from local storage');
    return { ...serializeLevel(registry, assetStore), id: storedLevel.id, name: storedLevel.name };
};

export const saveLevelToJson = (levelId: string, registry: Registry, assetStore: AssetStore): void => {
    const level = serializeStoredLevel(levelId, registry, assetStore);
    const jsonString = JSON.stringify(level, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${level.name.replace(/\s+/g, '-')}.json`;
    a.click();

    URL.revokeObjectURL(url);

    console.log('Level snapshot saved to json');
};

export const saveEntitiesToJson = (entities: Entity[]): void => {
    entities[0]?.registry.update();
    const jsonString = JSON.stringify(serializeEntities(entities), null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'entities.json';
    a.click();

    URL.revokeObjectURL(url);

    console.log('Entity snapshot saved to json');
};

export const saveCurrentLevelToLocalStorage = (levelId: string | null, registry: Registry, assetStore: AssetStore) => {
    if (!levelId) {
        throw new Error('Could not determine currently selected level');
    }

    const currentLevelMap = serializeStoredLevel(levelId, registry, assetStore);
    saveLevelToLocalStorage(currentLevelMap);
    return currentLevelMap;
};

export const saveLevelToLocalStorage = (levelMap: LevelMap) => {
    const jsonString = JSON.stringify(levelMap, null, 2);
    localStorage.setItem(levelStorageKey(levelMap.id), jsonString);
    console.log('Level snapshot saved to local storage');
};

export const loadLevelFromLocalStorage = (levelId: string): LevelMap | undefined => {
    const jsonString = localStorage.getItem(levelStorageKey(levelId));
    return jsonString ? (JSON.parse(jsonString) as LevelMap) : undefined;
};
