import { app, BrowserWindow, globalShortcut, clipboard, screen, ipcMain } from 'electron';
import * as path from 'path';
import * as url from 'url';

// Development vs Production flag
const isDev = process.env.NODE_ENV !== 'production';
const PORT = 3000;

// Define a flag for DevTools
const openDevTools = isDev;

// Custom BrowserWindow with additional properties
interface CustomBrowserWindow extends BrowserWindow {
  creationTime?: number;
  isContentLoaded?: boolean;
}

let mainWindow: CustomBrowserWindow | null = null;
// Default window size
// We'll keep the height but make it click-through in transparent areas
const WINDOW_HEIGHT = 540;

// Keep track of last resize request time and state
let lastResizeTime = 0;
let lastResizeState = false;
let isResizing = false;

// Shortcut management
const TARGET_SHORTCUT = 'CommandOrControl+Shift+R';
const originalShortcutOwners: Map<string, boolean> = new Map();
let shortcutsRestored = true;

// Function to resize the window
function resizeWindow(expanded: boolean) {
  if (!mainWindow) return;
  
  // Only allow resize after window has been visible for some time
  const windowCreationTime = mainWindow.creationTime || Date.now();
  if (Date.now() - windowCreationTime < 2000) {
    console.log(`Ignoring content visibility change during startup phase: ${expanded}`);
    return;
  }
  
  // Prevent rapid resize calls
  const now = Date.now();
  if (isResizing || (expanded === lastResizeState && now - lastResizeTime < 500)) {
    console.log(`Ignoring redundant content visibility request: ${expanded}`);
    return;
  }
  
  try {
    isResizing = true;
    lastResizeTime = now;
    lastResizeState = expanded;
    
    // Get current position
    const bounds = mainWindow.getBounds();
    
    // Keep the height constant to prevent flickering
    const newHeight = WINDOW_HEIGHT; // Always use the same height
    
    console.log(`Handling window state change: ${expanded ? 'expanded' : 'collapsed'} (height stays at ${newHeight}px)`);
    
    // Keep same x position and height but adjust content visibility via IPC
    // This ensures no resizing flicker
    const display = screen.getDisplayMatching(bounds);
    const workAreaHeight = display.workArea.height;
    
    // Only update position if it's needed (window moved or first positioning)
    if (Math.abs(bounds.height - newHeight) > 5 || 
        Math.abs(bounds.y - (workAreaHeight - newHeight - 10)) > 5) {
      
      const newBounds = {
        x: bounds.x,
        width: bounds.width,
        height: newHeight,
        y: workAreaHeight - newHeight - 10  // Always position at bottom of screen
      };
      
      console.log(`Updating bounds: x=${newBounds.x}, y=${newBounds.y}, width=${newBounds.width}, height=${newHeight}`);
      mainWindow.setBounds(newBounds, true); // Animate the resize
    } else {
      console.log(`Skipping resize - window already at correct size and position`);
    }
    
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
      height: WINDOW_HEIGHT, // Using expanded height from the start
      x: Math.floor((width - 380) / 2),
      y: Math.floor(height - WINDOW_HEIGHT - 10),
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
        devTools: openDevTools
      }
    });

    // Add creation timestamp to track window age
    mainWindow.creationTime = Date.now();
    mainWindow.isContentLoaded = false;

    // Set window properties
    mainWindow.setAlwaysOnTop(true, 'screen-saver', 2);
    mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    
    // Enable click-through for transparent parts of the window
    mainWindow.setIgnoreMouseEvents(true, { forward: true });

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
        
        // Force to expanded size on first show
        const bounds = mainWindow.getBounds();
        mainWindow.setBounds({
          ...bounds,
          height: WINDOW_HEIGHT
        });
        
        // Open DevTools in development mode
        if (isDev) {
          console.log("Opening DevTools (development mode)");
          mainWindow.webContents.openDevTools({ mode: 'detach' });
        }
        
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
    
    // Set up IPC listener for interactive regions
    setupRegionBasedInteractivity();
  } catch (error) {
    console.error('Error creating window:', error);
    hasCreatedWindow = false;
  }
}

// Setup region-based interactivity (clickable areas)
function setupRegionBasedInteractivity() {
  if (!mainWindow) return;
  
  // Listen for messages from the renderer about interactive regions
  ipcMain.on('update-interactive-region', (_event, region) => {
    if (!mainWindow) return;
    
    if (region && typeof region === 'object') {
      // If renderer sends a region, make the window click-through except in specified areas
      try {
        if (region.reset) {
          // Reset to full click-through mode with mouse move detection
          mainWindow.setIgnoreMouseEvents(true, { forward: true });
          console.log("Reset to full click-through mode");
        } else {
          // Enable click-through except in specified regions
          mainWindow.setIgnoreMouseEvents(false);
          console.log("Interactive mode enabled");
        }
      } catch (error) {
        console.error("Error updating interactive regions:", error);
      }
    }
  });
  
  // Listen for mouse enter/leave events from renderer
  ipcMain.on('mouse-event', (_event, type) => {
    if (!mainWindow) return;
    
    if (type === 'enter') {
      // Mouse entered an interactive element - disable click-through
      mainWindow.setIgnoreMouseEvents(false);
    } else if (type === 'leave') {
      // Mouse left interactive elements - enable click-through with forwarding
      mainWindow.setIgnoreMouseEvents(true, { forward: true });
    }
  });
}

// Check if a shortcut is already registered by another application
function isShortcutRegisteredExternally(shortcut: string): boolean {
  try {
    // Try to register the shortcut temporarily
    const isRegistered = globalShortcut.register(shortcut, () => {
      console.log('Checking if shortcut is registered externally');
    });
    
    // If we were able to register it, unregister it and return false (not taken)
    if (isRegistered) {
      globalShortcut.unregister(shortcut);
      return false;
    }
    
    // If we couldn't register it, it's already taken
    return true;
  } catch (error) {
    console.error('Error checking shortcut availability:', error);
    return false; // Assume it's not taken in case of error
  }
}

