export type TextExtractionEngine = 'pdfjs-dist' | 'tesseract.js'

export async function extractDocumentText(
  file: File,
  onProgress: (progress: number) => void = () => undefined,
): Promise<{ text: string; engine: TextExtractionEngine }> {
  const isImage = file.type.startsWith('image/') || /\.(?:png|jpe?g|webp)$/i.test(file.name)
  if (isImage) {
    const { createWorker, OEM } = await import('tesseract.js')
    const worker = await createWorker('eng', OEM.LSTM_ONLY, {
      logger: (event) => {
        if (event.status === 'recognizing text') onProgress(Math.round(event.progress * 100))
      },
    })
    try {
      const result = await worker.recognize(file)
      return { text: result.data.text, engine: 'tesseract.js' }
    } finally {
      await worker.terminate()
    }
  }

  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString()
  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise
  const pages: string[] = []
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber)
    const content = await page.getTextContent()
    pages.push(content.items.map((item) => ('str' in item ? item.str : '')).join(' '))
    onProgress(Math.round((pageNumber / pdf.numPages) * 100))
  }
  const text = pages.join('\n')
  if (!text.trim()) {
    throw new Error('This PDF has no embedded text. Upload a clear image or a text-based PDF.')
  }
  return { text, engine: 'pdfjs-dist' }
}
