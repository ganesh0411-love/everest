import React, { useState, useEffect } from 'react';
import { db, secondaryAuth } from '../firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, where, updateDoc, getDocs } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { initializeApp, deleteApp } from 'firebase/app';
import { firebaseConfig } from '../firebase';
import { ArrowLeft, Search, MoreVertical, Home, Users, Plus, Radio, MapPin } from 'lucide-react';
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

const StaffManagement = ({ onBack, setCurrentView, activeBranch = { id: 'main', name: 'Main Branch' }, userProfile }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const isMainBranch = activeBranch?.id === 'main' || activeBranch?.name === 'Main Branch';
  
  // State for Add/Edit Form
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [showMapModal, setShowMapModal] = useState(false);
  const [selectedStaffLocation, setSelectedStaffLocation] = useState(null);
  const [mapLayer, setMapLayer] = useState('street'); // 'street' | 'satellite'
  const [adminLocation, setAdminLocation] = useState(null);

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;  
    const dLon = (lon2 - lon1) * Math.PI / 180; 
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    return (R * c).toFixed(1); 
  };

  useEffect(() => {
    if (showMapModal && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setAdminLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.log("Admin location not available", err),
        { enableHighAccuracy: true }
      );
    }
  }, [showMapModal]);

  useEffect(() => {
    const handleClickOutside = () => setActiveDropdown(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);


  const [staffList, setStaffList] = useState([]);
  const [isMigrating, setIsMigrating] = useState(false);

  const handleMigrateIds = async () => {
    if (!window.confirm("Are you sure you want to migrate all legacy Staff IDs to 7-digit numeric IDs?")) return;
    setIsMigrating(true);
    try {
      const staffRef = collection(db, 'staff');
      const snapshot = await getDocs(staffRef);
      let migratedCount = 0;
      
      const existingIds = new Set(snapshot.docs.map(d => d.data().id));

      for (const document of snapshot.docs) {
        const staffData = document.data();
        const currentId = staffData.id || '';
        
        // If it's not exactly a 7 digit number
        if (!/^\d{7}$/.test(currentId)) {
          let isUnique = false;
          let newId = '';
          while (!isUnique) {
            newId = Math.floor(1000000 + Math.random() * 9000000).toString();
            if (!existingIds.has(newId)) {
              isUnique = true;
              existingIds.add(newId);
            }
          }
          await updateDoc(doc(db, 'staff', document.id), { id: newId });
          migratedCount++;
        }
      }
      alert(`Migration complete. Successfully updated ${migratedCount} staff records.`);
      setSearchQuery('');
    } catch (err) {
      console.error("Migration error:", err);
      alert("Failed to migrate IDs: " + err.message);
    } finally {
      setIsMigrating(false);
    }
  };

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
        .map(doc => ({ docId: doc.id, ...doc.data() }))
        .filter(s => {
          if (s.status === 'Recycled') return false;
          if (activeBranch.id === 'main') return true;
          return s.branchId === activeBranch.id;
        });
      setStaffList(fetchedStaffList);

      // 2. Direct Sync in Staff Document Inspector: Normalise mismatches on load
      fetchedStaffList.forEach(s => {
        if (activeBranch.id !== 'main' && activeBranch.name) {
          const expectedName = activeBranch.name.trim();
          if (s.branch !== expectedName || s.branchName !== expectedName) {
            console.log(`Normalizing legacy staff ${s.name} to branch ${expectedName}`);
            import('firebase/firestore').then(({ updateDoc, doc }) => {
              updateDoc(doc(db, 'staff', s.docId), { 
                branch: expectedName, 
                branchName: expectedName, 
                updatedAt: new Date().toISOString() 
              }).catch(e => console.error("Staff norm failed:", e));
              
              if (s.uid) {
                updateDoc(doc(db, 'users', s.uid), { 
                  branch: expectedName, 
                  branchName: expectedName, 
                  updatedAt: new Date().toISOString() 
                }).catch(e => console.error("Users norm failed:", e));
              }
            });
          }
        }
      });
    }, (error) => {
      console.error("Error fetching staff:", error);
    });

    return () => unsubscribe();
  }, [activeBranch]);

  const handleOpenAddForm = () => {
    setEditingStaff(null);
    setShowAddForm(true);
  };

  const handleOpenEditForm = (staff) => {
    setEditingStaff(staff);
    setShowAddForm(true);
  };

  const handleFormSubmit = async (staffData) => {
    const isEdit = !!editingStaff;
    
    try {
      let uid = staffData.uid;

      // --- EXTRACTED LOGIC (RUNS FOR BOTH CREATE AND EDIT) ---
      const rawPhone = staffData.mobileNumber || staffData.phone || editingStaff?.mobileNumber || editingStaff?.phone || '';
      let cleanPhone = String(rawPhone).replace(/\D/g, '').slice(-10);

      if (!cleanPhone || cleanPhone.length !== 10) {
        alert("Please enter a valid 10-digit mobile number for staff login creation.");
        return;
      }

      const internalEmail = `${cleanPhone}@everestmicro.internal`;
      
      let authPassword = '';
      const rawPassword = staffData.password || staffData.authPassword || editingStaff?.authPassword || '';
      if (rawPassword && String(rawPassword).trim().length > 0) {
        authPassword = String(rawPassword).trim();
      } else if (staffData.dob) {
        const parts = staffData.dob.split(/[-/.]/);
        if (parts.length === 3) {
          if (parts[0].length === 4) {
            authPassword = `${parts[2]}${parts[1]}${parts[0]}`;
          } else {
            authPassword = `${parts[0]}${parts[1]}${parts[2]}`;
          }
        } else {
          authPassword = staffData.dob.replace(/\D/g, '');
        }
      } else {
        authPassword = cleanPhone; // ultimate fallback
      }

      if (authPassword.length < 6) {
        alert("Password / DOB must contain at least 6 characters.");
        return;
      }
      // --- END EXTRACTED LOGIC ---

      if (!isEdit) {

        console.log("=== CREATING STAFF AUTH ===");
        console.log("Clean Phone:", cleanPhone);
        console.log("Generated Email:", internalEmail);
        console.log("Password String Length:", authPassword.length);
        console.log("Password Value (Debug):", authPassword);

        try {
          const userCred = await createUserWithEmailAndPassword(secondaryAuth, internalEmail, authPassword);
          uid = userCred.user.uid;
          console.log('Firebase Auth user created successfully with UID:', uid);
          await secondaryAuth.signOut(); 
          const selectedBranchName = (activeBranch?.name || staffData.branch || '').trim();
          if (!selectedBranchName) {
            alert("Please select a valid branch before creating staff.");
            return;
          }
          await setDoc(doc(db, 'users', uid), {
            uid: uid,
            phone: cleanPhone,
            role: 'staff',
            branchId: activeBranch.id,
            branchName: selectedBranchName,
            branch: selectedBranchName,
            status: 'Active',
            permissions: staffData.permissions || {
              canDeleteCustomer: false,
              canEditLedger: true
            }
          });
          } catch (authError) {
            console.error('CRITICAL: Firebase Auth User Creation Failed:', authError);
            if (authError.code === 'auth/email-already-in-use') {
              console.log("Attempting to adopt purged Auth account...");
              try {
                const { signInWithEmailAndPassword } = await import('firebase/auth');
                const existingCred = await signInWithEmailAndPassword(secondaryAuth, internalEmail, authPassword);
                uid = existingCred.user.uid;
                console.log("Successfully adopted existing Firebase Auth user:", uid);
                await secondaryAuth.signOut();
                
                const selectedBranchName = (activeBranch?.name || staffData.branch || '').trim();
                await setDoc(doc(db, 'users', uid), {
                  uid: uid,
                  phone: cleanPhone,
                  role: 'staff',
                  branchId: activeBranch.id || '',
                  branchName: selectedBranchName,
                  branch: selectedBranchName,
                  status: 'Active',
                  permissions: staffData.permissions || {
                    canDeleteCustomer: false,
                    canEditLedger: true
                  }
                });
              } catch (adoptError) {
                console.warn("Adoption failed, performing account rotation to generate new Auth user...");
                try {
                    let rotationSuccess = false;
                    for (let i = 1; i <= 10; i++) {
                      try {
                        const newEmail = `${cleanPhone}_${i}@everestmicro.internal`;
                        const newCred = await createUserWithEmailAndPassword(secondaryAuth, newEmail, authPassword);
                        uid = newCred.user.uid;
                        console.log(`Successfully created rotated Firebase Auth user (${newEmail}):`, uid);
                        await secondaryAuth.signOut();
                        
                        // Also inject the rotated auth email into the staffPayload so it can be saved in Firestore
                        staffData.authEmail = newEmail;
                        
                        const selectedBranchName = (activeBranch?.name || staffData.branch || '').trim();
                        await setDoc(doc(db, 'users', uid), {
                          uid: uid,
                          phone: cleanPhone,
                          role: 'staff',
                          branchId: activeBranch.id || '',
                          branchName: selectedBranchName,
                          branch: selectedBranchName,
                          status: 'Active',
                          permissions: staffData.permissions || {
                            canDeleteCustomer: false,
                            canEditLedger: true
                          }
                        });
                        rotationSuccess = true;
                        break;
                      } catch (rotErr) {
                        if (rotErr.code !== 'auth/email-already-in-use') throw rotErr;
                      }
                    }
                    if (!rotationSuccess) throw new Error("Exceeded maximum account rotations (10). Please clean Firebase Console.");
                } catch (rotationError) {
                  console.error("Account rotation failed:", rotationError);
                  alert(`Failed to rotate account: ${rotationError.message}`);
                  return;
                }
              }
            } else {
              alert(`Failed to create login account in Firebase Auth: [${authError.code || 'ERROR'}] ${authError.message}`);
              return;
            }
          }
      }

      const selectedBranchName = (activeBranch?.name || staffData.branch || '').trim();
      if (!selectedBranchName) {
        alert("Please select a valid branch before creating staff.");
        return;
      }
      
      const staffPayload = {
        ...staffData,
        uid: uid, 
        branchId: activeBranch?.id,
        branchName: selectedBranchName,
        branch: selectedBranchName,
        phone: cleanPhone,
        mobileNumber: cleanPhone,
        authPassword: authPassword,
        createdAt: staffData.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // 1. Remove raw file objects that cannot be serialized directly into Firestore
      delete staffPayload.photoFile;

      // 2. Strict undefined-scrubbing across all payload keys
      Object.keys(staffPayload).forEach((key) => {
        if (staffPayload[key] === undefined) {
          delete staffPayload[key];
        }
      });
      
      if (isEdit) {
        const oldRawPhone = editingStaff.mobileNumber || editingStaff.phone || '';
        const oldCleanPhone = String(oldRawPhone).replace(/\D/g, '').slice(-10);
        const oldEmail = editingStaff.authEmail || `${oldCleanPhone}@everestmicro.internal`;

        let oldPassword = '';
        const oldRawPassword = editingStaff.password || editingStaff.authPassword || '';
        if (oldRawPassword && String(oldRawPassword).trim().length > 0) {
          oldPassword = String(oldRawPassword).trim();
        } else if (editingStaff.dob) {
          const parts = editingStaff.dob.split(/[-/.]/);
          if (parts.length === 3) {
            if (parts[0].length === 4) oldPassword = `${parts[2]}${parts[1]}${parts[0]}`;
            else oldPassword = `${parts[0]}${parts[1]}${parts[2]}`;
          } else {
            oldPassword = editingStaff.dob.replace(/\D/g, '');
          }
        } else {
          oldPassword = oldCleanPhone;
        }

        const credentialsChanged = (oldCleanPhone !== cleanPhone) || (oldPassword !== authPassword);

        if (credentialsChanged) {
          // Bump session version ONLY when credentials actually change
          staffPayload.sessionVersion = Date.now();
          staffPayload.credentialsVersion = Date.now();
          
          // FIRE INSTANT EVICTION TO CLIENTS BEFORE HEAVY AUTH WORK
          try {
            await updateDoc(doc(db, 'staff', isEdit ? staffData.docId : uid), {
              sessionVersion: staffPayload.sessionVersion,
              credentialsVersion: staffPayload.credentialsVersion
            });
          } catch (e) {
            console.warn("Early eviction broadcast failed, continuing with full sync:", e);
          }
          
          // --- START NEW AUTH SYNC LOGIC ---
          try {
            if (oldCleanPhone !== cleanPhone) {
              // PHONE NUMBER CHANGED: Provision new Auth identity
              console.log("Phone number changed. Provisioning new Auth identity...");
              const secApp = initializeApp(firebaseConfig, `PhoneSync_${Date.now()}`);
              const secAuth = getAuth(secApp);
              try {
                const newCred = await createUserWithEmailAndPassword(
                  secAuth, 
                  internalEmail, 
                  authPassword
                );
                staffPayload.uid = newCred.user.uid;
                
                // Also sync the users collection with new UID
                await setDoc(doc(db, 'users', newCred.user.uid), { 
                  uid: newCred.user.uid,
                  phone: cleanPhone,
                  mobileNumber: cleanPhone,
                  role: 'staff',
                  status: 'Active',
                  permissions: staffData.permissions || { canDeleteCustomer: false, canEditLedger: true },
                  updatedAt: new Date().toISOString()
                }, { merge: true });
              } catch (authErr) {
                if (authErr.code !== 'auth/email-already-in-use') {
                  console.error("Secondary Auth creation error:", authErr);
                  throw authErr;
                } else {
                  console.warn("Auth user already exists for this new phone number. Re-using existing Auth identity is generally unsafe unless manually cleared, but proceeding.");
                }
              } finally {
                await deleteApp(secApp);
              }
            } else if (oldPassword !== authPassword) {
              // ONLY PASSWORD CHANGED (Phone unchanged)
              const { signInWithEmailAndPassword, updatePassword } = await import('firebase/auth');
              
              const possibleOldPasswords = new Set([
                oldPassword,
                editingStaff.password,
                editingStaff.authPassword,
                oldCleanPhone
              ].filter(Boolean).map(p => String(p).trim()));

              if (editingStaff.dob) {
                const parts = editingStaff.dob.split(/[-/.]/);
                if (parts.length === 3) {
                  possibleOldPasswords.add(`${parts[0]}${parts[1]}${parts[2]}`);
                  possibleOldPasswords.add(`${parts[2]}${parts[1]}${parts[0]}`);
                }
                possibleOldPasswords.add(editingStaff.dob.replace(/\D/g, ''));
              }

              let signedIn = false;
              for (const p of possibleOldPasswords) {
                try {
                  await signInWithEmailAndPassword(secondaryAuth, oldEmail, p);
                  signedIn = true;
                  break;
                } catch (e) {
                  // Ignore and try next
                }
              }

              if (!signedIn) {
                console.warn("Unable to sync Firebase Auth password. Forcibly rotating account to enforce new password...");
                const secApp = initializeApp(firebaseConfig, `PasswordSync_${Date.now()}`);
                const secAuthLocal = getAuth(secApp);
                try {
                  let rotationSuccess = false;
                  for (let i = 1; i <= 10; i++) {
                    try {
                      const newEmail = `${cleanPhone}_${i}@everestmicro.internal`;
                      const newCred = await createUserWithEmailAndPassword(secAuthLocal, newEmail, authPassword);
                      staffPayload.uid = newCred.user.uid;
                      staffPayload.authEmail = newEmail;
                      
                      // Keep the existing docId so we update the same Firestore document, but its uid and authEmail will be updated!
                      // We should also ensure the `users` collection is updated with the new uid
                      await setDoc(doc(db, 'users', newCred.user.uid), {
                        uid: newCred.user.uid,
                        phone: cleanPhone,
                        mobileNumber: cleanPhone,
                        role: 'staff',
                        branchId: activeBranch?.id || '',
                        branchName: selectedBranchName || '',
                        branch: selectedBranchName || '',
                        status: 'Active',
                        permissions: staffData.permissions || { canDeleteCustomer: false, canEditLedger: true }
                      });
                      rotationSuccess = true;
                      break;
                    } catch (rotErr) {
                      if (rotErr.code !== 'auth/email-already-in-use') {
                        throw rotErr;
                      }
                    }
                  }
                  if (!rotationSuccess) {
                    throw new Error("Maximum deterministic rotation limit reached (10). Please delete and re-create this staff account.");
                  }
                } finally {
                  await deleteApp(secApp);
                }
              } else {
                await updatePassword(secondaryAuth.currentUser, authPassword);
                await secondaryAuth.signOut();
              }
            }
          } catch (err) {
            console.error("Auth sync failed inside edit", err);
            throw err;
          }
        }
      }
      
      // CRITICAL FIX: Use uid for new documents, docId for existing documents to prevent overwriting
      await setDoc(doc(db, 'staff', isEdit ? staffData.docId : uid), staffPayload);

      // ALSO sync the users collection to ensure updated permissions are loaded correctly on next login
      if (staffPayload.uid) {
        await setDoc(doc(db, 'users', staffPayload.uid), {
          permissions: staffPayload.permissions || { canDeleteCustomer: false, canEditLedger: true }
        }, { merge: true });
      }

      setShowAddForm(false);
      
    } catch (error) {
      console.error("Full Staff Creation Error:", error);
      alert(`Failed to save staff: [${error.code || 'ERROR'}] ${error.message}`);
    }
  };

  const handleDeleteStaff = async (staffId) => {
    if (!window.confirm("Do you want to soft-delete this staff member and invalidate all active sessions across all devices?")) {
      return;
    }

    try {
      const staff = staffList.find(s => s.id === staffId);
      const prevStatus = staff?.status || 'Active';
      // CRITICAL FIX: Use docId instead of staffId for Firestore operations
      await updateDoc(doc(db, 'staff', staff?.docId || staffId), {
        status: 'Recycled',
        previousStatus: prevStatus,
        sessionVersion: Date.now(), 
        deletedAt: new Date().toISOString()
      });
      setShowAddForm(false);
    } catch (error) {
      console.error("Error deleting staff:", error);
      alert("Failed to delete staff. Please try again.");
    }
  };

  const filteredStaff = staffList.filter(staff => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    const nameMatch = (staff.name || staff.staffName || '').toLowerCase().includes(q);
    const idMatch = (staff.staffId || staff.id || '').toLowerCase().includes(q);
    const designationMatch = (staff.designation || staff.role || '').toLowerCase().includes(q);
    const branchMatch = (staff.branch || staff.branchName || '').toLowerCase().includes(q);
    return nameMatch || idMatch || designationMatch || branchMatch;
  });

  const sortedStaff = [...filteredStaff].sort((a, b) => {
    const branchA = (a.branch || a.branchName || '').toLowerCase();
    const branchB = (b.branch || b.branchName || '').toLowerCase();
    return branchA.localeCompare(branchB);
  });

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden relative">
      
      {showAddForm && (
        <AddStaffForm 
          onBack={() => setShowAddForm(false)} 
          onSubmit={handleFormSubmit}
          onDelete={handleDeleteStaff}
          editingStaff={editingStaff}
          staffCount={staffList.length}
          canEditPermissions={userProfile?.role === 'admin' || userProfile?.permissions?.staffManagementRole === 'Admin'}
        />
      )}
      
      {/* STATIC TOP SECTION: Header & Action Bar */}
      <div className="shrink-0 flex flex-col z-20">
        
        {/* Curved Gradient Header (Mobile Only) */}
        <div className="md:hidden bg-gradient-to-br from-purple-500 to-blue-500 pb-12 pt-6 px-4 relative z-0">
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

        {/* Action Bar (Pulled up over the curve on mobile, flat on desktop) */}
        <div className="bg-white rounded-t-[2.5rem] md:rounded-none -mt-8 md:mt-0 pt-8 md:pt-4 px-5 md:px-6 pb-4 z-10 shadow-[0_4px_10px_rgba(0,0,0,0.03)] md:shadow-none md:border-b md:border-slate-200 relative">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-2.5 rounded-full border border-slate-200 bg-white text-[13px] sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 transition-shadow"
              />
            </div>
            
            {!isMainBranch && (
              <button 
                onClick={handleOpenAddForm}
                className="flex items-center gap-1 sm:gap-1.5 shrink-0 bg-purple-600 hover:bg-purple-700 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-full font-bold text-[12px] sm:text-sm shadow-sm transition-colors"
              >
                <Plus size={16} strokeWidth={2.5} />
                <span>Add Staff</span>
              </button>
            )}
          </div>

          {/* Desktop Table View and Mobile Cards below */}
          
          {searchQuery === 'MIGRATE_IDS' && (
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
              <div>
                <h3 className="text-amber-800 font-bold text-sm">Legacy ID Migration</h3>
                <p className="text-amber-700 text-xs mt-0.5">Convert all non-numeric IDs to 7-digit numeric IDs</p>
              </div>
              <button 
                onClick={handleMigrateIds}
                disabled={isMigrating}
                className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm transition-colors disabled:opacity-50"
              >
                {isMigrating ? 'Migrating...' : 'Run Migration'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* SCROLLABLE STAFF LIST AREA */}
      <div className="flex-1 overflow-y-auto px-5 pb-6 bg-white z-10">
        
        {/* Desktop Table View */}
        <div className="hidden md:block w-full overflow-x-auto mt-2 bg-white rounded-lg shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4 text-left">Name</th>
                <th className="py-3 px-4 text-left border-l border-slate-200">Branch</th>
                <th className="py-3 px-4 text-left border-l border-slate-200">ID</th>
                <th className="py-3 px-4 text-left border-l border-slate-200">Phone Number</th>
                <th className="py-3 px-4 text-left border-l border-slate-200">Designation</th>
                <th className="py-3 px-4 text-left border-l border-slate-200 text-center">Duty Tracking</th>
                {!isMainBranch && <th className="py-3 px-2 text-center border-l border-slate-200 w-12"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedStaff.map((staff, index) => (
                <tr key={index} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 overflow-hidden ${staff.photoBase64 ? 'bg-transparent' : staff.avatarColor || 'bg-slate-100'}`}>
                        {staff.photoBase64 ? (
                          <img src={staff.photoBase64} alt={staff.name || staff.staffName} className="w-full h-full object-cover" />
                        ) : (
                          <svg viewBox="0 0 36 36" fill="none" role="img" xmlns="http://www.w3.org/2000/svg" width="20" height="20">
                            <mask id={`mask__beam_desktop_${index}`} maskUnits="userSpaceOnUse" x="0" y="0" width="36" height="36"><rect width="36" height="36" rx="72" fill="#FFFFFF"></rect></mask>
                            <g mask={`url(#mask__beam_desktop_${index})`}>
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
                      <span className="font-bold text-slate-800 text-sm">{staff.name || staff.staffName}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-brand-blue font-bold border-l border-slate-200">
                    {staff.branch || staff.branchName || staff.branchId}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-800 font-bold border-l border-slate-200">
                    {staff.staffId || staff.id || staff.employeeId || staff.customId || staff.uid}
                  </td>
                  <td className="py-3 px-4 text-sm font-bold text-slate-600 border-l border-slate-200">
                    {staff.phone || staff.mobileNumber || staff.mobile || '--'}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-600 border-l border-slate-200">
                    {staff.designation || staff.role || staff.position || 'Staff'}
                  </td>
                  <td className="py-3 px-4 border-l border-slate-200">
                    <div className="flex items-center justify-center gap-3">
                      <button 
                        onClick={() => console.log('Live Tracking clicked')} 
                        title="Live Movement Tracking (Coming Soon)"
                        className="p-1.5 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:shadow-sm transition-all"
                      >
                        <Radio size={16} />
                      </button>
                      <button 
                        onClick={() => {
                          setSelectedStaffLocation({
                            name: staff.name,
                            lat: staff.lastLatitude,
                            lng: staff.lastLongitude,
                            updatedAt: staff.lastLocationUpdatedAt
                          });
                          setShowMapModal(true);
                        }}
                        title="View Current Location"
                        className="p-1.5 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:shadow-sm transition-all"
                      >
                        <MapPin size={16} />
                      </button>
                    </div>
                  </td>
                  {!isMainBranch && (
                    <td className="py-3 px-2 text-center border-l border-slate-200 relative">
                      <div className="inline-block text-left" onClick={(e) => e.stopPropagation()}>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveDropdown(activeDropdown === index ? null : index);
                          }}
                          className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors focus:outline-none"
                        >
                          <MoreVertical size={18} />
                        </button>
                        
                        {activeDropdown === index && (
                          <div className="absolute right-8 top-1/2 -translate-y-1/2 w-36 bg-white rounded-md shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] border border-slate-100 ring-1 ring-black ring-opacity-5 z-[100]">
                            <div className="py-1">
                              <button
                                onClick={() => {
                                  setActiveDropdown(null);
                                  handleOpenEditForm(staff);
                                }}
                                className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-brand-blue font-semibold transition-colors flex items-center gap-2"
                              >
                                Edit Staff
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden flex flex-col gap-3">
          {filteredStaff.map((staff, index) => (
            <div key={index} className="bg-white border border-slate-100 p-3 rounded-xl shadow-sm w-full">
              {/* 3-Column Mobile Layout */}
              <div className="flex items-center justify-between w-full">
                
                {/* Column 1: Profile & Name (Left) */}
                <div className="flex items-center gap-3 flex-[1.2] min-w-0">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 overflow-hidden ${staff.photoBase64 ? 'bg-transparent' : staff.avatarColor || 'bg-slate-100'}`}>
                    {staff.photoBase64 ? (
                      <img src={staff.photoBase64} alt={staff.name || staff.staffName} className="w-full h-full object-cover" />
                    ) : (
                      <svg viewBox="0 0 36 36" fill="none" role="img" xmlns="http://www.w3.org/2000/svg" width="24" height="24">
                        <mask id={`mask__beam_mobile_${index}`} maskUnits="userSpaceOnUse" x="0" y="0" width="36" height="36"><rect width="36" height="36" rx="72" fill="#FFFFFF"></rect></mask>
                        <g mask={`url(#mask__beam_mobile_${index})`}>
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
                  <div className="flex flex-col min-w-0 pr-2">
                    <span className="font-bold text-slate-800 text-sm truncate">{staff.name || staff.staffName}</span>
                    <span className="text-xs text-brand-blue font-semibold truncate">{staff.branch || staff.branchName || staff.branchId}</span>
                  </div>
                </div>

                {/* Column 2: ID & Designation (Center) */}
                <div className="flex flex-col flex-1 pl-2 border-l border-slate-100 min-w-0">
                  <span className="text-[13px] font-black text-slate-800 truncate">{staff.staffId || staff.id || staff.employeeId || staff.customId || staff.uid}</span>
                  <span className="text-[10px] font-medium text-slate-500 truncate">{staff.designation || staff.role || staff.position || 'Staff'}</span>
                </div>

                {/* Column 3: Actions (Right) */}
                <div className="flex items-center justify-end gap-1 shrink-0 pl-1">
                  {/* Admin Tracking Icons */}
                  {(userProfile?.role === 'admin' || userProfile?.isAdmin === true || userProfile?.permissions?.staffManagement === true) && (
                    <div className="flex items-center gap-0.5">
                      <button 
                        onClick={() => console.log('Live Tracking clicked')} 
                        className="p-1.5 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                      >
                        <Radio size={14} />
                      </button>
                      <button 
                        onClick={() => {
                          setSelectedStaffLocation({
                            name: staff.name,
                            lat: staff.lastLatitude,
                            lng: staff.lastLongitude,
                            updatedAt: staff.lastLocationUpdatedAt
                          });
                          setShowMapModal(true);
                        }}
                        className="p-1.5 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                      >
                        <MapPin size={14} />
                      </button>
                    </div>
                  )}
                  
                  {!isMainBranch && (
                    <button onClick={() => handleOpenEditForm(staff)} className="text-slate-400 hover:text-purple-600 p-1 sm:p-1.5 transition-colors">
                      <MoreVertical size={18} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Center Illustration */}
        {!isMainBranch && (
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
        )}
      </div>

      {showMapModal && selectedStaffLocation && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
             <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex flex-col">
                   <h3 className="font-bold text-slate-800">{selectedStaffLocation.name}'s Location</h3>
                   <span className="text-xs text-slate-500">
                     Updated: {selectedStaffLocation.updatedAt ? new Date(selectedStaffLocation.updatedAt).toLocaleString() : 'Unknown'}
                   </span>
                </div>
                <button onClick={() => setShowMapModal(false)} className="p-2 bg-slate-50 rounded-full text-slate-500 hover:bg-slate-100 transition-colors">
                   <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
             </div>
             <div className="p-0 bg-slate-50 h-[300px] md:h-[400px] relative">
                {/* Distance Badge */}
                {adminLocation && selectedStaffLocation?.lat && (
                   <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm border border-slate-200 text-xs font-bold text-slate-700 flex items-center gap-1.5">
                     <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                     Distance: {calculateDistance(adminLocation.lat, adminLocation.lng, selectedStaffLocation.lat, selectedStaffLocation.lng)} km away
                   </div>
                )}
                
                {/* Layer Toggle Button */}
                <button 
                  onClick={() => setMapLayer(prev => prev === 'street' ? 'satellite' : 'street')}
                  className="absolute top-4 right-4 z-10 bg-white/90 backdrop-blur-sm p-2 rounded-lg shadow-sm border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
                  title="Toggle Map Layer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" x2="9" y1="3" y2="18"/><line x1="15" x2="15" y1="6" y2="21"/></svg>
                </button>

                {selectedStaffLocation.lat && selectedStaffLocation.lng ? (
                  <iframe 
                     width="100%" 
                     height="100%" 
                     frameBorder="0" 
                     scrolling="no" 
                     marginHeight="0" 
                     marginWidth="0" 
                     src={mapLayer === 'street' 
                        ? `https://www.openstreetmap.org/export/embed.html?bbox=${selectedStaffLocation.lng - 0.005},${selectedStaffLocation.lat - 0.005},${selectedStaffLocation.lng + 0.005},${selectedStaffLocation.lat + 0.005}&layer=mapnik&marker=${selectedStaffLocation.lat},${selectedStaffLocation.lng}`
                        : `https://maps.google.com/maps?q=${selectedStaffLocation.lat},${selectedStaffLocation.lng}&t=k&z=17&output=embed`
                     }
                  ></iframe>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                     <MapPin size={48} className="mb-2 opacity-30" />
                     <p>No location data available</p>
                  </div>
                )}
             </div>
             <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2">
                <button 
                   onClick={() => {
                      const freshStaff = staffList.find(s => s.name === selectedStaffLocation.name);
                      if (freshStaff) {
                        setSelectedStaffLocation({
                          name: freshStaff.name,
                          lat: freshStaff.lastLatitude,
                          lng: freshStaff.lastLongitude,
                          updatedAt: freshStaff.lastLocationUpdatedAt
                        });
                      }
                   }}
                   className="flex-1 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 font-semibold shadow-sm flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors"
                >
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                     <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                   </svg>
                   Refresh
                </button>
                <button 
                   onClick={() => {
                     const url = adminLocation?.lat && adminLocation?.lng
                       ? `https://www.google.com/maps/dir/?api=1&origin=${adminLocation.lat},${adminLocation.lng}&destination=${selectedStaffLocation.lat},${selectedStaffLocation.lng}&travelmode=driving`
                       : `https://www.google.com/maps/search/?api=1&query=${selectedStaffLocation.lat},${selectedStaffLocation.lng}`;
                     window.open(url, '_blank');
                   }}
                   className="flex-1 py-2.5 bg-blue-600 border border-blue-600 rounded-xl text-white font-semibold shadow-sm flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors"
                >
                   <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
                   Get Directions
                </button>
             </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default StaffManagement;
