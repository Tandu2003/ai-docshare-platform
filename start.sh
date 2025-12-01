#!/bin/bash

# ===========================================
# Quick Start Script - Chỉ khởi động PM2
# Dùng khi đã build xong, chỉ cần restart
# ===========================================

echo "🔄 Khởi động lại DocShare Platform..."

# Dừng processes cũ
pm2 delete all 2>/dev/null || true

# Kill ports
fuser -k 8080/tcp 2>/dev/null || true
fuser -k 5173/tcp 2>/dev/null || true
sleep 1

# Start PM2
pm2 start ecosystem.config.js --env production
pm2 save

echo ""
echo "✅ Đã khởi động!"
echo "🌐 Frontend: https://docshare.io.vn"
echo "🔌 API: https://api.docshare.io.vn"
echo ""
pm2 status
