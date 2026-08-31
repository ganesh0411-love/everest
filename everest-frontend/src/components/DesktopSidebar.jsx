import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  UserPlus, 
  UserCheck, 
  ClipboardList, 
  BarChart3,
  LogOut,
  Settings,
  ShieldCheck,
  Trash2
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';

const DesktopSidebar = ({ currentView, setCurrentView }) => {
  const handleLogout = async () => {
    if (window.confirm("Are you sure you want to logout?")) {
      try {
        await signOut(auth);
        localStorage.removeItem('everest_user_profile');
        localStorage.removeItem('everest_customers');
      } catch (error) {
        console.error('Error signing out:', error);
      }
    }
  };

  const menuItems = [
    { name: 'Dashboard Overview', view: 'Home', icon: LayoutDashboard },
    { name: 'Customer Management', view: 'Customer', icon: Users },
    { name: 'Center Management', view: 'Centers', icon: Building2 },
    { name: 'Add Bulk Customer', view: 'Add Bulk Customer', icon: UserPlus },
    { name: 'Staff Management', view: 'Staff Management', icon: UserCheck },
    { name: 'Application Status', view: 'Application Status', icon: ClipboardList },
    { name: 'Customer KYC Update', view: 'Customer KYC Update', icon: ShieldCheck },
    { name: 'Recycle Bin', view: 'Recycle Bin', icon: Trash2 },
  ];

  return (
    <div className="hidden md:flex flex-col h-full w-72 lg:w-80 bg-white/95 shadow-[4px_0_24px_rgba(0,0,0,0.05)] border-r border-slate-200 z-40 overflow-hidden">
      
      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.view;
          return (
            <button
              key={item.view}
              onClick={() => setCurrentView(item.view)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all duration-200 group ${
                isActive 
                  ? 'bg-blue-50 text-blue-600 shadow-sm border border-blue-100' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
              }`}
            >
              <div className={`p-2 rounded-lg transition-colors ${isActive ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-700'}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="flex-1 text-left">{item.name}</span>
              {isActive && (
                <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer Area */}
      <div className="p-4 border-t border-slate-100 bg-slate-50 flex-shrink-0">
        <div className="flex items-center justify-between mb-4 px-2">
           <button 
             onClick={() => setCurrentView('Change Password')}
             className="text-slate-500 hover:text-brand-blue transition-colors flex items-center gap-2 text-sm font-medium"
           >
             <Settings className="w-4 h-4" />
             Settings
           </button>
        </div>
        <button 
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-sm font-bold transition-colors border border-red-100"
        >
          <LogOut className="w-4 h-4" />
          Secure Logout
        </button>
      </div>

    </div>
  );
};

export default DesktopSidebar;
