"use client";

import React, { useEffect, useState } from 'react';

export function KresnaFooter() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubscribed(true);
    setEmail('');
    setTimeout(() => setSubscribed(false), 3000);
  };

  useEffect(() => {
    // Component mounted
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@500;600;700&family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600;1,700&display=swap');
        
        .kresna-footer-root {
          font-family: 'DM Sans', sans-serif;
          color: #2d3148;
          width: 100%;
        }
        
        .kresna-footer-root *, .kresna-footer-root *::before, .kresna-footer-root *::after {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        .kresna-footer-section {
          background: transparent;
          padding: 48px 24px;
          position: relative;
          width: 100%;
        }

        .kresna-footer-wrapper {
          max-width: 100%;
          padding: 0 2vw;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 350px 1fr;
          gap: 16px;
          align-items: stretch;
        }

        .kresna-footer-left {
          position: relative;
          min-height: 340px;
          border-radius: 28px;
          padding: 32px;
          overflow: hidden;
          box-shadow: 0 12px 40px rgba(21, 76, 189, 0.25);
          background: #1e4fc0;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .kresna-footer-left-video {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          z-index: 0;
          pointer-events: none;
        }

        .kresna-footer-logo {
          display: flex;
          flex-direction: row;
          gap: 10px;
          position: relative;
          z-index: 1;
          align-items: center;
        }

        .kresna-footer-logo-mark {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: rgba(255,255,255,0.15);
          border: 1.5px solid rgba(255,255,255,0.85);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'DM Sans', sans-serif;
          font-size: 16px;
          font-weight: 700;
          color: white;
          letter-spacing: -0.02em;
        }

        .kresna-footer-logo-name {
          font-family: 'DM Sans', sans-serif;
          font-size: 22px;
          font-weight: 700;
          color: white;
          letter-spacing: -0.02em;
        }

        .kresna-footer-tagline-container {
          margin-top: auto;
          margin-bottom: 28px;
          position: relative;
          z-index: 1;
        }

        .kresna-footer-tagline {
          font-size: 19px;
          font-weight: 400;
          color: white;
          line-height: 1.45;
        }

        .kresna-footer-tagline span {
          color: rgba(255, 255, 255, 0.65);
        }

        .kresna-footer-social-row {
          display: flex;
          flex-direction: row;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          position: relative;
          z-index: 1;
        }

        .kresna-footer-social-label {
          font-family: 'Caveat', cursive;
          font-size: 17px;
          font-weight: 600;
          color: rgba(255,255,255,0.9);
          letter-spacing: 0.3px;
        }

        .kresna-footer-social-icons {
          display: flex;
          flex-direction: row;
          gap: 7px;
        }

        .kresna-social-icon {
          width: 36px;
          height: 36px;
          border-radius: 9px;
          background: #0e1014;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 6px 18px rgba(0,0,0,0.35), 0 2px 6px rgba(0,0,0,0.2);
          cursor: pointer;
          transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
        }
        .kresna-social-icon:hover {
          background: #000;
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.45), 0 4px 12px rgba(0,0,0,0.3);
        }
        .kresna-social-icon svg {
          width: 15px;
          height: 15px;
          fill: white;
        }

        .kresna-footer-right {
          background: #f0f1f5;
          border-radius: 28px;
          padding: 40px;
          overflow: visible;
          box-shadow: 0 4px 20px rgba(0,0,0,0.04);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          position: relative;
        }

        .kresna-footer-lucky-graphic {
          position: absolute;
          top: -36px;
          right: 40px;
          z-index: 10;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 6px;
        }

        .kresna-lucky-cube {
          width: 96px;
          height: 96px;
          border-radius: 22px;
          transform: rotate(-10deg);
          background: linear-gradient(135deg, #5b9ffb 0%, #1e5dd7 55%, #1448be 100%);
          box-shadow: inset 3px 3px 8px rgba(255,255,255,0.35), inset -3px -3px 12px rgba(0,0,0,0.18), 8px 14px 28px rgba(20,72,200,0.35);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .kresna-lucky-cube-mark {
          font-family: 'DM Sans', sans-serif;
          font-size: 42px;
          font-weight: 700;
          color: white;
          letter-spacing: -0.04em;
          transform: rotate(10deg);
          text-shadow: 0 3px 6px rgba(0,0,0,0.25);
          line-height: 1;
        }

        .kresna-lucky-text-row {
          display: flex;
          flex-direction: row;
          gap: 6px;
          align-items: center;
          transform: rotate(-4deg);
          margin-top: 4px;
        }

        .kresna-lucky-arrow {
          width: 22px;
          height: 22px;
          color: #9ca3af;
        }

        .kresna-lucky-text {
          font-family: 'Caveat', cursive;
          font-size: 20px;
          font-weight: 600;
          color: #9ca3af;
          white-space: nowrap;
        }

        .kresna-footer-right-top {
          display: flex;
          flex-direction: row;
          gap: 72px;
          padding-top: 8px;
        }
        
        .kresna-footer-col {
          display: flex;
          flex-direction: column;
        }

        .kresna-footer-col-title {
          font-family: 'Caveat', cursive;
          font-size: 24px;
          font-weight: 600;
          font-style: italic;
          color: #9ca3af;
          margin-bottom: 18px;
        }

        .kresna-footer-col a {
          display: block;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          font-weight: 600;
          color: #111827;
          margin-bottom: 14px;
          text-decoration: none;
          transition: color 0.2s;
        }
        .kresna-footer-col a:hover {
          color: #1f65d6;
        }

        .kresna-footer-bottom {
          display: flex;
          flex-direction: row;
          align-items: flex-end;
          justify-content: space-between;
          margin-top: 48px;
        }

        .kresna-footer-copyright {
          font-family: 'DM Sans', sans-serif;
          font-size: 12.5px;
          font-weight: 500;
          color: #9ca3af;
        }

        .kresna-footer-cta-mini {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .kresna-footer-cta-mini h4 {
          font-size: 15px;
          font-weight: 400;
          color: #6b7280;
          line-height: 1.45;
        }

        .kresna-footer-cta-mini h4 strong {
          display: block;
          font-size: 19px;
          font-weight: 700;
          color: #111827;
        }

        .kresna-footer-subscribe-row {
          display: flex;
          flex-direction: row;
          width: 310px;
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 5px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.04);
        }

        .kresna-footer-subscribe-row input {
          flex: 1;
          padding: 11px 14px;
          background: transparent;
          border: none;
          outline: none;
          font-family: 'DM Sans', sans-serif;
          font-size: 13.5px;
          color: #111827;
        }
        .kresna-footer-subscribe-row input::placeholder {
          color: #9ca3af;
        }

        .kresna-footer-subscribe-row button {
          padding: 11px 22px;
          background: #111214;
          color: white;
          font-family: 'DM Sans', sans-serif;
          font-size: 13.5px;
          font-weight: 600;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          box-shadow: 0 6px 20px rgba(0,0,0,0.28), 0 2px 8px rgba(0,0,0,0.15);
          transition: background 0.2s, box-shadow 0.2s, transform 0.15s;
        }
        .kresna-footer-subscribe-row button:hover {
          background: #000;
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.35), 0 4px 12px rgba(0,0,0,0.2);
        }



        @media (max-width: 860px) {
          .kresna-footer-wrapper {
            grid-template-columns: 1fr;
          }
          .kresna-footer-left {
            min-height: auto;
            gap: 40px;
          }
        }

        @media (max-width: 560px) {
          .kresna-footer-right {
            padding: 24px;
          }
          .kresna-footer-right-top {
            gap: 40px;
          }
          .kresna-footer-bottom {
            flex-direction: column;
            align-items: flex-start;
            gap: 24px;
          }
          .kresna-footer-subscribe-row {
            width: 100%;
          }
          .kresna-footer-lucky-graphic {
            right: 12px;
            top: -28px;
          }
          .kresna-lucky-cube {
            width: 72px;
            height: 72px;
          }
          .kresna-lucky-cube-mark {
            font-size: 31.5px;
          }
        }
      `}</style>
      <div className="kresna-footer-root">
        <section className="kresna-footer-section">
          <div className="kresna-footer-wrapper">
            <div className="kresna-footer-left">
              <video className="kresna-footer-left-video" autoPlay muted loop playsInline preload="auto">
                <source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260503_104800_bc43ae09-f494-43e3-97d7-2f8c1692cfd7.mp4" type="video/mp4" />
              </video>
              <div className="kresna-footer-logo">
                <div className="kresna-footer-logo-mark" style={{ border: 'none', background: 'transparent' }}>
                  <img src="/favicon.svg" alt="Bizroom" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
                <span className="kresna-footer-logo-name">Bizroom</span>
              </div>
              <div className="kresna-footer-tagline-container">
                <div className="kresna-footer-tagline">
                  Smarter business management,<br/>
                  <span>powered by AI.</span>
                </div>
              </div>
            </div>
            
            <div className="kresna-footer-right">
              <div className="kresna-footer-lucky-graphic">
                <div className="kresna-lucky-cube">
                  <div className="kresna-lucky-cube-mark" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                    <img src="/favicon.svg" alt="Bizroom Logo" style={{ width: '55%', height: '55%', objectFit: 'contain' }} />
                  </div>
                </div>
                <div className="kresna-lucky-text-row">
                  <svg className="kresna-lucky-arrow" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{stroke: 'currentColor', fill: 'none', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round'}}>
                    <path d="M3 20 C 6 14, 10 9, 18 5" />
                    <path d="M18 5 L 12 5" />
                    <path d="M18 5 L 18 11" />
                  </svg>
                  <span className="kresna-lucky-text">Feeling lucky?</span>
                </div>
              </div>
              
              <div className="kresna-footer-right-top">
                <div className="kresna-footer-col">
                  <div className="kresna-footer-col-title">Navigation</div>
                  <a href="/">Home</a>
                  <a href="#features">Features</a>
                  <a href="#pricing">Pricing</a>
                  <a href="/recharge">Recharge</a>
                  <a href="#contact">Contact</a>
                </div>
                <div className="kresna-footer-col">
                  <div className="kresna-footer-col-title">Company</div>
                  <a href="/about">About Us</a>
                  <a href="/terms">Terms & Conditions</a>
                  <a href="/privacy">Privacy Policy</a>
                  <a href="/refund">Refund Policy</a>
                </div>
              </div>
              
              <div className="kresna-footer-bottom">
                <div className="kresna-footer-copyright">
                  © 2026 Bizroom. All rights reserved.
                </div>
                <div className="kresna-footer-cta-mini">
                  <h4>
                    Business moves fast.<br/>
                    <strong>Stay ahead with Bizroom.</strong>
                  </h4>
                  <form onSubmit={handleSubscribe} className="kresna-footer-subscribe-row">
                    <input 
                      type="email" 
                      placeholder={subscribed ? "Subscribed!" : "Enter email address"} 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={subscribed}
                      required
                    />
                    <button type="submit" disabled={subscribed}>
                      {subscribed ? "Thanks!" : "Subscribe"}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
