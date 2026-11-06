import { useState } from "react";
import { ZoomIn, ZoomOut } from "lucide-react";

export default function SourceImage({
  src,
  alt,
}: {
  src: string;
  alt: string;
}) {
  const [zoomed, setZoomed] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <div className="min-w-0 space-y-2.5 mt-2">
      <button
        type="button"
        className="exam-secondary !min-h-9 text-xs"
        aria-expanded={zoomed}
        onClick={() => setZoomed(!zoomed)}
      >
        {zoomed ? <ZoomOut size={15} /> : <ZoomIn size={15} />}
        <span>{zoomed ? "Thu nhỏ bản gốc" : "Phóng to để đọc rõ"}</span>
      </button>
      {zoomed && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Cuộn ngang trong khung để xem toàn bộ dòng.
        </p>
      )}
      <div
        className="max-w-full overflow-x-auto rounded-2xl bg-white p-2 border border-slate-200 dark:border-slate-700 shadow-inner"
        tabIndex={zoomed ? 0 : undefined}
        aria-label={zoomed ? "Khung bản gốc phóng to" : undefined}
      >
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onError={() => setFailed(true)}
          className={zoomed ? "w-[1000px] min-w-[1000px] max-w-none" : "w-full"}
        />
      </div>
      {failed && (
        <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">
          Chưa tải được bản gốc. Hãy kiểm tra kết nối và tải lại trang trước khi
          làm câu này.
        </p>
      )}
    </div>
  );
}
