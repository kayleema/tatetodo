import {StrictMode} from 'react'
import {createRoot} from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import {BrowserRouter, Route, Routes} from 'react-router-dom';
import {Home} from "./Home.tsx";

createRoot(document.getElementById('root')!).render(
  <StrictMode>
      <BrowserRouter>
          <Routes>
              <Route path="/board/:boardId" element={<App />} />
              <Route path="/" element={<Home />} />
          </Routes>
      </BrowserRouter>
  </StrictMode>,
)
