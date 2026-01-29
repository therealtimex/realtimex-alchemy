#!/bin/bash

# REALTIMEX ALCHEMY MIGRATION TOOL
set -e

echo "🚀 Starting Alchemist Migration..."

SUPABASE_CMD="supabase"
if ! command -v supabase &> /dev/null; then
    SUPABASE_CMD="npx supabase"
fi

# Credentials
if [ -z "$SUPABASE_PROJECT_ID" ]; then
    read -p "👉 Enter Supabase Project ID: " SUPABASE_PROJECT_ID
fi

if [ -z "$SUPABASE_PROJECT_ID" ]; then
    echo "❌ Error: Project ID required"
    exit 1
fi

echo "🔗 Linking to project: $SUPABASE_PROJECT_ID"
$SUPABASE_CMD link --project-ref "$SUPABASE_PROJECT_ID"

echo "📂 Pushing Database Changes..."
$SUPABASE_CMD db push --include-all --yes

echo "⚙️  Pushing Project Configuration..."
$SUPABASE_CMD config push --yes

echo "🔐 Setting up Edge Function secrets..."
# Generate a random key if not provided (internal use)
ENCRYPTION_KEY=$(openssl rand -base64 32 | tr -d /=+ | cut -c1-32)
$SUPABASE_CMD secrets set TOKEN_ENCRYPTION_KEY="$ENCRYPTION_KEY" --yes || echo "⚠️ Secret already set or failed."

echo "⚡ Deploying Edge Functions..."
# Deploy all functions one by one
if [ -d "supabase/functions" ]; then
    for dir in supabase/functions/*/ ; do
        if [ -d "$dir" ]; then
            func_name=$(basename "$dir")
            # Skip hidden folders or those starting with _
            if [[ ! "$func_name" =~ ^[._] ]]; then
                echo "   Deploying $func_name (Docker-less)..."
                # --use-api uses Supabase's cloud builder, avoiding local Docker requirement
                $SUPABASE_CMD functions deploy "$func_name" --no-verify-jwt --use-api --yes
            fi
        fi
    done
fi

echo "✅ SUCCESS: Backend fully updated!"
