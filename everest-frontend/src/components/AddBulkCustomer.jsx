import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { collection, doc, writeBatch, serverTimestamp, query, where, getDocs, onSnapshot, orderBy, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { UploadCloud, CheckCircle2, FileText, Loader2, PlayCircle, AlertCircle, Trash2 } from 'lucide-react';

const AddBulkCustomer = ({ activeBranch }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [batches, setBatches] = useState([]);
  const [approvingBatchId, setApprovingBatchId] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!activeBranch?.id) return;
    const q = query(
      collection(db, 'uploadBatches'),
      where('branchId', '==', activeBranch.id),
      orderBy('uploadedAt', 'desc')
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const fetchedBatches = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        uploadedAt: doc.data().uploadedAt?.toDate()
      }));
      setBatches(fetchedBatches);
    });
    return () => unsub();
  }, [activeBranch?.id]);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await processFile(files[0]);
    }
  };

  const handleFileChange = async (e) => {
    if (e.target.files.length > 0) {
      await processFile(e.target.files[0]);
    }
  };

  const processFile = async (file) => {
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      alert('Please upload a valid Excel or CSV file.');
      return;
    }

    setIsProcessing(true);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

      if (jsonData.length === 0) {
        alert('File is empty.');
        return;
      }

      const customersToStage = [];
      const batchId = `BATCH_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

      jsonData.forEach((row, index) => {
        // Case-insensitive header mapping
        const keys = Object.keys(row);
        const getValue = (...possibleKeys) => {
          for (let p of possibleKeys) {
            const foundKey = keys.find(k => k.replace(/\s+/g, '').toLowerCase() === p.replace(/\s+/g, '').toLowerCase());
            if (foundKey !== undefined && row[foundKey] !== "") {
              return row[foundKey];
            }
          }
          return null;
        };

        const rawDate = getValue('apply date', 'date', 'applydate');
        let applyDate = new Date().toISOString().split('T')[0];
        if (rawDate) {
          // Attempt parsing Excel date serial or standard date string
          if (!isNaN(rawDate)) {
             applyDate = new Date(Math.round((rawDate - 25569) * 86400 * 1000)).toISOString().split('T')[0];
          } else {
             const parsed = new Date(rawDate);
             if (!isNaN(parsed)) applyDate = parsed.toISOString().split('T')[0];
          }
        }

        const name = getValue('customer name', 'customer', 'name');
        const tenureRaw = getValue('tenure', 'days', 'duration');
        const loanAmountRaw = getValue('loan amount', 'principal', 'amount');
        const repayAmountRaw = getValue('repay amount', 'total repay', 'repayment');
        const disbursedAmountRaw = getValue('disbursed amount', 'disburse amount');
        const loanTypeRaw = getValue('loan type', 'type');
        const phone = getValue('phone', 'phone number', 'mobile');

        if (!name) return; // Skip entirely empty/invalid rows

        const cleanNumber = (val) => {
          if (val === null || val === undefined) return 0;
          return parseFloat(String(val).replace(/,/g, '')) || 0;
        };

        const parsedLoan = cleanNumber(loanAmountRaw);
        const parsedRepay = cleanNumber(repayAmountRaw);
        const parsedDisbursed = cleanNumber(disbursedAmountRaw);
        const principal = parsedDisbursed > 0 ? parsedDisbursed : parsedLoan;
        const interestPercent = (principal > 0 && parsedRepay > 0) ? (((parsedRepay - principal) / principal) * 100).toFixed(2) : '';

        const generatedId = `EMF${String(Math.floor(1000000 + Math.random() * 9000000))}`;
        const appNumber = Math.floor(1000000000 + Math.random() * 9000000000);

        customersToStage.push({
          id: generatedId,
          customerId: generatedId,
          applicationNumber: appNumber.toString(),
          name: name ? String(name).trim() : 'Unknown',
          customerName: name ? String(name).trim() : 'Unknown',
          date: applyDate,
          appDate: applyDate,
          status: 'Pending',
          tenureVal: cleanNumber(tenureRaw).toString(),
          loanAmount: parsedLoan,
          repayAmount: parsedRepay,
          disbursedAmount: parsedDisbursed,
          interestPercent: interestPercent,
          loanType: loanTypeRaw ? String(loanTypeRaw).trim() : 'Unknown',
          phone: phone ? String(phone).trim() : '',
          uploadBatchId: batchId,
          uploadedFileName: file.name,
          branchId: activeBranch?.id || 'main',
          branchName: activeBranch?.name || 'Main Branch',
          branch: activeBranch?.name || 'Main Branch',
          staffId: 'unassigned',
          staffName: 'Unassigned',
          staff: 'Unassigned',
          category: 'Upcoming',
          // Defaults for missing data
          gender: 'Female',
          maritalStatus: 'Married',
          center: 'Unassigned',
          city: '',
          district: '',
          uploadedAt: serverTimestamp()
        });
      });

      if (customersToStage.length === 0) {
        alert('No valid customer data found to process.');
        return;
      }

      // Chunked Batch Writing for robust staging
      const CHUNK_SIZE = 400;
      for (let i = 0; i < customersToStage.length; i += CHUNK_SIZE) {
        const chunk = customersToStage.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);
        chunk.forEach(cust => {
          const docRef = doc(collection(db, 'customers'), cust.id);
          batch.set(docRef, cust);
        });
        await batch.commit();
      }

      // Write Summary Batch Record
      const batchSummaryRef = doc(collection(db, 'uploadBatches'), batchId);
      const storedProfile = localStorage.getItem('everest_user_profile');
      const userProfile = storedProfile ? JSON.parse(storedProfile) : null;
      
      await writeBatch(db).set(batchSummaryRef, {
        fileName: file.name,
        totalCustomers: customersToStage.length,
        status: 'Pending Review',
        branchId: activeBranch?.id || 'main',
        branchName: activeBranch?.name || 'Main Branch',
        uploadedBy: userProfile?.email || 'admin',
        uploadedAt: serverTimestamp()
      }).commit();

    } catch (error) {
      console.error('Error parsing file:', error);
      alert('Failed to parse file: ' + error.message);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
      setIsProcessing(false);
    }
  };

  const handleBulkApprove = async (batchRecord) => {
    if (!window.confirm(`Are you sure you want to approve all ${batchRecord.totalCustomers} customers from ${batchRecord.fileName}?`)) return;
    
    setApprovingBatchId(batchRecord.id);
    try {
      const q = query(collection(db, 'customers'), where('uploadBatchId', '==', batchRecord.id));
      const snapshot = await getDocs(q);
      
      const customers = [];
      snapshot.forEach(doc => customers.push({ docId: doc.id, ...doc.data() }));

      const CHUNK_SIZE = 400;
      for (let i = 0; i < customers.length; i += CHUNK_SIZE) {
        const chunk = customers.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);

        chunk.forEach(cust => {
          const docRef = doc(db, 'customers', cust.docId);
          
          // Use the specific customer's apply date, fallback to today if missing
          const applyDateStr = cust.date || cust.appDate || new Date().toISOString().split('T')[0];
          const approvalDateObj = new Date(applyDateStr);
          approvalDateObj.setDate(approvalDateObj.getDate() + 1);
          const customerApprovalDate = approvalDateObj.toISOString().split('T')[0];
          
          let nextDueDate = '';
          const loanType = (cust.loanType || cust.scheme || '').toLowerCase();
          const d = new Date(customerApprovalDate);
          
          if (loanType.includes('daily')) {
            d.setDate(d.getDate() + 1);
            nextDueDate = d.toISOString().split('T')[0];
          } else if (loanType.includes('weekly')) {
            d.setDate(d.getDate() + 7);
            nextDueDate = d.toISOString().split('T')[0];
          } else if (loanType.includes('monthly') || loanType.includes('personal') || loanType.includes('agri')) {
            d.setMonth(d.getMonth() + 1);
            nextDueDate = d.toISOString().split('T')[0];
          } else {
            d.setDate(d.getDate() + 1);
            nextDueDate = d.toISOString().split('T')[0];
          }

          batch.update(docRef, { 
            status: 'Approved', 
            approvalDate: customerApprovalDate,
            nextDueDate: nextDueDate,
            lastUpdated: new Date().toISOString() 
          });
        });
        await batch.commit();
      }

      // Update Summary Status
      const summaryRef = doc(db, 'uploadBatches', batchRecord.id);
      const summaryBatch = writeBatch(db);
      summaryBatch.update(summaryRef, { status: 'All Approved' });
      await summaryBatch.commit();

    } catch (error) {
      console.error('Error during bulk approve:', error);
      alert('Failed to bulk approve: ' + error.message);
    } finally {
      setApprovingBatchId(null);
    }
  };

  const handleDeleteBatch = async (batchRecord) => {
    if (!window.confirm(`Are you sure you want to delete batch "${batchRecord.fileName}"? This will also delete all ${batchRecord.totalCustomers} associated customers.`)) return;

    try {
      // 1. Query and delete all customers in this batch
      const q = query(collection(db, 'customers'), where('uploadBatchId', '==', batchRecord.id));
      const snapshot = await getDocs(q);
      
      const customersToDelete = [];
      snapshot.forEach(doc => customersToDelete.push(doc.id));

      const CHUNK_SIZE = 400;
      for (let i = 0; i < customersToDelete.length; i += CHUNK_SIZE) {
        const chunk = customersToDelete.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);
        chunk.forEach(docId => {
          batch.delete(doc(db, 'customers', docId));
        });
        await batch.commit();
      }

      // 2. Delete the batch summary document
      await deleteDoc(doc(db, 'uploadBatches', batchRecord.id));

    } catch (error) {
      console.error('Error deleting batch:', error);
      alert('Failed to delete batch: ' + error.message);
    }
  };

  return (
    <div className="p-4 md:p-6 w-full max-w-6xl mx-auto h-[100dvh] flex flex-col overflow-y-auto bg-slate-50 md:h-auto md:min-h-screen">
      <div className="mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-slate-800">Add Bulk Customer</h2>
        <p className="text-slate-500 text-sm mt-1">Upload multiple customer records and stage them for immediate bulk approval.</p>
      </div>

      {/* Persistent Drag & Drop Zone */}
      <div 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isProcessing && fileInputRef.current?.click()}
        className={`w-full border-2 border-dashed rounded-2xl p-8 md:p-12 flex flex-col items-center justify-center text-center transition-all ${
          isProcessing ? 'border-slate-300 bg-slate-50 cursor-wait' :
          isDragging ? 'border-blue-500 bg-blue-50/50' : 
          'border-blue-300 bg-white hover:bg-blue-50/30 cursor-pointer shadow-sm hover:shadow-md'
        }`}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept=".xlsx, .xls, .csv" 
          className="hidden" 
          disabled={isProcessing}
        />
        
        {isProcessing ? (
          <div className="flex flex-col items-center animate-in fade-in">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
            <p className="font-bold text-slate-700 text-lg">Parsing and staging customer records...</p>
            <p className="text-slate-500 text-sm mt-2">Please wait while we process your file safely.</p>
          </div>
        ) : (
          <div className="flex flex-col items-center pointer-events-none">
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
              <UploadCloud size={32} />
            </div>
            <p className="font-bold text-slate-800 text-lg md:text-xl mb-1">Drag and drop your file here</p>
            <p className="text-slate-500 text-sm">or click to browse (.csv, .xlsx)</p>
            <div className="mt-6 px-6 py-2.5 bg-white border border-slate-200 shadow-sm rounded-xl font-semibold text-slate-700 hover:bg-slate-50 hover:shadow pointer-events-auto">
              Browse Files
            </div>
          </div>
        )}
      </div>

      {/* Batch Summary Table */}
      <div className="mt-8 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 md:p-5 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <FileText size={18} className="text-slate-500" /> Uploaded Batches
          </h3>
        </div>
        
        {batches.length === 0 ? (
          <div className="p-8 text-center text-slate-500 flex flex-col items-center justify-center">
            <AlertCircle size={32} className="text-slate-300 mb-3" />
            <p className="font-medium text-slate-600">No batches uploaded yet</p>
            <p className="text-sm mt-1">Upload an Excel file above to see batches here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 bg-slate-50/80 uppercase border-b border-slate-200 font-semibold">
                <tr>
                  <th className="px-4 py-3 w-16 text-center">#</th>
                  <th className="px-4 py-3">Upload Date & Time</th>
                  <th className="px-4 py-3">File Name</th>
                  <th className="px-4 py-3 text-center">Total Customers</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {batches.map((batch, index) => {
                  const isApproved = batch.status === 'All Approved';
                  const isPending = batch.status === 'Pending Review';
                  const isBtnLoading = approvingBatchId === batch.id;

                  return (
                    <tr key={batch.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3.5 text-center font-medium text-slate-500">{index + 1}</td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="font-medium text-slate-800">
                          {batch.uploadedAt ? new Intl.DateTimeFormat('en-IN', {
                            day: '2-digit', month: '2-digit', year: 'numeric'
                          }).format(batch.uploadedAt) : '-'}
                        </div>
                        <div className="text-xs text-slate-500">
                          {batch.uploadedAt ? new Intl.DateTimeFormat('en-IN', {
                            hour: '2-digit', minute: '2-digit', hour12: true
                          }).format(batch.uploadedAt) : '-'}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-medium text-slate-700">{batch.fileName}</td>
                      <td className="px-4 py-3.5 text-center font-bold text-slate-800">{batch.totalCustomers}</td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold border ${
                          isApproved ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                          'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {isApproved && <CheckCircle2 size={12} />}
                          {batch.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 flex justify-end gap-2 items-center">
                        {isPending ? (
                          <button
                            onClick={() => handleBulkApprove(batch)}
                            disabled={isBtnLoading}
                            className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-lg font-bold text-white shadow-sm transition-all ${
                              isBtnLoading ? 'bg-emerald-400 cursor-wait' : 'bg-emerald-600 hover:bg-emerald-500 hover:shadow active:scale-95'
                            }`}
                          >
                            {isBtnLoading ? (
                              <><Loader2 size={16} className="animate-spin" /> Approving...</>
                            ) : (
                              <><PlayCircle size={16} /> Bulk Approve</>
                            )}
                          </button>
                        ) : (
                          <button disabled className="inline-flex items-center px-4 py-1.5 rounded-lg font-bold text-slate-400 bg-slate-100 border border-slate-200 cursor-not-allowed">
                            Approved
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteBatch(batch)}
                          className="inline-flex items-center p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-600 transition-colors border border-transparent hover:border-rose-200 ml-2"
                          title="Delete Batch"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddBulkCustomer;
