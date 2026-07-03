import React from 'react';
import { User, MapPin, LogOut } from 'lucide-react';
import useAppStore from '../stores/useAppStore';
import { supabase } from '../services/supabase';

const ProfilePage = () => {
  const { user, currentCampus, setCurrentCampus } = useAppStore();
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Tài khoản Sinh viên';
  const email = user?.email || 'Chưa cập nhật email';

  const campuses = [
    { id: 'HN', name: 'Hà Nội', address: 'Khu Công nghệ cao Hòa Lạc' },
    { id: 'HCM', name: 'Hồ Chí Minh', address: 'Khu Công nghệ cao, TP Thủ Đức' },
    { id: 'DN', name: 'Đà Nẵng', address: 'Khu Đô thị FPT City' },
    { id: 'CT', name: 'Cần Thơ', address: 'Khu vực Thạnh Hòa, Q. Bình Thủy' },
    { id: 'QN', name: 'Quy Nhơn', address: 'Khu đô thị mới An Phú Thịnh' }
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div style={{ height: '100%', overflowY: 'auto', backgroundColor: 'var(--color-background)', paddingBottom: 'var(--space-8)' }}>
      {/* Header */}
      <div style={{ padding: 'var(--space-6) var(--space-4)', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
        <div className="container" style={{ padding: 0, maxWidth: '900px' }}>
          <h2 className="text-2xl" style={{ margin: 0, fontWeight: 700 }}>Trang cá nhân</h2>
        </div>
      </div>

      <div className="container" style={{ padding: 'var(--space-6) var(--space-4)', maxWidth: '900px' }}>
        
        {/* User Info Card */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'var(--color-primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)' }}>
            <User size={32} />
          </div>
          <div>
            <h3 className="text-lg" style={{ margin: '0 0 4px 0', fontWeight: 600 }}>{userName}</h3>
            <p className="text-sm text-muted" style={{ margin: 0 }}>{email}</p>
          </div>
        </div>

        {/* Settings Section */}
        <h3 className="text-lg" style={{ marginBottom: 'var(--space-4)', fontWeight: 600 }}>Cài đặt ứng dụng</h3>
        
        <div className="card" style={{ padding: 'var(--space-2)' }}>
          <div style={{ padding: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)', borderBottom: '1px solid var(--color-border)' }}>
            <MapPin size={20} className="text-muted" />
            <div style={{ flex: 1 }}>
              <h4 className="text-base" style={{ margin: 0, fontWeight: 500 }}>Cơ sở đang học</h4>
              <p className="text-xs text-muted" style={{ margin: 0 }}>Chọn cơ sở để tùy chỉnh bản đồ và dữ liệu phù hợp</p>
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', padding: 'var(--space-3)' }}>
            {campuses.map(campus => {
              const isSelected = currentCampus === campus.id;
              return (
                <button
                  key={campus.id}
                  onClick={() => setCurrentCampus(campus.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 'var(--space-3)',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: isSelected ? 'var(--color-primary-soft)' : 'transparent',
                    border: isSelected ? '1px solid var(--color-primary)' : '1px solid transparent',
                    color: isSelected ? 'var(--color-primary)' : 'var(--color-foreground)',
                    textAlign: 'left',
                    transition: 'all 0.2s',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--color-muted)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <div>
                    <div style={{ fontWeight: isSelected ? 600 : 500 }}>{campus.name}</div>
                    <div style={{ fontSize: 'var(--text-xs)', opacity: 0.8 }}>{campus.address}</div>
                  </div>
                  {isSelected && (
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'var(--color-primary)' }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
        
        {/* Mobile Logout Button */}
        <div className="show-mobile" style={{ marginTop: 'var(--space-6)' }}>
          <button 
            className="btn btn-outline" 
            style={{ width: '100%', color: 'var(--color-destructive)', borderColor: 'var(--color-destructive-soft)' }}
            onClick={handleLogout}
          >
            <LogOut size={18} style={{ marginRight: '8px' }} />
            Đăng xuất
          </button>
        </div>

      </div>
    </div>
  );
};

export default ProfilePage;
