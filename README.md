# ContextTube

ContextTube is a premium, state-of-the-art AI-powered platform for video ingestion, indexing, and interactive Retrieval-Augmented Generation (RAG) chat sessions. Users can import YouTube videos, parse and translate transcripts, generate dense vector embeddings, and stream context-aware chats utilizing Google's Gemini models and PostgreSQL's vector capabilities.

---

## 🚀 Key Features

### 1. Robust Video Ingestion & Processing
* **Custom YouTube Transcription**: Captures transcripts directly from YouTube. Includes native multi-language support that auto-translates Hindi (and other non-English languages) to English via YouTube's internal `tlang=en` parameter.
* **Rate-Limit Aware Embeddings**: Generates dense 768-dimensional embeddings using `gemini-embedding-2`. 
* **Stateful Queueing**: Utilizes Upstash Workflows to orchestrate background processing in batches of 50 chunks, introducing controlled 30-second sleeps between batches to strictly comply with the free-tier 100 RPM Gemini quota.
* **Database Persistence**: Embeddings and transcripts are stored in PostgreSQL using Neon HTTP and Drizzle ORM.

### 2. Conversational RAG Engine
* **Vector Similarity Search**: Uses PostgreSQL's `pgvector` extension to calculate Cosine Distance (`<=>`) between user query embeddings and video transcript chunks.
* **Automatic Session Persistence**: Intelligently maintains a single active chat session per video for each user. If a user starts a chat on a video they have already discussed, the API automatically restores and appends to the existing thread.
* **Resilient Streaming Response**: Delivers live streaming text via Server-Sent Events (SSE) and Next.js `ReadableStream` utilizing the `gemini-3.6-flash` model.
* **Disconnect Guards**: Employs an `isSaved` guard and a stream cancellation interceptor (`cancel()`) to ensure the assistant's response is reliably written to the database even if the user aborts or closes their tab mid-stream.
* **Rolling Message Window**: Caps prompt histories to the last 20 messages, preventing unbounded input size, saving tokens, and minimizing latency.

### 3. Refactored & Optimized Frontend Architecture
* **Decoupled Business Logic**: Moved all application logic out of the view layer into custom React Hooks:
  * [`useDashboardVideos`](/home/niraj/projects/contextTube/hooks/use-dashboard-videos.ts): Handles listing, filtering, submitting new video URLs, and polling status in the dashboard.
  * [`useVideoChat`](/home/niraj/projects/contextTube/hooks/use-video-chat.ts): Manages live streaming chat sessions, message dispatching, state restoration, and YouTube player seeks.
* **Axios Standardization**: Replaced all raw `fetch` network requests with Axios for robust error handling, progress monitoring, and cleaner API interactions.
* **Optimized Input Debouncing**: Added custom debounced search in the dashboard to minimize UI re-renders.
* **Dynamic Page Metadata**: Integrated dynamic head titles based on the active page (e.g. video title in the chat page, custom dashboard title) via Next.js App Router metadata conventions.

---

## 🛠️ System Architecture

```mermaid
graph TD
    A[User / Frontend] -->|Submit Video Link| B[process-video API]
    B -->|Trigger Job| C[Upstash Background Workflow]
    C -->|Fetch Transcript| D[lib/youtube.ts translator]
    C -->|Generate Chunks| E[Text Chunking Engine]
    C -->|Embeddings 768d| F[lib/gemini.ts embedContent]
    C -->|Save Chunks| G[(Neon Postgres Database)]
    
    A -->|POST User Message| H[chat API Route]
    H -->|Query Embedding| I[lib/gemini.ts embedContent]
    H -->|Vector Search <=>| G
    H -->|Construct Context + History| J[Gemini Flash Stream]
    J -->|Stream SSE Tokens| A
    J -->|Save Messages| G
```

---

## 📊 Database Schema (ERD)

```mermaid
erDiagram
    users {
        text id PK
        text name
        text email
        text image
        timestamp createdAt
    }
    videos {
        text id PK
        text title
        text channelName
        integer durationSeconds
        varchar status
        text errorMessage
        timestamp createdAt
    }
    user_videos {
        text userId PK, FK
        text videoId PK, FK
        timestamp createdAt
    }
    video_chunks {
        text id PK
        text videoId FK
        integer startOffset
        text textContent
        vector embedding
        timestamp createdAt
    }
    chats {
        text id PK
        text userId FK
        text videoId FK
        text title
        timestamp createdAt
    }
    messages {
        text id PK
        text chatId FK
        varchar role
        text content
        timestamp createdAt
    }

    users ||--o{ user_videos : owns
    videos ||--o{ user_videos : is_owned_by
    videos ||--o{ video_chunks : has_many
    users ||--o{ chats : starts
    videos ||--o{ chats : referenced_in
    chats ||--o{ messages : contains
```

---

## ⚙️ Environment Variables

Create a `.env` or `.env.local` file in the root directory:

```env
# Database Settings
DATABASE_URL=postgresql://neondb_owner:...@ep-...pooler.us-east-2.aws.neon.tech/neondb?sslmode=require

# Google API Configuration
GEMINI_API_KEY=your_gemini_api_key

# Authentication (NextAuth)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret
GOOGLE_ID=your_google_client_id
GOOGLE_SECRET=your_google_client_secret

# Upstash/QStash Configuration (Background Workers)
QStash_DEV=true # Enable local development mode
QSTASH_URL=https://qstash-us-east-1.upstash.io
QSTASH_TOKEN=your_qstash_token
```

---

## 📁 Repository Structure

* `hooks/use-dashboard-videos.ts`: Extracted dashboard hook managing video lists, deletion, and debounced filters.
* `hooks/use-video-chat.ts`: Custom hook containing state management for chat streams, scroll anchors, and player controllers.
* `app/api/chat/route.ts`: Contains the GET (session lists and message histories) and POST (live RAG chat streaming) endpoints.
* `app/api/process-video/route.ts`: Handles incoming video URL submissions and triggers the background processing queue.
* `app/api/workflow/route.ts`: Core Upstash workflow engine handling downloading transcripts, batching, rate-limiting delays, and database indexing.
* `lib/chat.ts`: Encapsulates chat session management, database persistence helpers, and RAG retrieval pipelines.
* `lib/gemini.ts`: Interface to Google's Gemini SDK for generating embeddings and stream generations. Includes custom rate-limit retries.
* `lib/youtube.ts`: Captures and translates YouTube captions.
* `db/schema.ts`: Database definition tables (`users`, `videos`, `videoChunks`, `chats`, `messages`).

---

## 💻 Local Development

First, install dependencies:

```bash
bun install
```

Start the local development server:

```bash
bun run dev
```
