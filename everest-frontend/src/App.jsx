import React, { useState, useMemo, useEffect, useRef } from 'react';
import Header from './components/Header';
import NetBalanceCard from './components/NetBalanceCard';
import SearchBar from './components/SearchBar';
import EmptyState from './components/EmptyState';
import FloatingActionButton from './components/FloatingActionButton';
import Footer from './components/Footer';
import { 
  CheckCircle2, LayoutGrid, CalendarClock, TrendingUp, Activity,
  Clock, History, ArrowUpRight, ArrowDownRight, ArrowDownLeft, ArrowDownAZ,
  Banknote, User, Users, Handshake, ChevronDown, Sprout, CalendarDays, Search, Filter, Coins, Receipt, ClockAlert
} from 'lucide-react';
import { 
  DashboardOverview, 
  CustomerKYCUpdate, 
} from './components/Placeholders';
import AddBulkCustomer from './components/AddBulkCustomer';
import ExpansionView from './components/ExpansionView';
import CashBook from './components/CashBook';
import CenterManagement from './components/CenterManagement';
import Settings from './components/Settings';
import StaffManagement from './components/StaffManagement';
import ApplicationStatus from './components/ApplicationStatus';
import AddCustomerModal from './components/AddCustomerModal';
import RecycleBinView from './components/RecycleBinView';
import CenterDetailsView from './components/CenterDetailsView';
import LiveTrackingDaemon from './components/LiveTrackingDaemon';
import { App as CapacitorApp } from '@capacitor/app';
import { StatusBar } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';

import loanAmountIcon from './assets/loan-amount-icon.png';
import collectionIcon from './assets/collection-icon.png';
import outstandingIcon from './assets/outstanding-icon.png';
import overdueIcon from './assets/overdue-icon.png';
import { doc, getDoc, collection, getDocs, setDoc, deleteDoc, updateDoc, query, where, onSnapshot, or } from 'firebase/firestore';
import Login from './components/Login';
import CustomerDashboard from './components/CustomerDashboard';
import AdminDashboard from './components/AdminDashboard';
import CollectionReportModal from './components/CollectionReportModal';
import BranchSyncLoader from './components/BranchSyncLoader';
import EMICalculator from './components/EMICalculator';
import OfflineImage from './components/OfflineImage';
import CustomerDetail from './components/CustomerDetail';
import DesktopSidebar from './components/DesktopSidebar';
import AddBranchModal from './components/AddBranchModal';
import EditBranchModal from './components/EditBranchModal';
import { isBranchActive, sanitizeLocalStorageBranches, canAccessCashBook } from './utils/branchUtils';


const defaultAvatar = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIiBmaWxsPSJub25lIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImJnIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj48c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjMWUyOTNiIi8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjMGYxNzJhIi8+PC9saW5lYXJHcmFkaWVudD48bGluZWFyR3JhZGllbnQgaWQ9ImF2YXRhciIgeDE9IjAlIiB5MT0iMCUiIHgyPSIxMDAlIiB5Mj0iMTAwJSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iIzk0YTNiOCIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iIzY0NzQ4YiIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSJ1cmwoI2JnKSIvPjxjaXJjbGUgY3g9IjUwIiBjeT0iMzgiIHI9IjE2IiBmaWxsPSJ1cmwoI2F2YXRhcikiLz48cGF0aCBkPSJNNTAgNjJDMzAgNjIgMTYgNzggMTYgOTVDMjYgOTggMzcgMTAwIDUwIDEwMEM2MyAxMDAgNzQgOTggODQgOTVDODQgNzggNzAgNjIgNTAgNjJaIiBmaWxsPSJ1cmwoI2F2YXRhcikiLz48L3N2Zz4=";

const parseGlobalDate = (dStr) => {
  if (!dStr) return new Date();
  if (dStr instanceof Date) return new Date(dStr.getTime());
  
  // Handle Firebase Timestamps
  if (dStr && typeof dStr.toDate === 'function') {
    return dStr.toDate();
  }
  if (dStr && typeof dStr === 'object' && dStr.seconds !== undefined) {
    return new Date(dStr.seconds * 1000);
  }

  if (typeof dStr === 'string') {
    const cleanStr = dStr.replace(/\s*[\(\[]?[A-Za-z]{3,9}[\)\]]?/g, '').trim();

    // Check for DD-MM-YYYY, DD.MM.YYYY, DD/MM/YYYY
    const dmyMatch = cleanStr.match(/^(\d{1,2})[\.\-\/](\d{1,2})[\.\-\/](\d{2,4})/);
    if (dmyMatch) {
      const day = parseInt(dmyMatch[1], 10);
      const month = parseInt(dmyMatch[2], 10);
      let year = parseInt(dmyMatch[3], 10);
      if (year < 100) year += 2000;
      return new Date(year, month - 1, day);
    }

    // Check for date-only YYYY-MM-DD (preserve ISO strings with T... time for exact new Date() parsing)
    const ymdMatch = cleanStr.match(/^(\d{4})[\.\-\/](\d{1,2})[\.\-\/](\d{1,2})$/);
    if (ymdMatch) {
      const year = parseInt(ymdMatch[1], 10);
      const month = parseInt(ymdMatch[2], 10);
      const day = parseInt(ymdMatch[3], 10);
      return new Date(year, month - 1, day);
    }
  }
  const parsed = new Date(dStr);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
};

const parseExactTimestamp = (val) => {
  if (!val) return 0;
  if (typeof val === 'number' && !isNaN(val)) return val;
  if (val instanceof Date) return isNaN(val.getTime()) ? 0 : val.getTime();
  if (typeof val.toDate === 'function') {
    const d = val.toDate();
    return isNaN(d.getTime()) ? 0 : d.getTime();
  }
  if (typeof val === 'object' && val.seconds !== undefined) {
    return val.seconds * 1000 + Math.floor((val.nanoseconds || 0) / 1e6);
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return 0;
    if (/^\d{10,13}$/.test(trimmed)) {
      const n = Number(trimmed);
      return trimmed.length === 10 ? n * 1000 : n;
    }
    const dmyMatch = trimmed.match(/^(\d{1,2})[\.\-\/](\d{1,2})[\.\-\/](\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?)?/i);
    if (dmyMatch) {
      const day = parseInt(dmyMatch[1], 10);
      const month = parseInt(dmyMatch[2], 10);
      let year = parseInt(dmyMatch[3], 10);
      if (year < 100) year += 2000;
      let hr = dmyMatch[4] ? parseInt(dmyMatch[4], 10) : 0;
      const min = dmyMatch[5] ? parseInt(dmyMatch[5], 10) : 0;
      const sec = dmyMatch[6] ? parseInt(dmyMatch[6], 10) : 0;
      const mer = dmyMatch[7]?.toUpperCase();
      if (mer === 'PM' && hr < 12) hr += 12;
      if (mer === 'AM' && hr === 12) hr = 0;
      return new Date(year, month - 1, day, hr, min, sec).getTime();
    }
    const parsed = new Date(trimmed);
    return isNaN(parsed.getTime()) ? 0 : parsed.getTime();
  }
  return 0;
};

const getCustomerRecencyTimestamp = (c) => {
  if (!c) return 0;
  const preciseTs =
    parseExactTimestamp(c.created_at) ||
    parseExactTimestamp(c.createdAt) ||
    parseExactTimestamp(c.timestamp) ||
    parseExactTimestamp(c.approvedAt) ||
    parseExactTimestamp(c.lastUpdated);
  if (preciseTs > 0) return preciseTs;

  return (
    parseExactTimestamp(c.loan_date) ||
    parseExactTimestamp(c.loanDate) ||
    parseExactTimestamp(c.disbursedAt) ||
    parseExactTimestamp(c.date) ||
    0
  );
};

const getCustomerStatusBadgeLabel = (c) => {
  const out = c?.dynamicOutstanding !== undefined ? c.dynamicOutstanding : (c?.repayAmount || 0);
  const od = c?.dynamicOverdue || 0;
  const pending = c?.dynamicPendingDues || 0;
  if (out <= 0) return 'SETTLED';
  if (od > 0 || pending > 0) return 'OVERDUE';
  return 'LIVE';
};

export const safeSetItem = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    if (e.name === 'QuotaExceededError' || e.code === 22) {
      console.warn(`Storage quota exceeded for key "${key}". Purging non-critical keys.`);
      // If we hit quota on the profile, it might mean old heavy data is stuck.
      if (key === 'everest_user_profile') {
         try {
            localStorage.removeItem('everest_customers'); // Clear some space
            localStorage.setItem(key, value);
         } catch (retryErr) {
            console.error('Retry failed for safeSetItem', retryErr);
         }
      }
    }
  }
};

const sanitizeProfile = (profileData) => {
  if (!profileData) return profileData;
  const sanitized = { ...profileData };
  // Remove heavy image fields to prevent QuotaExceededError
  delete sanitized.photoBase64;
  delete sanitized.profileImage;
  delete sanitized.avatarUrl;
  delete sanitized.photoUrl;
  delete sanitized.attendance;
  delete sanitized.historicalAttendance;
  return sanitized;
};

