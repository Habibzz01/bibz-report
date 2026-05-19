import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './styles/globals.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#18181b',
            color: '#f4f4f5',
            border: '1px solid #27272a',
          },
          success: {
            iconTheme: {
              primary: '#34d399',
              secondary: '#18181b',
            },
          },
          error: {
            iconTheme: {
              primary: '#f87171',
              secondary: '#18181b',
            },
          },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>,
)
