import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase";

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("Đang hoàn tất đăng nhập...");
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function finishLogin() {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }

        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (data?.session) {
          if (!cancelled) navigate("/", { replace: true });
          return;
        }

        setIsError(true);
        setMessage("Không tìm thấy phiên đăng nhập. Vui lòng thử đăng nhập lại.");
      } catch (err) {
        console.error("OAuth callback failed:", err);
        setIsError(true);
        setMessage("Đăng nhập Google thất bại. Vui lòng thử lại.");
      }
    }

    finishLogin();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="flex-center w-full" style={{ height: '100vh', background: 'linear-gradient(135deg, var(--color-primary-soft) 0%, var(--color-background) 100%)' }}>
      <div className="card flex-col items-center" style={{ width: '100%', maxWidth: '320px', padding: 'var(--space-6)', textAlign: 'center', margin: 'var(--space-4)' }}>
        
        {!isError ? (
          <>
            <div className="highlight-marker" style={{ width: '48px', height: '48px', backgroundColor: 'var(--color-primary)', borderRadius: '12px', marginBottom: 'var(--space-6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
              FPT
            </div>
            <h2 className="text-lg font-medium" style={{ margin: 0, marginBottom: 'var(--space-2)' }}>Đang đăng nhập...</h2>
            <p className="text-sm text-muted" style={{ margin: 0 }}>{message}</p>
          </>
        ) : (
          <>
            <div style={{ width: '48px', height: '48px', backgroundColor: 'var(--color-warning-soft)', color: 'var(--color-destructive)', borderRadius: '12px', marginBottom: 'var(--space-6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
              !
            </div>
            <h2 className="text-lg" style={{ margin: 0, marginBottom: 'var(--space-2)', color: 'var(--color-destructive)' }}>Lỗi xác thực</h2>
            <p className="text-sm text-muted" style={{ margin: 0, marginBottom: 'var(--space-6)' }}>{message}</p>
            <button className="btn btn-outline w-full" onClick={() => navigate("/auth", { replace: true })}>
              Quay lại Đăng nhập
            </button>
          </>
        )}

      </div>
    </div>
  );
}
