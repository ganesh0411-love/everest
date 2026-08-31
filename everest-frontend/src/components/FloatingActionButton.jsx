import React from 'react';

const FloatingActionButton = ({ isScrolled }) => {
  return (
    <div className={`z-[90] transition-all duration-500 ease-in-out pointer-events-none ${
      isScrolled 
        ? 'fixed md:absolute bottom-24 md:bottom-8 right-4 md:right-8 translate-x-0' 
        : 'fixed md:absolute bottom-24 md:bottom-8 left-1/2 -translate-x-1/2'
    }`}>
      <button className={`bg-brand-blue hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-500/30 flex items-center justify-center pointer-events-auto transition-all duration-500 hover:scale-105 active:scale-95 ${
        isScrolled 
          ? 'w-14 h-14 rounded-full' 
          : 'py-3 px-6 rounded-full gap-2 w-44'
      }`}>
        <span className={`font-medium leading-none transition-all duration-500 ${isScrolled ? 'text-3xl' : 'text-xl mb-0.5'}`}>+</span>
        <span className={`text-[15px] whitespace-nowrap overflow-hidden transition-all duration-500 ${isScrolled ? 'w-0 opacity-0' : 'w-28 opacity-100'}`}>
          Add Customer
        </span>
      </button>
    </div>
  );
};

export default FloatingActionButton;
