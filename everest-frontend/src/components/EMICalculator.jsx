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

// ─── Flat Rate Helpers (Absolute Total Flat Rate) ──────────────────────────────
const calcEmiFlat = (P, R, n) => {
  if (n <= 0) return 0;
  const I = P * (R / 100);
  return (P + I) / n;
};

const calcTenureFlat = (P, R, E) => {
  const A = P + P * (R / 100);
  if (E <= 0) return 0;
  return A / E;
};

const calcRateFlat = (P, E, n) => {
  if (P <= 0 || n <= 0) return 0;
  const A = E * n;
  const I = A - P;
  if (I < 0) return 0;
  return (I / P) * 100;
};

const calcPrincipalFlat = (R, n, E) => {
  const factor = 1 + (R / 100);
  if (factor <= 0) return 0;
  return (E * n) / factor;
};

const solveTenureFromRepayFlat = (P, R, A, currN) => {
  return currN; // In absolute flat rate, Tenure cannot be derived from P, R, A
};

// ─── Donut Chart ─────────────────────────────────────────────────────────────
const DonutChart = ({ principal, interest, total, emi }) => {
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

  return (
    <div style={{ position: 'relative', width: SIZE, height: SIZE }}>
      <svg width={SIZE} height={SIZE}>
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
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none', flexDirection: 'column', gap: 2,
      }}>
        <p style={{
          margin: 0, fontSize: 14, fontWeight: 900, color: '#888',
          letterSpacing: 1, textTransform: 'uppercase', fontFamily: "'Inter', Arial, sans-serif",
        }}>
          EMI
        </p>
        <p style={{
          margin: 0, fontSize: 22, fontWeight: 900, color: '#0A1F6E',
          fontFamily: "'Inter', 'Roboto', Arial, sans-serif", letterSpacing: '-0.3px',
        }}>
          ₹ {Number(emi).toLocaleString('en-IN')}
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

// ─── Section Header ───────────────────────────────────────────────────────────
const SectionLabel = ({ children }) => (
  <p style={{
    fontSize: 11.5, fontWeight: 900, color: '#1a1a1a', letterSpacing: 1.1,
    marginBottom: 7, textTransform: 'uppercase', fontFamily: "'Inter', Arial, sans-serif",
  }}>
    {children}
  </p>
);

