#!/bin/bash

set -e

echo ""
echo "Cloudflare Tunnel Setup"
echo "Domain: ${DOMAIN}"
echo ""

# Check cloudflared
if ! command -v cloudflared >/dev/null; then
    echo "Installing cloudflared..."
    curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
    sudo dpkg -i cloudflared.deb
    rm cloudflared.deb
fi

set -o allexport
source .env
set +o allexport


TUNNEL_NAME=${CLOUDFLARE_TUNNEL_NAME:-docshare-tunnel}
DOMAIN="${CLOUDFLARE_TUNNEL_DOMAIN:-docshare.io.vn}"
API_SUBDOMAIN="api.${DOMAIN}"
CONFIG_DIR="$HOME/.cloudflared"

zoneid=$CLOUDFLARE_ZONE_ID
bearer=$CLOUDFLARE_API_TOKEN
curl --silent "https://api.cloudflare.com/client/v4/zones/$zoneid/dns_records?per_page=50000" \
--header "Authorization: Bearer $bearer" \
| jq --raw-output '.result[].id' | while read id
do
  curl --silent --request DELETE "https://api.cloudflare.com/client/v4/zones/$zoneid/dns_records/$id" \
--header "Authorization: Bearer $bearer"
done

# Check jq
if ! command -v jq >/dev/null; then
    echo "Installing jq..."
    sudo apt-get update -y && sudo apt-get install jq -y
fi

# Check login
if [ ! -f "$HOME/.cloudflared/cert.pem" ]; then
    echo "You are not logged in."
    echo "Run: cloudflared tunnel login"
    exit 1
fi

echo "Checking existing tunnel: ${TUNNEL_NAME}"

# Get tunnel list JSON safely
TUNNELS_JSON=$(cloudflared tunnel list --output json 2>/dev/null || echo "[]")

TUNNEL_ID=$(echo "$TUNNELS_JSON" | jq -r ".[] | select(.name==\"${TUNNEL_NAME}\") | .id" || true)

if [ -z "$TUNNEL_ID" ] || [ "$TUNNEL_ID" == "null" ]; then
    echo "Tunnel not found. Creating..."
    cloudflared tunnel create "$TUNNEL_NAME"
    TUNNELS_JSON=$(cloudflared tunnel list --output json)
    TUNNEL_ID=$(echo "$TUNNELS_JSON" | jq -r ".[] | select(.name==\"${TUNNEL_NAME}\") | .id")
fi

if [ -z "$TUNNEL_ID" ] || [ "$TUNNEL_ID" == "null" ]; then
    echo "Failed to get tunnel ID."
    exit 1
fi

echo "Tunnel ID: ${TUNNEL_ID}"

CREDENTIALS_FILE="${CONFIG_DIR}/${TUNNEL_ID}.json"

# Fix missing credentials
if [ ! -f "$CREDENTIALS_FILE" ]; then
    echo "Credentials missing. Recreating tunnel."
    cloudflared tunnel delete -f "$TUNNEL_NAME"
    cloudflared tunnel create "$TUNNEL_NAME"

    TUNNELS_JSON=$(cloudflared tunnel list --output json)
    TUNNEL_ID=$(echo "$TUNNELS_JSON" | jq -r ".[] | select(.name==\"${TUNNEL_NAME}\") | .id")
    CREDENTIALS_FILE="${CONFIG_DIR}/${TUNNEL_ID}.json"

    if [ ! -f "$CREDENTIALS_FILE" ]; then
        echo "Credentials still missing. Abort."
        exit 1
    fi
fi

mkdir -p "$CONFIG_DIR"

echo "Writing config.yml"
cat > "${CONFIG_DIR}/config.yml" << EOF
tunnel: ${TUNNEL_ID}
credentials-file: ${CREDENTIALS_FILE}

ingress:
  - hostname: ${API_SUBDOMAIN}
    service: http://localhost:8080
    originRequest:
      noTLSVerify: true

  - hostname: ${DOMAIN}
    service: http://localhost:5173
    originRequest:
      noTLSVerify: true

  - hostname: www.${DOMAIN}
    service: http://localhost:5173
    originRequest:
      noTLSVerify: true

  - service: http_status:404
EOF

echo "Setting DNS routes..."

cloudflared tunnel route dns "$TUNNEL_NAME" "$DOMAIN" || echo "DNS for root already exists."
cloudflared tunnel route dns "$TUNNEL_NAME" "$API_SUBDOMAIN" || echo "DNS for API already exists."

echo ""
echo "Setup complete."
echo "Frontend: https://${DOMAIN}"
echo "Backend:  https://${API_SUBDOMAIN}"
echo ""
