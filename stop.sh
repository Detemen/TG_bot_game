#!/bin/bash

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║          Marble Race Game - Зупинка серверів              ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Зупинка Backend
if [ -f "backend.pid" ]; then
    BACKEND_PID=$(cat backend.pid)
    if ps -p $BACKEND_PID > /dev/null 2>&1; then
        echo -e "${YELLOW}🛑 Зупинка Backend (PID: $BACKEND_PID)...${NC}"
        kill $BACKEND_PID
        rm backend.pid
        echo -e "${GREEN}✓ Backend зупинено${NC}"
    else
        echo -e "${YELLOW}⚠️  Backend вже не запущено${NC}"
        rm backend.pid
    fi
else
    echo -e "${YELLOW}⚠️  PID файл Backend не знайдено${NC}"
fi

# Зупинка Frontend
if [ -f "frontend.pid" ]; then
    FRONTEND_PID=$(cat frontend.pid)
    if ps -p $FRONTEND_PID > /dev/null 2>&1; then
        echo -e "${YELLOW}🛑 Зупинка Frontend (PID: $FRONTEND_PID)...${NC}"
        kill $FRONTEND_PID
        rm frontend.pid
        echo -e "${GREEN}✓ Frontend зупинено${NC}"
    else
        echo -e "${YELLOW}⚠️  Frontend вже не запущено${NC}"
        rm frontend.pid
    fi
else
    echo -e "${YELLOW}⚠️  PID файл Frontend не знайдено${NC}"
fi

# Видалення логів (опційно)
if [ -f "backend.log" ]; then
    echo -e "${YELLOW}🗑️  Видалення backend.log${NC}"
    rm backend.log
fi

if [ -f "frontend.log" ]; then
    echo -e "${YELLOW}🗑️  Видалення frontend.log${NC}"
    rm frontend.log
fi

echo ""
echo -e "${GREEN}✅ Всі сервери зупинено${NC}"
echo ""
