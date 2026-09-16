import { useState, useCallback } from 'react';
import { AuthGateModal } from '../components/shared/AuthGateModal';
import type { AuthGateType } from '../components/shared/AuthGateModal';
import { useAuth } from '../context/auth/useAuth';
import { useMyCourses } from '../context/global/useMyCourses';

export function useAuthGate() {
  const [isOpen, setIsOpen] = useState(false);
  const [gateType, setGateType] = useState<AuthGateType>('login');
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const { user } = useAuth();
  const { myCourseIds, addCourse } = useMyCourses();

  /**
   * Gọi hàm này khi người dùng bấm vào một chức năng cần quyền.
   * - Nếu chưa login -> Bật modal login
   * - Nếu đã login, yêu cầu enroll nhưng chưa enroll -> Bật modal add_course
   * - Ngược lại -> Thực hiện action ngay
   * 
   * requireCourseId: Trình id khóa học cần check. Nếu truyền vào, sẽ kiểm tra cả enroll.
   */
  const executeWithGate = useCallback((action: () => void, requireCourseId?: string) => {
    if (!user) {
      setGateType('login');
      setIsOpen(true);
      return;
    }

    if (requireCourseId && !myCourseIds.includes(requireCourseId)) {
      setGateType('add_course');
      setPendingAction(() => async () => {
        await addCourse(requireCourseId);
        action();
      });
      setIsOpen(true);
      return;
    }

    // Pass all checks
    action();
  }, [user, myCourseIds, addCourse]);

  const handleConfirm = useCallback(() => {
    if (pendingAction) {
      pendingAction();
    }
  }, [pendingAction]);

  const GateComponent = useCallback(() => (
    <AuthGateModal
      isOpen={isOpen}
      onClose={() => { setIsOpen(false); setPendingAction(null); }}
      onConfirm={handleConfirm}
      type={gateType}
    />
  ), [isOpen, handleConfirm, gateType]);

  return { executeWithGate, GateComponent };
}
