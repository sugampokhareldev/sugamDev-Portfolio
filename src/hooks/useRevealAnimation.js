import { useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function useRevealAnimation(ref, selector, options = {}, deps = []) {
  useEffect(() => {
    if (!ref.current) return;
    
    const elements = ref.current.querySelectorAll(selector);
    if (!elements.length) return;

    // Accessibility check: skip animation if user prefers reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      gsap.set(elements, { opacity: 1, y: 0 });
      return;
    }

    // Performance optimization: hint browser
    gsap.set(elements, { willChange: 'transform, opacity' });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: ref.current,
        start: options.start || 'top 80%',
        ...options.scrollTriggerOptions
      }
    });

    tl.fromTo(elements,
      { opacity: 0, y: options.y || 40 },
      { 
        opacity: 1, 
        y: 0, 
        duration: options.duration || 0.8, 
        stagger: options.stagger || 0.2, 
        ease: options.ease || 'power3.out',
        clearProps: 'willChange' // cleanup after animation
      }
    );

    return () => {
      if (tl.scrollTrigger) tl.scrollTrigger.kill();
      tl.kill();
    };
  }, [ref, selector, ...deps]);
}
