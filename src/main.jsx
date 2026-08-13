import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// 1. EasyMDE default base styles MUST come first
import 'easymde/dist/easymde.min.css'

// 2. Custom index.css MUST come second to override EasyMDE defaults
import './index.css'

import App from './App.jsx'
import { UserProvider } from './context/UserContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <UserProvider>
      <App />
    </UserProvider>
  </StrictMode>,
)