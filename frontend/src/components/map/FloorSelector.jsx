import React from 'react';
import { motion } from 'framer-motion';
import useAppStore from '../../stores/useAppStore';

const FloorSelector = () => {
  const { floors, currentFloorId, setCurrentFloorId } = useAppStore();

  if (!floors || floors.length === 0) return null;

  return (
    <div className="glass-panel" style={{
      display: 'flex',
      flexDirection: 'row',
      gap: '6px',
      alignItems: 'center',
      zIndex: 1000,
      padding: '8px 12px',
      borderRadius: '999px',
    }}>
      {/* Sort floors ascending so 1 is leftmost */}
      {[...floors].sort((a, b) => a.floor_number - b.floor_number).map(floor => (
        <motion.button
          key={floor.id}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setCurrentFloorId(floor.id)}
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            border: currentFloorId === floor.id ? 'none' : '1px solid var(--color-border)',
            backgroundColor: currentFloorId === floor.id ? 'var(--color-primary)' : 'var(--color-surface)',
            color: currentFloorId === floor.id ? 'white' : 'var(--color-foreground)',
            fontWeight: 700,
            fontSize: '15px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: currentFloorId === floor.id ? 'var(--shadow-glow)' : 'var(--shadow-sm)',
            transition: 'background-color 0.2s, color 0.2s',
          }}
          title={floor.name}
        >
          {floor.floor_number}
        </motion.button>
      ))}
    </div>
  );
};

export default FloorSelector;
