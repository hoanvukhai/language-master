import { useState, useEffect } from 'react';
import { X, Save, RotateCcw } from 'lucide-react';
import { useAuth } from '../../../context/auth/useAuth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { DEFAULT_LEARN_SETTINGS, type LearnSettings } from '../../../lib/srs/srsTypes';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function CourseSettingsModal({ isOpen, onClose }: Props) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<LearnSettings>(DEFAULT_LEARN_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch settings từ Firestore
  useEffect(() => {
    async function fetchSettings() {
      if (!user) return;
      try {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.learnSettings) {
            setSettings({ ...DEFAULT_LEARN_SETTINGS, ...data.learnSettings });
          }
        }
      } catch (err) {
        console.error('Error fetching learn settings:', err);
      } finally {
        setLoading(false);
      }
    }

    if (isOpen) {
      setLoading(true);
      fetchSettings();
    }
  }, [user, isOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const docRef = doc(db, 'users', user.uid);
      await updateDoc(docRef, { learnSettings: settings });
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        onClose(); // Auto close after save
      }, 1500);
    } catch (err) {
      console.error('Error saving learn settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSettings(DEFAULT_LEARN_SETTINGS);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative bg-white dark:bg-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 z-10 sticky top-0">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">
              Cài đặt Học Tập
            </h2>
            <p className="text-xs text-slate-500">Thiết lập mục tiêu học mỗi ngày</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-5">
          {loading ? (
            <div className="py-10 text-center text-slate-500">Đang tải cài đặt...</div>
          ) : (
            <>
              {/* Giới hạn từ mới/ngày */}
              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-700/50">
                <h3 className="font-semibold text-slate-800 dark:text-white text-sm mb-1">
                  Mục tiêu từ mới mỗi ngày
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                  Giới hạn số lượng từ mới học mỗi ngày để tránh quá tải.
                </p>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={5}
                    max={100}
                    step={5}
                    value={settings.dailyNewWordLimit}
                    onChange={(e) => setSettings(s => ({ ...s, dailyNewWordLimit: Number(e.target.value) }))}
                    className="flex-1 accent-indigo-500"
                  />
                  <span className="w-10 text-center font-bold text-indigo-600 dark:text-indigo-400">
                    {settings.dailyNewWordLimit}
                  </span>
                </div>
              </div>

              {/* Giới hạn tồn đọng */}
              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-700/50">
                <h3 className="font-semibold text-slate-800 dark:text-white text-sm mb-1">
                  Giới hạn từ tồn đọng
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                  Khóa học bài mới nếu bạn chưa ôn tập kịp thẻ cũ.
                </p>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={20}
                    max={100}
                    step={10}
                    value={settings.maxPendingWords}
                    onChange={(e) => setSettings(s => ({ ...s, maxPendingWords: Number(e.target.value) }))}
                    className="flex-1 accent-indigo-500"
                  />
                  <span className="w-10 text-center font-bold text-indigo-600 dark:text-indigo-400">
                    {settings.maxPendingWords}
                  </span>
                </div>
              </div>

              {/* Số từ mỗi phiên học mới */}
              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-700/50">
                <h3 className="font-semibold text-slate-800 dark:text-white text-sm mb-1">
                  Số từ mỗi phiên Học mới
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                  Lượng từ mới sẽ học trong một lượt học (Khuyến nghị: 5).
                </p>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={5}
                    max={50}
                    step={5}
                    value={settings.sessionSize}
                    onChange={(e) => setSettings(s => ({ ...s, sessionSize: Number(e.target.value) }))}
                    className="flex-1 accent-indigo-500"
                  />
                  <span className="w-10 text-center font-bold text-indigo-600 dark:text-indigo-400">
                    {settings.sessionSize}
                  </span>
                </div>
              </div>

              {/* Số từ mỗi phiên ôn tập */}
              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-700/50">
                <h3 className="font-semibold text-slate-800 dark:text-white text-sm mb-1">
                  Số từ mỗi phiên Ôn tập
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                  Số lượng thẻ sẽ ôn tập trong một lượt (Khuyến nghị: 30-50).
                </p>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={10}
                    max={100}
                    step={10}
                    value={settings.reviewSessionSize}
                    onChange={(e) => setSettings(s => ({ ...s, reviewSessionSize: Number(e.target.value) }))}
                    className="flex-1 accent-indigo-500"
                  />
                  <span className="w-10 text-center font-bold text-indigo-600 dark:text-indigo-400">
                    {settings.reviewSessionSize}
                  </span>
                </div>
              </div>

              {/* Toggles (Removed Audio toggle) */}


            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 flex items-center gap-3 mt-auto">
          <button
            onClick={handleReset}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-medium rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Đang lưu...' : saved ? 'Đã lưu thành công!' : 'Lưu thay đổi'}
          </button>
        </div>
      </div>
    </div>
  );
}
