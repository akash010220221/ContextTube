# Stage 1: Install dependencies
FROM oven/bun:alpine AS deps
WORKDIR /app

# Copy package management files
COPY package.json bun.lock ./

# Install project dependencies
RUN bun install --frozen-lockfile

# Stage 2: Build the Next.js application
FROM oven/bun:alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set environment variables for compilation
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV DATABASE_URL="postgres://dummy:dummy@localhost:5432/dummy"
ENV GEMINI_API_KEY="dummy-gemini-key"
ENV QSTASH_TOKEN="dummy-qstash-token"

# Build Next.js with cache mounting to speed up rebuilds
RUN --mount=type=cache,target=/app/.next/cache bun run build

# Stage 3: Production runner stage (ultra-lightweight)
FROM oven/bun:alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Set permissions for pre-rendering cache and static asset storage
RUN mkdir -p .next && chown -R bun:bun .next

# Switch to the pre-configured unprivileged non-root user
USER bun

# Copy public static assets
COPY --from=builder /app/public ./public

# Copy the standalone build output (contains minimal server code + server dependencies)
COPY --from=builder --chown=bun:bun /app/.next/standalone ./
COPY --from=builder --chown=bun:bun /app/.next/static ./.next/static

EXPOSE 3000

# Start server using Next.js standalone entry point
CMD ["bun", "run", "server.js"]
