import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import NewQuote from './pages/NewQuote';
import History from './pages/History';
import Pricing from './pages/Pricing';
import Salaries from './pages/Salaries';

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <div className="app-bar">
          <img src="/proshield-icon.png" alt="ProShield" className="app-logo" />
        </div>
        <div className="page">
          <Routes>
            <Route path="/" element={<NewQuote />} />
            <Route path="/history" element={<History />} />
            <Route path="/history/:id" element={<NewQuote />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/salaries" element={<Salaries />} />
            <Route path="/salaries/:id" element={<Salaries />} />
          </Routes>
        </div>

        <nav className="nav">
          <NavLink to="/" end>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4z" />
            </svg>
            הצעה חדשה
          </NavLink>
          <NavLink to="/history">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
            </svg>
            היסטוריה
          </NavLink>
          <NavLink to="/salaries">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
            </svg>
            משכורות
          </NavLink>
          <NavLink to="/pricing">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
              <line x1="7" y1="7" x2="7.01" y2="7" />
            </svg>
            מחירון
          </NavLink>
        </nav>
      </div>
    </BrowserRouter>
  );
}

export default App;
