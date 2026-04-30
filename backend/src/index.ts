import http from 'node:http'
import path from 'node:path'
import tls from 'node:tls'
import net from 'node:net'
import { Readable } from 'node:stream'
import express from 'express'
import { WebSocketServer } from 'ws'
import * as ftp from 'basic-ftp'
import AdmZip from 'adm-zip'

const WEB_PORT = Number(process.env.PORT ?? '8889')
const WEB_ROOT = path.resolve(process.cwd(), 'dist/web')

const app = express()

app.get('/api/fetch', async (req, res) => {
  const url = req.query.url as string
  if (!url) {
    res.status(400).send('Missing url parameter')
    return
  }

  try {
    const response = await fetch(url)
    res.status(response.status)
    
    const headersToForward = ['content-type', 'content-length', 'last-modified', 'cache-control']
    headersToForward.forEach(h => {
      const val = response.headers.get(h)
      if (val) res.setHeader(h, val)
    })

    if (response.body) {
      Readable.fromWeb(response.body as any).pipe(res)
    } else {
      res.end()
    }
  } catch (err) {
    console.error('[server] proxy error:', err)
    res.status(500).send('Internal Server Error')
  }
})

/**
 * File list endpoint – lists print files from the printer's SD card via FTPS.
 * Probes multiple candidate directories and accepts various .3mf naming variants.
 *
 * Query params:
 *   ip   – printer IP address
 *   code – printer access code
 */
app.get('/api/files', async (req, res) => {
  const ip = req.query.ip as string
  const code = req.query.code as string

  if (!ip || !code) {
    res.status(400).send('Missing ip or code parameter')
    return
  }

  const client = new ftp.Client(15000)
  client.ftp.verbose = false

  try {
    await client.access({
      host: ip,
      port: 990,
      user: 'bblp',
      password: code,
      secure: 'implicit',
      secureOptions: { rejectUnauthorized: false },
    })

    console.info(`[files][${ip}] FTP connected`)

    // Probe candidate paths – Bambu Lab firmware differs between models/versions
    const candidatePaths = ['/', '/cache', '/sdcard', '/model']
    const allFiles: { name: string; fullName: string; size: number; modified: string | null; path: string }[] = []
    const seenNames = new Set<string>()

    for (const dir of candidatePaths) {
      let entries: ftp.FileInfo[] = []
      try {
        entries = await client.list(dir)
        console.info(`[files][${ip}] ${dir}: ${entries.length} entries – ${entries.map(e => e.name).join(', ')}`)
      } catch (e: any) {
        console.info(`[files][${ip}] ${dir}: inaccessible (${e.message})`)
        continue
      }

      for (const f of entries) {
        if (f.type !== ftp.FileType.File) continue

        const n = f.name.toLowerCase()
        const is3mf = n.endsWith('.gcode.3mf') || n.endsWith('.3mf')
        if (!is3mf) continue

        // Derive clean task name
        const taskName = f.name
          .replace(/\.gcode\.3mf$/i, '')
          .replace(/\.3mf$/i, '')

        if (seenNames.has(taskName)) continue
        seenNames.add(taskName)

        allFiles.push({
          name: taskName,
          fullName: f.name,
          size: f.size,
          modified: f.modifiedAt?.toISOString() ?? null,
          path: `${dir}/${f.name}`,
        })
      }
    }

    client.close()

    // Sort newest first
    allFiles.sort((a, b) => {
      if (a.modified && b.modified) return b.modified.localeCompare(a.modified)
      return a.name.localeCompare(b.name)
    })

    console.info(`[files][${ip}] returning ${allFiles.length} files`)
    res.json(allFiles)

  } catch (err: any) {
    client.close()
    console.error(`[files][${ip}] error: ${err.message}`)
    res.status(500).json({ error: err.message })
  }
})


/**
 * Thumbnail endpoint – downloads the print thumbnail from the printer via FTPS.
 *
 * The printer stores .3mf files on its internal storage, accessible via FTPS (implicit TLS, port 990).
 * The .3mf is a ZIP archive; this endpoint extracts the plate thumbnail PNG and returns it.
 *
 * Query params:
 *   ip   – printer IP address
 *   code – printer access code
 *   name – subtask_name from MQTT (filename without extension)
 */
