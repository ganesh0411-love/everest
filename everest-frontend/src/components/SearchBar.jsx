import React from 'react';

const SearchBar = ({ onFilterClick, value, onChange, isFilterActive }) => {
  return (
    <div className="w-full max-w-4xl mx-auto px-4 mt-2 mb-2">
      <div className="relative flex items-center w-full h-12 rounded-xl border-2 border-slate-300 bg-white shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-brand-blue focus-within:border-brand-blue transition-all">
        <div className="pl-4 pr-2 text-slate-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input 
          type="text" 
          placeholder="Search Customer" 
          value={value}
          onChange={onChange}
          className="flex-1 h-full bg-transparent outline-none text-slate-900 text-[15px] font-bold placeholder-slate-500"
        />
        <button 
          onClick={onFilterClick}
          className={`px-4 transition-colors border-l-2 h-full flex items-center relative ${isFilterActive ? 'text-brand-blue bg-blue-50 border-blue-200 hover:bg-blue-100' : 'text-slate-600 hover:text-slate-900 border-slate-200 bg-slate-50 hover:bg-slate-100'}`}
        >
          <svg xmlns='http://www.w3.org/2000/svg' className='h-5 w-5' viewBox='0 0 20 20' fill='currentColor'>
            <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default SearchBar;
