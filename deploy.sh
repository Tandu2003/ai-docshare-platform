#!/bin/bash

# ===========================================
# Deploy Script - DocShare Platform
# Domain: docshare.io.vn
# ===========================================

set -e

DOMAIN="docshare.io.vn"
API_DOMAIN="api.${DOMAIN}"

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║        🚀 Deploy DocShare Platform - ${DOMAIN}      ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Tạo thư mục logs
mkdir -p logs

# ====== BUILD BACKEND ======
echo "📦 [1/4] Building Backend..."
cd backend
npm install --legacy-peer-deps
npx prisma generate
npm run build
cd ..
echo "✅ Backend built successfully"
echo ""

# ====== BUILD FRONTEND ======
echo "📦 [2/4] Building Frontend..."
cd frontend
npm install --legacy-peer-deps
npm run build
cd ..
echo "✅ Frontend built successfully"
echo ""

# ====== SETUP TUNNEL ======
echo "🌐 [3/4] Setting up Cloudflare Tunnel..."
./cloudflared-setup.sh
echo ""

# ====== START PM2 ======
echo "🔄 [4/4] Starting PM2 processes..."

# Dừng processes cũ
pm2 delete all 2>/dev/null || true

# Kill ports nếu bị chiếm (dùng fuser thay vì lsof)
fuser -k 8080/tcp 2>/dev/null || true
fuser -k 5173/tcp 2>/dev/null || true
sleep 2

# Khởi động PM2
pm2 start ecosystem.config.js --env production

# Lưu để auto-start
pm2 save

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║              ✅ DEPLOY HOÀN TẤT!                          ║"
echo "╠═══════════════════════════════════════════════════════════╣"
echo "║                                                           ║"
echo "║  🌐 Frontend: https://${DOMAIN}                    ║"
echo "║  🔌 API:      https://${API_DOMAIN}                ║"
echo "║                                                           ║"
echo "║  📊 Xem trạng thái: pm2 status                            ║"
echo "║  📋 Xem logs:       pm2 logs                              ║"
echo "║  🔄 Restart:        pm2 restart all                       ║"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
