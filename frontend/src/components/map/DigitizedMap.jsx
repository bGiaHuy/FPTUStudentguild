import React, { useEffect, useState, useMemo } from 'react';
import useAppStore from '../../stores/useAppStore';

const DigitizedMap = () => {
  const { currentFloorId, draftDeltaData, selectedMapItem, setSelectedMapItem, highlightedRoomCode } = useAppStore();
  const [currentFloor, setCurrentFloor] = useState(null);

  useEffect(() => {
    if (currentFloorId && draftDeltaData) {
      const floor = draftDeltaData.floors.find(f => f.floor_number === currentFloorId || f.id === currentFloorId);
      setCurrentFloor(floor);
    }
  }, [currentFloorId, draftDeltaData]);

  if (!draftDeltaData) return <div className="flex-center w-full h-full text-muted">Đang tải bản đồ số hóa...</div>;
  if (!currentFloor) return <div className="flex-center w-full h-full text-muted">Không tìm thấy dữ liệu tầng.</div>;

  // Render items based on row_section and order_in_row
  const topSection = [];
  const middleSection = [];
  const bottomSection = [];

  (currentFloor.items || []).forEach(item => {
    if (item.row_section === 'top') topSection.push(item);
    else if (item.row_section === 'middle') middleSection.push(item);
    else if (item.row_section === 'bottom') bottomSection.push(item);
  });

  const sortByOrder = (a, b) => (a.order_in_row || 0) - (b.order_in_row || 0);
  topSection.sort(sortByOrder);
  middleSection.sort(sortByOrder);
  bottomSection.sort(sortByOrder);

  const renderSection = (items, sectionName) => {
    return (
      <div className={`map-section map-section-${sectionName}`} style={{
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'stretch',
        flexWrap: 'nowrap',
        width: '100%',
        minHeight: sectionName === 'middle' ? '120px' : '80px',
        gap: '8px',
        padding: '8px 16px'
      }}>
        {items.map(item => {
          const isSelected = selectedMapItem?.item_id === item.id || highlightedRoomCode === item.room_code || selectedMapItem?.id === item.id;
          
          let flexGrow = 1;
          // Determine relative sizes roughly based on types
          if (item.type === 'atrium' || item.type === 'skylight') flexGrow = 3;
          if (item.type === 'library') flexGrow = 2;
          if (item.type === 'hallway') flexGrow = 0.5;

          const baseClass = `digitized-room zone-${item.color_zone || 'none'} type-${item.type}`;
          const selectedClass = isSelected ? 'selected-room' : '';
          const clickableClass = item.is_clickable ? 'clickable-room' : '';

          return (
            <div 
              key={item.id}
              className={`${baseClass} ${selectedClass} ${clickableClass}`}
              style={{
                flex: `${flexGrow} 1 0`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                borderRadius: '8px',
                padding: '8px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: item.is_clickable ? 'pointer' : 'default',
                transition: 'all 0.2s ease',
                border: '2px solid transparent',
                position: 'relative'
              }}
              onClick={() => {
                if (item.is_clickable) {
                  // Make sure item matches structure expected by store (needs item_id or id)
                  setSelectedMapItem({...item, item_id: item.id});
                }
              }}
              title={item.notes || item.display_name}
            >
              <span style={{ zIndex: 2 }}>{item.display_name}</span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="digitized-map-container" style={{
      width: '100%',
      height: '100%',
      backgroundColor: '#f8f9fa',
      overflow: 'auto',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '20px'
    }}>
      <div className="map-schematic-board" style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        minWidth: '800px',
        maxWidth: '1200px',
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
        padding: '24px',
        gap: '16px'
      }}>
        {/* Floor Indicator */}
        <div style={{ textAlign: 'center', marginBottom: '10px' }}>
          <h2 style={{ color: '#333', margin: 0 }}>{currentFloor.floor_name || `Tầng ${currentFloor.floor_number}`}</h2>
        </div>

        {topSection.length > 0 && renderSection(topSection, 'top')}
        {middleSection.length > 0 && renderSection(middleSection, 'middle')}
        {bottomSection.length > 0 && renderSection(bottomSection, 'bottom')}
        
        {/* Legend */}
        {currentFloor.legend && (
          <div style={{
            marginTop: '20px',
            display: 'flex',
            justifyContent: 'center',
            gap: '16px',
            flexWrap: 'wrap',
            padding: '16px',
            backgroundColor: '#f1f3f5',
            borderRadius: '8px'
          }}>
            {Object.entries(currentFloor.legend).map(([color, label]) => (
              <div key={color} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div className={`zone-${color}`} style={{ width: '16px', height: '16px', borderRadius: '4px' }}></div>
                <span style={{ fontSize: '13px', color: '#495057' }}>{label}</span>
              </div>
            ))}
            {currentFloor.floor_number === 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div className="zone-facility" style={{ width: '16px', height: '16px', borderRadius: '4px' }}></div>
                <span style={{ fontSize: '13px', color: '#495057' }}>Tiện ích chung (WC, Thang, Cửa)</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DigitizedMap;
