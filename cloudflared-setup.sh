#!/bin/bash

# ===========================================
# Cloudflare Tunnel Setup Script
# Domain: docshare.io.vn
# Tunnel: docshare-iovn
# ===========================================

set -e

TUNNEL_NAME="docshare-iovn"
DOMAIN="docshare.io.vn"
API_SUBDOMAIN="api.${DOMAIN}"
CONFIG_DIR=~/.cloudflared

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║     🚀 Cloudflare Tunnel Setup - DocShare Platform        ║"
echo "║     Domain: ${DOMAIN}                              ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Kiểm tra cloudflared đã cài đặt chưa
if ! command -v cloudflared &> /dev/null; then
    echo "📦 Cài đặt cloudflared..."
    curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
    sudo dpkg -i cloudflared.deb
    rm cloudflared.deb
fi

echo "✅ cloudflared version: $(cloudflared --version)"

# Kiểm tra đã đăng nhập chưa
if [ ! -f ~/.cloudflared/cert.pem ]; then
    echo ""
    echo "❌ Bạn chưa đăng nhập Cloudflare!"
    echo "👉 Chạy lệnh: cloudflared tunnel login"
    echo "   Sau đó chạy lại script này."
    exit 1
fi

echo "✅ Đã đăng nhập Cloudflare"

# Kiểm tra và xử lý tunnel
echo ""
echo "🔍 Kiểm tra tunnel '${TUNNEL_NAME}'..."

# Lấy tunnel ID từ cloudflared tunnel list (format: ID NAME CREATED CONNECTIONS)
EXISTING_TUNNEL=$(cloudflared tunnel list --output json 2>/dev/null | grep -o '"id":"[^"]*"[^}]*"name":"'"${TUNNEL_NAME}"'"' | head -1)

if [ -n "$EXISTING_TUNNEL" ]; then
    echo "⚠️  Tunnel '${TUNNEL_NAME}' đã tồn tại"
    TUNNEL_ID=$(cloudflared tunnel list --output json 2>/dev/null | python3 -c "import sys,json; tunnels=json.load(sys.stdin); print(next((t['id'] for t in tunnels if t['name']=='${TUNNEL_NAME}'),''))" 2>/dev/null)

    # Fallback nếu python không hoạt động
    if [ -z "$TUNNEL_ID" ]; then
        TUNNEL_ID=$(cloudflared tunnel list | grep -E "^[a-f0-9-]+\s+${TUNNEL_NAME}\s+" | awk '{print $1}')
    fi
else
    echo "🚇 Tạo tunnel mới: ${TUNNEL_NAME}"
    cloudflared tunnel create ${TUNNEL_NAME}
    TUNNEL_ID=$(cloudflared tunnel list --output json 2>/dev/null | python3 -c "import sys,json; tunnels=json.load(sys.stdin); print(next((t['id'] for t in tunnels if t['name']=='${TUNNEL_NAME}'),''))" 2>/dev/null)

    # Fallback nếu python không hoạt động
    if [ -z "$TUNNEL_ID" ]; then
        TUNNEL_ID=$(cloudflared tunnel list | grep -E "^[a-f0-9-]+\s+${TUNNEL_NAME}\s+" | awk '{print $1}')
    fi
fi

# Kiểm tra Tunnel ID có hợp lệ không
if [ -z "$TUNNEL_ID" ]; then
    echo "❌ Không thể lấy Tunnel ID! Vui lòng kiểm tra lại."
    echo "   Chạy: cloudflared tunnel list"
    exit 1
fi

echo "📋 Tunnel ID: ${TUNNEL_ID}"

# Kiểm tra credentials file có tồn tại không
CREDENTIALS_FILE="${CONFIG_DIR}/${TUNNEL_ID}.json"
if [ ! -f "$CREDENTIALS_FILE" ]; then
    echo ""
    echo "❌ Credentials file không tồn tại: $CREDENTIALS_FILE"
    echo ""
    echo "👉 Có thể tunnel đã được tạo nhưng credentials bị mất."
    echo "   Để sửa, hãy xóa tunnel cũ và tạo lại:"
    echo "   1. cloudflared tunnel delete ${TUNNEL_NAME}"
    echo "   2. Chạy lại script này"
    echo ""
    read -p "Bạn có muốn xóa tunnel cũ và tạo lại không? (y/n): " confirm
    if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
        echo "🗑️  Xóa tunnel cũ..."
        cloudflared tunnel delete ${TUNNEL_NAME} 2>/dev/null || true
        echo "🚇 Tạo tunnel mới: ${TUNNEL_NAME}"
        cloudflared tunnel create ${TUNNEL_NAME}
        TUNNEL_ID=$(cloudflared tunnel list --output json 2>/dev/null | python3 -c "import sys,json; tunnels=json.load(sys.stdin); print(next((t['id'] for t in tunnels if t['name']=='${TUNNEL_NAME}'),''))" 2>/dev/null)
        if [ -z "$TUNNEL_ID" ]; then
            TUNNEL_ID=$(cloudflared tunnel list | grep -E "^[a-f0-9-]+\s+${TUNNEL_NAME}\s+" | awk '{print $1}')
        fi
        echo "📋 Tunnel ID mới: ${TUNNEL_ID}"
        CREDENTIALS_FILE="${CONFIG_DIR}/${TUNNEL_ID}.json"
    else
        exit 1
    fi
fi

echo "✅ Credentials file: $CREDENTIALS_FILE"

# Tạo file config
mkdir -p ${CONFIG_DIR}

echo ""
echo "📝 Tạo file cấu hình tunnel..."
cat > ${CONFIG_DIR}/config.yml << EOF
tunnel: ${TUNNEL_ID}
credentials-file: ${CREDENTIALS_FILE}

ingress:
  # API Backend - api.docshare.io.vn -> localhost:8080
  - hostname: ${API_SUBDOMAIN}
    service: http://localhost:8080
    originRequest:
      noTLSVerify: true

  # Frontend - docshare.io.vn -> localhost:5173
  - hostname: ${DOMAIN}
    service: http://localhost:5173
    originRequest:
      noTLSVerify: true

  # www subdomain
  - hostname: www.${DOMAIN}
    service: http://localhost:5173
    originRequest:
      noTLSVerify: true

  # Catch-all (required)
  - service: http_status:404
EOF

echo "✅ Config file: ${CONFIG_DIR}/config.yml"

# Cấu hình DNS routes
echo ""
echo "🌍 Cấu hình DNS routes..."

# Route cho domain chính
cloudflared tunnel route dns ${TUNNEL_NAME} ${DOMAIN} 2>/dev/null && echo "   ✓ ${DOMAIN}" || echo "   ✓ ${DOMAIN} (đã tồn tại)"

# Route cho API subdomain
cloudflared tunnel route dns ${TUNNEL_NAME} ${API_SUBDOMAIN} 2>/dev/null && echo "   ✓ ${API_SUBDOMAIN}" || echo "   ✓ ${API_SUBDOMAIN} (đã tồn tại)"

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║              ✅ Setup Tunnel hoàn tất!                    ║"
echo "╠═══════════════════════════════════════════════════════════╣"
echo "║  🌐 Frontend: https://${DOMAIN}                    ║"
echo "║  🔌 Backend:  https://${API_SUBDOMAIN}                ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
