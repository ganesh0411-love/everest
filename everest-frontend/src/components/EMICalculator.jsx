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
  if (n === 0) return 'Zero Only';
  let parts = [];
  let num = n;
  if (num >= 10000000) { parts.push(twoDigits(Math.floor(num / 10000000)) + ' Crore'); num %= 10000000; }
  if (num >= 100000)   { parts.push(twoDigits(Math.floor(num / 100000))   + ' Lakh');  num %= 100000;  }
  if (num >= 1000)     { parts.push(twoDigits(Math.floor(num / 1000))     + ' Thousand'); num %= 1000; }
  if (num >= 100)      { parts.push(ones[Math.floor(num / 100)]           + ' Hundred'); num %= 100;   }
  if (num > 0)         { parts.push(twoDigits(num)); }
  return parts.join(' ') + ' Only';
};

// ─── Auto-Shrink Single-Line Text ────────────────────────────────────────────
// Measures rendered text width and iteratively reduces font-size until it fits
// the container — guaranteed single line, never truncated, stays readable.
const ShrinkText = ({ text, maxSize = 10.5, minSize = 6.5, style = {} }) => {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let size = maxSize;
    // Reset to max first
    el.style.fontSize = size + 'px';
    // Shrink until it fits or hits minimum
    while (el.scrollWidth > el.offsetWidth + 1 && size > minSize) {
      size -= 0.25;
      el.style.fontSize = size + 'px';
    }
  }, [text, maxSize, minSize]);

  return (
    <p
      ref={ref}
      style={{
        margin: 0,
        fontSize: maxSize + 'px',   // initial; JS will shrink if needed
        fontWeight: 600,
        color: '#7a7a7a',
        fontStyle: 'italic',
        whiteSpace: 'nowrap',
        overflow: 'hidden',         // clip only if somehow still too wide
        lineHeight: 1.4,
        ...style,
      }}
    >
      {text}
    </p>
  );
};

// ─── Donut Chart — Exactly 3 slices ─────────────────────────────────────────
const DonutChart = ({ principal, interest, total }) => {
  const SIZE = 200;
  const SW   = 32;
  const R    = (SIZE - SW) / 2;
  const CIRC = 2 * Math.PI * R;
  const CX   = SIZE / 2;
  const CY   = SIZE / 2;

  const sum  = principal + interest + total;
  const bLen = CIRC * (principal / sum);
  const rLen = CIRC * (interest  / sum);
  const oLen = CIRC * (total     / sum);
  const GAP  = CIRC * 0.008;

  const rotate = `rotate(-90 ${CX} ${CY})`;

  return (
    <div style={{ position: 'relative', width: SIZE, height: SIZE }}>
      <svg width={SIZE} height={SIZE}>
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="#4a148c"
          strokeWidth={SW}
          strokeDasharray={`${bLen - GAP} ${CIRC}`}
          strokeDashoffset={0}
          strokeLinecap="butt" transform={rotate} />
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="#990000"
          strokeWidth={SW}
          strokeDasharray={`${rLen - GAP} ${CIRC}`}
          strokeDashoffset={-(bLen + GAP)}
          strokeLinecap="butt" transform={rotate} />
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="#cc5200"
          strokeWidth={SW}
          strokeDasharray={`${oLen - GAP} ${CIRC}`}
          strokeDashoffset={-(bLen + GAP + rLen + GAP)}
          strokeLinecap="butt" transform={rotate} />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none',
        flexDirection: 'column',
        gap: 2,
      }}>
        <p style={{
          margin: 0,
          fontSize: 14,
          fontWeight: 900,
          color: '#888',
          letterSpacing: 1,
          textTransform: 'uppercase',
          fontFamily: "'Inter', Arial, sans-serif",
        }}>
          EMI
        </p>
        <p style={{
          margin: 0,
          fontSize: 22,
          fontWeight: 900,
          color: '#0A1F6E',
          fontFamily: "'Inter', 'Roboto', Arial, sans-serif",
          letterSpacing: '-0.3px',
        }}>
          ₹ 9,542
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
    fontSize: 11.5,
    fontWeight: 900,
    color: '#1a1a1a',               // near-black, max contrast
    letterSpacing: 1.1,
    marginBottom: 7,
    textTransform: 'uppercase',
    fontFamily: "'Inter', Arial, sans-serif",
  }}>
    {children}
  </p>
);

