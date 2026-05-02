import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRevealAnimation } from '../hooks/useRevealAnimation';
import { gsap } from 'gsap';

const InProductionPlaceholder = () => (
  <div className="project-visual" style={{
    backgroundColor: '#0a0a0a',
    position: 'relative',
    overflow: 'hidden',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }}>
    <svg width="100%" height="100%" style={{ position: 'absolute', opacity: 0.15 }} aria-hidden="true" focusable="false">
      <pattern id="prod-grid" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#f0ece3" strokeWidth="0.5"/>
      </pattern>
      <rect width="100%" height="100%" fill="url(#prod-grid)" />
    </svg>
    <motion.div 
      animate={{ y: ['-500%', '500%'] }}
      transition={{ repeat: Infinity, duration: 4, ease: 'linear' }}
      style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, height: '1px',
        background: 'linear-gradient(90deg, transparent, #6b6460, transparent)',
        boxShadow: '0 0 8px #6b6460',
        opacity: 0.5
      }}
    />
    <div style={{
      border: '1px solid rgba(240, 236, 227, 0.1)',
      padding: '8px 16px',
      color: '#6b6460',
      fontFamily: "'DM Mono', monospace",
      fontSize: '10px',
      letterSpacing: '0.3em',
      textTransform: 'uppercase',
      background: 'rgba(10, 10, 10, 0.6)',
      backdropFilter: 'blur(2px)'
    }}>
      In Production
    </div>
  </div>
);

const LazyVideo = ({ src, className, style }) => {
  const videoRef = useRef(null);
  const [shouldLoad, setShouldLoad] = React.useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setShouldLoad(true);
        observer.disconnect();
      }
    }, { rootMargin: '400px 0px' });

    if (videoRef.current) observer.observe(videoRef.current);

    return () => observer.disconnect();
  }, []);

  // Use a placeholder div with the same styles if not loaded, or just render the video without src
  return (
    <video
      ref={videoRef}
      className={className}
      muted
      loop
      playsInline
      autoPlay={shouldLoad}
      src={shouldLoad ? src : undefined}
      style={{ ...style, backgroundColor: '#111' }}
    />
  );
};

