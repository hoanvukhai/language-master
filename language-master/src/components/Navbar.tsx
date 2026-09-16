import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Menu, X, UserCircle, LogIn, Library, Compass, Settings, WifiOff } from 'lucide-react';
import { useSettings } from '../context/global/useSettings';
import { useAuth } from '../context/auth/useAuth';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { motion, AnimatePresence } from 'framer-motion';
import UserMenu from './auth/UserMenu';

export default function Navbar() {
  const { language } = useSettings();
  const { user } = useAuth();
  const { isOnline } = useNetworkStatus();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const t = {
    vi: { myCourses: 'Của tôi', explore: 'Khám phá', settings: 'Cài đặt', login: 'Đăng nhập', profile: 'Hồ sơ' },
    en: { myCourses: 'My Courses', explore: 'Explore', settings: 'Settings', login: 'Login', profile: 'Profile' }
  }[language];

  const links = [
    { to: '/', end: true, icon: Library, label: t.myCourses },
    { to: '/explore', end: false, icon: Compass, label: t.explore },
  ];


  // Desktop link style
  const desktopNavClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all text-sm ${isActive
      ? 'bg-blue-600 text-white shadow-md'
      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
    }`;

  // Mobile drawer link style
  const mobileNavClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all text-base ${isActive
      ? 'bg-blue-600 text-white shadow-sm'
      : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700'
    }`;

  return (
    <>
      <nav className="bg-white dark:bg-slate-800 shadow-sm border-b border-gray-100 dark:border-slate-700 sticky top-0 z-50 transition-colors duration-300">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">

          {/* Logo */}
          <div
            onClick={() => navigate('/')}
            className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2.5 transition-colors flex-shrink-0 cursor-pointer select-none group"
          >
            <img src="/favicon.svg" alt="Language Master" className="w-8 h-8 rounded-xl shadow-md transition-transform group-hover:scale-105" />
            <span className="hidden sm:inline font-black tracking-tight bg-gradient-to-r from-blue-600 via-indigo-600 to-amber-500 bg-clip-text text-transparent">
              Language Master
            </span>
            <span className="sm:hidden font-black text-blue-600">LM</span>
          </div>

          {/* Desktop links */}
          <div className="hidden sm:flex items-center gap-1">
            {links.map(link => {
              const Icon = link.icon;
              return (
                <NavLink key={link.to} to={link.to} end={link.end} className={desktopNavClass} onClick={() => setMenuOpen(false)}>
                  <Icon size={16} />
                  <span>{link.label}</span>
                </NavLink>
              );
            })}
            {/* Offline indicator badge */}
            {!isOnline && (
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40 text-xs font-bold animate-pulse"
                title="Đang mất kết nối mạng. Bạn đang ở chế độ Ngoại tuyến."
              >
                <WifiOff size={13} />
                <span className="hidden md:inline">Ngoại tuyến</span>
              </div>
            )}
            {/* Settings & Auth area */}
            <div className="ml-2 pl-2 border-l border-slate-200 dark:border-slate-600 flex items-center gap-2">
              {user ? (
                <UserMenu />
              ) : (
                <button
                  onClick={() => navigate('/login')}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-indigo-500 text-white hover:bg-indigo-600 transition-colors"
                >
                  <LogIn size={14} />
                  <span className="hidden md:inline">{t.login}</span>
                </button>
              )}
            </div>
          </div>

          {/* Mobile right items */}
          <div className="flex sm:hidden items-center gap-2">
            {!isOnline && (
              <div
                className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40"
                title="Đang ở chế độ Ngoại tuyến"
              >
                <WifiOff size={16} />
              </div>
            )}
            <button
              className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              onClick={() => setMenuOpen(o => !o)}
              aria-label="Menu"
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile drawer overlay */}
      <AnimatePresence>
        {menuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/40 z-40 sm:hidden"
              onClick={() => setMenuOpen(false)}
            />
            {/* Drawer */}
            <motion.div
              key="drawer"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="fixed top-0 right-0 h-full w-72 max-w-[80vw] bg-white dark:bg-slate-800 shadow-2xl z-50 sm:hidden flex flex-col"
            >
              {/* Drawer header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
                <div className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2.5">
                  <img src="/favicon.png" alt="Logo" className="w-7 h-7 rounded-lg shadow-sm" />
                  <span className="font-black tracking-tight bg-gradient-to-r from-blue-600 via-indigo-600 to-amber-500 bg-clip-text text-transparent">
                    Language Master
                  </span>
                </div>
                <button
                  onClick={() => setMenuOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Drawer links */}
              <nav className="flex flex-col gap-1 p-4 flex-1">
                {links.map(link => {
                  const Icon = link.icon;
                  return (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      end={link.end}
                      className={mobileNavClass}
                      onClick={() => setMenuOpen(false)}
                    >
                      <Icon size={20} />
                      {link.label}
                    </NavLink>
                  );
                })}

                {user && (
                  <>
                    <div className="w-full h-px bg-slate-100 dark:bg-slate-700 my-2" />
                    <NavLink to="/profile" className={mobileNavClass} onClick={() => setMenuOpen(false)}>
                      <UserCircle size={20} />
                      {t.profile}
                    </NavLink>
                    <NavLink to="/settings" className={mobileNavClass} onClick={() => setMenuOpen(false)}>
                      <Settings size={20} />
                      {t.settings}
                    </NavLink>
                  </>
                )}
                {!user && (
                  <button onClick={() => { setMenuOpen(false); navigate('/login'); }} className="flex items-center justify-center gap-2 mt-4 px-4 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors">
                    <LogIn size={20} /> {t.login}
                  </button>
                )}
              </nav>

              {/* Drawer footer */}
              <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-700">
                <p className="text-xs text-slate-400 dark:text-slate-500 text-center">Nihongo Master © 2025</p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}