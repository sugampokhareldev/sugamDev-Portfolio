import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

const Preloader = ({ onComplete }) => {
  const containerRef = useRef(null);
  const wordsRef = useRef(null);

  const words = ["HELLO", "NAMASTE", "WELCOME"];

  useEffect(() => {
    // Lock scroll
    document.body.style.overflow = 'hidden';

    let ctx = gsap.context(() => {
      const tl = gsap.timeline({
        onComplete: () => {
          gsap.to(containerRef.current, {
            yPercent: -100,
            duration: 0.8,
            ease: 'power4.inOut',
            onComplete: () => {
              document.body.style.overflow = '';
              if (onComplete) onComplete();
            }
          });
        }
      });

      const wordElements = wordsRef.current.children;
      
      // Quick flash sequence
      Array.from(wordElements).forEach((word) => {
        tl.to(word, {
          opacity: 1,
          duration: 0.15,
          ease: 'none'
        })
        .to(word, {
          opacity: 0,
          duration: 0.15,
          ease: 'none',
          delay: 0.15
        });
      });
    }, containerRef);

    return () => {
      document.body.style.overflow = '';
      ctx.revert();
    };
  }, [onComplete]);

  return (
    <div 
      ref={containerRef}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#0a0a0a',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'all'
      }}
    >
      <div 
        ref={wordsRef} 
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: '12px',
          letterSpacing: '0.3em',
          color: '#f0ece3',
          position: 'relative'
        }}
      >
        {words.map((w, i) => (
          <span 
            key={i} 
            style={{ 
              position: 'absolute', 
              top: '50%', 
              left: '50%', 
              transform: 'translate(-50%, -50%)', 
              opacity: 0 
            }}
          >
            {w}
          </span>
        ))}
      </div>
    </div>
  );
};

export default Preloader;
