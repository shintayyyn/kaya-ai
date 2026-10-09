import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

const root = document.getElementById('root')
root.style.height = '100%'
document.documentElement.style.height = '100%'
document.body.style.height = '100%'

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
