# 🏥 HeLiCare Backend

> Hệ thống quản lý viện dưỡng lão - Backend API

## 📋 Mục lục

- [Công nghệ sử dụng](#-công-nghệ-sử-dụng)
- [Yêu cầu hệ thống](#-yêu-cầu-hệ-thống)
- [Cài đặt và chạy](#-cài-đặt-và-chạy)
- [Cấu hình môi trường](#-cấu-hình-môi-trường)
- [Scripts](#-scripts)
- [Troubleshooting](#-troubleshooting)

## 🛠 Công nghệ sử dụng

- **Backend Framework**: Node.js + Express.js + TypeScript
- **Database**: PostgreSQL với Prisma ORM
- **Authentication**: JWT (Access Token + Refresh Token)
- **Validation**: Express Validator
- **Security**: bcrypt, CORS
- **Development**: Nodemon, ESLint, Prettier

## 💻 Yêu cầu hệ thống

- **Node.js**: >= 18.0.0
- **npm**: >= 8.0.0
- **Docker & Docker Compose**: (cho database)

## 🚀 Cài đặt và chạy

### 1. Clone repository

```bash
git clone https://github.com/Edward205204/Capstone1-BE-HomeCare.git
cd HeLiCareBE
```

### 2. Cài đặt dependencies

```bash
npm install
```

### 3. Khởi động database (Docker)

```bash
# Khởi động PostgreSQL container
docker-compose up -d

# Kiểm tra container đang chạy
docker-compose ps
```

### 4. Cấu hình môi trường

```bash
# Tạo file .env từ template
cp .env.example .env

# Chỉnh sửa file .env theo hướng dẫn bên dưới
```

### 5. Setup database

```bash
# Chạy database migrations
npx prisma migrate dev

# Seed dữ liệu mẫu (optional)
npx prisma db seed

# Mở Prisma Studio để xem database (optional)
npx prisma studio
```

### 6. Khởi động server

```bash
# Development mode với hot reload
npm run dev
```

Server sẽ chạy tại: `http://localhost:3000`

## ⚙️ Cấu hình môi trường

Tạo file `.env` trong thư mục root với nội dung:

```env
# Database
DATABASE_URL="postgresql://admin:postgresDB@localhost:5999/HeliCareDB"

# Server
PORT=3000
NODE_ENV=development

# JWT Secrets
JWT_SECRET_KEY_ACCESS_TOKEN="your-super-secret-access-token-key-here"
JWT_SECRET_KEY_REFRESH_TOKEN="your-super-secret-refresh-token-key-here"
JWT_SECRET_KEY_COMMON_TOKEN="your-super-secret-common-token-key-here"

# Token Expiration
ACCESS_TOKEN_EXPIRATION_TIME="15m"
REFRESH_TOKEN_EXPIRATION_TIME="7d"
COMMON_VERIFY_TOKEN_EXPIRATION_TIME="24h"

# Password Security
PASSWORD_PEPPER="your-super-secret-pepper-here"

# Email Service (TODO)
# MAILGUN_API_KEY="your-mailgun-api-key"
# MAILGUN_DOMAIN="your-mailgun-domain"
```

## 📜 Scripts

```bash
# Development
npm run dev              # Chạy server development với hot reload
npm run build           # Build production
npm start              # Chạy production server

# Code Quality
npm run lint           # Kiểm tra code style
npm run lint:fix       # Tự động fix code style
npm run prettier       # Kiểm tra format
npm run prettier:fix   # Tự động format code

# Database
npx prisma migrate dev     # Chạy migrations
npx prisma generate       # Generate Prisma client
npx prisma studio        # Mở Prisma Studio GUI
npx prisma db seed       # Seed dữ liệu mẫu
npx prisma db reset      # Reset database (cẩn thận!)
```

## 🔧 Troubleshooting

### Database Connection Issues

**Lỗi**: `Can't reach database server`

```bash
# Kiểm tra Docker container
docker-compose ps

# Khởi động lại database
docker-compose down
docker-compose up -d

# Kiểm tra logs
docker-compose logs db
```

### Migration Errors

**Lỗi**: `Migration failed`

```bash
# Reset database (mất data!)
npx prisma db reset

# Hoặc fix migration manually
npx prisma migrate resolve --rolled-back "20240101000000_migration_name"
```

### Port Already in Use

**Lỗi**: `Port 3000 is already in use`

```bash
# Tìm và kill process
lsof -ti:3000 | xargs kill -9

# Hoặc đổi port trong .env
PORT=3001
```

### JWT Token Issues

**Lỗi**: `JsonWebTokenError: invalid signature`

- Kiểm tra JWT secrets trong `.env`
- Đảm bảo client gửi đúng token format: `Bearer <token>`

---

Được phát triển với ❤️ bởi C1SE.84