// ─── Amount Row (donut breakdown) ─────────────────────────────────────────────
const AmountRow = ({ label, amount, color, showDivider = true }) => (
  <div style={{
    paddingBottom: showDivider ? 11 : 0,
    marginBottom: showDivider ? 11 : 0,
    borderBottom: showDivider ? '1px solid #e0e0e0' : 'none',
  }}>
    {/* Label */}
    <p style={{
      margin: '0 0 2px',
      fontSize: 12.5,
      fontWeight: 700,
      color: '#2a2a2a',
      letterSpacing: 0.1,
      fontFamily: "'Inter', Arial, sans-serif",
    }}>
      {label}
    </p>
    {/* Amount — Inter bold, spaced ₹ */}
    <p style={{
      margin: '0 0 2px',
      fontSize: 19,
      fontWeight: 800,
      color,
      fontFamily: "'Inter', 'Roboto', Arial, sans-serif",
      letterSpacing: '-0.3px',
    }}>
      ₹ {amount.toLocaleString('en-IN')}
    </p>
    {/* In Words — auto-shrink, single line */}
    <ShrinkText text={toWords(amount)} maxSize={10.5} minSize={6.5} />
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const EMICalculator = ({ onBack }) => {
  const principal    = 100000;
  const totalInt     = 14500;
  const totalAmt     = 114500;
  const monthlyEMI   = 9542;
  const interestRate = 12.0;
  const tenure       = '12 Months';

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      minHeight: '100%',
      background: '#ffffff',
      fontFamily: "'Inter', 'Roboto', Arial, sans-serif",
    }}>

      {/* ── Header ───────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px 16px 12px',
        gap: 12,
        background: '#eaf5f4',
        borderBottom: '1px solid #d4edea',
      }}>
        <EMIIcon />
        <h1 style={{
          margin: 0, fontSize: 26, fontWeight: 900,
          color: '#0f172a',
          fontFamily: 'Georgia, serif',
          letterSpacing: '-0.02em', lineHeight: 1,
        }}>
          EMI Calculator
        </h1>
      </div>

      {/* ── Donut + Breakdown ─────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center',
        padding: '18px 16px 8px', gap: 12,
      }}>
        <div style={{ flexShrink: 0 }}>
          <DonutChart principal={principal} interest={totalInt} total={totalAmt} />
        </div>
        {/* Right-side breakdown — In Words only here */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <AmountRow label="Principal Amount" amount={principal} color="#4a148c" />
          <AmountRow label="Total Interest"   amount={totalInt}  color="#990000" />
          <AmountRow label="Total Amount"     amount={totalAmt}  color="#cc5200" showDivider={false} />
        </div>
      </div>

      {/* ── Cards Section ─────────────────────────────────────────── */}
      <div style={{ padding: '10px 18px 0', flex: 1 }}>

        {/* LOAN & REPAY — No "In Words" inside */}
        <SectionLabel>Loan &amp; Repay Amount</SectionLabel>
        <div style={{
          display: 'flex', border: '1.5px solid #e2d9c8',
          borderRadius: 14, overflow: 'hidden',
          background: '#fdf8f3', marginBottom: 18,
        }}>
          <div style={{ flex: 1, padding: '13px 14px' }}>
            <p style={{
              margin: '0 0 3px', fontSize: 10, fontWeight: 800,
              color: '#000000', letterSpacing: 0.8,
            }}>
              LOAN AMOUNT
            </p>
            <p style={{
              margin: 0, fontSize: 17, fontWeight: 900,
              color: '#4a148c',
              fontFamily: "'Inter', 'Roboto', Arial, sans-serif",
            }}>
              ₹ {principal.toLocaleString('en-IN')}
            </p>
          </div>
          <div style={{ width: 1.5, background: '#e2d9c8', margin: '10px 0' }} />
          <div style={{ flex: 1, padding: '13px 14px' }}>
            <p style={{
              margin: '0 0 3px', fontSize: 10, fontWeight: 800,
              color: '#000000', letterSpacing: 0.8,
            }}>
              REPAY AMOUNT
            </p>
            <p style={{
              margin: 0, fontSize: 17, fontWeight: 900,
              color: '#cc5200',
              fontFamily: "'Inter', 'Roboto', Arial, sans-serif",
            }}>
              ₹ {totalAmt.toLocaleString('en-IN')}
            </p>
          </div>
        </div>

        {/* Interest Rate */}
        <SectionLabel>Interest Rate (%)</SectionLabel>
        <div style={{
          background: '#f0f2f5', borderRadius: 12, padding: '14px 18px',
          marginBottom: 18, fontSize: 16, fontWeight: 600, color: '#1a1a2e',
          border: '1.5px solid #e4e7eb',
          fontFamily: "'Inter', Arial, sans-serif",
        }}>
          {interestRate}
        </div>

        {/* Tenure */}
        <SectionLabel>Tenure</SectionLabel>
        <div style={{
          background: '#f0f2f5', borderRadius: 12, padding: '14px 18px',
          marginBottom: 20, fontSize: 16, fontWeight: 600, color: '#1a1a2e',
          border: '1.5px solid #e4e7eb',
          fontFamily: "'Inter', Arial, sans-serif",
        }}>
          {tenure}
        </div>

        {/* Monthly EMI — Inter bold (not Georgia) */}
        <div style={{ textAlign: 'center', paddingBottom: 6 }}>
          <p style={{
            margin: '0 0 4px',
            fontSize: 27,
            fontWeight: 900,
            color: '#0A1F6E',
            fontFamily: "'Inter', 'Roboto', Arial, sans-serif",  // ← fixed from Georgia
            letterSpacing: '-0.5px',
          }}>
            Monthly EMI: ₹ {monthlyEMI.toLocaleString('en-IN')}
          </p>
          {/* In Words for EMI — auto-shrink */}
          <ShrinkText
            text={toWords(monthlyEMI)}
            maxSize={11}
            minSize={6.5}
            style={{ textAlign: 'center', color: '#6b7280' }}
          />
        </div>
      </div>

      {/* Footer removed as requested */}
      <div style={{ height: 24 }} />
    </div>
  );
};

export default EMICalculator;
