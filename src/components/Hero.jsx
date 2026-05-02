import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import Magnetic from './Magnetic';
import { useHeroReveal } from '../hooks/useHeroReveal';
import ThreeCanvas from './ThreeCanvas';

const SplitText = ({ text }) => {
  return (
    <span style={{ display: 'inline-block' }}>
      {text.split('').map((char, i) => (
        <span 
          key={i} 
          className="hero-char"
          style={{ display: 'inline-block', minWidth: char === ' ' ? '0.25em' : 'auto' }}
        >
          {char}
        </span>
      ))}
    </span>
  );
};

const Hero = ({ data, ready }) => {
  const leftRef = useRef(null);
  const gridRef = useRef(null);
  
  useHeroReveal(leftRef, gridRef, ready);

  return (
    <section className="hero" id="home">
      <div className="hero-left" ref={leftRef}>
        <div className="hero-tag">{data.tag}</div>
        <h1 className="hero-title">
          <SplitText text={data.firstName} />
          <br/>
          <em><SplitText text={data.lastName} /></em>
        </h1>
        <p className="hero-desc">{data.description}</p>
        <div className="hero-cta">
          <Magnetic>
            <a href="#work" className="btn btn-primary">View Work →</a>
          </Magnetic>
          <Magnetic>
            <a href="#contact" className="btn btn-ghost">Let's Talk</a>
          </Magnetic>
        </div>
        <div className="hero-scroll">
          <div className="scroll-line"></div>
          {data.scrollText}
        </div>
      </div>
      
      <div className="hero-right">
        <div className="hero-grid" ref={gridRef}>
          {/* Cell 1: Sonar Sweep */}
          <div className="hero-grid-cell" style={{ background: 'radial-gradient(circle at center, #2a120c 0%, #0a0a0a 100%)' }}>
            <svg className="img-placeholder" viewBox="0 0 600 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
              <motion.circle cx="180" cy="250" r="40" fill="none" stroke="#c75a3f" strokeWidth="1.5"
                style={{ transformOrigin: "180px 250px" }}
                animate={{ scale: [1, 5], opacity: [0.8, 0] }}
                transition={{ repeat: Infinity, duration: 3, ease: "easeOut" }}
              />
              <motion.circle cx="180" cy="250" r="40" fill="none" stroke="#c75a3f" strokeWidth="1.5"
                style={{ transformOrigin: "180px 250px" }}
                animate={{ scale: [1, 5], opacity: [0.8, 0] }}
                transition={{ repeat: Infinity, duration: 3, ease: "easeOut", delay: 1.5 }}
              />
              <circle cx="180" cy="250" r="140" fill="none" stroke="#e8c547" strokeWidth="1" opacity="0.4"/>
              <circle cx="180" cy="250" r="80" fill="none" stroke="#e8c547" strokeWidth="1" opacity="0.4"/>
              <line x1="0" y1="250" x2="600" y2="250" stroke="#ffffff" strokeWidth="1" opacity="0.2"/>
              <line x1="180" y1="0" x2="180" y2="400" stroke="#ffffff" strokeWidth="1" opacity="0.2"/>
              <motion.line x1="180" y1="250" x2="180" y2="110" stroke="#e8c547" strokeWidth="2" opacity="0.6"
                style={{ transformOrigin: "180px 250px" }}
                animate={{ rotate: [0, 360] }}
                transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
              />
              <text x="400" y="210" fontFamily="serif" fontSize="72" fontStyle="italic" fill="#f0ece3" opacity="0.3" textAnchor="middle">{data.svgText || "VISION"}</text>
            </svg>
          </div>

          {/* Cell 2: Interactive 3D Icosahedron */}
          <div className="hero-grid-cell" style={{ background: 'radial-gradient(circle at top left, #122418 0%, #0a0a0a 100%)' }}>
            <ThreeCanvas />
          </div>

          {/* Cell 3: Floating Triangle */}
          <div className="hero-grid-cell" style={{ background: 'radial-gradient(circle at bottom right, #241236 0%, #0a0a0a 100%)' }}>
            <svg className="img-placeholder" viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
              <motion.polygon points="100,30 170,150 30,150" fill="none" stroke="#9b7fc7" strokeWidth="1" opacity="0.5"
                style={{ transformOrigin: "100px 110px" }}
                animate={{ rotate: [0, 360] }}
                transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
              />
              <motion.polygon points="100,50 150,135 50,135" fill="none" stroke="#9b7fc7" strokeWidth="1.5" opacity="0.9"
                style={{ transformOrigin: "100px 106px" }}
                animate={{ rotate: [0, -360], scale: [0.8, 1.1, 0.8] }}
                transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
              />
            </svg>
          </div>

          {/* Cell 4: Data Stream */}
          <div className="hero-grid-cell" style={{ background: 'linear-gradient(180deg, #181208 0%, #0a0a0a 100%)' }}>
            <svg className="img-placeholder" viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
              <circle cx="100" cy="100" r="60" fill="none" stroke="#e8c547" strokeWidth="1" opacity="0.3"/>
              <circle cx="100" cy="100" r="30" fill="none" stroke="#e8c547" strokeWidth="1.5" opacity="0.5"/>
              {[...Array(6)].map((_, i) => (
                <motion.circle key={i} cx={40 + i * 24} cy="200" r="3" fill="#e8c547"
                  animate={{ y: [0, -200], opacity: [0, 1, 0] }}
                  transition={{ repeat: Infinity, duration: 2 + (i % 3), delay: i * 0.5, ease: "linear" }}
                />
              ))}
            </svg>
          </div>

          {/* Cell 5: Scanning Interface */}
          <div className="hero-grid-cell" style={{ background: 'linear-gradient(90deg, #121616 0%, #0a0a0a 100%)' }}>
            <svg className="img-placeholder" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
              <line x1="0" y1="100" x2="400" y2="100" stroke="#f0ece3" strokeWidth="1" opacity="0.3"/>
              {[...Array(8)].map((_, i) => (
                <line key={i} x1={50 * i} y1="0" x2={50 * i} y2="200" stroke="#f0ece3" strokeWidth="0.5" opacity="0.2"/>
              ))}
              <motion.line x1="0" y1="0" x2="0" y2="200" stroke="#e8c547" strokeWidth="2.5" opacity="0.9"
                animate={{ x: [0, 400, 0] }}
                transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
              />
              <text x="200" y="105" fontFamily="monospace" fontSize="12" fill="#f0ece3" opacity="0.6" textAnchor="middle" letterSpacing="6">
                CRAFT · VISION · FORM
              </text>
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
