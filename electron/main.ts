import { app, BrowserWindow, globalShortcut, clipboard, screen, ipcMain } from 'electron';
import * as path from 'path';
import * as url from 'url';

// Development vs Production flag
const isDev = process.env.NODE_ENV !== 'production';
const PORT = 3000;

// Custom BrowserWindow with additional properties
interface CustomBrowserWindow extends BrowserWindow {
  creationTime?: number;
  isContentLoaded?: boolean;
}

let mainWindow: CustomBrowserWindow | null = null;
// Default window sizes
const COLLAPSED_HEIGHT = 80; // Height when just showing status
const EXPANDED_HEIGHT = 320; // Height when showing transcription

// Keep track of last resize request time and state
let lastResizeTime = 0;
let lastResizeState = false;
let isResizing = false;

// Function to resize the window
function resizeWindow(expanded: boolean) {
  if (!mainWindow) return;
  
  // Only allow resize after window has been visible for some time
  const windowCreationTime = mainWindow.creationTime || Date.now();
  if (Date.now() - windowCreationTime < 2000) {
    console.log(`Ignoring resize during startup phase: ${expanded}`);
    return;
  }
  
  // Prevent rapid resize calls
  const now = Date.now();
  if (isResizing || (expanded === lastResizeState && now - lastResizeTime < 500)) {
    console.log(`Ignoring redundant resize request: ${expanded}`);
    return;
  }
  
  try {
    isResizing = true;
    lastResizeTime = now;
    lastResizeState = expanded;
    
    // Get current position
    const bounds = mainWindow.getBounds();
    
    // Calculate new height based on state
    const newHeight = expanded ? EXPANDED_HEIGHT : COLLAPSED_HEIGHT;
    
    console.log(`Performing resize: ${expanded ? 'expanded' : 'collapsed'}, from height ${bounds.height} to ${newHeight}`);
    
    // Keep same x position but adjust height and y position
    // This ensures the status bar stays in the same place at the bottom
    mainWindow.setBounds({
      x: bounds.x,
      y: expanded ? bounds.y - (EXPANDED_HEIGHT - COLLAPSED_HEIGHT) : bounds.y + (EXPANDED_HEIGHT - COLLAPSED_HEIGHT),
      width: bounds.width,
      height: newHeight
    }, true); // Animate the resize
    
    // Reset resizing flag after a short delay
    setTimeout(() => {
      isResizing = false;
    }, 300);
  } catch (error) {
    console.error('Error during window resize:', error);
    isResizing = false;
  }
}

// Create a single window just once
let hasCreatedWindow = false;

function createWindow() {
  // Prevent multiple window creation
  if (hasCreatedWindow || mainWindow) {
    console.log("Window already created, skipping creation");
    return;
  }
  
  try {
    console.log("Creating main application window");
    hasCreatedWindow = true;
    
    // Get primary display dimensions
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;
    
    // Create the browser window with specific settings for an overlay
    mainWindow = new BrowserWindow({
      width: 380,
      height: COLLAPSED_HEIGHT,
      x: Math.floor((width - 380) / 2),
      y: Math.floor(height - 90),
      frame: false,
      transparent: true,
      backgroundColor: '#00000000',
      hasShadow: false,
      alwaysOnTop: true,
      skipTaskbar: false,
      // Keep show=false to prevent flashing during load
      show: false,
      type: 'panel',
      focusable: true,
      fullscreenable: false,
      minimizable: false,
      maximizable: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
        devTools: isDev
      }
    });

    // Add creation timestamp to track window age
    mainWindow.creationTime = Date.now();
    mainWindow.isContentLoaded = false;

    // Set window properties
    mainWindow.setAlwaysOnTop(true, 'screen-saver', 2);
    mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

    // Load the URL
    const startUrl = process.env.ELECTRON_START_URL 
      ? process.env.ELECTRON_START_URL 
      : isDev 
        ? `http://localhost:${PORT}` 
        : url.format({
            pathname: path.join(__dirname, '../.next/server/app/index.html'),
            protocol: 'file:',
            slashes: true
          });

    // Don't show the window immediately, wait for full content load
    // This prevents seeing the initial blank or partially loaded page
    mainWindow.once('ready-to-show', () => {
      console.log("Window ready-to-show event triggered - waiting for full content load");
    });
    
    // Listen for dom-ready which happens when the initial HTML document has been loaded
    mainWindow.webContents.once('dom-ready', () => {
      console.log("DOM ready - still waiting for full content load");
    });
    
    // Listen for did-finish-load which happens when all resources are loaded
    mainWindow.webContents.once('did-finish-load', () => {
      console.log("Content fully loaded - now showing window");
      if (mainWindow) {
        // Set the content loaded flag
        mainWindow.isContentLoaded = true;
        
        // Force to collapsed size on first show
        const bounds = mainWindow.getBounds();
        mainWindow.setBounds({
          ...bounds,
          height: COLLAPSED_HEIGHT
        });
        
        // Short delay to ensure React has rendered before showing
        setTimeout(() => {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.setAlwaysOnTop(true, 'screen-saver', 2);
            mainWindow.focus();
            console.log("Window is now visible");
          }
        }, 100);
      }
    });

    // Handle window close
    mainWindow.on('closed', () => {
      mainWindow = null;
      hasCreatedWindow = false;
    });

    // Load the app URL - but don't show the window yet
    mainWindow.loadURL(startUrl);

    // Make window draggable by background
    mainWindow.setIgnoreMouseEvents(false);
  } catch (error) {
    console.error('Error creating window:', error);
    hasCreatedWindow = false;
  }
}

// Register global keyboard shortcuts
function registerShortcuts() {
  // Ctrl+Alt+R to start recording
  globalShortcut.register('CommandOrControl+Alt+R', () => {
    try {
      mainWindow?.webContents.send('start-recording');
    } catch (error) {
      console.error('Error in start recording shortcut:', error);
    }
  });

  // Esc to stop recording
  globalShortcut.register('Escape', () => {
    try {
      mainWindow?.webContents.send('stop-recording');
    } catch (error) {
      console.error('Error in stop recording shortcut:', error);
    }
  });
}

// Handle IPC events from renderer
function setupIPC() {
  // Handle transcription completion
  ipcMain.on('transcription-complete', (_event, text) => {
    clipboard.writeText(text);
  });

  // Set up IPC for window sizing - only allow if content is fully loaded
  ipcMain.on('set-window-size', (_event, expanded: boolean) => {
    if (!mainWindow || !mainWindow.isContentLoaded) {
      console.log("Ignoring resize request - window not ready");
      return;
    }
    
    if (typeof expanded !== 'boolean') {
      console.error(`Invalid resize request: expected boolean, got ${typeof expanded}`);
      return;
    }
    
    console.log(`Resize window request received: expanded = ${expanded}`);
    resizeWindow(expanded);
  });
  
  // Add handler for show window IPC call
  ipcMain.on('show-window', () => {
    if (mainWindow && !mainWindow.isVisible() && mainWindow.isContentLoaded) {
      console.log("Show window request received");
      mainWindow.show();
    }
  });
}

// When Electron is ready, create window
app.whenReady().then(() => {
  try {
    createWindow();
    registerShortcuts();
    setupIPC();
  } catch (error) {
    console.error('Error in app.whenReady:', error);
  }
}).catch(error => {
  console.error('Fatal error in app.whenReady:', error);
});

// Export for CommonJS compatibility
export {}; 