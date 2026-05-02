import React, { useRef, useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform, useMotionTemplate } from 'framer-motion';
import { useRevealAnimation } from '../hooks/useRevealAnimation';

const About = ({ data }) => {
  const sectionRef = useRef(null);
  const containerRef = useRef(null);
  const [useFallback, setUseFallback] = React.useState(false);

  // Framer Motion Values
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const isHovered = useMotionValue(0);

  // Springs for buttery smooth physics
  const springConfig = { damping: 20, stiffness: 150, mass: 0.5 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);
  const smoothHover = useSpring(isHovered, { damping: 15, stiffness: 120 });

  // Transform hover state (0 to 1) into radius and scale
  const maskRadius = useTransform(smoothHover, [0, 1], [0, 150]);
  const imgScale = useTransform(smoothHover, [0, 1], [1, 1.05]);

  // Generate dynamic clipPath string
  const clipPath = useMotionTemplate`circle(${maskRadius}px at ${smoothX}px ${smoothY}px)`;

  useEffect(() => {
    const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isTouch = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
    if (isReduced || isTouch) {
      setUseFallback(true);
    }
  }, []);

  useRevealAnimation(sectionRef, '.section-header, .about-visual, .about-text');

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  };

  return (
    <section id="about" ref={sectionRef}>
      <div className="section-header">
        <div>
          <span className="section-num">{data.sectionNum}</span>
          <h2 className="section-title">{data.title}</h2>
        </div>
      </div>
      <div className="about-grid">
        <div className="about-visual">
          <div 
            className="about-img-container"
            ref={containerRef}
            onMouseMove={!useFallback ? handleMouseMove : undefined}
            onMouseEnter={!useFallback ? () => isHovered.set(1) : undefined}
            onMouseLeave={!useFallback ? () => isHovered.set(0) : undefined}
            style={{ cursor: useFallback ? 'auto' : 'none' }}
          >
            {useFallback ? (
              <img src="/images/unmasked-pfp.jpg" alt="Sugam Unmasked" className="about-img unmasked" style={{ zIndex: 1 }} />
            ) : (
              <>
                <img src="/images/masked-pfp.jpg" alt="Sugam Masked" className="about-img masked" />
                <motion.img 
                  src="/images/unmasked-pfp.jpg" 
                  alt="Sugam Unmasked" 
                  className="about-img unmasked" 
                  style={{
                    clipPath,
                    WebkitClipPath: clipPath,
                    scale: imgScale,
                    transformOrigin: "center center"
                  }}
                />
                
                {/* Animated Border Ring around the mask */}
                <motion.div
                  style={{
                    position: 'absolute',
                    top: smoothY,
                    left: smoothX,
                    width: useTransform(maskRadius, r => r * 2),
                    height: useTransform(maskRadius, r => r * 2),
                    x: '-50%',
                    y: '-50%',
                    borderRadius: '50%',
                    pointerEvents: 'none',
                    zIndex: 10,
                    opacity: smoothHover,
                    border: '1px solid var(--accent)',
                  }}
                >
                  <motion.div
                    style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: '50%',
                      border: '2px dashed rgba(232, 197, 71, 0.4)',
                    }}
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 10, ease: "linear" }}
                  />
                </motion.div>
              </>
            )}
          </div>
          <div className="about-tag">Developer</div>
          <div className="about-decor"></div>
        </div>
        <div className="about-text">
          <p className="about-intro">{data.introText}<em>{data.introEmphasis}</em>{data.introTextEnd}</p>
          <p className="about-body">{data.body1}</p>
          <p className="about-body" style={{marginTop: '-16px'}}>{data.body2}</p>
          <div className="skills-list">
            {data.skills.map((skill, i) => (
              <div key={i} className="skill-item"><div className="skill-dot"></div> {skill}</div>
            ))}
          </div>
          <a href="#contact" className="btn btn-primary">Let's work together →</a>
        </div>
      </div>
    </section>
  );
};

export default About;
