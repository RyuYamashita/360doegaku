import { app, shell, BrowserWindow, dialog, ipcMain, type IpcMainInvokeEvent } from 'electron'
import { writeFile } from 'fs/promises'
import { dirname, extname, join } from 'path'
import { pathToFileURL } from 'url'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { embedGpanoXmp } from './panorama-jpeg'

const SAVE_PANORAMA_JPEG_CHANNEL = 'panorama:save-jpeg'
const MAX_JPEG_INPUT_SIZE = 20 * 1024 * 1024
const appWindowWebContentsIds = new Set<number>()
let lastSaveDirectory: string | null = null

type SavePanoramaJpegResult =
  { status: 'saved' } | { status: 'canceled' } | { status: 'failed'; message: string }

/** 開発URLとパッケージ版URLの違いを考慮し、アプリ自身のMain Frameだけに保存を許可する。 */
function isTrustedAppRenderer(event: IpcMainInvokeEvent): boolean {
  const senderFrame = event.senderFrame
  if (!senderFrame || senderFrame !== event.sender.mainFrame) return false
  if (!appWindowWebContentsIds.has(event.sender.id)) return false
  if (!BrowserWindow.fromWebContents(event.sender)) return false

  try {
    const senderUrl = new URL(senderFrame.url)
    if (is.dev) {
      const rendererUrl = process.env['ELECTRON_RENDERER_URL']
      if (!rendererUrl) return false
      return senderUrl.origin === new URL(rendererUrl).origin
    }

    return senderUrl.href === pathToFileURL(join(__dirname, '../renderer/index.html')).href
  } catch {
    return false
  }
}

/** JPEG以外の拡張子は置換し、未指定時だけ.jpgを追加して保存形式と名前を一致させる。 */
function normalizeJpegPath(filePath: string): string {
  const extension = extname(filePath)
  if (/^\.jpe?g$/i.test(extension)) return filePath
  if (!extension) return `${filePath}.jpg`
  return `${filePath.slice(0, -extension.length)}.jpg`
}

/** 保存APIの入力を検証し、XMP埋め込みからファイル書き込みまでをMain内で完結させる。 */
async function handleSavePanoramaJpeg(
  event: IpcMainInvokeEvent,
  data: unknown
): Promise<SavePanoramaJpegResult> {
  if (!isTrustedAppRenderer(event)) {
    return { status: 'failed', message: '保存要求の送信元を確認できませんでした' }
  }

  const ownerWindow = BrowserWindow.fromWebContents(event.sender)
  if (!ownerWindow) return { status: 'failed', message: '保存元のウィンドウを確認できませんでした' }

  try {
    if (!(data instanceof ArrayBuffer)) throw new Error('JPEGデータの形式が不正です')
    if (data.byteLength === 0) throw new Error('JPEGデータが空です')
    if (data.byteLength > MAX_JPEG_INPUT_SIZE) {
      throw new Error('JPEGデータが許容サイズを超えています')
    }

    const jpegWithXmp = embedGpanoXmp(new Uint8Array(data))
    const initialDirectory = lastSaveDirectory ?? app.getPath('pictures')
    let defaultPath = join(initialDirectory, '360doegaku.jpg')

    while (true) {
      const saveResult = await dialog.showSaveDialog(ownerWindow, {
        title: '360度JPEGを保存',
        defaultPath,
        filters: [{ name: 'JPEG画像として保存（.jpg / .jpeg）', extensions: ['*'] }]
      })

      if (saveResult.canceled || !saveResult.filePath) return { status: 'canceled' }

      const extension = extname(saveResult.filePath)
      const normalizedPath = normalizeJpegPath(saveResult.filePath)
      if (normalizedPath !== saveResult.filePath) {
        if (extension) {
          await dialog.showMessageBox(ownerWindow, {
            type: 'warning',
            title: '保存形式',
            message:
              'この拡張子は使用できません。JPEG形式（.jpg または .jpeg）で保存してください。',
            buttons: ['OK']
          })
        }

        // 実際の書き込み先についてOSの上書き確認を受けるため、正規化後のパスで再表示する。
        defaultPath = normalizedPath
        continue
      }

      await writeFile(saveResult.filePath, jpegWithXmp)
      lastSaveDirectory = dirname(saveResult.filePath)
      return { status: 'saved' }
    }
  } catch (error) {
    console.error('360度JPEGの保存に失敗しました', error)
    await dialog.showMessageBox(ownerWindow, {
      type: 'error',
      title: '保存失敗',
      message: '360度JPEGの保存に失敗しました'
    })
    return { status: 'failed', message: '360度JPEGの保存に失敗しました' }
  }
}

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  appWindowWebContentsIds.add(mainWindow.webContents.id)
  mainWindow.webContents.once('destroyed', () => {
    appWindowWebContentsIds.delete(mainWindow.webContents.id)
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))
  ipcMain.handle(SAVE_PANORAMA_JPEG_CHANNEL, handleSavePanoramaJpeg)

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
