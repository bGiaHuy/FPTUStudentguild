import React, { useEffect, useState, useMemo } from 'react';
import useAppStore from '../../stores/useAppStore';

const GeoJsonMap = () => {
  const { currentFloorId, draftDeltaData } = useAppStore();
  const [currentFeature, setCurrentFeature] = useState(null);

  useEffect(() => {
    if (currentFloorId && draftDeltaData && draftDeltaData.features) {
      const feature = draftDeltaData.features.find(f => f.properties.level === currentFloorId);
      setCurrentFeature(feature);
    }
  }, [currentFloorId, draftDeltaData]);

  const { pathData, viewBox } = useMemo(() => {
    if (!currentFeature || !currentFeature.geometry || currentFeature.geometry.type !== 'Polygon') {
      return { pathData: '', viewBox: '0 0 100 100' };
    }

    const rings = currentFeature.geometry.coordinates;
    let path = '';
    
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    rings.forEach(ring => {
      if (!ring || ring.length === 0) return;
      
      ring.forEach((point, i) => {
        const [x, y] = point;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        
        if (i === 0) {
          path += `M ${x} ${y} `;
        } else {
          path += `L ${x} ${y} `;
        }
      });
      path += 'Z ';
    });

    const padding = 10;
    const computedViewBox = `${minX - padding} ${minY - padding} ${(maxX - minX) + padding * 2} ${(maxY - minY) + padding * 2}`;
    
    return { pathData: path, viewBox: computedViewBox };
  }, [currentFeature]);

  if (!draftDeltaData) return <div className="flex-center w-full h-full text-muted">Đang tải bản đồ GeoJSON...</div>;
  if (!currentFeature) return <div className="flex-center w-full h-full text-muted">Không tìm thấy dữ liệu cho tầng này.</div>;

  return (
    <div className="geojson-map-container" style={{
      width: '100%',
      height: '100%',
      backgroundColor: '#e5e5e5', // subtle gray background for contrast
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '20px'
    }}>
      
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        padding: '8px 16px',
        borderRadius: '24px',
        boxShadow: 'var(--shadow-sm)',
        zIndex: 10,
        fontWeight: 600,
        color: 'var(--color-primary)'
      }}>
        {currentFeature.properties.name}
      </div>

      <svg 
        viewBox={viewBox} 
        style={{ width: '100%', height: '100%', display: 'block', cursor: 'grab' }}
        preserveAspectRatio="xMidYMid meet"
      >
        <path
          d={pathData}
          fill="var(--color-surface)"
          fillRule="evenodd"
          stroke="var(--color-primary)"
          strokeWidth="1"
          style={{
            transition: 'fill 0.3s ease',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => e.target.setAttribute('fill', 'var(--color-primary-soft)')}
          onMouseLeave={(e) => e.target.setAttribute('fill', 'var(--color-surface)')}
        />
        
        {/* Simple label in the center as placeholder since there's no room data */}
        <text 
          x="100" 
          y="50" 
          textAnchor="middle" 
          alignmentBaseline="middle"
          fontSize="4"
          fill="var(--color-muted-foreground)"
          fontWeight="500"
          pointerEvents="none"
        >
          {currentFeature.properties.name} Outline
        </text>
      </svg>
    </div>
  );
};

export default GeoJsonMap;
