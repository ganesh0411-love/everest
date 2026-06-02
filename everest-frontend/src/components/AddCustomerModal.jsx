import React, { useState, useEffect, useRef } from 'react';
import PdfPreviewModal from './PdfPreviewModal';
import ImageCropModal from './ImageCropModal';
import PdfViewer from './PdfViewer';

import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { uploadImageToStorage } from '../utils/storageUpload';

const AddCustomerModal = ({ onClose, onAddCustomer, initialData }) => {
  const [step, setStep] = useState('form'); // 'form', 'confirm', 'success'
  const [showPdf, setShowPdf] = useState(false);
  const [pdfAutoMode, setPdfAutoMode] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // 1. Initial Registration Data
  const [appDate, setAppDate] = useState(initialData?.appDate || new Date().toISOString().split('T')[0]);
  const [appDay, setAppDay] = useState(initialData?.appDay || '');
  const [appNumber] = useState(initialData?.appNumber || Math.floor(1000000000 + Math.random() * 9000000000));
  const [customerId] = useState(initialData?.id || `EMF${String(Math.floor(Math.random() * 10000000)).padStart(7, '0')}`);
  const [photo, setPhoto] = useState(initialData?.image || null);
  const [branch, setBranch] = useState(initialData?.branch || 'Batlagundu');
  const fileInputRef = useRef(null);

  useEffect(() => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const d = new Date(appDate);
    if (!isNaN(d)) setAppDay(days[d.getDay()]);
  }, [appDate]);

  const [photoActionSheetOpen, setPhotoActionSheetOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);

  const handlePhotoCapture = () => setPhotoActionSheetOpen(true);

  const [cropImageSrc, setCropImageSrc] = useState(null);

  const triggerMainCamera = async (source) => {
    try {
      if (source === CameraSource.Camera) {
        const check = await Camera.checkPermissions();
        if (check.camera !== 'granted') {
          await Camera.requestPermissions({ permissions: ['camera'] });
        }
      }
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: source
      });
      setCropImageSrc(`data:image/jpeg;base64,${image.base64String}`);
    } catch (e) {
      console.error("User cancelled or camera error", e);
    } finally {
      setPhotoActionSheetOpen(false);
    }
  };

  const handleCropComplete = (croppedUrl) => {
    setPhoto(croppedUrl);
    setCropImageSrc(null);
  };

  // 2. Core Identity & Contact
  const [center, setCenter] = useState(initialData?.center || '');
  const [city, setCity] = useState(initialData?.city || '');
  const [district, setDistrict] = useState(initialData?.district || '');
  const [nameTitle, setNameTitle] = useState(initialData?.nameTitle || 'Mrs.');
  const [customerName, setCustomerName] = useState(initialData?.customerName || '');
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [altPhone, setAltPhone] = useState(initialData?.altPhone || '');
  const [customerStatus, setCustomerStatus] = useState(initialData?.customerStatus || 'New'); // New or Existing

  const handlePhoneInput = (setter) => (e) => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    setter(val);
  };

  const simulateAutoFetch = () => {
    if (customerStatus === 'Existing') {
      alert('Mock Auto-Fetch: Populating existing data for phone ' + phone + ' or Name: ' + customerName);
      setCity('Sample City');
      setCenter('Sample Center');
    }
  };

  // 3. Personal & Demographic
  const [gender, setGender] = useState(initialData?.gender || 'Female');
  const [dob, setDob] = useState(initialData?.dob || '');
  const [age, setAge] = useState(initialData?.age || '');
  const [occupation, setOccupation] = useState(initialData?.occupation || '');
  const [maritalStatus, setMaritalStatus] = useState(initialData?.maritalStatus || 'Married');
  const [nomineeName, setNomineeName] = useState(initialData?.nomineeName || '');
  const [nomineeRelation, setNomineeRelation] = useState(initialData?.nomineeRelation || 'Husband');
  const [nomineeOccupation, setNomineeOccupation] = useState(initialData?.nomineeOccupation || '');
  const [nomineeIdsChecked, setNomineeIdsChecked] = useState({
    aadhaar: initialData?.nomineeIdsChecked?.aadhaar || false,
    pan: initialData?.nomineeIdsChecked?.pan || false,
    voter: initialData?.nomineeIdsChecked?.voter || false,
    smartCard: initialData?.nomineeIdsChecked?.smartCard || false
  });
  const [nomineeKycDocs, setNomineeKycDocs] = useState(initialData?.nomineeKycDocs || {});
  const [nomineeKycUploadTarget, setNomineeKycUploadTarget] = useState(null);
  const [nomineeAadhaar, setNomineeAadhaar] = useState(initialData?.nomineeAadhaar ? initialData.nomineeAadhaar.split('') : Array(12).fill(''));
  const handleNomineeAadhaarChange = (index, val) => {
    if (!/^\d*$/.test(val)) return;
    const newAadhaar = [...nomineeAadhaar];
    newAadhaar[index] = val;
    setNomineeAadhaar(newAadhaar);
    if (val && index < 11) document.getElementById(`nomineeAadhaar-${index + 1}`)?.focus();
  };
  const [nomineePan, setNomineePan] = useState(initialData?.nomineePan || '');
  const [nomineeVoterId, setNomineeVoterId] = useState(initialData?.nomineeVoterId || '');
  const [nomineeSmartCard, setNomineeSmartCard] = useState(initialData?.nomineeSmartCard || '');

  const handleNomineeKycUpload = (type, file) => {
    if (!file) return;
    setNomineeKycDocs(prev => {
      const current = prev[type] || [];
      let url = file.url || file.webPath;
      if (!url && file instanceof File) url = URL.createObjectURL(file);
      return { ...prev, [type]: [...current, { name: file.name, url, fileObj: file instanceof File ? file : null }] };
    });
  };

  const removeNomineeKycDoc = (type, index) => {
    setNomineeKycDocs(prev => {
      const current = prev[type] || [];
      const updated = [...current];
      updated.splice(index, 1);
      return { ...prev, [type]: updated };
    });
  };

  useEffect(() => {
    if (dob) {
      const birth = new Date(dob);
      const today = new Date();
      let calculatedAge = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        calculatedAge--;
      }
      setAge(calculatedAge.toString());
    }
  }, [dob]);

  // 4. Address, Location & ID
  const [address, setAddress] = useState(initialData?.address || '');
  const [pincode, setPincode] = useState(initialData?.pincode ? initialData.pincode.split('').slice(0, 6) : Array(6).fill(''));
  const [locationUrl, setLocationUrl] = useState(initialData?.locationUrl || '');
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  
  const handlePincodeChange = (index, val) => {
    if (!/^\d*$/.test(val)) return;
    const newPin = [...pincode];
    newPin[index] = val;
    setPincode(newPin);
    if (val && index < 5) document.getElementById(`pin-${index + 1}`)?.focus();
  };

  const handleGetLocation = async () => {
    setIsFetchingLocation(true);
    try {
      try {
        const permissions = await Geolocation.checkPermissions();
        if (permissions.location !== 'granted' && permissions.location !== 'prompt') {
          const request = await Geolocation.requestPermissions();
          if (request.location !== 'granted') {
            alert('Location permission denied. Cannot fetch accurate location.');
            setIsFetchingLocation(false);
            return;
          }
        } else if (permissions.location === 'prompt') {
          const request = await Geolocation.requestPermissions();
          if (request.location !== 'granted') {
            alert('Location permission denied. Cannot fetch accurate location.');
            setIsFetchingLocation(false);
            return;
          }
        }
      } catch (permError) {
        // Ignore 'Not implemented on web.' error since browsers handle permissions automatically
        if (permError?.message !== 'Not implemented on web.') {
          console.warn('Permission check error:', permError);
        }
      }

      let position;
      try {
        // Attempt high accuracy first
        position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 20000 // Give 20s to find high-accuracy lock
        });
      } catch (highAccError) {
        console.warn('High accuracy location failed, falling back to lower accuracy:', highAccError);
        // Fallback to lower accuracy if high accuracy times out (especially common on web/desktops)
        position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: false,
          timeout: 10000 
        });
      }
      
      const { latitude, longitude } = position.coords;
      setLocationUrl(`https://maps.google.com/?q=${latitude},${longitude}`);
    } catch (error) {
      console.error("Error fetching location", error);
      alert('Failed to fetch location: ' + error.message + '\n\nTip: Ensure GPS is ON and you have clear sky visibility for a precise lock.');
    } finally {
      setIsFetchingLocation(false);
    }
  };

  // ID Selection
  const [idsChecked, setIdsChecked] = useState({
    aadhaar: initialData?.idsChecked?.aadhaar || false,
    pan: initialData?.idsChecked?.pan || false,
    voter: initialData?.idsChecked?.voter || false,
    smartCard: initialData?.idsChecked?.smartCard || false
  });
  
  const [kycDocs, setKycDocs] = useState(initialData?.kycDocs || {});
  const [kycUploadTarget, setKycUploadTarget] = useState(null); // 'aadhaar', 'pan', 'voter', 'smartCard'

  const handleKycUpload = (type, file) => {
    if (!file) return;
    setKycDocs(prev => {
      const current = prev[type] || [];
      let url = file.url || file.webPath;
      if (!url && file instanceof File) url = URL.createObjectURL(file);
      return { ...prev, [type]: [...current, { name: file.name, url, fileObj: file instanceof File ? file : null }] };
    });
  };

  const removeKycDoc = (type, index) => {
    setKycDocs(prev => {
      const current = prev[type] || [];
      return { ...prev, [type]: current.filter((_, i) => i !== index) };
    });
  };

  const triggerKycCamera = async (type, isNominee = false) => {
    try {
      const check = await Camera.checkPermissions();
      if (check.camera !== 'granted') {
        await Camera.requestPermissions({ permissions: ['camera'] });
      }
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera
      });
      // Store the image path as the file for this type
      if (isNominee) {
        handleNomineeKycUpload(type, { name: `Camera_Capture_${Date.now()}.jpg`, url: `data:image/jpeg;base64,${image.base64String}` });
      } else {
        if (isNominee) handleNomineeKycUpload(type, { name: `Camera_Capture_${Date.now()}.jpg`, url: `data:image/jpeg;base64,${image.base64String}` }); else handleKycUpload(type, { name: `Camera_Capture_${Date.now()}.jpg`, url: `data:image/jpeg;base64,${image.base64String}` });
      }
    } catch (e) {
      console.error("Camera error", e);
    } finally {
      if (isNominee) setNomineeKycUploadTarget(null);
      else if (isNominee) setNomineeKycUploadTarget(null); else setKycUploadTarget(null);
    }
  };
  
  // Aadhaar (12 boxes, fully visible as per strict rule)
  const [aadhaar, setAadhaar] = useState(initialData?.aadhaar ? initialData.aadhaar.split('') : Array(12).fill(''));
  const handleAadhaarChange = (index, val) => {
    if (!/^\d*$/.test(val)) return;
    const newAadhaar = [...aadhaar];
    newAadhaar[index] = val;
    setAadhaar(newAadhaar);
    if (val && index < 11) document.getElementById(`aadhaar-${index + 1}`)?.focus();
  };

  const [pan, setPan] = useState(initialData?.pan || '');
  const [voterId, setVoterId] = useState(initialData?.voterId || '');
  const [smartCard, setSmartCard] = useState(initialData?.smartCard || '');

  // 5. Financial Details
  const [loanType, setLoanType] = useState(initialData?.loanType || 'Micro Finance');
  const [tenureVal, setTenureVal] = useState(initialData?.tenureVal || '');
  const [tenureUnit, setTenureUnit] = useState(initialData?.tenureUnit || 'Months');
  const [loanAmount, setLoanAmount] = useState(initialData?.loanAmount || '');
  const [repayAmount, setRepayAmount] = useState(initialData?.repayAmount || '');
  const [interestPercent, setInterestPercent] = useState(initialData?.interestPercent || '');

  const handleFinancialChange = (field, value) => {
    let loan = parseFloat(field === 'loanAmount' ? value : loanAmount) || 0;
    let repay = parseFloat(field === 'repayAmount' ? value : repayAmount) || 0;
    let interest = parseFloat(field === 'interestPercent' ? value : interestPercent) || 0;

    if (field === 'loanAmount') setLoanAmount(value);
    if (field === 'repayAmount') setRepayAmount(value);
    if (field === 'interestPercent') setInterestPercent(value);

    // Scenario A: Repayment-driven
    if (field === 'loanAmount' || field === 'repayAmount') {
      if (loan > 0 && repay > 0) {
        setInterestPercent((((repay - loan) / loan) * 100).toFixed(2));
      } else if (field === 'loanAmount' && interest > 0) {
        setRepayAmount((loan + (loan * interest / 100)).toFixed(2));
      } else {
        setInterestPercent('');
      }
    } 
    // Scenario B: Interest-driven
    else if (field === 'interestPercent') {
      if (loan > 0 && interest > 0) {
        setRepayAmount((loan + (loan * interest / 100)).toFixed(2));
      } else {
        setRepayAmount('');
      }
    }
  };

  // 6. Workflows
  const handleSubmitClick = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (e && e.stopPropagation) e.stopPropagation();
    setStep('confirm');
  };

  const confirmSubmit = async () => {
    setIsSubmitting(true);
    try {
      let finalPhoto = photo;
      if (photo && !photo.includes('firebasestorage.googleapis.com')) {
         finalPhoto = await uploadImageToStorage(photo, 'profile_pics', `${customerId}_profile`);
      }

      // Strip fileObj from kycDocs to prevent Firestore 'custom object' errors
      const cleanKycDocs = (docs) => {
        const cleaned = {};
        for (const key in docs) {
          if (docs[key]) {
            cleaned[key] = docs[key].map(d => {
              const { fileObj, ...rest } = d;
              return rest;
            });
          }
        }
        return cleaned;
      };

      const newCustomer = {
        id: customerId,
        name: `${nameTitle} ${customerName}`,
        date: appDate,
        status: initialData?.status || 'Pending',
        loanAmount: parseFloat(loanAmount) || 0,
        repayAmount: parseFloat(repayAmount) || 0,
        category: 'Upcoming',
        // Schema Verification: Explicit mapping
        appDate, appDay, appNumber, image: finalPhoto, branch,
        center, city, district, nameTitle, customerName,
        phone, altPhone, customerStatus, dob, age,
        gender, maritalStatus, religion: '', caste: '', education: '', occupation,
        idsChecked, loanType, tenureVal, tenureUnit, interestPercent,
        nomineeName, nomineeRelation, address, pincode: pincode.join(''),
        aadhaar: aadhaar.join(''), pan, voterId, smartCard, kycDocs: cleanKycDocs(kycDocs), locationUrl
        ,nomineeOccupation, nomineeIdsChecked, nomineeAadhaar: nomineeAadhaar.join(''), nomineePan, nomineeVoterId, nomineeSmartCard, nomineeKycDocs: cleanKycDocs(nomineeKycDocs)
      };
      
      if (onAddCustomer) {
        onAddCustomer(newCustomer);
      }
      
      setStep('success');

      // Background Upload Task (KYC Only)
      setTimeout(async () => {
        try {
          let finalKycDocs = { ...kycDocs };
          const uploadKycDocs = async (type, prefix) => {
            if (finalKycDocs[type]) {
              const uploaded = await Promise.all(finalKycDocs[type].map(async (docObj, idx) => {
                if (!docObj.url.includes('firebasestorage.googleapis.com')) {
                   const target = docObj.fileObj || docObj.url;
                   const newUrl = await uploadImageToStorage(target, `kyc_${prefix}`, `${customerId}_${prefix}_${idx}`);
                   return { ...docObj, url: newUrl };
                }
                return docObj;
              }));
              finalKycDocs[type] = uploaded;
            }
          };
          
          await Promise.all([
             uploadKycDocs('aadhaar', 'aadhaar'),
             uploadKycDocs('pan', 'pan'),
             uploadKycDocs('voter', 'voter_id'),
             uploadKycDocs('smartCard', 'smart_card')
          ]);
          const uploadNomineeKycDocs = async (key, prefix) => {
            if (nomineeKycDocs[key] && nomineeKycDocs[key].length > 0) {
              const urls = [];
              for (let i = 0; i < nomineeKycDocs[key].length; i++) {
                const doc = nomineeKycDocs[key][i];
                if (doc.fileObj) {
                  const url = await uploadImageToStorage(doc.fileObj, `customers/${customerId}/nominee_${prefix}_${Date.now()}_${i}`);
                  urls.push({ name: doc.name, url });
                } else {
                  urls.push({ name: doc.name, url: doc.url });
                }
              }
              newCustomer.nomineeKycDocs[key] = urls;
            }
          };

          await Promise.all([
             uploadNomineeKycDocs('aadhaar', 'aadhaar'),
             uploadNomineeKycDocs('pan', 'pan'),
             uploadNomineeKycDocs('voter', 'voter_id'),
             uploadNomineeKycDocs('smartCard', 'smart_card')
          ]);

          const { doc, updateDoc } = await import('firebase/firestore');
          const { db } = await import('../firebase');
          await updateDoc(doc(db, 'customers', customerId), {
            image: finalPhoto,
            kycDocs: cleanKycDocs(finalKycDocs)
          });
        } catch (e) {
          console.error('Background upload failed for', customerId, e);
        }
      }, 50);

    } catch (error) {
      console.error("Save failed:", error);
      alert("Failed to save application: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === 'success') {
    return (
      <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
          <div className="p-6 pb-4 text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-900">Application Submitted!</h2>
            <p className="text-slate-500 text-sm mt-1">Sent to Pending Queue &middot; Waiting for admin approval</p>
          </div>
          
          <div className="mx-6 p-4 border border-slate-200 rounded-xl bg-slate-50 mb-6 space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500 text-sm">Customer</span>
              <span className="font-bold text-slate-800 text-sm">{nameTitle} {customerName || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 text-sm">Application No.</span>
              <span className="font-bold text-slate-800 text-sm">#{appNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 text-sm">Center</span>
              <span className="font-bold text-slate-800 text-sm">{center || 'N/A'}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-200">
              <span className="text-slate-500 text-sm font-semibold">Loan Amount</span>
              <span className="font-bold text-slate-800 text-sm">₹{loanAmount || '0'}</span>
            </div>
          </div>

          <div className="px-6 pb-6 space-y-3">
              <div className="flex gap-3">
                <button onClick={() => { setPdfAutoMode(null); setShowPdf(true); }} className="flex-1 bg-white border border-slate-200 text-slate-700 font-bold py-3 rounded-xl hover:bg-slate-50 transition-colors flex justify-center items-center gap-2 shadow-sm">
                  <span>👀</span> View PDF
                </button>
                <button onClick={() => { setPdfAutoMode('share'); setShowPdf(true); }} className="flex-1 bg-[#10a37f] text-white font-bold py-3 rounded-xl hover:bg-[#0e906f] transition-colors flex justify-center items-center gap-2 shadow-md shadow-[#10a37f]/30">
                  <span>🔗</span> Share
                </button>
              </div>
              <button onClick={() => { setPdfAutoMode('print'); setShowPdf(true); }} className="w-full bg-[#10a37f] text-white font-bold py-3 rounded-xl hover:bg-[#0e906f] transition-colors flex justify-center items-center gap-2 shadow-md shadow-[#10a37f]/30">
                <span>🖨️</span> Print PDF
              </button>
            <button onClick={onClose} className="w-full bg-white border border-slate-200 text-slate-600 font-bold py-3 rounded-xl hover:bg-slate-50 transition-colors mt-2">
              Done — Back to Home
            </button>
          </div>
        </div>

        {showPdf && (
          <PdfPreviewModal 
            application={{
              id: customerId,
              customerName: `${nameTitle} ${customerName}`,
              status: initialData?.status || 'Pending',
              customerStatus: customerStatus,
              appDate: appDate,
              appDay: appDay,
              appNumber: appNumber,
              serialNo: 1, // Mock
              gender: gender,
              maritalStatus: maritalStatus,
              loanAmount: loanAmount,
              repayAmount: repayAmount,
              loanType: loanType,
              tenureVal: tenureVal,
              tenureUnit: tenureUnit,
              image: photo,
              center: center,
              city: city,
              district: district,
              phone: phone,
              altPhone: altPhone,
              dob: dob,
              age: age,
              occupation: occupation,
              nomineeName: nomineeName,
              nomineeRelation: nomineeRelation,
              address: address,
              pincode: pincode.join(''),
              aadhaar: aadhaar.join(''),
              pan: pan,
              locationUrl: locationUrl
            }}
            onClose={() => { setShowPdf(false); setPdfAutoMode(null); }}
            autoMode={pdfAutoMode}
          />
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#f8fafc] z-50 flex flex-col animate-in slide-in-from-bottom-full duration-300">
      
      {/* 2-Step Confirmation Dialog */}
      {step === 'confirm' && (
        <div className="absolute inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl text-center animate-in zoom-in-95">
            <h3 className="text-lg font-bold text-slate-800 mb-2">Confirm Submission</h3>
            <p className="text-slate-500 mb-6">Are you sure you want to submit this customer application?</p>
            <div className="flex gap-3">
              <button onClick={() => setStep('form')} className="flex-1 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50">Back</button>
              <button onClick={confirmSubmit} disabled={isSubmitting} className={`flex-1 py-3 bg-[#10a37f] text-white rounded-xl font-bold hover:bg-[#0e906f] shadow-md shadow-[#10a37f]/30 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}>
                {isSubmitting ? 'Submitting...' : 'Yes, Submit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-white sticky top-0 z-10 shadow-sm border-b border-slate-200">
        <h2 className="text-xl font-bold text-slate-800">Add New Customer</h2>
        <button onClick={onClose} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24 space-y-6">
        
        {/* Section 1: Registration Data */}
        <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">REGISTRATION DATA</h3>
          
          <div className="flex gap-4 mb-5 items-start">
            <div className="w-24 h-24 shrink-0 border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center text-slate-400 bg-slate-50 cursor-pointer hover:bg-slate-100 overflow-hidden relative" onClick={handlePhotoCapture}>
              {photo ? (
                <img src={photo} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="text-[10px] font-medium">Tap to Capture</span>
                </>
              )}
            </div>
            
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-500 mb-1">Select Branch</label>
              <select 
                value={branch} 
                onChange={(e) => setBranch(e.target.value)}
                className="w-full p-3 border border-slate-200 rounded-xl bg-white outline-none font-medium text-slate-700"
              >
                <option value="Batlagundu">Batlagundu</option>
                <option value="Nilakottai">Nilakottai</option>
                <option value="Sempatti">Sempatti</option>
                <option value="Periyakulam">Periyakulam</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Application Number</label>
              <input type="text" readOnly value={appNumber} className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-700 outline-none font-medium" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Date of Application</label>
                <input type="date" value={appDate} onChange={(e) => setAppDate(e.target.value)} className="w-full px-2 py-3 border border-slate-200 rounded-xl bg-white outline-none font-medium text-slate-700 text-[13px]" />
              </div>
              <div className="flex flex-col justify-end pb-3">
                <span className="font-bold text-brand-blue">{appDay}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Core Identity */}
        <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">CORE IDENTITY & CONTACT</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Customer ID</label>
              <input type="text" readOnly value={customerId} className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-700 outline-none font-medium" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Customer Name</label>
              <div className="flex">
                <select value={nameTitle} onChange={e => setNameTitle(e.target.value)} className="p-3 border border-slate-200 rounded-l-xl bg-white outline-none font-medium text-slate-700 w-24">
                  <option>Mr.</option>
                  <option>Mrs.</option>
                  <option>Miss</option>
                </select>
                <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Full Name" className="flex-1 p-3 border-y border-r border-slate-200 rounded-r-xl outline-none font-medium text-slate-700" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Phone Number</label>
                <input type="text" inputMode="numeric" value={phone} onChange={handlePhoneInput(setPhone)} placeholder="10 digits" className="w-full p-3 border border-slate-200 rounded-xl outline-none font-medium text-slate-700" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Alt. Phone</label>
                <input type="text" inputMode="numeric" value={altPhone} onChange={handlePhoneInput(setAltPhone)} placeholder="Optional" className="w-full p-3 border border-slate-200 rounded-xl outline-none font-medium text-slate-700" />
              </div>
            </div>
            
            {/* Customer Status Moved Here */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Customer Status</label>
              <div className="flex border border-slate-200 rounded-xl overflow-hidden">
                <button onClick={() => setCustomerStatus('New')} className={`flex-1 py-3 text-sm font-semibold ${customerStatus === 'New' ? 'bg-brand-blue text-white' : 'bg-white text-slate-500'}`}>New</button>
                <button onClick={() => { setCustomerStatus('Existing'); setTimeout(simulateAutoFetch, 100); }} className={`flex-1 py-3 text-sm font-semibold ${customerStatus === 'Existing' ? 'bg-brand-blue text-white' : 'bg-white text-slate-500'}`}>Existing</button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Center / Area</label>
                <input type="text" value={center} onChange={e => setCenter(e.target.value)} placeholder="Street name" className="w-full p-3 border border-slate-200 rounded-xl outline-none font-medium text-slate-700" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">City</label>
                <input type="text" value={city} onChange={e => setCity(e.target.value)} placeholder="City name" className="w-full p-3 border border-slate-200 rounded-xl outline-none font-medium text-slate-700" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">District</label>
              <select value={district} onChange={e => setDistrict(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl bg-white outline-none font-medium text-slate-700 appearance-none">
                <option value="">-- Select District --</option>
                {[
                  "Ariyalur", "Chengalpattu", "Chennai", "Coimbatore", "Cuddalore",
                  "Dharmapuri", "Dindigul", "Erode", "Kallakurichi", "Kanchipuram",
                  "Kanyakumari", "Karur", "Krishnagiri", "Madurai", "Mayiladuthurai",
                  "Nagapattinam", "Namakkal", "Nilgiris", "Perambalur", "Pudukkottai",
                  "Ramanathapuram", "Ranipet", "Salem", "Sivaganga", "Tenkasi",
                  "Thanjavur", "Theni", "Thoothukudi", "Tiruchirappalli", "Tirunelveli",
                  "Tirupathur", "Tiruppur", "Tiruvallur", "Tiruvannamalai", "Tiruvarur",
                  "Vellore", "Viluppuram", "Virudhunagar"
                ].map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
        </section>

        {/* Section 3: Personal & Demographic */}
        <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">PERSONAL DETAILS</h3>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Gender</label>
              <select value={gender} onChange={e => setGender(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl bg-white outline-none font-medium text-slate-700">
                <option>Female</option>
                <option>Male</option>
                <option>Transgender</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Marital Status</label>
              <select value={maritalStatus} onChange={e => setMaritalStatus(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl bg-white outline-none font-medium text-slate-700">
                <option>Single</option>
                <option>Married</option>
                <option>Widow</option>
                <option>Divorced</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Date of Birth</label>
              <input type="date" value={dob} onChange={e => setDob(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl bg-white outline-none font-medium text-slate-700" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Age</label>
              <input type="text" readOnly value={age} placeholder="Auto" className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-700 outline-none font-medium" />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-xs font-semibold text-slate-500 mb-1">Occupation</label>
            <input type="text" value={occupation} onChange={e => setOccupation(e.target.value)} placeholder="E.g. Teacher, Farmer" className="w-full p-3 border border-slate-200 rounded-xl outline-none font-medium text-slate-700" />
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h4 className="text-xs font-bold text-slate-600 mb-3">NOMINEE DETAILS</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Nominee Name</label>
                <input type="text" value={nomineeName} onChange={e => setNomineeName(e.target.value)} placeholder="Full Name" className="w-full p-3 border border-slate-200 rounded-xl outline-none bg-white font-medium text-slate-700" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Relationship</label>
                <select value={nomineeRelation} onChange={e => setNomineeRelation(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl bg-white outline-none font-medium text-slate-700">
                  <option>Father</option>
                  <option>Mother</option>
                  <option>Husband</option>
                  <option>Wife</option>
                  <option>Sister</option>
                  <option>Brother</option>
                  <option>Son</option>
                  <option>Daughter</option>
                </select>
              </div>
            </div>
          </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Occupation</label>
                <input type="text" value={nomineeOccupation} onChange={e => setNomineeOccupation(e.target.value)} placeholder="E.g. Teacher, Farmer" className="w-full p-3 border border-slate-200 rounded-xl outline-none bg-white font-medium text-slate-700" />
              </div>
              
              <div className="pt-2 border-t border-slate-200 mt-2">
                <label className="block text-[11px] font-semibold text-slate-500 mb-2">Nominee ID Proof Verification</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {Object.keys(nomineeIdsChecked).map((key) => (
                    <label key={`nominee-${key}`} className="flex items-center gap-1.5 bg-white px-2 py-1.5 rounded-lg border border-slate-200 cursor-pointer">
                      <input type="checkbox" checked={nomineeIdsChecked[key]} onChange={(e) => setNomineeIdsChecked({...nomineeIdsChecked, [key]: e.target.checked})} className="w-3.5 h-3.5 text-brand-blue rounded" />
                      <span className="text-[11px] font-medium text-slate-700">
                        {key === 'aadhaar' ? 'Aadhaar' : key === 'pan' ? 'PAN' : key === 'voter' ? 'Voter ID' : 'Smart Card'}
                      </span>
                    </label>
                  ))}
                </div>

                {nomineeIdsChecked.aadhaar && (
                  <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-200 mb-3">
                    <label className="block text-[10px] font-bold text-amber-800 mb-1">AADHAAR CARD</label>
                    <div className="flex gap-1 flex-wrap mb-2">
                      {nomineeAadhaar.map((digit, i) => (
                        <React.Fragment key={`nomineeAadhaar-${i}`}>
                          <input id={`nomineeAadhaar-${i}`} type="text" inputMode="numeric" maxLength={1} value={digit} onChange={(e) => handleNomineeAadhaarChange(i, e.target.value)} className="w-7 h-9 border border-slate-300 rounded text-center font-bold outline-none focus:border-amber-500 bg-white text-xs" />
                          {(i === 3 || i === 7) && <span className="flex items-center text-slate-400 px-0.5 text-xs">-</span>}
                        </React.Fragment>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {(nomineeKycDocs.aadhaar || []).map((doc, idx) => (
                        <div key={idx} className="relative flex items-center bg-emerald-50 border border-emerald-200 rounded px-2 py-1 shadow-sm">
                          <span className="text-[10px] font-bold text-emerald-700 truncate max-w-[100px] cursor-pointer hover:underline" onClick={() => setPreviewDoc(doc)}>{doc.name}</span>
                          <button className="ml-1 text-rose-500 font-bold hover:text-rose-700 text-xs" onClick={() => removeNomineeKycDoc('aadhaar', idx)}>✕</button>
                        </div>
                      ))}
                    </div>
                    <div className="relative inline-block">
                      <button onClick={() => setNomineeKycUploadTarget('aadhaar')} className="text-[10px] bg-white border border-slate-300 px-2 py-1 rounded font-medium text-slate-700 shadow-sm flex items-center gap-1 hover:bg-slate-50 transition-colors">
                        Upload
                      </button>
                    </div>
                  </div>
                )}

                {nomineeIdsChecked.pan && (
                  <div className="bg-white p-3 rounded-xl border border-slate-200 mb-3">
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">PAN CARD</label>
                    <input type="text" value={nomineePan} onChange={e => setNomineePan(e.target.value.toUpperCase())} placeholder="ABCDE1234F" maxLength={10} className="w-full p-2 border border-slate-300 rounded outline-none font-bold text-slate-800 uppercase tracking-widest mb-2 bg-white text-xs" />
                    <div className="flex flex-wrap gap-2 mb-2">
                      {(nomineeKycDocs.pan || []).map((doc, idx) => (
                        <div key={idx} className="relative flex items-center bg-emerald-50 border border-emerald-200 rounded px-2 py-1 shadow-sm">
                          <span className="text-[10px] font-bold text-emerald-700 truncate max-w-[100px] cursor-pointer hover:underline" onClick={() => setPreviewDoc(doc)}>{doc.name}</span>
                          <button className="ml-1 text-rose-500 font-bold hover:text-rose-700 text-xs" onClick={() => removeNomineeKycDoc('pan', idx)}>✕</button>
                        </div>
                      ))}
                    </div>
                    <div className="relative inline-block">
                      <button onClick={() => setNomineeKycUploadTarget('pan')} className="text-[10px] bg-white border border-slate-300 px-2 py-1 rounded font-medium text-slate-700 shadow-sm flex items-center gap-1 hover:bg-slate-50 transition-colors">
                        Upload
                      </button>
                    </div>
                  </div>
                )}

                {nomineeIdsChecked.voter && (
                  <div className="bg-white p-3 rounded-xl border border-slate-200 mb-3">
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">VOTER ID</label>
                    <input type="text" value={nomineeVoterId} onChange={e => setNomineeVoterId(e.target.value.toUpperCase())} placeholder="ABC1234567" className="w-full p-2 border border-slate-300 rounded outline-none font-bold text-slate-800 uppercase tracking-widest mb-2 bg-white text-xs" />
                    <div className="flex flex-wrap gap-2 mb-2">
                      {(nomineeKycDocs.voter || []).map((doc, idx) => (
                        <div key={idx} className="relative flex items-center bg-emerald-50 border border-emerald-200 rounded px-2 py-1 shadow-sm">
                          <span className="text-[10px] font-bold text-emerald-700 truncate max-w-[100px] cursor-pointer hover:underline" onClick={() => setPreviewDoc(doc)}>{doc.name}</span>
                          <button className="ml-1 text-rose-500 font-bold hover:text-rose-700 text-xs" onClick={() => removeNomineeKycDoc('voter', idx)}>✕</button>
                        </div>
                      ))}
                    </div>
                    <div className="relative inline-block">
                      <button onClick={() => setNomineeKycUploadTarget('voter')} className="text-[10px] bg-white border border-slate-300 px-2 py-1 rounded font-medium text-slate-700 shadow-sm flex items-center gap-1 hover:bg-slate-50 transition-colors">
                        Upload
                      </button>
                    </div>
                  </div>
                )}

                {nomineeIdsChecked.smartCard && (
                  <div className="bg-white p-3 rounded-xl border border-slate-200">
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">SMART CARD</label>
                    <input type="text" value={nomineeSmartCard} onChange={e => setNomineeSmartCard(e.target.value.toUpperCase())} placeholder="Card Number" className="w-full p-2 border border-slate-300 rounded outline-none font-bold text-slate-800 uppercase tracking-widest mb-2 bg-white text-xs" />
                    <div className="flex flex-wrap gap-2 mb-2">
                      {(nomineeKycDocs.smartCard || []).map((doc, idx) => (
                        <div key={idx} className="relative flex items-center bg-emerald-50 border border-emerald-200 rounded px-2 py-1 shadow-sm">
                          <span className="text-[10px] font-bold text-emerald-700 truncate max-w-[100px] cursor-pointer hover:underline" onClick={() => setPreviewDoc(doc)}>{doc.name}</span>
                          <button className="ml-1 text-rose-500 font-bold hover:text-rose-700 text-xs" onClick={() => removeNomineeKycDoc('smartCard', idx)}>✕</button>
                        </div>
                      ))}
                    </div>
                    <div className="relative inline-block">
                      <button onClick={() => setNomineeKycUploadTarget('smartCard')} className="text-[10px] bg-white border border-slate-300 px-2 py-1 rounded font-medium text-slate-700 shadow-sm flex items-center gap-1 hover:bg-slate-50 transition-colors">
                        Upload
                      </button>
                    </div>
                  </div>
                )}
              </div>
        </section>

        {/* Section 4: Address & ID */}
        <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">ADDRESS & VERIFICATION</h3>
          
          <div className="space-y-4">
            <div className="relative">
              <label className="block text-xs font-semibold text-slate-500 mb-1">Residential Address</label>
              <textarea value={address} onChange={e => setAddress(e.target.value)} rows="3" className="w-full p-3 border border-slate-200 rounded-xl outline-none font-medium text-slate-700 resize-none" placeholder="Full permanent address..."></textarea>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Pincode</label>
              <div className="flex gap-2">
                {pincode.map((digit, i) => (
                  <input key={`pin-${i}`} id={`pin-${i}`} type="text" inputMode="numeric" maxLength={1} value={digit} onChange={(e) => handlePincodeChange(i, e.target.value)} className="w-10 h-10 border border-slate-300 rounded text-center text-lg font-bold outline-none focus:border-brand-blue bg-white" />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Location GPS Coordinates</label>
              <div className="flex gap-2">
                <input type="text" readOnly value={locationUrl} placeholder="Auto-filled URL" className="flex-1 p-3 border border-slate-200 rounded-xl bg-slate-50 outline-none text-sm text-blue-500" />
                <button onClick={handleGetLocation} disabled={isFetchingLocation} className={`px-3 py-2 rounded-xl font-semibold text-xs border ${isFetchingLocation ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' : 'bg-blue-100 text-brand-blue border-blue-200'}`}>
                  {isFetchingLocation ? 'Fetching...' : 'Get Location'}
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <label className="block text-xs font-semibold text-slate-500 mb-3">ID Proof Verification</label>
              <div className="flex flex-wrap gap-3 mb-4">
                {Object.keys(idsChecked).map((key) => (
                  <label key={key} className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 cursor-pointer">
                    <input type="checkbox" checked={idsChecked[key]} onChange={(e) => setIdsChecked({...idsChecked, [key]: e.target.checked})} className="w-4 h-4 text-brand-blue rounded" />
                    <span className="text-sm font-medium text-slate-700">
                      {key === 'aadhaar' ? 'Aadhaar' : key === 'pan' ? 'PAN Card' : key === 'voter' ? 'Voter ID' : 'Smart Card'}
                    </span>
                  </label>
                ))}
              </div>

              {idsChecked.aadhaar && (
                <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-200 mb-3">
                  <label className="block text-[11px] font-bold text-amber-800 mb-2">AADHAAR CARD (FULL VISIBILITY)</label>
                  <div className="flex gap-1.5 flex-wrap mb-3">
                    {aadhaar.map((digit, i) => (
                      <React.Fragment key={`aadhaar-${i}`}>
                        <input id={`aadhaar-${i}`} type="text" inputMode="numeric" maxLength={1} value={digit} onChange={(e) => handleAadhaarChange(i, e.target.value)} className="w-8 h-10 border border-slate-300 rounded text-center font-bold outline-none focus:border-amber-500 bg-white" />
                        {(i === 3 || i === 7) && <span className="flex items-center text-slate-400 px-0.5">-</span>}
                      </React.Fragment>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {(kycDocs.aadhaar || []).map((doc, idx) => (
                      <div key={idx} className="relative flex items-center bg-emerald-50 border border-emerald-200 rounded px-2 py-1 shadow-sm">
                        <span className="text-xs font-bold text-emerald-700 truncate max-w-[150px] cursor-pointer hover:underline" onClick={() => setPreviewDoc(doc)}>{doc.name}</span>
                        <button className="ml-2 text-rose-500 font-bold hover:text-rose-700" onClick={() => removeKycDoc('aadhaar', idx)}>✕</button>
                      </div>
                    ))}
                  </div>
                  <div className="relative inline-block">
                    <button onClick={() => setKycUploadTarget('aadhaar')} className="text-xs bg-white border border-slate-300 px-3 py-1.5 rounded font-medium text-slate-700 shadow-sm flex items-center gap-1 hover:bg-slate-50 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-brand-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                      <span className="truncate max-w-[150px]">Upload Document</span>
                    </button>
                  </div>
                </div>
              )}

              {idsChecked.pan && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-3">
                  <label className="block text-[11px] font-bold text-slate-600 mb-2">PAN CARD (FULL VISIBILITY)</label>
                  <input type="text" value={pan} onChange={e => setPan(e.target.value.toUpperCase())} placeholder="ABCDE1234F" maxLength={10} className="w-full p-3 border border-slate-300 rounded-lg outline-none font-bold text-slate-800 uppercase tracking-widest mb-3 bg-white" />
                  <div className="flex flex-wrap gap-2 mb-2">
                    {(kycDocs.pan || []).map((doc, idx) => (
                      <div key={idx} className="relative flex items-center bg-emerald-50 border border-emerald-200 rounded px-2 py-1 shadow-sm">
                        <span className="text-xs font-bold text-emerald-700 truncate max-w-[150px] cursor-pointer hover:underline" onClick={() => setPreviewDoc(doc)}>{doc.name}</span>
                        <button className="ml-2 text-rose-500 font-bold hover:text-rose-700" onClick={() => removeKycDoc('pan', idx)}>✕</button>
                      </div>
                    ))}
                  </div>
                  <div className="relative inline-block">
                    <button onClick={() => setKycUploadTarget('pan')} className="text-xs bg-white border border-slate-300 px-3 py-1.5 rounded font-medium text-slate-700 shadow-sm flex items-center gap-1 hover:bg-slate-50 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-brand-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                      <span className="truncate max-w-[150px]">Upload Document</span>
                    </button>
                  </div>
                </div>
              )}

              {idsChecked.voter && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-3">
                  <label className="block text-[11px] font-bold text-slate-600 mb-2">VOTER ID (FULL VISIBILITY)</label>
                  <input type="text" value={voterId} onChange={e => setVoterId(e.target.value.toUpperCase())} placeholder="XYZ1234567" className="w-full p-3 border border-slate-300 rounded-lg outline-none font-bold text-slate-800 uppercase tracking-widest mb-3 bg-white" />
                  <div className="flex flex-wrap gap-2 mb-2">
                    {(kycDocs.voter || []).map((doc, idx) => (
                      <div key={idx} className="relative flex items-center bg-emerald-50 border border-emerald-200 rounded px-2 py-1 shadow-sm">
                        <span className="text-xs font-bold text-emerald-700 truncate max-w-[150px] cursor-pointer hover:underline" onClick={() => setPreviewDoc(doc)}>{doc.name}</span>
                        <button className="ml-2 text-rose-500 font-bold hover:text-rose-700" onClick={() => removeKycDoc('voter', idx)}>✕</button>
                      </div>
                    ))}
                  </div>
                  <div className="relative inline-block">
                    <button onClick={() => setKycUploadTarget('voter')} className="text-xs bg-white border border-slate-300 px-3 py-1.5 rounded font-medium text-slate-700 shadow-sm flex items-center gap-1 hover:bg-slate-50 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-brand-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                      <span className="truncate max-w-[150px]">Upload Document</span>
                    </button>
                  </div>
                </div>
              )}

              {idsChecked.smartCard && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-3">
                  <label className="block text-[11px] font-bold text-slate-600 mb-2">SMART CARD (FULL VISIBILITY)</label>
                  <input type="text" value={smartCard} onChange={e => setSmartCard(e.target.value)} inputMode="numeric" placeholder="333123456789" className="w-full p-3 border border-slate-300 rounded-lg outline-none font-bold text-slate-800 tracking-widest mb-3 bg-white" />
                  <div className="flex flex-wrap gap-2 mb-2">
                    {(kycDocs.smartCard || []).map((doc, idx) => (
                      <div key={idx} className="relative flex items-center bg-emerald-50 border border-emerald-200 rounded px-2 py-1 shadow-sm">
                        <span className="text-xs font-bold text-emerald-700 truncate max-w-[150px] cursor-pointer hover:underline" onClick={() => setPreviewDoc(doc)}>{doc.name}</span>
                        <button className="ml-2 text-rose-500 font-bold hover:text-rose-700" onClick={() => removeKycDoc('smartCard', idx)}>✕</button>
                      </div>
                    ))}
                  </div>
                  <div className="relative inline-block">
                    <button onClick={() => setKycUploadTarget('smartCard')} className="text-xs bg-white border border-slate-300 px-3 py-1.5 rounded font-medium text-slate-700 shadow-sm flex items-center gap-1 hover:bg-slate-50 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-brand-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                      <span className="truncate max-w-[150px]">Upload Document</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Section 5: Financial Details */}
        <section className="bg-blue-50/50 p-5 rounded-2xl border border-blue-200">
          <h3 className="text-xs font-bold text-brand-blue uppercase tracking-wider mb-4 border-b border-blue-100 pb-2">FINANCIAL & LOAN DETAILS</h3>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Loan Type</label>
                <select value={loanType} onChange={e => setLoanType(e.target.value)} className="w-full p-3 border border-slate-200 bg-white rounded-xl outline-none focus:border-brand-blue text-sm font-semibold text-slate-700">
                  <option>Micro Finance</option>
                  <option>Weekly</option>
                  <option>Daily</option>
                  <option>Personal Loan</option>
                  <option>Agri Loan</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Tenure</label>
                <div className="flex">
                  <input type="number" value={tenureVal} onChange={e => setTenureVal(e.target.value)} placeholder="12" className="w-14 p-3 border-y border-l border-slate-200 bg-white rounded-l-xl outline-none font-bold text-slate-700 text-center" />
                  <select value={tenureUnit} onChange={e => setTenureUnit(e.target.value)} className="flex-1 p-3 border border-slate-200 bg-white rounded-r-xl outline-none font-semibold text-slate-700 text-sm appearance-none">
                    <option>Months</option>
                    <option>Weeks</option>
                    <option>Days</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-3">
              <p className="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest text-center">Bi-Directional Computation Engine</p>
              <div className="grid grid-cols-3 gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 text-center">LOAN AMOUNT</label>
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                    <input type="number" value={loanAmount} onChange={(e) => handleFinancialChange('loanAmount', e.target.value)} className="w-full p-2 pl-5 border-b-2 border-slate-100 outline-none focus:border-brand-blue font-bold text-slate-800 text-sm text-center" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 text-center">RE-PAY AMOUNT</label>
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                    <input type="number" value={repayAmount} onChange={(e) => handleFinancialChange('repayAmount', e.target.value)} className="w-full p-2 pl-5 border-b-2 border-slate-100 outline-none focus:border-brand-blue font-bold text-emerald-600 text-sm text-center" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 text-center">INTEREST (%)</label>
                  <div className="relative">
                    <input type="number" value={interestPercent} onChange={(e) => handleFinancialChange('interestPercent', e.target.value)} className="w-full p-2 pr-5 border-b-2 border-slate-100 outline-none focus:border-brand-blue font-bold text-rose-500 text-sm text-center" />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

      </div>

      {/* Footer Action Bar */}
      <div className="absolute bottom-0 left-0 w-full bg-white px-4 py-3 border-t border-slate-200 flex justify-end gap-3 pb-safe z-10">
        <button onClick={onClose} className="px-6 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-colors">
          Cancel
        </button>
        <button onClick={handleSubmitClick} className="flex-1 py-3 bg-[#10a37f] rounded-xl font-bold text-white shadow-md shadow-[#10a37f]/30 hover:bg-[#0e906f] transition-colors text-lg tracking-wide">
          Submit
        </button>
      </div>

      {/* KYC Upload Action Sheet */}
      {nomineeKycUploadTarget && (
        <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-end justify-center p-4 animate-in fade-in duration-200" onClick={() => setNomineeKycUploadTarget(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden animate-in slide-in-from-bottom-8 duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-100 text-center bg-slate-50">
              <h3 className="font-bold text-slate-800">Upload Nominee Document</h3>
              <p className="text-xs text-slate-500 mt-1">Select a method to upload</p>
            </div>
            <div className="flex flex-col">
              <button onClick={() => triggerKycCamera(nomineeKycUploadTarget, true)} className="p-4 flex items-center justify-center gap-3 font-bold text-brand-blue hover:bg-slate-50 border-b border-slate-100 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                Open Camera
              </button>
              <div className="relative">
                <input type="file" accept=".jpg,.jpeg,.png,.pdf,image/*,application/pdf" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={e => { handleNomineeKycUpload(nomineeKycUploadTarget, e.target.files[0]); setNomineeKycUploadTarget(null); }} />
                <button className="w-full p-4 flex items-center justify-center gap-3 font-bold text-slate-700 hover:bg-slate-50 transition-colors border-b border-slate-100">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                  Browse Files
                </button>
              </div>
            </div>
            <div className="p-3 bg-slate-50">
              <button onClick={() => setNomineeKycUploadTarget(null)} className="w-full p-3 text-center font-bold text-rose-500 rounded-xl hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {kycUploadTarget && (
        <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-end justify-center p-4 animate-in fade-in duration-200" onClick={() => setKycUploadTarget(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden animate-in slide-in-from-bottom-8 duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-100 text-center bg-slate-50">
              <h3 className="font-bold text-slate-800 uppercase tracking-widest text-sm">Upload Document</h3>
              <p className="text-xs text-slate-500 mt-1 font-medium">Supported: JPG, PNG, PDF</p>
            </div>
            <div className="flex flex-col">
              <button onClick={() => triggerKycCamera(kycUploadTarget)} className="p-4 flex items-center justify-center gap-3 font-bold text-brand-blue hover:bg-slate-50 border-b border-slate-100 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                Open Camera
              </button>
              <div className="relative">
                <input type="file" accept=".jpg,.jpeg,.png,.pdf,image/*,application/pdf" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={e => { handleKycUpload(kycUploadTarget, e.target.files[0]); setKycUploadTarget(null); }} />
                <button className="w-full p-4 flex items-center justify-center gap-3 font-bold text-slate-700 hover:bg-slate-50 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                  Choose from Files
                </button>
              </div>
            </div>
            <div className="p-3 bg-slate-50">
              <button onClick={() => setKycUploadTarget(null)} className="w-full p-3 text-center font-bold text-rose-500 rounded-xl hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Photo Upload Action Sheet */}
      {photoActionSheetOpen && !cropImageSrc && (
        <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-end justify-center p-4 animate-in fade-in duration-200" onClick={() => setPhotoActionSheetOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden animate-in slide-in-from-bottom-8 duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-100 text-center bg-slate-50">
              <h3 className="font-bold text-slate-800 uppercase tracking-widest text-sm">Profile Photo</h3>
            </div>
            <div className="flex flex-col">
              <button onClick={() => triggerMainCamera(CameraSource.Camera)} className="p-4 flex items-center justify-center gap-3 font-bold text-brand-blue hover:bg-slate-50 border-b border-slate-100 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                Take Photo
              </button>
              <button onClick={() => triggerMainCamera(CameraSource.Photos)} className="p-4 flex items-center justify-center gap-3 font-bold text-slate-700 hover:bg-slate-50 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                Choose Photo
              </button>
            </div>
            <div className="p-3 bg-slate-50">
              <button onClick={() => setPhotoActionSheetOpen(false)} className="w-full p-3 text-center font-bold text-rose-500 rounded-xl hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Document Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-[200] bg-slate-900/95 flex flex-col p-4 animate-in fade-in duration-200">
          <div className="flex justify-end mb-4">
            <button onClick={() => setPreviewDoc(null)} className="p-2 bg-slate-800 text-white rounded-full hover:bg-slate-700 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center overflow-hidden rounded-lg">
            {previewDoc.name.toLowerCase().endsWith('.pdf') ? (
              <PdfViewer fileUrl={previewDoc.url} />
            ) : (
              <img src={previewDoc.url} alt={previewDoc.name} className="max-w-full max-h-full object-contain rounded-lg" />
            )}
          </div>
        </div>
      )}

      {/* Image Cropping Modal */}
      {cropImageSrc && (
        <ImageCropModal 
          imageSrc={cropImageSrc}
          onCropComplete={handleCropComplete}
          onCancel={() => setCropImageSrc(null)}
        />
      )}
    </div>
  );
};

export default AddCustomerModal;