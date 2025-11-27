self.addEventListener('message', async (e) => {
  const { type, data } = e.data

  switch (type) {
    case 'CHUNK_FILE':
      await chunkFile(data)
      break

    case 'HASH_FILE':
      await hashFile(data)
      break

    default:
      self.postMessage({
        type: 'ERROR',
        error: 'Unknown message type'
      })
  }
})

async function chunkFile({ file, chunkSize }) {
  try {
    const chunks = []
    let offset = 0

    while (offset < file.size) {
      const chunk = file.slice(offset, offset + chunkSize)
      chunks.push({
        index: chunks.length,
        blob: chunk,
        size: chunk.size,
      })
      offset += chunkSize

      self.postMessage({
        type: 'CHUNK_PROGRESS',
        progress: (offset / file.size) * 100
      })
    }

    self.postMessage({
      type: 'CHUNKS_READY',
      chunks,
      totalChunks: chunks.length,
    })
  } catch (error) {
    self.postMessage({
      type: 'ERROR',
      error: error.message
    })
  }
}

async function hashFile({ file }) {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    self.postMessage({
      type: 'HASH_COMPLETE',
      hash
    })
  } catch (error) {
    self.postMessage({
      type: 'ERROR',
      error: error.message
    })
  }
}
