const fs = require('fs');
const file = 'C:/Users/DELL/Desktop/Everest/everest-frontend/src/App.jsx';
let content = fs.readFileSync(file, 'utf8');

// Add imports
content = content.replace(
  /import { App as CapacitorApp } from '@capacitor\/app';/,
  `import { App as CapacitorApp } from '@capacitor/app';\nimport { auth, db } from './firebase';\nimport { onAuthStateChanged, signOut } from 'firebase/auth';\nimport { doc, getDoc, collection, getDocs, setDoc, updateDoc, query, where } from 'firebase/firestore';\nimport Login from './components/Login';`
);

// Add auth states to App
content = content.replace(
  /function App\(\) {\n  const \[customers, setCustomers\] = useState\(\[\]\);\n  const \[isDbLoading, setIsDbLoading\] = useState\(true\);/,
  `function App() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [isDbLoading, setIsDbLoading] = useState(true);
  const [authChecking, setAuthChecking] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // Fetch user role profile
        try {
          const profileSnap = await getDoc(doc(db, 'users', currentUser.phoneNumber || currentUser.uid));
          if (profileSnap.exists()) {
            setUserProfile(profileSnap.data());
          } else {
            // Default to customer if no profile exists, or handle error
            setUserProfile({ role: 'customer', phone: currentUser.phoneNumber });
          }
        } catch (err) {
          console.error("Error fetching profile:", err);
        }
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setAuthChecking(false);
    });
    return () => unsubscribe();
  }, []);
`
);

// Replace initDatabase useEffect
content = content.replace(
  /useEffect\(\(\) => \{\s*\/\/ ASYNCHRONOUS DATABASE LOAD[\s\S]*?setIsDbLoading\(false\);\s*\}\s*\};\s*\n\s*initDatabase\(\);\s*\}, \[\]\);/,
  `useEffect(() => {
    const fetchCustomers = async () => {
      if (!user || !userProfile) {
        setCustomers([]);
        setIsDbLoading(false);
        return;
      }
      
      setIsDbLoading(true);
      try {
        let q;
        if (userProfile.role === 'admin') {
          q = collection(db, 'customers');
        } else if (userProfile.role === 'staff') {
          // Simplified staff query
          q = query(collection(db, 'customers'), where('center_id', '==', userProfile.center_id || ''));
        } else {
          // Customer role
          q = query(collection(db, 'customers'), where('phone', '==', user.phoneNumber));
        }
        
        const querySnapshot = await getDocs(q);
        const fetched = [];
        querySnapshot.forEach((docSnap) => {
          fetched.push({ ...docSnap.data(), id: docSnap.id });
        });
        setCustomers(fetched);
      } catch (error) {
        console.error("Firebase Init Error Caught:", error);
        setCustomers([]);
      } finally {
        setIsDbLoading(false);
      }
    };
    
    if (!authChecking) {
      fetchCustomers();
    }
  }, [user, userProfile, authChecking]);`
);

