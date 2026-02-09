# Chat Service Real-time Setup

## Architecture Overview

Hệ thống chat sử dụng kiến trúc microservices với các thành phần sau:

### Services
- **Gateway Service** (KrakenD) - Port 8080: API Gateway cho HTTP requests
- **Chat Service** - Port 8006: Chat microservice với WebSocket support
- **Auth Service** - Port 8004: Authentication service
- **Content Service** - Port 8003: Content management service
- **Frontend** - Port 5173: React application

### Communication Flow

#### HTTP API Requests
```
Frontend (5173) → Gateway (8080) → Chat Service (8006)
```
- Tất cả HTTP API calls đi qua gateway
- Gateway validate JWT token và inject `X-User-ID` header
- Chat service nhận `X-User-ID` từ header

#### WebSocket Connection
```
Frontend (5173) → Chat Service (8006) [Direct Connection]
```
- WebSocket kết nối **trực tiếp** đến chat-service
- **Lý do**: KrakenD không hỗ trợ WebSocket proxying
- Token và user_id được truyền qua query parameters

## Configuration

### Gateway Configuration
File: `/gateway-service/krakend.json`

Đã thêm các endpoints sau cho chat service:
- `POST /chat/api/v1/conversations` - Tạo conversation
- `GET /chat/api/v1/conversations` - Lấy danh sách conversations
- `GET /chat/api/v1/conversations/{id}` - Lấy conversation detail
- `POST /chat/api/v1/conversations/{id}/participants` - Thêm participants
- `DELETE /chat/api/v1/conversations/{id}/participants/{participant_id}` - Xóa participant
- `POST /chat/api/v1/conversations/read` - Đánh dấu đã đọc
- `POST /chat/api/v1/messages` - Gửi message
- `GET /chat/api/v1/messages` - Lấy messages
- `DELETE /chat/api/v1/messages/{id}` - Xóa message

### Frontend Configuration
File: `/blog-fe/src/services/chatWebSocket.ts`

WebSocket URL: `ws://localhost:8006/ws?token={token}&user_id={userId}`

## How It Works

### 1. User Login
1. User đăng nhập qua auth service
2. Nhận JWT access token
3. Token được lưu trong localStorage

### 2. Chat Initialization
1. Frontend gọi `GET /chat/api/v1/conversations` qua gateway (port 8080)
2. Gateway validate token và forward request đến chat-service
3. Chat-service trả về danh sách conversations

### 3. WebSocket Connection
1. Frontend tạo WebSocket connection trực tiếp đến `ws://localhost:8006/ws`
2. Truyền `token` và `user_id` qua query parameters
3. Chat-service validate token và register client vào Hub
4. Connection được duy trì để nhận real-time messages

### 4. Sending Messages
1. User gửi message qua HTTP API: `POST /chat/api/v1/messages` (qua gateway)
2. Chat-service lưu message vào database
3. Chat-service broadcast message đến tất cả clients trong conversation qua WebSocket
4. Clients nhận message real-time và update UI

### 5. Receiving Messages
1. WebSocket Hub broadcast message đến connected clients
2. Frontend nhận message qua WebSocket `onmessage` handler
3. UI tự động update không cần reload

## Deployment

### Start Gateway
```bash
cd /gateway-service
make restart
```

### Start Chat Service
```bash
cd /chat-service
make run
```

### Start Frontend
```bash
cd /blog-fe
npm run dev
```

## Troubleshooting

### Messages không real-time?
1. Kiểm tra WebSocket connection trong browser console
2. Verify chat-service đang chạy ở port 8006
3. Check gateway config đã có chat endpoints

### WebSocket connection failed?
1. Kiểm tra chat-service logs
2. Verify token và user_id được truyền đúng
3. Check CORS settings

### Gateway không forward requests?
1. Restart gateway: `cd /gateway-service && make restart`
2. Verify krakend.json syntax
3. Check gateway logs: `make logs`

## Security Notes

⚠️ **Production Considerations**:
1. WebSocket trực tiếp bypass gateway - cần implement proper authentication
2. Token validation trong WebSocket handler cần được strengthen
3. Consider using nginx hoặc custom proxy để route WebSocket qua gateway
4. Implement rate limiting cho WebSocket connections
5. Add proper CORS configuration cho production domains
