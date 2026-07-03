import React, { useState } from 'react';
import './FloorPlanView.css';

/* ── SVG Icons ── */
const StairIcon = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <rect x="1" y="11" width="14" height="4" rx="1.5" fill="#7C3AED" opacity="0.32"/>
    <rect x="4" y="7"  width="11" height="4" rx="1.5" fill="#7C3AED" opacity="0.54"/>
    <rect x="7" y="3"  width="8"  height="4" rx="1.5" fill="#7C3AED" opacity="0.76"/>
  </svg>
);

const ElevatorIcon = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <rect x="2" y="2" width="12" height="12" rx="2.5" stroke="#7C3AED" strokeWidth="1.5" fill="rgba(124,58,237,0.08)"/>
    <path d="M8 4.5 L5.5 7.5 L10.5 7.5 Z" fill="#7C3AED"/>
    <path d="M8 11.5 L5.5 8.5 L10.5 8.5 Z" fill="#7C3AED"/>
  </svg>
);

const LocationPin = () => (
  <svg width="26" height="34" viewBox="0 0 26 34" fill="none" aria-label="Vị trí của bạn">
    <path d="M13 0C5.82 0 0 5.82 0 13c0 8.1 13 21 13 21s13-12.9 13-21C26 5.82 20.18 0 13 0z"
      fill="#F26D21" opacity="0.92"/>
    <circle cx="13" cy="13" r="5.5" fill="white"/>
    <circle cx="13" cy="13" r="2.8" fill="#F26D21"/>
  </svg>
);

/* ── Legend data ── */
const LEGEND_ITEMS = [
  { color: '#fef08a', borderColor: '#d97706', label: 'Kỹ thuật / Điện' },
  { color: '#fed7aa', borderColor: '#ea580c', label: 'Phòng học / Phòng chức năng' },
  { color: '#bfdbfe', borderColor: '#2563eb', label: 'Khu vực đặc biệt (STARTUP, ICPD)' },
  { color: '#bbf7d0', borderColor: '#16a34a', label: 'Thư viện / Học tập' },
  { color: '#ddd6fe', borderColor: '#7c3aed', label: 'Cầu thang bộ', icon: <StairIcon size={13}/> },
  { color: '#ddd6fe', borderColor: '#7c3aed', label: 'Thang máy (Duy nhất)', icon: <ElevatorIcon size={13}/> },
  { color: '#e5e7eb', borderColor: '#6b7280', label: 'Sảnh / Lối ra vào' },
  { color: '#fbcfe8', borderColor: '#db2777', label: 'Nhà vệ sinh' },
];

/* ── Tooltip component ── */
const Tooltip = ({ label }) => (
  <div className="fp-tooltip">{label}</div>
);

