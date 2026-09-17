import { NavLink, useNavigate } from 'react-router-dom';
import { LogIn, Library, Compass, WifiOff, BookOpen } from 'lucide-react';
import { useSettings } from '../context/global/useSettings';
import { useAuth } from '../context/auth/useAuth';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import UserMenu from './auth/UserMenu';

export default function Navbar() {
  const { language } = useSettings();
  const { user } = useAuth();
  const { isOnline } = useNetworkStatus();
  const navigate = useNavigate();

  const t = {
    vi: { myCourses: 'Của tôi', explore: 'Khám phá', dictionary: 'Từ điển', settings: 'Cài đặt', login: 'Đăng nhập', profile: 'Hồ sơ' },
    en: { myCourses: 'My Courses', explore: 'Explore', dictionary: 'Dictionary', settings: 'Settings', login: 'Login', profile: 'Profile' }
  }[language];

  const links = [
    { to: '/', end: true, icon: Library, label: t.myCourses },
    { to: '/explore', end: false, icon: Compass, label: t.explore },
    { to: '/dictionary', end: false, icon: BookOpen, label: t.dictionary },
  ];

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center justify-center gap-1.5 p-2 sm:px-3 sm:py-2 rounded-xl font-bold transition-all text-xs sm:text-sm select-none ${
      isActive
        ? 'bg-blue-600 text-white shadow-sm'
        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60'
    }`;

  return (
    <nav className="bg-white dark:bg-slate-800 shadow-sm border-b border-gray-100 dark:border-slate-700 sticky top-0 z-50 transition-colors duration-300">
      <div className="max-w-5xl mx-auto px-3 sm:px-4 h-14 flex items-center justify-between gap-2">

        {/* Logo */}
        <div
          onClick={() => navigate('/')}
          className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2 transition-colors flex-shrink-0 cursor-pointer select-none group"
        >
          <img src="/favicon.svg" alt="Language Master" className="w-8 h-8 rounded-xl shadow-md transition-transform group-hover:scale-105" />
          <span className="hidden md:inline font-black tracking-tight bg-gradient-to-r from-blue-600 via-indigo-600 to-amber-500 bg-clip-text text-transparent">
            Language Master
          </span>
          <span className="md:hidden font-black text-blue-600 dark:text-blue-400 text-base">LM</span>
        </div>

        {/* Right Section: Navigation Links pushed to the right + UserMenu / Login */}
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          <div className="flex items-center gap-1 sm:gap-1.5">
            {links.map(link => {
              const Icon = link.icon;
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  className={navClass}
                  title={link.label}
                >
                  <Icon size={18} className="shrink-0" />
                  <span className="hidden sm:inline">{link.label}</span>
                </NavLink>
              );
            })}
          </div>

          {!isOnline && (
            <div
              className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40 text-[11px] font-bold animate-pulse"
              title="Đang mất kết nối mạng. Bạn đang ở chế độ Ngoại tuyến."
            >
              <WifiOff size={12} />
              <span className="hidden sm:inline">Ngoại tuyến</span>
            </div>
          )}

          {user ? (
            <UserMenu />
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-2 rounded-xl text-xs sm:text-sm font-bold bg-indigo-500 text-white hover:bg-indigo-600 transition-colors shadow-sm"
              title={t.login}
            >
              <LogIn size={16} />
              <span className="hidden sm:inline">{t.login}</span>
            </button>
          )}
        </div>

      </div>
    </nav>
  );
}