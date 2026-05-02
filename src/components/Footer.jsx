import React, { useRef } from 'react';
import portfolioData from '../data/portfolio.json';
import Magnetic from './Magnetic';
import { useRevealAnimation } from '../hooks/useRevealAnimation';
import { useForm, ValidationError } from '@formspree/react';

const Footer = () => {
  const contactRef = useRef(null);
  const data = portfolioData.contact;
  const footerData = portfolioData.footer;

  const [state, handleSubmit] = useForm('mdabkyzp');

  useRevealAnimation(contactRef, '.contact-heading, .contact-form', { start: 'top 85%' });

  return (
    <>
      <div className="contact-wrap" id="contact" ref={contactRef}>
        <div className="contact-heading">
          <span className="section-num">{data.sectionNum}</span>
          <h2 className="contact-big">{data.title1}<br/><em>{data.titleEmphasis}</em><br/>{data.title2}</h2>
        </div>
        {state.succeeded ? (
          <div className="contact-form" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '60px 24px', border: '1px solid rgba(240, 236, 227, 0.1)', background: 'var(--dim)' }}>
            <h3 style={{ fontSize: '28px', marginBottom: '16px', color: 'var(--accent)', fontFamily: "'Playfair Display', serif", fontStyle: "italic" }}>Message Sent!</h3>
            <p style={{ color: 'var(--muted)', lineHeight: '1.6' }}>Thanks for reaching out. I'll get back to you as soon as possible.</p>
          </div>
        ) : (
          <form className="contact-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Your Name</label>
              <input className="form-input" type="text" name="name" placeholder="Jane Smith" required />
              <ValidationError prefix="Name" field="name" errors={state.errors} style={{ color: 'red', fontSize: '12px', marginTop: '4px' }} />
            </div>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input className="form-input" type="email" name="email" placeholder="jane@example.com" required />
              <ValidationError prefix="Email" field="email" errors={state.errors} style={{ color: 'red', fontSize: '12px', marginTop: '4px' }} />
            </div>
            <div className="form-group">
              <label className="form-label">Project Type</label>
              <input className="form-input" type="text" name="projectType" placeholder="Web, App, Other..." />
              <ValidationError prefix="Project Type" field="projectType" errors={state.errors} style={{ color: 'red', fontSize: '12px', marginTop: '4px' }} />
            </div>
            <div className="form-group">
              <label className="form-label">Message</label>
              <textarea className="form-textarea" name="message" placeholder="Tell me about your project..." required></textarea>
              <ValidationError prefix="Message" field="message" errors={state.errors} style={{ color: 'red', fontSize: '12px', marginTop: '4px' }} />
            </div>
            <Magnetic>
              <button type="submit" disabled={state.submitting} className="btn btn-primary" style={{width: '100%', justifyContent: 'center'}}>
                {state.submitting ? 'Sending...' : 'Send Message →'}
              </button>
            </Magnetic>
          </form>
        )}
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
