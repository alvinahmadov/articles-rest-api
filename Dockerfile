# Stage 1: Install ALL dependencies (including devDependencies)
# We separate dependency installation from build so Docker
# can cache the install layer when only lockfile changes.
FROM node:24-slim AS deps

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV APP_HOME=/usr/src/app

WORKDIR $APP_HOME

RUN corepack enable && corepack prepare pnpm@latest --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
  pnpm install --frozen-lockfile

# Stage 2: Build TypeScript source
FROM deps AS build

WORKDIR $APP_HOME

COPY --from=deps $APP_HOME/node_modules ./node_modules
COPY . .

RUN pnpm run build

# ============================================================
# Stage 3: Production image — only shipping runtime deps + JS
# ============================================================
FROM node:24-slim AS production

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV APP_HOME=/usr/src/app
ENV NODE_ENV=production

RUN corepack enable && corepack prepare pnpm@latest --activate && \
  addgroup --system app && adduser --system --ingroup app app

WORKDIR $APP_HOME

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install only production dependencies
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
  pnpm install --prod --frozen-lockfile && \
  pnpm store prune

COPY --from=build $APP_HOME/dist ./dist

RUN chown -R app:app $APP_HOME

USER app

EXPOSE 3000

CMD ["node", "dist/main.js"]
