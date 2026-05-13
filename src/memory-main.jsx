import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import MemoryFragmentation from './MemoryFragmentation.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MemoryFragmentation />
  </StrictMode>,
)
