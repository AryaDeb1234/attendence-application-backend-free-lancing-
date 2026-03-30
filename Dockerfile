# Stage 1: Build
FROM node:18-alpine AS builder
WORKDIR /app

COPY package*.json ./
# Use 'npm ci' for faster, reproducible builds
RUN npm ci

COPY . .
RUN npm run build

# 👇 ADD THIS LINE
RUN mkdir -p /app/dist/public/temp && chmod -R 777 /app/dist

# Stage 2: Production
FROM node:18-alpine AS runner
WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Copy only the essentials from the builder stage
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist

# Install ONLY production dependencies
RUN npm ci --only=production

# Run as a non-privileged user for security
USER node

EXPOSE 3000

CMD ["node", "dist/index.js"] 










# # Simple single-stage Dockerfile (not optimized for production)

# FROM node:18-alpine

# WORKDIR /app

# # install deps
# COPY package*.json ./
# RUN npm install

# # copy source
# COPY . .

# # build typescript
# RUN npm run build

# EXPOSE 3000

# CMD ["npm", "start"]
# # CMD ["npm", "run", "dev"]