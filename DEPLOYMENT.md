# 🚀 Hướng Dẫn Deploy DocShare Platform trên VPS

## 📋 Yêu Cầu Hệ Thống

- **OS**: Ubuntu 20.04+ / Debian 11+ / CentOS 8+
- **RAM**: Tối thiểu 2GB (khuyến nghị 4GB+)
- **CPU**: 2 cores+
- **Disk**: 20GB+
- **Network**: Public IP hoặc domain đã trỏ về VPS

---

## 🔧 Bước 1: Cài Đặt Các Dependencies

### 1.1 Cập nhật hệ thống

```bash
sudo apt update && sudo apt upgrade -y
```

### 1.2 Cài đặt Node.js (v20+)

```bash
# Cài đặt NVM (Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash

# Load NVM
source ~/.bashrc
# hoặc
source ~/.zshrc

# Cài đặt Node.js LTS
nvm install 20
nvm use 20
nvm alias default 20

# Kiểm tra
node --version  # v20.x.x
npm --version   # 10.x.x
```

### 1.3 Cài đặt PM2 (Process Manager)

```bash
npm install -g pm2

# Thiết lập PM2 khởi động cùng hệ thống
pm2 startup
# Chạy lệnh được hiển thị (sudo env PATH=...)
```

### 1.4 Cài đặt Cloudflared (Cloudflare Tunnel)

```bash
# Cho Ubuntu/Debian
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared.deb
rm cloudflared.deb

# Kiểm tra
cloudflared --version
```

### 1.5 Cài đặt Git

```bash
sudo apt install -y git
```

### 1.6 (Optional) Cài đặt serve cho Frontend

```bash
npm install -g serve
```

---

## 📥 Bước 2: Clone Project

```bash
# Tạo thư mục và clone
cd ~
git clone https://github.com/itstandu/ai-docshare-platform.git
cd ai-docshare-platform
```

---

## ⚙️ Bước 3: Cấu Hình Environment

### 3.1 Backend Environment

```bash
# Copy file example và chỉnh sửa
cp backend/.env.example backend/.env
nano backend/.env
```

**Các biến cần cấu hình trong `backend/.env`:**

```env
# Database - Lấy từ Prisma Postgres hoặc PostgreSQL của bạn
DATABASE_URL="postgresql://user:password@host:5432/database?schema=public"

# JWT - ĐỔI SECRETS NÀY!
JWT_ACCESS_SECRET="your-random-secret-key-64-characters-long-here"
JWT_REFRESH_SECRET="another-random-secret-key-64-characters-here"

# CORS - Thêm domain của bạn
CORS_ORIGIN="https://yourdomain.com,http://localhost:5173"

# Server
PORT=8080
NODE_ENV="production"

# Email - Cấu hình SMTP
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your-email@gmail.com
MAIL_PASSWORD="your-app-password"
MAIL_FROM=your-email@gmail.com

# Frontend URL
FRONTEND_URL=https://yourdomain.com

# Cloudflare R2 - Storage
CLOUDFLARE_R2_ENDPOINT=https://your-account.r2.cloudflarestorage.com
CLOUDFLARE_R2_ACCESS_KEY_ID=your-access-key
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your-secret-key
CLOUDFLARE_R2_BUCKET_NAME=your-bucket
CLOUDFLARE_R2_PUBLIC_URL=https://your-public-url.r2.dev

# AI - Gemini API
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL_NAME="gemini-2.0-flash"
EMBEDDING_MODEL="text-embedding-004"
EMBEDDING_AUTO_MIGRATE=true
```

### 3.2 Frontend Environment

```bash
# Copy file example và chỉnh sửa
cp frontend/.env.example frontend/.env.local
nano frontend/.env.local
```

**Nội dung `frontend/.env.local`:**

```env
# API URL - Đổi thành domain API của bạn
VITE_API_BASE_URL=https://api.yourdomain.com
```

---

## 🏗️ Bước 4: Build Project

### 4.1 Build Backend

```bash
cd backend

# Cài dependencies
npm install

# Generate Prisma Client
npx prisma generate

# Build NestJS
npm run build

cd ..
```

### 4.2 Build Frontend

```bash
cd frontend

# Cài dependencies
npm install

# Build Vite
npm run build

cd ..
```

---

## 🌐 Bước 5: Cấu Hình Cloudflare Tunnel

### 5.1 Đăng nhập Cloudflare

```bash
cloudflared tunnel login
# Browser sẽ mở, đăng nhập và authorize
```

### 5.2 Tạo Tunnel

```bash
# Tạo tunnel mới
cloudflared tunnel create docshare-tunnel

# Lấy Tunnel ID
cloudflared tunnel list
```

### 5.3 Cấu hình Tunnel

```bash
# Tạo file config
mkdir -p ~/.cloudflared
nano ~/.cloudflared/config.yml
```

**Nội dung `~/.cloudflared/config.yml`:**

```yaml
tunnel: YOUR_TUNNEL_ID_HERE
credentials-file: /home/YOUR_USERNAME/.cloudflared/YOUR_TUNNEL_ID_HERE.json

ingress:
  # API Backend
  - hostname: api.yourdomain.com
    service: http://localhost:8080
    originRequest:
      noTLSVerify: true

  # Frontend
  - hostname: yourdomain.com
    service: http://localhost:5173
    originRequest:
      noTLSVerify: true

  # Wildcard (optional)
  - hostname: '*.yourdomain.com'
    service: http://localhost:5173

  # Catch-all (required)
  - service: http_status:404
```

