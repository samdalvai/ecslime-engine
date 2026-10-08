import Editor from '../Editor';
import { EditorSettings } from '../types';

const EDITOR_SETTINGS_KEY = 'editor-settings';
const LEVEL_KEY_PREFIX = 'level:';

export const levelStorageKey = (levelId: string) => `${LEVEL_KEY_PREFIX}${levelId}`;

export const saveEditorSettingsToLocalStorage = () => {
    const settings: EditorSettings = Editor.editorSettings;
    const jsonString = JSON.stringify(settings, null, 2);
    localStorage.setItem(EDITOR_SETTINGS_KEY, jsonString);
};

export const loadEditorSettingsFromLocalStorage = (): EditorSettings | undefined => {
    const jsonString = localStorage.getItem(EDITOR_SETTINGS_KEY) as any;
    return jsonString ? (JSON.parse(jsonString) as EditorSettings) : undefined;
};

export const deleteLevelFromLocalStorage = (levelId: string) => {
    localStorage.removeItem(levelStorageKey(levelId));
};

export const getAllLevelIdsFromLocalStorage = (): string[] => {
    const levelIds: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(LEVEL_KEY_PREFIX)) levelIds.push(key.slice(LEVEL_KEY_PREFIX.length));
    }
    return levelIds;
};
