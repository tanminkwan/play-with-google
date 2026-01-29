#!/bin/bash

# Windmill CLI Script Registration
# This script registers the AI News Pipeline steps to your Windmill workspace in order.

# --- Configuration ---
# Use environment variables if available, otherwise use defaults
WORKSPACE=${WMILL_WORKSPACE:-"f"} 
REMOTE=${WMILL_REMOTE:-"local"}
WINDMILL_URL=${WMILL_URL:-"http://localhost:8000"}
WINDMILL_TOKEN=${WMILL_TOKEN:-"liJIWUKmrvRl9PEGmReFvBvr9OvTE8Ug"}

WINDMILL_FOLDER="news_automation"
FLOW_PATH="$WINDMILL_FOLDER/ai_news_pipeline"
FLOW_DIR="ai_news_pipeline.flow"

# Use local wmill if global is not found
if command -v wmill &> /dev/null; then
    WMILL_BIN="wmill"
elif [ -f "./node_modules/.bin/wmill" ]; then
    WMILL_BIN="./node_modules/.bin/wmill"
else
    echo "❌ Error: 'wmill' not found globally or in node_modules."
    exit 1
fi

# Ensure the remote is configured correctly
echo "🔑 Configuring Windmill remote: $REMOTE ($WINDMILL_URL)..."
$WMILL_BIN auth add-token "$REMOTE" "$WINDMILL_URL" "$WINDMILL_TOKEN" &> /dev/null

# List of scripts in pipeline order
scripts=(
    "windmill_scripts/1_get_news_script.js"
    "windmill_scripts/2_generate_tts.js"
    "windmill_scripts/3_generate_images.js"
    "windmill_scripts/4_assemble_video.js"
    "windmill_scripts/5_upload_youtube.js"
    "windmill_scripts/6_send_email.js"
)

echo "🚀 Starting registration to Remote: $REMOTE, Workspace: $WORKSPACE"

for script_file in "${scripts[@]}"; do
    if [ ! -f "$script_file" ]; then
        echo "⚠️ Warning: File $script_file not found. Skipping."
        continue
    fi

    # Extract filename without extension for the Windmill path
    filename=$(basename "$script_file" .js)
    
    # Target path in Windmill: e.g., news_automation/1_get_news_script
    target_path="$WINDMILL_FOLDER/$filename"

    echo "----------------------------------------------------"
    echo "📄 Registering: $script_file"
    echo "📍 Target Path: $target_path"

    # Push the script to Windmill with EXPLICIT remote and workspace
    $WMILL_BIN script push --remote "$REMOTE" --workspace "$WORKSPACE" "$target_path" "$script_file"
    
    if [ $? -eq 0 ]; then
        echo "✅ Successfully registered $filename"
    else
        echo "❌ Failed to register $filename"
    fi
done

echo "----------------------------------------------------"
echo "🌀 Registering Pipeline Flow..."
if [ -d "$FLOW_DIR" ]; then
    # Push the flow with EXPLICIT remote and workspace
    $WMILL_BIN flow push --remote "$REMOTE" --workspace "$WORKSPACE" "$FLOW_PATH" "$FLOW_DIR"
    if [ $? -eq 0 ]; then
        echo "✅ Successfully registered Flow: $FLOW_PATH"
    else
        echo "❌ Failed to register Flow"
    fi
else
    echo "⚠️ Flow directory $FLOW_DIR not found. skipping."
fi

echo "----------------------------------------------------"
echo "🎉 All scripts and Flow registration attempt completed!"
echo "Check your Windmill UI at $WINDMILL_URL/w/$WORKSPACE/flows"
