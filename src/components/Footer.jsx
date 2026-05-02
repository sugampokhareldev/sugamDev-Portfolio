import React, { useRef } from 'react';
import portfolioData from '../data/portfolio.json';
import Magnetic from './Magnetic';
import { useRevealAnimation } from '../hooks/useRevealAnimation';

const Footer = () => {
  const contactRef = useRef(null);
  const data = portfolioData.contact;
  const footerData = portfolioData.footer;

  useRevealAnimation(contactRef, '.contact-heading, .contact-form', { start: 'top 85%' });

  return (
    <>
      <div className="contact-wrap" id="contact" ref={contactRef}>
        <div className="contact-heading">
          <span className="section-num">{data.sectionNum}</span>
          <h2 className="contact-big">{data.title1}<br/><em>{data.titleEmphasis}</em><br/>{data.title2}</h2>
        </div>
        <form className="contact-form" action="https://formspree.io/f/YOUR_FORM_ID" method="POST">
          <div className="form-group">
            <label className="form-label">Your Name</label>
            <input className="form-input" type="text" name="name" placeholder="Jane Smith" required />
          </div>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input className="form-input" type="email" name="email" placeholder="jane@example.com" required />
          </div>
          <div className="form-group">
            <label className="form-label">Project Type</label>
            <input className="form-input" type="text" name="projectType" placeholder="Web, App, Other..." />
          </div>
          <div className="form-group">
            <label className="form-label">Message</label>
            <textarea className="form-textarea" name="message" placeholder="Tell me about your project..." required></textarea>
          </div>
          <Magnetic>
            <button type="submit" className="btn btn-primary" style={{width: '100%', justifyContent: 'center'}}>Send Message →</button>
          </Magnetic>
        </form>
      </div>

      <footer>
        <div className="footer-logo">{footerData.logo}</div>
        <div className="footer-copy" style={{textAlign: 'center'}}>
          {footerData.copy}
          <div style={{opacity: 0.5, fontSize: '9px', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '4px'}}>
            Elements inspired by mina-massoud.com
          </div>
        </div>
        <div className="social-links">
          {footerData.socials.map((link, i) => (
            <a key={i} href={link.url} className="social-link">{link.name}</a>
          ))}
        </div>
      </footer>
    </>
  );
};

export default Footer;
