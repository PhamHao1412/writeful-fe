// blog-fe/src/main.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ToastContainer } from './components/Toast'
import App from './App'
import './styles/variables.css'
import './styles/Button.css'

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <BrowserRouter>
            <AuthProvider>
                <App />
                <ToastContainer />
            </AuthProvider>
        </BrowserRouter>
    </StrictMode>,
)