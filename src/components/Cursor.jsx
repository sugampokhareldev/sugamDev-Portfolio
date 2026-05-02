import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

const Cursor = () => {
  const cursorRef = useRef(null);

  useEffect(() => {
    const cursor = cursorRef.current;
    
    gsap.set(cursor, { xPercent: -50, yPercent: -50, x: window.innerWidth / 2, y: window.innerHeight / 2 });

    const onMouseMove = (e) => {
      gsap.to(cursor, {
        x: e.clientX,
        y: e.clientY,
        duration: 0.15,
        ease: 'power3.out',
      });
    };

    const onHoverEnter = () => {
      gsap.to(cursor, { width: 40, height: 40, opacity: 0.4, duration: 0.2 });
    };

    const onHoverLeave = () => {
      gsap.to(cursor, { width: 10, height: 10, opacity: 1, duration: 0.2 });
    };

    window.addEventListener('mousemove', onMouseMove);

    const interactiveElements = document.querySelectorAll('a, button, .project-card, .hero-grid-cell, .form-input, .form-textarea');
    interactiveElements.forEach((el) => {
      el.addEventListener('mouseenter', onHoverEnter);
      el.addEventListener('mouseleave', onHoverLeave);
    });

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      interactiveElements.forEach((el) => {
        el.removeEventListener('mouseenter', onHoverEnter);
        el.removeEventListener('mouseleave', onHoverLeave);
      });
    };
  }, []);

  return <div className="cursor" ref={cursorRef} />;
};

export default Cursor;
