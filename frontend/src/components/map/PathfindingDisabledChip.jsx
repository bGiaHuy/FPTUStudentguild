import React from 'react';
import { Route } from 'lucide-react';

const PathfindingDisabledChip = () => {
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 'var(--space-2)',
      backgroundColor: 'var(--color-warning-soft)',
      color: 'var(--color-warning)',
      padding: 'var(--space-1) var(--space-3)',
      borderRadius: 'var(--radius-pill)',
      fontSize: 'var(--text-xs)',
      fontWeight: 500
    }}>
      <Route size={14} />
      <span>Tìm đường — đang chờ dữ liệu hành lang được xác minh</span>
    </div>
  );
};

export default PathfindingDisabledChip;
