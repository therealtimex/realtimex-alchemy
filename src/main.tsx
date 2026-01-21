import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { setupAxios } from './lib/axios-setup'
import './index.css'

setupAxios();

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
)
