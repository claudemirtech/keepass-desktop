const { app, BrowserWindow, ipcMain, dialog, clipboard, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const kdbxService = require('./kdbx-service');

app.name = 'keepass';

let mainWindow = null;
let clipboardClearTimer = null;

const iconPath = path.join(__dirname, 'assets', 'icon.png');

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1100,
        height: 750,
        minWidth: 850,
        minHeight: 550,
        title: 'KeePass Manager',
        icon: iconPath,
        backgroundColor: '#0f172a',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false
        }
    });

    mainWindow.loadFile('index.html');
}

// Setup IPC Handlers
function setupIpc() {
    // Return default database file if it exists in current working directory
    ipcMain.handle('kdbx:getDefaultPath', () => {
        const defaultPath = path.join(__dirname, 'Database.kdbx');
        if (fs.existsSync(defaultPath)) {
            return defaultPath;
        }
        return '';
    });

    // Native open file dialog
    ipcMain.handle('kdbx:selectFile', async (event, options = {}) => {
        const isKeyFile = options.isKeyFile || false;
        const result = await dialog.showOpenDialog(mainWindow, {
            title: isKeyFile ? 'Selecionar Arquivo Chave (Key File)' : 'Selecionar Base de Dados KeePass',
            filters: isKeyFile
                ? [{ name: 'Todos os Arquivos', extensions: ['*'] }, { name: 'Key Files', extensions: ['key', 'bin'] }]
                : [{ name: 'KeePass Databases (*.kdbx)', extensions: ['kdbx'] }, { name: 'Todos os Arquivos', extensions: ['*'] }],
            properties: ['openFile']
        });

        if (result.canceled || !result.filePaths.length) {
            return null;
        }
        return result.filePaths[0];
    });

    // Native save file dialog
    ipcMain.handle('kdbx:selectSavePath', async (event, options = {}) => {
        const baseDir = app.isPackaged ? app.getPath('documents') : __dirname;
        const result = await dialog.showSaveDialog(mainWindow, {
            title: 'Salvar Novo Banco KeePass',
            defaultPath: path.join(baseDir, options.defaultName || 'Database.kdbx'),
            filters: [
                { name: 'KeePass Database (*.kdbx)', extensions: ['kdbx'] }
            ]
        });

        if (result.canceled || !result.filePath) {
            return null;
        }
        return result.filePath;
    });

    // Unlock database
    ipcMain.handle('kdbx:unlock', async (event, { filePath, password, keyFilePath }) => {
        try {
            const data = await kdbxService.openDatabase(filePath, password, keyFilePath);
            return { success: true, data };
        } catch (err) {
            return { success: false, error: err.message };
        }
    });

    // Create database
    ipcMain.handle('kdbx:create', async (event, { filePath, name, password, keyFilePath }) => {
        try {
            const data = await kdbxService.createDatabase(filePath, name, password, keyFilePath);
            return { success: true, data };
        } catch (err) {
            return { success: false, error: err.message };
        }
    });

    // Save database
    ipcMain.handle('kdbx:save', async () => {
        try {
            const res = await kdbxService.saveDatabase();
            return { success: true, res };
        } catch (err) {
            return { success: false, error: err.message };
        }
    });

    // Close / Lock database
    ipcMain.handle('kdbx:close', async () => {
        kdbxService.closeDatabase();
        return { success: true };
    });

    // Entries CRUD
    ipcMain.handle('kdbx:addEntry', async (event, entryData) => {
        try {
            const data = kdbxService.addEntry(entryData);
            return { success: true, data };
        } catch (err) {
            return { success: false, error: err.message };
        }
    });

    ipcMain.handle('kdbx:updateEntry', async (event, { id, entryData }) => {
        try {
            const data = kdbxService.updateEntry(id, entryData);
            return { success: true, data };
        } catch (err) {
            return { success: false, error: err.message };
        }
    });

    ipcMain.handle('kdbx:deleteEntry', async (event, id) => {
        try {
            const data = kdbxService.deleteEntry(id);
            return { success: true, data };
        } catch (err) {
            return { success: false, error: err.message };
        }
    });

    // Groups
    ipcMain.handle('kdbx:addGroup', async (event, { parentId, name }) => {
        try {
            const data = kdbxService.addGroup(parentId, name);
            return { success: true, data };
        } catch (err) {
            return { success: false, error: err.message };
        }
    });

    ipcMain.handle('kdbx:deleteGroup', async (event, id) => {
        try {
            const data = kdbxService.deleteGroup(id);
            return { success: true, data };
        } catch (err) {
            return { success: false, error: err.message };
        }
    });

    // Clipboard handling
    ipcMain.handle('clipboard:write', (event, { text, isSensitive }) => {
        if (!text) return false;
        clipboard.writeText(text);

        if (isSensitive) {
            if (clipboardClearTimer) {
                clearTimeout(clipboardClearTimer);
            }
            // Auto clear clipboard after 30 seconds for security
            clipboardClearTimer = setTimeout(() => {
                if (clipboard.readText() === text) {
                    clipboard.clear();
                }
            }, 30000);
        }
        return true;
    });

    // Shell open external URL
    ipcMain.handle('shell:openExternal', (event, url) => {
        if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
            shell.openExternal(url);
            return true;
        }
        return false;
    });
}

app.whenReady().then(() => {
    setupIpc();
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
