const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const fs = require('fs');
const windows = new Set();

const createWindow = () => {
    let x, y;

    const currentWindow = BrowserWindow.getFocusedWindow();

    if (currentWindow) {
        const [ currentWindowX, currentWindowY ] = currentWindow.getPosition();
        x = currentWindowX + 10;
        y = currentWindowY + 10;
    }

    // make instance of Browser Window
    // begin by hiding the window when it's first created
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

    newWindow.on('closed', () => {
        windows.delete(newWindow);
        newWindow = null;
    });

    windows.add(newWindow);
    return newWindow;
};

app.on('ready', () => {
    createWindow();
});

app.on('window-all-closed', () => {
    if (process.platform == 'darwin') {
        return false;
    } 

    app.quit();
});

ipcMain.on('open-file-dialog', (event) => {
    const senderWebContents = event.sender;
    const targetWindow = BrowserWindow.fromWebContents(senderWebContents);
    getFileFromUser(targetWindow);
});

ipcMain.on('new-file-dialog', () => {
    createWindow();
});

const getFileFromUser = async (targetWindow) => {
    // showOpenDialog return the file name we selected
    const files = await dialog.showOpenDialog(targetWindow ,{ 
        properties: ['openFile'],
        filters: [
            {name: 'Text Files', extensions: ['txt']},
            {name: 'Makrdown Files', extensions: ['md', 'markdown']}
        ]
    });

    if (files.canceled) {return;}

    openFile(targetWindow, files.filePaths[0]);
};

const openFile = (targetWindow, file) => {
    const content = fs.readFileSync(file).toString();
    targetWindow.webContents.send('file-opened', file, content);
}