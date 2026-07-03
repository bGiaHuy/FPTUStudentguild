import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Loader2 } from 'lucide-react';

const ResetPasswordPage = () => {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Optional: Check if we actually have a session from the recovery link
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError("Không tìm thấy phiên làm việc hợp lệ. Vui lòng yêu cầu lại link đặt lại mật khẩu.");
      }
    };
    checkSession();
  }, []);

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccess('Cập nhật mật khẩu thành công! Chuyển hướng...');
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-center w-full" style={{ height: '100vh', background: 'linear-gradient(135deg, var(--color-primary-soft) 0%, var(--color-background) 100%)' }}>
      <div className="card" style={{ width: '100%', maxWidth: '420px', padding: 'var(--space-6)', margin: 'var(--space-4)' }}>
        <div className="flex-col items-center gap-2" style={{ marginBottom: 'var(--space-6)', textAlign: 'center' }}>
          <h1 className="text-2xl text-primary" style={{ margin: 0 }}>
            Tạo mật khẩu mới
          </h1>
          <p className="text-sm text-muted" style={{ margin: 0 }}>
            Nhập mật khẩu mới cho tài khoản của bạn.
          </p>
        </div>
        
        {error && <div style={{ color: 'var(--color-error)', backgroundColor: 'var(--color-warning-soft)', padding: '12px', borderRadius: 'var(--radius-md)', marginBottom: '16px', fontSize: '14px', borderLeft: '4px solid var(--color-error)' }}>{error}</div>}
        {success && <div style={{ color: 'var(--color-success)', backgroundColor: '#D1FAE5', padding: '12px', borderRadius: 'var(--radius-md)', marginBottom: '16px', fontSize: '14px', borderLeft: '4px solid var(--color-success)' }}>{success}</div>}

        <form onSubmit={handleUpdatePassword} className="flex-col gap-4">
          <div className="flex-col gap-2">
            <label className="text-sm" style={{ fontWeight: 500 }}>Mật khẩu mới</label>
            <input 
              className="input-field"
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required 
            />
          </div>
          <button type="submit" className="btn btn-primary w-full" disabled={loading} style={{ marginTop: 'var(--space-2)' }}>
            {loading ? <Loader2 className="animate-spin" style={{ marginRight: '8px' }} size={16} /> : null}
            {loading ? 'Đang xử lý...' : 'Cập nhật mật khẩu'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
