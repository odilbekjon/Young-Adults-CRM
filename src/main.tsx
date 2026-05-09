import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './App.tsx'
import { BrowserRouter } from 'react-router-dom';
import { BranchProvider } from './Context/BranchContext';
import { SidebarProvider } from './Context/SidebarContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <BranchProvider>
        <SidebarProvider>
           <App />
        </SidebarProvider>
      </BranchProvider>
    </BrowserRouter>
  </StrictMode>,
)
