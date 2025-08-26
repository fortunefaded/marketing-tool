import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { setupExtensionErrorHandler } from './utils/extensionErrorHandler'
import './styles/globals.css'

// Set up browser extension error filtering
setupExtensionErrorHandler()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