// ─── Amount Row (donut breakdown) ─────────────────────────────────────────────
const AmountRow = ({ label, amount, color, showDivider = true }) => (
  <div style={{
    paddingBottom: showDivider ? 11 : 0, marginBottom: showDivider ? 11 : 0,
    borderBottom: showDivider ? '1px solid #e0e0e0' : 'none',
  }}>
    <p style={{
      margin: '0 0 2px', fontSize: 12.5, fontWeight: 700, color: '#2a2a2a',
      letterSpacing: 0.1, fontFamily: "'Inter', Arial, sans-serif",
    }}>
      {label}
    </p>
    <p style={{
      margin: '0 0 2px', fontSize: 19, fontWeight: 800, color,
      fontFamily: "'Inter', 'Roboto', Arial, sans-serif", letterSpacing: '-0.3px',
    }}>
      ₹ {Number(amount).toLocaleString('en-IN')}
    </p>
    <ShrinkText text={toWords(amount)} maxSize={10.5} minSize={6.5} />
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const EMICalculator = ({ onBack }) => {
  const defaultState = {
    principal: '100000',
    rate: '8',
    tenure: '12',
    tenureUnit: 'Months',
    emi: '9000',
    repay: '108000'
  };

  const defaultOutputs = {
    principal: 100000,
    repay: 108000,
    emi: 9000,
    totalInt: 8000
  };

  const [calcMode, setCalcMode] = useState('Flat');
  const [showModeMenu, setShowModeMenu] = useState(false);
  const [inputs, setInputs] = useState(defaultState);
  const [calcOutputs, setCalcOutputs] = useState(defaultOutputs);

  const [editedFields, setEditedFields] = useState([]);

  const handleModeChange = (mode) => {
    setCalcMode(mode);
    if (mode === 'Banking' && (inputs.tenureUnit === 'Weeks' || inputs.tenureUnit === 'Days')) {
      setInputs(prev => ({ ...prev, tenureUnit: 'Months' }));
    }
  };

  const handleEdit = (field, val) => {
    setInputs(prev => ({ ...prev, [field]: val }));
    setEditedFields(prev => {
      const arr = prev.filter(f => f !== field);
      arr.push(field);
      return arr;
    });
  };

  const handleCalculate = () => {
    let activeKnowns = [...editedFields];
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
    let a = Number(inputs.repay) || 0;
    let k = getK(inputs.tenureUnit);

    if (calcMode === 'Banking') {
      if (inputs.tenureUnit === 'Years') {
        n = n * 12;
        k = 12;
      }
    }

    if (has('principal') && has('tenure') && has('emi')) {
      a = e * n;
      r = calcMode === 'Flat' ? calcRateFlat(p, e, n) : calcRateBinary(p, e, n, k);
    } else if (has('principal') && has('rate') && has('tenure')) {
      e = calcMode === 'Flat' ? calcEmiFlat(p, r, n) : calcEmi(p, r, n, k);
      a = e * n;
    } else if (has('principal') && has('rate') && has('emi')) {
      n = calcMode === 'Flat' ? calcTenureFlat(p, r, e) : calcTenure(p, r, e, k);
      a = e * n;
    } else if (has('principal') && has('tenure') && has('repay')) {
      e = n > 0 ? a / n : 0;
      r = calcMode === 'Flat' ? calcRateFlat(p, e, n) : calcRateBinary(p, e, n, k);
    } else if (has('principal') && has('emi') && has('repay')) {
      n = e > 0 ? a / e : 0;
      r = calcMode === 'Flat' ? calcRateFlat(p, e, n) : calcRateBinary(p, e, n, k);
    } else if (has('rate') && has('tenure') && has('emi')) {
      a = e * n;
      p = calcMode === 'Flat' ? calcPrincipalFlat(r, n, e) : calcPrincipal(r, n, e, k);
    } else if (has('rate') && has('tenure') && has('repay')) {
      e = n > 0 ? a / n : 0;
      p = calcMode === 'Flat' ? calcPrincipalFlat(r, n, e) : calcPrincipal(r, n, e, k);
    } else if (has('rate') && has('emi') && has('repay')) {
      n = e > 0 ? a / e : 0;
      p = calcMode === 'Flat' ? calcPrincipalFlat(r, n, e) : calcPrincipal(r, n, e, k);
    } else if (has('principal') && has('rate') && has('repay')) {
      n = calcMode === 'Flat' ? solveTenureFromRepayFlat(p, r, a, n) : solveTenureFromRepay(p, r, a, k);
      e = n > 0 ? a / n : 0;
    } else {
      e = calcMode === 'Flat' ? calcEmiFlat(p, r, n) : calcEmi(p, r, n, k);
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

    setCalcOutputs({
      principal: p,
      repay: a,
      emi: e,
      totalInt: Math.max(0, a - p)
    });
  };

  const handleReset = () => {
    setInputs(defaultState);
    setCalcOutputs(defaultOutputs);
    setEditedFields([]);
    setCalcMode('Flat');
  };

  const emiLabel = calcMode === 'Banking' 
    ? 'Monthly' 
    : inputs.tenureUnit === 'Months' ? 'Monthly' : inputs.tenureUnit === 'Years' ? 'Yearly' : inputs.tenureUnit === 'Weeks' ? 'Weekly' : 'Daily';

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', minHeight: '100%',
      background: '#ffffff', fontFamily: "'Inter', 'Roboto', Arial, sans-serif",
    }}>

      {/* ── Header ───────────────────────────────────────────────── */}
      <div style={{
        position: 'relative',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px 16px 12px', gap: 12, background: '#eaf5f4', borderBottom: '1px solid #d4edea'
      }}>
        <EMIIcon />
        <div 
          onClick={() => setShowModeMenu(!showModeMenu)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
        >
          <h1 style={{
            margin: 0, fontSize: 26, fontWeight: 900, color: '#0f172a',
            fontFamily: 'Georgia, serif', letterSpacing: '-0.02em', lineHeight: 1,
          }}>
            EMI Calculator
          </h1>
          <span style={{ fontSize: 13, color: '#4a5568', marginTop: 4 }}>▼</span>
        </div>

        {showModeMenu && (
          <div style={{
            position: 'absolute', top: '90%', left: '50%', transform: 'translateX(-50%)',
            background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8,
            boxShadow: '0 4px 14px rgba(0,0,0,0.12)', zIndex: 10, overflow: 'hidden',
            width: 220, marginTop: 4
          }}>
            <div 
              onClick={() => { handleModeChange('Flat'); setShowModeMenu(false); }}
              style={{
                padding: '14px 16px', fontSize: 13, fontWeight: 700, color: calcMode === 'Flat' ? '#ff6b00' : '#4a5568',
                background: calcMode === 'Flat' ? '#fff5f0' : '#fff', cursor: 'pointer',
                borderBottom: '1px solid #edf2f7', fontFamily: "'Inter', Arial, sans-serif"
              }}
            >
              Flat Rate (Simple)
            </div>
            <div 
              onClick={() => { handleModeChange('Banking'); setShowModeMenu(false); }}
              style={{
                padding: '14px 16px', fontSize: 13, fontWeight: 700, color: calcMode === 'Banking' ? '#ff6b00' : '#4a5568',
                background: calcMode === 'Banking' ? '#fff5f0' : '#fff', cursor: 'pointer', fontFamily: "'Inter', Arial, sans-serif"
              }}
            >
              Reducing Balance (Banking)
            </div>
          </div>
        )}
      </div>

      {/* ── Donut + Breakdown ─────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '18px 16px 8px', gap: 12 }}>
        <div style={{ flexShrink: 0 }}>
          <DonutChart principal={calcOutputs.principal} interest={calcOutputs.totalInt} total={calcOutputs.repay} emi={calcOutputs.emi} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <AmountRow label="Principal Amount" amount={calcOutputs.principal} color="#4a148c" />
          <AmountRow label="Total Interest"   amount={calcOutputs.totalInt}  color="#990000" />
          <AmountRow label="Total Amount"     amount={calcOutputs.repay}  color="#cc5200" showDivider={false} />
        </div>
      </div>

      {/* ── Cards Section ─────────────────────────────────────────── */}
      <div style={{ padding: '10px 18px 0', flex: 1 }}>
        <SectionLabel>Loan &amp; Repay Amount</SectionLabel>
        <div style={{
          display: 'flex', border: '1.5px solid #e2d9c8', borderRadius: 14,
          overflow: 'hidden', background: '#fdf8f3', marginBottom: 18,
        }}>
          {/* Loan Amount Input */}
          <div style={{ flex: 1, padding: '13px 14px' }}>
            <p style={{ margin: '0 0 3px', fontSize: 10, fontWeight: 800, color: '#000000', letterSpacing: 0.8 }}>
              LOAN AMOUNT
            </p>
            <div style={{ display: 'flex', alignItems: 'baseline' }}>
              <span style={{ fontSize: 17, fontWeight: 900, color: '#4a148c' }}>₹&nbsp;</span>
              <CurrencyInput
                value={inputs.principal}
                onChange={(val) => handleEdit('principal', val)}
                color="#4a148c"
              />
            </div>
          </div>
          <div style={{ width: 1.5, background: '#e2d9c8', margin: '10px 0' }} />
          {/* Repay Amount Input */}
          <div style={{ flex: 1, padding: '13px 14px' }}>
            <p style={{ margin: '0 0 3px', fontSize: 10, fontWeight: 800, color: '#000000', letterSpacing: 0.8 }}>
              REPAY AMOUNT
            </p>
            <div style={{ display: 'flex', alignItems: 'baseline' }}>
              <span style={{ fontSize: 17, fontWeight: 900, color: '#cc5200' }}>₹&nbsp;</span>
              <CurrencyInput
                value={inputs.repay}
                onChange={(val) => handleEdit('repay', val)}
                color="#cc5200"
              />
            </div>
          </div>
        </div>

        {/* Interest Rate Input */}
        <SectionLabel>Interest Rate (%)</SectionLabel>
        <div style={{
          background: '#f0f2f5', borderRadius: 12, padding: '14px 18px',
          marginBottom: 18, border: '1.5px solid #e4e7eb',
          display: 'flex', alignItems: 'center'
        }}>
          <input
            type="text"
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

        {/* Tenure & Unit Input */}
        <SectionLabel>Tenure</SectionLabel>
        <div style={{
          background: '#f0f2f5', borderRadius: 12, padding: '14px 18px',
          marginBottom: 20, border: '1.5px solid #e4e7eb',
          display: 'flex', alignItems: 'center'
        }}>
          <input
            type="text"
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

        {/* Monthly EMI Input */}
        <div style={{ textAlign: 'center', paddingBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 27, fontWeight: 900, color: '#0A1F6E',
              fontFamily: "'Inter', 'Roboto', Arial, sans-serif", letterSpacing: '-0.5px'
            }}>
              {emiLabel} EMI: ₹&nbsp;
            </span>
            <CurrencyInput
              value={inputs.emi}
              onChange={(val) => handleEdit('emi', val)}
              color="#0A1F6E"
              fontSize={27}
              autoWidth={true}
              style={{ letterSpacing: '-0.5px' }}
            />
          </div>
          {/* In Words for EMI */}
          <ShrinkText
            text={toWords(calcOutputs.emi)}
            maxSize={11} minSize={6.5}
            style={{ textAlign: 'center', color: '#6b7280' }}
          />
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16, gap: 10 }}>
            <button
              onClick={handleReset}
              style={{
                background: '#f0f2f5', color: '#333', fontSize: 13, fontWeight: 700,
                border: '1px solid #d1d5db', borderRadius: 6, padding: '8px 16px',
                cursor: 'pointer', fontFamily: "'Inter', Arial, sans-serif"
              }}
            >
              Reset
            </button>
            <button
              onClick={handleCalculate}
              style={{
                background: '#ff6b00', color: '#fff', fontSize: 13, fontWeight: 700,
                border: 'none', borderRadius: 6, padding: '8px 16px',
                cursor: 'pointer', fontFamily: "'Inter', Arial, sans-serif",
                boxShadow: '0 2px 4px rgba(255, 107, 0, 0.3)'
              }}
            >
              Calculate
            </button>
          </div>
        </div>
      </div>

      <div style={{ height: 24 }} />
    </div>
  );
};

export default EMICalculator;
