import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllCourses, type Course } from '../../data/courses/registry';
import { useMyCourses } from '../../context/global/useMyCourses';
import { useCustomCourses } from '../../context/customCourses/useCustomCourses';
import { customDocToCourse, type CustomCourseDoc } from '../../lib/customCourses/customCourseService';
import { CourseEditorModal } from '../../components/course/CourseEditorModal';
import { 
  Library, 
  Flame, 
  Loader2, 
  Sparkles, 
  Trophy, 
  BadgeCheck, 
  MoreVertical, 
  HardDrive,
  Plus,
  BookOpen,
  Globe,
  Lock,
  Edit3,
  Trash2,
  LogIn,
  Pin,
  PinOff,
  Search,
  Filter,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  Layers,
  ArrowRight,
  RotateCcw
} from 'lucide-react';
import { useAuth } from '../../context/auth/useAuth';
import { useDashboardStats, type CourseStats } from './useDashboardStats';
import { CourseManageModal } from '../../components/course/CourseManageModal';
import { getAllOfflineMeta } from '../../lib/offline/offlineStorage';
import { useAuthGate } from '../../hooks/useAuthGate';
import { motion, AnimatePresence } from 'framer-motion';

/** Hàm tính tổng số từ/mục trong một khóa học */
function getCourseItemCount(c: Course): number {
  if (c.subject === 'kanji_single') {
    return c.data?.length || 1;
  } else if (c.subject === 'kanji_words') {
    return c.data.reduce((acc: number, k: any) => acc + (k.words?.length || 0), 0);
  }
  return c.data?.length || 1;
}

/** Hàm tính % tiến độ */
function getCoursePercent(c: Course, stat?: CourseStats): number {
  const learnedCount = stat?.progressPercent || 0;
  const total = getCourseItemCount(c);
  return Math.min(100, Math.round((learnedCount / total) * 100));
}

/** Màu nền icon khóa học */
function getColorBg(color: string): string {
  const map: Record<string, string> = {
    emerald: '#10b981',
    orange: '#f97316',
    blue: '#3b82f6',
    violet: '#8b5cf6',
    fuchsia: '#d946ef',
    sky: '#0284c7',
    indigo: '#6366f1',
    amber: '#f59e0b',
    rose: '#f43f5e',
  };
  return map[color] || '#6366f1';
}

interface WorkspaceCardProps {
  course: Course;
  orderIndex: number;
  stat?: CourseStats;
  isOffline: boolean;
  isCustom: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onUnpin: () => void;
  onManage: () => void;
  onNavigate: () => void;
  onStartStudy: (mode: 'new' | 'review') => void;
}

