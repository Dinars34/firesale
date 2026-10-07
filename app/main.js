const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');

const windows = new Set();
const openFiles = new Map();



app.on('ready', () => {
    createWindow();
});

app.on('window-all-closed', () => {
    if (process.platform === 'darwin') {
        return false;
    } 
    app.quit();
});

app.on('will-finish-launching', () => {
    app.on('open-file', (event, file) => {
        event.preventDefault();
        const win = createWindow();
        win.once('ready-to-show', () => {
            openFile(win, file);
        });
    });
});

ipcMain.on('open-file-dialog', (event) => {
    const senderWebContents = event.sender;
    const targetWindow = BrowserWindow.fromWebContents(senderWebContents);
    getFileFromUser(targetWindow);
});

ipcMain.on('new-file-dialog', () => {
    createWindow();
});

ipcMain.on('file-edited-state', (event, isEdited, currentFilePath) => {

    const targetWindow = BrowserWindow.fromWebContents(event.sender);
    const fileName = currentFilePath ? path.basename(currentFilePath) : 'UnNamed File';    
    
    targetWindow.setTitle(`Fire Sale - ${fileName}${isEdited ? ' (edited)': ''}`);
    targetWindow.isEdited = isEdited; 
    targetWindow.setDocumentEdited(isEdited);
});

ipcMain.on('save-html', (event, content) => {
    const senderWebContents = event.sender;
    const targetWindow = BrowserWindow.fromWebContents(senderWebContents);
    saveHtml(targetWindow, content);
});

ipcMain.on('save-file', (event, currentPath, content) => {
    saveMarkdown(BrowserWindow.fromWebContents(event.sender), currentPath, content);
});

ipcMain.on('open-dragged-file', (event, draggedFile) => {
    openFile(BrowserWindow.fromWebContents(event.sender), draggedFile);
});

const createWindow = () => {
    let x, y;
    const currentWindow = BrowserWindow.getFocusedWindow();

    if (currentWindow) {
        const [ currentWindowX, currentWindowY ] = currentWindow.getPosition();
        x = currentWindowX + 10;
        y = currentWindowY + 10;
    }

    let newWindow = new BrowserWindow({
        x, y,
        show: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        }
    });

    newWindow.loadFile('app/index.html');

    newWindow.once('ready-to-show', () => {
        newWindow.show();
    });

    newWindow.on('close', async (event) => {
        if (newWindow.isDocumentEdited() || newWindow.isEdited) {
            event.preventDefault();

            const { response } = await dialog.showMessageBox(newWindow, {
                type: 'warning',
                title: 'Quit with Unsaved Changes?',
                message: 'Your change will be lost if you do not save',
                buttons: [
                    'Quit Anyway',
                    'Cancel',
                ],
                defaultId: 0,
                cancelId: 1,
            });



            if (response === 0) newWindow.destroy();
        }
        
    });

    newWindow.on('closed', () => {
        windows.delete(newWindow);
        stopWatchingFile(newWindow);
        newWindow = null;
    });

    windows.add(newWindow);
    return newWindow;
};

const getFileFromUser = async (targetWindow) => {
    const files = await dialog.showOpenDialog(targetWindow, { 
        properties: ['openFile'],
        filters: [
            { name: 'Markdown Files', extensions: ['md', 'markdown'] },
            { name: 'Text Files', extensions: ['txt'] }
        ]
    });

    if (files.canceled) return;

    openFile(targetWindow, files.filePaths[0]);
};

const openFile = (targetWindow, file) => {
    const content = fs.readFileSync(file).toString();
    const fileName = path.basename(file);

    targetWindow.setTitle(`Fire Sale - ${fileName}`);
    targetWindow.setRepresentedFilename(file);
    targetWindow.isEdited = false;
    targetWindow.setDocumentEdited(false);
    startWatchingFile(targetWindow, file);
    app.addRecentDocument(file);

    targetWindow.webContents.send('file-opened', file, content);
};

const saveHtml = async (targetWindow, content) => {
    const file = await dialog.showSaveDialog(targetWindow, {
        title: 'Save HTML',
        defaultPath: app.getPath('downloads'),
        filters: [
            { name: 'HTML Files', extensions: ['html', 'htm'] }
        ]
    });

    if (file.canceled) return;

    fs.writeFileSync(file.filePath, content);
};

const saveMarkdown = async (targetWindow, file, content) => {
    if (!file) {
        file = await dialog.showSaveDialog(targetWindow, {
            title: 'Save Markdown',
            defaultPath: app.getPath('downloads'),
            filters: [
                { name: 'Markdown Files', extensions: ['md', 'markdown'] }
            ]
        });

        if (file.canceled) return;

        file = file.filePath;
    }

    fs.writeFileSync(file, content);
    openFile(targetWindow, file);
};

const startWatchingFile = (targetWindow, filePath) => {
    stopWatchingFile(targetWindow);

    const watcher = fs.watch(filePath, (eventType) => {
        if (eventType === 'change') {
            try {
                const content = fs.readFileSync(filePath, 'utf-8');

                if (!targetWindow.isDestroyed()) {
                    targetWindow.webContents.send('file-changed', filePath, content);
                } 
            } catch (err) {
                console.error(`Failed to read changed file: ${err.message}`);
            }
        }
    })

    openFiles.set(targetWindow, watcher);
};

const stopWatchingFile = (targetWindow) => {
    if (openFiles.has(targetWindow)) {
        // what is the difference between get close and delete?
        openFiles.get(targetWindow).close();
        openFiles.delete(targetWindow);
    }
};