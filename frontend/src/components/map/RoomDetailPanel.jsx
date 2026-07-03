import React from 'react';
import useAppStore from '../../stores/useAppStore';
import { X, MapPin, Search } from 'lucide-react';
import PathfindingDisabledChip from './PathfindingDisabledChip';

const TYPE_MAP = {
  room: 'Phòng học',
  office: 'Văn phòng',
  research_center: 'Trung tâm nghiên cứu',
  library: 'Thư viện',
  toilet: 'Phòng vệ sinh (WC)',
  stair: 'Cầu thang',
  door: 'Cửa ra vào',
  lobby: 'Sảnh / Hành lang',
  technical_room: 'Phòng kỹ thuật',
  unknown: 'Khu vực khác'
};

const formatType = (type) => TYPE_MAP[type] || type;

const RoomDetailPanel = () => {
  const { selectedMapItem, setSelectedMapItem } = useAppStore();
  const [metadata, setMetadata] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (selectedMapItem?.room_code) {
      setLoading(true);
      fetch(`/api/map/metadata/${selectedMapItem.room_code}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          setMetadata(data);
          setLoading(false);
        })
        .catch(err => {
          console.error("Error fetching metadata:", err);
          setMetadata(null);
          setLoading(false);
        });
    } else {
      setMetadata(null);
    }
  }, [selectedMapItem]);

  if (!selectedMapItem) return null;

  return (
    <div className="room-detail-panel" style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-4)',
      overflowY: 'auto',
      backgroundColor: 'var(--color-surface)',
      height: '100%',
      padding: 'var(--space-6)',
      borderRadius: 'var(--radius-lg)'
    }}>
      <div className="flex-row justify-between items-start">
        <div className="flex-col gap-1">
          <h2 className="text-xl" style={{ margin: 0, color: 'var(--color-foreground)' }}>
            {selectedMapItem.name || selectedMapItem.room_code || 'Phòng không tên'}
          </h2>
          <span className="text-sm text-muted">
            {selectedMapItem.room_code ? `Mã: ${selectedMapItem.room_code}` : 'Chưa có mã'} • {formatType(selectedMapItem.item_type)}
            {selectedMapItem.item_id && <><br/>ID: {selectedMapItem.item_id}</>}
          </span>
        </div>
        <button 
          onClick={() => setSelectedMapItem(null)} 
          className="btn btn-ghost" 
          style={{ padding: 'var(--space-2)' }}
        >
          <X size={20} className="text-muted" />
        </button>
      </div>

      <div className="flex-col gap-3" style={{ marginTop: 'var(--space-4)' }}>
        <div className="flex-row items-center gap-3">
          <div className="flex-center" style={{ width: 40, height: 40, backgroundColor: 'var(--color-primary-soft)', color: 'var(--color-primary)', borderRadius: 'var(--radius-md)' }}>
            <MapPin size={20} />
          </div>
          <div className="flex-col">
            <span className="text-sm" style={{ fontWeight: 500 }}>Vị trí</span>
            <span className="text-xs text-muted">Tòa nhà Delta {metadata?.floor ? `- Tầng ${metadata.floor}` : ''}</span>
          </div>
        </div>

        {loading ? (
          <div className="text-sm text-muted" style={{ padding: 'var(--space-2) 0' }}>Đang tải thông tin...</div>
        ) : metadata && (
          <>
            {metadata.description && (
              <div className="flex-col gap-1" style={{ marginTop: 'var(--space-2)' }}>
                <span className="text-sm" style={{ fontWeight: 500 }}>Mô tả</span>
                <span className="text-sm text-muted">{metadata.description}</span>
              </div>
            )}
            {metadata.opening_hours && (
              <div className="flex-col gap-1" style={{ marginTop: 'var(--space-2)' }}>
                <span className="text-sm" style={{ fontWeight: 500 }}>Giờ mở cửa</span>
                <span className="text-sm text-muted">{metadata.opening_hours}</span>
              </div>
            )}
            {metadata.contact && (
              <div className="flex-col gap-1" style={{ marginTop: 'var(--space-2)' }}>
                <span className="text-sm" style={{ fontWeight: 500 }}>Liên hệ</span>
                <span className="text-sm text-muted">{metadata.contact}</span>
              </div>
            )}
          </>
        )}

        <div className="flex-row items-center gap-3" style={{ marginTop: 'var(--space-2)' }}>
          <div className="flex-center" style={{ width: 40, height: 40, backgroundColor: 'var(--color-muted)', color: 'var(--color-foreground)', borderRadius: 'var(--radius-md)' }}>
            <Search size={20} />
          </div>
          <div className="flex-col">
            <span className="text-sm" style={{ fontWeight: 500 }}>Tìm kiếm</span>
            <span className="text-xs text-muted">
              {selectedMapItem.searchable ? 'Cho phép tìm kiếm' : 'Ẩn khỏi tìm kiếm'}
            </span>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 'var(--space-6)' }}>
        <PathfindingDisabledChip />
      </div>

      {selectedMapItem.review_status === 'needs_human_review' && (
        <div style={{ 
          marginTop: 'var(--space-4)',
          backgroundColor: '#ffeeba', 
          color: '#856404', 
          padding: 'var(--space-3)', 
          borderRadius: 'var(--radius-md)',
          fontSize: 'var(--text-xs)',
          fontWeight: 500
        }}>
          ⚠️ Vị trí đang ở trạng thái tự động map, cần kiểm tra lại.
        </div>
      )}


    </div>
  );
};

export default RoomDetailPanel;
