import { Client } from "@upstash/workflow"

if (!process.env.QSTASH_TOKEN) {
  throw new Error("QSTASH_TOKEN is not defined")
}

export const workflowClient = new Client({
  baseUrl: process.env.QSTASH_URL, // Optional, falls back to Upstash production default if not provided
  token: process.env.QSTASH_TOKEN,
})
