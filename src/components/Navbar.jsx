import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import portfolioData from '../data/portfolio.json';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isOpen]);

  return (
    <>
      <nav style={{ zIndex: 100 }}>
        <a className="nav-logo" href="#" onClick={() => setIsOpen(false)}>{portfolioData.nav.logo}</a>
        
        {/* Desktop Links */}
        <div className="nav-links">
          {portfolioData.nav.links.map((link) => (
            <a key={link.id} href={`#${link.id}`}>{link.label}</a>
          ))}
        </div>

        {/* Mobile Hamburger Toggle */}
        <button 
          className={`mobile-toggle ${isOpen ? 'active' : ''}`}
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle menu"
        >
          <span className="bar"></span>
          <span className="bar"></span>
        </button>
      </nav>

      {/* Cinematic Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            className="mobile-menu-overlay"
            initial={{ opacity: 0, y: '-100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '-100%' }}
            transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
          >
            <div className="mobile-menu-container">
              {portfolioData.nav.links.map((link, i) => (
                <motion.div key={link.id} style={{ overflow: 'hidden' }}>
                  <motion.a 
                    href={`#${link.id}`}
                    onClick={() => setIsOpen(false)}
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "100%" }}
                    transition={{ delay: 0.3 + (i * 0.1), duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
                  >
                    {link.label}
                  </motion.a>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;
