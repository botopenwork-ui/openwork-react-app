import React from 'react';
import './ContactSection.css';

const ContactSection = () => {
  return (
    <section className="lp-13-section">
      <div className="lp-13-container">
        <div className="lp-13-content">
          <h2 className="lp-13-heading">Contact us</h2>
          <p className="lp-13-description">
            OpenWork is building the internet's decentralized work layer — and we can't do it without you. Whether you're here to explore, collaborate, or contribute, we're always open to meaningful conversations.
          </p>
        </div>

        <div className="lp-13-form-container">
          <form className="lp-13-contact-form" onSubmit={(e) => { e.preventDefault(); }}>
            <input 
              type="text" 
              placeholder="Your name" 
              className="lp-13-input"
            />
            <input 
              type="email" 
              placeholder=" Your email" 
              className="lp-13-input"
            />
            <textarea 
              placeholder="Type a message here" 
              className="lp-13-textarea"
              rows="5"
            ></textarea>
            <button type="submit" className="lp-13-send-button">
              Send Message
              <img src="/assets/lp13-arrow-icon.svg" alt="" className="lp-13-button-icon" />
            </button>
          </form>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
