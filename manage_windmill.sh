#!/bin/bash

# Windmill API Management Script
# Usage: ./manage_windmill.sh [command] [args...]

# Load environment variables
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

BASE_URL="http://localhost:8000"
TOKEN="${WMILL_TOKEN}"

if [ -z "$TOKEN" ]; then
    echo "❌ Error: WMILL_TOKEN not found in .env"
    exit 1
fi

function deploy_script() {
    local WORKSPACE=$1
    local REMOTE_PATH=$2
    local FILE_PATH=$3
    local DESCRIPTION="Deployed via API Script"
    
    if [ ! -f "$FILE_PATH" ]; then
        echo "❌ File not found: $FILE_PATH"
        exit 1
    fi

    echo "📜 Deploying Script: $FILE_PATH -> $REMOTE_PATH..."
    CONTENT=$(cat "$FILE_PATH")
    ESCAPED_CONTENT=$(python3 -c 'import sys, json; print(json.dumps(sys.stdin.read()))' < "$FILE_PATH")
    LANG="bun"
    if [[ "$FILE_PATH" == *".py" ]]; then LANG="python3"; fi
    
    JSON_DATA="{\"path\": \"$REMOTE_PATH\", \"summary\": \"$DESCRIPTION\", \"description\": \"$DESCRIPTION\", \"content\": $ESCAPED_CONTENT, \"language\": \"$LANG\", \"value\": {\"type\": \"rawscript\", \"content\": $ESCAPED_CONTENT, \"language\": \"$LANG\"}}"

    # 1. Try Create
    response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/w/$WORKSPACE/scripts/create" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d "$JSON_DATA")

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)

    if [ "$http_code" -eq 200 ] || [ "$http_code" -eq 201 ]; then
        echo "✅ Script deployed successfully!"
    elif [ "$http_code" -eq 400 ]; then
        if [[ "$body" == *"Path conflict"* ]]; then
            echo "⚠️  Path conflict. Attempting Update (Parent Hash)..."
            
            # Get Current Hash
            # Endpoints for script details vary, but list filter is safest
            CURRENT_HASH=$(curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/w/$WORKSPACE/scripts/list" | \
                python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    # Filter by path
    target = next((item for item in data if item['path'] == '$REMOTE_PATH'), None)
    if target:
        print(target.get('hash', ''))
except: pass
")
            if [ -n "$CURRENT_HASH" ]; then
                 # Inject parent_hash
                 UPDATED_JSON=$(echo "$JSON_DATA" | python3 -c "
import sys, json
data = json.load(sys.stdin)
data['parent_hash'] = '$CURRENT_HASH'
print(json.dumps(data))
")
                 response_retry=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/w/$WORKSPACE/scripts/create" \
                    -H "Authorization: Bearer $TOKEN" \
                    -H "Content-Type: application/json" \
                    -d "$UPDATED_JSON")
                 retry_code=$(echo "$response_retry" | tail -n1)
                 if [ "$retry_code" -eq 200 ] || [ "$retry_code" -eq 201 ]; then
                     echo "✅ Script updated successfully!"
                 else
                     echo "❌ Update failed ($retry_code)"
                 fi
            else
                 # Fallback: Archive & Recreate (If hash not found)
                 # Actually if list doesn't show it but conflict exists, it might be archived already?
                 # Ignoring for now as hash method usually works.
                 echo "❌ Failed to find hash for update."
            fi
        else
            echo "❌ Failed to deploy script (HTTP $http_code): $body"
        fi
    else
         echo "❌ Failed to deploy script (HTTP $http_code): $body"
    fi
}

function deploy_flow() {
    local WORKSPACE=$1
    local REMOTE_PATH=$2
    local FILE_PATH=$3
    local SUMMARY="Deployed via API Script"
    
    if [ ! -f "$FILE_PATH" ]; then
        echo "❌ File not found: $FILE_PATH"
        exit 1
    fi

    echo "🌊 Deploying Flow: $FILE_PATH -> $REMOTE_PATH..."
    
    # 1. Prepare JSON Payload
    JSON_DATA=$(python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    data['path'] = '$REMOTE_PATH'
    if 'summary' not in data:
        data['summary'] = '$SUMMARY'
    print(json.dumps(data))
except Exception as e:
    print('Error:', e, file=sys.stderr)
    sys.exit(1)
" < "$FILE_PATH")

    # 2. Try Update First (Smart Strategy)
    # Endpoint: POST /api/w/{workspace}/flows/update/{url_encoded_path}
    
    ENCODED_PATH=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$REMOTE_PATH', safe=''))")
    
    response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/w/$WORKSPACE/flows/update/$ENCODED_PATH" \
         -H "Authorization: Bearer $TOKEN" \
         -H "Content-Type: application/json" \
         -d "$JSON_DATA")

    http_code=$(echo "$response" | tail -n1)
    
    if [ "$http_code" -eq 200 ] || [ "$http_code" -eq 201 ]; then
        echo "✅ Flow updated successfully!"
    elif [ "$http_code" -eq 404 ]; then
        # 3. If Not Found, Create New
        echo "⚠️  Flow not found. Creating new..."
        response_create=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/w/$WORKSPACE/flows/create" \
            -H "Authorization: Bearer $TOKEN" \
            -H "Content-Type: application/json" \
            -d "$JSON_DATA")
        
        create_code=$(echo "$response_create" | tail -n1)
        create_body=$(echo "$response_create" | head -n-1)
        
        if [ "$create_code" -eq 200 ] || [ "$create_code" -eq 201 ]; then
             echo "✅ Flow created successfully!"
        else
             echo "❌ Failed to create flow (HTTP $create_code): $create_body"
        fi
    else
        echo "❌ Failed to update flow (HTTP $http_code)"
    fi
}

# (Helper for workspace create/delete - keeping valid ones)
function create_workspace() {
    local NAME=$1
    local ID=$2
    JSON_DATA="{\"name\": \"$NAME\", \"id\": \"$ID\"}"
    response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/workspaces/create" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d "$JSON_DATA")
    http_code=$(echo "$response" | tail -n1)
    echo "Workspace create result: $http_code"
}
function delete_workspace() {
     local ID=$1
     response=$(curl -s -w "\n%{http_code}" -X DELETE "$BASE_URL/api/workspaces/$ID" \
        -H "Authorization: Bearer $TOKEN")
     http_code=$(echo "$response" | tail -n1)
     echo "Workspace delete result: $http_code"
}

case "$1" in
    "deploy_script") deploy_script "$2" "$3" "$4" ;;
    "deploy_flow") deploy_flow "$2" "$3" "$4" ;;
    "delete_workspace") delete_workspace "$2" ;;
    "create_workspace") create_workspace "$2" "$3" ;;
    *)
        echo "Usage: ./manage_windmill.sh [command] [args]"
        exit 1
        ;;
esac
