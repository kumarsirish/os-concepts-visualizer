import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import PageTableTranslation from './PageTableTranslation.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <PageTableTranslation />
  </StrictMode>,
)
