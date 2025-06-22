#!/bin/bash
echo "🚀 Installing uv..."
curl -Ls https://astral.sh/uv/install.sh | bash

echo "📦 Installing project dependencies..."
~/.cargo/bin/uv pip install --system

echo "🔥 Starting FastAPI app using uv config..."
~/.cargo/bin/uv run fastapi dev