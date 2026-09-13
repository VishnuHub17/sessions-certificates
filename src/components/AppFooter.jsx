// src/components/AppFooter.jsx
import React from 'react';

const AppFooter = () => (
  <footer className="bg-transparent text-on-surface-variant w-full py-8 flex flex-col md:flex-row justify-between items-center px-gutter max-w-container-max mx-auto border-t border-white/5 mt-section-gap relative z-10">
    <div className="text-label-sm font-label-sm mb-4 md:mb-0">
      © 2024 Pathwisse. All rights reserved.
    </div>
    <ul className="flex gap-6">
      <li><a className="text-on-surface-variant hover:text-primary transition-colors duration-200 text-label-sm font-label-sm uppercase" href="#">Support</a></li>
      <li><a className="text-on-surface-variant hover:text-primary transition-colors duration-200 text-label-sm font-label-sm uppercase" href="#">Privacy Policy</a></li>
      <li><a className="text-on-surface-variant hover:text-primary transition-colors duration-200 text-label-sm font-label-sm uppercase" href="#">Terms of Service</a></li>
    </ul>
  </footer>
);

export default AppFooter;