/* ── Room component ── */
const Room = ({ className, colorClass, label, icon, subLabel, tooltip }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className={`fp-room ${colorClass} ${className}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {icon && <div className="fp-room-icon">{icon}</div>}
      <span className="fp-label">{label}</span>
      {subLabel && <span className="fp-sublabel">{subLabel}</span>}
      {hovered && tooltip && <Tooltip label={tooltip}/>}
    </div>
  );
};

/* ── Main Component ── */
const FloorPlanView = ({ floorNumber = 1 }) => {
  return (
    <div className="fp-wrapper">
      {/* Map */}
      <div className="fp-map-area">

        {/* Floor badge */}
        <div className="fp-floor-badge">
          <span className="fp-floor-badge-text">Tầng {floorNumber}</span>
          <span className="fp-floor-badge-sub">Tòa Delta – FPTU HN</span>
        </div>

        <div className="fp-grid" role="img" aria-label="Sơ đồ tầng tòa nhà Delta">

          {/* ── ROW 1: Thư viện (full width) ── */}
          <Room
            className="fp-library-top"
            colorClass="fp-color-library"
            label="📚 Thư viện"
            tooltip="Khu vực thư viện và học tập"
          />

          {/* ── LEFT COLUMN ── */}
          <Room className="fp-kyThuat"   colorClass="fp-color-tech"      label="Kỹ thuật"        tooltip="Phòng kỹ thuật / khu điện"/>
          <Room className="fp-107A"      colorClass="fp-color-classroom"  label="107A"             tooltip="Phòng học 107A"/>
          <Room className="fp-stairL1"   colorClass="fp-color-stairs"     label="Cầu thang bộ"   icon={<StairIcon/>} tooltip="Cầu thang bộ (Trái – Trên)"/>
          <Room className="fp-108"       colorClass="fp-color-classroom"  label="108A – 108C"     tooltip="Phòng học 108A, 108B, 108C"/>
          <Room className="fp-nvsNuL"    colorClass="fp-color-restroom"   label="NVS NỮ"          tooltip="Nhà vệ sinh nữ"/>
          <Room className="fp-nvsNamL"   colorClass="fp-color-restroom"   label="NVS NAM"         tooltip="Nhà vệ sinh nam"/>
          <Room className="fp-109to111"  colorClass="fp-color-classroom"  label="109 – 111"       tooltip="Phòng học 109, 110, 111"/>
          <Room className="fp-stairL2"   colorClass="fp-color-stairs"     label="Cầu thang bộ"   icon={<StairIcon/>} tooltip="Cầu thang bộ (Trái – Dưới)"/>
          <Room className="fp-112"       colorClass="fp-color-classroom"  label="112"             tooltip="Phòng học 112"/>

          {/* ── CENTER HALLWAY ── */}
          <div className="fp-room fp-color-center fp-center-hall">
            <span className="fp-hallway-label">Hành lang / Không gian chung</span>
            <div className="fp-pulse-ring"/>
            <div className="fp-pin-wrap">
              <LocationPin/>
              <span className="fp-pin-label">Vị trí bạn</span>
            </div>
            <div className="fp-compass">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <circle cx="14" cy="14" r="13" stroke="#e5e7eb" strokeWidth="1.5"/>
                <path d="M14 4 L16 13 L14 11 L12 13 Z" fill="#F26D21"/>
                <path d="M14 24 L16 15 L14 17 L12 15 Z" fill="#9ca3af"/>
                <circle cx="14" cy="14" r="2" fill="#374151"/>
                <text x="14" y="3" textAnchor="middle" fontSize="5" fill="#F26D21" fontWeight="bold">N</text>
              </svg>
            </div>
          </div>

          {/* ── RIGHT COLUMN ── */}
          <Room className="fp-stairR"    colorClass="fp-color-stairs"     label="Cầu thang bộ"   icon={<StairIcon/>}    tooltip="Cầu thang bộ (Phải – Trên)"/>
          <Room className="fp-entrance"  colorClass="fp-color-hall"       label="Cửa ra vào"     tooltip="Cổng / Cửa ra vào"/>
          <Room className="fp-startup"   colorClass="fp-color-special"    label="🚀 STARTUP"     tooltip="Khu khởi nghiệp / STARTUP Hub"/>
          <Room className="fp-nvsNamR"   colorClass="fp-color-restroom"   label="NVS NAM"        tooltip="Nhà vệ sinh nam"/>
          <Room className="fp-nvsNuR"    colorClass="fp-color-restroom"   label="NVS NỮ"         tooltip="Nhà vệ sinh nữ"/>
          <Room className="fp-105to103"  colorClass="fp-color-classroom"  label="105 – 103"      tooltip="Phòng học 103, 104, 105"/>
          <Room
            className="fp-elevator"
            colorClass="fp-color-stairs"
            label="Thang máy"
            subLabel="(Duy nhất)"
            icon={<ElevatorIcon size={18}/>}
            tooltip="Thang máy – chỉ 1 thang duy nhất trong tòa nhà"
          />

          {/* ── BOTTOM ROW ── */}
          <Room className="fp-foyer"  colorClass="fp-color-hall"    label="🚪 Sảnh / Cửa chính" tooltip="Sảnh chính / Cửa ra vào tòa nhà"/>
          <Room className="fp-icpd"   colorClass="fp-color-special"  label="ICPD"                tooltip="Viện hợp tác & phát triển quốc tế"/>
        </div>

        {/* Scale bar */}
        <div className="fp-scale">
          <div className="fp-scale-bar"/>
          <span className="fp-scale-label">~20m</span>
        </div>
      </div>

      {/* ── LEGEND PANEL ── */}
      <aside className="fp-legend" aria-label="Bảng chú thích">
        <h3 className="fp-legend-title">BẢNG CHÚ THÍCH</h3>
        <div className="fp-legend-list">
          {LEGEND_ITEMS.map((item, i) => (
            <div key={i} className="fp-legend-item">
              <div
                className="fp-legend-box"
                style={{ backgroundColor: item.color, borderColor: item.borderColor + '55' }}
              >
                {item.icon}
              </div>
              <span className="fp-legend-text">{item.label}</span>
            </div>
          ))}
        </div>

        {/* Usage hint */}
        <div className="fp-legend-hint">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="6.5" stroke="#9ca3af" strokeWidth="1"/>
            <path d="M7 6v5" stroke="#9ca3af" strokeWidth="1.2" strokeLinecap="round"/>
            <circle cx="7" cy="4" r="0.7" fill="#9ca3af"/>
          </svg>
          <span>Di chuột lên phòng để xem thông tin</span>
        </div>
      </aside>
    </div>
  );
};

export default FloorPlanView;
