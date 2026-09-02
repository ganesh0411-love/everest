import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, where, updateDoc } from 'firebase/firestore';
import { ArrowLeft, Search, MoreVertical, Home, Users, Plus } from 'lucide-react';
import AddStaffForm from './AddStaffForm';

const dummyData = [
  {
    id: 'EMP001',
    name: 'Arun Kumar',
    designation: 'Software Engineer',
    status: 'Active',
    avatarColor: 'bg-blue-100',
  },
  {
    id: 'EMP002',
    name: 'Priya Sharma',
    designation: 'Project Manager',
    status: 'Active',
    avatarColor: 'bg-purple-100',
  },
  // Adding extra dummy data to demonstrate scrolling
  { id: 'EMP003', name: 'Rajesh Verma', designation: 'Field Officer', status: 'Active', avatarColor: 'bg-emerald-100' },
  { id: 'EMP004', name: 'Anita Singh', designation: 'Branch Manager', status: 'Active', avatarColor: 'bg-rose-100' },
  { id: 'EMP005', name: 'Suresh Kumar', designation: 'Recovery Agent', status: 'Active', avatarColor: 'bg-amber-100' },
  { id: 'EMP006', name: 'Meena Patel', designation: 'Loan Officer', status: 'Active', avatarColor: 'bg-sky-100' },
  { id: 'EMP007', name: 'Vijay Das', designation: 'Field Officer', status: 'Active', avatarColor: 'bg-indigo-100' },
];

