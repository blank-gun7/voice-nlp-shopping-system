FROM node:20-slim

WORKDIR /app

# Install dependencies first (layer-cached unless package files change)
COPY package.json package-lock.json* ./
RUN npm install

# Copy source (hot-reload via volume mount in dev — this is the fallback)
COPY . .

EXPOSE 5173

# Vite dev server — expose on all interfaces so Docker port mapping works
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
