import { InferSelectModel, InferInsertModel } from "drizzle-orm"
import {
  users,
  videos,
  videoChunks,
  userVideos,
  chats,
  messages,
} from "./schema"

export type User = InferSelectModel<typeof users>
export type Video = InferSelectModel<typeof videos>
export type VideoChunk = InferSelectModel<typeof videoChunks>
export type UserVideo = InferSelectModel<typeof userVideos>

export type NewVideo = InferInsertModel<typeof videos>
export type NewVideoChunk = InferInsertModel<typeof videoChunks>
export type NewUserVideo = InferInsertModel<typeof userVideos>

export type Chat = InferSelectModel<typeof chats>
export type NewChat = InferInsertModel<typeof chats>

export type Message = InferSelectModel<typeof messages>
export type NewMessage = InferInsertModel<typeof messages>
