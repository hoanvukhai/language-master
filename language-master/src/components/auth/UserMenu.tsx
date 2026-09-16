// src/components/auth/UserMenu.tsx
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/auth/useAuth';
import { LogOut, ChevronDown, Flame, Settings, User as UserIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function UserMenu() {
  const { user, role, userProfile, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Đóng menu khi click ngoài
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  const displayName = user.displayName || user.email?.split('@')[0] || 'User';
  const photoURL = user.photoURL;

  // Calculate EXP progress
  const level = userProfile?.level || 1;
  const totalExp = userProfile?.totalExp || 0;
  const nextLevelExp = userProfile?.nextLevelExp || 100;
  const currentLevelExp = Math.pow(level - 1, 2) * 100;
  
  const expInLevel = totalExp - currentLevelExp;
  const expNeededInLevel = nextLevelExp - currentLevelExp;
  const progressPercent = Math.min(100, Math.max(0, (expInLevel / expNeededInLevel) * 100));

  return (
    <div ref={menuRef} className="relative z-[100]">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
      >
        {photoURL ? (
          <img src={photoURL} alt="" className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
        
        {/* Chỉ hiện thông tin Level và Tên trên Desktop */}
        <div className="hidden sm:flex flex-col items-start leading-none ml-1">
          <span className="text-sm font-bold text-slate-700 dark:text-slate-200 max-w-[100px] truncate">
            {displayName}
          </span>
          <span className="text-[10px] font-semibold text-blue-500 mt-0.5">Lv.{level}</span>
        </div>
        
        {/* Lửa Chuỗi - Hiện ngay trên Navbar cho mọi thiết bị */}
        {userProfile && userProfile.currentStreak > 0 && (
          <div className="flex items-center gap-1 ml-1 text-orange-500 font-bold text-sm bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded-md border border-orange-200 dark:border-orange-800/50 shadow-sm">
            <Flame size={14} className="fill-orange-500" />
            {userProfile.currentStreak}
          </div>
        )}
        
        <ChevronDown className={`w-4 h-4 ml-1 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 py-3 z-[100] animate-in fade-in slide-in-from-top-2">
          
          {/* Thông tin Cấp độ & EXP (Header) */}
          <div className="px-4 pb-4 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-base font-bold text-slate-800 dark:text-white truncate">{displayName}</p>
                <p className="text-xs text-slate-500 truncate">{user.email}</p>
              </div>
              {role === 'admin' && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 rounded">
                  ADMIN
                </span>
              )}
            </div>
            
            {/* Thanh Level Progress */}
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 border border-slate-100 dark:border-slate-700/50">
              <div className="flex justify-between items-end mb-2">
                <span className="text-sm font-black text-blue-600 dark:text-blue-400">Level {level}</span>
                <span className="text-[10px] font-bold text-slate-400">{totalExp} / {nextLevelExp} EXP</span>
              </div>
              <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 rounded-full transition-all duration-500 ease-out relative overflow-hidden" 
                  style={{ width: `${progressPercent}%` }} 
                >
                  <div className="absolute inset-0 bg-white/20 animate-pulse" />
                </div>
              </div>
              <p className="text-[10px] text-slate-500 mt-2 text-center">
                Còn <span className="font-bold text-blue-500">{expNeededInLevel - expInLevel} EXP</span> nữa để lên cấp!
              </p>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-2 px-2 flex flex-col gap-1 border-b border-slate-100 dark:border-slate-700">
            <button
              onClick={() => { setOpen(false); navigate('/profile'); }}
              className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-md text-indigo-500 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                  <UserIcon className="w-4 h-4" />
                </div>
                Hồ sơ học tập
              </div>
            </button>

            <button
              onClick={() => { setOpen(false); navigate('/settings'); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg transition-colors group"
            >
              <div className="p-1.5 bg-slate-100 dark:bg-slate-700 rounded-md text-slate-500 dark:text-slate-400 group-hover:scale-110 group-hover:rotate-45 transition-all">
                <Settings className="w-4 h-4" />
              </div>
              Cài đặt hệ thống
            </button>
          </div>

          <div className="pt-2 px-2">
            <button
              onClick={async () => { setOpen(false); await signOut(); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors group"
            >
              <div className="p-1.5 bg-red-100 dark:bg-red-900/30 rounded-md text-red-500 dark:text-red-400 group-hover:scale-110 transition-transform">
                <LogOut className="w-4 h-4" />
              </div>
              Đăng xuất
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
