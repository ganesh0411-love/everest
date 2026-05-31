import React from 'react';

const SearchBar = ({ onFilterClick }) => {
  return (
    <div className="w-full max-w-4xl mx-auto px-4 mt-2 mb-2">
      <div className="relative flex items-center w-full h-10 rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 transition-all">
        <div className="pl-3 pr-2 text-slate-400">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input 
          type="text" 
          placeholder="Search Customer" 
          className="flex-1 h-full bg-transparent outline-none text-slate-700 text-sm placeholder-slate-400"
        />
        <button 
          onClick={onFilterClick}
          className="px-3 text-slate-500 hover:text-slate-800 transition-colors border-l border-slate-200 h-full flex items-center bg-slate-50"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default SearchBar;
