const { app, BrowserWindow, globalShortcut, ipcMain, screen } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    frame: false, // Frameless for custom UI
    transparent: true,
    alwaysOnTop: true, // Float above other windows
    skipTaskbar: true, // Hide from taskbar
    show: false, // Don't show until ready and protected
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs')
    }
  });

  // 🔥 ULTIMATE STEALTH MODE 🔥
  // Invisible to OBS, Zoom, Teams, Snipping Tool, Screen Sharing
  mainWindow.setContentProtection(true);
  
  // Windows 11 Fix: Re-apply protection when window is ready and shown
  mainWindow.once('ready-to-show', () => {
    // Set a higher level for alwaysOnTop to stay above everything
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
    mainWindow.setContentProtection(true);
    mainWindow.show();
  });

  // Hide from Alt-Tab and Task View
  mainWindow.setExcludeFromShowAllTabs(true);

  // Check if running in dev mode
  const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';

  if (isDev || process.argv.includes('--dev')) {
    // In dev, load the Vite dev server
    // Try port 3000 first (AI Studio default), fallback to 5173 (Vite local default)
    mainWindow.loadURL('http://localhost:3000').catch(() => {
      mainWindow.loadURL('http://localhost:5173');
    });
  } else {
    // In production, load the built index.html
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  // 📺 PiP Mode Global Shortcut (Ctrl+Shift+P)
  globalShortcut.register('CommandOrControl+Shift+P', () => {
     if (mainWindow.isVisible()) {
       mainWindow.hide();
     } else {
       mainWindow.show();
     }
  });

  // 📺 Boss Key Global Shortcut (Alt+Space)
  globalShortcut.register('Alt+Space', () => {
     if (mainWindow.isVisible()) {
       mainWindow.hide();
     } else {
       mainWindow.show();
     }
  });

  // 📺 Boss Key Global Shortcut (Ctrl+Shift+H)
  globalShortcut.register('CommandOrControl+Shift+H', () => {
     if (mainWindow.isVisible()) {
       mainWindow.hide();
     } else {
       mainWindow.show();
     }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC Listeners for Window Controls
ipcMain.on('close-app', () => {
  app.quit();
});

ipcMain.on('minimize-app', () => {
  mainWindow.minimize();
});

ipcMain.on('maximize-app', () => {
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});

ipcMain.on('set-ignore-mouse-events', (event, ignore) => {
  mainWindow.setIgnoreMouseEvents(ignore);
});
