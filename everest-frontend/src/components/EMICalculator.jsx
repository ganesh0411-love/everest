import React, { useRef, useEffect, useState } from 'react';

// ─── Indian Number to Words ──────────────────────────────────────────────────
const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven',
  'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen',
  'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty',
  'Sixty', 'Seventy', 'Eighty', 'Ninety'];

const twoDigits = (n) => {
  if (n < 20) return ones[n];
  return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
};

const toWords = (n) => {
  let num = Number(n);
  if (!num || num <= 0) return 'Zero Only';
  let parts = [];
  if (num >= 10000000) { parts.push(twoDigits(Math.floor(num / 10000000)) + ' Crore'); num %= 10000000; }
  if (num >= 100000)   { parts.push(twoDigits(Math.floor(num / 100000))   + ' Lakh');  num %= 100000;  }
  if (num >= 1000)     { parts.push(twoDigits(Math.floor(num / 1000))     + ' Thousand'); num %= 1000; }
  if (num >= 100)      { parts.push(ones[Math.floor(num / 100)]           + ' Hundred'); num %= 100;   }
  if (num > 0)         { parts.push(twoDigits(num)); }
  return parts.join(' ') + ' Only';
};

// ─── Auto-Shrink Single-Line Text ────────────────────────────────────────────
const ShrinkText = ({ text, maxSize = 10.5, minSize = 6.5, style = {} }) => {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let size = maxSize;
    el.style.fontSize = size + 'px';
    while (el.scrollWidth > el.offsetWidth + 1 && size > minSize) {
      size -= 0.25;
      el.style.fontSize = size + 'px';
    }
  }, [text, maxSize, minSize]);

  return (
    <p
      ref={ref}
      style={{
        margin: 0, fontSize: maxSize + 'px', fontWeight: 600,
        color: '#7a7a7a', fontStyle: 'italic', whiteSpace: 'nowrap',
        overflow: 'hidden', lineHeight: 1.4, ...style,
      }}
    >
      {text}
    </p>
  );
};

