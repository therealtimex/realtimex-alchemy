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
$SUPABASE_CMD db push

echo "✅ SUCCESS: Database updated!"
