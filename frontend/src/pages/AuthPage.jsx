import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import './AuthPage.css';

const AuthPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleError = (err) => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (err.message === 'Failed to fetch' || err.message.includes('NetworkError')) {
      if (!supabaseUrl || supabaseUrl.includes('[YOUR-PROJECT-REF]')) {
        setError('Supabase authentication is not configured. Please check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
      } else {
        setError('Không thể kết nối tới hệ thống đăng nhập. Vui lòng thử lại sau.');
      }
    } else if (err.message === 'Invalid login credentials') {
      setError('Sai email hoặc mật khẩu. Vui lòng kiểm tra lại.');
    } else {
      setError(err.message);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      if (isForgotPassword) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setSuccess('Kiểm tra email của bạn để nhận liên kết đặt lại mật khẩu!');
      } else if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setSuccess('Kiểm tra email của bạn để xác nhận tài khoản!');
      }
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSSO = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
    } catch (err) {
      handleError(err);
    }
  };

  const switchTab = (login) => {
    setIsLogin(login);
    setError(null);
    setSuccess(null);
    setEmail('');
    setPassword('');
  };

  return (
    <div className="auth-root">
      {/* Animated background orbs */}
      <div className="auth-orb auth-orb-1" />
      <div className="auth-orb auth-orb-2" />
      <div className="auth-orb auth-orb-3" />
      <div className="auth-orb auth-orb-4" />

      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo-wrap">
          <div className="auth-logo">
            <span className="auth-logo-letter">F</span>
          </div>
        </div>

        {/* Header */}
        <div className="auth-header">
          <h1 className="auth-title">
            {isForgotPassword ? 'Khôi phục mật khẩu' : 'FPTU Student Guide'}
          </h1>
          <p className="auth-subtitle">
            {isForgotPassword
              ? 'Nhập email để nhận liên kết đặt lại mật khẩu'
              : 'Khám phá không gian học tập của bạn'}
          </p>
        </div>

        {/* Segmented Tab Control */}
        {!isForgotPassword && (
          <div className="auth-tabs">
            <button
              className={`auth-tab ${isLogin ? 'auth-tab--active' : ''}`}
              onClick={() => switchTab(true)}
            >
              Đăng nhập
            </button>
            <button
              className={`auth-tab ${!isLogin ? 'auth-tab--active' : ''}`}
              onClick={() => switchTab(false)}
            >
              Đăng ký
            </button>
          </div>
        )}

        {/* Alerts */}
        {error && (
          <div className="auth-alert auth-alert--error">
            <span className="auth-alert-icon">⚠</span>
            {error}
          </div>
        )}
        {success && (
          <div className="auth-alert auth-alert--success">
            <span className="auth-alert-icon">✓</span>
            {success}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleAuth} className="auth-form" noValidate>
          <div className="auth-field">
            <label className="auth-label">Email FPTU</label>
            <input
              className="auth-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="mssv@fpt.edu.vn"
              required
              autoComplete="email"
            />
          </div>

          {!isForgotPassword && (
            <div className="auth-field">
              <label className="auth-label">Mật khẩu</label>
              <div className="auth-input-wrap">
                <input
                  className="auth-input auth-input--password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                />
                <button
                  type="button"
                  className="auth-eye-btn"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            className="auth-btn-primary"
            disabled={loading}
          >
            {loading && <Loader2 className="auth-spinner" size={18} />}
            {loading
              ? 'Đang xử lý...'
              : isForgotPassword
              ? 'Gửi liên kết khôi phục'
              : isLogin
              ? 'Đăng nhập'
              : 'Tạo tài khoản'}
          </button>
        </form>

        {/* Separator + Google SSO */}
        {!isForgotPassword && (
          <>
            <div className="auth-divider">
              <span className="auth-divider-line" />
              <span className="auth-divider-text">HOẶC</span>
              <span className="auth-divider-line" />
            </div>

            <button className="auth-btn-google" onClick={handleGoogleSSO}>
              <svg
                className="auth-google-icon"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Tiếp tục với Google
            </button>
          </>
        )}

        {/* Footer */}
        <div className="auth-footer">
          {isForgotPassword ? (
            <button
              className="auth-link"
              onClick={() => {
                setIsForgotPassword(false);
                setError(null);
                setSuccess(null);
              }}
            >
              ← Quay lại Đăng nhập
            </button>
          ) : (
            isLogin && (
              <button
                className="auth-link"
                onClick={() => {
                  setIsForgotPassword(true);
                  setError(null);
                  setSuccess(null);
                }}
              >
                Quên mật khẩu?
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
