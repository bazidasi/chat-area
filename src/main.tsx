import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { Toaster } from 'sonner'
import { App } from '@/App'
import '@/i18n'
import '@/index.css'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <App />
    <Toaster position="top-center" richColors />
  </StrictMode>
)
