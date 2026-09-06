// src/components/AppFooter.jsx
import React from 'react';

const AppFooter = () => (
  <footer className="max-w-[1200px] mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-label-sm text-on-surface-variant/70 relative z-10">
    <span>© 2026 Pathwisse. All rights reserved.</span>
    <div className="flex items-center gap-4">
      <a href="#" className="hover:text-on-surface transition-colors">Support</a>
      <a href="#" className="hover:text-on-surface transition-colors">Privacy Policy</a>
      <a href="#" className="hover:text-on-surface transition-colors">Terms of Service</a>
    </div>
  </footer>
);

export default AppFooter;
