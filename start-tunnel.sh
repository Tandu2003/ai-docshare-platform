#!/bin/bash

# Script khởi động Cloudflare Tunnel

TUNNEL_NAME="docshare-tunnel"

echo "🚀 Khởi động Cloudflare Tunnel..."
cloudflared tunnel run ${TUNNEL_NAME}
