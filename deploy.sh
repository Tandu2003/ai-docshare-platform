#!/bin/bash

# Deploy script cho DocShare Platform với PM2

set -e

echo "🚀 Bắt đầu deploy DocShare Platform..."

# Tạo thư mục logs nếu chưa có
mkdir -p logs

# Build Backend
echo "📦 Building Backend..."
cd backend
npm install
npx prisma generate
npm run build
cd ..

# Build Frontend
echo "📦 Building Frontend..."
cd frontend
npm install
npm run build
cd ..

# Dừng PM2 processes cũ
echo "🛑 Dừng processes cũ..."
pm2 delete all 2>/dev/null || true

# Kill process đang dùng port 8080 và 5173 nếu có
echo "🧹 Giải phóng ports..."
lsof -ti:8080 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true
sleep 2

# Khởi động với PM2
echo "🔄 Khởi động ứng dụng với PM2..."
pm2 start ecosystem.config.js --env production

# Lưu process list
pm2 save

echo "✅ Deploy hoàn tất!"
echo ""
echo "📊 Kiểm tra trạng thái: pm2 status"
echo "📋 Xem logs backend: pm2 logs docshare-backend"
echo "📋 Xem logs frontend: pm2 logs docshare-frontend"
echo ""
echo "🌐 Backend: http://localhost:8080"
echo "🌐 Frontend: http://localhost:5173"