const Work = ({ data }) => {
  const workRef = useRef(null);

  useRevealAnimation(workRef, '.section-header', { start: 'top 85%', stagger: 0 });
  useRevealAnimation(workRef, '.project-card', { start: 'top 85%', y: 60, stagger: 0.15 });

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      const cards = gsap.utils.toArray('.project-card');
      cards.forEach((card) => {
        const visual = card.querySelector('.project-visual');
        if (!visual) return;
        
        gsap.set(visual, { scale: 1.15, transformOrigin: 'center center' });
        
        gsap.to(visual, {
          yPercent: 15,
          ease: 'none',
          scrollTrigger: {
            trigger: card,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true
          }
        });
      });
    }, workRef);

    return () => ctx.revert();
  }, [data.projects]);

  return (
    <section id="work" ref={workRef}>
      <div className="section-header">
        <div>
          <span className="section-num">{data.sectionNum}</span>
          <h2 className="section-title">{data.title}</h2>
        </div>
        <a href="#" className="section-link">{data.linkText}</a>
      </div>

      <div className="projects-grid">
        {data.projects.map((project, index) => {
          let svgContent;
          if(index === 0) {
            svgContent = (
              <svg className="project-visual" viewBox="0 0 700 420" preserveAspectRatio="xMidYMid slice" style={{height:'100%'}} aria-hidden="true" focusable="false">
                <defs><linearGradient id="p1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#c75a3f"/><stop offset="60%" stopColor="#8a2a18"/><stop offset="100%" stopColor="#200808"/></linearGradient></defs>
                <rect fill="url(#p1)" width="700" height="420"/>
                <circle cx="350" cy="210" r="200" fill="none" stroke="#f0ece3" strokeWidth="1" opacity="0.3"/>
                <circle cx="350" cy="210" r="120" fill="none" stroke="#f0ece3" strokeWidth="1" opacity="0.2"/>
                <circle cx="350" cy="210" r="50" fill="#e8c547" opacity="0.15"/>
                <text x="350" y="200" fontFamily="serif" fontSize="96" fontStyle="italic" fill="#f0ece3" opacity="0.15" textAnchor="middle">{project.svgText}</text>
                <line x1="0" y1="210" x2="700" y2="210" stroke="#f0ece3" strokeWidth="1" opacity="0.2"/>
                <line x1="350" y1="0" x2="350" y2="420" stroke="#f0ece3" strokeWidth="1" opacity="0.2"/>
              </svg>
            );
          } else if (index === 1) {
            svgContent = (
              <svg className="project-visual" viewBox="0 0 300 400" preserveAspectRatio="xMidYMid slice" style={{height:'100%'}} aria-hidden="true" focusable="false">
                <defs><linearGradient id="p2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#0a1820"/><stop offset="100%" stopColor="#001428"/></linearGradient></defs>
                <rect fill="url(#p2)" width="300" height="400"/>
                <rect x="30" y="30" width="240" height="340" fill="none" stroke="#4a9cc7" strokeWidth="1" opacity="0.4"/>
                <rect x="60" y="60" width="180" height="280" fill="none" stroke="#4a9cc7" strokeWidth="1.5" opacity="0.4"/>
                <circle cx="150" cy="200" r="70" fill="none" stroke="#4a9cc7" strokeWidth="1" opacity="0.6"/>
                <text x="150" y="195" fontFamily="monospace" fontSize="9" fill="#4a9cc7" opacity="0.6" textAnchor="middle" letterSpacing="3">{project.svgText1}</text>
                <text x="150" y="210" fontFamily="monospace" fontSize="9" fill="#4a9cc7" opacity="0.4" textAnchor="middle" letterSpacing="3">{project.svgText2}</text>
              </svg>
            );
          } else if (index === 2) {
            svgContent = (
              <svg className="project-visual" viewBox="0 0 280 240" preserveAspectRatio="xMidYMid slice" style={{height:'100%'}} aria-hidden="true" focusable="false">
                <defs><radialGradient id="p3" cx="50%" cy="50%"><stop offset="0%" stopColor="#2a3a0a"/><stop offset="100%" stopColor="#0a0f06"/></radialGradient></defs>
                <rect fill="url(#p3)" width="280" height="240"/>
                <polygon points="140,20 260,200 20,200" fill="none" stroke="#8ac740" strokeWidth="1" opacity="0.5"/>
                <polygon points="140,55 225,195 55,195" fill="none" stroke="#8ac740" strokeWidth="1.5" opacity="0.5"/>
                <circle cx="140" cy="148" r="30" fill="#8ac740" opacity="0.2"/>
              </svg>
            );
          } else if (index === 3) {
            svgContent = (
              <svg className="project-visual" viewBox="0 0 280 240" preserveAspectRatio="xMidYMid slice" style={{height:'100%'}} aria-hidden="true" focusable="false">
                <defs><linearGradient id="p4" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stopColor="#1a1040"/><stop offset="100%" stopColor="#080a1c"/></linearGradient></defs>
                <rect fill="url(#p4)" width="280" height="240"/>
                <line x1="0" y1="0" x2="280" y2="240" stroke="#9b7fc7" strokeWidth="1" opacity="0.4"/>
                <line x1="280" y1="0" x2="0" y2="240" stroke="#9b7fc7" strokeWidth="1" opacity="0.4"/>
                <circle cx="140" cy="120" r="60" fill="none" stroke="#9b7fc7" strokeWidth="1.5" opacity="0.5"/>
                <circle cx="140" cy="120" r="35" fill="#9b7fc7" opacity="0.2"/>
                <text x="140" y="125" fontFamily="serif" fontStyle="italic" fontSize="14" fill="#9b7fc7" opacity="0.7" textAnchor="middle">{project.svgText}</text>
              </svg>
            );
          } else {
            svgContent = (
              <svg className="project-visual" viewBox="0 0 280 240" preserveAspectRatio="xMidYMid slice" style={{height:'100%'}} aria-hidden="true" focusable="false">
                <defs><radialGradient id="p5" cx="50%" cy="50%"><stop offset="0%" stopColor="#3a1a0a"/><stop offset="100%" stopColor="#0a0808"/></radialGradient></defs>
                <rect fill="url(#p5)" width="280" height="240"/>
                <circle cx="140" cy="120" r="80" fill="none" stroke="#e8c547" strokeWidth="1" opacity="0.4"/>
                <circle cx="140" cy="120" r="50" fill="none" stroke="#e8c547" strokeWidth="1.5" opacity="0.5"/>
                <circle cx="140" cy="120" r="20" fill="#e8c547" opacity="0.3"/>
                <line x1="60" y1="120" x2="220" y2="120" stroke="#e8c547" strokeWidth="1" opacity="0.4"/>
                <line x1="140" y1="40" x2="140" y2="200" stroke="#e8c547" strokeWidth="1" opacity="0.4"/>
              </svg>
            );
          }

          return (
            <div 
              key={index} 
              className="project-card"
            >
              {project.cat === "N/A" ? (
                <InProductionPlaceholder />
              ) : project.media ? (
                project.media.type === 'video' ? (
                  <LazyVideo 
                    src={project.media.src} 
                    className="project-visual" 
                    style={{ objectFit: 'cover' }}
                  />
                ) : (
                  <img 
                    src={project.media.src} 
                    className="project-visual" 
                    alt={project.name} 
                    loading="lazy"
                    style={{ objectFit: 'cover' }}
                  />
                )
              ) : (
                svgContent
              )}
              <div className="project-overlay">
                <div className="project-cat">{project.cat}</div>
                <div className="project-name">{project.name}</div>
                <div className="project-year">{project.year}</div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  );
};

export default Work;