/** Card ở Tab Không Gian Học Tập với nút đổi thứ tự mượt mà */
function WorkspaceCard({
  course,
  orderIndex,
  stat,
  isOffline,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onUnpin,
  onManage,
  onNavigate,
  onStartStudy
}: WorkspaceCardProps) {
  const learnedCount = stat?.progressPercent || 0;
  const totalItems = getCourseItemCount(course);
  const percent = getCoursePercent(course, stat);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 350, damping: 28 }}
      className="list-none"
    >
      <div 
        onClick={onNavigate}
        className="group relative flex flex-col p-6 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 rounded-3xl transition-all hover:-translate-y-1 shadow-sm hover:shadow-xl cursor-pointer"
      >
        {/* Top bar: Order Index, Icon, Badges, Quick Actions */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            {/* Position Badge */}
            <span 
              className="flex items-center justify-center w-7 h-7 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-black text-xs border border-indigo-200 dark:border-indigo-800/60 select-none shadow-xs" 
              title={`Ưu tiên vị trí #${orderIndex + 1}`}
            >
              #{orderIndex + 1}
            </span>

            {/* Course Icon */}
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md font-black text-lg select-none"
              style={{ backgroundColor: getColorBg(course.color) }}
            >
              {course.template === 'english' ? 'EN' : course.template === 'generic' ? '📋' : course.subject === 'vocab' ? 'Aa' : (course.subject === 'kanji_single' || course.subject === 'kanji_words') ? '漢' : course.subject === 'grammar' ? '📝' : '🌟'}
            </div>
          </div>

          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            {/* Reorder Buttons: Up & Down */}
            <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-700/80 rounded-xl p-0.5 border border-slate-200/80 dark:border-slate-600">
              <button
                disabled={!canMoveUp}
                onClick={onMoveUp}
                className="p-1 text-slate-500 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 disabled:opacity-20 disabled:hover:text-slate-500 rounded-lg transition-colors"
                title="Đưa lên trước (ưu tiên hơn)"
              >
                <ChevronUp size={16} />
              </button>
              <button
                disabled={!canMoveDown}
                onClick={onMoveDown}
                className="p-1 text-slate-500 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 disabled:opacity-20 disabled:hover:text-slate-500 rounded-lg transition-colors"
                title="Đưa xuống sau"
              >
                <ChevronDown size={16} />
              </button>
            </div>

            {isOffline && (
              <div className="flex items-center gap-1 px-2 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-lg border border-emerald-200 dark:border-emerald-800/50" title="Khóa học đã tải về thiết bị">
                <HardDrive size={13} />
                <span className="hidden sm:inline">Offline</span>
              </div>
            )}

            {(stat?.highScore || 0) > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-xs font-bold rounded-lg border border-amber-200 dark:border-amber-800/50">
                <Trophy size={13} />
                <span>{stat?.highScore}đ</span>
              </div>
            )}

            {/* Unpin quick button */}
            <button
              onClick={onUnpin}
              className="p-1.5 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-xl transition-colors"
              title="Bỏ ghim khỏi Bàn học (vẫn lưu trong Kho khóa học)"
            >
              <PinOff size={16} />
            </button>

            {/* Full Manage menu */}
            <button
              onClick={onManage}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 rounded-xl transition-colors"
              title="Tùy chọn khác"
            >
              <MoreVertical size={16} />
            </button>
          </div>
        </div>

        {/* Title & Author */}
        <h2 className="text-lg sm:text-xl font-black text-slate-800 dark:text-white mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">
          {course.name}
        </h2>

        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-3">
          <span>Tác giả:</span>
          <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[150px]">
            {course.author?.name || 'Hệ thống'}
          </span>
          {course.author?.isOfficial && (
            <BadgeCheck size={13} className="fill-blue-500 text-white dark:text-slate-900 shrink-0" />
          )}
        </div>

        {/* Badges */}
        <div className="flex items-center gap-1.5 mb-4 flex-wrap">
          <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-lg">
            {course.template === 'english' ? '🇬🇧 Anh' : course.template === 'generic' ? '🌐 Thuật ngữ' : '🇯🇵 Nhật'}
          </span>
          <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-lg">
            {course.level}
          </span>
          <span className="px-2 py-0.5 bg-slate-50 dark:bg-slate-800 text-slate-400 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700">
            {totalItems} từ
          </span>
        </div>

        {/* Progress bar */}
        <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-700/50">
          <div className="flex justify-between text-xs font-bold text-slate-400 mb-2">
            <span>Tiến độ ({learnedCount}/{totalItems})</span>
            <span className="text-indigo-600 dark:text-indigo-400">{percent}%</span>
          </div>
          <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mb-3.5">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-700" 
              style={{ width: `${percent}%` }} 
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 flex-wrap w-full">
              {learnedCount === 0 ? (
                <button
                  onClick={() => onStartStudy('new')}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl transition-all bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20"
                >
                  <Sparkles size={14} /> Bắt đầu học
                </button>
              ) : (
                <>
                  {(stat?.dueCount || 0) > 0 ? (
                    <button
                      onClick={() => onStartStudy('review')}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl transition-all bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/20"
                    >
                      <Flame size={14} /> Ôn tập ({stat?.dueCount})
                    </button>
                  ) : (
                    <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-bold px-2 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800/40">
                      ✓ Đã ôn hết
                    </div>
                  )}
                  <button
                    onClick={() => onStartStudy('new')}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl transition-all bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50"
                  >
                    <Sparkles size={14} /> Học mới
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

      </div>
    </motion.div>
  );
}

