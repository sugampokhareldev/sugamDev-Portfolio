import React, { useEffect, useState } from 'react';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);
import portfolioData from './data/portfolio.json';
import Hero from './components/Hero';
import Marquee from './components/Marquee';
import Work from './components/Work';
import Stats from './components/Stats';
import About from './components/About';
import Footer from './components/Footer';
import Cursor from './components/Cursor';
import Navbar from './components/Navbar';
import Preloader from './components/Preloader';

function App() {
  const [siteReady, setSiteReady] = useState(false);

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), 
      direction: 'vertical',
      gestureDirection: 'vertical',
      smooth: true,
      mouseMultiplier: 1,
      smoothTouch: false,
      touchMultiplier: 2,
      infinite: false,
    });

    lenis.on('scroll', ScrollTrigger.update);

    gsap.ticker.add((time) => {
      lenis.raf(time * 1000);
    });
    gsap.ticker.lagSmoothing(0);

    return () => {
      lenis.destroy();
    };
  }, []);

  return (
    <main aria-busy={!siteReady}>
      <Cursor />
      {!siteReady && <Preloader onComplete={() => setSiteReady(true)} />}
      <Navbar />
      <Hero data={portfolioData.hero} ready={siteReady} />
      <Marquee />
      <Work data={portfolioData.work} />
      <Stats data={portfolioData.stats} />
      <About data={portfolioData.about} />
      <Footer />
    </main>
  );
}

export default App;
