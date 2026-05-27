import React from 'react';
import './FloatingActionButton.css';

const FloatingActionButton = ({ onClick, isScrolled }) => {
  return (
    <button className={`fab clickable ${isScrolled ? 'collapsed' : 'expanded'}`} onClick={onClick}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
      <span className="fab-text">Add Customer</span>
    </button>
  );
};

export default FloatingActionButton;
