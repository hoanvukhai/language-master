import { useState, useEffect } from 'react';
import { X, Save, RotateCcw, Target, HardDrive, Download, RefreshCw, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/auth/useAuth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { DEFAULT_LEARN_SETTINGS, type LearnSettings } from '../../../lib/srs/srsTypes';
import { getCourseById } from '../../../data/courses/registry';
import {
  saveCourseOffline,
  getOfflineCourseMeta,
  removeCourseOffline,
  formatBytes,
  type OfflineMeta,
} from '../../../lib/offline/offlineStorage';
import { useNetworkStatus } from '../../../hooks/useNetworkStatus';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  courseId?: string;
}

export function CourseSettingsModal({ isOpen, onClose, courseId }: Props) {
  const { user } = useAuth();
  const { isOnline } = useNetworkStatus();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'goals' | 'offline'>('goals');
  const [settings, setSettings] = useState<LearnSettings>(DEFAULT_LEARN_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  // Offline management states
  const [offlineMeta, setOfflineMeta] = useState<OfflineMeta | null>(null);
  const [isProcessingOffline, setIsProcessingOffline] = useState(false);
  const [offlineToast, setOfflineToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const course = courseId ? getCourseById(courseId) : null;

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

  // Fetch offline status for this specific course
  const loadOfflineMeta = () => {
    if (!courseId) return;
    getOfflineCourseMeta(courseId).then(setOfflineMeta);
  };

  useEffect(() => {
    if (isOpen && courseId) {
      loadOfflineMeta();
    }
  }, [isOpen, courseId]);

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

  const showOfflineToast = (text: string, type: 'success' | 'error' = 'success') => {
    setOfflineToast({ text, type });
    setTimeout(() => setOfflineToast(null), 3500);
  };

  const handleDownloadOffline = async () => {
    if (!course) return;
    setIsProcessingOffline(true);
    try {
      const meta = await saveCourseOffline(course);
      setOfflineMeta(meta);
      showOfflineToast(`Đã tải thành công ${meta.itemCount} mục (${formatBytes(meta.sizeBytes)}) để học ngoại tuyến!`);
    } catch (err) {
      console.error(err);
      showOfflineToast('Không thể tải khóa học. Vui lòng thử lại.', 'error');
    } finally {
      setIsProcessingOffline(false);
    }
  };

  const handleRemoveOffline = async () => {
    if (!courseId) return;
    if (!confirm('Bạn có chắc muốn xóa bản ngoại tuyến của khóa học này khỏi bộ nhớ máy?')) return;
    setIsProcessingOffline(true);
    try {
      await removeCourseOffline(courseId);
      setOfflineMeta(null);
      showOfflineToast('Đã xóa dữ liệu ngoại tuyến khỏi máy.');
    } catch (err) {
      console.error(err);
      showOfflineToast('Lỗi khi xóa dữ liệu.', 'error');
    } finally {
      setIsProcessingOffline(false);
    }
  };

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
      }, 1200);
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
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative bg-white dark:bg-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 z-10 sticky top-0">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                Cài đặt Khóa học
              </h2>
              {course && (
                <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold truncate max-w-xs">
                  {course.name}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-900/60 rounded-xl text-xs font-bold">
            <button
              onClick={() => setActiveTab('goals')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all ${
                activeTab === 'goals'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Target size={14} />
              Mục tiêu học
            </button>
            <button
              onClick={() => setActiveTab('offline')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all ${
                activeTab === 'offline'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <HardDrive size={14} />
              Dữ liệu Ngoại Tuyến
              {offlineMeta && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block ml-0.5" />
              )}
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* TAB 1: GOALS */}
          {activeTab === 'goals' && (
            <>
              {loading ? (
                <div className="py-10 text-center text-slate-500">Đang tải cài đặt...</div>
              ) : (
                <div className="space-y-4">
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
                </div>
              )}
            </>
          )}

          {/* TAB 2: OFFLINE MANAGEMENT */}
          {activeTab === 'offline' && (
            <div className="space-y-4">
              {offlineToast && (
                <div
                  className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200 ${
                    offlineToast.type === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40'
                      : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40'
                  }`}
                >
                  {offlineToast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  {offlineToast.text}
                </div>
              )}

              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-700/50 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                      <HardDrive size={16} className="text-indigo-500" />
                      Trạng thái lưu trữ thiết bị
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Lưu từ vựng vào bộ nhớ máy để học Từ điển, Lý thuyết và Luyện tập khi không có mạng.
                    </p>
                  </div>
                  {offlineMeta ? (
                    <span className="shrink-0 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                      <CheckCircle2 size={13} /> Đã lưu
                    </span>
                  ) : (
                    <span className="shrink-0 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                      Chưa tải
                    </span>
                  )}
                </div>

                {offlineMeta ? (
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1.5">
                    <div className="flex justify-between text-slate-600 dark:text-slate-300">
                      <span className="text-slate-400">Dung lượng chiếm dụng:</span>
                      <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {formatBytes(offlineMeta.sizeBytes)}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600 dark:text-slate-300">
                      <span className="text-slate-400">Số lượng mục:</span>
                      <span className="font-bold">{offlineMeta.itemCount} mục</span>
                    </div>
                    <div className="flex justify-between text-slate-600 dark:text-slate-300">
                      <span className="text-slate-400">Lần lưu gần nhất:</span>
                      <span className="text-slate-500">
                        {new Date(offlineMeta.savedAt).toLocaleString('vi-VN')}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-xl text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
                    <AlertCircle size={15} className="shrink-0" />
                    <span>Khóa học này chưa được lưu ngoại tuyến. Hãy bấm nút tải bên dưới để sẵn sàng học khi mất mạng.</span>
                  </div>
                )}

                {/* Buttons Tải / Cập nhật / Xóa */}
                <div className="pt-2 flex flex-wrap items-center gap-2.5">
                  {offlineMeta ? (
                    <>
                      <button
                        type="button"
                        disabled={isProcessingOffline || !isOnline}
                        onClick={handleDownloadOffline}
                        className="flex-1 px-3.5 py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 font-bold text-xs transition-all flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
                        title={!isOnline ? 'Cần kết nối mạng để tải bản mới' : 'Tải lại bản mới nhất từ hệ thống'}
                      >
                        <RefreshCw size={14} className={isProcessingOffline ? 'animate-spin' : ''} />
                        Cập nhật bản mới
                      </button>
                      <button
                        type="button"
                        disabled={isProcessingOffline}
                        onClick={handleRemoveOffline}
                        className="px-3.5 py-2.5 rounded-xl border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 font-bold text-xs transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                        title="Xóa dữ liệu ngoại tuyến của khóa này khỏi máy"
                      >
                        <Trash2 size={14} />
                        Xóa bản offline
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      disabled={isProcessingOffline || !isOnline}
                      onClick={handleDownloadOffline}
                      className="w-full px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95 disabled:opacity-50"
                    >
                      <Download size={15} className={isProcessingOffline ? 'animate-spin' : ''} />
                      {!isOnline ? 'Cần có mạng để tải về' : `Tải về học ngoại tuyến (${course?.data?.length || 0} mục)`}
                    </button>
                  )}
                </div>
              </div>

              {courseId && (
                <div className="pt-1 text-center">
                  <button
                    onClick={() => {
                      onClose();
                      navigate(`/course/${courseId}/settings`);
                    }}
                    className="text-xs text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 underline font-medium transition-colors"
                  >
                    Mở trang quản lý chi tiết khóa học →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {activeTab === 'goals' && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 flex items-center gap-3 mt-auto">
            <button
              onClick={handleReset}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-medium rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700"
              title="Khôi phục mặc định"
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
        )}

        {activeTab === 'offline' && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-end mt-auto">
            <button
              onClick={onClose}
              className="px-5 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white text-xs font-bold rounded-xl transition-colors"
            >
              Đóng
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
