import React from 'react';
import './staff-auth.css';

export default function StaffAuthLayout({ title, subtitle, footer, children }) {
  return (
    <main className="staff-auth">
      <div className="staff-auth__photo">
        <img
          src="/pages/staff-auth/orchard-harvest.webp"
          width="913"
          height="936"
          alt="JBA GreenGold Orchard"
          fetchPriority="high"
        />
      </div>
      <div className="staff-auth__panel">
        <div className="staff-auth__content">
          <header className="staff-auth__header">
            <img src="/pages/staff-auth/orchard-leaf.webp" width="87" height="88" alt="" />
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </header>
          {children}
          {footer && <footer className="staff-auth__footer">{footer}</footer>}
        </div>
      </div>
    </main>
  );
}
