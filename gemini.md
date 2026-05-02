# Project Map (System Pilot)

## North Star
An immersive, interactive portfolio that blends storytelling, animation, and modern web technologies to deliver a memorable user experience. It will showcase technical depth (WebGL, animations, interactions) and demonstrate creativity and engineering together, feeling like an experience rather than a static website.

## Integrations
- **Rendering & Animation:** GSAP (smooth timeline-based animations), Three.js (for 3D scenes)
- **Shader Programming:** GLSL (custom visual effects)
- **Optional:** GitHub (project linking), Vercel (hosting)
- **Constraints:** Keep integrations minimal and intentional. Prioritize performance and visuals over heavy APIs.

## Source of Truth
- Static content (projects, text, assets) stored locally (JSON).
- Media assets optimized (images, videos, shaders).
- Minimal database usage to keep the site fast, lightweight, and fully controlled.

## Delivery Payload
- A live immersive website experience hosted via Vercel.
- Smooth scrolling, animations, and cinematic transitions.
- Interactive sections (hover, scroll, click-based storytelling).
- (Optional) Case studies and GitHub links.

## Behavioral Rules
- **Design:** Minimal but expressive typography, strong visual hierarchy, cinematic transitions.
- **Interaction:** Every action feels intentional. Smooth animations (no lag). Interactions guide the user.
- **Technical:** Maintain high performance (especially WebGL), lazy-load heavy assets, responsive (desktop first, mobile supported).
- **Strict "Do Not":** 
  - ❌ No random animations without purpose
  - ❌ No cluttered UI
  - ❌ No heavy load times (>3 seconds)
  - ❌ No broken interactions

## Data Schema
*Data-First Rule: Coding only begins once this Payload shape is confirmed.*

**Input Payload (Local JSON Data Source): `src/data/portfolio.json`**
```json
{
  "profile": {
    "name": "Sugam Pokharel",
    "role": "MERN Stack Developer",
    "bio": "I work across both front-end and back-end, creating scalable systems while crafting smooth, engaging user experiences. My interests lie in combining functionality with creativity—using animation, storytelling, and emerging technologies to make the web more immersive.",
    "interests": ["WebGL", "GSAP", "Full-Stack Development"]
  },
  "story": [
    {
      "id": "intro",
      "type": "hero",
      "heading": "Building Immersive Digital Experiences",
      "text": "Hi, I'm Sugam Pokharel. I blend creativity with robust engineering.",
      "visual": "canvas-particles"
    },
    {
      "id": "about",
      "type": "narrative",
      "heading": "Beyond the Stack",
      "text": "It's not just about MERN. It's about how the user feels. I use GSAP and WebGL to tell stories.",
      "visual": "scroll-reveal"
    },
    {
      "id": "work",
      "type": "gallery",
      "heading": "Featured Works",
      "projects": [
        {
          "id": "project-id",
          "title": "Project Title",
          "description": "Short description of the project.",
          "technologies": ["React", "Three.js", "GSAP"],
          "githubUrl": "https://github.com/...",
          "liveUrl": "https://...",
          "media": {
            "thumbnail": "/assets/projects/thumb.jpg",
            "video": "/assets/projects/demo.mp4"
          }
        }
      ]
    },
    {
      "id": "contact",
      "type": "footer",
      "heading": "Let's build something memorable.",
      "email": "contact@example.com"
    }
  ]
}
```

## Maintenance Log
- **2026-05-02:** Initialized project via B.L.A.S.T. protocol.
- **2026-05-02:** Pivoted to Mina Massoud cinematic aesthetic (Lenis smooth scroll, Custom GSAP Cursor, Playfair Display/Oswald typography, Film Grain).
- **2026-05-02:** Project marked Production Ready (Phase 5: Trigger). Configured `vercel.json` for cloud transfer.
