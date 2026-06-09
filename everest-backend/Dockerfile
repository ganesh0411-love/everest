# Use official Node 18 slim image
FROM node:18-slim

# Install poppler-utils (provides pdftoppm binary required by pdf-poppler)
# Also install required libs for sharp (native image processing)
RUN apt-get update && apt-get install -y \
    poppler-utils \
    libvips-dev \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --production

# Copy all backend source files
COPY . .

# Expose port
EXPOSE 5000

# Health check for Render
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s \
    CMD node -e "require('http').get('http://localhost:5000/api/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

# Start server
CMD ["node", "server.js"]
