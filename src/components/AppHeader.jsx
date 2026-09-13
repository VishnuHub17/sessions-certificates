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
    <nav className="bg-surface/80 backdrop-blur-xl fixed top-0 left-0 w-full border-b border-white/10 shadow-sm z-50 flex justify-between items-center px-6 py-4 max-w-container-max mx-auto">
      <div className="flex items-center gap-4">
        <Link to="/sessions" className="text-title-md font-title-md font-bold text-on-surface">Pathwisse</Link>
      </div>
      <div className="flex items-center gap-6">
        <ul className="flex gap-6">
          <li>
            <Link
              to="/sessions"
              className="text-primary font-bold border-b-2 border-primary pb-1 text-label-sm font-label-sm uppercase hover:bg-white/5 transition-colors duration-200"
            >
              My Certificates
            </Link>
          </li>
          <li>
            <a
              href="#"
              className="text-on-surface-variant hover:text-on-surface text-label-sm font-label-sm uppercase hover:bg-white/5 transition-colors duration-200"
            >
              Support
            </a>
          </li>
        </ul>
        <div className="w-8 h-8 rounded-full overflow-hidden border border-white/10 ml-4 cursor-pointer hover:border-primary transition-colors">
          <img
            alt="Student Profile"
            className="w-full h-full object-cover"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuA1qamhI6kqs7YMsXbr3mPhqld3BYK84ZkPTYk5WlxHRahrTqjglNa0SNuFAtU4Sni7Mld-tidiH3gLQTx2Vnoc5rQHyiY0ecpKS18ipOFAMGlesU7npBqajZAcWeCDJ9gCRmwnwDqJyHV-91mrt_Af-ffxKodJpRMCa5K4VAyPlfK5z3i6l--1lIZ2MGZH3goMenyHTJRr9IrS0N8CkccFVOH2MLpgQ5NGPfOuXGO737RITuIHyD9XdQ"
          />
        </div>
        <button type="button" aria-label="Logout" onClick={handleLogout} className="text-on-surface-variant hover:text-white transition-colors">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>logout</span>
        </button>
      </div>
    </nav>
  );
};

export default AppHeader;
