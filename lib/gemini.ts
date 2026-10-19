import { GoogleGenAI } from "@google/genai"

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is not defined")
}

export const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
})

export async function getEmbedding(text: string): Promise<number[]> {
  const retries = 3
  const baseDelay = 1000

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await ai.models.embedContent({
        model: "gemini-embedding-2",
        contents: text,
        config: { outputDimensionality: 768 },
      })

      if (!response.embeddings?.[0]?.values) {
        throw new Error("Failed to generate embedding from Gemini API")
      }

      return response.embeddings[0].values
    } catch (err: any) {
      const isRateLimit =
        err.status === 429 ||
        err.message?.includes("429") ||
        err.message?.includes("RESOURCE_EXHAUSTED") ||
        err.message?.includes("quota")

      if (isRateLimit && attempt < retries - 1) {
        let waitMs = baseDelay * Math.pow(2, attempt)
        const match = err.message?.match(/retry in ([\d.]+)s/i)
        if (match && match[1]) {
          const seconds = parseFloat(match[1])
          if (seconds <= 10) {
            waitMs = Math.ceil((seconds + 0.5) * 1000)
          }
        }
        console.warn(
          `[getEmbedding] Rate limited. Retrying in ${waitMs}ms (attempt ${attempt + 1}/${retries})...`
        )
        await new Promise((resolve) => setTimeout(resolve, waitMs))
      } else {
        throw err
      }
    }
  }
  throw new Error("Failed to generate embedding after retries")
}

export async function getBatchEmbeddings(texts: string[]): Promise<number[][]> {
  const BATCH_SIZE = 100
  const embeddings: number[][] = []

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE)

    let response: any
    const retries = 3
    const baseDelay = 1000

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        response = await ai.models.embedContent({
          model: "gemini-embedding-2",
          contents: batch.map((text) => ({ parts: [{ text }] })),
          config: { outputDimensionality: 768 },
        })
        break
      } catch (err: any) {
        const isRateLimit =
          err.status === 429 ||
          err.message?.includes("429") ||
          err.message?.includes("RESOURCE_EXHAUSTED") ||
          err.message?.includes("quota")

        if (isRateLimit && attempt < retries - 1) {
          let waitMs = baseDelay * Math.pow(2, attempt)
          const match = err.message?.match(/retry in ([\d.]+)s/i)
          if (match && match[1]) {
            const seconds = parseFloat(match[1])
            // If retry wait time is small (<= 10s), wait locally.
            // If it is large, bubble it up to let QStash queue queue the retry.
            if (seconds <= 10) {
              waitMs = Math.ceil((seconds + 0.5) * 1000)
            } else {
              throw err
            }
          }
          console.warn(
            `Gemini API 429 Rate Limit hit. Retrying batch in ${waitMs}ms (attempt ${attempt + 1}/${retries})...`
          )
          await new Promise((resolve) => setTimeout(resolve, waitMs))
        } else {
          throw err
        }
      }
    }

    if (
      !response ||
      !response.embeddings ||
      response.embeddings.length !== batch.length
    ) {
      throw new Error("Failed to generate batch embeddings from Gemini API")
    }

    for (const embedding of response.embeddings) {
      if (!embedding.values) {
        throw new Error("Empty embedding returned from Gemini API")
      }
      embeddings.push(embedding.values)
    }
  }

  return embeddings
}