### 5.4 Cấu hình DNS Routes

```bash
cloudflared tunnel route dns docshare-tunnel yourdomain.com
cloudflared tunnel route dns docshare-tunnel api.yourdomain.com
```

---

## 🚀 Bước 6: Chạy Ứng Dụng

### 6.1 Sử dụng Script Deploy (Recommended)

```bash
# Cấp quyền thực thi
chmod +x deploy.sh cloudflared-setup.sh start-tunnel.sh

# Chạy deploy (build + start PM2)
./deploy.sh
```

### 6.2 Hoặc Chạy Thủ Công với PM2

```bash
# Khởi động tất cả services
pm2 start ecosystem.config.js --env production

# Lưu để tự khởi động khi reboot
pm2 save
```

---

## ✅ Bước 7: Kiểm Tra

### 7.1 Kiểm tra PM2 Status

```bash
pm2 status
```

Kết quả mong đợi:

```
┌────┬────────────────────┬──────────┬──────┬───────────┬──────────┬──────────┐
│ id │ name               │ mode     │ ↺    │ status    │ cpu      │ memory   │
├────┼────────────────────┼──────────┼──────┼───────────┼──────────┼──────────┤
│ 0  │ docshare-backend   │ cluster  │ 0    │ online    │ 0%       │ 200mb    │
│ 1  │ docshare-frontend  │ cluster  │ 0    │ online    │ 0%       │ 100mb    │
│ 2  │ docshare-tunnel    │ fork     │ 0    │ online    │ 0%       │ 40mb     │
└────┴────────────────────┴──────────┴──────┴───────────┴──────────┴──────────┘
```

### 7.2 Kiểm tra Logs

```bash
# Tất cả logs
pm2 logs

# Log riêng từng service
pm2 logs docshare-backend
pm2 logs docshare-frontend
pm2 logs docshare-tunnel
```

### 7.3 Test Endpoints

```bash
# Test Frontend
curl -I https://yourdomain.com

# Test Backend API
curl https://api.yourdomain.com/health
```

---

## 🔄 Các Lệnh PM2 Thường Dùng

| Lệnh                           | Mô tả                          |
| ------------------------------ | ------------------------------ |
| `pm2 status`                   | Xem trạng thái tất cả services |
| `pm2 logs`                     | Xem logs realtime              |
| `pm2 logs --lines 100`         | Xem 100 dòng log gần nhất      |
| `pm2 restart all`              | Restart tất cả services        |
| `pm2 restart docshare-backend` | Restart backend                |
| `pm2 stop all`                 | Dừng tất cả                    |
| `pm2 delete all`               | Xóa tất cả processes           |
| `pm2 monit`                    | Monitor realtime (CPU, RAM)    |
| `pm2 save`                     | Lưu danh sách process          |

---

## 🔧 Troubleshooting

### Lỗi: Port đang bị sử dụng

```bash
# Tìm process đang dùng port
lsof -i:8080
lsof -i:5173

# Kill process
kill -9 <PID>
# hoặc
lsof -ti:8080 | xargs kill -9
```

### Lỗi: Cloudflare Tunnel không kết nối

```bash
# Kiểm tra config
cloudflared tunnel info docshare-tunnel

# Test tunnel thủ công
cloudflared tunnel run docshare-tunnel
```

### Lỗi: CORS

Kiểm tra `CORS_ORIGIN` trong `backend/.env` đã có domain frontend chưa:

```env
CORS_ORIGIN="https://yourdomain.com,https://www.yourdomain.com"
```

Sau đó restart backend:

```bash
pm2 restart docshare-backend
```

### Lỗi: Database connection

```bash
# Test connection
cd backend
npx prisma db pull

# Nếu lỗi, kiểm tra DATABASE_URL trong .env
```

### Xem error logs

```bash
# Backend errors
cat logs/backend-error.log

# Tunnel errors
cat logs/tunnel-error.log
```

---

## 📦 Cập Nhật Code

Khi có update mới từ repository:

```bash
# Pull code mới
git pull origin main

# Rebuild và restart
./deploy.sh

# Hoặc thủ công:
cd backend && npm install && npm run build && cd ..
cd frontend && npm install && npm run build && cd ..
pm2 restart all
```

---

## 🔐 Bảo Mật Khuyến Nghị

1. **Đổi JWT Secrets**: Tạo random string 64+ ký tự

   ```bash
   openssl rand -hex 32
   ```

2. **Firewall**: Chỉ mở port cần thiết

   ```bash
   sudo ufw allow ssh
   sudo ufw allow 80
   sudo ufw allow 443
   sudo ufw enable
   ```

3. **Không commit file `.env`**: Đã được cấu hình trong `.gitignore`

4. **Backup Database**: Thiết lập backup định kỳ

---

## 📞 Hỗ Trợ

- **Repository**: https://github.com/itstandu/ai-docshare-platform
- **Issues**: https://github.com/itstandu/ai-docshare-platform/issues

---

**Happy Deploying! 🎉**
