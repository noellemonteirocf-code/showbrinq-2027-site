FROM node:22-bookworm-slim AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN npm exec --yes --package=pnpm@11.25.0 -- pnpm install --frozen-lockfile
COPY . .
RUN npm exec --yes --package=pnpm@11.25.0 -- pnpm build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN npm exec --yes --package=pnpm@11.25.0 -- pnpm install --prod --frozen-lockfile
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/dist-server ./dist-server
COPY --from=builder /app/public/manus-routes.json ./public/manus-routes.json
EXPOSE 3000
USER node
CMD ["node", "dist-server/index.mjs"]
