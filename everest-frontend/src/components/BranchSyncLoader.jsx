import React from 'react';

const BranchSyncLoader = ({
  branchName = 'Main Branch',
  fullScreen = true,
  subtitle = 'Fetching live collections, cash book & accounts',
  className = '',
}) => {
  const displayBranch = String(branchName || 'Main Branch').trim() || 'Main Branch';

  return (
    <div
      data-testid="branch-sync-loader"
      role="status"
      aria-live="polite"
      aria-label={`Syncing ${displayBranch} Ledger`}
      className={`${
        fullScreen
          ? 'fixed inset-0 z-[200] bg-gradient-to-br from-sky-100/75 via-blue-50/75 to-emerald-50/70 backdrop-blur-md'
          : 'w-full h-full min-h-[400px] bg-gradient-to-br from-sky-50/90 via-white/85 to-emerald-50/80 backdrop-blur-md rounded-2xl'
      } flex items-center justify-center p-4 animate-in fade-in duration-200 ${className}`}
    >
      {/* Frosted Glass Translucent Card */}
      <div className="relative overflow-hidden w-full max-w-[340px] sm:max-w-[400px] rounded-3xl bg-white/85 backdrop-blur-md border border-blue-200/80 shadow-[0_24px_60px_-15px_rgba(10,54,136,0.22)] px-6 py-8 sm:px-8 sm:py-9 flex flex-col items-center text-center">
        {/* Soft Corner Glow Accents */}
        <div className="pointer-events-none absolute -top-12 -left-12 w-36 h-36 rounded-full bg-blue-400/15 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-12 -right-12 w-36 h-36 rounded-full bg-emerald-400/15 blur-2xl" />

        {/* Center Animated Emblem: Everest Pulse & Orbiting Rupee Coins */}
        <div className="relative w-36 h-36 flex items-center justify-center mb-6 select-none">
          {/* Outer Royal Blue Counter-Clockwise / Clockwise Ring */}
          <svg
            viewBox="0 0 144 144"
            className="absolute inset-0 w-full h-full animate-everest-spin-cw pointer-events-none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="everestOuterRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0A3688" />
                <stop offset="50%" stopColor="#1D68E2" />
                <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.2" />
              </linearGradient>
            </defs>
            <circle
              cx="72"
              cy="72"
              r="62"
              fill="none"
              stroke="url(#everestOuterRingGrad)"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeDasharray="110 28 48 28"
            />
          </svg>

          {/* Inner Emerald Counter-Rotating Ring */}
          <svg
            viewBox="0 0 144 144"
            className="absolute inset-0 w-full h-full animate-everest-spin-ccw pointer-events-none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="everestInnerRingGrad" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#10B981" />
                <stop offset="55%" stopColor="#34D399" />
                <stop offset="100%" stopColor="#1D68E2" stopOpacity="0.18" />
              </linearGradient>
            </defs>
            <circle
              cx="72"
              cy="72"
              r="49"
              fill="none"
              stroke="url(#everestInnerRingGrad)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="84 22 40 22"
            />
          </svg>

          {/* 3 Orbiting Vibrant Rupee Nodes (120 deg intervals on r=62 orbit) */}
          <div className="absolute inset-0 animate-everest-orbit-cw pointer-events-none">
            {/* Gold ₹ Node (Top 0 deg) */}
            <div
              style={{ top: '2px', left: '50%', transform: 'translate(-50%, -50%)' }}
              className="absolute"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-300 via-amber-500 to-orange-500 text-white text-xs font-black flex items-center justify-center shadow-md shadow-amber-500/40 ring-2 ring-white animate-everest-orbit-ccw">
                ₹
              </div>
            </div>

            {/* Emerald ₹ Node (120 deg bottom-right) */}
            <div
              style={{ top: '103px', left: '126px', transform: 'translate(-50%, -50%)' }}
              className="absolute"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 text-white text-xs font-black flex items-center justify-center shadow-md shadow-emerald-500/40 ring-2 ring-white animate-everest-orbit-ccw">
                ₹
              </div>
            </div>

            {/* Violet ₹ Node (240 deg bottom-left) */}
            <div
              style={{ top: '103px', left: '18px', transform: 'translate(-50%, -50%)' }}
              className="absolute"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-400 via-violet-500 to-indigo-600 text-white text-xs font-black flex items-center justify-center shadow-md shadow-violet-500/40 ring-2 ring-white animate-everest-orbit-ccw">
                ₹
              </div>
            </div>
          </div>

          {/* Core Everest Heartbeat Badge (#0A3688 -> #1D68E2 -> #10B981) */}
          <div className="relative z-10 w-[72px] h-[72px] rounded-2xl bg-gradient-to-br from-[#0A3688] via-[#1D68E2] to-[#10B981] shadow-[0_12px_28px_-6px_rgba(29,104,226,0.55)] ring-4 ring-white/95 flex flex-col items-center justify-center text-white animate-everest-heartbeat">
            {/* Crisp Mountain Peak + ₹ Emblem SVG */}
            <svg viewBox="0 0 48 48" className="w-11 h-11" fill="none" aria-hidden="true">
              {/* Twin Everest Peak */}
              <path
                d="M6 34L18.5 14L25.5 24.5L31.5 17L42 34H6Z"
                fill="currentColor"
                fillOpacity="0.22"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Snow Ridge Accent */}
              <path
                d="M14.8 20L18.5 14L22.2 19.6"
                stroke="#FFFFFF"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Crisp Rupee Glyph Badge */}
              <text
                x="24"
                y="32"
                textAnchor="middle"
                fill="#FFFFFF"
                fontSize="13.5"
                fontWeight="900"
                fontFamily="system-ui, -apple-system, sans-serif"
              >
                ₹
              </text>
            </svg>
          </div>
        </div>

        {/* Dynamic Branch Status Title */}
        <h2 className="relative z-10 text-lg sm:text-xl font-extrabold text-[#0F172A] tracking-tight leading-snug">
          Syncing {displayBranch} Ledger...
        </h2>

        {/* Crisp Subtitle */}
        <p className="relative z-10 text-xs sm:text-[13px] font-medium text-slate-500 mt-1.5">
          {subtitle}
        </p>

        {/* Sleek Multi-Color Shimmer Progress Wave (Blue -> Emerald -> Amber -> Purple) */}
        <div className="relative z-10 w-full max-w-[260px] h-2 rounded-full bg-slate-200/80 overflow-hidden mt-5 p-[1px]">
          <div
            className="h-full w-full rounded-full animate-everest-shimmer"
            style={{
              backgroundImage: 'linear-gradient(90deg, #1D68E2 0%, #10B981 30%, #F59E0B 60%, #9333EA 85%, #1D68E2 100%)',
              backgroundSize: '200% 100%'
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default BranchSyncLoader;
