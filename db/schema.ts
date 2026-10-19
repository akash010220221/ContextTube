import {
  pgTable,
  text,
  timestamp,
  integer,
  varchar,
  customType,
  index,
  primaryKey,
} from "drizzle-orm/pg-core"

// 1. Custom pgvector data type for Gemini (text-embedding-004 outputs 768 dimensions)
const vector = customType<{ data: number[] }>({
  dataType() {
    return "vector(768)"
  },
  toDriver(value: number[]): string {
    return `[${value.join(",")}]`
  },
  fromDriver(value: unknown): number[] {
    if (typeof value !== "string") {
      return []
    }
    return value
      .replace(/[\[\]]/g, "")
      .split(",")
      .map((v) => parseFloat(v))
  },
})

// 2. Users Table
export const users = pgTable("users", {
  id: text("id").primaryKey(), // NextAuth user ID
  name: text("name"),
  email: text("email").notNull().unique(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// 3. Global Videos Cache Table
export const videos = pgTable("videos", {
  id: text("id").primaryKey(), // YouTube Video ID (e.g., 'dQw4w9WgXcQ')
  title: text("title"),
  channelName: text("channel_name"),
  durationSeconds: integer("duration_seconds"),
  status: varchar("status", { enum: ["processing", "completed", "failed"] })
    .default("processing")
    .notNull(),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// 4. Global Transcripts & Vector Embeddings (Shared Cache)
export const videoChunks = pgTable(
  "video_chunks",
  {
    id: text("id").primaryKey(), // e.g., `${videoId}_chunk_0`
    videoId: text("video_id")
      .notNull()
      .references(() => videos.id, { onDelete: "cascade" }), // Cascades only if the VIDEO itself is hard-deleted
    textContent: text("text_content").notNull(),
    startOffset: integer("start_offset").notNull(), // Seconds chunk mark starts (e.g., 125s)
    embedding: vector("embedding").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    // Index on videoId so lookups for specific video vectors are fast
    index("video_id_idx").on(table.videoId),
  ]
)

// 5. User Workspaces (Join Table linking Users to Videos)
// Handles multi-user caching & individual dashboard removals safely.
export const userVideos = pgTable(
  "user_videos",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }), // Removes link if user deletes account
    videoId: text("video_id")
      .notNull()
      .references(() => videos.id, { onDelete: "cascade" }), // Removes link if video is garbage collected
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    // Composite Primary Key guarantees a user can't save the exact same video twice
    primaryKey({ columns: [table.userId, table.videoId] }),
  ]
)

export const chats = pgTable(
  "chats",
  {
    id: text("id").primaryKey(), // Unique chat ID (e.g. nanoid)
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }), // Deletes chat session if user account is deleted
    videoId: text("video_id")
      .notNull()
      .references(() => videos.id, { onDelete: "cascade" }), // Deletes chat session if video is garbage collected
    title: text("title"), // e.g. "Discussion about Database Indexes"
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("user_video_chat_idx").on(table.userId, table.videoId)]
)

// 2. Chat Messages Table (Stores individual text exchanges)
export const messages = pgTable(
  "messages",
  {
    id: text("id").primaryKey(), // Unique message ID
    chatId: text("chat_id")
      .notNull()
      .references(() => chats.id, { onDelete: "cascade" }), // Deletes messages if the chat session is deleted
    role: varchar("role", { enum: ["user", "assistant", "system"] }).notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("chat_messages_idx").on(table.chatId)]
)