export default function MyCourses() {
  const { 
    myCourseIds, 
    workspaceCourseIds, 
    addCourse, 
    removeCourse, 
    togglePinCourse, 
    reorderWorkspace 
  } = useMyCourses();

  const { 
    customCourses, 
    loading: customLoading, 
    createCourse, 
    updateCourse, 
    deleteCourse, 
    togglePublish 
  } = useCustomCourses();

  const { user } = useAuth();
  const { executeWithGate, GateComponent } = useAuthGate();
  const staticCourses = getAllCourses();
  const navigate = useNavigate();

  // Active Tab: 'workspace' (Không gian học tập) | 'library' (Kho khóa học & Quản lý)
  const [activeTab, setActiveTab] = useState<'workspace' | 'library'>('workspace');
  const [selectedCourseForManage, setSelectedCourseForManage] = useState<string | null>(null);
  const [offlineCourseIds, setOfflineCourseIds] = useState<Set<string>>(new Set());

  // Modal Editor state
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<CustomCourseDoc | null>(null);

  // Filter & Search states in Tab Library
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLang, setSelectedLang] = useState<'all' | 'ja' | 'en' | 'generic'>('all');
  const [selectedSource, setSelectedSource] = useState<'all' | 'system' | 'custom'>('all');
  const [selectedPinStatus, setSelectedPinStatus] = useState<'all' | 'pinned' | 'unpinned'>('all');
  const [selectedProgress, setSelectedProgress] = useState<'all' | 'in_progress' | 'completed' | 'not_started'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'pinned_first' | 'due' | 'progress_desc' | 'progress_asc' | 'name_asc' | 'words_desc'>('recent');

  useEffect(() => {
    const loadOffline = () => {
      getAllOfflineMeta().then(list => {
        setOfflineCourseIds(new Set(list.map(item => item.id)));
      });
    };
    loadOffline();
    window.addEventListener('offline_course_changed', loadOffline);
    return () => window.removeEventListener('offline_course_changed', loadOffline);
  }, []);

  // Tổng hợp tất cả khóa học tĩnh + custom
  const allCourses = useMemo(() => {
    const customAsCourses = customCourses.map(customDocToCourse);
    return [...staticCourses, ...customAsCourses];
  }, [staticCourses, customCourses]);

  // Danh sách ID tất cả khóa học liên quan để nạp Dashboard Stats
  const allRelevantCourseIds = useMemo(() => {
    return Array.from(new Set([...myCourseIds, ...customCourses.map(c => c.id)]));
  }, [myCourseIds, customCourses]);

  const { stats, loading: statsLoading } = useDashboardStats(user?.uid, allRelevantCourseIds);

  // Tab 1: Các khóa học trong Không Gian Học Tập (xếp đúng theo thứ tự workspaceCourseIds)
  const workspaceCourses = useMemo(() => {
    const map = new Map(allCourses.map(c => [c.id, c]));
    return workspaceCourseIds
      .map(id => map.get(id))
      .filter((c): c is Course => !!c);
  }, [workspaceCourseIds, allCourses]);

  // Tab 2: Toàn bộ Kho khóa học sở hữu (khóa hệ thống đã tham gia + toàn bộ bộ từ tự tạo)
  const libraryCourses = useMemo(() => {
    const customAsCourses = customCourses.map(customDocToCourse);
    const enrolledStatic = staticCourses.filter(c => myCourseIds.includes(c.id));
    const map = new Map<string, Course>();
    // Thêm các khóa custom
    customAsCourses.forEach(c => map.set(c.id, c));
    // Thêm các khóa hệ thống đã đăng ký
    enrolledStatic.forEach(c => map.set(c.id, c));
    return Array.from(map.values());
  }, [staticCourses, customCourses, myCourseIds]);

  // Lọc và Sắp xếp danh sách Kho khóa học
  const filteredLibraryCourses = useMemo(() => {
    return libraryCourses.filter(c => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = c.name.toLowerCase().includes(q);
        const matchDesc = c.description?.toLowerCase().includes(q);
        const matchAuthor = c.author?.name?.toLowerCase().includes(q);
        if (!matchName && !matchDesc && !matchAuthor) return false;
      }

      // 2. Lọc Ngôn ngữ
      if (selectedLang !== 'all') {
        if (selectedLang === 'en' && c.template !== 'english') return false;
        if (selectedLang === 'generic' && c.template !== 'generic') return false;
        if (selectedLang === 'ja' && (c.template === 'english' || c.template === 'generic')) return false;
      }

      // 3. Lọc Nguồn gốc
      const isCustom = customCourses.some(cust => cust.id === c.id);
      if (selectedSource === 'custom' && !isCustom) return false;
      if (selectedSource === 'system' && isCustom) return false;

      // 4. Lọc Trạng thái Ghim
      const isPinned = workspaceCourseIds.includes(c.id);
      if (selectedPinStatus === 'pinned' && !isPinned) return false;
      if (selectedPinStatus === 'unpinned' && isPinned) return false;

      // 5. Lọc Tiến độ
      const courseStat = stats[c.id];
      const pct = getCoursePercent(c, courseStat);
      if (selectedProgress === 'not_started' && pct > 0) return false;
      if (selectedProgress === 'completed' && pct < 100) return false;
      if (selectedProgress === 'in_progress' && (pct === 0 || pct === 100)) return false;

      return true;
    }).sort((a, b) => {
      const statA = stats[a.id];
      const statB = stats[b.id];
      const pctA = getCoursePercent(a, statA);
      const pctB = getCoursePercent(b, statB);

      // Sắp xếp: Vừa mới học gần đây
      if (sortBy === 'recent') {
        const timeA = statA?.lastStudiedAt || 0;
        const timeB = statB?.lastStudiedAt || 0;
        if (timeB !== timeA) return timeB - timeA;
        return a.name.localeCompare(b.name, 'vi');
      }

      // Sắp xếp: Đang ghim lên đầu
      if (sortBy === 'pinned_first') {
        const pinA = workspaceCourseIds.includes(a.id) ? 1 : 0;
        const pinB = workspaceCourseIds.includes(b.id) ? 1 : 0;
        if (pinB !== pinA) return pinB - pinA;
        return 0;
      }

      if (sortBy === 'due') {
        return (statB?.dueCount || 0) - (statA?.dueCount || 0);
      }
      if (sortBy === 'progress_desc') {
        return pctB - pctA;
      }
      if (sortBy === 'progress_asc') {
        return pctA - pctB;
      }
      if (sortBy === 'name_asc') {
        return a.name.localeCompare(b.name, 'vi');
      }
      if (sortBy === 'words_desc') {
        return getCourseItemCount(b) - getCourseItemCount(a);
      }
      return 0;
    });
  }, [
    libraryCourses, 
    searchQuery, 
    selectedLang, 
    selectedSource, 
    selectedPinStatus, 
    selectedProgress, 
    sortBy, 
    stats, 
    workspaceCourseIds, 
    customCourses
  ]);

  const recordCourseAccess = (courseId: string) => {
    try {
      const raw = localStorage.getItem('nihongo_last_course_access');
      const map = raw ? JSON.parse(raw) : {};
      map[courseId] = Date.now();
      localStorage.setItem('nihongo_last_course_access', JSON.stringify(map));
    } catch (_) {}
  };

  const handleNavigateToCourse = (courseId: string) => {
    recordCourseAccess(courseId);
    navigate(`/course/${courseId}`, { state: { from: '/' } });
  };

  const handleStartStudy = (courseId: string, mode: 'new' | 'review') => {
    recordCourseAccess(courseId);
    navigate(`/learn/session?courseId=${courseId}&mode=${mode}`);
  };

  const handleSaveCourse = async (data: any, courseId?: string) => {
    if (courseId) {
      await updateCourse(courseId, data);
    } else {
      const created = await createCourse(data);
      // Tự động thêm vào danh sách và ghim vào không gian học tập
      await addCourse(created.id);
      navigate(`/course/${created.id}`);
    }
  };

  const handleOpenCreateModal = () => {
    executeWithGate(() => {
      setEditingCourse(null);
      setIsEditorOpen(true);
    });
  };

  const handleDeleteCustomCourse = async (courseId: string, title: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa bộ từ vựng "${title}" không? Hành động này không thể hoàn tác.`)) {
      await deleteCourse(courseId);
      await removeCourse(courseId);
    }
  };

  const handleMoveCourse = (courseId: string, direction: 'up' | 'down') => {
    const index = workspaceCourseIds.indexOf(courseId);
    if (index < 0) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= workspaceCourseIds.length) return;
    const newOrder = [...workspaceCourseIds];
    const [removed] = newOrder.splice(index, 1);
    newOrder.splice(targetIndex, 0, removed);
    reorderWorkspace(newOrder);
  };

  const hasActiveFilters = searchQuery || selectedLang !== 'all' || selectedSource !== 'all' || selectedPinStatus !== 'all' || selectedProgress !== 'all' || sortBy !== 'recent';

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedLang('all');
    setSelectedSource('all');
    setSelectedPinStatus('all');
    setSelectedProgress('all');
    setSortBy('recent');
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-slate-50 dark:bg-slate-900 p-4 sm:p-6 md:p-12 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white mb-1.5 flex items-center gap-3">
              <Library className="text-indigo-600 dark:text-indigo-400" size={30} />
              Khóa Học Của Tôi
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm">
              {user ? `Chào mừng trở lại, ${user.displayName || user.email?.split('@')[0]}!` : 'Đăng nhập để đồng bộ tiến độ học tập và bàn làm việc trên mọi thiết bị.'}
            </p>
          </div>

          {/* Action on top right: Tạo bộ từ mới */}
          {user ? (
            <button
              onClick={handleOpenCreateModal}
              className="self-start sm:self-auto px-4 sm:px-5 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md shadow-indigo-500/25 flex items-center gap-2"
            >
              <Plus size={18} />
              <span>Tạo bộ từ mới</span>
            </button>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="self-start sm:self-auto px-4 sm:px-5 py-2.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 font-bold text-xs sm:text-sm rounded-xl transition-all border border-indigo-200 dark:border-indigo-800/60 flex items-center gap-2"
            >
              <LogIn size={16} />
              <span>Đăng nhập để tạo bộ từ</span>
            </button>
          )}
        </div>

        {/* Tabs Switcher: Không gian học tập vs Kho khóa học */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-3">
          <button
            onClick={() => setActiveTab('workspace')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${
              activeTab === 'workspace'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Sparkles size={16} />
            <span>Không gian học tập</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
              activeTab === 'workspace' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}>
              {workspaceCourses.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('library')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${
              activeTab === 'library'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Layers size={16} />
            <span>Kho khóa học & Quản lý</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
              activeTab === 'library' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}>
              {libraryCourses.length}
            </span>
          </button>
        </div>

        {/* ============================================================== */}
        {/* TAB 1: KHÔNG GIAN HỌC TẬP (WORKSPACE / PRECISE REORDER)        */}
        {/* ============================================================== */}
        {activeTab === 'workspace' && (
          <div className="space-y-4">
            {/* Status & Tip banner */}
            {workspaceCourses.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-2.5 bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl text-xs text-indigo-900 dark:text-indigo-200">
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
                  <span>
                    Đang ghim <strong>{workspaceCourses.length}</strong> khóa học ưu tiên. Dùng nút mũi tên (▲ / ▼) trên từng thẻ để đổi thứ tự ưu tiên học tập.
                  </span>
                </div>
                <button
                  onClick={() => setActiveTab('library')}
                  className="self-start sm:self-auto font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                >
                  <span>Kho khóa học</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            )}

            {workspaceCourses.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 sm:p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-700">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Sparkles size={32} />
                </div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">
                  Không gian học tập đang trống
                </h2>
                <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto text-xs sm:text-sm">
                  Hãy ghim các khóa học bạn muốn tập trung ôn tập hàng ngày từ <strong>Kho khóa học</strong> hoặc khám phá giáo trình mới để bắt đầu.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    onClick={() => setActiveTab('library')}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-indigo-500/20 flex items-center gap-1.5"
                  >
                    <Layers size={16} />
                    <span>Mở Kho khóa học để ghim</span>
                  </button>
                  <button
                    onClick={() => navigate('/explore')}
                    className="px-5 py-2.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-bold text-sm rounded-xl hover:bg-slate-50 transition-all"
                  >
                    Khám phá giáo trình mới
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence>
                  {workspaceCourses.map((c, index) => {
                    const stat = stats[c.id];
                    const isOffline = offlineCourseIds.has(c.id);
                    const isCustom = customCourses.some(cust => cust.id === c.id);

                    return (
                      <WorkspaceCard
                        key={c.id}
                        course={c}
                        orderIndex={index}
                        stat={stat}
                        isOffline={isOffline}
                        isCustom={isCustom}
                        canMoveUp={index > 0}
                        canMoveDown={index < workspaceCourses.length - 1}
                        onMoveUp={() => handleMoveCourse(c.id, 'up')}
                        onMoveDown={() => handleMoveCourse(c.id, 'down')}
                        onUnpin={() => togglePinCourse(c.id)}
                        onManage={() => setSelectedCourseForManage(c.id)}
                        onNavigate={() => handleNavigateToCourse(c.id)}
                        onStartStudy={(mode) => handleStartStudy(c.id, mode)}
                      />
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: KHO KHÓA HỌC & QUẢN LÝ (RICH FILTER & SORT CATALOG)     */}
        {/* ============================================================== */}
        {activeTab === 'library' && (
          <div className="space-y-6">
            {/* Filter & Search Bar */}
            <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-700/80 shadow-sm space-y-4">
              {/* Row 1: Search & Language Chips */}
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                {/* Search Input */}
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm theo tên khóa học, mô tả, tác giả..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Quick Language Filter Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
                  {[
                    { id: 'all', label: 'Tất cả' },
                    { id: 'ja', label: '🇯🇵 Tiếng Nhật' },
                    { id: 'en', label: '🇬🇧 Tiếng Anh' },
                    { id: 'generic', label: '🌐 Thuật ngữ' },
                  ].map(chip => (
                    <button
                      key={chip.id}
                      onClick={() => setSelectedLang(chip.id as any)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                        selectedLang === chip.id
                          ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20'
                          : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Row 2: Secondary Filters & Sort Dropdown */}
              <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-700/50 text-xs">
                <div className="flex items-center gap-1.5 text-slate-400 font-semibold mr-1">
                  <Filter size={14} />
                  <span>Bộ lọc:</span>
                </div>

                {/* Filter Nguồn gốc */}
                <select
                  value={selectedSource}
                  onChange={(e) => setSelectedSource(e.target.value as any)}
                  className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="all">Mọi nguồn gốc</option>
                  <option value="system">🏛️ Giáo trình Hệ thống</option>
                  <option value="custom">✨ Bộ từ Tự tạo</option>
                </select>

                {/* Filter Ghim */}
                <select
                  value={selectedPinStatus}
                  onChange={(e) => setSelectedPinStatus(e.target.value as any)}
                  className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="all">Mọi trạng thái</option>
                  <option value="pinned">📌 Đang ghim vào Bàn học</option>
                  <option value="unpinned">📥 Chưa ghim</option>
                </select>

                {/* Filter Tiến độ */}
                <select
                  value={selectedProgress}
                  onChange={(e) => setSelectedProgress(e.target.value as any)}
                  className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="all">Mọi tiến độ</option>
                  <option value="in_progress">⏳ Đang học (1-99%)</option>
                  <option value="completed">✅ Đã hoàn thành (100%)</option>
                  <option value="not_started">⚪ Chưa bắt đầu (0%)</option>
                </select>

                {/* Sort dropdown */}
                <div className="ml-auto flex items-center gap-1.5">
                  <ArrowUpDown size={14} className="text-slate-400" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="recent">🔥 Vừa mới học gần đây</option>
                    <option value="pinned_first">📌 Đang ghim lên đầu</option>
                    <option value="due">Cần ôn tập nhiều nhất</option>
                    <option value="progress_desc">Tiến độ: Cao → Thấp</option>
                    <option value="progress_asc">Tiến độ: Thấp → Cao</option>
                    <option value="name_asc">Tên A → Z</option>
                    <option value="words_desc">Số lượng từ vựng</option>
                  </select>
                </div>

                {/* Reset Filters button */}
                {hasActiveFilters && (
                  <button
                    onClick={handleResetFilters}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-slate-500 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400 font-bold transition-colors"
                    title="Đặt lại bộ lọc"
                  >
                    <RotateCcw size={13} />
                    <span>Đặt lại</span>
                  </button>
                )}
              </div>
            </div>

            {/* Results Counter & Info */}
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
              <span>
                Hiển thị <strong>{filteredLibraryCourses.length}</strong> / {libraryCourses.length} khóa học
              </span>
              <button
                onClick={() => navigate('/explore')}
                className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center gap-1"
              >
                <span>+ Khám phá thêm giáo trình mới</span>
                <ArrowRight size={13} />
              </button>
            </div>

            {/* Courses List */}
            {statsLoading || customLoading ? (
              <div className="flex items-center justify-center py-16 text-slate-400">
                <Loader2 className="animate-spin w-8 h-8" />
              </div>
            ) : filteredLibraryCourses.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-3xl p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-700">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700/60 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                  <Search size={28} />
                </div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">
                  Không tìm thấy khóa học phù hợp
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm max-w-md mx-auto mb-4">
                  Không có khóa học nào khớp với các tiêu chí tìm kiếm hoặc bộ lọc hiện tại.
                </p>
                <button
                  onClick={handleResetFilters}
                  className="px-4 py-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold text-xs rounded-xl hover:bg-indigo-100 transition-all"
                >
                  Xóa bộ lọc tìm kiếm
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredLibraryCourses.map(c => {
                  const stat = stats[c.id];
                  const learnedCount = stat?.progressPercent || 0;
                  const totalItems = getCourseItemCount(c);
                  const percent = getCoursePercent(c, stat);
                  const isPinned = workspaceCourseIds.includes(c.id);
                  const isOffline = offlineCourseIds.has(c.id);
                  const customDoc = customCourses.find(cust => cust.id === c.id);
                  const isCustom = !!customDoc;

                  return (
                    <div
                      key={c.id}
                      className="group flex flex-col p-6 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-3xl hover:border-indigo-500 dark:hover:border-indigo-500 transition-all shadow-sm hover:shadow-xl"
                    >
                      {/* Top Row: Icon + Pin Button + Custom publish toggle */}
                      <div className="flex items-start justify-between gap-2 mb-4">
                        <div
                          className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md font-black text-lg select-none"
                          style={{ backgroundColor: getColorBg(c.color) }}
                        >
                          {c.template === 'english' ? 'EN' : c.template === 'generic' ? '📋' : c.subject === 'vocab' ? 'Aa' : (c.subject === 'kanji_single' || c.subject === 'kanji_words') ? '漢' : c.subject === 'grammar' ? '📝' : '🌟'}
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                          {/* Pin/Unpin Toggle Button */}
                          <button
                            onClick={() => togglePinCourse(c.id)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                              isPinned
                                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60 hover:bg-indigo-100'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-300'
                            }`}
                            title={isPinned ? 'Bấm để bỏ ghim khỏi Không gian học tập' : 'Bấm để ghim vào Không gian học tập'}
                          >
                            <Pin size={13} className={isPinned ? 'fill-indigo-600 dark:fill-indigo-400' : ''} />
                            <span>{isPinned ? 'Đang ghim' : 'Ghim bàn học'}</span>
                          </button>

                          {/* Publish toggle if custom */}
                          {customDoc && (
                            <button
                              onClick={() => togglePublish(customDoc.id, customDoc.isPublished)}
                              className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-xl border transition-all ${
                                customDoc.isPublished
                                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50'
                                  : 'bg-slate-50 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600'
                              }`}
                              title={customDoc.isPublished ? 'Đang công khai. Bấm để chuyển về Riêng tư' : 'Đang riêng tư. Bấm để Xuất bản lên Khám phá'}
                            >
                              {customDoc.isPublished ? <Globe size={12} /> : <Lock size={12} />}
                              <span>{customDoc.isPublished ? 'Công khai' : 'Riêng tư'}</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Course Title & Author */}
                      <h3 
                        onClick={() => handleNavigateToCourse(c.id)}
                        className="text-lg font-black text-slate-800 dark:text-white mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1 cursor-pointer"
                      >
                        {c.name}
                      </h3>

                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-3">
                        <span>Tác giả:</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[150px]">
                          {c.author?.name || 'Hệ thống'}
                        </span>
                        {c.author?.isOfficial && (
                          <BadgeCheck size={13} className="fill-blue-500 text-white dark:text-slate-900 shrink-0" />
                        )}
                      </div>

                      {/* Badges */}
                      <div className="flex items-center gap-1.5 mb-4 flex-wrap">
                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-lg">
                          {c.template === 'english' ? '🇬🇧 Tiếng Anh' : c.template === 'generic' ? '🌐 Thuật ngữ' : '🇯🇵 Tiếng Nhật'}
                        </span>
                        <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-lg">
                          {c.level}
                        </span>
                        <span className="px-2 py-0.5 bg-slate-50 dark:bg-slate-800 text-slate-400 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700">
                          {totalItems} từ
                        </span>
                        {isOffline && (
                          <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-lg border border-emerald-200 dark:border-emerald-800/40">
                            Offline
                          </span>
                        )}
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-700/50">
                        <div className="flex justify-between text-xs font-bold text-slate-400 mb-1.5">
                          <span>Tiến độ ({learnedCount}/{totalItems})</span>
                          <span className="text-indigo-600 dark:text-indigo-400">{percent}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mb-4">
                          <div 
                            className="h-full bg-indigo-500 rounded-full transition-all duration-700" 
                            style={{ width: `${percent}%` }} 
                          />
                        </div>

                        {/* Bottom Actions Row */}
                        <div className="flex items-center justify-between gap-2">
                          <button
                            onClick={() => handleNavigateToCourse(c.id)}
                            className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5"
                          >
                            <BookOpen size={14} /> Vào học
                          </button>

                          <div className="flex items-center gap-1">
                            {/* If custom deck: Edit & Delete */}
                            {customDoc && (
                              <>
                                <button
                                  onClick={() => { setEditingCourse(customDoc); setIsEditorOpen(true); }}
                                  className="p-2 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
                                  title="Chỉnh sửa nội dung bộ từ"
                                >
                                  <Edit3 size={15} />
                                </button>
                                <button
                                  onClick={() => handleDeleteCustomCourse(c.id, c.name)}
                                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors"
                                  title="Xóa bộ từ"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </>
                            )}

                            {/* If system course: Manage */}
                            {!isCustom && (
                              <button
                                onClick={() => setSelectedCourseForManage(c.id)}
                                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 rounded-xl transition-colors"
                                title="Quản lý khóa học"
                              >
                                <MoreVertical size={16} />
                              </button>
                            )}
                          </div>
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Modal Quản Lý Khóa Học Toàn Diện */}
      <CourseManageModal
        isOpen={!!selectedCourseForManage}
        onClose={() => setSelectedCourseForManage(null)}
        courseId={selectedCourseForManage}
      />

      {/* Modal Tạo / Sửa Bộ Từ Vựng Cá Nhân */}
      <CourseEditorModal
        isOpen={isEditorOpen}
        onClose={() => { setIsEditorOpen(false); setEditingCourse(null); }}
        onSave={handleSaveCourse}
        editingCourse={editingCourse}
      />

      {/* Auth Gate Component nếu kích hoạt */}
      <GateComponent />
    </div>
  );
}

