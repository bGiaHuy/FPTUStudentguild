import React, { useEffect, useState } from 'react';
import useAppStore from '../../stores/useAppStore';

const getItemStyle = (type) => {
  switch(type) {
    case 'room': return { fill: 'var(--room-class)', showLabel: true };
    case 'office': return { fill: 'var(--room-office)', showLabel: true };
    case 'research_center': return { fill: 'var(--room-research)', showLabel: true };
    case 'library': return { fill: 'var(--room-library)', showLabel: true };
    case 'toilet': return { fill: 'var(--room-wc)', showLabel: false, shortLabel: true };
    case 'stair': return { fill: 'var(--room-stair)', showLabel: false };
    case 'door': return { fill: 'var(--room-door)', showLabel: false };
    case 'lobby': return { fill: 'var(--room-lobby)', showLabel: true };
    case 'technical_room': return { fill: 'var(--room-tech)', showLabel: false };
    case 'unknown': return { fill: '#F1F5F9', showLabel: false };
    default: return { fill: 'var(--room-door)', showLabel: true };
  }
};

const LEGEND_ITEMS = [
  { type: 'Phòng học', color: 'var(--room-class)' },
  { type: 'Văn phòng', color: 'var(--room-office)' },
  { type: 'TT Nghiên cứu', color: 'var(--room-research)' },
  { type: 'Thư viện', color: 'var(--room-library)' },
  { type: 'Sảnh', color: 'var(--room-lobby)' },
  { type: 'WC', color: 'var(--room-wc)' },
  { type: 'Cầu thang', color: 'var(--room-stair)' },
  { type: 'Kỹ thuật', color: 'var(--room-tech)' },
];

