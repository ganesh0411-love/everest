import React from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';

const CustomerDashboard = ({ userProfile, customers }) => {
  const handleLogout = async () => {
    if (window.confirm("Are you sure you want to logout?")) {
      try {
        await signOut(auth);
      } catch (error) {
        console.error('Error signing out:', error);
      }
    }
  };

  // The customer should only have 1 active record, but it's an array.
  const myData = customers.length > 0 ? customers[0] : null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="bg-brand-blue p-6 text-white flex justify-between items-center shadow-lg rounded-b-3xl">
        <div>
          <h1 className="text-2xl font-black tracking-widest uppercase">EVEREST</h1>
          <p className="text-brand-blue-light text-xs font-semibold tracking-wider">My Profile</p>
        </div>
        <button onClick={handleLogout} className="bg-white/20 p-2 rounded-full hover:bg-white/30 transition">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>

      <div className="flex-1 p-6">
        {!myData ? (
          <div className="text-center py-20">
            <h2 className="text-xl font-bold text-slate-700">No Data Found</h2>
            <p className="text-slate-500 mt-2">We could not find an active loan profile for your number.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
               <div className="w-16 h-16 rounded-full bg-slate-200 overflow-hidden flex-shrink-0 border-2 border-brand-blue">
                 <img src={myData.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(myData.name)}`} alt="Profile" className="w-full h-full object-cover" />
               </div>
               <div>
                 <h2 className="text-xl font-bold text-slate-800">{myData.name}</h2>
                 <p className="text-slate-500 font-medium">{myData.appNumber || 'Application Pending'}</p>
                 <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold ${myData.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {myData.status || 'Pending'}
                 </span>
               </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Loan Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <p className="text-xs font-semibold text-slate-500 mb-1">Loan Amount</p>
                  <p className="text-lg font-bold text-brand-blue">₹{Number(myData.loanAmount || 0).toLocaleString()}</p>
                </div>
                <div className="bg-rose-50 p-4 rounded-xl border border-rose-100">
                  <p className="text-xs font-semibold text-rose-500 mb-1">Total Repay</p>
                  <p className="text-lg font-bold text-rose-600">₹{Number(myData.repayAmount || 0).toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Personal Info</h3>
              <div className="space-y-3">
                <div className="flex justify-between border-b border-slate-50 pb-2">
                  <span className="text-slate-500 font-medium">Age / Gender</span>
                  <span className="text-slate-800 font-semibold">{myData.age} yrs, {myData.gender}</span>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-2">
                  <span className="text-slate-500 font-medium">Husband/Father</span>
                  <span className="text-slate-800 font-semibold">{myData.careOf}</span>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-2">
                  <span className="text-slate-500 font-medium">Nominee</span>
                  <span className="text-slate-800 font-semibold">{myData.nomineeName} ({myData.nomineeRelation})</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerDashboard;