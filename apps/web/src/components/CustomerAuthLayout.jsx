import React from 'react';
import './customer-auth.css';

export default function CustomerAuthLayout({ title, subtitle, footer, localLogin, children }) {
  return (
    <main className="customer-auth">
      <div className="customer-auth__photo">
        <img
          src="/pages/customer-auth/orchard-market.webp"
          width="872"
          height="941"
          alt="A JBA GreenGold Orchard farmer handing a customer a crate of mangoes"
          fetchPriority="high"
        />
      </div>
      <div className="customer-auth__panel">
        <div className="customer-auth__content">
          <header className="customer-auth__header">
            <img src="/pages/customer-auth/orchard-leaf.webp" width="83" height="86" alt="" />
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </header>
          {children}
          <footer className="customer-auth__footer">{footer}</footer>
          {localLogin}
        </div>
      </div>
    </main>
  );
}
