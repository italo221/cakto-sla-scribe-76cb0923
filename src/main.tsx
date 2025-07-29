import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from '@/hooks/useTheme'
import { SystemConfigProvider } from '@/contexts/SystemConfigContext'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SystemConfigProvider>
      <ThemeProvider defaultTheme="system" storageKey="sla-theme">
        <App />
      </ThemeProvider>
    </SystemConfigProvider>
  </StrictMode>,
)