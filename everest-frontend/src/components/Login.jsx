import React, { useState, useEffect, useRef } from 'react';
import { RecaptchaVerifier, signInWithPhoneNumber, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

const Login = ({ onLoginSuccess }) => {
  const [loginType, setLoginType] = useState('otp'); // 'otp' or 'staff'
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [verificationId, setVerificationId] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const recaptchaContainerRef = useRef(null);
  const recaptchaVerifierRef = useRef(null);

  useEffect(() => {
    // Only initialize recaptcha if we are on OTP tab
    if (loginType === 'otp') {
      if (recaptchaContainerRef.current && !recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current = new RecaptchaVerifier(auth, recaptchaContainerRef.current, {
          size: 'invisible',
          callback: (response) => {}
        });
      }
    } else {
      if (recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current.clear();
        recaptchaVerifierRef.current = null;
      }
    }

    return () => {
      if (recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current.clear();
        recaptchaVerifierRef.current = null;
      }
    };
  }, [loginType]);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!phoneNumber || phoneNumber.length < 10) {
      setError('Please enter a valid 10-digit phone number.');
      setLoading(false);
      return;
    }

    const formattedPhoneNumber = `+91${phoneNumber}`; 

    try {
      const appVerifier = recaptchaVerifierRef.current;
      const confirmationResult = await signInWithPhoneNumber(auth, formattedPhoneNumber, appVerifier);
      setVerificationId(confirmationResult);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError(`Error: ${err.message || 'Failed to send OTP. Please try again.'}`);
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP.');
      setLoading(false);
      return;
    }

    try {
      const result = await verificationId.confirm(otp);
      const user = result.user;
      setLoading(false);
      if (onLoginSuccess) {
        onLoginSuccess(user);
      }
    } catch (err) {
      console.error(err);
      setError('Invalid OTP. Please try again.');
      setLoading(false);
    }
  };

  const handleStaffLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!phoneNumber || phoneNumber.length < 10) {
      setError('Please enter a valid 10-digit phone number.');
      setLoading(false);
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      setLoading(false);
      return;
    }

    const cleanPhone = phoneNumber.replace(/\D/g, '').slice(-10);
    const internalEmail = `${cleanPhone}@everestmicro.internal`;
    const cleanPassword = password.trim();

    console.log('Attempting Staff Sign-In with:', { internalEmail, cleanPassword });

    try {
      const userCredential = await signInWithEmailAndPassword(auth, internalEmail, cleanPassword);
      console.log('Staff Sign-In Successful! UID:', userCredential.user.uid);
      const user = userCredential.user;
      
      const q = doc(db, 'users', user.uid);
      const profileSnap = await getDoc(q);
      
      if (profileSnap.exists()) {
        const profile = profileSnap.data();
        if (profile.role === 'staff') {
          const { collection, query, where, getDocs } = await import('firebase/firestore');
          const staffQuery = query(collection(db, 'staff'), where('uid', '==', user.uid));
          const staffSnaps = await getDocs(staffQuery);
          
          if (!staffSnaps.empty) {
            const staffDoc = staffSnaps.docs[0].data();
            if (staffDoc.status === 'Recycled') {
              await signOut(auth);
              setError('Your account has been deactivated.');
              setLoading(false);
              return;
            }
          }
        }
      }

      setLoading(false);
      if (onLoginSuccess) {
        onLoginSuccess(user);
      }
    } catch (error) {
      console.error('Firebase Auth Sign-In Error:', error.code, error.message);
      const errMsg = `Authentication failed: [${error.code}] ${error.message}`;
      setError(errMsg);
      alert(errMsg);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-brand-blue p-8 text-center">
          <h1 className="text-3xl font-black tracking-widest uppercase text-white mb-2">
            EVEREST
          </h1>
          <p className="text-brand-blue-light text-sm font-semibold uppercase tracking-wider">
            Microfinance Portal
          </p>
        </div>
        
        <div className="p-8">
          <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
            <button 
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${loginType === 'otp' ? 'bg-white shadow text-brand-blue' : 'text-slate-500'}`}
              onClick={() => { setLoginType('otp'); setError(''); setVerificationId(null); setPhoneNumber(''); }}
            >
              Admin / Customer
            </button>
            <button 
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${loginType === 'staff' ? 'bg-white shadow text-brand-blue' : 'text-slate-500'}`}
              onClick={() => { setLoginType('staff'); setError(''); setPhoneNumber(''); setPassword(''); }}
            >
              Staff Login
            </button>
          </div>

          <h2 className="text-xl font-bold text-slate-800 mb-6 text-center">Sign In to Dashboard</h2>
          
          {error && (
            <div className="bg-rose-50 text-rose-600 p-3 rounded-lg text-sm mb-6 text-center font-medium border border-rose-100">
              {error}
            </div>
          )}

          {loginType === 'otp' ? (
            !verificationId ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-2">Mobile Number</label>
                  <div className="flex">
                    <span className="inline-flex items-center px-4 rounded-l-xl border border-r-0 border-slate-200 bg-slate-50 text-slate-500 font-bold">
                      +91
                    </span>
                    <input
                      type="tel"
                      maxLength="10"
                      placeholder="9876543210"
                      className="flex-1 block w-full px-4 py-3 rounded-none rounded-r-xl border border-slate-200 focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue outline-none transition-all font-semibold"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading || phoneNumber.length < 10}
                  className="w-full bg-brand-blue text-white py-3 rounded-xl font-bold hover:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Sending OTP...' : 'Send OTP'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-2">Enter 6-Digit OTP</label>
                  <input
                    type="text"
                    maxLength="6"
                    placeholder="123456"
                    className="block w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue outline-none transition-all font-semibold text-center tracking-widest text-lg"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || otp.length < 6}
                  className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Verifying...' : 'Verify & Login'}
                </button>
              </form>
            )
          ) : (
            <form onSubmit={handleStaffLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-2">Mobile Number</label>
                <div className="flex">
                  <span className="inline-flex items-center px-4 rounded-l-xl border border-r-0 border-slate-200 bg-slate-50 text-slate-500 font-bold">
                    +91
                  </span>
                  <input
                    type="tel"
                    maxLength="10"
                    placeholder="9876543210"
                    className="flex-1 block w-full px-4 py-3 rounded-none rounded-r-xl border border-slate-200 focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue outline-none transition-all font-semibold"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-2">Password</label>
                <input
                  type="password"
                  placeholder="Enter Password"
                  className="block w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue outline-none transition-all font-semibold"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <button
                type="submit"
                disabled={loading || phoneNumber.length < 10 || !password}
                className="w-full bg-purple-600 text-white py-3 rounded-xl font-bold hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-600/30"
              >
                {loading ? 'Logging in...' : 'Staff Login'}
              </button>
            </form>
          )}
          
          <div id="recaptcha-container" ref={recaptchaContainerRef}></div>
        </div>
      </div>
    </div>
  );
};

export default Login;