#!/bin/bash

# ===========================================
# Build Script - Build Frontend & Backend
# Then restart PM2 processes
# ===========================================

set -e

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║        🔨 Building DocShare Platform                      ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# ====== UPDATE CODE FROM GIT ======
echo "🔄 [1/4] Updating code from Git..."
git fetch
git pull
echo "✅ Code updated successfully"
echo ""

# ====== BUILD FRONTEND ======
echo "📦 [2/4] Building Frontend..."
cd frontend
npm install
npm run build
cd ..
echo "✅ Frontend built successfully"
echo ""

# ====== BUILD BACKEND ======
echo "📦 [3/4] Building Backend..."
cd backend
npm install
npm run build
cd ..
echo "✅ Backend built successfully"
echo ""

# ====== RESTART PM2 ======
echo "🔄 [4/4] Restarting PM2 processes..."

# Dừng processes cũ
pm2 delete all 2>/dev/null || true

# Kill ports nếu bị chiếm
fuser -k 8080/tcp 2>/dev/null || true
fuser -k 5173/tcp 2>/dev/null || true
sleep 1

# Khởi động PM2
pm2 start ecosystem.config.js --env production

# Lưu để auto-start
pm2 save

# Restart all processes
pm2 restart all

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║              ✅ BUILD & RESTART HOÀN TẤT!                 ║"
echo "╠═══════════════════════════════════════════════════════════╣"
echo "║                                                           ║"
echo "║  📊 Xem trạng thái: pm2 status                            ║"
echo "║  📋 Xem logs:       pm2 logs                              ║"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
pm2 status