app.get('/api/thumbnail', async (req, res) => {
  const ip = req.query.ip as string
  const code = req.query.code as string
  const name = req.query.name as string

  if (!ip || !code || !name) {
    res.status(400).send('Missing ip, code or name parameter')
    return
  }

  // Candidate .3mf paths on the printer's SD card (tried in order)
  // If exact path is provided from the file listing, try it first
  const exactPath = req.query.path as string | undefined
  const ftpPaths = [
    ...(exactPath ? [exactPath] : []),
    `/cache/${name}.gcode.3mf`,
    `/cache/${name}.3mf`,
    `/${name}.gcode.3mf`,
    `/${name}.3mf`,
  ]

  // Candidate thumbnail entry names inside the .3mf ZIP
  const thumbnailEntries = [
    'Metadata/plate_1.png',
    'Metadata/thumbnail.png',
    'Metadata/cover.png',
    'Metadata/plate_2.png',
  ]

  const client = new ftp.Client(10000)
  client.ftp.verbose = false

  try {
    await client.access({
      host: ip,
      port: 990,
      user: 'bblp',
      password: code,
      secure: 'implicit',
      secureOptions: { rejectUnauthorized: false },
    })

    console.info(`[thumbnail][${ip}] FTP connected, looking for: ${name}`)

    let fileBuffer: Buffer | null = null

    for (const ftpPath of ftpPaths) {
      const chunks: Buffer[] = []
      const writable = new (await import('node:stream')).Writable({
        write(chunk, _enc, cb) { chunks.push(chunk); cb() },
      })
      try {
        await client.downloadTo(writable, ftpPath)
        fileBuffer = Buffer.concat(chunks)
        console.info(`[thumbnail][${ip}] downloaded ${ftpPath} (${fileBuffer.length}B)`)
        break
      } catch {
        // Try next path
      }
    }

    client.close()

    if (!fileBuffer) {
      console.warn(`[thumbnail][${ip}] .3mf not found for: ${name}`)
      res.status(404).send('Thumbnail not found')
      return
    }

    // Extract thumbnail from .3mf (ZIP archive)
    const zip = new AdmZip(fileBuffer)
    let imgData: Buffer | null = null

    for (const entryName of thumbnailEntries) {
      const entry = zip.getEntry(entryName)
      if (entry) {
        imgData = entry.getData()
        console.info(`[thumbnail][${ip}] extracted ${entryName} (${imgData.length}B)`)
        break
      }
    }

    if (!imgData) {
      console.warn(`[thumbnail][${ip}] no thumbnail entry found in .3mf`)
      res.status(404).send('Thumbnail entry not found in .3mf')
      return
    }

    res.setHeader('Content-Type', 'image/png')
    res.setHeader('Cache-Control', 'public, max-age=3600')
    res.send(imgData)

  } catch (err: any) {
    client.close()
    console.error(`[thumbnail][${ip}] error: ${err.message}`)
    res.status(500).send('FTP error: ' + err.message)
  }
})

/**
 * Camera stream endpoint – Server-Sent Events with base64-encoded JPEG frames.
 * Connects to Bambu Lab P1 camera on TLS port 6000 using the proprietary binary protocol.
 *
 * Query params:
 *   ip   – printer IP address
 *   code – printer access code (LAN mode)
 */
app.get('/api/camera', (req, res) => {
  const ip = req.query.ip as string
  const code = req.query.code as string

  if (!ip || !code) {
    res.status(400).send('Missing ip or code parameter')
    return
  }

  const remote = `${ip}:6000`
  console.info(`[camera][${remote}] SSE client connected`)

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()

  // Build the 80-byte authentication packet
  // Format: [0x40 LE4][0x3000 LE4][0x00 LE4][0x00 LE4][username 32B][code 32B]
  const USERNAME = 'bblp'
  const authBuf = Buffer.alloc(80, 0)
  authBuf.writeUInt32LE(0x40, 0)
  authBuf.writeUInt32LE(0x3000, 4)
  authBuf.writeUInt32LE(0, 8)
  authBuf.writeUInt32LE(0, 12)
  Buffer.from(USERNAME, 'ascii').copy(authBuf, 16)
  Buffer.from(code, 'ascii').copy(authBuf, 48)

  let closed = false
  let tlsSocket: tls.TLSSocket | null = null

  const cleanup = (reason: string) => {
    if (closed) return
    closed = true
    console.info(`[camera][${remote}] closing: ${reason}`)
    tlsSocket?.destroy()
    tlsSocket = null
    if (!res.writableEnded) res.end()
  }

  // Connect to printer camera port
  const rawSocket = net.createConnection({ host: ip, port: 6000 })
  rawSocket.on('error', (err) => {
    console.error(`[camera][${remote}] tcp error: ${err.message}`)
    cleanup('tcp error')
  })

  rawSocket.on('connect', () => {
    const sock = tls.connect({
      socket: rawSocket,
      rejectUnauthorized: false,
    })
    tlsSocket = sock

    sock.on('secureConnect', () => {
      console.info(`[camera][${remote}] TLS connected, sending auth`)
      sock.write(authBuf)
    })

    // Frame parser state
    let buf = Buffer.alloc(0)
    let payloadSize = -1  // -1 = waiting for 16-byte header

    sock.on('data', (chunk: Buffer) => {
      buf = Buffer.concat([buf, chunk])

      while (true) {
        if (payloadSize === -1) {
          // Need at least 16 bytes for the frame header
          if (buf.length < 16) break
          // First 3 bytes (little-endian) = payload size
          payloadSize = buf.readUIntLE(0, 3)
          buf = buf.subarray(16)
        }

        if (payloadSize <= 0) {
          // Unexpected: reset
          payloadSize = -1
          break
        }

        if (buf.length < payloadSize) break  // Need more data

        const frame = buf.subarray(0, payloadSize)
        buf = buf.subarray(payloadSize)
        payloadSize = -1

        // Validate JPEG magic bytes: FF D8 FF E0 ... FF D9
        if (frame[0] === 0xff && frame[1] === 0xd8 &&
            frame[frame.length - 2] === 0xff && frame[frame.length - 1] === 0xd9) {
          if (!closed && !res.writableEnded) {
            const b64 = frame.toString('base64')
            res.write(`data: ${b64}\n\n`)
          }
        } else {
          console.warn(`[camera][${remote}] invalid JPEG magic, skipping frame (${frame.length}B)`)
        }
      }
    })

    sock.on('end', () => cleanup('tls end'))
    sock.on('close', () => cleanup('tls close'))
    sock.on('error', (err) => {
      console.error(`[camera][${remote}] tls error: ${err.message}`)
      cleanup('tls error')
    })
  })

  // Cleanup when the HTTP client disconnects
  res.on('close', () => cleanup('client disconnected'))
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
