#!/bin/bash

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║          Marble Race Game - Запуск проекту                ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Перевірка наявності Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js не знайдено! Встановіть Node.js 18+ з https://nodejs.org${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Node.js знайдено:${NC}"
node --version
echo ""

# ============================================================
# КРОК 1: Підготовка бази даних
# ============================================================
echo -e "${BLUE}[1/4] 📦 Підготовка бази даних...${NC}"
echo ""

cd backend

# Перевірка наявності .env
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  Файл .env не знайдено, створюю...${NC}"
    cat > .env << EOF
NODE_ENV=development
HOST=0.0.0.0
PORT=4000
LOG_LEVEL=info
DATABASE_URL=prisma+postgres://accelerate.prisma-data.net/?api_key=your_api_key
EOF
    echo -e "${GREEN}✓ Файл .env створено${NC}"
    echo ""
fi

# Перевірка node_modules
if [ ! -d "node_modules" ]; then
    echo -e "${CYAN}📥 Встановлення залежностей backend...${NC}"
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Помилка встановлення залежностей backend${NC}"
        cd ..
        exit 1
    fi
    echo ""
fi

# Генерація Prisma Client
echo -e "${CYAN}🔧 Генерація Prisma Client...${NC}"
npx prisma generate
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Помилка генерації Prisma Client${NC}"
    cd ..
    exit 1
fi
echo ""

# Push схеми до БД
echo -e "${CYAN}🗄️  Синхронізація схеми бази даних...${NC}"
npx prisma db push
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Помилка синхронізації БД${NC}"
    echo ""
    echo -e "${YELLOW}💡 Підказка: Переконайтесь, що DATABASE_URL в .env правильний${NC}"
    echo -e "${YELLOW}   Для локального тестування використовуйте: npx prisma dev${NC}"
    cd ..
    exit 1
fi
echo ""

cd ..

# ============================================================
# КРОК 2: Підготовка Frontend
# ============================================================
echo -e "${BLUE}[2/4] 🎨 Підготовка Frontend...${NC}"
echo ""

cd frontend

# Перевірка наявності .env
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  Файл .env не знайдено, створюю...${NC}"
    cat > .env << EOF
VITE_API_URL=http://localhost:4000
VITE_API_BASE_URL=http://localhost:4000
VITE_WS_BASE_URL=ws://localhost:4000
VITE_DEV_MODE=true
EOF
    echo -e "${GREEN}✓ Файл .env створено${NC}"
    echo ""
fi

# Перевірка node_modules
if [ ! -d "node_modules" ]; then
    echo -e "${CYAN}📥 Встановлення залежностей frontend...${NC}"
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Помилка встановлення залежностей frontend${NC}"
        cd ..
        exit 1
    fi
    echo ""
fi

cd ..

# ============================================================
# КРОК 3: Запуск Backend
# ============================================================
echo -e "${BLUE}[3/4] 🚀 Запуск Backend сервера...${NC}"
echo ""

# Запуск у фоновому режимі
cd backend
npm run dev > ../backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > ../backend.pid
cd ..

sleep 3

# ============================================================
# КРОК 4: Запуск Frontend
# ============================================================
echo -e "${BLUE}[4/4] 🎨 Запуск Frontend сервера...${NC}"
echo ""

cd frontend
npm run dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > ../frontend.pid
cd ..

sleep 3

# ============================================================
# Фінальне повідомлення
# ============================================================
echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                  ✅ Проект запущено!                       ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}📡 Backend:   http://localhost:4000${NC}"
echo -e "${GREEN}🎮 Frontend:  http://localhost:5173${NC}"
echo ""
echo "📚 Документація:"
echo "   - API endpoints: backend/API.md"
echo "   - Тестування:    TESTING.md"
echo ""
echo "🔧 Процеси:"
echo "   - Backend PID:  $BACKEND_PID"
echo "   - Frontend PID: $FRONTEND_PID"
echo ""
echo "📋 Логи:"
echo "   - Backend:  tail -f backend.log"
echo "   - Frontend: tail -f frontend.log"
echo ""
echo "💡 Для тестування:"
echo "   1. Відкрийте http://localhost:5173 в браузері"
echo "   2. Поповніть баланс через API (див. TESTING.md)"
echo "   3. Створіть гру та приєднайтесь!"
echo ""
echo -e "${YELLOW}⚠️  Щоб зупинити сервери, запустіть: ./stop.sh${NC}"
echo ""
