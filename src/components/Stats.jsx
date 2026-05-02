import React, { useRef } from 'react';
import { useRevealAnimation } from '../hooks/useRevealAnimation';

const Stats = ({ data }) => {
  const containerRef = useRef(null);
  
  useRevealAnimation(containerRef, '.stat-item', { start: 'top 90%', duration: 0.6, stagger: 0.1, y: 30 });

  return (
    <div className="stats-bar" ref={containerRef}>
      {data.map((stat, idx) => (
        <div key={idx} className="stat-item">
          <div className="stat-num">{stat.num}<sup>{stat.sup}</sup></div>
          <div className="stat-label">{stat.label}</div>
        </div>
      ))}
    </div>
  );
};

export default Stats;
