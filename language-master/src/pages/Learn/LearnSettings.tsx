// src/pages/Learn/LearnSettings.tsx
// Cài đặt riêng cho phần Học SRS

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/auth/useAuth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { ArrowLeft, Save, RotateCcw } from 'lucide-react';
import { DEFAULT_LEARN_SETTINGS, type LearnSettings } from '../../lib/srs/srsTypes';

export default function LearnSettingsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [settings, setSettings] = useState<LearnSettings>(DEFAULT_LEARN_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Fetch settings từ Firestore
  useEffect(() => {
    if (!user) return;
    const fetchSettings = async () => {
      try {
        const userRef = doc(db, 'users', user.uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const data = snap.data();
          if (data.learnSettings) {
            setSettings({ ...DEFAULT_LEARN_SETTINGS, ...data.learnSettings });
          }
        }
      } catch (err) {
        console.error('Error fetching learn settings:', err);
      }
    };
    fetchSettings();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { learnSettings: settings });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Error saving learn settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSettings(DEFAULT_LEARN_SETTINGS);
  };

  if (!user) {
    navigate('/login');
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-white">
            Cài đặt Học SRS
          </h1>
          <p className="text-sm text-slate-500">Tùy chỉnh trải nghiệm học tập</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Giới hạn từ mới/ngày */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
          <h3 className="font-semibold text-slate-800 dark:text-white mb-1">
            Số từ mới mỗi ngày
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
            Giới hạn số từ mới bạn có thể học trong 1 ngày. Đặt thấp hơn nếu bạn muốn tập trung ôn tập.
          </p>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={5}
              max={30}
              step={5}
              value={settings.dailyNewWordLimit}
              onChange={(e) => setSettings(s => ({ ...s, dailyNewWordLimit: Number(e.target.value) }))}
              className="flex-1 accent-indigo-500"
            />
            <span className="w-12 text-center font-bold text-indigo-600 dark:text-indigo-400 text-lg">
              {settings.dailyNewWordLimit}
            </span>
          </div>
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>5 (ít)</span>
            <span>30 (nhiều)</span>
          </div>
        </div>

        {/* Giới hạn tồn đọng */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
          <h3 className="font-semibold text-slate-800 dark:text-white mb-1">
            Giới hạn từ tồn đọng
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
            Nếu bạn có quá nhiều từ chưa thuộc (Level 0-1), nút "Học mới" sẽ bị khóa cho đến khi bạn ôn tập xong.
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
            <span className="w-12 text-center font-bold text-indigo-600 dark:text-indigo-400 text-lg">
              {settings.maxPendingWords}
            </span>
          </div>
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>20 (nghiêm ngặt)</span>
            <span>100 (thoải mái)</span>
          </div>
        </div>

        {/* Kích thước phiên */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
          <h3 className="font-semibold text-slate-800 dark:text-white mb-1">
            Số từ mỗi phiên học mới
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
            Mỗi lần bấm "Học mới" sẽ lấy bao nhiêu từ.
          </p>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={5}
              max={30}
              step={5}
              value={settings.sessionSize}
              onChange={(e) => setSettings(s => ({ ...s, sessionSize: Number(e.target.value) }))}
              className="flex-1 accent-indigo-500"
            />
            <span className="w-12 text-center font-bold text-indigo-600 dark:text-indigo-400 text-lg">
              {settings.sessionSize}
            </span>
          </div>
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>5 (nhanh)</span>
            <span>30 (dài)</span>
          </div>
        </div>

        {/* Kích thước phiên Ôn tập */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
          <h3 className="font-semibold text-slate-800 dark:text-white mb-1">
            Số từ mỗi phiên Ôn tập
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
            Mỗi lần bấm "Ôn tập" sẽ lấy tối đa bao nhiêu từ.
          </p>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={10}
              max={50}
              step={10}
              value={settings.reviewSessionSize}
              onChange={(e) => setSettings(s => ({ ...s, reviewSessionSize: Number(e.target.value) }))}
              className="flex-1 accent-indigo-500"
            />
            <span className="w-12 text-center font-bold text-indigo-600 dark:text-indigo-400 text-lg">
              {settings.reviewSessionSize}
            </span>
          </div>
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>10 (nhanh)</span>
            <span>50 (dài)</span>
          </div>
        </div>



        {/* Hiển thị Furigana */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-white mb-1">
              Hiển thị Furigana (chữ Kana nhỏ)
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Hiện phiên âm Kana bên dưới/trên Kanji khi học
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSettings(s => ({ ...s, showKana: !s.showKana }))}
            className={`w-12 h-6 rounded-full transition-colors relative p-1 ${
              settings.showKana ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'
            }`}
          >
            <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
              settings.showKana ? 'translate-x-6' : 'translate-x-0'
            }`} />
          </button>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Đang lưu...' : saved ? '✅ Đã lưu!' : 'Lưu cài đặt'}
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Mặc định
          </button>
        </div>
      </div>
    </div>
  );
}
