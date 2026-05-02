import React from 'react';
import portfolioData from '../data/portfolio.json';

const Navbar = () => {
  return (
    <nav>
      <a className="nav-logo" href="#">{portfolioData.nav.logo}</a>
      <div className="nav-links">
        {portfolioData.nav.links.map((link) => (
          <a key={link.id} href={`#${link.id}`}>{link.label}</a>
        ))}
      </div>
    </nav>
  );
};

export default Navbar;
