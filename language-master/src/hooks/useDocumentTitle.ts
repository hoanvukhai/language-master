import { useEffect } from "react";

const BASE = "Luyện đề JLPT";

/** Đặt tên tab trình duyệt theo trang đang xem; trả lại tên cũ khi rời trang (C-6). */
export function useDocumentTitle(title: string | null | undefined): void {
  useEffect(() => {
    if (!title) return;
    const previous = document.title;
    document.title = title === BASE ? BASE : `${title} · ${BASE}`;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
