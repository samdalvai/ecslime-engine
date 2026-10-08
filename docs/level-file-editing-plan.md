# Edit local level JSON files from the browser

## Summary

Yes, this is possible for the local workflow. In Chromium, the editor can ask the user to select `dist/assets/levels`, then read and write files in that folder with permission. It cannot silently access the folder or write to a hosted server's filesystem. The directory picker has limited browser support, but `localhost` qualifies as a secure context. [File System API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API), [directory picker](https://developer.mozilla.org/en-US/docs/Web/API/Window/showDirectoryPicker), [secure contexts](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Secure_Contexts)

The main alternatives are a small local server with a save endpoint for broader browser support, or a backend if a hosted editor must save shared levels. Browser storage alone would still leave the JSON files separate. [localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)

## Implementation

- Add **Connect levels folder**. List its valid `.json` files in the level picker and let the editor open them. Remember the folder handle in IndexedDB; request permission again when needed. [Chrome's file access guide](https://developer.chrome.com/docs/capabilities/web-apis/file-system-access)
- Keep the current local autosave as a draft. Restore an unsaved draft after reconnecting, and mark it as needing **Save to file**. Keep drafts tied to their folder and filename so connecting another folder cannot mix them.
- **Save to file** flushes pending edits and writes the selected JSON through its file handle. If the file changed on disk since it was opened, stop and offer an explicit reload or overwrite choice. A failed or canceled write leaves the draft intact. [Writable file streams](https://developer.mozilla.org/en-US/docs/Web/API/FileSystemFileHandle/createWritable)
- On the first file save of a new level, ask for a filename inside the connected folder. Reject an existing filename. Later saves use that filename; changing the level's display name does not rename its file. Keep local-only levels available, and leave deletion of file-backed files to the filesystem for this first version.
- Keep the existing JSON export as a fallback when folder access is unavailable.

## Verification

- Test folder loading, draft restoration, duplicate names and filenames, permission denial, canceled writes, and external file changes.
- In Chromium on `localhost`, open `grass.json`, edit it, click **Save to file**, and reload the game to confirm it fetches the updated file. The game currently loads `grass.json` during setup; adding another JSON file alone will not make the game select it.

## Assumptions

This is for local development in Chromium, with an explicit file save rather than automatic disk writes. `dist/assets/levels` remains the tracked level directory; no hosted save service is included. An HTTPS-hosted copy of the editor could use the same browser API to edit a folder on the user's own device, but it could not write to the hosting server's files.
