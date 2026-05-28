import React from 'react';
import hero from '../assets/hero.jpg';

const EmptyState = () => {
  return (
    <div className="flex-1 w-full flex flex-col items-center justify-center pt-8 pb-24 px-6">
      <div className="w-full max-w-sm mb-6">
        <img 
          src={hero} 
          alt="Illustration" 
          className="w-full h-auto object-contain magic-crop mix-blend-multiply opacity-90"
        />
      </div>
      <p className="text-center text-slate-500 text-[15px] font-medium max-w-[250px]">
        No customers found. Click + to add your first entry.
      </p>
    </div>
  );
};

export default EmptyState;
