const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')

if (typeof global.File === 'undefined' && typeof Blob !== 'undefined') {
  global.File = class File extends Blob {
    constructor(parts, name, options = {}) {
      super(parts, options)
      this.name = name
      this.lastModified = options.lastModified ?? Date.now()
    }
  }
}

const ytdl = require('ytdl-core')
const ytSearch = require('yt-search')
const ytsr = require('ytsr')
const ytdlpExec = require('youtube-dl-exec')

let mainWindow = null

async function search(query) {
  try {
    const res = await ytSearch(query)
    const items = (res && res.videos) ? res.videos : []
    if (items.length) {
      return items.slice(0, 20).map(v => ({
        id: v.videoId,
        title: v.title,
        author: v.author?.name || '',
        duration: v.timestamp,
        thumbnail: v.thumbnail
      }))
    }
  } catch (_) {}
  try {
    const res2 = await ytsr(query, { limit: 20 })
    const vids = res2.items.filter(i => i.type === 'video')
    return vids.map(v => ({
      id: v.id || (v.url ? new URL(v.url).searchParams.get('v') : ''),
      title: v.title,
      author: v.author?.name || v.author || '',
      duration: v.duration || '',
      thumbnail: (v.thumbnails && v.thumbnails.length) ? v.thumbnails[v.thumbnails.length - 1].url : ''
    }))
  } catch (e) {
    console.error('Search error:', e)
  }
  return []
}

async function resolveAudio(videoId) {
  try {
    const info = await ytdl.getInfo(videoId)
    let chosen = null
    try {
      chosen = ytdl.chooseFormat(info.formats, { quality: 'highestaudio' })
    } catch (_) {}
    if (!chosen || !chosen.url) {
      const sorted = info.formats
        .filter(f => f.hasAudio)
        .sort((a,b) => (b.audioBitrate||0) - (a.audioBitrate||0))
      chosen = sorted[0] || null
    }
    const url = chosen && chosen.url ? chosen.url : null
    const lengthSeconds = info.videoDetails.lengthSeconds ? parseInt(info.videoDetails.lengthSeconds, 10) : 0
    const title = info.videoDetails.title
    const author = info.videoDetails.author ? info.videoDetails.author.name : ''
    const thumbnails = info.videoDetails.thumbnails || []
    const thumbnail = thumbnails.length ? thumbnails[thumbnails.length - 1].url : `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
    if (url) return { url, lengthSeconds, title, author, thumbnail, id: videoId }
  } catch (e) {
    console.error('ytdl-core failed, fallback to yt-dlp:', e.message)
  }
  try {
    const url = `https://www.youtube.com/watch?v=${videoId}`
    const json = await ytdlpExec(url, {
      dumpSingleJson: true,
      noCheckCertificates: true,
      noWarnings: true,
      preferFreeFormats: true
    })
    const fmts = Array.isArray(json.formats) ? json.formats : []
    const audios = fmts.filter(f => f.acodec && f.acodec !== 'none' && !f.vcodec || f.vcodec === 'none')
    const best = audios.sort((a,b) => (b.abr||0) - (a.abr||0))[0] || fmts.find(f => f.url)
    const streamUrl = best && best.url ? best.url : null
    const lengthSeconds = json.duration ? Math.round(json.duration) : (json.duration_string ? 0 : 0)
    const title = json.title || ''
    const author = json.uploader || ''
    const thumbs = json.thumbnails || []
    const thumbnail = thumbs.length ? thumbs[thumbs.length - 1].url : `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
    return { url: streamUrl, lengthSeconds, title, author, thumbnail, id: videoId }
  } catch (e) {
    console.error('yt-dlp fallback failed:', e.message)
    return { url: null, lengthSeconds: 0, title: '', author: '', thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`, id: videoId }
  }
}

async function recommend(videoId) {
  try {
    const mixUrl = `https://www.youtube.com/watch?v=${videoId}&list=RD${videoId}`
    const json = await ytdlpExec(mixUrl, { dumpSingleJson: true, noCheckCertificates: true, noWarnings: true })
    const entries = Array.isArray(json.entries) ? json.entries : []
    const filtered = entries.filter(e => (e.duration||0) > 60)
      .slice(0, 25)
    return filtered.map(e => ({
      id: e.id || (e.url ? new URL(e.url).searchParams.get('v') : ''),
      title: e.title || '',
      author: e.uploader || '',
      duration: e.duration ? `${Math.floor(e.duration/60)}:${String(Math.floor(e.duration%60)).padStart(2,'0')}` : '',
      thumbnail: (e.thumbnails && e.thumbnails.length) ? e.thumbnails[e.thumbnails.length-1].url : (e.id ? `https://img.youtube.com/vi/${e.id}/hqdefault.jpg` : '')
    }))
  } catch (_) {}
  try {
    const info = await ytdl.getInfo(videoId)
    const rv = info.related_videos || []
    return rv.filter(v => (v.length_seconds||0) > 60)
      .slice(0, 20)
      .map(v => ({
        id: v.id || v.videoId || '',
        title: v.title || '',
        author: (v.author && (v.author.name || v.author)) || '',
        duration: v.length_seconds ? `${Math.floor(v.length_seconds/60)}:${String(v.length_seconds%60).padStart(2,'0')}` : '',
        thumbnail: v.thumbnail_url || (v.id ? `https://img.youtube.com/vi/${v.id}/hqdefault.jpg` : '')
      }))
  } catch (_) {}
  return []
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    backgroundColor: '#0d0f17',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  })
  mainWindow.loadFile(path.join(__dirname, 'index.html'))
}

app.whenReady().then(() => {
  ipcMain.handle('search', async (_e, q) => {
    return await search(q)
  })
  ipcMain.handle('resolveAudio', async (_e, id) => {
    return await resolveAudio(id)
  })
  ipcMain.handle('recommend', async (_e, id) => {
    return await recommend(id)
  })
  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (!mainWindow) createWindow()
})