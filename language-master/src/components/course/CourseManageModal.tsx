// src/components/course/CourseManageModal.tsx
// Popup Quản Lý Khóa Học Toàn Diện: Ngoại Tuyến + Đặt Lại Tiến Độ + Gỡ Khóa Học

import { useState, useEffect } from 'react';
import {
  X,
  HardDrive,
  Download,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  BookmarkX,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { getCourseById } from '../../data/courses/registry';
import {
  saveCourseOffline,
  getOfflineCourseMeta,
  removeCourseOffline,
  formatBytes,
  type OfflineMeta,
} from '../../lib/offline/offlineStorage';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { useAuth } from '../../context/auth/useAuth';
import { useMyCourses } from '../../context/global/useMyCourses';
import { resetCourseProgress } from '../../lib/srs/firestoreSync';

interface CourseManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string | null;
  onCourseRemoved?: () => void;
  onCourseReset?: () => void;
}

export function CourseManageModal({
  isOpen,
  onClose,
  courseId,
  onCourseRemoved,
  onCourseReset,
}: CourseManageModalProps) {
  const { user } = useAuth();
  const { removeCourse } = useMyCourses();
  const { isOnline } = useNetworkStatus();

  // Offline state
  const [offlineMeta, setOfflineMeta] = useState<OfflineMeta | null>(null);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [isProcessingOffline, setIsProcessingOffline] = useState(false);

  // Progress reset state
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Unbookmark state
  const [showConfirmRemove, setShowConfirmRemove] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  // Toast message
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const course = courseId ? getCourseById(courseId) : null;

  const loadMeta = () => {
    if (!courseId) return;
    setLoadingMeta(true);
    getOfflineCourseMeta(courseId)
      .then(setOfflineMeta)
      .finally(() => setLoadingMeta(false));
  };

  useEffect(() => {
    if (isOpen && courseId) {
      loadMeta();
      setShowConfirmReset(false);
      setShowConfirmRemove(false);
      setToast(null);
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

  if (!isOpen || !course) return null;

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3500);
  };

  // --- Offline Handlers ---
  const handleDownloadOffline = async () => {
    setIsProcessingOffline(true);
    try {
      const meta = await saveCourseOffline(course);
      setOfflineMeta(meta);
      showToast(`Đã lưu thành công ${meta.itemCount} mục (${formatBytes(meta.sizeBytes)}) để học ngoại tuyến!`);
    } catch (err) {
      console.error(err);
      showToast('Lỗi khi tải dữ liệu ngoại tuyến. Vui lòng thử lại.', 'error');
    } finally {
      setIsProcessingOffline(false);
    }
  };

  const handleRemoveOffline = async () => {
    setIsProcessingOffline(true);
    try {
      await removeCourseOffline(course.id);
      setOfflineMeta(null);
      showToast('Đã xóa dữ liệu ngoại tuyến khỏi thiết bị.');
    } catch (err) {
      console.error(err);
      showToast('Lỗi khi xóa dữ liệu ngoại tuyến.', 'error');
    } finally {
      setIsProcessingOffline(false);
    }
  };

  // --- Reset Progress Handler ---
  const handleResetProgress = async () => {
    if (!user) {
      showToast('Vui lòng đăng nhập để thực hiện đặt lại tiến độ.', 'error');
      return;
    }
    setIsResetting(true);
    try {
      await resetCourseProgress(user.uid, course.id);
      showToast('Đã đặt lại tiến độ học thành công!');
      setShowConfirmReset(false);
      if (onCourseReset) {
        onCourseReset();
      } else {
        setTimeout(() => window.location.reload(), 700);
      }
    } catch (err) {
      console.error('Failed to reset course progress:', err);
      showToast('Lỗi khi đặt lại tiến độ.', 'error');
    } finally {
      setIsResetting(false);
    }
  };

  // --- Remove Course (Unbookmark) Handler ---
  const handleRemoveCourse = async () => {
    setIsRemoving(true);
    try {
      await removeCourse(course.id);
      setShowConfirmRemove(false);
      onClose();
      if (onCourseRemoved) {
        onCourseRemoved();
      }
    } catch (err) {
      console.error('Failed to remove course:', err);
      showToast('Lỗi khi gỡ khóa học.', 'error');
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative bg-white dark:bg-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-700/80 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-800/80">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md font-bold text-sm shrink-0"
              style={{
                backgroundColor:
                  course.color === 'emerald'
                    ? '#10b981'
                    : course.color === 'orange'
                    ? '#f97316'
                    : course.color === 'blue'
                    ? '#3b82f6'
                    : course.color === 'violet'
                    ? '#8b5cf6'
                    : course.color === 'fuchsia'
                    ? '#d946ef'
                    : course.color === 'sky'
                    ? '#0284c7'
                    : '#6366f1',
              }}
            >
              {course.template === 'english' ? 'EN' : course.subject === 'vocab' ? 'Aa' : '漢'}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-white leading-tight">
                {course.name}
              </h2>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                <span>{course.template === 'english' ? '🇬🇧 Tiếng Anh' : '🇯🇵 Tiếng Nhật'}</span>
                <span>•</span>
                <span>{course.level}</span>
                <span>•</span>
                <span>{course.subject.toUpperCase()}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-200/60 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            title="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1">
          {/* Toast */}
          {toast && (
            <div
              className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200 ${
                toast.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40'
              }`}
            >
              {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{toast.text}</span>
            </div>
          )}

          {/* ================= SECTION 1: OFFLINE DATA ================= */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-700/60 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase tracking-wider">
                <HardDrive size={15} />
                <span>Dữ Liệu Ngoại Tuyến (Offline)</span>
              </div>
              {offlineMeta ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100/80 dark:bg-emerald-900/50 px-2 py-0.5 rounded-md">
                  <CheckCircle2 size={12} /> Đã lưu trên máy
                </span>
              ) : (
                <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 bg-slate-200/60 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                  Chưa tải về
                </span>
              )}
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Tải khóa học về thiết bị để tra cứu <strong>Từ điển</strong>, xem <strong>Lý thuyết</strong> và <strong>Luyện tập tự do</strong> ngay cả khi mất mạng Internet.
            </p>

            {loadingMeta ? (
              <div className="py-2 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <Loader2 size={14} className="animate-spin" />
                <span>Đang kiểm tra dữ liệu bộ nhớ...</span>
              </div>
            ) : offlineMeta ? (
              <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200/60 dark:border-emerald-800/40 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Dung lượng:</span>
                  <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">{formatBytes(offlineMeta.sizeBytes)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Số lượng mục:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{offlineMeta.itemCount} từ / ngữ pháp</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Lưu lần cuối:</span>
                  <span className="text-slate-500">{new Date(offlineMeta.savedAt).toLocaleString('vi-VN')}</span>
                </div>
              </div>
            ) : null}

            {/* Offline Action Buttons */}
            <div className="flex items-center gap-2 pt-1">
              {offlineMeta ? (
                <>
                  <button
                    type="button"
                    disabled={isProcessingOffline || !isOnline}
                    onClick={handleDownloadOffline}
                    className="flex-1 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 active:scale-95"
                    title={!isOnline ? 'Cần kết nối mạng để cập nhật' : 'Cập nhật bản mới nhất từ hệ thống'}
                  >
                    <RefreshCw size={13} className={isProcessingOffline ? 'animate-spin' : ''} />
                    <span>{!isOnline ? 'Cần mạng' : 'Cập nhật bản mới'}</span>
                  </button>
                  <button
                    type="button"
                    disabled={isProcessingOffline}
                    onClick={handleRemoveOffline}
                    className="py-2 px-3 rounded-xl border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 font-bold text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 active:scale-95"
                    title="Xóa dữ liệu ngoại tuyến khỏi bộ nhớ máy"
                  >
                    <Trash2 size={13} />
                    <span>Xóa bản lưu máy</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  disabled={isProcessingOffline || !isOnline}
                  onClick={handleDownloadOffline}
                  className="w-full py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 active:scale-95"
                >
                  <Download size={14} className={isProcessingOffline ? 'animate-spin' : ''} />
                  <span>{!isOnline ? 'Cần có mạng để tải' : `Tải về học ngoại tuyến (${course.data?.length || 0} mục)`}</span>
                </button>
              )}
            </div>
          </div>

          {/* ================= SECTION 2: RESET PROGRESS ================= */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-700/60 space-y-3">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-xs uppercase tracking-wider">
              <RotateCcw size={15} />
              <span>Tiến Độ Học Tập</span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Đặt lại toàn bộ các từ đã thuộc về trạng thái <strong>Chưa học (Level 0)</strong> để học lại từ đầu. Điểm EXP và Thời gian học mùa giải vẫn được bảo toàn.
            </p>

            {!showConfirmReset ? (
              <button
                type="button"
                onClick={() => {
                  setShowConfirmReset(true);
                  setShowConfirmRemove(false);
                }}
                className="w-full py-2.5 px-3 rounded-xl border border-amber-200 dark:border-amber-900/50 hover:bg-amber-50 dark:hover:bg-amber-950/30 text-amber-700 dark:text-amber-400 font-bold text-xs transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <RotateCcw size={14} />
                <span>Đặt lại tiến độ học (Xóa dữ liệu đã thuộc)</span>
              </button>
            ) : (
              <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-300 dark:border-amber-800/60 space-y-2.5 animate-in fade-in duration-150">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-xs font-semibold text-amber-900 dark:text-amber-200 leading-snug">
                    Bạn có chắc chắn muốn xóa toàn bộ tiến độ của khóa này để học lại từ đầu không?
                  </p>
                </div>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    disabled={isResetting}
                    onClick={() => setShowConfirmReset(false)}
                    className="px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="button"
                    disabled={isResetting}
                    onClick={handleResetProgress}
                    className="px-3.5 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isResetting && <Loader2 size={13} className="animate-spin" />}
                    <span>Xác nhận đặt lại</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ================= SECTION 3: UNBOOKMARK / REMOVE ================= */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-700/60 space-y-3">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-xs uppercase tracking-wider">
              <BookmarkX size={15} />
              <span>Gỡ Khỏi Danh Sách</span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Khóa học sẽ không còn xuất hiện trong danh sách cá nhân của bạn. Bạn vẫn có thể tìm thấy và tham gia lại bất cứ khi nào tại mục Khám phá.
            </p>

            {!showConfirmRemove ? (
              <button
                type="button"
                onClick={() => {
                  setShowConfirmRemove(true);
                  setShowConfirmReset(false);
                }}
                className="w-full py-2.5 px-3 rounded-xl border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 font-bold text-xs transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <BookmarkX size={14} />
                <span>Gỡ khỏi danh sách của tôi</span>
              </button>
            ) : (
              <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-300 dark:border-rose-800/60 space-y-2.5 animate-in fade-in duration-150">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={16} className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <p className="text-xs font-semibold text-rose-900 dark:text-rose-200 leading-snug">
                    Xác nhận gỡ khóa "{course.name}" khỏi danh sách đang học của bạn?
                  </p>
                </div>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    disabled={isRemoving}
                    onClick={() => setShowConfirmRemove(false)}
                    className="px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="button"
                    disabled={isRemoving}
                    onClick={handleRemoveCourse}
                    className="px-3.5 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isRemoving && <Loader2 size={13} className="animate-spin" />}
                    <span>Xác nhận gỡ</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white text-xs font-bold rounded-xl transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
