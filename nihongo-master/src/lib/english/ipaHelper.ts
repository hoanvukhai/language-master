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
