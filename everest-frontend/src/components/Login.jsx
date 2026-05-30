import React, { useState, useEffect, useRef } from 'react';
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { auth } from '../firebase';

const Login = ({ onLoginSuccess }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [verificationId, setVerificationId] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const recaptchaContainerRef = useRef(null);
  const recaptchaVerifierRef = useRef(null);

  useEffect(() => {
    // Initialize RecaptchaVerifier once the component mounts and binds directly to the DOM node
    if (recaptchaContainerRef.current && !recaptchaVerifierRef.current) {
      recaptchaVerifierRef.current = new RecaptchaVerifier(auth, recaptchaContainerRef.current, {
        size: 'invisible',
        callback: (response) => {
          // reCAPTCHA solved
        }
      });
    }

    // Cleanup to prevent "reCAPTCHA client element has been removed: 0" error
    return () => {
      if (recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current.clear();
        recaptchaVerifierRef.current = null;
      }
    };
  }, []);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!phoneNumber || phoneNumber.length < 10) {
      setError('Please enter a valid 10-digit phone number.');
      setLoading(false);
      return;
    }

    const formattedPhoneNumber = `+91${phoneNumber}`; // Assuming Indian numbers

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
          <h2 className="text-xl font-bold text-slate-800 mb-6 text-center">Sign In to Dashboard</h2>
          
          {error && (
            <div className="bg-rose-50 text-rose-600 p-3 rounded-lg text-sm mb-6 text-center font-medium border border-rose-100">
              {error}
            </div>
          )}

          {!verificationId ? (
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
          )}
          
          <div id="recaptcha-container" ref={recaptchaContainerRef}></div>
        </div>
      </div>
    </div>
  );
};

export default Login;