const MapContainer = () => {
  const { currentFloorId, floors, mapItems, selectedMapItem, setSelectedMapItem, highlightedRoomCode, mapError } = useAppStore();
  const [currentFloor, setCurrentFloor] = useState(null);
  const [viewBox, setViewBox] = useState("0 0 1000 1000");

  // Hover state for interactive rooms
  const [hoveredItemId, setHoveredItemId] = useState(null);

  useEffect(() => {
    if (currentFloorId && floors) {
      const floor = floors.find(f => f.id === currentFloorId);
      setCurrentFloor(floor);
    }
  }, [currentFloorId, floors]);

  useEffect(() => {
    if (mapItems && mapItems.length > 0) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      mapItems.forEach(item => {
        if (item.polygon && item.polygon.length > 0) {
          item.polygon.forEach(([x, y]) => {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          });
        }
      });
      if (minX !== Infinity) {
        // Decrease padding to make the map scale larger inside the container
        const padding = 20;
        setViewBox(`${minX - padding} ${minY - padding} ${(maxX - minX) + padding * 2} ${(maxY - minY) + padding * 2}`);
      }
    }
  }, [mapItems]);

  if (mapError) return (
    <div className="flex-center w-full h-full" style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-destructive)' }}>
      <strong>{mapError}</strong>
    </div>
  );
  if (!currentFloor) return <div className="flex-center w-full h-full text-muted" style={{ fontWeight: 600 }}>Đang tải bản đồ...</div>;

  return (
    <div style={{ height: '100%', width: '100%', position: 'relative', overflow: 'hidden', backgroundColor: 'var(--color-background)' }}>
      
      {/* Legend (Glassmorphic) */}
      <div className="glass-panel" style={{
        position: 'absolute', bottom: '24px', right: '24px', 
        padding: '16px', zIndex: 900,
        display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', fontSize: '13px',
        pointerEvents: 'none'
      }}>
        {LEGEND_ITEMS.map(l => (
          <div key={l.type} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '12px', height: '12px', backgroundColor: l.color, borderRadius: '4px', border: '1px solid rgba(0,0,0,0.05)', boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.5)' }}></div>
            <span style={{ color: 'var(--color-foreground)', fontWeight: 600 }}>{l.type}</span>
          </div>
        ))}
      </div>

      {/* SVG Map Renderer */}
      <svg 
        viewBox={viewBox} 
        style={{ width: '100%', height: '100%', cursor: 'grab', display: 'block' }}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {mapItems && mapItems.map((item) => {
            if (!item.polygon || item.polygon.length === 0) return null;
            const points = item.polygon.map(([x, y]) => `${x},${y}`).join(" ");
            return (
              <clipPath id={`clip-${item.item_id}`} key={`clip-${item.item_id}`}>
                <polygon points={points} />
              </clipPath>
            );
          })}
          {/* Drop shadow for selected rooms */}
          <filter id="selected-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="rgba(243,112,33,0.4)" />
          </filter>
        </defs>

        {mapItems && mapItems.map((item) => {
          if (!item.polygon || item.polygon.length === 0) return null;
          
          const isSelected = selectedMapItem?.item_id === item.item_id || highlightedRoomCode === item.room_code;
          const isHovered = hoveredItemId === item.item_id;
          const points = item.polygon.map(([x, y]) => `${x},${y}`).join(" ");
          const style = getItemStyle(item.item_type);

          // Calculate bounding box and center
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          let cx = 0, cy = 0;
          item.polygon.forEach(([x, y]) => {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
            cx += x; cy += y;
          });
          cx /= item.polygon.length;
          cy /= item.polygon.length;
          
          if (item.center_x && item.center_y) {
            cx = item.center_x;
            cy = item.center_y;
          }

          const width = maxX - minX;
          const height = maxY - minY;

          // Label rendering logic
          let labelText = null;
          let shouldShowLabel = style.showLabel;

          if (item.item_type === 'toilet' && width > 20 && height > 20) {
            shouldShowLabel = true;
            labelText = (item.name || "").toLowerCase().includes("nữ") ? "WC Nữ" : 
                        (item.name || "").toLowerCase().includes("nam") ? "WC Nam" : "WC";
          } else if (item.item_type === 'stair' && width > 30 && height > 30) {
            shouldShowLabel = true;
            labelText = "Thang";
          } else if (item.item_type === 'technical_room' && width > 30 && height > 30) {
            shouldShowLabel = true;
            labelText = "K.Thuật";
          } else if (width < 35 || height < 15) {
            shouldShowLabel = false; 
          }

          if (shouldShowLabel && !labelText) {
            labelText = item.room_code || item.name;
          }

          const fontSize = Math.min(Math.max(height * 0.25, 8), 16);
          const maxChars = Math.floor(width / (fontSize * 0.6));
          
          if (labelText && labelText.length > maxChars + 2) {
            labelText = ''; 
          }

          return (
            <g 
              key={item.item_id || item.room_code || Math.random()} 
              onClick={() => setSelectedMapItem(item)} 
              onMouseEnter={() => setHoveredItemId(item.item_id)}
              onMouseLeave={() => setHoveredItemId(null)}
              style={{ cursor: 'pointer', transition: 'all 0.2s ease-in-out' }}
            >
              <title>{item.room_code ? `${item.room_code} - ${item.name}` : item.name}</title>
              
              <polygon
                points={points}
                fill={style.fill}
                fillOpacity={isSelected ? 1 : (isHovered ? 0.8 : 0.95)}
                stroke={isSelected ? 'var(--color-primary)' : (isHovered ? 'var(--color-primary-soft)' : 'rgba(0,0,0,0.05)')}
                strokeWidth={isSelected ? 3 : (isHovered ? 2 : 1.5)}
                strokeLinejoin="round"
                filter={isSelected ? 'url(#selected-shadow)' : 'none'}
                style={{ transition: 'all 0.25s ease' }}
              />
              
              {isSelected && (
                <polygon
                   points={points}
                   fill="none"
                   stroke="var(--color-primary)"
                   strokeWidth="6"
                   strokeOpacity="0.2"
                   strokeLinejoin="round"
                />
              )}
              {shouldShowLabel && labelText && (
                <text 
                  x={cx} 
                  y={cy} 
                  textAnchor="middle" 
                  alignmentBaseline="middle"
                  fontSize={fontSize}
                  fill={isSelected ? 'var(--color-primary-hover)' : 'var(--color-foreground)'}
                  fontWeight={isSelected ? 800 : 700}
                  letterSpacing="-0.02em"
                  pointerEvents="none"
                  clipPath={`url(#clip-${item.item_id})`}
                  style={{ transition: 'all 0.2s ease', userSelect: 'none' }}
                >
                  {labelText}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default MapContainer;
