import "./i18n";
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './App.tsx'
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './app/store';
import { BranchProvider } from './Context/BranchContext';
import { SidebarProvider } from './Context/SidebarContext';
import { DataProvider } from './Context/DataContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <DataProvider>
          <BranchProvider>
            <SidebarProvider>
              <App />
            </SidebarProvider>
          </BranchProvider>
        </DataProvider>
      </BrowserRouter>
    </Provider>
  </StrictMode>
)
