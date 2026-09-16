import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCourseById } from '../../data/courses/registry';
import { ArrowLeft, Download, RefreshCw, Trash2, CheckCircle2, HardDrive, AlertCircle } from 'lucide-react';
import { useMyCourses } from '../../context/global/useMyCourses';
import {
  saveCourseOffline,
  getOfflineCourseMeta,
  removeCourseOffline,
  formatBytes,
  type OfflineMeta,
} from '../../lib/offline/offlineStorage';

export default function CourseSettings() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const course = getCourseById(courseId || '');

  const { removeCourse } = useMyCourses();
  const [offlineMeta, setOfflineMeta] = useState<OfflineMeta | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (!courseId) return;
    getOfflineCourseMeta(courseId).then(setOfflineMeta);
  }, [courseId]);

  if (!course) return null;

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3500);
  };

  const handleDownload = async () => {
    setIsProcessing(true);
    try {
      const meta = await saveCourseOffline(course);
      setOfflineMeta(meta);
      showToast(`Đã tải thành công ${meta.itemCount} mục (${formatBytes(meta.sizeBytes)}) để học ngoại tuyến!`);
    } catch (err) {
      console.error(err);
      showToast('Không thể tải khóa học. Vui lòng thử lại.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveOffline = async () => {
    if (!confirm('Bạn có chắc chắn muốn xóa bản ngoại tuyến của khóa học này khỏi bộ nhớ máy?')) return;
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

  const handleRemoveFromMyCourses = () => {
    if (confirm('Bạn có chắc chắn muốn xóa khóa học này khỏi danh sách "Khóa học của tôi"? (Tiến độ học sẽ không bị mất)')) {
      removeCourse(course.id);
      navigate('/');
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto font-sans pb-24">
      <button
        onClick={() => navigate(`/course/${course.id}`)}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors font-medium text-sm mb-6"
      >
        <ArrowLeft size={16} /> Quay lại Khóa học
      </button>

      <h1 className="text-3xl font-black text-slate-800 dark:text-white mb-2">Cài đặt khóa học</h1>
      <p className="text-slate-500 dark:text-slate-400 mb-8">
        Tùy chỉnh hoặc quản lý dữ liệu cho khóa: <strong className="text-indigo-600 dark:text-indigo-400">{course.name}</strong>
      </p>

      {/* Toast Notification */}
      {message && (
        <div
          className={`p-4 rounded-2xl mb-6 text-sm font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200 ${
            message.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40'
              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40'
          }`}
        >
          {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          {message.text}
        </div>
      )}

      <div className="space-y-6">
        {/* ── Offline Mode Management Card ── */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <HardDrive className="text-indigo-500" size={20} />
                <h3 className="font-bold text-lg text-slate-800 dark:text-white">Dữ liệu Ngoại Tuyến (Offline Mode)</h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Lưu toàn bộ từ vựng khóa học vào bộ nhớ máy để học Từ điển, Lý thuyết và Luyện tập khi không có Internet.
              </p>
            </div>
            {offlineMeta ? (
              <span className="shrink-0 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                <CheckCircle2 size={13} /> Đã tải
              </span>
            ) : (
              <span className="shrink-0 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                Chưa tải
              </span>
            )}
          </div>

          {offlineMeta ? (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700/60 space-y-2 text-xs sm:text-sm">
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span className="text-slate-400">Dung lượng chiếm dụng:</span>
                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{formatBytes(offlineMeta.sizeBytes)}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span className="text-slate-400">Số lượng mục:</span>
                <span className="font-bold">{offlineMeta.itemCount} mục</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span className="text-slate-400">Thời gian lưu:</span>
                <span className="text-slate-500">{new Date(offlineMeta.savedAt).toLocaleString('vi-VN')}</span>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/30 text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>Chưa lưu dữ liệu. Bạn hãy tải về để sẵn sàng học ngay cả khi mất kết nối mạng.</span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-1">
            {offlineMeta ? (
              <>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleDownload}
                  className="px-4 py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 font-bold text-sm transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
                  title="Tải lại bản mới nhất từ hệ thống"
                >
                  <RefreshCw size={15} className={isProcessing ? 'animate-spin' : ''} /> Cập nhật bản mới
                </button>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleRemoveOffline}
                  className="px-4 py-2.5 rounded-xl border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 font-bold text-sm transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
                  title="Xóa dữ liệu ngoại tuyến của khóa này khỏi máy"
                >
                  <Trash2 size={15} /> Xóa bản ngoại tuyến
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleDownload}
                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95 disabled:opacity-50"
              >
                <Download size={16} className={isProcessing ? 'animate-spin' : ''} /> Tải về học ngoại tuyến ({course.data?.length || 0} mục)
              </button>
            )}
          </div>
        </div>

        {/* ── Remove from My Courses ── */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-slate-800 dark:text-white">Xóa khỏi danh sách</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Khóa học sẽ không còn hiển thị ở tab "Khóa học của tôi".</p>
          </div>
          <button
            onClick={handleRemoveFromMyCourses}
            className="px-4 py-2 border-2 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-600 dark:text-slate-300 font-bold rounded-xl transition-all active:scale-95"
          >
            Gỡ bỏ
          </button>
        </div>
      </div>
    </div>
  );
}
