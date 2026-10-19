CREATE TABLE "chats" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"video_id" text NOT NULL,
	"title" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" text PRIMARY KEY,
	"chat_id" text NOT NULL,
	"role" varchar NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_videos" (
	"user_id" text,
	"video_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_videos_pkey" PRIMARY KEY("user_id","video_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY,
	"name" text,
	"email" text NOT NULL UNIQUE,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "video_chunks" (
	"id" text PRIMARY KEY,
	"video_id" text NOT NULL,
	"text_content" text NOT NULL,
	"start_offset" integer NOT NULL,
	"embedding" vector(768) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "videos" (
	"id" text PRIMARY KEY,
	"title" text,
	"channel_name" text,
	"duration_seconds" integer,
	"status" varchar DEFAULT 'processing' NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "user_video_chat_idx" ON "chats" ("user_id","video_id");--> statement-breakpoint
CREATE INDEX "chat_messages_idx" ON "messages" ("chat_id");--> statement-breakpoint
CREATE INDEX "video_id_idx" ON "video_chunks" ("video_id");--> statement-breakpoint
ALTER TABLE "chats" ADD CONSTRAINT "chats_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "chats" ADD CONSTRAINT "chats_video_id_videos_id_fkey" FOREIGN KEY ("video_id") REFERENCES "videos"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_chat_id_chats_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "chats"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "user_videos" ADD CONSTRAINT "user_videos_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "user_videos" ADD CONSTRAINT "user_videos_video_id_videos_id_fkey" FOREIGN KEY ("video_id") REFERENCES "videos"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "video_chunks" ADD CONSTRAINT "video_chunks_video_id_videos_id_fkey" FOREIGN KEY ("video_id") REFERENCES "videos"("id") ON DELETE CASCADE;