// src/components/AppHeader.jsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const AppHeader = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <nav className="flex items-center justify-between px-6 py-4 bg-[#0B0B10]/80 backdrop-blur-md border-b border-white/5 z-10 relative">
      <Link to="/sessions" className="text-title-md font-title-md font-bold text-on-surface">
        Pathwisse
      </Link>
      <div className="flex items-center gap-3 sm:gap-6">
        <Link
          to="/sessions"
          className="hidden sm:inline text-xs font-semibold tracking-wide uppercase text-primary border-b border-primary pb-1"
        >
          My Certificates
        </Link>
        <a
          href="#"
          className="hidden sm:inline text-xs font-semibold tracking-wide uppercase text-on-surface-variant hover:text-primary transition-colors"
        >
          Support
        </a>
        <button
          type="button"
          aria-label="Search"
          className="text-on-surface-variant hover:text-on-surface transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">search</span>
        </button>
        <button
          type="button"
          aria-label="Log out"
          onClick={handleLogout}
          className="text-on-surface-variant hover:text-on-surface transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
        </button>
      </div>
    </nav>
  );
};

export default AppHeader;
