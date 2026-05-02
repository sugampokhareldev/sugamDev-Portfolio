import { useEffect } from 'react';
import { gsap } from 'gsap';

export function useHeroReveal(leftRef, gridRef, ready) {
  useEffect(() => {
    if (!ready) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      gsap.set(leftRef.current.querySelectorAll('*'), { opacity: 1, y: 0 });
      gsap.set(gridRef.current, { opacity: 1 });
      return;
    }

    const tl = gsap.timeline();
    const texts = leftRef.current.querySelectorAll('.hero-tag, .hero-desc, .hero-cta, .hero-scroll');
    const chars = leftRef.current.querySelectorAll('.hero-char');
    
    gsap.set([...texts, ...chars], { willChange: 'transform, opacity' });
    gsap.set(gridRef.current, { willChange: 'opacity' });

    tl.fromTo(leftRef.current.querySelector('.hero-tag'), 
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', delay: 0.2, clearProps: 'willChange' }
    )
    .fromTo(chars,
      { opacity: 0, y: 40 },
      { opacity: 1, y: 0, duration: 0.8, stagger: 0.04, ease: 'back.out(1.2)', clearProps: 'willChange' },
      "-=0.6"
    )
    .fromTo(leftRef.current.querySelectorAll('.hero-desc, .hero-cta, .hero-scroll'), 
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.8, stagger: 0.15, ease: 'power3.out', clearProps: 'willChange' },
      "-=0.6"
    );

    gsap.fromTo(gridRef.current,
      { opacity: 0 },
      { opacity: 1, duration: 1.2, delay: 0.5, clearProps: 'willChange' }
    );

    return () => {
      tl.kill();
      gsap.killTweensOf(gridRef.current);
    };
  }, [ready, leftRef, gridRef]);
}
