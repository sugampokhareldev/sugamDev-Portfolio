import React, { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import portfolioData from '../data/portfolio.json';

const Marquee = () => {
  const track1Ref = useRef(null);
  const track2Ref = useRef(null);

  useEffect(() => {
    // GSAP infinite marquee
    const track1 = track1Ref.current;
    const track2 = track2Ref.current;
    
    // We duplicate the items in the DOM so we only scroll half the width
    const totalWidth = track1.scrollWidth / 2;

    gsap.to(track1, {
      x: -totalWidth,
      ease: 'none',
      duration: 30, 
      repeat: -1,
    });

    gsap.fromTo(track2, 
      { x: -totalWidth },
      {
        x: 0,
        ease: 'none',
        duration: 30, 
        repeat: -1,
      }
    );
  }, []);

  return (
    <div className="marquee-wrap">
      <div className="marquee-track" ref={track1Ref}>
        {portfolioData.marquee.map((item, idx) => (
          <span key={idx} className="marquee-item">{item} <span>✦</span></span>
        ))}
        {portfolioData.marquee.map((item, idx) => (
          <span key={`dup1-${idx}`} className="marquee-item">{item} <span>✦</span></span>
        ))}
      </div>
      <div className="marquee-track marquee-stroke" ref={track2Ref}>
        {portfolioData.marquee.map((item, idx) => (
          <span key={idx} className="marquee-item">{item} <span>✦</span></span>
        ))}
        {portfolioData.marquee.map((item, idx) => (
          <span key={`dup2-${idx}`} className="marquee-item">{item} <span>✦</span></span>
        ))}
      </div>
    </div>
  );
};

export default Marquee;
