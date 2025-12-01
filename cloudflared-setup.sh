#!/bin/bash

# Cloudflare Tunnel Setup Script cho DocShare Platform
# Domain: itstandu.site

set -e

TUNNEL_NAME="docshare-tunnel"
DOMAIN="itstandu.site"
API_SUBDOMAIN="api.${DOMAIN}"

echo "🌐 Cấu hình Cloudflare Tunnel cho ${DOMAIN}..."

# Kiểm tra cloudflared đã cài đặt chưa
if ! command -v cloudflared &> /dev/null; then
    echo "📦 Cài đặt cloudflared..."
    # Cho Linux
    curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
    sudo dpkg -i cloudflared.deb
    rm cloudflared.deb
fi

echo "✅ cloudflared version: $(cloudflared --version)"

# Đăng nhập Cloudflare (nếu chưa)
if [ ! -f ~/.cloudflared/cert.pem ]; then
    echo "🔐 Đăng nhập Cloudflare..."
    cloudflared tunnel login
fi

# Kiểm tra tunnel đã tồn tại chưa
if cloudflared tunnel list | grep -q "${TUNNEL_NAME}"; then
    echo "⚠️  Tunnel '${TUNNEL_NAME}' đã tồn tại"
else
    echo "🚇 Tạo tunnel mới: ${TUNNEL_NAME}"
    cloudflared tunnel create ${TUNNEL_NAME}
fi

# Lấy Tunnel ID
TUNNEL_ID=$(cloudflared tunnel list | grep "${TUNNEL_NAME}" | awk '{print $1}')
echo "📋 Tunnel ID: ${TUNNEL_ID}"

# Tạo file config
CONFIG_DIR=~/.cloudflared
mkdir -p ${CONFIG_DIR}

echo "📝 Tạo file cấu hình tunnel..."
cat > ${CONFIG_DIR}/config.yml << EOF
tunnel: ${TUNNEL_ID}
credentials-file: ${CONFIG_DIR}/${TUNNEL_ID}.json

ingress:
  # API Backend - api.itstandu.site -> localhost:8080
  - hostname: ${API_SUBDOMAIN}
    service: http://localhost:8080
    originRequest:
      noTLSVerify: true

  # Frontend - itstandu.site -> localhost:5173
  - hostname: ${DOMAIN}
    service: http://localhost:5173
    originRequest:
      noTLSVerify: true

  # Wildcard fallback
  - hostname: "*.${DOMAIN}"
    service: http://localhost:5173

  # Catch-all (required)
  - service: http_status:404
EOF

echo "✅ Config file created at ${CONFIG_DIR}/config.yml"

# Cấu hình DNS
echo "🌍 Cấu hình DNS routes..."
cloudflared tunnel route dns ${TUNNEL_NAME} ${DOMAIN} 2>/dev/null || echo "DNS route cho ${DOMAIN} đã tồn tại"
cloudflared tunnel route dns ${TUNNEL_NAME} ${API_SUBDOMAIN} 2>/dev/null || echo "DNS route cho ${API_SUBDOMAIN} đã tồn tại"

echo ""
echo "✅ Cấu hình Cloudflare Tunnel hoàn tất!"
echo ""
echo "📌 Để chạy tunnel thủ công:"
echo "   cloudflared tunnel run ${TUNNEL_NAME}"
echo ""
echo "📌 Để chạy tunnel như service (systemd):"
echo "   sudo cloudflared service install"
echo "   sudo systemctl start cloudflared"
echo "   sudo systemctl enable cloudflared"
echo ""
echo "🌐 URLs sau khi tunnel chạy:"
echo "   Frontend: https://${DOMAIN}"
echo "   Backend:  https://${API_SUBDOMAIN}"