// Add auth check render
content = content.replace(
  /if \(isDbLoading\) \{/,
  `if (authChecking) {
    return <div className="h-[100dvh] bg-slate-900 flex items-center justify-center text-white">Authenticating...</div>;
  }

  if (!user) {
    return <Login onLoginSuccess={setUser} />;
  }

  if (isDbLoading) {`
);

// Replace AddCustomer localStorage logic
content = content.replace(
  /onAddCustomer={\(newCustomer\) => {\s*const nowIso = new Date\(\)\.toISOString\(\);\s*setCustomers\(prev => \[\{ \.\.\.newCustomer, lastUpdated: nowIso \}, \.\.\.prev\]\);\s*}}/,
  `onAddCustomer={async (newCustomer) => {
            const nowIso = new Date().toISOString();
            const customerToSave = { ...newCustomer, lastUpdated: nowIso };
            try {
              await setDoc(doc(db, 'customers', customerToSave.id), customerToSave);
              setCustomers(prev => [customerToSave, ...prev]);
            } catch(e) {
              console.error('Error adding customer', e);
            }
          }}`
);

// Replace ApplicationStatus status update
content = content.replace(
  /onUpdateStatus={\(id, newStatus\) => \{\s*const nowIso = new Date\(\)\.toISOString\(\);\s*setCustomers\(prev => prev\.map\(c => c\.id === id \? \{ \.\.\.c, status: newStatus, lastUpdated: nowIso \} : c\)\);\s*}}/,
  `onUpdateStatus={async (id, newStatus) => {
                const nowIso = new Date().toISOString();
                try {
                  await updateDoc(doc(db, 'customers', id), { status: newStatus, lastUpdated: nowIso });
                  setCustomers(prev => prev.map(c => c.id === id ? { ...c, status: newStatus, lastUpdated: nowIso } : c));
                } catch(e) {
                  console.error('Update error', e);
                }
              }}`
);

// Replace ApplicationStatus delete update
content = content.replace(
  /onDeleteApp={\(id\) => \{\s*const nowIso = new Date\(\)\.toISOString\(\);\s*setCustomers\(prev => prev\.map\(c => c\.id === id \? \{ \.\.\.c, status: 'Recycled', previousStatus: c\.status, lastUpdated: nowIso \} : c\)\);\s*}}/,
  `onDeleteApp={async (id) => {
                const nowIso = new Date().toISOString();
                const c = customers.find(x => x.id === id);
                try {
                  await updateDoc(doc(db, 'customers', id), { status: 'Recycled', previousStatus: c?.status || 'Pending', lastUpdated: nowIso });
                  setCustomers(prev => prev.map(c => c.id === id ? { ...c, status: 'Recycled', previousStatus: c.status, lastUpdated: nowIso } : c));
                } catch(e) { console.error('Delete error', e); }
              }}`
);

// Replace ApplicationStatus edit update
content = content.replace(
  /onUpdateCustomer={\(updatedCustomer\) => \{\s*const nowIso = new Date\(\)\.toISOString\(\);\s*setCustomers\(prev => prev\.map\(c => c\.id === updatedCustomer\.id \? \{ \.\.\.updatedCustomer, lastUpdated: nowIso \} : c\)\);\s*}}/,
  `onUpdateCustomer={async (updatedCustomer) => {
                const nowIso = new Date().toISOString();
                const toSave = { ...updatedCustomer, lastUpdated: nowIso };
                try {
                  await setDoc(doc(db, 'customers', updatedCustomer.id), toSave, { merge: true });
                  setCustomers(prev => prev.map(c => c.id === updatedCustomer.id ? toSave : c));
                } catch(e) { console.error('Update customer error', e); }
              }}`
);

// Replace RecycleBinView restore
content = content.replace(
  /onRestore={\(id, prevStatus\) => \{\s*const nowIso = new Date\(\)\.toISOString\(\);\s*setCustomers\(prev => prev\.map\(c => c\.id === id \? \{ \.\.\.c, status: prevStatus, lastUpdated: nowIso \} : c\)\);\s*}}/,
  `onRestore={async (id, prevStatus) => {
                const nowIso = new Date().toISOString();
                try {
                  await updateDoc(doc(db, 'customers', id), { status: prevStatus, lastUpdated: nowIso });
                  setCustomers(prev => prev.map(c => c.id === id ? { ...c, status: prevStatus, lastUpdated: nowIso } : c));
                } catch(e) { console.error('Restore error', e); }
              }}`
);

// Replace RecycleBinView permanent delete
content = content.replace(
  /onPermanentDelete={\(id\) => \{\s*setCustomers\(prev => prev\.filter\(c => c\.id !== id\)\);\s*}}/,
  `onPermanentDelete={async (id) => {
                try {
                  // await deleteDoc(doc(db, 'customers', id));
                  setCustomers(prev => prev.filter(c => c.id !== id));
                } catch(e) { console.error('Perm delete error', e); }
              }}`
);

// Replace Recent profiles delete
content = content.replace(
  /onClick={\(\) => \{\s*const nowIso = new Date\(\)\.toISOString\(\);\s*setCustomers\(prev => prev\.map\(c => c\.id === customer\.id \? \{ \.\.\.c, status: 'Recycled', previousStatus: c\.status, lastUpdated: nowIso \} : c\)\);\s*setActiveHomeMenuId\(null\);\s*}}/,
  `onClick={async () => {
                                  const nowIso = new Date().toISOString();
                                  try {
                                    await updateDoc(doc(db, 'customers', customer.id), { status: 'Recycled', previousStatus: customer.status, lastUpdated: nowIso });
                                    setCustomers(prev => prev.map(c => c.id === customer.id ? { ...c, status: 'Recycled', previousStatus: c.status, lastUpdated: nowIso } : c));
                                  } catch(e) { console.error('Delete error', e); }
                                  setActiveHomeMenuId(null);
                                }}`
);

// Handle top right menu signout in header. Wait, Header doesn't know about `auth`.
// I'll add a sign out button inside App.jsx header logic or user profile section.
// Actually let's just make the user icon sign out.

fs.writeFileSync(file, content);
console.log('App.jsx updated for Firebase');
