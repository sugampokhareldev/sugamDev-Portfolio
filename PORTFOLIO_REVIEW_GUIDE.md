# Portfolio Technical & Design Brief
**Target Audience:** Web Developers, Creative Developers, and UI/UX Designers providing peer review.

## 📌 Project North Star
An immersive, interactive portfolio that blends storytelling, sophisticated animations, and modern web technologies to deliver a memorable user experience. The design aims for a premium, editorial, "Awwwards-level" aesthetic (inspired by minimalist, grid-based layouts like Mina Massoud). It prioritizes cinematic transitions, typography, and buttery-smooth performance over bloated 3D libraries.

---

## 🛠 Tech Stack
- **Framework:** React 18 (via Vite for fast HMR and optimized builds)
- **Styling:** Vanilla CSS (`index.css`) utilizing CSS Variables for strict token management. No Tailwind or Bootstrap to maintain complete custom layout control.
- **Scroll Hijacking:** `@studio-freight/lenis` (for buttery smooth, hardware-accelerated momentum scrolling).
- **Animation Engine (Scroll & Timelines):** `gsap` (GreenSock) + `ScrollTrigger` for complex, sequenced viewport entrance animations.
- **Animation Engine (Physics):** `framer-motion` for spring-physics interactions (e.g., custom magnetic buttons, liquid masking, and continuous SVG loop animations).
- **Hosting / Deployment:** Vercel (Configured via `vercel.json` for SPA routing).

---

## 📂 Architecture & Data Flow
The project follows a strict **Data-First** architecture to separate content from logic.

- **`src/data/portfolio.json`**: The single source of truth. All text, project metadata, URLs, and stats are fed from here.
- **`src/components/`**: Modular, highly focused React components (`Hero.jsx`, `Work.jsx`, `About.jsx`, etc.).
- **`public/projects/`**: Static media storage. Dynamically handles `<video>` (auto-looping/muted) or `<img>` rendering based on the JSON payload.

---

## 🎨 Key Features & Animation Strategies

### 1. Cinematic Word-Reveal Preloader
Built using GSAP. Flashes a sequence of words while locking scroll, then triggers the Hero entrance animations only once the preloader resolves.
```jsx
// Preloader.jsx
const tl = gsap.timeline({
  onComplete: () => {
    gsap.to(containerRef.current, {
      yPercent: -100, duration: 0.8, ease: 'power4.inOut',
      onComplete: () => { document.body.style.overflow = ''; onComplete(); }
    });
  }
});
```

### 2. Restrained Magnetic UI (`Magnetic.jsx`)
A custom Framer Motion wrapper applied *only* to primary Call-To-Action buttons. Uses a `0.2` mouse pull ratio and spring physics to create a tactile feel.
```jsx
// Magnetic.jsx
const { x, y } = position; // updated via onMouseMove
return (
  <motion.div
    ref={ref} onMouseMove={handleMouse} onMouseLeave={reset}
    animate={{ x, y }}
    transition={{ type: 'spring', stiffness: 200, damping: 15, mass: 0.1 }}
  >
    {children}
  </motion.div>
);
```

### 3. DOM-based WebGL Alternatives (Hero Grid)
Instead of using heavy Canvas setups, the Hero grid utilizes pure Framer Motion and complex SVGs to create looping, code-driven abstract animations.
```jsx
// Hero.jsx (Example: Sonar Sweep Cell)
<motion.circle cx="180" cy="250" r="40" fill="none" stroke="#c75a3f" strokeWidth="1"
  animate={{ r: [40, 200], opacity: [0.8, 0] }}
  transition={{ repeat: Infinity, duration: 3, ease: "easeOut" }}
/>
```

### 4. Liquid Cursor Mask (`About.jsx`)
Uses Framer Motion to track the user's cursor and dynamically update an SVG `clipPath`, creating a fluid flashlight-reveal over a portrait image.
```jsx
// About.jsx
const maskX = useSpring(0, { stiffness: 100, damping: 20 });
const maskY = useSpring(0, { stiffness: 100, damping: 20 });
const clipPath = useMotionTemplate`circle(120px at ${maskX}px ${maskY}px)`;

return (
  <motion.img src="/real.jpg" style={{ clipPath }} className="reveal-layer" />
);
```

### 5. Dynamic "In Production" Placeholders
Projects marked as "N/A" bypass the media renderer and generate a sleek, cyberpunk-style scanning laser placeholder.
```jsx
// Work.jsx
<motion.div 
  animate={{ y: ['-500%', '500%'] }}
  transition={{ repeat: Infinity, duration: 4, ease: 'linear' }}
  style={{
    position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
    background: 'linear-gradient(90deg, transparent, #6b6460, transparent)',
    boxShadow: '0 0 8px #6b6460', opacity: 0.5
  }}
/>
```

---

## 🔍 Areas for Review & Feedback
*Please review the codebase/live site and provide feedback on the following areas:*

### For Designers:
1. **Typography & Hierarchy:** Are the fluid typography scales (`vw/vh`) behaving beautifully across ultra-wide and mobile breakpoints?
2. **Pacing & Easing:** Do the GSAP `power3.out` and Framer Motion spring physics feel natural, or do they need tightening?
3. **Contrast & Accessibility:** With the dark editorial theme and thin SVG strokes, is the contrast sufficient for professional standards?

### For Developers:
1. **Performance (Jank/Layout Thrashing):** Review the GSAP `ScrollTrigger` and Framer Motion implementations. Are there any unnecessary re-renders or layout paints occurring during scroll?
2. **Component Modularity:** Are the components appropriately scoped, or should the GSAP timeline logic be abstracted into custom hooks?
3. **Asset Optimization:** Feedback on the current strategy of serving raw `<video>` tags vs. implementing a custom lazy-loading Intersection Observer.

---
*Created by Sugam Pokharel — Ready for Production.*
