const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('kdbxAPI', {
    getDefaultPath: () => ipcRenderer.invoke('kdbx:getDefaultPath'),
    selectFile: (options) => ipcRenderer.invoke('kdbx:selectFile', options),
    selectSavePath: (options) => ipcRenderer.invoke('kdbx:selectSavePath', options),
    unlockDatabase: (filePath, password, keyFilePath) => ipcRenderer.invoke('kdbx:unlock', { filePath, password, keyFilePath }),
    createDatabase: (filePath, name, password, keyFilePath) => ipcRenderer.invoke('kdbx:create', { filePath, name, password, keyFilePath }),
    saveDatabase: () => ipcRenderer.invoke('kdbx:save'),
    closeDatabase: () => ipcRenderer.invoke('kdbx:close'),
    addEntry: (entryData) => ipcRenderer.invoke('kdbx:addEntry', entryData),
    updateEntry: (id, entryData) => ipcRenderer.invoke('kdbx:updateEntry', { id, entryData }),
    deleteEntry: (id) => ipcRenderer.invoke('kdbx:deleteEntry', id),
    addGroup: (parentId, name) => ipcRenderer.invoke('kdbx:addGroup', { parentId, name }),
    deleteGroup: (id) => ipcRenderer.invoke('kdbx:deleteGroup', id),
    copyToClipboard: (text, isSensitive = false) => ipcRenderer.invoke('clipboard:write', { text, isSensitive }),
    openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url)
});
