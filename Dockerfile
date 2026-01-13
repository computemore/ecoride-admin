# -----------------------------------------------------------------------------
# Dockerfile for driver-admin (Render Compatible)
# -----------------------------------------------------------------------------
# --- Build Stage ---
FROM node:20-alpine AS build
WORKDIR /app

# 1. Isolation: Copy only driver-admin specific files
COPY package.json ./
COPY package-lock.json* ./

# 2. Install dependencies (Clean install for stability)
RUN npm install --ignore-scripts

# 3. Copy source code
COPY . .

# 4. Build
RUN npm run build

# --- Production Stage ---
FROM nginx:alpine

# Copy built assets
COPY --from=build /app/dist /usr/share/nginx/html

# -----------------------------------------------------------------------------
# FIXED: Dynamic Nginx Configuration
# -----------------------------------------------------------------------------
# We write to /etc/nginx/templates/default.conf.template
# The Nginx Docker image automatically converts this to default.conf
# replacing any variables defined in the environment.
# -----------------------------------------------------------------------------

RUN rm -f /etc/nginx/conf.d/default.conf \
    && mkdir -p /etc/nginx/templates \
    && cat > /etc/nginx/templates/default.conf.template <<'EOF'
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # Handle client-side routing (SPA)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to the Render Backend
    location /api/ {
        # ${API_URL} will be replaced by the Env Var at runtime
        proxy_pass ${API_URL}/api/;
        
        # Standard Proxy Headers
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;

        # SSL Configuration (Critical for Render-to-Render https calls)
        proxy_ssl_server_name on;
        proxy_ssl_protocols TLSv1.2 TLSv1.3;
    }

    # Caching for static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

EXPOSE 80
# We use the default Nginx entrypoint, which handles the template substitution
CMD ["nginx", "-g", "daemon off;"]