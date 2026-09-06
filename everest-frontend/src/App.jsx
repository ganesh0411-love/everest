import React, { useState, useMemo, useEffect, useRef } from 'react';
import Header from './components/Header';
import NetBalanceCard from './components/NetBalanceCard';
import SearchBar from './components/SearchBar';
import EmptyState from './components/EmptyState';
import FloatingActionButton from './components/FloatingActionButton';
import Footer from './components/Footer';
import { 
  CheckCircle2, LayoutGrid, CalendarClock, TrendingUp, 
  Clock, History, ArrowUpRight, ArrowDownRight, ArrowDownAZ,
  Banknote, User, Sprout, CalendarDays
} from 'lucide-react';
import { 
  Centers, 
  AddBulkCustomer, 
  DashboardOverview, 
  CustomerKYCUpdate, 
} from './components/Placeholders';
import StaffManagement from './components/StaffManagement';
import ApplicationStatus from './components/ApplicationStatus';
import AddCustomerModal from './components/AddCustomerModal';
import RecycleBinView from './components/RecycleBinView';
import { App as CapacitorApp } from '@capacitor/app';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, collection, getDocs, setDoc, deleteDoc, updateDoc, query, where, onSnapshot } from 'firebase/firestore';
import Login from './components/Login';
import CustomerDashboard from './components/CustomerDashboard';
import AdminDashboard from './components/AdminDashboard';
import EMICalculator from './components/EMICalculator';
import OfflineImage from './components/OfflineImage';
import CustomerDetail from './components/CustomerDetail';
import DesktopSidebar from './components/DesktopSidebar';
import AddBranchModal from './components/AddBranchModal';
import EditBranchModal from './components/EditBranchModal';

const defaultAvatar = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIiBmaWxsPSJub25lIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImJnIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj48c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjMWUyOTNiIi8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjMGYxNzJhIi8+PC9saW5lYXJHcmFkaWVudD48bGluZWFyR3JhZGllbnQgaWQ9ImF2YXRhciIgeDE9IjAlIiB5MT0iMCUiIHgyPSIxMDAlIiB5Mj0iMTAwJSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iIzk0YTNiOCIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iIzY0NzQ4YiIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSJ1cmwoI2JnKSIvPjxjaXJjbGUgY3g9IjUwIiBjeT0iMzgiIHI9IjE2IiBmaWxsPSJ1cmwoI2F2YXRhcikiLz48cGF0aCBkPSJNNTAgNjJDMzAgNjIgMTYgNzggMTYgOTVDMjYgOTggMzcgMTAwIDUwIDEwMEM2MyAxMDAgNzQgOTggODQgOTVDODQgNzggNzAgNjIgNTAgNjJaIiBmaWxsPSJ1cmwoI2F2YXRhcikiLz48L3N2Zz4=";

