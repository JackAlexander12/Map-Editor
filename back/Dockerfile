# backend/Dockerfile
FROM node:20-bullseye-slim

WORKDIR /app
COPY back/package*.json ./
RUN npm ci --omit=dev

COPY back/ ./

ENV NODE_ENV=production
EXPOSE 5000
CMD ["node", "server.js"]

