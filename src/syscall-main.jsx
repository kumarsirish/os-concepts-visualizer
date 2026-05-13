import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import SystemCallFlow from './SystemCallFlow.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <SystemCallFlow />
  </StrictMode>,
)