function App() {
  const [activeBranch, setActiveBranch] = useState({ id: 'main', name: 'Main Branch' });
  const [branches, setBranches] = useState([{ id: 'main', name: 'Main Branch' }]);
  const [isSwitchingBranch, setIsSwitchingBranch] = useState(false);
  const [isAddBranchModalOpen, setIsAddBranchModalOpen] = useState(false);
  const [isEditBranchModalOpen, setIsEditBranchModalOpen] = useState(false);

  const [userProfile, setUserProfile] = useState(() => {
    const saved = localStorage.getItem('everest_user_profile');
    return saved ? JSON.parse(saved) : null;
  });

  const [user, setUser] = useState(() => {
    const savedProfile = localStorage.getItem('everest_user_profile');
    return savedProfile ? { uid: 'cached', placeholder: true } : null;
  });
  const [customers, setCustomers] = useState(() => {
    const saved = localStorage.getItem('everest_customers');
    return saved ? JSON.parse(saved) : [];
  });
  const [isDbLoading, setIsDbLoading] = useState(() => {
    return !localStorage.getItem('everest_customers');
  });
  const [authChecking, setAuthChecking] = useState(() => {
    return !localStorage.getItem('everest_user_profile');
  });

  // Fetch Branches Globally
  useEffect(() => {
    if (user && userProfile) {
      const unsub = onSnapshot(collection(db, 'branches'), (snapshot) => {
        const fetchedBranches = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setBranches([{ id: 'main', name: 'Main Branch' }, ...fetchedBranches]);
      }, (error) => {
        console.error("Error fetching branches:", error);
      });
      return () => unsub();
    }
  }, [user, userProfile]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setAuthChecking(false); // Unblock UI immediately
        
        // Fetch fresh profile in background
        getDoc(doc(db, 'users', currentUser.phoneNumber || currentUser.uid))
          .then(async profileSnap => {
            let profileData;
            if (profileSnap.exists()) {
              profileData = profileSnap.data();
            } else {
              // Ensure hardcoded admin always gets the admin role if document is missing
              if (currentUser.phoneNumber === '+919659030144') {
                profileData = { role: 'admin', phone: currentUser.phoneNumber };
              } else {
                profileData = { role: 'customer', phone: currentUser.phoneNumber || (currentUser.email ? currentUser.email.split('@')[0] : '') };
              }
            }

            // CRITICAL ROLE RESOLUTION GUARD: Fallback to check if staff document exists
            if (profileData.role !== 'staff' && profileData.role !== 'admin') {
              try {
                const { collection, query, where, getDocs } = await import('firebase/firestore');
                
                const cleanPhone = String(profileData.phone || '').replace(/\D/g, '').slice(-10);
                
                let staffSnaps;
                if (cleanPhone && cleanPhone.length === 10) {
                  staffSnaps = await getDocs(query(collection(db, 'staff'), where('phone', '==', cleanPhone)));
                }
                
                if (!staffSnaps || staffSnaps.empty) {
                  staffSnaps = await getDocs(query(collection(db, 'staff'), where('uid', '==', currentUser.uid)));
                }

                if (staffSnaps && !staffSnaps.empty) {
                  console.log("Role resolved to staff via fallback query.");
                  profileData.role = 'staff';
                  
                  // Auto-repair the users collection
                  setDoc(doc(db, 'users', currentUser.uid), {
                    ...profileData,
                    uid: currentUser.uid,
                    updatedAt: new Date().toISOString()
                  }, { merge: true }).catch(() => {});
                }
              } catch (e) {
                console.error("Error during fallback staff resolution:", e);
              }
            }

            // Augment staff profile with details from staff collection
            if (profileData.role === 'staff') {
                try {
                  const { collection, query, where, getDocs } = await import('firebase/firestore');
                  const staffQuery = query(collection(db, 'staff'), where('uid', '==', currentUser.uid));
                  const staffSnaps = await getDocs(staffQuery);
                    if (!staffSnaps.empty) {
                      const sDoc = staffSnaps.docs[0].data();
                      profileData.name = sDoc.name || 'Staff Member';
                      profileData.staffId = sDoc.staffId || sDoc.id || sDoc.phone || 'N/A';
                      profileData.branchId = sDoc.branchId || profileData.branchId || 'main';
                      profileData.branchName = sDoc.branchName || profileData.branchName || 'Main Branch';
                      profileData.credentialsVersion = sDoc.credentialsVersion || null;
                      profileData.photoBase64 = sDoc.photoBase64 || sDoc.photoUrl || sDoc.avatarUrl || sDoc.profileImage || null;
                    }
                  
                  // CRITICAL FIX: Lock the global application branch context to this staff's assigned branch
                  if (profileData.branchId) {
                    setActiveBranch({ 
                      id: profileData.branchId, 
                      name: profileData.branchName || (profileData.branchId === 'main' ? 'Main Branch' : 'Theni Branch')
                    });
                  }
                } catch (e) {
                  console.error('Failed to augment staff profile', e);
                }
              }
            
            setUserProfile(profileData);
            localStorage.setItem('everest_user_profile', JSON.stringify(profileData));
          })
          .catch(err => console.error("Error fetching profile:", err));
      } else {
        setUser(null);
        setUserProfile(null);
        localStorage.removeItem('everest_user_profile');
        setAuthChecking(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Real-time Staff Access & Credential Version Control
  useEffect(() => {
    if (!auth.currentUser || userProfile?.role !== 'staff') return;

    let unsub = () => {};
    
    import('firebase/firestore').then(({ collection, query, where, onSnapshot }) => {
      const staffQuery = query(collection(db, 'staff'), where('uid', '==', auth.currentUser.uid));
      
      unsub = onSnapshot(staffQuery, (snapshot) => {
        if (snapshot.empty) {
          const cleanPhone = auth.currentUser.phoneNumber ? auth.currentUser.phoneNumber.replace(/\D/g, '').slice(-10) : (auth.currentUser.email ? auth.currentUser.email.split('@')[0].replace(/\D/g, '') : '');
          if (!cleanPhone) {
            alert("Your staff session has been deactivated or removed by Admin. Logging out.");
            signOut(auth);
            setUser(null);
            setUserProfile(null);
            localStorage.removeItem('everest_user_profile');
          }
          return;
        }

        const staffData = snapshot.docs[0].data();
        if (staffData.status === 'Recycled' || staffData.status === 'Deleted') {
          alert("Your staff session has been deactivated or removed by Admin. Logging out.");
          signOut(auth);
          setUser(null);
          setUserProfile(null);
          localStorage.removeItem('everest_user_profile');
        } else if (staffData.credentialsVersion && userProfile?.credentialsVersion && staffData.credentialsVersion > userProfile.credentialsVersion) {
          alert("Your login credentials have been updated by Admin. Please log in again.");
          signOut(auth);
          setUser(null);
          setUserProfile(null);
          localStorage.removeItem('everest_user_profile');
        }
      }, (err) => {
        console.error("Session listener error:", err);
      });
    }).catch(e => console.error("Error setting up session listener:", e));

    return () => unsub();
  }, [auth.currentUser, userProfile?.role, userProfile?.credentialsVersion]);


  useEffect(() => {
    let unsubscribe = null;
    
    const setupRealtimeSync = () => {
      if (!user || !userProfile) {
        // Only stop DB loading if auth is resolved to null, but do NOT wipe customers array
        // The customers array will only be wiped upon explicit logout in the Header/Dashboard components
        setIsDbLoading(false);
        return;
      }
      if (customers.length === 0) {
        setIsDbLoading(true);
      }
      try {
        let q;
        if (userProfile.role === 'admin') {
          if (activeBranch.id !== 'main') {
            q = query(collection(db, 'customers'), where('branchId', '==', activeBranch.id));
          } else {
            q = collection(db, 'customers');
          }
        } else if (userProfile.role === 'staff') {
          // Strict staff query by branch
          const staffBranchId = userProfile.branchId || activeBranch.id || 'main';
          q = query(collection(db, 'customers'), where('branchId', '==', staffBranchId));
        } else {
          // Customer role
          q = query(collection(db, 'customers'), where('phone', '==', user.phoneNumber));
        }
        
        unsubscribe = onSnapshot(q, (querySnapshot) => {
          const fetched = [];
          querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (userProfile.role === 'admin' && activeBranch.id === 'main') {
              if (!data.branchId || data.branchId === 'main') {
                fetched.push({ ...data, id: docSnap.id });
              }
            } else {
              fetched.push({ ...data, id: docSnap.id });
            }
          });
          setCustomers(fetched);
          setIsDbLoading(false);
        }, (error) => {
          console.error("Firebase Real-time Sync Error Caught:", error);
          setIsDbLoading(false);
        });
      } catch (error) {
        console.error("Firebase Init Error Caught:", error);
        setIsDbLoading(false);
      }
    };
    
    if (!authChecking) {
      setupRealtimeSync();
    }
    
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user, userProfile, authChecking, activeBranch.id]);

  useEffect(() => {
    // Only overwrite localStorage if we have a valid logged-in user and it's not loading
    if (!isDbLoading && user && userProfile) {
      if (customers.length > 0) {
        localStorage.setItem('everest_customers', JSON.stringify(customers));
      }
    }
  }, [customers, isDbLoading, user, userProfile]);

  const [currentView, setCurrentView] = useState('Home');
  const [viewHistory, setViewHistory] = useState(['Home']);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  
  // 🛑 FIX: Force Home Page Default on fresh login/reload
  useEffect(() => {
    if (user) {
      setCurrentView('Home');
      setViewHistory(['Home']);
    }
  }, [user?.uid]);

  const backPressCountRef = useRef(0);
  const currentTouchCardRef = useRef(null);

  const handleTouchStart = (e) => {
    const card = e.target.closest('.interactive-card');
    if (card) {
      card.classList.add('touch-boom');
      currentTouchCardRef.current = card;
    }
  };

  const handleTouchMove = (e) => {
    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    const card = element?.closest('.interactive-card');
    
    if (currentTouchCardRef.current && currentTouchCardRef.current !== card) {
      currentTouchCardRef.current.classList.remove('touch-boom');
    }
    
    if (card && currentTouchCardRef.current !== card) {
      card.classList.add('touch-boom');
      currentTouchCardRef.current = card;
    }
  };

  const handleTouchEnd = () => {
    if (currentTouchCardRef.current) {
      currentTouchCardRef.current.classList.remove('touch-boom');
      currentTouchCardRef.current = null;
    }
  };

  const verifySessionGuard = async () => {
    if (!user || userProfile?.role !== 'staff') return;
    try {
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const staffQuery = query(collection(db, 'staff'), where('uid', '==', user.uid));
      const staffSnaps = await getDocs(staffQuery);
      
      let serverVersion = 0;
      let isRecycled = false;

      if (!staffSnaps.empty) {
        const staffDoc = staffSnaps.docs[0].data();
        serverVersion = staffDoc.sessionVersion || 0;
        isRecycled = (staffDoc.status === 'Recycled');
      } else {
        const phoneToCheck = userProfile?.phone || user.phoneNumber;
        if (phoneToCheck) {
           const cleanPhone = phoneToCheck.replace(/\D/g, '').slice(-10);
           const phoneQuery = query(collection(db, 'staff'), where('phone', '==', cleanPhone));
           const phoneSnaps = await getDocs(phoneQuery);
           if (!phoneSnaps.empty) {
             const staffDoc = phoneSnaps.docs[0].data();
             serverVersion = staffDoc.sessionVersion || 0;
             isRecycled = (staffDoc.status === 'Recycled');
           }
        }
      }

      const localVersion = parseInt(localStorage.getItem('everest_staff_session_version') || '0', 10);
      
      if (isRecycled || serverVersion !== localVersion) {
        console.warn('Session Invalidated on Action Guard. Forcefully signing out...');
        await signOut(auth);
        localStorage.removeItem('everest_staff_session_version');
        localStorage.removeItem('everest_user_profile');
        alert('Your session has expired or credentials have been updated. Please log in again.');
      }
    } catch (e) {
      console.warn('Silent failure in session guard', e);
    }
  };

  const navigateToView = (newView) => {
    verifySessionGuard();
    setViewHistory(prev => {
      if (prev[prev.length - 1] === newView) return prev;
      return [...prev, newView];
    });
    setCurrentView(newView);
  };

  const switchTab = (newView) => {
    verifySessionGuard();
    if (newView === 'Home') {
      setViewHistory(['Home']);
    } else {
      setViewHistory(['Home', newView]);
    }
    setCurrentView(newView);
  };

  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState(null);
  const [activeHomeMenuId, setActiveHomeMenuId] = useState(null);

  // Filter, Sort, and Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeSort, setActiveSort] = useState('Recent');
  
  // Temp state for the modal before applying
  const [tempCategory, setTempCategory] = useState('Microfinance');
  const [tempSort, setTempSort] = useState('Recent');

  const currentViewRef = useRef(currentView);
  useEffect(() => { currentViewRef.current = currentView; }, [currentView]);

  // Hardware Back Button & Double-Tap Exit
  useEffect(() => {
    let backTimeout;
    let backListenerHandle = null;

    const setupListener = async () => {
      backListenerHandle = await CapacitorApp.addListener('backButton', () => {
        // 0. Global Back Button Intercept for internal tool routing
        if (typeof window.handleAndroidBack === 'function') {
          if (window.handleAndroidBack()) {
            return;
          }
        }

        // 1. Close open modal states first
        if (fullscreenImage) { setFullscreenImage(null); return; }
        if (isAddCustomerOpen) { setIsAddCustomerOpen(false); return; }
        if (isFilterOpen) { setIsFilterOpen(false); return; }
        if (activeHomeMenuId) { setActiveHomeMenuId(null); return; }

        // 2. Handle View History Stack
        setViewHistory(prev => {
          const actualView = currentViewRef.current;
          
          if (actualView === 'Customer Detail') {
            setCurrentView('Customer');
            return ['Home', 'Customer'];
          }

          if (actualView !== 'Home') {
            if (prev.length > 1) {
              const newHistory = [...prev];
              newHistory.pop(); // Remove current view
              const prevView = newHistory[newHistory.length - 1];
              setCurrentView(prevView);
              return newHistory;
            } else {
              // If not on Home but history is at root, smoothly navigate back to Home
              setCurrentView('Home');
              return ['Home'];
            }
          } else {
            // 3. Double-Tap Exit Guard (strictly restricted to root/Home page)
            if (backPressCountRef.current === 0) {
              backPressCountRef.current = 1;
              const toast = document.createElement('div');
              toast.id = 'exit-app-toast';
              toast.innerText = 'Press again to exit';
              toast.className = 'fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg z-[9999] animate-in fade-in';
              
              const existingToast = document.getElementById('exit-app-toast');
              if (existingToast) existingToast.remove();
              
              document.body.appendChild(toast);
              
              backTimeout = setTimeout(() => {
                backPressCountRef.current = 0;
                const toastToRemove = document.getElementById('exit-app-toast');
                if (toastToRemove) toastToRemove.remove();
              }, 2000);
              return prev;
            } else {
              CapacitorApp.exitApp();
              return prev;
            }
          }
        });
      });
    };

    setupListener();

    return () => {
      if (backListenerHandle) {
        backListenerHandle.remove();
      }
      if (backTimeout) clearTimeout(backTimeout);
      const existingToast = document.getElementById('exit-app-toast');
      if (existingToast) existingToast.remove();
      backPressCountRef.current = 0;
    };
  }, [fullscreenImage, isAddCustomerOpen, isFilterOpen, activeHomeMenuId]);

  // Real-Time UI Trigger (Forces re-render every minute for accurate elapsed time)
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleClickOutside = () => setActiveHomeMenuId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleScroll = (e) => {
    if (e.target.scrollTop > 50) {
      if (!isScrolled) setIsScrolled(true);
    } else {
      if (isScrolled) setIsScrolled(false);
    }
  };

  const openFilter = () => {
    setTempCategory(activeCategory);
    setTempSort(activeSort);
    setIsFilterOpen(true);
  };

  const applyFilter = () => {
    setActiveCategory(tempCategory);
    setActiveSort(tempSort);
    setIsFilterOpen(false);
  };

  const clearFilter = () => {
    setActiveCategory('All');
    setActiveSort('Recent');
    setIsFilterOpen(false);
  };

  // Process Customers List
  const processedCustomers = useMemo(() => {
    let filtered = customers.map(c => {
      const repay = parseFloat(c.repayAmount) || 0;
      const insts = Array.isArray(c.installments) ? c.installments : [];
      const sub = insts.reduce((sum, inst) => sum + (parseFloat(inst.amount) || 0), 0);
      return { ...c, dynamicOutstanding: Math.max(0, repay - sub) };
    });
    
    if (activeCategory !== 'All') {
      const loanTypeCategories = ['Microfinance', 'Personal Loan', 'Agri Loan', 'Weekly Loan'];
      if (loanTypeCategories.includes(activeCategory)) {
        const matchType = activeCategory === 'Microfinance' ? 'Micro Finance' : activeCategory;
        filtered = filtered.filter(c => c.loanType === activeCategory || c.loanType === matchType);
      } else {
        filtered = filtered.filter(c => c.category === activeCategory);
      }
    }

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(c => {
        const nameMatch = String(c.name || '').toLowerCase().includes(q);
        const appNumMatch = String(c.appNumber || '').toLowerCase().includes(q);
        const phoneMatch = String(c.phone || '').toLowerCase().includes(q);
        const idMatch = String(c.id || '').toLowerCase().includes(q);
        return nameMatch || appNumMatch || phoneMatch || idMatch;
      });
    }

    filtered.sort((a, b) => {
      switch (activeSort) {
        case 'Recent':
          return new Date(b.lastUpdated || b.date) - new Date(a.lastUpdated || a.date);
        case 'Oldest':
          return new Date(a.date) - new Date(b.date);
        case 'Highest Amount':
          return b.loanAmount - a.loanAmount;
        case 'Least Amount':
          return a.loanAmount - b.loanAmount;
        case 'By Name':
          const cleanNameA = String(a.name || '').replace(/^(Mr|Mrs|Miss|Ms)\.?\s+/i, '').trim().toLowerCase();
          const cleanNameB = String(b.name || '').replace(/^(Mr|Mrs|Miss|Ms)\.?\s+/i, '').trim().toLowerCase();
          return cleanNameA.localeCompare(cleanNameB);
        default:
          return 0;
      }
    });

    return filtered;
  }, [activeCategory, activeSort, customers, searchQuery]);

  // Aggregate Financials (Dynamic Based on UI Stream)
  const { totalLoan, totalOutstanding } = useMemo(() => {
    const activeStream = processedCustomers.filter(c => c.status === 'Approved' || c.status === 'approved');
    return activeStream.reduce((acc, curr) => {
      const repay = parseFloat(curr.repayAmount) || 0;
      acc.totalLoan += repay;
      acc.totalOutstanding += (curr.dynamicOutstanding !== undefined ? curr.dynamicOutstanding : repay);
      return acc;
    }, { totalLoan: 0, totalOutstanding: 0 });
  }, [processedCustomers]);

  const formatDate = (dateString) => {
    const d = new Date(dateString);
    if (isNaN(d)) return dateString;
    return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
  };

  const formatName = (name) => {
    if (!name) return '';
    return name.replace(/^(Mr\.|Mrs\.|Miss)\s*/i, '').trim();
  };

  const timeAgo = (dateString, updateTimestamp) => {
    if (!dateString) return '';
    const now = new Date();
    const dateToUse = updateTimestamp ? new Date(updateTimestamp) : new Date(dateString);
    if (isNaN(dateToUse)) return dateString;

    const diffInSeconds = Math.floor((now - dateToUse) / 1000);
    
    if (diffInSeconds < 60) return "Just Now";
    if (diffInSeconds < 3600) {
      const mins = Math.floor(diffInSeconds / 60);
      return `${mins} minute${mins !== 1 ? 's' : ''} ago`;
    }
    if (diffInSeconds < 86400) {
      const hrs = Math.floor(diffInSeconds / 3600);
      return `${hrs} hour${hrs !== 1 ? 's' : ''} ago`;
    }
    if (diffInSeconds < 2592000) { // < 30 days
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days !== 1 ? 's' : ''} ago`;
    }
    if (diffInSeconds < 31536000) { // < 365 days
      const months = Math.floor(diffInSeconds / 2592000);
      return `${months} month${months !== 1 ? 's' : ''} ago`;
    }
    const years = Math.floor(diffInSeconds / 31536000);
    return `${years} year${years !== 1 ? 's' : ''} ago`;
  };

  const handleBranchSwitch = (newBranch) => {
    setIsSwitchingBranch(true);
    setActiveBranch(newBranch);
    setCurrentView('Home');
    setViewHistory(['Home']);
    
    // Simulate switching delay to enforce isolation feel
    setTimeout(() => {
      setIsSwitchingBranch(false);
    }, 600);
  };

  const handleBranchUpdated = (updatedBranch) => {
    setBranches(prev => prev.map(b => b.id === updatedBranch.id ? updatedBranch : b));
    if (activeBranch.id === updatedBranch.id) {
      setActiveBranch(updatedBranch);
    }
  };

  const handleBranchDeleted = (deletedBranchId) => {
    setBranches(prev => prev.filter(b => b.id !== deletedBranchId));
    if (activeBranch.id === deletedBranchId) {
      const fallbackBranch = branches.find(b => b.id !== deletedBranchId) || { id: 'main', name: 'Main Branch' };
      handleBranchSwitch(fallbackBranch);
    }
  };

  const renderView = () => {
    switch(currentView) {
      case 'Home': return <div className="flex-1 overflow-y-auto"><AdminDashboard setCurrentView={setCurrentView} activeBranch={activeBranch} /></div>;
      case 'EMI Calculator': return <div className="flex-1 overflow-y-auto"><EMICalculator onBack={() => navigateToView('Home')} /></div>;
      case 'Centers': return <div className="flex-1 overflow-y-auto"><Centers /></div>;
      case 'Add Bulk Customer': return <div className="flex-1 overflow-y-auto"><AddBulkCustomer /></div>;
      case 'Staff Management': return <div className="flex-1 overflow-y-auto bg-slate-50"><StaffManagement onBack={() => navigateToView('Home')} setCurrentView={setCurrentView} activeBranch={activeBranch} /></div>;
      case 'Dashboard Overview': return <div className="flex-1 overflow-y-auto"><DashboardOverview /></div>;
      case 'Customer KYC Update': return <div className="flex-1 overflow-y-auto"><CustomerKYCUpdate /></div>;
      case 'Application Status': 
        return (
          <div className="flex-1 overflow-y-auto flex flex-col">
            <ApplicationStatus 
              applications={customers}
              onUpdateStatus={async (id, newStatus, extraData = {}) => {
                const nowIso = new Date().toISOString();
                try {
                  await updateDoc(doc(db, 'customers', id), { status: newStatus, lastUpdated: nowIso, ...extraData });
                } catch(e) {
                  console.error('Update error', e);
                }
              }}
              onDeleteApp={async (id) => {
                const nowIso = new Date().toISOString();
                const c = customers.find(x => x.id === id);
                try {
                  await updateDoc(doc(db, 'customers', id), { status: 'Recycled', previousStatus: c?.status || 'Pending', lastUpdated: nowIso });
                } catch(e) { console.error('Delete error', e); }
              }}
              onUpdateCustomer={async (updatedCustomer) => {
                const nowIso = new Date().toISOString();
                const toSave = { ...updatedCustomer, lastUpdated: nowIso };
                try {
                  await updateDoc(doc(db, 'customers', updatedCustomer.id), toSave);
                } catch(e) { console.error('Update full customer error', e); }
              }}
              activeBranch={activeBranch}
            />
          </div>
        );
      case 'Recycle Bin': 
        return (
          <div className="flex-1 overflow-y-auto flex flex-col">
            <RecycleBinView 
              customers={customers}
              onRestore={async (id, prevStatus) => {
                const nowIso = new Date().toISOString();
                try {
                  await updateDoc(doc(db, 'customers', id), { status: prevStatus, lastUpdated: nowIso });
                } catch(e) { console.error('Restore error', e); }
              }}
              onPermanentDelete={async (id) => {
                try {
                  await deleteDoc(doc(db, 'customers', id));
                } catch(e) { console.error('Perm delete error', e); }
              }}
              onRestoreEntry={async (customerId, entryId) => {
                const c = customers.find(x => x.id === customerId);
                if (!c) return;
                const entryToRestore = (c.deletedInstallments || []).find(e => e.id === entryId);
                if (!entryToRestore) return;
                
                const { deletedAt, ...originalEntry } = entryToRestore;
                const updatedDeleted = c.deletedInstallments.filter(e => e.id !== entryId);
                const updatedInstallments = [...(c.installments || []), originalEntry].sort((a, b) => a.id - b.id);
                
                try {
                  await updateDoc(doc(db, 'customers', customerId), {
                    installments: updatedInstallments,
                    deletedInstallments: updatedDeleted
                  });
                } catch(e) { console.error('Restore entry error', e); }
              }}
              onPermanentDeleteEntry={async (customerId, entryId) => {
                const c = customers.find(x => x.id === customerId);
                if (!c) return;
                const updatedDeleted = (c.deletedInstallments || []).filter(e => e.id !== entryId);
                try {
                  await updateDoc(doc(db, 'customers', customerId), {
                    deletedInstallments: updatedDeleted
                  });
                } catch(e) { console.error('Perm delete entry error', e); }
              }}
            />
          </div>
        );
      case 'Change Password':
      case 'Change Phone Number':
        return (
          <div className="flex-1 overflow-y-auto p-6 text-center">
            <h2 className="text-xl font-bold">{currentView}</h2>
            <p className="mt-2 text-slate-500">Settings placeholder view.</p>
          </div>
        );
      case 'Customer Detail':
        return (
          <div className="flex-1 overflow-y-auto bg-slate-900">
            <CustomerDetail 
              customer={selectedCustomer} 
              onBack={() => {
                setViewHistory(['Home', 'Customer']);
                setCurrentView('Customer');
                setSelectedCustomer(null);
              }}
            />
          </div>
        );
      case 'Customer':
      default:
        return (
          <>
            {customers.length === 0 ? (
              <main className="flex-1 overflow-y-auto w-full max-w-4xl mx-auto md:max-w-none md:mx-0 bg-white flex flex-col justify-center items-center h-full">
                <EmptyState />
              </main>
            ) : (
              <>
                <div className="flex-shrink-0 z-30 bg-[#f8fafc] pb-2">
                  <NetBalanceCard loanAmount={totalLoan} outstanding={totalOutstanding} />
                  <SearchBar 
                    onFilterClick={openFilter} 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    isFilterActive={activeCategory !== 'All' || activeSort !== 'Recent'}
                  />
                </div>
                
                <main 
                  className="flex-1 overflow-y-auto w-full max-w-4xl mx-auto md:max-w-none md:mx-0 bg-white flex flex-col"
                  onScroll={handleScroll}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  onTouchCancel={handleTouchEnd}
                >
                  {processedCustomers.filter(c => c.status === 'Approved' || c.status === 'approved').length > 0 ? (
                    <div className="p-2 space-y-2 pb-24">
                      <div className="px-1 pb-1 pt-1 text-xs font-bold text-[#1ca3a6] uppercase tracking-wider">
                        Entries: {processedCustomers.filter(c => c.status === 'Approved' || c.status === 'approved').length}
                      </div>
                      {processedCustomers.filter(c => c.status === 'Approved' || c.status === 'approved').map(customer => (
                        <div key={customer.id} onClick={() => { setSelectedCustomer(customer); navigateToView('Customer Detail'); }} className="bg-white border border-slate-200 p-2.5 rounded-lg shadow-sm flex justify-between items-center hover:bg-slate-50 transition-colors relative interactive-card cursor-pointer">
                          <div className="flex-1 min-w-0 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden flex-shrink-0 border border-slate-300">
                              <OfflineImage src={customer.image || defaultAvatar} alt="Profile" className="w-full h-full object-cover" />
                            </div>
                            <div className="min-w-0 pr-2">
                              <h4 className="font-bold text-slate-800 text-sm leading-tight truncate">{formatName(customer.name)}</h4>
                              <p className="text-[11px] font-medium text-slate-500 mt-0.5 truncate">{timeAgo(customer.date, customer.lastUpdated)}</p>
                            </div>
                          </div>
                          
                          {/* Status Badges - Strict Fixed Width Column */}
                          <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
                            <div className="flex flex-col items-center justify-center w-6 gap-1">
                              {customer.status === 'Pending' && (
                                <div className="bg-amber-100 text-amber-700 p-1 rounded-md shadow-sm" title="Pending">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                  </svg>
                                </div>
                              )}
                              {customer.status === 'Approved' && (
                                <div className="bg-emerald-100 text-emerald-700 p-1 rounded-md shadow-sm" title="Approved">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                </div>
                              )}
                            </div>
                            <div className="text-right min-w-[70px]">
                              <div className="text-sm font-bold text-red-600">₹{customer.dynamicOutstanding !== undefined ? customer.dynamicOutstanding.toLocaleString('en-IN') : (customer.repayAmount?.toLocaleString('en-IN') || '0')}</div>
                            </div>
                            <div className="relative">
                              <button onClick={(e) => { e.stopPropagation(); setActiveHomeMenuId(activeHomeMenuId === customer.id ? null : customer.id); }} className="p-1.5 text-slate-400 hover:text-slate-700 transition-colors rounded-lg hover:bg-slate-100">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                </svg>
                              </button>
                              {activeHomeMenuId === customer.id && (
                                <div className="absolute right-0 top-8 w-32 bg-white rounded-lg shadow-lg border border-slate-100 z-50 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                                  <button 
                                    onClick={async () => {
                                      const nowIso = new Date().toISOString();
                                      try {
                                        await updateDoc(doc(db, 'customers', customer.id), { status: 'Recycled', previousStatus: customer.status, lastUpdated: nowIso });
                                      } catch(e) { console.error('Delete error', e); }
                                      setActiveHomeMenuId(null);
                                    }}
                                    className="w-full text-left px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50"
                                  >
                                    Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState />
                  )}
                </main>
              </>
            )}
            {!isAddCustomerOpen && !isFilterOpen && (
              <div onClick={() => setIsAddCustomerOpen(true)}>
                <FloatingActionButton isScrolled={isScrolled} />
              </div>
            )}

            {/* Full-Screen Image Modal Overlay */}
            {fullscreenImage && (
              <div 
                className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 cursor-pointer animate-in fade-in"
                onClick={() => setFullscreenImage(null)}
              >
                <button className="absolute top-6 right-6 text-white bg-black/50 p-2 rounded-full hover:bg-white/20 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <img 
                  src={fullscreenImage} 
                  alt="Customer Fullscreen" 
                  className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl animate-in zoom-in-95" 
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}
          </>
        );
    }
  };

  if (authChecking) {
    return (
      <div className="h-[100dvh] bg-slate-900 flex items-center justify-center text-white">
        <div className="animate-pulse">Authenticating...</div>
      </div>
    );
  }

  if (!user) {
    return <Login onLoginSuccess={setUser} />;
  }

  // 🛑 FIX: Eliminate Admin Flicker - Wait for both DB and Role Resolution
  if (isDbLoading || !userProfile) {
    return (
      <div className="h-[100dvh] bg-slate-900 flex flex-col items-center justify-center text-white relative overflow-hidden">
        {/* Abstract Corporate Background Elements */}
        <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-brand-blue/20 to-transparent"></div>
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-emerald-500/10 blur-3xl rounded-full"></div>
        
        {/* Core Splash Content */}
        <div className="relative z-10 flex flex-col items-center animate-in fade-in zoom-in duration-700">
          <div className="w-20 h-20 bg-white rounded-2xl shadow-2xl flex items-center justify-center mb-6 border border-white/10">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-brand-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-3xl font-black mb-2 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70">
            EVEREST
          </h1>
          <p className="text-slate-400 font-medium mb-8 tracking-wide text-sm uppercase">Microfinance</p>
          
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 border-3 border-slate-700 border-t-emerald-400 rounded-full animate-spin mb-4"></div>
            <p className="text-emerald-400/80 text-[10px] font-bold uppercase tracking-widest animate-pulse">
              {!userProfile ? 'Resolving Role...' : 'Initializing Database...'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] bg-[#f8fafc] flex flex-col overflow-hidden relative">
      {userProfile?.role === 'customer' ? (
        <CustomerDashboard userProfile={userProfile} customers={customers} />
      ) : (
        <div className="w-full h-full flex flex-col relative overflow-hidden">
          {currentView !== 'EMI Calculator' && currentView !== 'Customer Detail' && currentView !== 'Staff Management' && (
            <Header 
              currentView={currentView} 
              setCurrentView={switchTab}
              branches={branches}
              activeBranch={activeBranch}
              onBranchChange={handleBranchSwitch}
              onAddBranch={() => setIsAddBranchModalOpen(true)}
              onEditBranch={() => setIsEditBranchModalOpen(true)}
              userProfile={userProfile}
            />
          )}
          <div className="flex-1 flex flex-col md:flex-row w-full overflow-hidden relative">
            <DesktopSidebar 
              currentView={currentView} 
              setCurrentView={switchTab}
              branches={branches}
              activeBranch={activeBranch}
              onBranchChange={handleBranchSwitch}
              onAddBranch={() => setIsAddBranchModalOpen(true)}
              onEditBranch={() => setIsEditBranchModalOpen(true)}
            />
            <div className="flex-1 w-full h-full flex flex-col relative bg-[#f8fafc] max-w-4xl mx-auto md:max-w-none md:mx-0 overflow-hidden">
              {renderView()}

              {/* Filter Modal Overlay */}
              {isFilterOpen && (
                <div className="fixed inset-0 bg-slate-900/60 z-50 flex flex-col justify-end animate-in fade-in duration-300">
                  <div className="bg-white w-full max-w-md mx-auto rounded-t-3xl overflow-hidden animate-in slide-in-from-bottom-full duration-300">
                    <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                      <h3 className="text-lg font-bold text-slate-800">Filter & Sort</h3>
                      <button onClick={() => setIsFilterOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 bg-slate-50 rounded-full">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                    
                    <div className="p-5 overflow-y-auto max-h-[60vh]">
                      <div className="mb-6">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">FILTER BY CATEGORY</h4>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { name: 'All', icon: LayoutGrid, color: 'text-blue-500' },
                            { name: 'Settled', icon: CheckCircle2, color: 'text-emerald-500' },
                            { name: 'Due Date', icon: CalendarClock, color: 'text-amber-500' },
                            { name: 'Upcoming', icon: TrendingUp, color: 'text-purple-500' },
                            { name: 'Microfinance', icon: Banknote, color: 'text-teal-500' },
                            { name: 'Personal Loan', icon: User, color: 'text-rose-500' },
                            { name: 'Agri Loan', icon: Sprout, color: 'text-green-500' },
                            { name: 'Weekly Loan', icon: CalendarDays, color: 'text-orange-500' }
                          ].map(cat => {
                            const Icon = cat.icon;
                            const isActive = tempCategory === cat.name;
                            return (
                              <button 
                                key={cat.name}
                                onClick={() => setTempCategory(cat.name)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all border ${isActive ? 'bg-brand-blue text-white border-brand-blue shadow-md shadow-blue-500/20' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
                              >
                                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : cat.color}`} />
                                {cat.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">SORT BY VALUES</h4>
                        <div className="flex flex-col gap-2">
                          {[
                            { name: 'Recent', icon: Clock, color: 'text-sky-500' },
                            { name: 'Oldest', icon: History, color: 'text-slate-500' },
                            { name: 'Highest Amount', icon: ArrowUpRight, color: 'text-rose-500' },
                            { name: 'Least Amount', icon: ArrowDownRight, color: 'text-emerald-500' },
                            { name: 'By Name', icon: ArrowDownAZ, color: 'text-indigo-500' }
                          ].map(sort => {
                            const Icon = sort.icon;
                            return (
                              <label key={sort.name} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50 cursor-pointer hover:bg-slate-100 hover:border-slate-300 transition-all">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-100">
                                    <Icon className={`w-5 h-5 ${sort.color}`} />
                                  </div>
                                  <span className="text-sm font-bold text-slate-700">{sort.name}</span>
                                </div>
                                <input 
                                  type="radio" 
                                  name="sort" 
                                  checked={tempSort === sort.name} 
                                  onChange={() => setTempSort(sort.name)} 
                                  className="w-5 h-5 text-brand-blue border-slate-300 focus:ring-brand-blue accent-brand-blue cursor-pointer"
                                />
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4 border-t border-slate-100 flex gap-3 pb-safe bg-white">
                      <button 
                        onClick={clearFilter}
                        className="flex-1 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors"
                      >
                        Clear Filter
                      </button>
                      <button 
                        onClick={applyFilter}
                        className="flex-[2] py-3 bg-brand-blue text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-md shadow-blue-500/20"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {isAddCustomerOpen && (
                <AddCustomerModal 
                  onClose={() => setIsAddCustomerOpen(false)} 
                  activeBranch={activeBranch}
                  onAddCustomer={async (newCustomer) => {
                    const nowIso = new Date().toISOString();
                    const customerToSave = { ...newCustomer, lastUpdated: nowIso };
                    try {
                      const { collection, addDoc, setDoc, doc } = await import('firebase/firestore');
                      
                      if (customerToSave.docId) {
                        // Edit existing customer
                        await setDoc(doc(db, 'customers', customerToSave.docId), customerToSave);
                      } else {
                        // Fresh customer - let Firestore generate a unique document ID
                        customerToSave.customerId = customerToSave.id; 
                        delete customerToSave.id; // ensure we don't accidentally map this back as doc id manually
                        await addDoc(collection(db, 'customers'), customerToSave);
                      }
                    } catch(e) {
                      console.error('Error adding customer', e);
                      throw e;
                    }
                  }}
                />
              )}

              {isAddBranchModalOpen && (
                <AddBranchModal 
                  isOpen={isAddBranchModalOpen}
                  onClose={() => setIsAddBranchModalOpen(false)}
                  onBranchAdded={handleBranchSwitch}
                />
              )}

              {isEditBranchModalOpen && (
                <EditBranchModal
                  isOpen={isEditBranchModalOpen}
                  onClose={() => setIsEditBranchModalOpen(false)}
                  activeBranch={activeBranch}
                  onBranchUpdated={handleBranchUpdated}
                  onBranchDeleted={handleBranchDeleted}
                />
              )}

              {/* Branch Switching Flash Overlay */}
              {isSwitchingBranch && (
                <div className="fixed inset-0 z-[200] bg-white flex flex-col items-center justify-center animate-in fade-in duration-200">
                  <div className="w-12 h-12 border-4 border-slate-100 border-t-brand-blue rounded-full animate-spin mb-4"></div>
                  <h2 className="text-xl font-black text-slate-800 tracking-wider">Loading {activeBranch.name}...</h2>
                  <p className="text-slate-500 font-medium text-sm mt-2">Isolating environment context</p>
                </div>
              )}

              {currentView !== 'Customer Detail' && currentView !== 'Staff Management' && (
                <div className="flex-shrink-0 z-40 relative md:hidden">
                  <Footer currentView={currentView} setCurrentView={switchTab} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
