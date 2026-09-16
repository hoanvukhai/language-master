// src/components/course/CourseOfflineModal.tsx
// Modal Quản Lý Dữ Liệu Ngoại Tuyến dành riêng cho Menu 3 chấm "BÊN NGOÀI" khóa học

import { useState, useEffect } from 'react';
import { X, HardDrive, Download, RefreshCw, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { getCourseById } from '../../data/courses/registry';
import {
  saveCourseOffline,
  getOfflineCourseMeta,
  removeCourseOffline,
  formatBytes,
  type OfflineMeta,
} from '../../lib/offline/offlineStorage';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

interface CourseOfflineModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string | null;
}

export function CourseOfflineModal({ isOpen, onClose, courseId }: CourseOfflineModalProps) {
  const { isOnline } = useNetworkStatus();
  const [offlineMeta, setOfflineMeta] = useState<OfflineMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const course = courseId ? getCourseById(courseId) : null;

  const loadMeta = () => {
    if (!courseId) return;
    setLoading(true);
    getOfflineCourseMeta(courseId)
      .then(setOfflineMeta)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (isOpen && courseId) {
      loadMeta();
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

  const handleDownload = async () => {
    setIsProcessing(true);
    try {
      const meta = await saveCourseOffline(course);
      setOfflineMeta(meta);
      showToast(`Đã lưu thành công ${meta.itemCount} mục (${formatBytes(meta.sizeBytes)}) để học ngoại tuyến!`);
    } catch (err) {
      console.error(err);
      showToast('Lỗi khi tải dữ liệu. Vui lòng thử lại.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemove = async () => {
    if (!confirm(`Bạn có chắc muốn xóa bản ngoại tuyến của khóa "${course.name}" khỏi thiết bị?`)) return;
    setIsProcessing(true);
    try {
      await removeCourseOffline(course.id);
      setOfflineMeta(null);
      showToast('Đã xóa dữ liệu ngoại tuyến khỏi thiết bị.');
    } catch (err) {
      console.error(err);
      showToast('Lỗi khi xóa dữ liệu.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <HardDrive size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-white">
                Dữ liệu Ngoại Tuyến
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[240px]">
                {course.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {toast && (
            <div
              className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200 ${
                toast.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40'
              }`}
            >
              {toast.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
              {toast.text}
            </div>
          )}

          {/* Scope Explanation */}
          <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            <span className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
              Phạm vi hoạt động ngoại tuyến:
            </span>
            Khi tải về máy, bạn có thể học <strong>Từ điển</strong>, đọc <strong>Lý thuyết</strong> và <strong>Luyện tập tự do</strong> khi không có mạng. Các tính năng đồng bộ đám mây (Đấu trường, Bảng xếp hạng) sẽ tạm khóa khi mất mạng.
          </div>

          {/* Storage Info */}
          {loading ? (
            <div className="py-6 text-center text-xs text-slate-400 animate-pulse">
              Đang kiểm tra dung lượng lưu trữ...
            </div>
          ) : offlineMeta ? (
            <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/40 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 size={15} className="text-emerald-600 dark:text-emerald-400" />
                  Đã lưu trên thiết bị này
                </span>
                <span className="text-[11px] font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-900/50 px-2 py-0.5 rounded-md">
                  {formatBytes(offlineMeta.sizeBytes)}
                </span>
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1 pt-1 border-t border-emerald-200/50 dark:border-emerald-800/30">
                <div className="flex justify-between">
                  <span>Số lượng từ vựng:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{offlineMeta.itemCount} mục</span>
                </div>
                <div className="flex justify-between">
                  <span>Cập nhật lần cuối:</span>
                  <span className="text-slate-500">{new Date(offlineMeta.savedAt).toLocaleString('vi-VN')}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/40 rounded-2xl space-y-1.5 text-xs text-amber-800 dark:text-amber-300">
              <span className="font-bold flex items-center gap-1.5">
                <AlertCircle size={15} /> Chưa có dữ liệu trên máy
              </span>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Hãy tải khóa học này về máy để sẵn sàng học ngay cả khi bạn di chuyển hoặc mất mạng Internet.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col gap-2">
            {offlineMeta ? (
              <>
                <button
                  type="button"
                  disabled={isProcessing || !isOnline}
                  onClick={handleDownload}
                  className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 active:scale-95"
                  title={!isOnline ? 'Cần kết nối mạng để tải lại bản mới' : 'Cập nhật bản mới nhất từ hệ thống'}
                >
                  <RefreshCw size={14} className={isProcessing ? 'animate-spin' : ''} />
                  {!isOnline ? 'Cần mạng để cập nhật' : 'Cập nhật bản mới từ hệ thống'}
                </button>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleRemove}
                  className="w-full py-2.5 px-4 rounded-xl border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 font-bold text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 active:scale-95"
                >
                  <Trash2 size={14} />
                  Xóa dữ liệu ngoại tuyến khỏi máy
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={isProcessing || !isOnline}
                onClick={handleDownload}
                className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 active:scale-95"
              >
                <Download size={15} className={isProcessing ? 'animate-spin' : ''} />
                {!isOnline ? 'Cần có mạng để tải về máy' : `Tải về học ngoại tuyến (${course.data?.length || 0} mục)`}
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-end">
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
