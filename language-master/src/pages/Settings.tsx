// src/pages/Settings.tsx

import { useState, useEffect } from 'react';
import { useSettings } from '../context/global/useSettings';
import { useAudio } from '../context/audio/useAudio';
import { Moon, Sun, Monitor, Volume2, VolumeX, Type, Globe, HardDrive, Trash2, Download, CheckCircle2, RotateCcw } from 'lucide-react';
import { COURSE_REGISTRY } from '../data/courses/registry';
import {
  getAllOfflineMeta,
  removeCourseOffline,
  saveCourseOffline,
  clearAllOfflineCourses,
  resetAllAppStorageAndCache,
  formatBytes,
  type OfflineMeta,
} from '../lib/offline/offlineStorage';

export default function Settings() {
  const { theme, language, fontSize, updateSettings } = useSettings();
  const { isMuted, toggleMute } = useAudio();

  const [offlineList, setOfflineList] = useState<OfflineMeta[]>([]);
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<string | null>(null);

  const loadOfflineList = () => {
    getAllOfflineMeta().then(setOfflineList);
  };

  useEffect(() => {
    loadOfflineList();
    const handler = () => loadOfflineList();
    window.addEventListener('offline_course_changed', handler);
    return () => window.removeEventListener('offline_course_changed', handler);
  }, []);

  const totalOfflineBytes = offlineList.reduce((acc, cur) => acc + (cur.sizeBytes || 0), 0);

  const handleDownloadAll = async () => {
    setIsBulkLoading(true);
    try {
      for (let i = 0; i < COURSE_REGISTRY.length; i++) {
        const c = COURSE_REGISTRY[i];
        setBulkStatus(`Đang tải: ${c.name} (${i + 1}/${COURSE_REGISTRY.length})...`);
        await saveCourseOffline(c);
      }
      loadOfflineList();
      setBulkStatus('Đã tải thành công toàn bộ các khóa học!');
      setTimeout(() => setBulkStatus(null), 3500);
    } catch (err) {
      console.error(err);
      setBulkStatus('Lỗi khi tải dữ liệu.');
    } finally {
      setIsBulkLoading(false);
    }
  };

  const handleClearAllOffline = async () => {
    if (!confirm('Bạn có chắc chắn muốn xóa TOÀN BỘ dữ liệu học ngoại tuyến khỏi máy?')) return;
    setIsBulkLoading(true);
    try {
      await clearAllOfflineCourses();
      loadOfflineList();
      setBulkStatus('Đã dọn dẹp sạch sẽ bộ nhớ ngoại tuyến.');
      setTimeout(() => setBulkStatus(null), 3500);
    } catch (err) {
      console.error(err);
    } finally {
      setIsBulkLoading(false);
    }
  };

  const handleRemoveOne = async (id: string) => {
    await removeCourseOffline(id);
    loadOfflineList();
  };

  const translations = {
    vi: {
      title: 'Cài Đặt Hệ Thống',
      themeLabel: 'Giao diện (Theme)',
      light: 'Sáng',
      dark: 'Tối',
      system: 'Hệ thống',
      langLabel: 'Ngôn ngữ hiển thị',
      fontLabel: 'Cỡ chữ toàn cục',
      fontSmall: 'Nhỏ',
      fontBase: 'Vừa',
      fontLarge: 'Lớn',
      soundLabel: 'Âm thanh hệ thống',
      offlineTitle: 'Quản Lý Dữ Liệu Ngoại Tuyến',
      offlineDesc: 'Tải và quản lý dữ liệu các khóa học đã lưu trong bộ nhớ thiết bị để học khi mất mạng.',
    },
    en: {
      title: 'System Settings',
      themeLabel: 'Theme',
      light: 'Light',
      dark: 'Dark',
      system: 'System',
      langLabel: 'Display Language',
      fontLabel: 'Global Font Size',
      fontSmall: 'Small',
      fontBase: 'Medium',
      fontLarge: 'Large',
      soundLabel: 'System Sound',
      offlineTitle: 'Offline Data Management',
      offlineDesc: 'Download and manage course data stored on your device for offline learning.',
    }
  };
  const t = translations[language as keyof typeof translations] || translations.vi;

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto animate-in fade-in pb-24 font-sans">
      <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-8 transition-colors">{t.title}</h1>

      <div className="space-y-6">
        {/* KHỐI 1: GIAO DIỆN */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 transition-colors">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 dark:text-white transition-colors">
            <Monitor size={20} /> {t.themeLabel}
          </h2>
          <div className="flex bg-gray-100 dark:bg-slate-700 p-1 rounded-xl transition-colors">
            {(['light', 'dark', 'system'] as const).map((tTheme) => (
              <button
                key={tTheme}
                onClick={() => updateSettings({ theme: tTheme as typeof theme })}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-medium transition-all ${
                  theme === tTheme ? 'bg-white dark:bg-slate-600 shadow-sm text-blue-600 dark:text-blue-400 font-bold' : 'text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white'
                }`}
              >
                {tTheme === 'light' && <><Sun size={18} /> {t.light}</>}
                {tTheme === 'dark' && <><Moon size={18} /> {t.dark}</>}
                {tTheme === 'system' && <><Monitor size={18} /> {t.system}</>}
              </button>
            ))}
          </div>
        </div>

        {/* KHỐI 2: NGÔN NGỮ */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 flex justify-between items-center transition-colors">
          <div className="flex items-center gap-2">
            <Globe size={20} className="dark:text-white transition-colors" />
            <span className="font-semibold dark:text-white transition-colors">{t.langLabel}</span>
          </div>
          <select
            value={language}
            onChange={(e) => updateSettings({ language: e.target.value as 'vi' | 'en' })}
            className="bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-slate-800 dark:text-white rounded-lg p-2.5 outline-none transition-colors"
          >
            <option value="vi">Tiếng Việt</option>
            <option value="en">English</option>
          </select>
        </div>

        {/* KHỐI 3: CỠ CHỮ */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 transition-colors">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 dark:text-white transition-colors">
            <Type size={20} /> {t.fontLabel}
          </h2>
          <div className="flex bg-gray-100 dark:bg-slate-700 p-1 rounded-xl transition-colors">
            {(['sm', 'base', 'lg'] as const).map((size) => (
              <button
                key={size}
                onClick={() => updateSettings({ fontSize: size })}
                className={`flex-1 py-2 rounded-lg transition-all ${
                  fontSize === size ? 'bg-white dark:bg-slate-600 shadow-sm font-bold text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white'
                }`}
              >
                {size === 'sm' ? t.fontSmall : size === 'base' ? t.fontBase : t.fontLarge}
              </button>
            ))}
          </div>
        </div>

        {/* KHỐI 4: ÂM THANH */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 flex justify-between items-center transition-colors">
          <div className="flex items-center gap-2">
            {!isMuted ? <Volume2 size={20} className="text-blue-600" /> : <VolumeX size={20} className="text-gray-400" />}
            <span className="font-semibold dark:text-white transition-colors">{t.soundLabel}</span>
          </div>
          <button
            onClick={toggleMute}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${!isMuted ? 'bg-blue-600' : 'bg-gray-300 dark:bg-slate-600'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${!isMuted ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>

        {/* KHỐI 5: QUẢN LÝ BỘ NHỚ NGOẠI TUYẾN */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 space-y-5 transition-colors">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold flex items-center gap-2 dark:text-white">
                <HardDrive size={20} className="text-indigo-500" /> {t.offlineTitle}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                {t.offlineDesc}
              </p>
            </div>
            <span className="shrink-0 font-mono text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-indigo-600 dark:text-indigo-400">
              {formatBytes(totalOfflineBytes)} ({offlineList.length} khóa)
            </span>
          </div>

          {bulkStatus && (
            <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/40 text-xs font-semibold text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
              <CheckCircle2 size={16} /> {bulkStatus}
            </div>
          )}

          {/* List of saved courses */}
          {offlineList.length > 0 ? (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {offlineList.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 dark:text-slate-200 truncate">{item.name}</p>
                    <p className="text-slate-400 mt-0.5">
                      {item.itemCount} mục • {formatBytes(item.sizeBytes)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveOne(item.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors"
                    title="Xóa khóa học này"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">Chưa có khóa học nào được lưu ngoại tuyến trên thiết bị này.</p>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              disabled={isBulkLoading}
              onClick={handleDownloadAll}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm transition-all flex items-center gap-2 shadow-sm active:scale-95 disabled:opacity-50"
            >
              <Download size={15} className={isBulkLoading ? 'animate-spin' : ''} />
              Tải tất cả các khóa học ({COURSE_REGISTRY.length} khóa)
            </button>
            {offlineList.length > 0 && (
              <button
                type="button"
                disabled={isBulkLoading}
                onClick={handleClearAllOffline}
                className="px-4 py-2.5 rounded-xl border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 font-bold text-xs sm:text-sm transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
              >
                <Trash2 size={15} /> Xóa toàn bộ
              </button>
            )}

            <button
              type="button"
              disabled={isBulkLoading}
              onClick={async () => {
                if (confirm('Khôi phục bộ nhớ đệm sẽ dọn sạch Service Worker, toàn bộ cơ sở dữ liệu IndexedDB và tải lại ứng dụng. Bạn có muốn thực hiện?')) {
                  await resetAllAppStorageAndCache();
                }
              }}
              className="px-4 py-2.5 rounded-xl border border-amber-200 dark:border-amber-800/60 hover:bg-amber-50 dark:hover:bg-amber-950/30 text-amber-700 dark:text-amber-300 font-bold text-xs sm:text-sm transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
              title="Dọn sạch cache & IndexedDB nếu gặp hiện tượng xung đột hoặc lỗi lưu trữ"
            >
              <RotateCcw size={15} /> Khôi phục bộ nhớ & Cache
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}