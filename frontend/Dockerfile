# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json .
RUN npm install
COPY . .
RUN npm run build

# Production: serve with nginx
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
# nginx.conf is provided by the host mount in production,
# but include a simple fallback for the frontend-only container
COPY nginx-spa.conf /etc/nginx/conf.d/default.conf