const StaffManagement = ({ onBack, setCurrentView, activeBranch = { id: 'main', name: 'Main Branch' } }) => {
  const [searchQuery, setSearchQuery] = useState('');
  
  // State for Add/Edit Form
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);

  const [staffList, setStaffList] = useState([]);

  // Fetch real-time data from Firestore
  useEffect(() => {
    if (!activeBranch?.id) return;

    let q;
    if (activeBranch.id === 'main') {
      q = collection(db, 'staff');
    } else {
      q = query(collection(db, 'staff'), where('branchId', '==', activeBranch.id));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedStaffList = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(s => {
          if (s.status === 'Recycled') return false;
          if (activeBranch.id === 'main') return !s.branchId || s.branchId === 'main';
          return s.branchId === activeBranch.id;
        });
      setStaffList(fetchedStaffList);
    }, (error) => {
      console.error("Error fetching staff:", error);
    });

    return () => unsubscribe();
  }, [activeBranch.id]);

  const handleOpenAddForm = () => {
    setEditingStaff(null);
    setShowAddForm(true);
  };

  const handleOpenEditForm = (staff) => {
    setEditingStaff(staff);
    setShowAddForm(true);
  };

  const handleFormSubmit = async (staffData) => {
    try {
      const staffPayload = {
        ...staffData,
        branchId: activeBranch.id,
        branchName: activeBranch.name,
        createdAt: staffData.createdAt || new Date().toISOString()
      };
      await setDoc(doc(db, 'staff', staffData.id), staffPayload);
      setShowAddForm(false);
    } catch (error) {
      console.error("Error saving staff:", error);
      alert("Failed to save staff. Please try again.");
    }
  };

  const handleDeleteStaff = async (staffId) => {
    try {
      const staff = staffList.find(s => s.id === staffId);
      const prevStatus = staff?.status || 'Active';
      await updateDoc(doc(db, 'staff', staffId), {
        status: 'Recycled',
        previousStatus: prevStatus,
        deletedAt: new Date().toISOString()
      });
      setShowAddForm(false);
    } catch (error) {
      console.error("Error deleting staff:", error);
      alert("Failed to delete staff. Please try again.");
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-white overflow-hidden relative pb-[72px]">
      
      {showAddForm && (
        <AddStaffForm 
          onBack={() => setShowAddForm(false)} 
          onSubmit={handleFormSubmit}
          onDelete={handleDeleteStaff}
          editingStaff={editingStaff}
          staffCount={staffList.length}
        />
      )}
      
      {/* STATIC TOP SECTION: Header & Action Bar */}
      <div className="shrink-0 flex flex-col z-20">
        
        {/* Curved Gradient Header */}
        <div className="bg-gradient-to-br from-purple-500 to-blue-500 pb-12 pt-6 px-4 relative z-0">
          <div className="flex items-center justify-between mb-4 mt-2">
            <button 
              onClick={onBack}
              className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-purple-600 shadow-sm"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="text-center flex-1 pr-10">
              <h1 className="text-xl font-bold text-white tracking-wide">Staff Management</h1>
              <p className="text-white/80 text-xs mt-1">Manage your staff details</p>
            </div>
          </div>
        </div>

        {/* Action Bar (Pulled up over the curve) */}
        <div className="bg-white rounded-t-[2.5rem] -mt-8 pt-8 px-5 pb-4 z-10 shadow-[0_4px_10px_rgba(0,0,0,0.03)] relative">
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Search by name, ID or designation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-full border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 transition-shadow"
              />
            </div>
            <button 
              onClick={handleOpenAddForm}
              className="flex items-center gap-1.5 bg-gradient-to-r from-pink-500 to-purple-500 text-white px-4 py-2.5 rounded-full text-sm font-bold shadow-md shadow-purple-500/30 whitespace-nowrap"
            >
              <Plus size={18} />
              <span>Add Staff</span>
            </button>
          </div>

          {/* Table Headers (Responsive) */}
          <div className="grid grid-cols-3 md:grid-cols-4 gap-2 px-4 py-3 bg-slate-50/80 rounded-2xl mt-6 text-xs font-bold text-purple-800 text-center items-center">
            <div className="text-left col-span-1">Name</div>
            <div className="hidden md:block">ID</div>
            <div>Designation</div>
            <div>Status</div>
          </div>
        </div>
      </div>

      {/* SCROLLABLE STAFF LIST AREA */}
      <div className="flex-1 overflow-y-auto px-5 pb-6 bg-white z-10">
        
        {/* Staff List */}
        <div className="flex flex-col gap-3">
          {staffList.filter(staff => {
            const q = searchQuery.toLowerCase();
            return staff.name.toLowerCase().includes(q) || 
                   staff.id.toLowerCase().includes(q) || 
                   staff.designation.toLowerCase().includes(q);
          }).map((staff, index) => (
            <div key={index} className="flex items-center justify-between p-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors rounded-xl">
              {/* Name & Avatar */}
              <div className="flex items-center gap-3 w-1/3 md:w-1/4 min-w-[110px]">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 overflow-hidden ${staff.photoBase64 ? 'bg-transparent' : staff.avatarColor || 'bg-slate-100'}`}>
                  {staff.photoBase64 ? (
                    <img src={staff.photoBase64} alt={staff.name} className="w-full h-full object-cover" />
                  ) : (
                    <svg viewBox="0 0 36 36" fill="none" role="img" xmlns="http://www.w3.org/2000/svg" width="24" height="24">
                      <mask id="mask__beam" maskUnits="userSpaceOnUse" x="0" y="0" width="36" height="36"><rect width="36" height="36" rx="72" fill="#FFFFFF"></rect></mask>
                      <g mask="url(#mask__beam)">
                        <rect width="36" height="36" fill="#f0f0f0"></rect>
                        <rect x="0" y="0" width="36" height="36" transform="translate(6 6) rotate(196 18 18) scale(1)" fill="#474747" rx="36"></rect>
                        <g transform="translate(-4 -1) rotate(6 18 18)">
                          <path d="M15 19c2 1 4 1 6 0" stroke="#FFFFFF" fill="none" strokeLinecap="round"></path>
                          <rect x="10" y="14" width="1.5" height="2" rx="1" stroke="none" fill="#FFFFFF"></rect>
                          <rect x="24" y="14" width="1.5" height="2" rx="1" stroke="none" fill="#FFFFFF"></rect>
                        </g>
                      </g>
                    </svg>
                  )}
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="font-bold text-slate-800 text-xs sm:text-sm truncate">{staff.name}</span>
                  <span className="text-[10px] text-slate-500 font-medium md:hidden">{staff.id}</span>
                </div>
              </div>
              
              {/* ID (Desktop Only) */}
              <div className="hidden md:block w-1/4 text-center text-xs sm:text-sm text-slate-600 font-medium">
                {staff.id}
              </div>

              {/* Designation */}
              <div className="w-1/3 md:w-1/4 text-center text-[10px] sm:text-xs text-slate-600 leading-tight px-1">
                {staff.designation}
              </div>

              {/* Status & Actions */}
              <div className="w-1/3 md:w-1/4 flex items-center justify-end gap-1 sm:gap-2 pr-1">
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 rounded-full border border-emerald-200">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  <span className="text-[10px] sm:text-xs font-semibold text-emerald-700">Active</span>
                </div>
                <button 
                  onClick={() => handleOpenEditForm(staff)}
                  className="text-slate-400 hover:text-purple-600 p-1 transition-colors"
                >
                  <MoreVertical size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Center Illustration */}
        <div className="mt-8 mb-4 flex justify-center opacity-80 pointer-events-none">
          <svg width="200" height="200" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="50" y="40" width="100" height="130" rx="12" fill="#f8ebff" stroke="#c084fc" strokeWidth="4"/>
            <rect x="75" y="30" width="50" height="20" rx="6" fill="#c084fc"/>
            <circle cx="100" cy="80" r="16" fill="#93c5fd"/>
            <path d="M100 96c-12 0-20 6-20 16v4h40v-4c0-10-8-16-20-16z" fill="#93c5fd"/>
            <rect x="70" y="125" width="60" height="4" rx="2" fill="#cbd5e1"/>
            <rect x="70" y="140" width="40" height="4" rx="2" fill="#cbd5e1"/>
            <path d="M70 120 l 5 5 l 10 -10" stroke="#a78bfa" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M70 135 l 5 5 l 10 -10" stroke="#a78bfa" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M70 150 l 5 5 l 10 -10" stroke="#a78bfa" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            
            {/* Plant illustration */}
            <path d="M30 160 C 40 140, 50 140, 45 160 Z" fill="#a78bfa"/>
            <path d="M40 160 C 30 130, 10 130, 20 160 Z" fill="#8b5cf6"/>
            <rect x="25" y="155" width="20" height="15" rx="3" fill="#6d28d9"/>
            <circle cx="160" cy="110" r="4" fill="#fbcfe8"/>
            <circle cx="40" cy="90" r="3" fill="#bfdbfe"/>
            <circle cx="140" cy="50" r="5" fill="#fef08a"/>
          </svg>
        </div>
      </div>

      {/* Custom Bottom Navigation Bar (Fixed at bottom) */}
      <div className="absolute bottom-0 left-0 w-full h-[72px] bg-white border-t border-slate-100 flex justify-around items-center px-6 pb-safe z-50">
        
        <button 
          onClick={() => setCurrentView && setCurrentView('Home')}
          className="flex flex-col items-center justify-center gap-1 w-16 text-slate-400 hover:text-purple-600 transition-colors"
        >
          <Home size={26} strokeWidth={2.5} />
          <span className="text-[10px] font-semibold">Home</span>
        </button>

        <button 
          onClick={handleOpenAddForm}
          className="relative -top-5 w-16 h-16 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-purple-500/40 hover:scale-105 transition-transform"
        >
          <Plus size={32} strokeWidth={2.5} />
        </button>

        <button 
          onClick={() => setCurrentView && setCurrentView('Centers')}
          className="flex flex-col items-center justify-center gap-1 w-16 text-purple-700 transition-colors"
        >
          <Users size={28} strokeWidth={2.5} fill="currentColor" />
          <span className="text-[10px] font-bold text-purple-800">Groups</span>
        </button>

      </div>
    </div>
  );
};

export default StaffManagement;