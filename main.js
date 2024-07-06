const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const EPub = require('epub');
const fs = require('fs').promises;

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile('src/index.html');
  mainWindow.webContents.openDevTools();
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.handle('open-file', async () => {
    console.log('Open file request received');
    const { filePaths } = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'ePub', extensions: ['epub'] }]
    });
    
    if (filePaths.length > 0) {
      const filePath = filePaths[0];
      console.log('Selected file:', filePath);
      const epub = new EPub(filePath);
      return new Promise((resolve, reject) => {
        epub.parse();
        epub.on('end', () => {
          resolve({
            filePath: filePath,
            title: epub.metadata.title,
            author: epub.metadata.creator,
            content: epub.flow.map(chapter => ({
              id: chapter.id,
              href: chapter.href
            })),
            images: epub.images
          });
        });
        epub.on('error', reject);
      });
    }
    return null;
  });
  
  ipcMain.handle('get-chapter', async (event, filePath, chapterId) => {
    console.log('Get chapter request received', filePath, chapterId);
    if (!filePath) {
      throw new Error('File path is not provided');
    }
    const epub = new EPub(filePath);
    return new Promise((resolve, reject) => {
      epub.parse();
      epub.on('end', () => {
        epub.getChapter(chapterId, (error, text) => {
          if (error) {
            reject(error);
          } else {
            resolve(text);
          }
        });
      });
      epub.on('error', reject);
    });
  });
  
  ipcMain.handle('get-image', async (event, filePath, imageId) => {
    console.log('Get image request received', filePath, imageId);
    if (!filePath) {
      throw new Error('File path is not provided');
    }
    const epub = new EPub(filePath);
    return new Promise((resolve, reject) => {
      epub.parse();
      epub.on('end', () => {
        epub.getImage(imageId, (error, data, mimeType) => {
          if (error) {
            reject(error);
          } else {
            resolve({ data: data.toString('base64'), mimeType });
          }
        });
      });
      epub.on('error', reject);
    });
  });