// Store information about externally registered shortcuts
function saveExternalShortcutState() {
  try {
    // Check our target shortcut
    const isExternallyRegistered = isShortcutRegisteredExternally(TARGET_SHORTCUT);
    console.log(`Checking ${TARGET_SHORTCUT} - Registered externally: ${isExternallyRegistered}`);
    
    // Store the state
    originalShortcutOwners.set(TARGET_SHORTCUT, isExternallyRegistered);
    shortcutsRestored = false;
    
    return isExternallyRegistered;
  } catch (error) {
    console.error('Error saving external shortcut state:', error);
    return false;
  }
}

// Register global keyboard shortcuts with high priority
function registerShortcuts() {
  try {
    // First, save the state of any external shortcuts
    const wasExternallyRegistered = saveExternalShortcutState();
    
    // Unregister any existing registrations of our target shortcut
    // This will force our registration to take precedence
    globalShortcut.unregister(TARGET_SHORTCUT);
    
    // Give the system a moment to release the shortcut
    setTimeout(() => {
      // Register our Ctrl+Shift+R with high priority
      const success = globalShortcut.register(TARGET_SHORTCUT, () => {
        try {
          console.log('Ctrl+Shift+R shortcut triggered');
          mainWindow?.webContents.send('start-recording');
          
          // Also bring the window to front and focus it
          if (mainWindow && !mainWindow.isVisible()) {
            mainWindow.show();
          }
          if (mainWindow) {
            mainWindow.setAlwaysOnTop(true, 'screen-saver', 2);
            setTimeout(() => {
              mainWindow?.focus();
            }, 50);
          }
        } catch (error) {
          console.error('Error in start recording shortcut:', error);
        }
      });
      
      console.log(`Registered ${TARGET_SHORTCUT} shortcut: ${success}`);
      
      if (!success && wasExternallyRegistered) {
        // If registration failed and we know it was externally registered,
        // show a notification or log the issue
        console.error(`Failed to register ${TARGET_SHORTCUT} - it might be used by another application`);
        // You could notify the user here if desired
      }
    }, 100);

    // Esc to stop recording
    globalShortcut.register('Escape', () => {
      try {
        mainWindow?.webContents.send('stop-recording');
      } catch (error) {
        console.error('Error in stop recording shortcut:', error);
      }
    });

    // Ctrl+Shift+I to toggle DevTools in dev mode
    if (isDev) {
      globalShortcut.register('CommandOrControl+Shift+I', toggleDevTools);
    }
  } catch (error) {
    console.error('Error registering shortcuts:', error);
  }
}

// Restore original shortcut state when app quits
function restoreShortcuts() {
  if (shortcutsRestored) return;
  
  try {
    console.log('Restoring original shortcut registrations');
    
    // Unregister our shortcuts
    globalShortcut.unregister(TARGET_SHORTCUT);
    globalShortcut.unregister('Escape');
    if (isDev) {
      globalShortcut.unregister('CommandOrControl+Shift+I');
    }
    
    shortcutsRestored = true;
    console.log('Shortcuts restored successfully');
  } catch (error) {
    console.error('Error restoring shortcuts:', error);
  }
}

// Utility function to toggle DevTools
function toggleDevTools() {
  if (!mainWindow) return;
  
  try {
    if (mainWindow.webContents.isDevToolsOpened()) {
      mainWindow.webContents.closeDevTools();
      console.log("DevTools closed");
    } else {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
      console.log("DevTools opened");
    }
  } catch (error) {
    console.error('Error toggling DevTools:', error);
  }
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
      console.log("Ignoring content state change request - window not ready");
      return;
    }
    
    if (typeof expanded !== 'boolean') {
      console.error(`Invalid content state request: expected boolean, got ${typeof expanded}`);
      return;
    }
    
    console.log(`Content visibility change request received: expanded = ${expanded}`);
    resizeWindow(expanded);
  });
  
  // Add handler for show window IPC call
  ipcMain.on('show-window', () => {
    if (mainWindow && !mainWindow.isVisible() && mainWindow.isContentLoaded) {
      console.log("Show window request received");
      mainWindow.show();
    }
  });
  
  // Add handler for hide window IPC call
  ipcMain.on('hide-window', () => {
    if (mainWindow && mainWindow.isVisible()) {
      console.log("Hide window request received");
      mainWindow.hide();
    }
  });
  
  // Add handler to check shortcut registration status
  ipcMain.on('check-shortcut-registration', (event) => {
    const isRegistered = globalShortcut.isRegistered(TARGET_SHORTCUT);
    console.log(`Checking if shortcut is registered: ${isRegistered}`);
    event.reply('shortcut-registration-result', isRegistered);
  });
  
  // Add handler to refresh shortcuts
  ipcMain.on('refresh-shortcuts', (event) => {
    console.log("Refreshing shortcuts per renderer request");
    
    // Unregister all shortcuts first
    globalShortcut.unregisterAll();
    
    // Then re-register them
    registerShortcuts();
    
    // Notify renderer that shortcuts have been refreshed
    event.reply('shortcuts-refreshed');
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

// Handle app activation (macOS)
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Clean up when app is quitting
app.on('will-quit', () => {
  // Restore original shortcut state
  restoreShortcuts();
  
  // Unregister all shortcuts
  globalShortcut.unregisterAll();
});

// Also handle the window-all-closed event
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Restore shortcuts before quitting
    restoreShortcuts();
    app.quit();
  }
});

// Export for CommonJS compatibility
export {}; 