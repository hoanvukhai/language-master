// src/components/auth/LoginScreen.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/auth/useAuth';
import { LogIn, Mail, Eye, EyeOff, AlertCircle, ShieldCheck } from 'lucide-react';

export default function LoginScreen() {
  const { signInWithEmail } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Vui lòng nhập đầy đủ email và mật khẩu.');
      return;
    }

    try {
      setLoading(true);
      await signInWithEmail(email, password);
      navigate('/');
    } catch (err: any) {
      const errorMap: Record<string, string> = {
        'auth/user-not-found': 'Tài khoản không tồn tại.',
        'auth/wrong-password': 'Mật khẩu không đúng.',
        'auth/invalid-credential': 'Email hoặc mật khẩu không đúng.',
        'auth/too-many-requests': 'Quá nhiều lần thử sai. Vui lòng đợi một lát.',
      };
      setError(errorMap[err.code] || 'Tài khoản hoặc mật khẩu không đúng.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50/70 via-slate-50 to-purple-50/70 dark:from-slate-900 dark:via-indigo-950 dark:to-slate-900 px-4 transition-colors">
      <div className="w-full max-w-md">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-xl shadow-indigo-500/30 mb-4">
            <span className="text-4xl">🌸</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Study Quest</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Đăng nhập tài khoản được cấp</p>
        </div>

        {/* Card */}
        <div className="bg-white/90 dark:bg-white/10 backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-white/10 p-6 shadow-2xl dark:shadow-indigo-950/50">
          <div className="flex items-center justify-center gap-2 mb-6 px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-xs sm:text-sm font-medium border border-indigo-100 dark:border-indigo-800/40 text-center">
            <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            Hệ thống nội bộ — Đăng nhập bằng tài khoản được cấp
          </div>

          {/* Email Form */}
          <form onSubmit={handleEmail} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Email tài khoản</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50/80 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Mật khẩu</label>
              <div className="relative">
                <LogIn className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 bg-slate-50/80 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 bg-rose-50 dark:bg-red-500/10 border border-rose-200 dark:border-red-500/20 rounded-xl text-rose-700 dark:text-red-300 text-xs">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 mt-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-medium rounded-xl transition-all duration-200 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2"
            >
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 space-y-3">
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed px-4">
            💡 <strong className="text-slate-800 dark:text-white">Bạn chưa có tài khoản?</strong><br/>
            Bạn vẫn có thể trải nghiệm miễn phí các tính năng Học liệu, Tra cứu, Luyện tập và Đua Top (không lưu tiến độ).
          </p>
          <div className="p-3 bg-slate-100/80 dark:bg-white/5 rounded-xl border border-slate-200/80 dark:border-white/10 text-xs text-indigo-800 dark:text-indigo-300">
            Để mở khóa tính năng <strong>Học lặp lại ngắt quãng (SRS)</strong> và lưu trữ dữ liệu trọn đời, vui lòng liên hệ <strong className="text-indigo-600 dark:text-indigo-200">Admin</strong> qua Fanpage hoặc Email để được cấp tài khoản học viên nhé! ✨
          </div>
          <button onClick={() => navigate('/')} className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors pt-2">
            ← Quay về Trang chủ
          </button>
        </div>
      </div>
    </div>
  );
}
