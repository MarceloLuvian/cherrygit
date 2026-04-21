import { app, BrowserWindow, Menu, shell, type MenuItemConstructorOptions } from 'electron';
import { newWindow } from './manager.js';

const PREFERENCES_CHANNEL = 'nav:preferences';

export function installMenu(): void {
  const isMac = process.platform === 'darwin';
  const appName = app.getName();

  const template: MenuItemConstructorOptions[] = [
    ...(isMac
      ? ([
          {
            label: appName,
            submenu: [
              { role: 'about' },
              { type: 'separator' },
              {
                label: 'Preferences...',
                accelerator: 'Cmd+,',
                click: (): void => {
                  const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
                  if (win) win.webContents.send(PREFERENCES_CHANNEL);
                }
              },
              { type: 'separator' },
              { role: 'services' },
              { type: 'separator' },
              { role: 'hide' },
              { role: 'hideOthers' },
              { role: 'unhide' },
              { type: 'separator' },
              { role: 'quit', accelerator: 'Cmd+Q' }
            ]
          } as MenuItemConstructorOptions
        ])
      : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'New Window',
          accelerator: isMac ? 'Cmd+N' : 'Ctrl+N',
          click: (): void => {
            newWindow();
          }
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload', accelerator: isMac ? 'Cmd+R' : 'Ctrl+R' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac
          ? ([
              { type: 'separator' },
              { role: 'front' },
              { type: 'separator' },
              { role: 'window' }
            ] as MenuItemConstructorOptions[])
          : ([{ role: 'close' }] as MenuItemConstructorOptions[]))
      ]
    },
    {
      role: 'help',
      submenu: [
        {
          label: 'Learn More',
          click: (): void => {
            void shell.openExternal('https://github.com/');
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}