function App() {
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      try {
        StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});
      } catch (e) {}
    }
  }, []);
  const [activeBranch, setActiveBranch] = useState({ id: 'main', name: 'Main Branch' });
  const [branches, setBranches] = useState([{ id: 'main', name: 'Main Branch' }]);
  const [isSwitchingBranch, setIsSwitchingBranch] = useState(false);
  const [isAddBranchModalOpen, setIsAddBranchModalOpen] = useState(false);
  const [isEditBranchModalOpen, setIsEditBranchModalOpen] = useState(false);

  const [userProfile, setUserProfile] = useState(() => {
    try {
      const saved = localStorage.getItem('everest_user_profile');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.warn("Failed to parse everest_user_profile from local storage, purging.");
      localStorage.removeItem('everest_user_profile');
      return null;
    }
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

  const [isRoleResolving, setIsRoleResolving] = useState(true);
  const [isBranchLoading, setIsBranchLoading] = useState(true);
  const [isCollectionReportOpen, setIsCollectionReportOpen] = useState(false);
  const [staffDirectory, setStaffDirectory] = useState([]);

  // Fetch Branches Globally
  useEffect(() => {
    sanitizeLocalStorageBranches();
    if (user && userProfile) {
      const unsub = onSnapshot(collection(db, 'branches'), (snapshot) => {
        const fetchedBranches = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(isBranchActive);
        setBranches([{ id: 'main', name: 'Main Branch' }, ...fetchedBranches]);

        // Background self-healing: purge obsolete Madurai/Trichy docs if found in Firestore
        snapshot.docs.forEach(docSnap => {
          const d = docSnap.data();
          const docId = docSnap.id.toLowerCase();
          const dName = String(d.name || d.branchName || docSnap.id).toLowerCase();
          if (
            dName.includes('madurai') || dName.includes('trichy') ||
            docId.includes('madurai') || docId.includes('trichy')
          ) {
            console.log(`Self-healing purge of ghost branch doc [${docSnap.id}]`);
            deleteDoc(docSnap.ref).catch(err => console.warn("Purge ghost branch err:", err));
          }
        });
      }, (error) => {
        console.error("Error fetching branches:", error);
      });
      return () => unsub();
    }
  }, [user, userProfile]);

  // Fetch Staff Directory for Customer List Assigned Staff Filter
  useEffect(() => {
    if (user && userProfile) {
      const unsub = onSnapshot(collection(db, 'staff'), (snapshot) => {
        const list = snapshot.docs
          .map(docSnap => ({ id: docSnap.id, ...docSnap.data() }))
          .filter(s => s.status !== 'Recycled' && s.status !== 'Deleted' && s.status !== 'Inactive' && s.disabled !== true);
        setStaffDirectory(list);
      }, (error) => {
        console.error("Error fetching staff directory:", error);
      });
      return () => unsub();
    }
  }, [user, userProfile]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setIsRoleResolving(true);
        setIsBranchLoading(true);
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
                  const { collection, query, where, getDocs, updateDoc, doc: fDoc } = await import('firebase/firestore');
                  let staffSnaps = await getDocs(query(collection(db, 'staff'), where('uid', '==', currentUser.uid)));
                  
                  if (staffSnaps.empty) {
                    const cleanPhone = String(profileData.phone || currentUser.phoneNumber || '').replace(/\D/g, '').slice(-10);
                    if (cleanPhone && cleanPhone.length === 10) {
                      staffSnaps = await getDocs(query(collection(db, 'staff'), where('phone', '==', cleanPhone)));
                      if (!staffSnaps.empty) {
                         // Auto-heal missing UID
                         updateDoc(fDoc(db, 'staff', staffSnaps.docs[0].id), { uid: currentUser.uid }).catch(() => {});
                      }
                    }
                  }

                  if (!staffSnaps.empty) {
                    const sDoc = staffSnaps.docs[0].data();
                    profileData.name = sDoc.name || 'Staff Member';
                    profileData.staffId = sDoc.staffId || sDoc.id || sDoc.employeeId || sDoc.customId || sDoc.phone || 'N/A';
                    profileData.branchId = sDoc.branchId || profileData.branchId || 'main';
                    profileData.branchName = sDoc.branchName || profileData.branchName || 'Main Branch';
                    profileData.credentialsVersion = sDoc.credentialsVersion || null;
                    profileData.photoBase64 = sDoc.photoBase64 || sDoc.photoUrl || sDoc.avatarUrl || sDoc.profileImage || null;
                    if (sDoc.permissions) {
                      profileData.permissions = sDoc.permissions;
                    }
                  }
                  
                  // CRITICAL FIX: Lock the global application branch context to this staff's assigned branch
                  if (profileData.branchId) {
                    setActiveBranch({ 
                      id: profileData.branchId, 
                      name: profileData.branch || profileData.branchName || (profileData.branchId === 'main' ? 'Main Branch' : profileData.branchId)
                    });
                  }
                } catch (e) {
                  console.error('Failed to augment staff profile', e);
                }
              }
            
            // If switching to a different user, purge stale customer cache immediately
            setUserProfile(prev => {
              if (prev && prev.uid && profileData.uid && prev.uid !== profileData.uid) {
                setCustomers([]);
                localStorage.removeItem('everest_customers');
              }
              return profileData;
            });
            safeSetItem('everest_user_profile', JSON.stringify(sanitizeProfile(profileData)));
            setIsRoleResolving(false);
            setIsBranchLoading(false);
          })
          .catch(err => {
            console.error("Error fetching profile:", err);
            setIsRoleResolving(false);
            setIsBranchLoading(false);
          });
      } else {
        setUser(null);
        setUserProfile(null);
        setCustomers([]);
        localStorage.removeItem('everest_user_profile');
        localStorage.removeItem('everest_customers');
        setIsRoleResolving(false);
        setIsBranchLoading(false);
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
          signOut(auth);
          setUser(null);
          setUserProfile(null);
          localStorage.removeItem('everest_user_profile');
          window.location.reload();
        } else if (staffData.credentialsVersion && userProfile?.credentialsVersion && staffData.credentialsVersion > userProfile.credentialsVersion) {
          signOut(auth);
          setUser(null);
          setUserProfile(null);
          localStorage.removeItem('everest_user_profile');
          window.location.reload();
        } else {
          // Sync branch rename cascade & permissions in real-time
          if (
            staffData.branch !== userProfile?.branch || 
            staffData.branchName !== userProfile?.branchName ||
            staffData.branchId !== userProfile?.branchId ||
            JSON.stringify(staffData.permissions) !== JSON.stringify(userProfile?.permissions)
          ) {
            setUserProfile(prev => {
              if (!prev) return prev;
              const newProfile = { 
                ...prev, 
                ...staffData, 
                branch: staffData.branch, 
                branchName: staffData.branchName, 
                branchId: staffData.branchId,
                permissions: staffData.permissions || prev.permissions
              };
              safeSetItem('everest_user_profile', JSON.stringify(sanitizeProfile(newProfile)));
              return newProfile;
            });

            if (staffData.branchId) {
              setActiveBranch({ 
                id: staffData.branchId, 
                name: staffData.branch || staffData.branchName || (staffData.branchId === 'main' ? 'Main Branch' : staffData.branchId)
              });
            }
          }
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
        if (userProfile.role === 'admin' || userProfile.role === 'staff') {
          // Stream complete customers collection to prevent branchId field mismatch drops
          q = collection(db, 'customers');
        } else {
          // Customer role
          q = query(collection(db, 'customers'), where('phone', '==', user.phoneNumber));
        }
        
        unsubscribe = onSnapshot(q, (querySnapshot) => {
          const fetched = [];
          querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            // Data Sanitization Patch: Clean corrupted staffName
            if (data.staffName === 'Unassigned' || data.staffName === 'Staff Unassigned') {
               const validStaff = data.assignedStaff || data.createdByStaffName || data.centerStaffName || (data.staff && data.staff.name);
               if (validStaff && validStaff !== 'Unassigned' && validStaff !== 'Staff Unassigned') {
                 data.staffName = validStaff;
               } else {
                 data.staffName = ''; // clear corrupted value
               }
            }
            fetched.push({ ...data, id: docSnap.id });
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
  const [selectedCenter, setSelectedCenter] = useState(null);
  
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
        window.location.reload();
      }
    } catch (e) {
      console.warn('Silent failure in session guard', e);
    }
  };

  const navigateToView = (newView) => {
    setIsCollectionReportOpen(false);
    if (newView === 'Cash Book' && !canAccessCashBook(userProfile)) {
      console.warn('Unauthorized navigation to Cash Book blocked by RBAC guard.');
      newView = 'Home';
    }
    if (newView === 'Customer') {
      setActiveCategory('Active');
      setSearchQuery('');
      setActiveSort('Recent');
      setActiveBranchFilter('All');
    }
    
    verifySessionGuard();
    setViewHistory(prev => {
      if (prev[prev.length - 1] === newView) return prev;
      return [...prev, newView];
    });
    setCurrentView(newView);
  };

  // RBAC safety enforcement: Kick out of Cash Book if permissions change or unpermitted staff opens it
  useEffect(() => {
    if (currentView === 'Cash Book' && !canAccessCashBook(userProfile)) {
      console.warn('Redirecting unauthorized user away from Cash Book to Home.');
      setCurrentView('Home');
    }
  }, [currentView, userProfile]);
  
  const handleDrillDown = (category) => {
    setIsCollectionReportOpen(false);
    setActiveCategory(category);
    setSearchQuery('');
    setActiveSort('Recent');
    setActiveBranchFilter('All');
    setCurrentView('Customer');
  };

  const switchTab = (newView) => {
    setIsCollectionReportOpen(newView === 'Collection Report');
    if (newView === 'Customer') {
      setActiveCategory('Active');
      setSearchQuery('');
      setActiveSort('Recent');
      setActiveBranchFilter('All');
    }
    verifySessionGuard();
    if (newView === 'Home') {
      setViewHistory(['Home']);
    } else {
      setViewHistory(['Home', newView]);
    }
    setCurrentView(newView);
  };

  useEffect(() => {
    if (currentView === 'Collection Report') {
      setIsCollectionReportOpen(true);
    } else if (currentView !== 'Home') {
      setIsCollectionReportOpen(false);
    }
  }, [currentView]);

  useEffect(() => {
    if (!isCollectionReportOpen) {
      document.body.style.removeProperty('overflow');
      document.body.style.removeProperty('position');
      document.body.style.removeProperty('top');
      document.body.style.removeProperty('width');
      document.body.style.overflow = 'auto';
      document.documentElement.style.overflow = 'auto';
      document.body.classList.remove('modal-open', 'overflow-hidden');
    }
  }, [isCollectionReportOpen]);

  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState(null);
  const [activeHomeMenuId, setActiveHomeMenuId] = useState(null);

  // Filter, Sort, and Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('Active');
  const [activeSort, setActiveSort] = useState('Recent');
  const [isOdFilterActive, setIsOdFilterActive] = useState(false);
  const [activeCustomDate, setActiveCustomDate] = useState(null);
  
  // Temp state for the modal before applying
  const [tempCategory, setTempCategory] = useState('Active');
  const [tempSort, setTempSort] = useState('Recent');
  const [activeBranchFilter, setActiveBranchFilter] = useState('All');
  const [tempBranchFilter, setTempBranchFilter] = useState('All');
  const [tempCustomDate, setTempCustomDate] = useState(null);

  // Desktop Customer List Table Column Header Multi-Select Filters (Assigned Staff & Status)
  const [selectedCustomerStaffFilters, setSelectedCustomerStaffFilters] = useState(() => new Set());
  const [showCustomerStaffPopover, setShowCustomerStaffPopover] = useState(false);
  const [customerStaffPopoverCoords, setCustomerStaffPopoverCoords] = useState({ top: 0, left: 0 });
  const customerStaffPopoverRef = useRef(null);
  const customerStaffTriggerRef = useRef(null);

  const [selectedCustomerStatusFilters, setSelectedCustomerStatusFilters] = useState(() => new Set());
  const [showCustomerStatusPopover, setShowCustomerStatusPopover] = useState(false);
  const [customerStatusPopoverCoords, setCustomerStatusPopoverCoords] = useState({ top: 0, left: 0 });
  const customerStatusPopoverRef = useRef(null);
  const customerStatusTriggerRef = useRef(null);

  useEffect(() => {
    const handleOutside = (event) => {
      if (
        showCustomerStaffPopover &&
        customerStaffPopoverRef.current &&
        !customerStaffPopoverRef.current.contains(event.target) &&
        !customerStaffTriggerRef.current?.contains(event.target)
      ) {
        setShowCustomerStaffPopover(false);
      }
      if (
        showCustomerStatusPopover &&
        customerStatusPopoverRef.current &&
        !customerStatusPopoverRef.current.contains(event.target) &&
        !customerStatusTriggerRef.current?.contains(event.target)
      ) {
        setShowCustomerStatusPopover(false);
      }
    };
    if (showCustomerStaffPopover || showCustomerStatusPopover) {
      document.addEventListener('mousedown', handleOutside);
      document.addEventListener('touchstart', handleOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, [showCustomerStaffPopover, showCustomerStatusPopover]);

  // Automatically reset all filter selections whenever the user switches activeBranch
  useEffect(() => {
    setActiveCategory('Active');
    setActiveSort('Recent');
    setActiveBranchFilter('All');
    setActiveCustomDate(null);
    setTempCategory('Active');
    setTempBranchFilter('All');
    setTempCustomDate(null);
    setSearchQuery('');
    setIsOdFilterActive(false);
    setSelectedCustomerStaffFilters(new Set());
    setSelectedCustomerStatusFilters(new Set());
    setShowCustomerStaffPopover(false);
    setShowCustomerStatusPopover(false);
  }, [activeBranch?.id, activeBranch?.name]);

  // Fallback to Main Branch if active branch gets hidden from dropdown
  useEffect(() => {
    if (activeBranch && activeBranch.id !== 'main') {
      const currentConfig = branches.find(b => b.id === activeBranch.id);
      if (currentConfig && currentConfig.isVisibleInDropdown === false) {
        const mainBranch = branches.find(b => b.id === 'main') || { id: 'main', name: 'Main Branch' };
        setActiveBranch(mainBranch);
      }
    }
  }, [branches, activeBranch]);


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
        if (isCollectionReportOpen) { setIsCollectionReportOpen(false); return; }
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

          if (actualView === 'Center Detail') {
            setCurrentView('Centers');
            return ['Home', 'Centers'];
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

    if (Capacitor.isNativePlatform()) {
      setupListener();
    }

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
    setTempBranchFilter(activeBranchFilter);
    setTempCustomDate(activeCustomDate);
    setIsFilterOpen(true);
  };

  const applyFilter = () => {
    setActiveCategory(tempCategory);
    setActiveSort(tempSort);
    setActiveBranchFilter(tempBranchFilter);
    setActiveCustomDate(tempCustomDate);
    setIsFilterOpen(false);
  };

  const clearFilter = () => {
    setActiveCategory('Active');
    setActiveSort('Recent');
    setActiveBranchFilter('All');
    setActiveCustomDate(null);
    setIsOdFilterActive(false);
    setIsFilterOpen(false);
  };

  // 1. Base Mapped Customers (No UI Table Filters)
  const baseMappedCustomers = useMemo(() => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const parseDate = (dStr) => {
      return parseGlobalDate(dStr);
    };

    return customers
      .filter(c => {
        const s = c.status?.trim().toLowerCase();
        if (s === 'recycled' || s === 'deleted' || c.isDeleted === true || c.deleted === true || c.inRecycleBin === true) {
          return false;
        }

        // Branch Consolidation Filter for Main Branch vs Sub-Branches
        if (activeBranch?.id === 'main' || activeBranch?.name === 'Main Branch') {
          const excludedIds = branches.filter(b => b.includeInConsolidatedTotals === false).map(b => String(b.id));
          const excludedNames = branches.filter(b => b.includeInConsolidatedTotals === false).map(b => String(b.name).toLowerCase());
          const cId = String(c.branchId || '');
          const cName = String(c.branch || c.branchName || '').toLowerCase();
          
          if (excludedIds.includes(cId)) return false;
          if (excludedNames.includes(cName)) return false;
        } else if (activeBranch?.id || activeBranch?.name) {
          const targetId = String(activeBranch?.id || '').trim().toLowerCase();
          const targetName = String(activeBranch?.name || '').trim().toLowerCase();
          const cId = String(c.branchId || c.branchCode || '').trim().toLowerCase();
          const cName = String(c.branch || c.branchName || c.assignedBranch || '').trim().toLowerCase();
          const matches = (targetId && (cId === targetId || cName === targetId)) ||
                          (targetName && (cName === targetName || cId === targetName || cName.includes(targetName) || targetName.includes(cName)));
          if (!matches) return false;
        }
        
        return true;
      })
      .map(c => {
        const repay = parseFloat(c.repayAmount) || 0;
        const insts = Array.isArray(c.installments) ? c.installments : (c.ledger || c.transactions || c.history || []);
        const nonBouncedInsts = insts.filter(inst => {
          const status = String(inst.status || '').toUpperCase();
          const amt = parseFloat(inst.amount || inst.paidAmount || (Number(inst.cashAmount || 0) + Number(inst.upiAmount || 0))) || 0;
          return status !== 'BOUNCED' && status !== 'CANCELLED' && inst.mode !== 'BOUNCED' && amt > 0;
        });
        const totalPaidToDate = nonBouncedInsts.reduce((sum, inst) => {
          const amt = parseFloat(inst.amount || inst.paidAmount || (Number(inst.cashAmount || 0) + Number(inst.upiAmount || 0))) || 0;
          return sum + amt;
        }, 0);
        const actualPaid = Math.max(totalPaidToDate, Number(c.paidAmount || c.totalPaid || 0));

        // 1. Precise Frequency Detection (Monthly/Personal/Agri vs Daily vs Weekly/Microfinance)
        const typeStr = String(c.loanType || c.scheme || c.category || '').toLowerCase();
        const unitStr = String(c.tenureUnit || c.paymentFrequency || c.frequency || '').toLowerCase();
        let planToken = 'WEEK';
        if (unitStr.includes('month') || typeStr.includes('month') || typeStr.includes('personal') || typeStr.includes('agri')) {
          planToken = 'MONTH';
        } else if (unitStr.includes('day') || typeStr.includes('daily') || typeStr.includes('day') || c.days) {
          planToken = 'DAY';
        } else if (unitStr.includes('week') || typeStr.includes('week') || typeStr.includes('micro') || c.weeks) {
          planToken = 'WEEK';
        }

        const planCount = Number(c.tenureVal || c.tenure || c.weeks || c.days || c.months || (planToken === 'DAY' ? 100 : 12));
        const emiAmount = Number(c.perDayAmount || c.dailyInstallment || c.installmentAmount || c.targetAmount || 0) ||
          (repay > 0 && planCount > 0 ? Math.round(repay / planCount) : 0);

        // Group paid amounts by installment number / count
        const sumByNumber = {};
        nonBouncedInsts.forEach(inst => {
          if (inst.number) {
            sumByNumber[inst.number] = (sumByNumber[inst.number] || 0) + (parseFloat(inst.amount) || 0);
          }
        });
        const fullySettledByNumber = Object.keys(sumByNumber).filter(num => sumByNumber[num] >= emiAmount).length;
        const fullySettledCount = Math.max(
          fullySettledByNumber,
          emiAmount > 0 ? Math.floor(actualPaid / emiAmount) : 0
        );
        const totalPaidForLastNumber = emiAmount > 0 ? (actualPaid - (fullySettledCount * emiAmount)) : 0;
        const isLastPending = totalPaidForLastNumber > 0 && totalPaidForLastNumber < emiAmount;

        const getOrdinal = (n) => {
          const s = ["th", "st", "nd", "rd"];
          const v = n % 100;
          return n + (s[(v - 20) % 10] || s[v] || s[0]);
        };

        // 2. Master Repayment Schedule: Fixed contract calendar (Single Source of Truth)
        let masterRepaymentSchedule = [];
        if (Array.isArray(c.repaymentSchedule) && c.repaymentSchedule.length > 0) {
          masterRepaymentSchedule = c.repaymentSchedule.map((item, idx) => {
            const dStr = item.date || item.dueDate || item.scheduledDate;
            const dObj = parseDate(dStr);
            const dd = String(dObj.getDate()).padStart(2, '0');
            const mm = String(dObj.getMonth() + 1).padStart(2, '0');
            const yyyy = dObj.getFullYear();
            const formattedDate = `${dd}-${mm}-${yyyy}`;
            const weekday = dObj.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
            const status = item.status || (idx < fullySettledCount ? 'PAID' : (idx === fullySettledCount && isLastPending ? 'PARTIAL' : 'UNPAID'));
            const ord = getOrdinal(idx + 1);
            return {
              ...item,
              index: item.index || (idx + 1),
              installmentNumber: item.installmentNumber || `${ord} Installment`,
              date: formattedDate,
              dateObj: dObj,
              weekday: weekday,
              dueAmount: Number(item.dueAmount || item.amount || emiAmount),
              amount: Number(item.dueAmount || item.amount || emiAmount),
              status: status
            };
          });
        } else {
          // Resolve base anchor date without dynamic date shifting
          let baseDateObj = null;
          const explicitBaseStr = c.firstDueDate || c.startDate || c.dueDate || c.nextDueDate;
          if (explicitBaseStr) {
            const d = parseDate(explicitBaseStr);
            if (d && !isNaN(d.getTime())) baseDateObj = d;
          }
          if (!baseDateObj && insts.length > 0) {
            const sortedInsts = [...insts].sort((a, b) => parseDate(a.date || a.createdAt).getTime() - parseDate(b.date || b.createdAt).getTime());
            const d = parseDate(sortedInsts[0]?.date || sortedInsts[0]?.createdAt);
            if (d && !isNaN(d.getTime())) baseDateObj = d;
          }
          if (!baseDateObj) {
            const disbStr = c.disbursedAt || c.disbursedDate || c.loanApprovedDate || c.approvalDate || c.loanDate;
            if (disbStr) {
              const d = parseDate(disbStr);
              if (d && !isNaN(d.getTime())) {
                const s = new Date(d);
                if (planToken === 'DAY') s.setDate(s.getDate() + 1);
                else if (planToken === 'MONTH') s.setMonth(s.getMonth() + 1);
                else s.setDate(s.getDate() + 7);
                baseDateObj = s;
              }
            }
          }
          if (!baseDateObj) {
            baseDateObj = parseDate(c.date || c.createdAt || '12-07-2026');
          }

          for (let idx = 0; idx < planCount; idx++) {
            const rowDateObj = new Date(baseDateObj);
            if (planToken === 'DAY') rowDateObj.setDate(rowDateObj.getDate() + idx);
            else if (planToken === 'MONTH') rowDateObj.setMonth(rowDateObj.getMonth() + idx);
            else rowDateObj.setDate(rowDateObj.getDate() + (idx * 7));

            const dd = String(rowDateObj.getDate()).padStart(2, '0');
            const mm = String(rowDateObj.getMonth() + 1).padStart(2, '0');
            const yyyy = rowDateObj.getFullYear();
            const formattedDate = `${dd}-${mm}-${yyyy}`;
            const weekday = rowDateObj.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
            const ord = getOrdinal(idx + 1);
            const status = idx < fullySettledCount ? 'PAID' : (idx === fullySettledCount && isLastPending ? 'PARTIAL' : 'UNPAID');

            masterRepaymentSchedule.push({
              index: idx + 1,
              installmentNumber: `${ord} Installment`,
              date: formattedDate,
              dateObj: rowDateObj,
              weekday: weekday,
              dueAmount: emiAmount,
              amount: emiAmount,
              status: status
            });
          }
        }

        const scheduledDates = masterRepaymentSchedule.map(item => {
          const d = new Date(item.dateObj);
          d.setHours(0, 0, 0, 0);
          return d.getTime();
        });

        // 3. Strict Schedule-Date Bounded Active OD Computation:
        // Only inspect installments scheduled strictly BEFORE today (past unsettled arrears):
        const todayTs = today.getTime();
        const pastScheduledDates = scheduledDates.filter(ts => ts < todayTs);

        // Sum of expected dues from elapsed schedule dates
        const pastExpectedDueSum = pastScheduledDates.length * emiAmount;

        // True Active OD:
        let overdueAmount = Math.max(0, pastExpectedDueSum - actualPaid);

        // Pending Dues Count:
        let pendingDues = 0;
        if (overdueAmount > 0) {
          pendingDues = emiAmount > 0 ? Math.ceil(overdueAmount / emiAmount) : 1;
          pendingDues = Math.min(pendingDues, pastScheduledDates.length);
        }

        if (repay > 0 && (repay - actualPaid <= 0)) {
          overdueAmount = 0;
          pendingDues = 0;
        }

        // Next sequential pending installment counter:
        const nextLogicalNumber = isLastPending ? (fullySettledCount + 1) : (fullySettledCount + 1);
        const dynamicNextInstallmentNumber = `${nextLogicalNumber}${getOrdinal(nextLogicalNumber)} Installment`;

        // Next collection date strictly after latest transaction date:
        let latestTxDateObj = null;
        if (Array.isArray(insts) && insts.length > 0) {
          insts.forEach(inst => {
            const rawD = inst.date || inst.createdAt;
            if (rawD) {
              const d = parseDate(rawD);
              if (d && !isNaN(d.getTime())) {
                const dZero = new Date(d);
                dZero.setHours(0, 0, 0, 0);
                if (!latestTxDateObj || dZero.getTime() > latestTxDateObj.getTime()) {
                  latestTxDateObj = dZero;
                }
              }
            }
          });
        }

        let nextDueDateStr = null;
        if (!latestTxDateObj) {
          nextDueDateStr = masterRepaymentSchedule[0]?.date || null;
        } else {
          const lastTxTs = latestTxDateObj.getTime();
          if (planToken === 'DAY') {
            const nextDay = new Date(latestTxDateObj);
            nextDay.setDate(nextDay.getDate() + 1);
            const dd = String(nextDay.getDate()).padStart(2, '0');
            const mm = String(nextDay.getMonth() + 1).padStart(2, '0');
            const yyyy = nextDay.getFullYear();
            nextDueDateStr = `${dd}-${mm}-${yyyy}`;
          } else {
            const upcomingItem = masterRepaymentSchedule.find(item => {
              if (!item.dateObj) return false;
              const itemDate = new Date(item.dateObj);
              itemDate.setHours(0, 0, 0, 0);
              return itemDate.getTime() > lastTxTs;
            });
            if (upcomingItem) {
              nextDueDateStr = upcomingItem.date;
            } else {
              const nextDate = new Date(latestTxDateObj);
              if (planToken === 'WEEK') nextDate.setDate(nextDate.getDate() + 7);
              else nextDate.setMonth(nextDate.getMonth() + 1);
              const dd = String(nextDate.getDate()).padStart(2, '0');
              const mm = String(nextDate.getMonth() + 1).padStart(2, '0');
              const yyyy = nextDate.getFullYear();
              nextDueDateStr = `${dd}-${mm}-${yyyy}`;
            }
          }
        }

        return { 
          ...c, 
          repaymentSchedule: masterRepaymentSchedule,
          dynamicNextDueDate: nextDueDateStr,
          dynamicNextDueAmount: emiAmount,
          dynamicNextInstallmentNumber: dynamicNextInstallmentNumber,
          dynamicOutstanding: Math.max(0, repay - actualPaid),
          dynamicTotalPaid: actualPaid,
          dynamicOverdue: overdueAmount,
          dynamicPendingDues: pendingDues,
          dynamicEmiAmount: emiAmount,
          scheduledDates
        };
      });
  }, [customers, branches, activeBranch]);

  // 2. Processed Customers (With UI Table Filters Applied)
  const processedCustomers = useMemo(() => {
    let filtered = [...baseMappedCustomers];
    const today = new Date();
    today.setHours(0,0,0,0);
    const parseDate = (dStr) => {
      return parseGlobalDate(dStr);
    };
    
    if (activeCategory !== 'All') {
      const loanTypeCategories = ['Microfinance', 'Personal Loan', 'Agri Loan', 'Weekly Loan', 'Daily Loan'];
      if (loanTypeCategories.includes(activeCategory)) {
        const matchType = activeCategory === 'Microfinance' ? 'Micro Finance' : (activeCategory === 'Daily Loan' ? 'Daily' : activeCategory);
        filtered = filtered.filter(c => 
          (c.loanType || '').trim().toLowerCase() === activeCategory.trim().toLowerCase() ||
          (c.loanType || '').toLowerCase().includes(activeCategory.toLowerCase()) ||
          (c.loanType || '').toLowerCase().includes(matchType.toLowerCase())
        );
      } else if (activeCategory === 'Active') {
        filtered = filtered.filter(c => (c.dynamicOutstanding > 0 && c.status !== 'SETTLED' && c.status !== 'Settled'));
      } else if (activeCategory === 'Settled') {
        filtered = filtered.filter(c => (c.dynamicOutstanding <= 0 || c.status === 'SETTLED' || c.status === 'Settled'));
      } else if (activeCategory === 'Due Date') {
        const targetTime = today.getTime();
        filtered = filtered.filter(c => c.scheduledDates?.includes(targetTime));
      } else if (activeCategory === 'Upcoming') {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const targetTime = tomorrow.getTime();
        filtered = filtered.filter(c => c.scheduledDates?.includes(targetTime));
      } else if (activeCategory === 'Custom') {
        if (activeCustomDate) {
          const target = new Date(activeCustomDate);
          target.setHours(0,0,0,0);
          const targetTime = target.getTime();
          filtered = filtered.filter(c => c.scheduledDates?.includes(targetTime));
        }
      } else {
        filtered = filtered.filter(c => c.category === activeCategory);
      }
    }

    const isMainBranch = activeBranch?.id === 'main' || activeBranch?.name === 'Main Branch';
    if (isMainBranch && activeBranchFilter && activeBranchFilter !== 'All') {
      const cleanBranchStr = (val) => {
        if (!val || typeof val !== 'string') return '';
        return val.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      };
      
      const target = cleanBranchStr(activeBranchFilter);

      filtered = filtered.filter(c => {
        const candidates = [
          c.branch,
          c.branchName,
          c.branchId,
          c.assignedBranch
        ]
          .map(cleanBranchStr)
          .filter((v) => v.length > 0);

        return candidates.some((cand) => cand === target);
      });
    }


    if (searchQuery?.trim() !== '') {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(c => {
        const nameMatch = String(c?.name || '').toLowerCase().includes(q);
        const appNumMatch = String(c?.appNumber || '').toLowerCase().includes(q);
        const phoneMatch = String(c?.phone || '').toLowerCase().includes(q);
        const idMatch = String(c?.id || c?.customerId || '').toLowerCase().includes(q);
        const branchMatch = String(c?.branch || c?.branchName || c?.branchId || '').toLowerCase().includes(q);
        const staffMatch = String(c?.assignedStaffName || c?.staffName || c?.assignedStaff || c?.staff || '').toLowerCase().includes(q);
        const loanTypeMatch = String(c?.loanType || c?.category || c?.type || c?.scheme || '').toLowerCase().includes(q);
        const amountMatch = String(c?.loanAmount || c?.principalAmount || '').toLowerCase().includes(q);
        const outMatch = String(c?.outstandingAmount || c?.balance || c?.repayAmount || c?.dynamicOutstanding || '').toLowerCase().includes(q);
        
        const out = c.dynamicOutstanding !== undefined ? c.dynamicOutstanding : (c.repayAmount || 0);
        const od = c.dynamicOverdue || 0;
        const pending = c.dynamicPendingDues || 0;
        let statusStr = "live";
        if (out <= 0) statusStr = "settled";
        else if (od > 0 || pending > 0) statusStr = "od";
        const statusMatch = statusStr.includes(q);

        return nameMatch || appNumMatch || phoneMatch || idMatch || branchMatch || staffMatch || loanTypeMatch || amountMatch || outMatch || statusMatch;
      });
    }


    filtered.sort((a, b) => {
      switch (activeSort) {
        case 'Recent': {
          const tsDiff = getCustomerRecencyTimestamp(b) - getCustomerRecencyTimestamp(a);
          if (tsDiff !== 0) return tsDiff;
          return String(b.id || '').localeCompare(String(a.id || ''));
        }
        case 'Oldest': {
          const tsDiff = getCustomerRecencyTimestamp(a) - getCustomerRecencyTimestamp(b);
          if (tsDiff !== 0) return tsDiff;
          return String(a.id || '').localeCompare(String(b.id || ''));
        }
        case 'Highest Amount':
          return (parseFloat(b.loanAmount) || 0) - (parseFloat(a.loanAmount) || 0);
        case 'Least Amount':
          return (parseFloat(a.loanAmount) || 0) - (parseFloat(b.loanAmount) || 0);
        case 'By Name':
          const cleanNameA = String(a.name || '').replace(/^(Mr|Mrs|Miss|Ms)\.?\s+/i, '').trim().toLowerCase();
          const cleanNameB = String(b.name || '').replace(/^(Mr|Mrs|Miss|Ms)\.?\s+/i, '').trim().toLowerCase();
          return cleanNameA.localeCompare(cleanNameB);
        default:
          return 0;
      }
    });

    return filtered;
  }, [baseMappedCustomers, activeCategory, activeSort, searchQuery, activeBranch, activeBranchFilter, userProfile, activeCustomDate]);

  // Apply RBAC Staff Scoping
  const dashboardOverviewMode = userProfile?.permissions?.dashboardOverviewMode || 'Staff';
  const customerManagementMode = userProfile?.permissions?.customerManagementMode || 'Staff';
  const applicationStatusMode = userProfile?.permissions?.applicationStatusRole || 'Staff';

  const isStaffAssigned = (c) => {
    const uidMatch = 
      c.staffId === user?.uid || 
      c.assignedStaffId === user?.uid || 
      c.createdBy === user?.uid ||
      (userProfile?.staffId && String(c.staffId) === String(userProfile.staffId));
    if (uidMatch) return true;
    
    const loggedInStaffName = (userProfile?.name || userProfile?.staffName || userProfile?.displayName || user?.displayName || (userProfile?.email ? userProfile.email.split('@')[0] : '') || (user?.email ? user.email.split('@')[0] : ''))?.toLowerCase().trim();
    if (loggedInStaffName) {
      const cStaffName = String(c?.staffName || '').toLowerCase().trim();
      const cAssignedStaff = String(c?.assignedStaff || '').toLowerCase().trim();
      const cAssignedStaffName = String(c?.assignedStaffName || '').toLowerCase().trim();
      const cStaff = String(c?.staff || '').toLowerCase().trim();
      
      if (cStaffName === loggedInStaffName || 
          cAssignedStaff === loggedInStaffName || 
          cAssignedStaffName === loggedInStaffName || 
          cStaff === loggedInStaffName) {
        return true;
      }
    }
    return false;
  };

  const rbacDashboardCustomers = useMemo(() => {
    if (isRoleResolving || isBranchLoading || !userProfile) return [];
    if (userProfile?.role === 'admin' || String(customerManagementMode).toLowerCase() === 'admin') return baseMappedCustomers;
    return baseMappedCustomers.filter(isStaffAssigned);
  }, [baseMappedCustomers, userProfile, customerManagementMode, user, isRoleResolving, isBranchLoading]);

  const rbacManagementCustomers = useMemo(() => {
    if (isRoleResolving || isBranchLoading || !userProfile) return [];
    if (userProfile?.role === 'admin' || String(customerManagementMode).toLowerCase() === 'admin') return processedCustomers;
    return processedCustomers.filter(isStaffAssigned);
  }, [processedCustomers, userProfile, customerManagementMode, user, isRoleResolving, isBranchLoading]);

  const rbacApplicationCustomers = useMemo(() => {
    if (isRoleResolving || isBranchLoading || !userProfile) return [];
    if (userProfile?.role === 'admin' || String(applicationStatusMode).toLowerCase() === 'admin') return baseMappedCustomers;
    return baseMappedCustomers.filter(isStaffAssigned);
  }, [baseMappedCustomers, userProfile, applicationStatusMode, user, isRoleResolving, isBranchLoading]);

  // Select appropriate dataset based on current view to ensure metrics match tabular data
  const activeMetricsCustomers = currentView === 'Customer' ? rbacManagementCustomers : rbacDashboardCustomers;

  // Aggregate Financials (Dynamic Based on UI Stream)
  const { totalLoan, totalOutstanding } = useMemo(() => {
    const activeStream = activeMetricsCustomers.filter(c => c.status === 'Approved' || c.status === 'approved');
    return activeStream.reduce((acc, curr) => {
      const loanAmt = Number(curr.loanAmount) || 0;
      acc.totalLoan += loanAmt;
      const repay = parseFloat(curr.repayAmount) || 0;
      acc.totalOutstanding += (curr.dynamicOutstanding !== undefined ? curr.dynamicOutstanding : repay);
      return acc;
    }, { totalLoan: 0, totalOutstanding: 0 });
  }, [activeMetricsCustomers]);

  // 1. SUMMARY METRICS CALCULATION ENGINE
  // STRICT FINANCIAL SUMMARY METRICS ENGINE
  const summaryMetrics = useMemo(() => {
    let totalDisbursed = 0;
    let totalLoan = 0;
    let totalCollection = 0;
    let totalOutstanding = 0;
    let totalOverdue = 0;

    let approvedCustomers = (activeMetricsCustomers || []).filter(c => c && (c.status === 'Approved' || c.status === 'approved'));
    if (isOdFilterActive) {
      approvedCustomers = approvedCustomers.filter(c => c.dynamicOverdue > 0 || c.dynamicPendingDues > 0);
    }
    const list = Array.isArray(approvedCustomers) ? approvedCustomers : [];

    list.forEach((customer) => {
      const disbursed = Number(customer.disbursedAmount || 0);
      totalDisbursed += isNaN(disbursed) ? 0 : disbursed;
      const loan = Number(customer.loanAmount || customer.principalAmount || customer.amount || 0);
      totalLoan += isNaN(loan) ? 0 : loan;
      totalCollection += (customer.dynamicTotalPaid || 0);
      totalOutstanding += (customer.dynamicOutstanding || 0);
      totalOverdue += (customer.dynamicOverdue || 0);
    });

    return {
      totalDisbursed,
      totalLoan,
      totalCollection,
      totalOutstanding,
      totalOverdue
    };
  }, [activeMetricsCustomers, isOdFilterActive]);



  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      const d = parseGlobalDate(dateString);
      if (isNaN(d.getTime())) {
        return typeof dateString === 'string' ? dateString : '-';
      }
      return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
    } catch (e) {
      return '-';
    }
  };

  const formatName = (name) => {
    if (!name) return '';
    return name.replace(/^(Mr\.|Mrs\.|Miss)\s*/i, '').trim();
  };

  const timeAgo = (dateString, updateTimestamp) => {
    if (!dateString) return '';
    try {
      const now = new Date();
      const dateToUse = updateTimestamp ? parseGlobalDate(updateTimestamp) : parseGlobalDate(dateString);
      if (isNaN(dateToUse.getTime())) return typeof dateString === 'string' ? dateString : '';

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
    } catch (e) {
      return typeof dateString === 'string' ? dateString : '';
    }
  };

  const branchSwitchTimerRef = useRef(null);

  const handleBranchSwitch = (newBranch) => {
    if (branchSwitchTimerRef.current) {
      clearTimeout(branchSwitchTimerRef.current);
    }
    setIsSwitchingBranch(true);
    setActiveBranch(newBranch);
    setCurrentView('Home');
    setViewHistory(['Home']);
    
    // Smooth 850ms isolation transition while displaying Everest FinTech loader
    branchSwitchTimerRef.current = setTimeout(() => {
      setIsSwitchingBranch(false);
      branchSwitchTimerRef.current = null;
    }, 850);
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
      case 'Home': return <div className={`flex-1 ${isCollectionReportOpen ? 'h-full overflow-hidden' : 'overflow-y-auto'}`}><AdminDashboard setCurrentView={setCurrentView} onDrillDown={handleDrillDown} activeBranch={activeBranch} userProfile={userProfile} customers={rbacDashboardCustomers.filter(c => c.status?.trim().toLowerCase() === 'approved')} branches={branches} isRoleResolving={isRoleResolving} isBranchLoading={isBranchLoading} isCollectionReportOpen={isCollectionReportOpen} setIsCollectionReportOpen={setIsCollectionReportOpen} /></div>;
      case 'Collection Report': return (
        <div className="flex-1 h-full overflow-hidden">
          {(isRoleResolving || isBranchLoading) ? (
            <BranchSyncLoader branchName={activeBranch?.name} fullScreen={false} />
          ) : (
            <CollectionReportModal isOpen={true} onClose={() => navigateToView('Home')} userProfile={userProfile} activeBranch={activeBranch} branches={branches} customers={rbacDashboardCustomers.filter(c => c.status?.trim().toLowerCase() === 'approved')} isStaff={userProfile?.role?.toLowerCase() === 'staff'} />
          )}
        </div>
      );
      case 'EMI Calculator': return <div className="flex-1 overflow-y-auto"><EMICalculator onBack={() => navigateToView('Home')} /></div>;
      case 'Centers': return <div className="flex-1 overflow-hidden md:overflow-y-auto"><CenterManagement userProfile={userProfile} activeBranch={activeBranch} navigateToView={navigateToView} setSelectedCenter={setSelectedCenter} branches={branches} /></div>;
      case 'Center Detail': return <div className="flex-1 overflow-y-auto"><CenterDetailsView center={selectedCenter} customers={customers} userProfile={userProfile} activeBranch={activeBranch} onBack={() => navigateToView('Centers')} onCenterUpdate={(updated) => setSelectedCenter(prev => ({...prev, ...updated}))} /></div>;
      case 'Add Bulk Customer': return <div className="flex-1 overflow-y-auto"><AddBulkCustomer activeBranch={activeBranch} /></div>;
      case 'Expenses':
      case 'Expansion': 
        return (
          <div className="flex-1 w-full h-full overflow-y-auto overflow-x-hidden">
            {(isRoleResolving || isBranchLoading) ? (
              <BranchSyncLoader branchName={activeBranch?.name} fullScreen={false} />
            ) : (
              <ExpansionView 
                activeBranch={activeBranch} 
                userProfile={userProfile} 
                branches={branches} 
                customers={customers} 
                onBack={() => {
                  if (viewHistory.length > 1) {
                    const newHist = [...viewHistory];
                    newHist.pop();
                    const prevView = newHist[newHist.length - 1] || 'Home';
                    setViewHistory(newHist);
                    setCurrentView(prevView);
                  } else {
                    navigateToView('Home');
                  }
                }} 
                onHome={() => navigateToView('Home')} 
              />
            )}
          </div>
        );
      case 'Cash Book': 
        if (!canAccessCashBook(userProfile)) {
          return (
            <div className={`flex-1 ${isCollectionReportOpen ? 'h-full overflow-hidden' : 'overflow-y-auto'}`}>
              <AdminDashboard 
                setCurrentView={setCurrentView} 
                onDrillDown={handleDrillDown} 
                activeBranch={activeBranch} 
                userProfile={userProfile} 
                customers={rbacDashboardCustomers.filter(c => c.status?.trim().toLowerCase() === 'approved')} 
                branches={branches} 
                isRoleResolving={isRoleResolving} 
                isBranchLoading={isBranchLoading} 
                isCollectionReportOpen={isCollectionReportOpen} 
                setIsCollectionReportOpen={setIsCollectionReportOpen} 
              />
            </div>
          );
        }
        return (
          <div className="flex-1 w-full h-full overflow-y-auto overflow-x-hidden">
            {(isRoleResolving || isBranchLoading) ? (
              <BranchSyncLoader branchName={activeBranch?.name} fullScreen={false} />
            ) : (
              <CashBook 
                activeBranch={activeBranch} 
                userProfile={userProfile} 
                branches={branches} 
                customers={customers} 
                onBack={() => {
                  if (viewHistory.length > 1) {
                    const newHist = [...viewHistory];
                    newHist.pop();
                    const prevView = newHist[newHist.length - 1] || 'Home';
                    setViewHistory(newHist);
                    setCurrentView(prevView);
                  } else {
                    navigateToView('Home');
                  }
                }} 
                onHome={() => navigateToView('Home')} 
              />
            )}
          </div>
        );
      case 'Staff Management': return <div className="flex-1 overflow-y-auto bg-slate-50"><StaffManagement onBack={() => navigateToView('Home')} setCurrentView={setCurrentView} activeBranch={activeBranch} userProfile={userProfile} branches={branches} /></div>;
      case 'Settings': return <Settings branches={branches} userProfile={userProfile} activeBranch={activeBranch} />;
      case 'Dashboard Overview': return <div className="flex-1 overflow-y-auto"><DashboardOverview /></div>;
      case 'Customer KYC Update': return <div className="flex-1 overflow-y-auto"><CustomerKYCUpdate /></div>;
      case 'Application Status': 
        return (
          <div className="flex-1 overflow-y-auto flex flex-col">
            <ApplicationStatus 
              applications={rbacApplicationCustomers}
              userProfile={userProfile}
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
              isStaff={userProfile?.role === 'staff'}
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
                  await updateDoc(doc(db, 'customers', id), { 
                    status: prevStatus, 
                    isDeleted: false,
                    deletedAt: null,
                    lastUpdated: nowIso 
                  });
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
                <div className="flex-shrink-0 z-30 bg-[#f8fafc] pb-2 md:hidden">
                  <div>
                    <NetBalanceCard loanAmount={totalLoan} outstanding={totalOutstanding} />
                  </div>
                  <SearchBar 
                    onFilterClick={openFilter} 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    isFilterActive={activeCategory !== 'All' || activeSort !== 'Recent'}
                  />
                </div>
                
                <main 
                  className="flex-1 overflow-y-auto w-full max-w-4xl mx-auto md:max-w-none md:mx-0 bg-white md:bg-gradient-to-b md:from-[#EAF4FF] md:via-[#F3F8FF] md:to-[#EAF3FF] flex flex-col relative"
                  onScroll={handleScroll}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  onTouchCancel={handleTouchEnd}
                >
                  {(() => {
                    const isMainBranchView = activeBranch?.id === 'main' || activeBranch?.name === 'Main Branch';
                    if (isRoleResolving || isBranchLoading) {
                      return <BranchSyncLoader branchName={activeBranch?.name} fullScreen={false} />;
                    }
                    let baseApproved = rbacManagementCustomers.filter(c => c.status === 'Approved' || c.status === 'approved');
                    
                    if (isOdFilterActive) {
                      baseApproved = baseApproved.filter(c => c.dynamicOverdue > 0 || c.dynamicPendingDues > 0);
                    }

                    // Active Branch Staff + Assigned Staff values for column filter popover
                    const customerStaffOptions = (() => {
                      const staffMap = new Map();
                      const addOpt = (rawName) => {
                        const clean = String(rawName || '').trim();
                        if (!clean || clean === '--' || clean === '-' || clean.toLowerCase() === 'n/a') return;
                        const key = clean.toLowerCase();
                        if (!staffMap.has(key)) {
                          staffMap.set(key, { key, name: clean });
                        }
                      };

                      const activeBranchIdLower = String(activeBranch?.id || '').toLowerCase().trim();
                      const activeBranchNameLower = String(activeBranch?.name || '').toLowerCase().trim();

                      (staffDirectory || []).forEach((s) => {
                        const sBranchId = String(s.branchId || s.branchCode || s.branch || '').toLowerCase().trim();
                        const sBranchName = String(s.branchName || s.branch || '').toLowerCase().trim();
                        const belongs =
                          isMainBranchView ||
                          sBranchId === activeBranchIdLower ||
                          sBranchName === activeBranchNameLower ||
                          (activeBranchNameLower && sBranchName.includes(activeBranchNameLower));
                        if (belongs) {
                          addOpt(s.name || s.staffName || s.displayName);
                        }
                      });

                      baseApproved.forEach((c) => {
                        addOpt(c.assignedStaff || c.staffName || c.staff);
                      });

                      return Array.from(staffMap.values()).sort((a, b) => a.name.localeCompare(b.name));
                    })();

                    const CUSTOMER_STATUS_OPTIONS = ['LIVE', 'OVERDUE', 'SETTLED'];
                    const activeCustomerStaffCount = customerStaffOptions.filter((o) =>
                      selectedCustomerStaffFilters.has(o.key)
                    ).length;
                    const isCustomerStaffFiltered =
                      activeCustomerStaffCount > 0 &&
                      activeCustomerStaffCount < customerStaffOptions.length;
                    const isCustomerStatusFiltered =
                      selectedCustomerStatusFilters.size > 0 &&
                      selectedCustomerStatusFilters.size < CUSTOMER_STATUS_OPTIONS.length;

                    let approvedCustomers = baseApproved;
                    if (isCustomerStaffFiltered) {
                      approvedCustomers = approvedCustomers.filter((c) => {
                        const sKey = String(c.assignedStaff || c.staffName || c.staff || '').toLowerCase().trim();
                        return selectedCustomerStaffFilters.has(sKey);
                      });
                    }
                    if (isCustomerStatusFiltered) {
                      approvedCustomers = approvedCustomers.filter((c) =>
                        selectedCustomerStatusFilters.has(getCustomerStatusBadgeLabel(c))
                      );
                    }
                    
                    if (isMainBranchView) {
                      console.log(`[Main Branch Filter] Selected: "${activeBranchFilter}", Total Customers: ${customers.length}, Filtered: ${approvedCustomers.length}`);
                    }

                    return (
                      <div className="relative min-h-full w-full">
                        {/* DESKTOP-ONLY: Soft Sky-Blue Wave Backdrop */}
                        <div className="hidden md:block pointer-events-none absolute inset-0 overflow-hidden z-0">
                          <svg viewBox="0 0 1440 320" preserveAspectRatio="none" className="absolute top-0 left-0 w-full h-56 opacity-70">
                            <path
                              d="M0,96 C320,180 620,10 960,80 C1180,125 1330,45 1440,16 L1440,0 L0,0 Z"
                              fill="url(#clTopWaveGrad)"
                            />
                            <defs>
                              <linearGradient id="clTopWaveGrad" x1="0" y1="0" x2="1" y2="1">
                                <stop offset="0%" stopColor="#DBEAFE" stopOpacity="0.55" />
                                <stop offset="60%" stopColor="#BAE6FD" stopOpacity="0.7" />
                                <stop offset="100%" stopColor="#93C5FD" stopOpacity="0.55" />
                              </linearGradient>
                            </defs>
                          </svg>
                          <svg viewBox="0 0 1440 160" preserveAspectRatio="none" className="absolute bottom-0 left-0 w-full h-24 opacity-70">
                            <path
                              d="M0,120 C360,30 720,150 1080,85 C1260,55 1370,70 1440,40 L1440,160 L0,160 Z"
                              fill="url(#clBottomWaveGrad)"
                            />
                            <defs>
                              <linearGradient id="clBottomWaveGrad" x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor="#E0F2FE" stopOpacity="0.55" />
                                <stop offset="50%" stopColor="#BAE6FD" stopOpacity="0.65" />
                                <stop offset="100%" stopColor="#7DD3FC" stopOpacity="0.55" />
                              </linearGradient>
                            </defs>
                          </svg>
                        </div>

                        <div className="p-2 space-y-2 pb-24 md:px-6 md:pt-3 md:pb-24 md:space-y-3 relative z-10">
                          <div className="px-1 pb-1 pt-1 text-xs font-bold text-[#1ca3a6] uppercase tracking-wider md:hidden">
                            Entries: {approvedCustomers.length}
                          </div>

                          {/* ROW 1 — FOUR VIBRANT PASTEL KPI SUMMARY CARDS (DESKTOP ONLY >= 768px) */}
                          <div className="hidden md:grid grid-cols-4 gap-3.5">
                            {/* Card 1: Disbursed Amount (Blue Theme) */}
                            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#F0F7FF] via-[#E5F0FF] to-[#D6E8FF] border border-blue-300 px-3.5 lg:px-4 py-3 shadow-sm flex items-center gap-3 hover:shadow-md transition-all">
                              <svg viewBox="0 0 240 44" preserveAspectRatio="none" className="pointer-events-none absolute bottom-0 left-0 w-full h-6 opacity-50">
                                <path d="M0,26 C60,8 150,42 240,14 L240,44 L0,44 Z" fill="#93C5FD" />
                              </svg>
                              <div className="relative z-10 w-11 h-11 lg:w-12 lg:h-12 rounded-full bg-gradient-to-br from-[#3B82F6] to-[#1D4ED8] text-white flex items-center justify-center shadow-md shadow-blue-500/25 shrink-0">
                                <Handshake className="w-5 h-5 lg:w-6 lg:h-6" strokeWidth={2.2} />
                              </div>
                              <div className="relative z-10 flex-1 min-w-0 text-right lg:text-center">
                                <span className="text-[11px] lg:text-xs font-bold text-slate-700 block truncate">
                                  Disbursed Amount
                                </span>
                                <div className="text-lg lg:text-[21px] font-extrabold text-[#0052CC] tracking-tight leading-tight mt-0.5 truncate">
                                  ₹{summaryMetrics.totalDisbursed.toLocaleString('en-IN')}
                                </div>
                              </div>
                            </div>

                            {/* Card 2: Loan Amount (Green Theme with Money Bag $) */}
                            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#F0FDF4] via-[#E3FAE9] to-[#D1F7DD] border border-emerald-300 px-3.5 lg:px-4 py-3 shadow-sm flex items-center gap-3 hover:shadow-md transition-all">
                              <svg viewBox="0 0 240 44" preserveAspectRatio="none" className="pointer-events-none absolute bottom-0 left-0 w-full h-6 opacity-50">
                                <path d="M0,26 C70,6 155,40 240,16 L240,44 L0,44 Z" fill="#86EFAC" />
                              </svg>
                              <div className="relative z-10 w-11 h-11 lg:w-12 lg:h-12 rounded-full bg-gradient-to-br from-[#22C55E] to-[#15803D] text-white flex items-center justify-center shadow-md shadow-emerald-500/25 shrink-0">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5 lg:w-6 lg:h-6" fill="none">
                                  <path d="M8.5 6.5L7 4h10l-1.5 2.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                  <path d="M9 7h6c2.5 2 4 5.2 4 8.5C19 18.8 16.2 21 12 21s-7-2.2-7-5.5C5 12.2 6.5 9 9 7Z" fill="currentColor" fillOpacity="0.22" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                                  <path d="M12 10.5v6.5M13.8 12c0-.8-.8-1.3-1.8-1.3s-1.8.5-1.8 1.3c0 1.8 3.6.9 3.6 2.7 0 .8-.8 1.3-1.8 1.3s-1.8-.5-1.8-1.3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                                </svg>
                              </div>
                              <div className="relative z-10 flex-1 min-w-0 text-right lg:text-center">
                                <span className="text-[11px] lg:text-xs font-bold text-slate-700 block truncate">
                                  Loan Amount
                                </span>
                                <div className="text-lg lg:text-[21px] font-extrabold text-[#15803D] tracking-tight leading-tight mt-0.5 truncate">
                                  ₹{summaryMetrics.totalLoan.toLocaleString('en-IN')}
                                </div>
                              </div>
                            </div>

                            {/* Card 3: Collection (Warm Amber/Orange Theme) */}
                            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#FFFBEB] via-[#FEF3D5] to-[#FDE7B6] border border-amber-300 px-3.5 lg:px-4 py-3 shadow-sm flex items-center gap-3 hover:shadow-md transition-all">
                              <svg viewBox="0 0 240 44" preserveAspectRatio="none" className="pointer-events-none absolute bottom-0 left-0 w-full h-6 opacity-50">
                                <path d="M0,26 C65,10 155,40 240,14 L240,44 L0,44 Z" fill="#FCD34D" />
                              </svg>
                              <div className="relative z-10 w-11 h-11 lg:w-12 lg:h-12 rounded-full bg-gradient-to-br from-[#F59E0B] to-[#D97706] text-white flex items-center justify-center shadow-md shadow-amber-500/25 shrink-0">
                                <Coins className="w-5 h-5 lg:w-6 lg:h-6" strokeWidth={2.2} />
                              </div>
                              <div className="relative z-10 flex-1 min-w-0 text-right lg:text-center">
                                <span className="text-[11px] lg:text-xs font-bold text-slate-700 block truncate">
                                  Collection
                                </span>
                                <div className="text-lg lg:text-[21px] font-extrabold text-[#B45309] tracking-tight leading-tight mt-0.5 truncate">
                                  ₹{summaryMetrics.totalCollection.toLocaleString('en-IN')}
                                </div>
                              </div>
                            </div>

                            {/* Card 4: Outstanding (Purple Theme) */}
                            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#FAF5FF] via-[#F2E7FF] to-[#E6D1FF] border border-purple-300 px-3.5 lg:px-4 py-3 shadow-sm flex items-center gap-3 hover:shadow-md transition-all">
                              <svg viewBox="0 0 240 44" preserveAspectRatio="none" className="pointer-events-none absolute bottom-0 left-0 w-full h-6 opacity-50">
                                <path d="M0,26 C65,10 155,40 240,14 L240,44 L0,44 Z" fill="#D8B4FE" />
                              </svg>
                              <div className="relative z-10 w-11 h-11 lg:w-12 lg:h-12 rounded-full bg-gradient-to-br from-[#9333EA] to-[#6B21A8] text-white flex items-center justify-center shadow-md shadow-purple-500/25 shrink-0">
                                <TrendingUp className="w-5 h-5 lg:w-6 lg:h-6" strokeWidth={2.3} />
                              </div>
                              <div className="relative z-10 flex-1 min-w-0 text-right lg:text-center">
                                <span className="text-[11px] lg:text-xs font-bold text-slate-700 block truncate">
                                  Outstanding
                                </span>
                                <div className="text-lg lg:text-[21px] font-extrabold text-[#6B21A8] tracking-tight leading-tight mt-0.5 truncate">
                                  ₹{summaryMetrics.totalOutstanding.toLocaleString('en-IN')}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* DESKTOP TABLE VIEW (DESKTOP ONLY >= 768px) */}
                          <div className="hidden md:block space-y-3">
                            {/* ROW 2 — STRICT LEFT-TO-RIGHT ORDER: Entries -> Search Customer... -> Filter ▾ -> OD Amount */}
                            <div className="flex items-center gap-3 w-full" data-testid="customer-row2-bar">
                              {/* 1. Far Left: High-Contrast Distinct Entries: <count> Pill Badge */}
                              <div className="bg-gradient-to-r from-[#312E81] to-[#4338CA] text-white border border-indigo-800/80 rounded-2xl px-4 h-[46px] flex items-center gap-2 shrink-0 shadow-md shadow-indigo-900/20" data-testid="customer-entries-pill">
                                <Users className="w-4 h-4 text-indigo-200 shrink-0" />
                                <span className="text-sm font-extrabold tracking-wide text-white whitespace-nowrap">
                                  Entries: {approvedCustomers.length}
                                </span>
                              </div>

                              {/* 2. Second: Search Customer... Input Bar */}
                              <div className="relative flex-1 min-w-0">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500 pointer-events-none" />
                                <input
                                  type="text"
                                  placeholder="Search Customer..."
                                  value={searchQuery}
                                  onChange={(e) => setSearchQuery(e.target.value)}
                                  className="w-full h-[46px] pl-10 pr-4 bg-white border border-blue-300 rounded-2xl text-sm font-semibold text-slate-800 placeholder:text-slate-400 shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                                />
                              </div>

                              {/* 3. Third: Filter ▾ Dropdown Button */}
                              <button
                                type="button"
                                onClick={openFilter}
                                className={`h-[46px] px-4 rounded-2xl border shadow-sm flex items-center gap-2 shrink-0 cursor-pointer transition-all active:scale-[0.98] ${
                                  activeCategory !== 'All' || activeSort !== 'Recent'
                                    ? 'bg-blue-50 border-blue-300 text-[#0052B4]'
                                    : 'bg-white border-slate-200 text-[#0F172A] hover:bg-slate-50'
                                }`}
                              >
                                <Filter className="w-4 h-4 fill-current shrink-0" />
                                <span className="text-sm font-bold whitespace-nowrap">Filter</span>
                                <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
                              </button>

                              {/* 4. Far Right: OD Amount Highlight Card (Interactive Overdue Filter Toggle) */}
                              <button
                                type="button"
                                onClick={() => setIsOdFilterActive(!isOdFilterActive)}
                                title={isOdFilterActive ? 'Click to show all customers' : 'Click to filter overdue customers'}
                                className={`bg-rose-50 border border-rose-200 rounded-2xl px-4 h-[46px] min-w-[175px] flex items-center gap-3 shrink-0 shadow-2xs hover:shadow-md transition-all cursor-pointer text-left ${
                                  isOdFilterActive ? 'ring-2 ring-rose-400 border-rose-400 scale-[1.01]' : 'hover:border-rose-300'
                                }`}
                              >
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#EF4444] to-[#DC2626] text-white flex items-center justify-center shadow-sm shrink-0">
                                  <Clock className="w-4 h-4" strokeWidth={2.5} />
                                </div>
                                <div className="flex flex-col justify-center leading-tight">
                                  <span className="text-[11px] font-bold text-rose-700 whitespace-nowrap">
                                    {isOdFilterActive ? 'OD Filter Active' : 'OD Amount'}
                                  </span>
                                  <span className="text-[15px] font-extrabold text-[#DC2626] whitespace-nowrap">
                                    ₹{summaryMetrics.totalOverdue.toLocaleString('en-IN')}
                                  </span>
                                </div>
                              </button>
                            </div>

                            {isOdFilterActive && (
                              <div className="flex justify-end">
                                <button
                                  type="button"
                                  onClick={() => setIsOdFilterActive(false)}
                                  className="text-xs font-bold px-3.5 py-1 bg-white border border-rose-200 text-rose-600 rounded-full hover:bg-rose-50 shadow-2xs transition-colors cursor-pointer"
                                >
                                  Reset / Back to Full List
                                </button>
                              </div>
                            )}

                            {/* 4. ROYAL BLUE CUSTOMER TABLE (DESKTOP VIEW >= 768px) */}
                            <div className="bg-white border border-blue-200/80 rounded-2xl shadow-md shadow-blue-900/5 mb-4 overflow-x-auto">
                              <table className="w-full text-left border-collapse">
                                <thead>
                                  {isOdFilterActive ? (
                                    <tr className="bg-gradient-to-r from-[#881337] to-[#BE123C] text-white text-[13px] font-bold tracking-wide">
                                      <th className="py-3.5 px-4 font-bold">Customer</th>
                                      <th className="py-3.5 px-4 font-bold border-l border-white/15">{isMainBranchView ? 'Branch' : 'Last Paid'}</th>
                                      <th className="py-3.5 px-4 font-bold border-l border-white/15 text-center">Pending Dues</th>
                                      <th className="py-3.5 px-4 font-bold border-l border-white/15 text-right">Loan Amount</th>
                                      <th className="py-3.5 px-4 font-bold border-l border-white/15 text-right">Paid</th>
                                      <th className="py-3.5 px-4 font-bold border-l border-white/15 text-right">Outstanding</th>
                                      <th className="py-3.5 px-4 font-bold border-l border-white/15 text-right">OD Amount</th>
                                    </tr>
                                  ) : (
                                    <tr className="bg-gradient-to-r from-[#00337C] to-[#0052B4] text-white text-[13px] font-bold tracking-wide">
                                      <th className="py-3.5 px-4 font-bold">Customer</th>
                                      <th className="py-3.5 px-4 font-bold border-l border-white/15 text-center">{isMainBranchView ? 'Branch' : 'Loan Date'}</th>
                                      <th className="py-3 px-3 font-bold border-l border-white/15 text-center">
                                        <button
                                          ref={customerStaffTriggerRef}
                                          type="button"
                                          onClick={() => {
                                            setShowCustomerStatusPopover(false);
                                            if (!showCustomerStaffPopover && customerStaffTriggerRef.current) {
                                              const rect = customerStaffTriggerRef.current.getBoundingClientRect();
                                              const half = 128;
                                              const clampedLeft = Math.max(half + 12, Math.min(window.innerWidth - half - 12, rect.left + rect.width / 2));
                                              setCustomerStaffPopoverCoords({ top: rect.bottom + 8, left: clampedLeft });
                                            }
                                            setShowCustomerStaffPopover((prev) => !prev);
                                          }}
                                          className={`inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-lg transition-all cursor-pointer select-none ${
                                            isCustomerStaffFiltered || showCustomerStaffPopover
                                              ? 'bg-white/25 text-white ring-1 ring-white/50'
                                              : 'hover:bg-white/15 text-white'
                                          }`}
                                          title="Filter by Assigned Staff"
                                        >
                                          <span>Assigned Staff</span>
                                          {isCustomerStaffFiltered && (
                                            <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full bg-white text-[#00337C] text-[10px] font-extrabold leading-none">
                                              ({activeCustomerStaffCount})
                                            </span>
                                          )}
                                          <ChevronDown className={`w-3.5 h-3.5 text-blue-100 shrink-0 transition-transform duration-150 ${showCustomerStaffPopover ? 'rotate-180' : ''}`} />
                                        </button>
                                      </th>
                                      <th className="py-3.5 px-4 font-bold border-l border-white/15 text-center">Loan Type</th>
                                      <th className="py-3.5 px-4 font-bold border-l border-white/15 text-right">Loan Amount</th>
                                      <th className="py-3.5 px-4 font-bold border-l border-white/15 text-right">Outstanding</th>
                                      <th className="py-3 px-3 font-bold border-l border-white/15 text-center">
                                        <button
                                          ref={customerStatusTriggerRef}
                                          type="button"
                                          onClick={() => {
                                            setShowCustomerStaffPopover(false);
                                            if (!showCustomerStatusPopover && customerStatusTriggerRef.current) {
                                              const rect = customerStatusTriggerRef.current.getBoundingClientRect();
                                              const half = 112;
                                              const clampedLeft = Math.max(half + 12, Math.min(window.innerWidth - half - 12, rect.left + rect.width / 2));
                                              setCustomerStatusPopoverCoords({ top: rect.bottom + 8, left: clampedLeft });
                                            }
                                            setShowCustomerStatusPopover((prev) => !prev);
                                          }}
                                          className={`inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-lg transition-all cursor-pointer select-none ${
                                            isCustomerStatusFiltered || showCustomerStatusPopover
                                              ? 'bg-white/25 text-white ring-1 ring-white/50'
                                              : 'hover:bg-white/15 text-white'
                                          }`}
                                          title="Filter by Status"
                                        >
                                          <span>Status</span>
                                          {isCustomerStatusFiltered && (
                                            <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full bg-white text-[#00337C] text-[10px] font-extrabold leading-none">
                                              ({selectedCustomerStatusFilters.size})
                                            </span>
                                          )}
                                          <ChevronDown className={`w-3.5 h-3.5 text-blue-100 shrink-0 transition-transform duration-150 ${showCustomerStatusPopover ? 'rotate-180' : ''}`} />
                                        </button>
                                      </th>
                                    </tr>
                                  )}
                                </thead>
                                <tbody className="divide-y divide-slate-200/90">
                                  {approvedCustomers.length === 0 ? (
                                    <tr>
                                      <td colSpan="7" className="p-8 text-center text-slate-500 font-medium">
                                        {isOdFilterActive ? 'No customers currently have overdue payments.' : 'No customers match your search or filter criteria'}
                                      </td>
                                    </tr>
                                  ) : (
                                    approvedCustomers.map(customer => (
                                      <tr 
                                        key={`desktop-${customer.id}`} 
                                        onClick={() => { if (!isMainBranchView) { setSelectedCustomer(customer); navigateToView('Customer Detail'); } }}
                                        className={`hover:bg-blue-50/40 transition-colors ${!isMainBranchView ? 'cursor-pointer' : ''}`}
                                      >
                                        <td className="py-3 px-4 flex items-center gap-3">
                                          <div className="w-9 h-9 rounded-full bg-gradient-to-b from-blue-100 to-blue-200 text-[#0052B4] overflow-hidden flex-shrink-0 border border-blue-200 flex items-center justify-center shadow-2xs">
                                            {customer.image ? (
                                              <OfflineImage src={customer.image} alt="Profile" className="w-full h-full object-cover" />
                                            ) : (
                                              <User className="w-5 h-5" strokeWidth={2.2} />
                                            )}
                                          </div>
                                          <div className="min-w-0 pr-2">
                                            <h4 className="font-bold text-[#0F172A] text-sm leading-tight truncate">{formatName(customer.name)}</h4>
                                            {(customer.created_at || customer.createdAt || customer.timestamp || customer.date || customer.lastUpdated) && (
                                              <p className="text-[11px] font-medium text-slate-400 mt-0.5 truncate">
                                                {timeAgo(
                                                  customer.date || customer.createdAt || customer.created_at || customer.timestamp || customer.lastUpdated,
                                                  customer.created_at || customer.createdAt || customer.timestamp || customer.lastUpdated
                                                )}
                                              </p>
                                            )}
                                          </div>
                                        </td>
                                        
                                        {isOdFilterActive ? (
                                          <>
                                            <td className="py-3 px-4 border-l border-rose-100 text-sm font-semibold text-slate-700 whitespace-nowrap bg-rose-50/10">
                                              {isMainBranchView ? (
                                                customer.branch || customer.branchName || 'Main Branch'
                                              ) : (
                                                <span>
                                                  {(() => {
                                                    const validInsts = (customer.installments || []).filter(i => i?.status !== 'BOUNCED' && i?.date);
                                                    if (validInsts.length === 0) return 'No Payments';
                                                    validInsts.sort((a, b) => {
                                                      const timeA = parseGlobalDate(a.date).getTime();
                                                      const timeB = parseGlobalDate(b.date).getTime();
                                                      return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
                                                    });
                                                    return formatDate(validInsts[0]?.date);
                                                  })()}
                                                </span>
                                              )}
                                            </td>
                                            <td className="py-3 px-4 border-l border-rose-100 text-sm font-bold text-slate-700 text-center whitespace-nowrap bg-rose-50/10">
                                              {customer.dynamicPendingDues > 0 ? (
                                                <span className="px-2.5 py-0.5 bg-rose-100 text-rose-700 rounded-full text-xs font-bold">
                                                  {customer.dynamicPendingDues} Due{customer.dynamicPendingDues > 1 ? 's' : ''}
                                                </span>
                                              ) : (
                                                <span className="text-slate-400">-</span>
                                              )}
                                            </td>
                                            <td className="py-3 px-4 border-l border-rose-100 text-sm font-bold text-blue-600 whitespace-nowrap text-right bg-rose-50/10">
                                              ₹{(Number(customer.loanAmount) || 0).toLocaleString('en-IN')}
                                            </td>
                                            <td className="py-3 px-4 border-l border-rose-100 text-sm font-bold text-emerald-600 whitespace-nowrap text-right bg-rose-50/10">
                                              ₹{(customer.dynamicTotalPaid || 0).toLocaleString('en-IN')}
                                            </td>
                                            <td className="py-3 px-4 border-l border-rose-100 text-sm font-bold text-amber-600 whitespace-nowrap text-right bg-rose-50/10">
                                              ₹{customer.dynamicOutstanding !== undefined ? customer.dynamicOutstanding.toLocaleString('en-IN') : (customer.repayAmount?.toLocaleString('en-IN') || '0')}
                                            </td>
                                            <td className="py-3 px-4 border-l border-rose-100 text-sm font-bold text-rose-600 whitespace-nowrap text-right bg-rose-50/30">
                                              ₹{(customer.dynamicOverdue || 0).toLocaleString('en-IN')}
                                            </td>
                                          </>
                                        ) : (
                                          <>
                                            <td className="py-3 px-4 border-l border-slate-100 text-sm font-semibold text-slate-700 whitespace-nowrap text-center">
                                              {isMainBranchView ? (
                                                customer.branch || customer.branchName || 'Main Branch'
                                              ) : (
                                                <span>{formatDate(customer.disbursedAt || customer.loanApprovedDate || customer.approvalDate || customer.loanDate || customer.date || customer.createdAt)}</span>
                                              )}
                                            </td>
                                            <td className="py-3 px-4 border-l border-slate-100 text-sm font-semibold text-slate-700 whitespace-nowrap text-center">
                                              {customer.assignedStaff || customer.staffName || customer.staff || '--'}
                                            </td>
                                            <td className="py-3 px-4 border-l border-slate-100 whitespace-nowrap text-center">
                                              <span className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 capitalize">
                                                {customer.loanType || customer.category || customer.type || 'N/A'}
                                              </span>
                                            </td>
                                            <td className="py-3 px-4 border-l border-slate-100 text-sm font-bold text-blue-600 whitespace-nowrap text-right">
                                              ₹{(Number(customer.loanAmount) || 0).toLocaleString('en-IN')}
                                            </td>
                                            <td className="py-3 px-4 border-l border-slate-100 text-sm font-bold text-red-600 whitespace-nowrap text-right">
                                              ₹{customer.dynamicOutstanding !== undefined ? customer.dynamicOutstanding.toLocaleString('en-IN') : (customer.repayAmount?.toLocaleString('en-IN') || '0')}
                                            </td>
                                            <td className="py-3 px-4 border-l border-slate-100 whitespace-nowrap text-center">
                                              {(() => {
                                                const out = customer.dynamicOutstanding !== undefined ? customer.dynamicOutstanding : (customer.repayAmount || 0);
                                                const od = customer.dynamicOverdue || 0;
                                                const pending = customer.dynamicPendingDues || 0;
                                                if (out <= 0) {
                                                  return (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 uppercase tracking-wide">
                                                      <span className="w-2 h-2 rounded-full bg-slate-500 shrink-0" />
                                                      SETTLED
                                                    </span>
                                                  );
                                                } else if (od > 0 || pending > 0) {
                                                  return (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 uppercase tracking-wide">
                                                      <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                                                      OVERDUE
                                                    </span>
                                                  );
                                                } else {
                                                  return (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 uppercase tracking-wide">
                                                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                                                      LIVE
                                                    </span>
                                                  );
                                                }
                                              })()}
                                            </td>
                                          </>
                                        )}
                                      </tr>
                                    ))
                                  )}
                                </tbody>
                              </table>
                            </div>

                            {/* DESKTOP-ONLY: Assigned Staff Multi-Select Checkbox Filter Popover (z-[80]) */}
                            {showCustomerStaffPopover && (
                              <div
                                ref={customerStaffPopoverRef}
                                data-testid="customer-staff-popover"
                                style={{
                                  position: 'fixed',
                                  top: `${customerStaffPopoverCoords.top}px`,
                                  left: `${customerStaffPopoverCoords.left}px`,
                                  transform: 'translateX(-50%)'
                                }}
                                className="hidden md:block w-64 bg-white rounded-2xl shadow-2xl border border-slate-200/95 py-2 z-[80] text-left font-normal text-slate-700 animate-in fade-in slide-in-from-top-1 duration-150"
                              >
                                <div className="px-3.5 py-2 border-b border-slate-100 flex items-center justify-between gap-2">
                                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Assigned Staff</span>
                                  <div className="flex items-center gap-2 text-[11px] font-bold">
                                    <button
                                      type="button"
                                      onClick={() => setSelectedCustomerStaffFilters(new Set(customerStaffOptions.map((o) => o.key)))}
                                      className="text-blue-600 hover:text-blue-800 cursor-pointer"
                                    >
                                      Select All
                                    </button>
                                    <span className="text-slate-300">|</span>
                                    <button
                                      type="button"
                                      onClick={() => setSelectedCustomerStaffFilters(new Set())}
                                      className="text-slate-500 hover:text-rose-600 cursor-pointer"
                                    >
                                      Clear
                                    </button>
                                  </div>
                                </div>
                                <div className="max-h-60 overflow-y-auto divide-y divide-slate-50">
                                  {customerStaffOptions.length > 0 ? (
                                    customerStaffOptions.map((opt) => {
                                      const isChecked = selectedCustomerStaffFilters.has(opt.key);
                                      return (
                                        <label
                                          key={opt.key}
                                          className={`flex items-center gap-2.5 px-3.5 py-2 text-xs cursor-pointer select-none transition-colors hover:bg-blue-50/60 ${
                                            isChecked ? 'bg-blue-50/35 font-bold text-slate-900' : 'text-slate-700 font-medium'
                                          }`}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() => {
                                              setSelectedCustomerStaffFilters((prev) => {
                                                const next = new Set(prev);
                                                if (next.has(opt.key)) next.delete(opt.key);
                                                else next.add(opt.key);
                                                return next;
                                              });
                                            }}
                                            className="w-4 h-4 rounded border-slate-300 text-blue-600 accent-[#0052B4] cursor-pointer shrink-0"
                                          />
                                          <span className="truncate">{opt.name}</span>
                                        </label>
                                      );
                                    })
                                  ) : (
                                    <div className="px-3.5 py-3 text-[11px] text-slate-400 italic text-center">No staff found</div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* DESKTOP-ONLY: Status Multi-Select Checkbox Filter Popover (z-[80]) */}
                            {showCustomerStatusPopover && (
                              <div
                                ref={customerStatusPopoverRef}
                                data-testid="customer-status-popover"
                                style={{
                                  position: 'fixed',
                                  top: `${customerStatusPopoverCoords.top}px`,
                                  left: `${customerStatusPopoverCoords.left}px`,
                                  transform: 'translateX(-50%)'
                                }}
                                className="hidden md:block w-56 bg-white rounded-2xl shadow-2xl border border-slate-200/95 py-2 z-[80] text-left font-normal text-slate-700 animate-in fade-in slide-in-from-top-1 duration-150"
                              >
                                <div className="px-3.5 py-2 border-b border-slate-100 flex items-center justify-between gap-2">
                                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Status</span>
                                  <div className="flex items-center gap-2 text-[11px] font-bold">
                                    <button
                                      type="button"
                                      onClick={() => setSelectedCustomerStatusFilters(new Set(CUSTOMER_STATUS_OPTIONS))}
                                      className="text-blue-600 hover:text-blue-800 cursor-pointer"
                                    >
                                      Select All
                                    </button>
                                    <span className="text-slate-300">|</span>
                                    <button
                                      type="button"
                                      onClick={() => setSelectedCustomerStatusFilters(new Set())}
                                      className="text-slate-500 hover:text-rose-600 cursor-pointer"
                                    >
                                      Clear
                                    </button>
                                  </div>
                                </div>
                                <div className="divide-y divide-slate-50">
                                  {CUSTOMER_STATUS_OPTIONS.map((statusKey) => {
                                    const isChecked = selectedCustomerStatusFilters.has(statusKey);
                                    const dotColor = statusKey === 'LIVE' ? 'bg-emerald-500' : statusKey === 'OVERDUE' ? 'bg-amber-500' : 'bg-slate-500';
                                    return (
                                      <label
                                        key={statusKey}
                                        className={`flex items-center gap-2.5 px-3.5 py-2.5 text-xs cursor-pointer select-none transition-colors hover:bg-blue-50/60 ${
                                          isChecked ? 'bg-blue-50/35 font-bold text-slate-900' : 'text-slate-700 font-medium'
                                        }`}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          onChange={() => {
                                            setSelectedCustomerStatusFilters((prev) => {
                                              const next = new Set(prev);
                                              if (next.has(statusKey)) next.delete(statusKey);
                                              else next.add(statusKey);
                                              return next;
                                            });
                                          }}
                                          className="w-4 h-4 rounded border-slate-300 text-blue-600 accent-[#0052B4] cursor-pointer shrink-0"
                                        />
                                        <span className={`w-2 h-2 rounded-full ${dotColor} shrink-0`} />
                                        <span>{statusKey}</span>
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {/* STANDARD CARD VIEW (MOBILE ONLY < 768px) - 100% Untouched */}
                          <div className="md:hidden space-y-2">
                          {approvedCustomers.length === 0 ? (
                            <div className="p-8 text-center text-slate-500 bg-white border border-slate-200 rounded-lg shadow-sm">
                              {isOdFilterActive ? 'No customers currently have overdue payments.' : 'No customers match your search or filter criteria'}
                            </div>
                          ) : (
                            approvedCustomers.map(customer => (
                              <div key={`mobile-${customer.id}`} onClick={() => { if (!isMainBranchView) { setSelectedCustomer(customer); navigateToView('Customer Detail'); } }} className={`bg-white border border-slate-200 p-2.5 rounded-lg shadow-sm flex justify-between items-center hover:bg-slate-50 transition-colors relative interactive-card ${!isMainBranchView ? 'cursor-pointer' : 'cursor-default'}`}>
                                <div className="flex-1 min-w-0 flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden flex-shrink-0 border border-slate-300">
                                    <OfflineImage src={customer.image || defaultAvatar} alt="Profile" className="w-full h-full object-cover" />
                                  </div>
                                  <div className="min-w-0 pr-2">
                                    <h4 className="font-bold text-slate-800 text-sm leading-tight truncate">{formatName(customer.name)}</h4>
                                    <p className="text-[11px] font-medium text-slate-500 mt-0.5 truncate">{timeAgo(customer.date, customer.lastUpdated)}</p>
                                  </div>
                                </div>
                                
                                {/* Dynamic Right Column */}
                                <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
                                  <div className="flex items-center justify-end">
                                    <div className="w-[72px] text-right text-sm font-semibold text-emerald-600">
                                      ₹{(Number(customer.loanAmount) || 0).toLocaleString('en-IN')}
                                    </div>
                                    <div className="w-[16px] flex justify-center items-center">
                                      <div className="w-[2px] h-6 bg-gray-900 rounded-full flex-shrink-0"></div>
                                    </div>
                                    {(() => {
                                      const outAmount = customer.dynamicOutstanding !== undefined ? customer.dynamicOutstanding : (customer.repayAmount || 0);
                                      if (outAmount <= 0 || customer.status === 'SETTLED' || customer.status === 'CLOSED') {
                                        return (
                                          <div className="w-[72px] flex justify-start items-center">
                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 tracking-wider">
                                              SETTLED
                                            </span>
                                          </div>
                                        );
                                      } else {
                                        return (
                                          <div className="w-[72px] text-left text-sm font-semibold text-rose-600">
                                            ₹{outAmount.toLocaleString('en-IN')}
                                          </div>
                                        );
                                      }
                                    })()}
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </main>
              </>
            )}
            {!(activeBranch?.id === 'main' || activeBranch?.name === 'Main Branch') && !isAddCustomerOpen && !isFilterOpen && (
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
      <LiveTrackingDaemon userProfile={userProfile} />
      {userProfile?.role === 'customer' ? (
          <CustomerDashboard userProfile={userProfile} customers={customers} />
        ) : (
          <div className="w-full h-full flex flex-col relative overflow-hidden">
            {currentView !== 'EMI Calculator' && currentView !== 'Customer Detail' && currentView !== 'Expenses' && currentView !== 'Expansion' && currentView !== 'Cash Book' && (
            <Header 
              currentView={currentView} 
              setCurrentView={switchTab}
              branches={branches}
              activeBranch={activeBranch}
              onBranchChange={handleBranchSwitch}
              onAddBranch={() => setIsAddBranchModalOpen(true)}
              onEditBranch={(targetBranch) => {
                if (targetBranch && targetBranch.id) setActiveBranch(targetBranch);
                setIsEditBranchModalOpen(true);
              }}
              userProfile={userProfile}
              isCollectionReportOpen={isCollectionReportOpen}
            />
          )}
          <div className="flex-1 flex flex-col md:flex-row w-full overflow-hidden relative">
            {currentView !== 'Expenses' && currentView !== 'Expansion' && currentView !== 'Cash Book' && (
              <DesktopSidebar 
                currentView={currentView} 
                setCurrentView={switchTab}
                isCollectionReportOpen={isCollectionReportOpen}
                branches={branches}
                activeBranch={activeBranch}
                onBranchChange={handleBranchSwitch}
                onAddBranch={() => setIsAddBranchModalOpen(true)}
                onEditBranch={(targetBranch) => {
                  if (targetBranch && targetBranch.id) setActiveBranch(targetBranch);
                  setIsEditBranchModalOpen(true);
                }}
                userProfile={userProfile}
              />
            )}
            <div className={`flex-1 w-full h-full flex flex-col relative bg-[#f8fafc] ${(currentView === 'Expenses' || currentView === 'Expansion' || currentView === 'Cash Book') ? 'max-w-none mx-0' : 'max-w-4xl mx-auto md:max-w-none md:mx-0'} overflow-hidden`}>
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
                            { name: 'Active', icon: Activity, color: 'text-emerald-500' },
                            { name: 'Settled', icon: CheckCircle2, color: 'text-slate-500' },
                            { name: 'Due Date', icon: CalendarClock, color: 'text-amber-500' },
                            { name: 'Upcoming', icon: TrendingUp, color: 'text-purple-500' },
                            { name: 'Custom', icon: CalendarDays, color: 'text-indigo-500' },
                            { name: 'Microfinance', icon: Banknote, color: 'text-teal-500' },
                            { name: 'Personal Loan', icon: User, color: 'text-rose-500' },
                            { name: 'Agri Loan', icon: Sprout, color: 'text-green-500' },
                            { name: 'Weekly Loan', icon: CalendarDays, color: 'text-orange-500' },
                            { name: 'Daily Loan', icon: CalendarDays, color: 'text-yellow-500' }
                          ].map(cat => {
                            const Icon = cat.icon;
                            const isActive = tempCategory === cat.name;
                            return (
                              <React.Fragment key={cat.name}>
                                <button 
                                  onClick={() => setTempCategory(cat.name)}
                                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all border ${isActive ? 'bg-brand-blue text-white border-brand-blue shadow-md shadow-blue-500/20' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
                                >
                                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : cat.color}`} />
                                  {cat.name}
                                </button>
                                {cat.name === 'Custom' && isActive && (
                                  <div className="flex items-center">
                                    <input 
                                      type="date"
                                      value={tempCustomDate || ''}
                                      onChange={(e) => setTempCustomDate(e.target.value)}
                                      className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
                                    />
                                  </div>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </div>
                      </div>

                      {(activeBranch?.id === 'main' || activeBranch?.name === 'Main Branch') && (
                        <div className="mb-6">
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">BRANCH-WISE FILTER</h4>
                          <select 
                            value={tempBranchFilter}
                            onChange={(e) => setTempBranchFilter(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue font-semibold appearance-none"
                            style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\\\'http://www.w3.org/2000/svg\\\' fill=\\\'none\\\' viewBox=\\\'0 0 24 24\\\' stroke=\\\'%2364748b\\\'%3E%3Cpath stroke-linecap=\\\'round\\\' stroke-linejoin=\\\'round\\\' stroke-width=\\\'2\\\' d=\\\'M19 9l-7 7-7-7\\\'%3E%3C/path%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1.2em' }}
                          >
                            <option value="All">All Branches</option>
                            {branches.filter(b => isBranchActive(b) && b.id !== 'main').map(b => (
                              <option key={b.id} value={b.name}>{b.name}</option>
                            ))}
                          </select>
                        </div>
                      )}

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
                  isStaff={userProfile?.role === 'staff' && String(userProfile?.permissions?.applicationStatusRole || '').toLowerCase() !== 'admin'}
                  onAddCustomer={async (newCustomer) => {
                    const nowIso = new Date().toISOString();
                    const customerToSave = { 
                      ...newCustomer, 
                      createdAt: newCustomer.createdAt || nowIso,
                      created_at: newCustomer.created_at || newCustomer.createdAt || nowIso,
                      lastUpdated: nowIso,
                      staffName: newCustomer.staffName || newCustomer.assignedStaff || userProfile?.name || userProfile?.staffName || userProfile?.displayName || (userProfile?.email ? userProfile.email.split('@')[0] : ''),
                      staffId: newCustomer.staffId || userProfile?.staffId || userProfile?.employeeId || '',
                      assignedStaff: newCustomer.assignedStaff || userProfile?.name || userProfile?.staffName || userProfile?.displayName || (userProfile?.email ? userProfile.email.split('@')[0] : ''),
                      staffDesignation: newCustomer.staffDesignation || userProfile?.designation || userProfile?.jobRole || userProfile?.subRole || userProfile?.title || 'Collection Agent',
                      staffContact: newCustomer.staffContact || userProfile?.phone || userProfile?.contactNumber || userProfile?.mobileNumber || ''
                    };
                    try {
                      const { collection, addDoc, setDoc, doc } = await import('firebase/firestore');
                      
                      if (customerToSave.docId) {
                        // Edit existing customer
                        await setDoc(doc(db, 'customers', customerToSave.docId), customerToSave);
                      } else {
                        // Fresh customer - let Firestore generate a unique document ID
                        customerToSave.customerId = customerToSave.id; 
                        customerToSave.applicationNumber = customerToSave.id;
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

              {/* Branch Switching Animated Everest FinTech Orbit & Pulse Loader Overlay */}
              {isSwitchingBranch && (
                <BranchSyncLoader branchName={activeBranch?.name} fullScreen={true} />
              )}

              {currentView !== 'Customer Detail' && !(currentView === 'Staff Management' && (activeBranch?.id === 'main' || activeBranch?.name === 'Main Branch')) && (
                    <div className="flex-shrink-0 z-40 relative md:hidden">
                      <Footer currentView={currentView} setCurrentView={switchTab} userProfile={userProfile} onDrillDown={handleDrillDown} />
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
