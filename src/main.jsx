import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './auth.jsx';
import { BranchProvider } from './contexts/BranchContext.jsx';
import { RoleProvider }   from './contexts/RoleContext.jsx';
import { ToastProvider }  from './components/Toast.jsx';
import App from './App.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <BranchProvider>
            <RoleProvider>
              <App />
            </RoleProvider>
          </BranchProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  </StrictMode>,
);