// ─── Currency Input ───────────────────────────────────────────────────────────
const CurrencyInput = ({ value, onChange, color, fontSize = 17, autoWidth, style }) => {
  const [focused, setFocused] = useState(false);
  const displayVal = focused ? value : (value ? Number(value).toLocaleString('en-IN') : '');

  return (
    <input
      type="text"
      inputMode="decimal"
      value={displayVal}
      onChange={(e) => {
        const raw = e.target.value.replace(/[^0-9]/g, '');
        onChange(raw);
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      placeholder="0"
      style={{
        background: 'transparent', border: 'none', outline: 'none',
        fontSize, fontWeight: 900, color,
        fontFamily: "'Inter', 'Roboto', Arial, sans-serif",
        padding: 0, margin: 0,
        width: autoWidth ? `${Math.max(1, displayVal.length)}ch` : '100%',
        minWidth: autoWidth ? '20px' : 'auto',
        ...style
      }}
    />
  );
};

// ─── Math Calculation Engine (Reducing Balance) ──────────────────────────────
const getK = (unit) => {
  if (unit === 'Years') return 1;
  if (unit === 'Months') return 12;
  if (unit === 'Weeks') return 52;
  if (unit === 'Days') return 365;
  return 12;
};

const calcEmi = (P, R, n, k) => {
  if (R === 0) return P / n;
  if (n === 0) return 0;
  const r = R / (k * 100);
  const num = P * r * Math.pow(1 + r, n);
  const den = Math.pow(1 + r, n) - 1;
  return num / den;
};

const calcTenure = (P, R, E, k) => {
  if (R === 0) return P / E;
  const r = R / (k * 100);
  if (E <= P * r) return 0;
  return Math.log(E / (E - P * r)) / Math.log(1 + r);
};

const calcRateBinary = (P, E, n, k) => {
  if (P <= 0 || E <= 0 || n <= 0) return 0;
  if (E * n <= P) return 0; 
  
  let low = 0.000001; 
  let high = 1.0; 
  let mid = 0;
  
  for (let i = 0; i < 50; i++) {
    mid = (low + high) / 2;
    let val = P * mid * Math.pow(1 + mid, n) - E * (Math.pow(1 + mid, n) - 1);
    if (val > 0) high = mid; 
    else low = mid;
  }
  return mid * k * 100;
};

const calcPrincipal = (R, n, E, k) => {
  if (R === 0) return E * n;
  if (n === 0) return 0;
  const r = R / (k * 100);
  const factor = Math.pow(1 + r, n);
  return (E * (factor - 1)) / (r * factor);
};

const solveTenureFromRepay = (P, R, A, k) => {
  if (R === 0) return P > 0 ? A / P : 0; 
  if (A <= P) return 0; 
  const r = R / (k * 100);
  
  let low = 0.001;
  let high = 1200; 
  for (let i = 0; i < 50; i++) {
    let mid = (low + high) / 2;
    let val = mid * P * r * Math.pow(1+r, mid) - A * (Math.pow(1+r, mid) - 1);
    if (val > 0) high = mid; 
    else low = mid;
  }
  return (low + high) / 2;
};

// ─── Flat Rate Helpers (Conditional Annualization) ──────────────────────────────
const calcEmiFlat = (P, R, n, unit) => {
  if (n <= 0) return 0;
  let totalRate = R;
  if (unit === 'Months') totalRate = R * (n / 12);
  else if (unit === 'Years') totalRate = R * n;
  const I = P * (totalRate / 100);
  return (P + I) / n;
};

const calcTenureFlat = (P, R, E, unit) => {
  if (E <= 0 || P <= 0) return 0;
  if (unit === 'Months') {
     const denom = E - ((P * R) / 1200);
     return denom > 0 ? P / denom : 0;
  } else if (unit === 'Years') {
     const denom = E - ((P * R) / 100);
     return denom > 0 ? P / denom : 0;
  } else {
     return (P + P * (R / 100)) / E;
  }
};

const calcRateFlat = (P, E, n, unit) => {
  if (P <= 0 || n <= 0) return 0;
  const A = E * n;
  const I = A - P;
  if (I < 0) return 0;
  const totalRate = (I / P) * 100;
  if (unit === 'Months') return totalRate / (n / 12);
  if (unit === 'Years') return totalRate / n;
  return totalRate;
};

const calcPrincipalFlat = (R, n, E, unit) => {
  let totalRate = R;
  if (unit === 'Months') totalRate = R * (n / 12);
  else if (unit === 'Years') totalRate = R * n;
  const factor = 1 + (totalRate / 100);
  if (factor <= 0) return 0;
  return (E * n) / factor;
};

const solveTenureFromRepayFlat = (P, R, A, currN, unit) => {
  if (unit === 'Months') {
     if (P * R === 0) return currN;
     return ((A - P) * 1200) / (P * R);
  }
  if (unit === 'Years') {
     if (P * R === 0) return currN;
     return ((A - P) * 100) / (P * R);
  }
  return currN;
};

const DonutChart = ({ principal, interest, total, emi, isPaidTenureMode, interestPaid }) => {
  const SIZE = 200;
  const SW   = 32;
  const R    = (SIZE - SW) / 2;
  const CIRC = 2 * Math.PI * R;
  const CX   = SIZE / 2;
  const CY   = SIZE / 2;

  const sum  = principal + interest + total;
  const safeSum = sum > 0 ? sum : 1;
  const bLen = CIRC * (principal / safeSum);
  const rLen = CIRC * (interest  / safeSum);
  const oLen = CIRC * (total     / safeSum);
  const GAP  = sum > 0 ? CIRC * 0.008 : 0;

  const rotate = `rotate(-90 ${CX} ${CY})`;

  const centerValue = isPaidTenureMode ? interestPaid : emi;

  return (
    <div className="relative w-[75px] h-[75px] md:w-[200px] md:h-[200px]">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full h-full">
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="#e0e0e0" strokeWidth={SW} />
        {sum > 0 && (
          <>
            <circle cx={CX} cy={CY} r={R} fill="none" stroke="#4a148c"
              strokeWidth={SW} strokeDasharray={`${Math.max(0, bLen - GAP)} ${CIRC}`}
              strokeDashoffset={0} transform={rotate} />
            <circle cx={CX} cy={CY} r={R} fill="none" stroke="#990000"
              strokeWidth={SW} strokeDasharray={`${Math.max(0, rLen - GAP)} ${CIRC}`}
              strokeDashoffset={-(bLen + GAP)} transform={rotate} />
            <circle cx={CX} cy={CY} r={R} fill="none" stroke="#cc5200"
              strokeWidth={SW} strokeDasharray={`${Math.max(0, oLen - GAP)} ${CIRC}`}
              strokeDashoffset={-(bLen + GAP + rLen + GAP)} transform={rotate} />
          </>
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-0 md:gap-0.5">
        {isPaidTenureMode ? (
          <div className="text-center leading-[1.1]">
            <p className="m-0 text-[7px] md:text-[13px] font-black text-gray-500 tracking-widest uppercase font-sans">Interest</p>
            <p className="m-0 text-[7px] md:text-[13px] font-black text-gray-500 tracking-widest uppercase font-sans">Paid</p>
          </div>
        ) : (
          <p className="m-0 text-[8px] md:text-[14px] font-black text-gray-500 tracking-widest uppercase font-sans">EMI</p>
        )}
        <p className="m-0 text-[10px] md:text-[22px] font-black text-[#0A1F6E] tracking-tighter">
          ₹ {Number(centerValue).toLocaleString('en-IN')}
        </p>
      </div>
    </div>
  );
};

// ─── Calculator + Coins + % Icon ─────────────────────────────────────────────
const EMIIcon = () => (
  <svg width="52" height="52" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g transform="translate(4,4)" opacity="0.25">
      <rect x="38" y="8" width="48" height="62" rx="5" fill="#4CAF50"/>
      <ellipse cx="28" cy="74" rx="16" ry="5" fill="#4CAF50"/>
      <ellipse cx="28" cy="68" rx="16" ry="5" fill="#4CAF50"/>
      <ellipse cx="28" cy="62" rx="16" ry="5" fill="#4CAF50"/>
    </g>
    <circle cx="14" cy="22" r="6" stroke="#1a1a1a" strokeWidth="3.5" fill="none"/>
    <circle cx="28" cy="36" r="6" stroke="#1a1a1a" strokeWidth="3.5" fill="none"/>
    <line x1="8" y1="42" x2="34" y2="16" stroke="#1a1a1a" strokeWidth="3.5" strokeLinecap="round"/>
    <ellipse cx="30" cy="62" rx="14" ry="4.5" fill="#1a1a1a"/>
    <ellipse cx="30" cy="62" rx="11" ry="3" fill="#fff"/>
    <path d="M16 62 Q16 67 30 67 Q44 67 44 62" fill="#1a1a1a"/>
    <ellipse cx="30" cy="68" rx="14" ry="4.5" fill="#1a1a1a"/>
    <ellipse cx="30" cy="68" rx="11" ry="3" fill="#fff"/>
    <path d="M16 68 Q16 73 30 73 Q44 73 44 68" fill="#1a1a1a"/>
    <ellipse cx="30" cy="74" rx="14" ry="4.5" fill="#1a1a1a"/>
    <ellipse cx="30" cy="74" rx="11" ry="3" fill="#fff"/>
    <text x="26" y="64.5" fontSize="6" fontWeight="bold" fill="#1a1a1a" fontFamily="Arial">₹</text>
    <line x1="10" y1="72" x2="6"  y2="75" stroke="#1a1a1a" strokeWidth="2.5" strokeLinecap="round"/>
    <line x1="8"  y1="65" x2="3"  y2="65" stroke="#1a1a1a" strokeWidth="2.5" strokeLinecap="round"/>
    <line x1="9"  y1="58" x2="5"  y2="55" stroke="#1a1a1a" strokeWidth="2.5" strokeLinecap="round"/>
    <rect x="44" y="8" width="48" height="66" rx="5" fill="#1a1a1a"/>
    <rect x="47" y="11" width="42" height="60" rx="3" fill="white"/>
    <rect x="51" y="15" width="34" height="14" rx="2" fill="#1a1a1a"/>
    <text x="67" y="25.5" fontSize="7" fontWeight="bold" fill="white" fontFamily="Arial" textAnchor="middle">9,542</text>
    <rect x="51" y="34" width="9" height="7" rx="1.5" fill="#1a1a1a"/>
    <rect x="63" y="34" width="9" height="7" rx="1.5" fill="#1a1a1a"/>
    <rect x="75" y="34" width="9" height="7" rx="1.5" fill="#1a1a1a"/>
    <rect x="51" y="44" width="9" height="7" rx="1.5" fill="#1a1a1a"/>
    <rect x="63" y="44" width="9" height="7" rx="1.5" fill="#1a1a1a"/>
    <rect x="75" y="44" width="9" height="7" rx="1.5" fill="#1a1a1a"/>
    <rect x="51" y="54" width="9" height="7" rx="1.5" fill="#1a1a1a"/>
    <rect x="63" y="54" width="9" height="7" rx="1.5" fill="#1a1a1a"/>
    <rect x="75" y="54" width="9" height="7" rx="1.5" fill="#1a1a1a"/>
    <rect x="51" y="64" width="21" height="7" rx="1.5" fill="#1a1a1a"/>
    <rect x="75" y="64" width="9"  height="7" rx="1.5" fill="#1a1a1a"/>
    <circle cx="55.5" cy="37.5" r="1.5" fill="white"/>
    <circle cx="67.5" cy="37.5" r="1.5" fill="white"/>
    <circle cx="79.5" cy="37.5" r="1.5" fill="white"/>
    <circle cx="55.5" cy="47.5" r="1.5" fill="white"/>
    <circle cx="67.5" cy="47.5" r="1.5" fill="white"/>
    <circle cx="79.5" cy="47.5" r="1.5" fill="white"/>
    <circle cx="55.5" cy="57.5" r="1.5" fill="white"/>
    <circle cx="67.5" cy="57.5" r="1.5" fill="white"/>
    <circle cx="79.5" cy="57.5" r="1.5" fill="white"/>
    <text x="61.5" y="69.5" fontSize="5" fill="white" fontWeight="bold" fontFamily="Arial" textAnchor="middle">=</text>
    <circle cx="79.5" cy="67.5" r="1.5" fill="white"/>
  </svg>
);

const SectionLabel = ({ children }) => (
  <p className="m-0 mb-1.5 md:mb-2 text-[10px] md:text-[11.5px] font-black text-[#1a1a1a] tracking-wider uppercase font-sans">
    {children}
  </p>
);

const AmountRow = ({ label, amount, color, showDivider = true }) => (
  <div className={`pb-0 md:pb-3 mb-0 md:mb-3 ${showDivider ? 'md:border-b border-[#e0e0e0]' : ''}`}>
    <p className="m-0 mb-0.5 text-[9px] md:text-[12.5px] font-bold text-slate-800 tracking-tight leading-tight whitespace-nowrap">
      {label}
    </p>
    <p className="m-0 mb-0.5 text-[11px] md:text-[19px] font-black leading-tight tracking-tighter whitespace-nowrap" style={{ color }}>
      ₹ {Number(amount).toLocaleString('en-IN')}
    </p>
    <div className="hidden md:block">
      <ShrinkText text={toWords(amount)} maxSize={10.5} minSize={6.5} />
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const EMICalculator = ({ onBack }) => {
  const emptyInputs = {
    principal: '',
    rate: '',
    flatRate: '',
    flatRatePm: '',
    tenure: '',
    paidTenure: '',
    tenureUnit: 'Weeks',
    emi: '',
    repay: ''
  };

  const flatOutputs = {
    principal: 10000,
    repay: 12600,
    emi: 1050,
    totalInt: 2600
  };

  const bankingOutputs = {
    principal: 100000,
    repay: 108000,
    emi: 9000,
    totalInt: 8000,
    principalPaid: 0,
    outstandingAmount: 0
  };

  const [calcMode, setCalcMode] = useState('Flat');
  const [showModeMenu, setShowModeMenu] = useState(false);
  const [inputs, setInputs] = useState(emptyInputs);
  const [calcOutputs, setCalcOutputs] = useState(flatOutputs);

  const [editedFields, setEditedFields] = useState([]);
  const [pmFocused, setPmFocused] = useState(false);
  const [paFocused, setPaFocused] = useState(false);
  const [rateFocused, setRateFocused] = useState(false);
  const [isPaidTenureActive, setIsPaidTenureActive] = useState(false);
  const [showTenureMenu, setShowTenureMenu] = useState(false);
  const [showTenureUnitMenu, setShowTenureUnitMenu] = useState(false);

  useEffect(() => {
    const handleDismiss = () => {
      setShowModeMenu(false);
      setShowTenureMenu(false);
      setShowTenureUnitMenu(false);
    };
    if (showModeMenu || showTenureMenu || showTenureUnitMenu) {
      window.addEventListener('scroll', handleDismiss, true);
      window.addEventListener('click', handleDismiss);
    }
    return () => {
      window.removeEventListener('scroll', handleDismiss, true);
      window.removeEventListener('click', handleDismiss);
    };
  }, [showModeMenu, showTenureMenu, showTenureUnitMenu]);

  const handleModeChange = (mode) => {
    setCalcMode(mode);
    setInputs({
      principal: '',
      rate: '',
      flatRate: '',
      flatRatePm: '',
      tenure: '',
      paidTenure: '',
      tenureUnit: mode === 'Flat' ? 'Weeks' : 'Months',
      emi: '',
      repay: ''
    });
    setCalcOutputs(mode === 'Flat' ? flatOutputs : bankingOutputs);
    setEditedFields([]);
    setIsPaidTenureActive(false);
  };

  const handleEdit = (field, val) => {
    setInputs(prev => {
      const next = { ...prev, [field]: val };
      if (field === 'flatRate') {
        next.flatRatePm = val === '' ? '' : (Number(val) / 12).toFixed(2);
      } else if (field === 'flatRatePm') {
        next.flatRate = val === '' ? '' : (Number(val) * 12).toFixed(2);
      }
      return next;
    });
    setEditedFields(prev => {
      let arr = prev.filter(f => f !== field);
      if (field === 'flatRate' || field === 'flatRatePm') {
         arr = arr.filter(f => f !== 'flatRate' && f !== 'flatRatePm');
         arr.push('flatRate');
      } else {
         arr.push(field);
      }
      return arr;
    });
  };

  const handleCalculate = () => {
    let activeKnowns = [...editedFields].filter(k => k !== 'paidTenure');
    let overrideRepay = null;

    if (activeKnowns.includes('flatRate')) {
      let pTemp = Number(inputs.principal) || 0;
      let fRateTemp = Number(inputs.flatRate) || 0;
      let nTemp = Number(inputs.tenure) || 0;
      if (pTemp > 0) {
        let totalFlatRate = fRateTemp;
        if (inputs.tenureUnit === 'Months' && nTemp > 0) {
          totalFlatRate = fRateTemp * (nTemp / 12);
        } else if (inputs.tenureUnit === 'Years' && nTemp > 0) {
          totalFlatRate = fRateTemp * nTemp;
        }
        overrideRepay = String(pTemp + (pTemp * totalFlatRate / 100));
        if (!activeKnowns.includes('repay')) activeKnowns.push('repay');
      }
      activeKnowns = activeKnowns.filter(k => k !== 'flatRate');
    }

    const defaults = ['principal', 'tenure', 'rate', 'emi', 'repay'];
    while (activeKnowns.length < 3) {
      const nextDef = defaults.find(f => !activeKnowns.includes(f));
      activeKnowns.unshift(nextDef);
    }
    
    if (activeKnowns.includes('repay') && activeKnowns.includes('emi') && activeKnowns.includes('tenure')) {
      const toDrop = ['repay', 'emi', 'tenure'].sort((a,b) => activeKnowns.indexOf(a) - activeKnowns.indexOf(b))[0];
      activeKnowns = activeKnowns.filter(f => f !== toDrop);
      const nextDef = defaults.find(f => !activeKnowns.includes(f));
      activeKnowns.unshift(nextDef);
    }
    
    const knowns = activeKnowns.slice(-3);
    const has = (key) => knowns.includes(key);

    let p = Number(inputs.principal) || 0;
    let r = Number(inputs.rate) || 0;
    let n = Number(inputs.tenure) || 0;
    let e = Number(inputs.emi) || 0;
    let a = overrideRepay !== null ? Number(overrideRepay) : (Number(inputs.repay) || 0);
    let k = getK(inputs.tenureUnit);

    if (calcMode === 'Banking') {
      if (inputs.tenureUnit === 'Years') {
        n = n * 12;
        k = 12;
      }
    }

    if (has('principal') && has('tenure') && has('emi')) {
      a = e * n;
      r = calcMode === 'Flat' ? calcRateFlat(p, e, n, inputs.tenureUnit) : calcRateBinary(p, e, n, k);
    } else if (has('principal') && has('rate') && has('tenure')) {
      e = calcMode === 'Flat' ? calcEmiFlat(p, r, n, inputs.tenureUnit) : calcEmi(p, r, n, k);
      a = e * n;
    } else if (has('principal') && has('rate') && has('emi')) {
      n = calcMode === 'Flat' ? calcTenureFlat(p, r, e, inputs.tenureUnit) : calcTenure(p, r, e, k);
      a = e * n;
    } else if (has('principal') && has('tenure') && has('repay')) {
      e = n > 0 ? a / n : 0;
      r = calcMode === 'Flat' ? calcRateFlat(p, e, n, inputs.tenureUnit) : calcRateBinary(p, e, n, k);
    } else if (has('principal') && has('emi') && has('repay')) {
      n = e > 0 ? a / e : 0;
      r = calcMode === 'Flat' ? calcRateFlat(p, e, n, inputs.tenureUnit) : calcRateBinary(p, e, n, k);
    } else if (has('rate') && has('tenure') && has('emi')) {
      a = e * n;
      p = calcMode === 'Flat' ? calcPrincipalFlat(r, n, e, inputs.tenureUnit) : calcPrincipal(r, n, e, k);
    } else if (has('rate') && has('tenure') && has('repay')) {
      e = n > 0 ? a / n : 0;
      p = calcMode === 'Flat' ? calcPrincipalFlat(r, n, e, inputs.tenureUnit) : calcPrincipal(r, n, e, k);
    } else if (has('rate') && has('emi') && has('repay')) {
      n = e > 0 ? a / e : 0;
      p = calcMode === 'Flat' ? calcPrincipalFlat(r, n, e, inputs.tenureUnit) : calcPrincipal(r, n, e, k);
    } else if (has('principal') && has('rate') && has('repay')) {
      n = calcMode === 'Flat' ? solveTenureFromRepayFlat(p, r, a, n, inputs.tenureUnit) : solveTenureFromRepay(p, r, a, k);
      e = n > 0 ? a / n : 0;
    } else {
      e = calcMode === 'Flat' ? calcEmiFlat(p, r, n, inputs.tenureUnit) : calcEmi(p, r, n, k);
      a = e * n;
    }

    if (!isFinite(n) || n <= 0) n = 0;
    if (!isFinite(r) || r < 0) r = 0;
    if (!isFinite(e) || e < 0) e = 0;
    if (!isFinite(a) || a < 0) a = 0;
    if (!isFinite(p) || p < 0) p = 0;

    n = Math.round(n * 100) / 100;
    r = Math.round(r * 100) / 100;
    p = Math.round(p);
    e = Math.round(e);
    a = Math.round(a);

    let displayN = n;
    if (calcMode === 'Banking' && inputs.tenureUnit === 'Years') {
      displayN = Math.round((n / 12) * 100) / 100;
    }

    setInputs(prev => ({
      ...prev,
      principal: p > 0 ? String(p) : '',
      rate: r > 0 ? String(r) : '',
      tenure: displayN > 0 ? String(displayN) : '',
      emi: e > 0 ? String(e) : '',
      repay: a > 0 ? String(a) : ''
    }));

    let outstanding = 0;
    let prinPaid = 0;
    let intPaid = 0;

    if (calcMode === 'Banking' && isPaidTenureActive && Number(inputs.paidTenure) > 0) {
      let r_month = k === 12 ? r / 12 / 100 : (k === 52 ? r / 52 / 100 : r / 365 / 100);
      let n_total = n; 
      let k_paid = Number(inputs.paidTenure);
      if (inputs.tenureUnit === 'Years') {
        k_paid = k_paid * 12;
      }
      k_paid = Math.min(k_paid, n_total);

      let currentOutstanding = p;
      let totalPrinPaid = 0;
      let totalIntPaid = 0;

      if (r_month > 0 && n_total > 0 && k_paid > 0) {
        for (let month = 1; month <= k_paid; month++) {
          let monthlyInterest = Math.round(currentOutstanding * r_month);
          let monthlyPrinPaid = e - monthlyInterest;
          currentOutstanding -= monthlyPrinPaid;
          totalIntPaid += monthlyInterest;
          totalPrinPaid += monthlyPrinPaid;
        }
        outstanding = Math.max(0, currentOutstanding);
      } else if (r_month === 0 && n_total > 0 && k_paid > 0) {
        outstanding = Math.max(0, p - (e * k_paid));
        totalPrinPaid = p - outstanding;
      } else {
        outstanding = p;
      }

      prinPaid = Math.max(0, totalPrinPaid);
      intPaid = Math.max(0, totalIntPaid);
    }

    setCalcOutputs({
      principal: p,
      repay: a,
      emi: e,
      totalInt: Math.max(0, a - p),
      principalPaid: prinPaid,
      outstandingAmount: outstanding,
      interestPaid: intPaid
    });
  };

  const handleReset = () => {
    setInputs({
      principal: '',
      rate: '',
      flatRate: '',
      flatRatePm: '',
      tenure: '',
      paidTenure: '',
      tenureUnit: calcMode === 'Flat' ? 'Weeks' : 'Months',
      emi: '',
      repay: ''
    });
    setCalcOutputs(calcMode === 'Flat' ? flatOutputs : bankingOutputs);
    setEditedFields([]);
    setIsPaidTenureActive(false);
  };

  const emiLabel = calcMode === 'Banking' 
    ? 'Monthly' 
    : inputs.tenureUnit === 'Months' ? 'Monthly' : inputs.tenureUnit === 'Years' ? 'Yearly' : inputs.tenureUnit === 'Weeks' ? 'Weekly' : 'Daily';

  return (
    <div className="h-full max-h-[calc(100dvh-60px)] md:max-h-[calc(100vh-theme(spacing.20))] overflow-hidden flex flex-col md:grid md:grid-cols-12 md:gap-4 bg-white font-sans">
      
      {/* ── Left Column (Inputs) ─────────────────────────────────────────── */}
      <div className="md:col-span-7 flex flex-col h-full overflow-hidden">
        
        {/* ── Header ───────────────────────────────────────────────── */}
        <div className="relative flex items-center justify-center px-4 py-2 md:py-3 gap-2.5 md:gap-3 bg-[#eaf5f4] border-b border-[#d4edea] shrink-0 md:rounded-tl-xl md:rounded-tr-none">
          <div className="w-8 h-8 md:w-12 md:h-12 flex items-center justify-center">
            <EMIIcon />
          </div>
          <div 
            onClick={(e) => {
              e.stopPropagation();
              setShowModeMenu(!showModeMenu);
            }}
            className="flex items-center gap-1.5 cursor-pointer"
          >
            <h1 className="m-0 text-lg md:text-[26px] font-black text-[#0f172a] font-serif tracking-tight leading-none">
              EMI Calculator
            </h1>
            <span className="text-[10px] md:text-[13px] text-slate-600 mt-1 md:mt-2">▼</span>
          </div>

          {showModeMenu && (
            <div className="absolute top-[90%] left-1/2 -translate-x-1/2 bg-white border border-slate-200 rounded-lg shadow-lg z-10 overflow-hidden w-[220px] mt-1">
              <div 
                onClick={() => { handleModeChange('Flat'); setShowModeMenu(false); }}
                className={`px-4 py-3 text-[13px] font-bold cursor-pointer border-b border-slate-100 ${calcMode === 'Flat' ? 'text-[#ff6b00] bg-[#fff5f0]' : 'text-slate-600 bg-white hover:bg-slate-50'}`}
              >
                Flat Rate (Simple)
              </div>
              <div 
                onClick={() => { handleModeChange('Banking'); setShowModeMenu(false); }}
                className={`px-4 py-3 text-[13px] font-bold cursor-pointer ${calcMode === 'Banking' ? 'text-[#ff6b00] bg-[#fff5f0]' : 'text-slate-600 bg-white hover:bg-slate-50'}`}
              >
                Reducing Balance (Banking)
              </div>
            </div>
          )}
        </div>

        {/* ── Cards Section (Inputs) ───────────────────────────────── */}
        <div className="px-3 md:px-5 py-2 md:py-4 flex-1 flex flex-col gap-2 md:gap-3 overflow-y-auto md:overflow-hidden pb-16 md:pb-4">
          
          <SectionLabel>Loan &amp; Repay Amount</SectionLabel>
          <div className="flex border-[1.5px] border-[#e2d9c8] rounded-xl overflow-hidden bg-[#fdf8f3] shrink-0 mb-1.5 md:mb-3">
            {/* Loan Amount Input */}
            <div className="flex-1 py-2 px-3 md:py-3 md:px-4">
              <p className="m-0 mb-1 text-[9px] md:text-[10px] font-extrabold text-black tracking-widest uppercase">
                LOAN AMOUNT
              </p>
              <div className="flex items-baseline">
                <span className="text-sm md:text-[17px] font-black text-[#4a148c]">₹&nbsp;</span>
                <CurrencyInput
                  value={inputs.principal}
                  onChange={(val) => handleEdit('principal', val)}
                  color="#4a148c"
                  fontSize={window.innerWidth < 768 ? 14 : 17}
                />
              </div>
            </div>
            <div className="w-[1.5px] bg-[#e2d9c8] my-2 md:my-2.5" />
            {/* Repay Amount Input */}
            <div className="flex-1 py-2 px-3 md:py-3 md:px-4">
              <p className="m-0 mb-1 text-[9px] md:text-[10px] font-extrabold text-black tracking-widest uppercase">
                REPAY AMOUNT
              </p>
              <div className="flex items-baseline">
                <span className="text-sm md:text-[17px] font-black text-[#cc5200]">₹&nbsp;</span>
                <CurrencyInput
                  value={inputs.repay}
                  onChange={(val) => handleEdit('repay', val)}
                  color="#cc5200"
                  fontSize={window.innerWidth < 768 ? 14 : 17}
                />
              </div>
            </div>
          </div>

          {/* Interest Rate Input */}
          <SectionLabel>Interest Rate (%)</SectionLabel>
        {calcMode === 'Banking' ? (() => {
          const derivedFlatRateStr = (() => {
            if (paFocused) return inputs.flatRate;
            if (inputs.flatRate !== undefined && inputs.flatRate !== '') return inputs.flatRate;
            if (calcOutputs.principal <= 0) return '';
            const totalFlatRate = (calcOutputs.totalInt / calcOutputs.principal) * 100;
            const n = Number(inputs.tenure) || 0;
            if (n > 0) {
              if (inputs.tenureUnit === 'Months') return (totalFlatRate / (n / 12)).toFixed(2);
              if (inputs.tenureUnit === 'Years') return (totalFlatRate / n).toFixed(2);
            }
            return totalFlatRate.toFixed(2);
          })();

          const currentPmValStr = pmFocused
            ? inputs.flatRatePm
            : (inputs.flatRatePm !== undefined && inputs.flatRatePm !== ''
              ? inputs.flatRatePm
              : (derivedFlatRateStr ? (Number(derivedFlatRateStr) / 12).toFixed(2) : ''));
          
          const currentPmNum = Number(currentPmValStr) || 0;
          const isPaisa = currentPmNum > 0 && currentPmNum < 1.0;
          
          const displayPmValue = pmFocused 
            ? currentPmValStr 
            : (currentPmValStr ? (isPaisa ? (currentPmNum * 100).toFixed(0) : parseFloat(currentPmNum.toFixed(2)).toString()) : '');
          
          const pmSuffix = pmFocused ? '% P.M.' : (isPaisa && currentPmValStr ? 'Paisa P.M.' : '% P.M.');

          const displayBankingRate = rateFocused
            ? inputs.rate
            : (inputs.rate !== '' ? inputs.rate : (calcOutputs.rate ? calcOutputs.rate.toFixed(2) : ''));

          return (
            <div style={{
              display: 'flex', gap: 14, marginBottom: 18, justifyContent: 'flex-start'
            }}>
              {/* Split Flat Rate Box */}
              <div style={{
                flex: 1, background: '#f8fafc',
                border: '1px solid #e2e8f0', borderRadius: 8,
                display: 'flex', flexDirection: 'column', overflow: 'hidden'
              }}>
                <div style={{ padding: '6px 14px', background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <span style={{ fontSize: 9, fontWeight: 800, color: '#64748b', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                    Flat Rate
                  </span>
                </div>
                <div style={{ display: 'flex', flex: 1 }}>
                  {/* Left Column: P.A. */}
                  <div style={{ flex: 1, padding: '10px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', borderRight: '1px solid #e2e8f0', justifyContent: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline' }}>
                      <input
                        type="text"
                        inputMode="decimal"
                        onFocus={() => setPaFocused(true)}
                        onBlur={() => setPaFocused(false)}
                        value={derivedFlatRateStr}
                        onChange={(e) => {
                          let val = e.target.value.replace(/[^0-9.]/g, '');
                          if ((val.match(/\./g) || []).length > 1) return;
                          handleEdit('flatRate', val);
                        }}
                        placeholder="0"
                        style={{
                          background: 'transparent', border: 'none', outline: 'none',
                          width: Math.max(30, String(derivedFlatRateStr).length * 9 + 5),
                          fontSize: 15, fontWeight: 800, color: '#334155',
                          fontFamily: "'Inter', Arial, sans-serif", textAlign: 'center'
                        }}
                      />
                      <span style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', marginLeft: 2, whiteSpace: 'nowrap' }}>% P.A.</span>
                    </div>
                  </div>
                  {/* Right Column: P.M. */}
                  <div style={{ flex: 1, padding: '10px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline' }}>
                      <input
                        type="text"
                        inputMode="decimal"
                        onFocus={() => setPmFocused(true)}
                        onBlur={() => setPmFocused(false)}
                        value={displayPmValue}
                        onChange={(e) => {
                          let val = e.target.value.replace(/[^0-9.]/g, '');
                          if ((val.match(/\./g) || []).length > 1) return;
                          handleEdit('flatRatePm', val);
                        }}
                        placeholder="0"
                        style={{
                          background: 'transparent', border: 'none', outline: 'none',
                          width: Math.max(30, String(displayPmValue).length * 9 + 5),
                          fontSize: 15, fontWeight: 800, color: '#334155',
                          fontFamily: "'Inter', Arial, sans-serif", textAlign: 'center'
                        }}
                      />
                      <span style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', marginLeft: 2, whiteSpace: 'nowrap' }}>{pmSuffix}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Banking Rate Box */}
              <div style={{
                flex: '0 0 auto', padding: '0', background: '#ffffff',
                border: '1px solid #cbd5e1', borderRadius: 8,
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                display: 'flex', flexDirection: 'column', overflow: 'hidden'
              }}>
                <div style={{ padding: '6px 14px', background: '#f0f9ff', borderBottom: '1px solid #e0f2fe', textAlign: 'center' }}>
                  <span style={{ fontSize: 9, fontWeight: 800, color: '#0ea5e9', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                    Banking Rate
                  </span>
                </div>
                <div style={{ display: 'flex', flex: 1, padding: '10px 14px', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline' }}>
                    <input
                      type="text"
                      inputMode="decimal"
                      onFocus={() => setRateFocused(true)}
                      onBlur={() => setRateFocused(false)}
                      value={displayBankingRate}
                      onChange={(e) => {
                        let val = e.target.value.replace(/[^0-9.]/g, '');
                        if ((val.match(/\./g) || []).length > 1) return;
                        handleEdit('rate', val);
                      }}
                      placeholder="0"
                      style={{
                        background: 'transparent', border: 'none', outline: 'none',
                        width: Math.max(30, String(displayBankingRate || '').length * 9 + 5),
                        fontSize: 15, fontWeight: 800, color: '#0284c7',
                        fontFamily: "'Inter', Arial, sans-serif", textAlign: 'center'
                      }}
                    />
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#7dd3fc', marginLeft: 2, whiteSpace: 'nowrap' }}>% P.A.</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })() : (
          <div style={{
            background: '#f0f2f5', borderRadius: 12, padding: '14px 18px',
            marginBottom: 18, border: '1.5px solid #e4e7eb',
            display: 'flex', alignItems: 'center'
          }}>
            <input
              type="text"
              inputMode="decimal"
              value={inputs.rate}
              onChange={(e) => {
                let val = e.target.value.replace(/[^0-9.]/g, '');
                if ((val.match(/\./g) || []).length > 1) return;
                handleEdit('rate', val);
              }}
              placeholder="0"
              style={{
                background: 'transparent', border: 'none', outline: 'none',
                width: '100%', fontSize: 16, fontWeight: 600, color: '#1a1a2e',
                fontFamily: "'Inter', Arial, sans-serif"
              }}
            />
          </div>
        )}

        <div style={{ position: 'relative', marginBottom: 7, display: 'flex', alignItems: 'center' }}>
          <p style={{
            margin: 0,
            fontSize: 11.5, fontWeight: 900, color: '#1a1a1a', letterSpacing: 1.1,
            textTransform: 'uppercase', fontFamily: "'Inter', Arial, sans-serif",
            display: 'flex', alignItems: 'center', gap: 6
          }}>
            TENURE
            {calcMode === 'Banking' && (
              <span 
                onClick={(e) => { e.stopPropagation(); setShowTenureMenu(!showTenureMenu); }}
                style={{ cursor: 'pointer', color: '#ff6b00', fontSize: 10, padding: '2px 4px', display: 'inline-block' }}
              >
                ▼
              </span>
            )}
          </p>
          {showTenureMenu && (
            <div style={{
              position: 'absolute', top: '100%', left: 0,
              background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8,
              boxShadow: '0 4px 14px rgba(0,0,0,0.12)', zIndex: 50, overflow: 'hidden',
              width: 180, marginTop: 8
            }}>
              <div 
                onClick={() => { setIsPaidTenureActive(false); setShowTenureMenu(false); }}
                style={{
                  padding: '12px 14px', fontSize: 13, fontWeight: 700, color: !isPaidTenureActive ? '#0284c7' : '#4a5568',
                  background: !isPaidTenureActive ? '#f0f9ff' : '#fff', cursor: 'pointer',
                  borderBottom: '1px solid #edf2f7', fontFamily: "'Inter', Arial, sans-serif"
                }}
              >
                Standard Tenure
              </div>
              <div 
                onClick={() => { setIsPaidTenureActive(true); setShowTenureMenu(false); }}
                style={{
                  padding: '12px 14px', fontSize: 13, fontWeight: 700, color: isPaidTenureActive ? '#0284c7' : '#4a5568',
                  background: isPaidTenureActive ? '#f0f9ff' : '#fff', cursor: 'pointer', fontFamily: "'Inter', Arial, sans-serif"
                }}
              >
                Paid Tenure
              </div>
            </div>
          )}
        </div>

        {isPaidTenureActive && calcMode === 'Banking' ? (
          <div style={{
            display: 'flex', background: '#f8fafc', borderRadius: 12,
            marginBottom: 20, border: '1.5px solid #e2e8f0', overflow: 'hidden'
          }}>
            <div style={{ flex: 1, padding: '10px 14px', borderRight: '1.5px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: '#64748b', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4 }}>
                Total Tenure
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={inputs.tenure}
                onChange={(e) => {
                  let val = e.target.value.replace(/[^0-9.]/g, '');
                  if ((val.match(/\./g) || []).length > 1) return;
                  handleEdit('tenure', val);
                }}
                placeholder="0"
                style={{
                  background: 'transparent', border: 'none', outline: 'none',
                  width: '100%', fontSize: 16, fontWeight: 700, color: '#1e293b',
                  fontFamily: "'Inter', Arial, sans-serif"
                }}
              />
            </div>
            <div style={{ flex: 1, padding: '10px 14px', display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: '#64748b', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4 }}>
                Paid Tenure
              </span>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <input
                  type="text"
                  inputMode="decimal"
                  value={inputs.paidTenure}
                  onChange={(e) => {
                    let val = e.target.value.replace(/[^0-9.]/g, '');
                    if ((val.match(/\./g) || []).length > 1) return;
                    handleEdit('paidTenure', val);
                  }}
                  placeholder="0"
                  style={{
                    background: 'transparent', border: 'none', outline: 'none',
                    flex: 1, fontSize: 16, fontWeight: 700, color: '#1e293b',
                    fontFamily: "'Inter', Arial, sans-serif", width: '100%'
                  }}
                />
                <div style={{ position: 'relative' }}>
                  <span
                    onClick={(e) => { e.stopPropagation(); setShowTenureUnitMenu(!showTenureUnitMenu); }}
                    style={{
                      fontSize: 14, color: '#94a3b8', marginLeft: 8, cursor: 'pointer', padding: '2px 4px', display: 'inline-block'
                    }}
                  >
                    ▼
                  </span>
                  {showTenureUnitMenu && (
                    <div style={{
                      position: 'absolute', top: '100%', right: 0,
                      background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8,
                      boxShadow: '0 4px 14px rgba(0,0,0,0.12)', zIndex: 50, overflow: 'hidden',
                      width: 120, marginTop: 8
                    }}>
                      <div 
                        onClick={() => { setInputs(prev => ({...prev, tenureUnit: 'Months'})); setShowTenureUnitMenu(false); }}
                        style={{
                          padding: '12px 14px', fontSize: 13, fontWeight: 700, color: inputs.tenureUnit === 'Months' ? '#0284c7' : '#4a5568',
                          background: inputs.tenureUnit === 'Months' ? '#f0f9ff' : '#fff', cursor: 'pointer',
                          borderBottom: '1px solid #edf2f7', fontFamily: "'Inter', Arial, sans-serif"
                        }}
                      >
                        Months
                      </div>
                      <div 
                        onClick={() => { setInputs(prev => ({...prev, tenureUnit: 'Years'})); setShowTenureUnitMenu(false); }}
                        style={{
                          padding: '12px 14px', fontSize: 13, fontWeight: 700, color: inputs.tenureUnit === 'Years' ? '#0284c7' : '#4a5568',
                          background: inputs.tenureUnit === 'Years' ? '#f0f9ff' : '#fff', cursor: 'pointer', fontFamily: "'Inter', Arial, sans-serif"
                        }}
                      >
                        Years
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{
            background: '#f0f2f5', borderRadius: 12, padding: '14px 18px',
            marginBottom: 20, border: '1.5px solid #e4e7eb',
            display: 'flex', alignItems: 'center'
          }}>
            <input
              type="text"
              inputMode="decimal"
              value={inputs.tenure}
              onChange={(e) => {
                let val = e.target.value.replace(/[^0-9.]/g, '');
                if ((val.match(/\./g) || []).length > 1) return;
                handleEdit('tenure', val);
              }}
              placeholder="0"
              style={{
                background: 'transparent', border: 'none', outline: 'none',
                flex: 1, fontSize: 16, fontWeight: 600, color: '#1a1a2e',
                fontFamily: "'Inter', Arial, sans-serif"
              }}
            />
            <select
              value={inputs.tenureUnit}
              onChange={(e) => setInputs(prev => ({...prev, tenureUnit: e.target.value}))}
              style={{
                background: 'transparent', border: 'none', outline: 'none',
                fontSize: 16, fontWeight: 800, color: '#1a1a2e',
                fontFamily: "'Inter', Arial, sans-serif", marginLeft: 8
              }}
            >
              {calcMode === 'Flat' ? (
                <>
                  <option value="Months">Months</option>
                  <option value="Years">Years</option>
                  <option value="Weeks">Weeks</option>
                  <option value="Days">Days</option>
                </>
              ) : (
                <>
                  <option value="Months">Months</option>
                  <option value="Years">Years</option>
                </>
              )}
            </select>
          </div>
        )}

        {/* Monthly EMI Input */}
        <div className="mt-auto text-center pb-1 pt-1 md:pt-4 shrink-0 border-t border-slate-100">
          <div className="flex items-baseline justify-center flex-wrap">
            <span className="text-xl md:text-[27px] font-black text-[#0A1F6E] tracking-tight">
              {emiLabel} EMI: ₹&nbsp;
            </span>
            <CurrencyInput
              value={inputs.emi}
              onChange={(val) => handleEdit('emi', val)}
              color="#0A1F6E"
              fontSize={window.innerWidth < 768 ? 20 : 27}
              autoWidth={true}
              style={{ letterSpacing: '-0.5px' }}
            />
          </div>
          {/* In Words for EMI */}
          <div className="hidden md:block">
            <ShrinkText
              text={toWords(calcOutputs.emi)}
              maxSize={11} minSize={6.5}
              style={{ textAlign: 'center', color: '#6b7280' }}
            />
          </div>
          
          <div className="flex justify-end mt-2 md:mt-4 gap-2 md:gap-3">
            <button
              onClick={handleReset}
              className="bg-slate-100 text-slate-700 text-[11px] md:text-[13px] font-bold border border-slate-300 rounded-md px-3 md:px-4 py-1.5 md:py-2 cursor-pointer font-sans"
            >
              Reset
            </button>
            <button
              onClick={handleCalculate}
              className="bg-[#ff6b00] text-white text-[11px] md:text-[13px] font-bold border-none rounded-md px-3 md:px-4 py-1.5 md:py-2 cursor-pointer font-sans shadow-md"
            >
              Calculate
            </button>
          </div>
        </div>
      </div>
    </div>

    {/* ── Right Column (Outputs) ─────────────────────────────────────────── */}
      <div className="md:col-span-5 flex flex-row md:flex-col justify-between md:justify-center items-center bg-slate-50 border-t md:border-l md:border-t-0 border-slate-200 shrink-0 h-[100px] md:h-full p-2 md:p-6 gap-2 md:gap-8 overflow-hidden md:rounded-tr-xl md:rounded-br-xl">
        
        <div className="flex-shrink-0">
          <DonutChart 
            principal={calcOutputs.principal} 
            interest={calcOutputs.totalInt} 
            total={calcOutputs.repay} 
            emi={calcOutputs.emi} 
            isPaidTenureMode={calcMode === 'Banking' && isPaidTenureActive}
            interestPaid={calcOutputs.interestPaid || 0}
          />
        </div>

        <div className="flex flex-row md:flex-col gap-2 md:gap-4 flex-1 w-full justify-around md:justify-start pt-1 md:pt-0">
          <AmountRow label="Principal" amount={calcOutputs.principal} color="#4a148c" />
          <AmountRow 
            label={(calcMode === 'Banking' && isPaidTenureActive) ? "Prin. Paid" : "Interest"}   
            amount={(calcMode === 'Banking' && isPaidTenureActive) ? calcOutputs.principalPaid : calcOutputs.totalInt}  
            color="#990000" 
          />
          <AmountRow 
            label={(calcMode === 'Banking' && isPaidTenureActive) ? "Outstanding" : "Total"}     
            amount={(calcMode === 'Banking' && isPaidTenureActive) ? calcOutputs.outstandingAmount : calcOutputs.repay}  
            color="#cc5200" 
            showDivider={false} 
          />
        </div>
      </div>

    </div>
  );
};

export default EMICalculator;
