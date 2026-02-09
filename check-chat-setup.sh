#!/bin/bash

echo "🔍 Checking Chat Service Setup..."
echo ""

# Check if services are running
echo "1️⃣ Checking Services Status:"
echo "----------------------------"

# Gateway
if docker ps | grep -q "gateway-service"; then
    echo "✅ Gateway Service (port 8080): RUNNING"
else
    echo "❌ Gateway Service (port 8080): NOT RUNNING"
fi

# Chat Service
if docker ps | grep -q "chat-service"; then
    echo "✅ Chat Service (port 8006): RUNNING"
else
    echo "❌ Chat Service (port 8006): NOT RUNNING"
fi

# Frontend
if lsof -i :5173 > /dev/null 2>&1; then
    echo "✅ Frontend (port 5173): RUNNING"
else
    echo "❌ Frontend (port 5173): NOT RUNNING"
fi

echo ""
echo "2️⃣ Testing Gateway Endpoints:"
echo "----------------------------"

# Test gateway health
GATEWAY_HEALTH=$(curl -s http://localhost:8080/health)
if [ $? -eq 0 ]; then
    echo "✅ Gateway Health Check: OK"
else
    echo "❌ Gateway Health Check: FAILED"
fi

# Test chat service health (direct)
CHAT_HEALTH=$(curl -s http://localhost:8006/health)
if [ $? -eq 0 ]; then
    echo "✅ Chat Service Health Check (direct): OK"
else
    echo "❌ Chat Service Health Check (direct): FAILED"
fi

echo ""
echo "3️⃣ Configuration Check:"
echo "----------------------------"

# Check if gateway config has chat endpoints
if grep -q "/chat/api/v1/conversations" /Users/haopham/go-playground/writeful/gateway-service/krakend.json; then
    echo "✅ Gateway has chat endpoints configured"
else
    echo "❌ Gateway missing chat endpoints"
fi

# Check WebSocket URL in frontend
if grep -q "ws://localhost:8006/ws" /Users/haopham/go-playground/writeful/writeful-fe/blog-fe/src/services/chatWebSocket.ts; then
    echo "✅ Frontend WebSocket URL configured correctly"
else
    echo "❌ Frontend WebSocket URL incorrect"
fi

echo ""
echo "4️⃣ Network Connectivity:"
echo "----------------------------"

# Test WebSocket port
if nc -z localhost 8006 2>/dev/null; then
    echo "✅ WebSocket port 8006 is accessible"
else
    echo "❌ WebSocket port 8006 is not accessible"
fi

# Test Gateway port
if nc -z localhost 8080 2>/dev/null; then
    echo "✅ Gateway port 8080 is accessible"
else
    echo "❌ Gateway port 8080 is not accessible"
fi

echo ""
echo "📝 Summary:"
echo "----------------------------"
echo "If all checks pass, your chat should work in real-time!"
echo ""
echo "To test:"
echo "1. Open http://localhost:5173 in two different browsers"
echo "2. Login as different users"
echo "3. Start a chat conversation"
echo "4. Send messages - they should appear instantly without reload"
echo ""
echo "Check browser console for WebSocket connection logs:"
echo "  - Look for: '✅ WebSocket connected successfully!'"
echo "  - Look for: '📨 WebSocket message received:'"


🔌 Attempting WebSocket connection to chat-service... {userId: 'eb67b0ce-88a4-4aaa-8cdd-560083e95dd0', url: 'ws://localhost:8006/ws?token=***&user_id=eb67b0ce-88a4-4aaa-8cdd-560083e95dd0'}
chatWebSocket.ts:36 🔌 Attempting WebSocket connection to chat-service... {userId: 'eb67b0ce-88a4-4aaa-8cdd-560083e95dd0', url: 'ws://localhost:8006/ws?token=***&user_id=eb67b0ce-88a4-4aaa-8cdd-560083e95dd0'}
chatWebSocket.ts:41 WebSocket connection to 'ws://localhost:8006/ws?token=eyJhbGciOiJIUzI1NiIsImtpZCI6IlNJTTIiLCJ0eXAiOiJKV1QifQ.eyJpZCI6ImViNjdiMGNlLTg4YTQtNGFhYS04Y2RkLTU2MDA4M2U5NWRkMCIsImVtYWlsIjoiaGlkYW52MkBnbWFpbC5jb20iLCJzdGF0dXMiOiJhY3RpdmUiLCJyb2xlcyI6WyJ3cml0ZXIiXSwidG9rZW5fdHlwZSI6ImFjY2VzcyIsImV4cCI6MTc2OTg0MDg0OCwiaWF0IjoxNzY5ODM3MjQ4fQ.n6lEpFHiSOD0xMjoU1zWCN1oBi-_TgWXZNfZlXXkV3g&user_id=eb67b0ce-88a4-4aaa-8cdd-560083e95dd0' failed: 
connect @ chatWebSocket.ts:41
initializeChat @ Chat.tsx:51Understand this error
chatWebSocket.ts:67 ❌ WebSocket error: Event {isTrusted: true, type: 'error', target: WebSocket, currentTarget: WebSocket, eventPhase: 2, …}isTrusted: truebubbles: falsecancelBubble: falsecancelable: falsecomposed: falsecurrentTarget: nulldefaultPrevented: falseeventPhase: 0returnValue: truesrcElement: WebSocket {url: 'ws://localhost:8006/ws?token=eyJhbGciOiJIUzI1NiIsI…kV3g&user_id=eb67b0ce-88a4-4aaa-8cdd-560083e95dd0', readyState: 3, bufferedAmount: 0, onopen: ƒ, onerror: ƒ, …}target: WebSocket {url: 'ws://localhost:8006/ws?token=eyJhbGciOiJIUzI1NiIsI…kV3g&user_id=eb67b0ce-88a4-4aaa-8cdd-560083e95dd0', readyState: 3, bufferedAmount: 0, onopen: ƒ, onerror: ƒ, …}timeStamp: 1128.699999999255type: "error"[[Prototype]]: Event
ws.onerror @ chatWebSocket.ts:67Understand this error
chatWebSocket.ts:71 🔌 WebSocket disconnected
chatWebSocket.ts:78 🔄 Reconnecting in 1000ms... (attempt 1/5)