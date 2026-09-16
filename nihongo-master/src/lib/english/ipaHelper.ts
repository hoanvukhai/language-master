// src/lib/english/ipaHelper.ts
// Helper chuẩn hóa hiển thị đồng thời cả 2 phiên âm Anh - Anh (UK) và Anh - Mỹ (US)

export interface IpaItem {
  ipa?: string;
  ipaBrE?: string;
  ipaAmE?: string;
}

/**
 * Trả về chuỗi hiển thị IPA gọn gàng chứa cả UK và US
 * VD: "UK: /ˈbɑːθrəʊb/ · US: /ˈbæθroʊb/" hoặc "/ˈbækpæk/ (UK/US)"
 */
export function formatDualIpa(item?: IpaItem | null): string {
  if (!item) return '';
  const br = item.ipaBrE?.trim();
  const am = item.ipaAmE?.trim();
  const def = item.ipa?.trim();

  if (br && am) {
    if (br === am) {
      return `${br} (UK/US)`;
    }
    return `UK: ${br} · US: ${am}`;
  }

  if (br) return `UK: ${br}`;
  if (am) return `US: ${am}`;
  if (def) return def;
  return '';
}

/**
 * Trả về các phần tử IPA riêng biệt cho UK và US để render badge UI
 */
export function getDualIpaParts(item?: IpaItem | null): {
  uk?: string;
  us?: string;
  isIdentical: boolean;
  fallback?: string;
} {
  if (!item) return { isIdentical: false };
  const br = item.ipaBrE?.trim();
  const am = item.ipaAmE?.trim();
  const def = item.ipa?.trim();

  if (br && am) {
    return {
      uk: br,
      us: am,
      isIdentical: br === am,
      fallback: br,
    };
  }

  return {
    uk: br,
    us: am,
    isIdentical: false,
    fallback: def || br || am,
  };
}

/**
 * Tách các biến thể của từ tiếng Anh (ví dụ: "mother, mom" -> ["mother", "mom"])
 */
export function splitWordVariants(target?: string | null): string[] {
  if (!target) return [];
  return target
    .split(/[,/|;]+/)
    .map(s => s.trim())
    .filter(Boolean);
}

/**
 * Kiểm tra câu trả lời nhập liệu có khớp với bất kỳ biến thể nào của từ tiếng Anh hay không
 * Chấp nhận: "mother" hoặc "mom" hoặc "mother, mom"
 */
export function checkEnglishWordMatch(input?: string | null, target?: string | null): boolean {
  if (!input || !target) return false;
  const normInput = input.trim().toLowerCase();
  const normTarget = target.trim().toLowerCase();

  if (normInput === normTarget) return true;

  const variants = splitWordVariants(normTarget);
  return variants.some(v => v.toLowerCase() === normInput);
}

/**
 * Định dạng hiển thị đáp án thân thiện khi có nhiều từ đồng nghĩa
 * Ví dụ: "mother, mom" -> "mother (hoặc mom)"
 */
export function formatWordVariantsDisplay(target?: string | null): string {
  if (!target) return '';
  const variants = splitWordVariants(target);
  if (variants.length <= 1) return target;
  return `${variants[0]} (hoặc ${variants.slice(1).join(', ')})`;
}

