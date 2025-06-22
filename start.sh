#!/bin/bash

echo "🚀 Installing uv..."
curl -Ls https://astral.sh/uv/install.sh | bash

# Ensure the newly installed uv is in PATH
export PATH="$HOME/.local/bin:$PATH"

echo "📦 Installing backend dependencies..."
cd backend
uv pip install --system --project .

echo "🌐 Building frontend..."
cd ../frontend
npm install
npm run build
cd ..

echo "🔥 Starting FastAPI app using uv..."
cd backend
uv run fastapi dev