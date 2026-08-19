import { ElectronAPI } from '@electron-toolkit/preload'

type SavePanoramaJpegResult =
  { status: 'saved' } | { status: 'canceled' } | { status: 'failed'; message: string }

interface Api {
  savePanoramaJpeg: (data: ArrayBuffer) => Promise<SavePanoramaJpegResult>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: Api
  }
}
