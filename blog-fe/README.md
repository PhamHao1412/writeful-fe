# Writeful Blog Frontend

A modern blog platform built with React, TypeScript, and Vite.

## 🚀 Features

### Core Features
- ✅ User authentication & authorization
- ✅ Post creation & editing with rich text editor
- ✅ User profiles & following system
- ✅ Activity feed
- ✅ Media upload
- ✅ Responsive design

### 💬 Chat Feature (NEW!)
Real-time messaging system with:
- Direct messages (1-on-1)
- Group conversations
- Typing indicators
- Unread badges
- WebSocket integration
- Auto-reconnect

## 📚 Documentation

### Chat Feature
- **[Quick Start](CHAT_QUICKSTART.md)** - Get started in 3 steps
- **[Feature Guide](CHAT_FEATURE.md)** - Complete feature documentation
- **[Testing Guide](CHAT_TESTING.md)** - Testing scenarios & examples
- **[Summary](CHAT_SUMMARY.md)** - Implementation overview

### API Documentation
- **[Chat Service API](chat_svc_doc.md)** - Chat service endpoints

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: CSS (custom)
- **State Management**: React Hooks
- **HTTP Client**: Axios
- **Real-time**: WebSocket
- **Routing**: React Router

## 📦 Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Start development server
npm run dev
```

## 🔧 Environment Variables

```env
VITE_BE_GATEWAY_API=http://localhost:8080
```

## 🚀 Development

```bash
# Start dev server (http://localhost:5173)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## 📁 Project Structure

```
src/
├── api/              # API clients
│   ├── auth.api.ts   # Authentication
│   ├── post.api.ts   # Posts
│   ├── media.api.ts  # Media upload
│   └── chat.api.ts   # Chat (NEW!)
├── components/       # React components
│   ├── Layout.tsx
│   ├── Sidebar.tsx
│   ├── ChatWindow.tsx        # (NEW!)
│   ├── ConversationList.tsx  # (NEW!)
│   └── MessageBubble.tsx     # (NEW!)
├── pages/            # Page components
│   ├── PostList.tsx
│   ├── PostDetail.tsx
│   ├── Profile.tsx
│   └── Chat.tsx      # (NEW!)
├── services/         # Services
│   └── chatWebSocket.ts  # (NEW!)
├── styles/           # CSS files
└── contexts/         # React contexts
```

## 🎯 Quick Start - Chat Feature

1. **Start services**
   ```bash
   # Chat service (port 8083)
   cd /path/to/chat-service && go run main.go
   
   # Gateway (port 8080)
   cd /path/to/gateway && go run main.go
   
   # Frontend (port 5173)
   npm run dev
   ```

2. **Access chat**
   - Login to the app
   - Click 💬 Messages in sidebar
   - Create a new chat
   - Start messaging!

## 🎨 Design System

### Colors
- Primary: Purple gradient (#667eea → #764ba2)
- Secondary: Pink gradient (#f093fb → #f5576c)
- Background: #fafafa → #ffffff
- Text: #1c1e21 (dark), #65676b (gray)

### Features
- Smooth animations
- Gradient backgrounds
- Glassmorphism effects
- Responsive design
- Modern UI/UX

## 🔐 Authentication

The app uses JWT-based authentication:
- Access token stored in localStorage
- Auto-refresh on expiration
- Redirect to login on unauthorized

## 📱 Responsive Design

- Desktop: Full-featured layout
- Tablet: Optimized layout
- Mobile: Touch-friendly interface

## 🐛 Troubleshooting

### Common Issues

**Build errors**
```bash
rm -rf node_modules package-lock.json
npm install
```

**WebSocket not connecting**
- Check chat service is running (port 8083)
- Verify access token is valid
- Check browser console for errors

**API errors**
- Verify gateway is running (port 8080)
- Check network tab for failed requests
- Ensure environment variables are set

## 📄 License

MIT

## 👥 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 🙏 Acknowledgments

- React team for the amazing framework
- Vite for the blazing fast build tool
- All contributors and users

---

Made with ❤️ using React + TypeScript + Vite
