const { app, BrowserWindow } = require('electron');

let mainWindow = null;

app.on('ready', () => {
    // make instance of Browser Window
    // begin by hiding the window when it's first created
    mainWindow = new BrowserWindow({
        show: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        }
    });

    mainWindow.loadFile('app/index.html');

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
});