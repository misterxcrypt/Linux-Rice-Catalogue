#!/bin/bash

echo "🚀 Installing uv..."
curl -Ls https://astral.sh/uv/install.sh | bash

export PATH="$HOME/.local/bin:$PATH"

echo "📦 Installing backend dependencies..."
uv pip install --system

echo "🌐 Building frontend..."
cd frontend
npm install
npm run build
cd ..

echo "🔥 Starting FastAPI dev server using uv..."
uv run fastapi dev