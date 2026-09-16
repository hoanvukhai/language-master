
import { motion, AnimatePresence } from 'framer-motion';
import { X, LogIn, FolderPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export type AuthGateType = 'login' | 'add_course';

interface AuthGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  type: AuthGateType;
}

export function AuthGateModal({ isOpen, onClose, onConfirm, type }: AuthGateModalProps) {
  const navigate = useNavigate();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700 p-6 flex flex-col items-center text-center"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-50 dark:bg-slate-700/50 rounded-full transition-colors"
            >
              <X size={20} />
            </button>

            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${type === 'login' ? 'bg-rose-100 text-rose-500 dark:bg-rose-900/30 dark:text-rose-400' : 'bg-indigo-100 text-indigo-500 dark:bg-indigo-900/30 dark:text-indigo-400'}`}>
              {type === 'login' ? <LogIn size={32} /> : <FolderPlus size={32} />}
            </div>

            <h2 className="text-xl font-black text-slate-800 dark:text-white mb-2">
              {type === 'login' ? 'Cần Đăng Nhập' : 'Thêm Khóa Học'}
            </h2>
            
            <p className="text-slate-500 dark:text-slate-400 mb-8 font-medium">
              {type === 'login'
                ? 'Bạn cần đăng nhập để sử dụng tính năng này và lưu lại tiến độ học tập trên hệ thống.'
                : 'Bạn cần thêm khóa học này vào lộ trình để hệ thống có thể lưu lại tiến độ và điểm số của bạn. Đồng ý thêm chứ?'}
            </p>

            <div className="flex w-full gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 px-4 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-xl transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                onClick={() => {
                  if (type === 'login') {
                    navigate('/login');
                  } else {
                    onConfirm();
                  }
                  onClose();
                }}
                className={`flex-1 py-3 px-4 text-white font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 ${
                  type === 'login'
                    ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/20'
                    : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20'
                }`}
              >
                {type === 'login' ? (
                  <>Đăng Nhập <LogIn size={18} /></>
                ) : (
                  <>Đồng Ý <FolderPlus size={18} /></>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
