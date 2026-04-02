import http from 'node:http'
import path from 'node:path'
import tls from 'node:tls'
import express from 'express'
import { WebSocketServer } from 'ws'
import { unzipSync } from 'fflate'

const WEB_PORT = Number(process.env.PORT ?? '8889')
const WEB_ROOT = path.resolve(process.cwd(), 'dist/web')

const app = express()

async function get3MFThumbnail(url: string, plate_idx: string): Promise<Uint8Array | null> {
  try {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    const arrayBuffer = await response.arrayBuffer()
    const data = new Uint8Array(arrayBuffer)
    const unzipped = unzipSync(data)
    const thumbnailData = unzipped[`Metadata/plate_${plate_idx}.png`]
    return thumbnailData || null
  } catch (err) {
    console.error('[server] get3MFThumbnail error:', err)
    return null
  }
}

app.get('/api/getThumbnail', async (req, res) => {
  const url = req.query.url as string
  const plate_idx = req.query.plate_idx as string
  if (!url || !plate_idx) {
    res.status(400).send('Missing parameter')
    return
  }
  const data = await get3MFThumbnail(url, plate_idx)
  if (data) {
    res.setHeader('Content-Type', 'image/png')
    res.setHeader('Cache-Control', 'public, max-age=2592000') // 30 days
    res.send(Buffer.from(data))
  } else {
    res.status(404).send('Thumbnail not found')
  }
})

app.use('/', express.static(WEB_ROOT))

const server = http.createServer(app)
const mqttProxy = new WebSocketServer({ server, path: '/mqtt' })

mqttProxy.on('connection', (socket, req) => {
  const remote = req.socket.remoteAddress + ':' + req.socket.remotePort
  const reqUrl = new URL(req.url ?? '', `http://${req.headers.host ?? 'localhost'}`)
  const encodedTargetUrl = reqUrl.searchParams.get('url')

  if (!encodedTargetUrl) {
    console.error(`[mqtt-proxy][${remote}] missing url query`)
    socket.close()
    return
  }

  let targetUrl: URL
  try {
    targetUrl = new URL(encodedTargetUrl)
  } catch {
    console.error(`[mqtt-proxy][${remote}] invalid url: ${encodedTargetUrl}`)
    socket.close()
    return
  }

  if (targetUrl.protocol !== 'mqtts:') {
    console.error(`[mqtt-proxy][${remote}] unsupported protocol: ${targetUrl.protocol}`)
    socket.close()
    return
  }

  const targetHost = targetUrl.hostname
  const targetPort = targetUrl.port ? Number(targetUrl.port) : 8883
  if (!targetHost || Number.isNaN(targetPort) || targetPort <= 0 || targetPort > 65535) {
    console.error(`[mqtt-proxy][${remote}] invalid target: ${targetUrl.toString()}`)
    socket.close()
    return
  }

  console.info(`[mqtt-proxy][${remote}] connecting to ${targetHost}:${targetPort}`)
  const tlsSocket = tls.connect({
    host: targetHost,
    port: targetPort,
    rejectUnauthorized: false,
  })

  let closed = false
  const closeBoth = (reason: string) => {
    if (closed) {
      return
    }
    closed = true
    console.info(`[mqtt-proxy][${remote}] closing bridge: ${reason}`)
    if (socket.readyState === socket.OPEN || socket.readyState === socket.CLOSING) {
      socket.close()
    }
    if (!tlsSocket.destroyed) {
      tlsSocket.destroy()
    }
  }

  tlsSocket.on('secureConnect', () => {
    console.info(`[mqtt-proxy][${remote}] tls connected to ${targetHost}:${targetPort}`)
  })

  tlsSocket.on('data', (chunk) => {
    if (socket.readyState !== socket.OPEN) {
      closeBoth('ws not open on tls->ws data')
      return
    }
    socket.send(chunk, { binary: true }, (err) => {
      if (err) {
        console.error(`[mqtt-proxy][${remote}] ws send failed: ${err.message}`)
        closeBoth('ws send failure')
      }
    })
  })

  tlsSocket.on('end', () => {
    closeBoth('tls end')
  })

  tlsSocket.on('close', () => {
    closeBoth('tls close')
  })

  tlsSocket.on('error', (err) => {
    console.error(`[mqtt-proxy][${remote}] tls error: ${err.message}`)
    closeBoth('tls error')
  })

  socket.on('message', (raw: Buffer) => {
    if (tlsSocket.destroyed) {
      closeBoth('tls already destroyed on ws->tls data')
      return
    }
    const chunk = new Uint8Array(raw.buffer, raw.byteOffset, raw.byteLength)
    tlsSocket.write(chunk, (err) => {
      if (err) {
        console.error(`[mqtt-proxy][${remote}] tls write failed: ${err.message}`)
        closeBoth('tls write failure')
      }
    })
  })

  socket.on('close', () => {
    closeBoth('ws close')
  })

  socket.on('error', (err) => {
    console.error(`[mqtt-proxy][${remote}] ws error: ${err.message}`)
    closeBoth('ws error')
  })
})

const start = async () => {
  server.listen(WEB_PORT, () => {
    console.log(`[server] listening on ${WEB_PORT}`)
    if (process.env.NODE_ENV === 'production') {
      console.log(`[server] WEB_ROOT=${WEB_ROOT}`)
    }
  })
}

start().catch((err) => {
  console.error('[server] failed to start', err)
  process.exit(1)
})
