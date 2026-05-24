// blog-fe/src/main.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { CallProvider } from './contexts/CallContext'
import { CallOverlay } from './components/CallOverlay'
import { ToastContainer } from './components/Toast'
import { ConfirmModal } from './components/ConfirmModal'
import App from './App'
import './styles/variables.css'
import './styles/Button.css'

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <BrowserRouter>
            <AuthProvider>
                <CallProvider>
                    <App />
                    <CallOverlay />
                    <ToastContainer />
                    <ConfirmModal />
                </CallProvider>
            </AuthProvider>
        </BrowserRouter>
    </StrictMode>,
)