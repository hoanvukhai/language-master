// src/lib/offline/offlineStorage.ts
// Module quản lý dữ liệu Ngoại Tuyến (Offline Storage) sử dụng IndexedDB nguyên bản

export interface OfflineMeta {
  id: string; // courseId
  name: string;
  subject?: string;
  level?: string;
  template?: string;
  itemCount: number;
  sizeBytes: number;
  savedAt: number; // timestamp
}

export interface OfflineCourseRecord extends OfflineMeta {
  data: any[];
}

const DB_NAME = 'nihongo_master_offline';
const DB_VERSION = 1;
const STORE_NAME = 'offline_courses';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB không được hỗ trợ trên trình duyệt này.'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Định dạng dung lượng byte thành chuỗi thân thiện (B, KB, MB)
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Ước lượng dung lượng byte của một object/array
 */
function estimateByteSize(obj: any): number {
  try {
    const str = JSON.stringify(obj);
    return new Blob([str]).size;
  } catch {
    return 0;
  }
}

/**
 * Lưu khóa học vào IndexedDB để học ngoại tuyến
 */
export async function saveCourseOffline(course: {
  id: string;
  name: string;
  subject?: string;
  level?: string;
  template?: string;
  data: any[];
}): Promise<OfflineMeta> {
  const db = await openDB();
  const sizeBytes = estimateByteSize(course.data);
  const record: OfflineCourseRecord = {
    id: course.id,
    name: course.name,
    subject: course.subject,
    level: course.level,
    template: course.template || 'japanese',
    data: course.data,
    itemCount: Array.isArray(course.data) ? course.data.length : 0,
    sizeBytes,
    savedAt: Date.now(),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(record);

    req.onsuccess = () => {
      const meta: OfflineMeta = {
        id: record.id,
        name: record.name,
        subject: record.subject,
        level: record.level,
        template: record.template,
        itemCount: record.itemCount,
        sizeBytes: record.sizeBytes,
        savedAt: record.savedAt,
      };
      // Gửi event để các tab hoặc component khác cập nhật
      window.dispatchEvent(new CustomEvent('offline_course_changed', { detail: { courseId: course.id, action: 'saved' } }));
      resolve(meta);
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Lấy dữ liệu mảng từ vựng của khóa học từ IndexedDB
 */
export async function getOfflineCourseData(courseId: string): Promise<any[] | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(courseId);

      req.onsuccess = () => {
        const record = req.result as OfflineCourseRecord | undefined;
        resolve(record ? record.data : null);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[OfflineStorage] Error reading course data:', err);
    return null;
  }
}

/**
 * Kiểm tra xem khóa học đã được lưu ngoại tuyến hay chưa
 */
export async function isCourseOffline(courseId: string): Promise<boolean> {
  const meta = await getOfflineCourseMeta(courseId);
  return meta !== null;
}

/**
 * Lấy metadata của một khóa học ngoại tuyến
 */
export async function getOfflineCourseMeta(courseId: string): Promise<OfflineMeta | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(courseId);

      req.onsuccess = () => {
        const record = req.result as OfflineCourseRecord | undefined;
        if (!record) return resolve(null);
        resolve({
          id: record.id,
          name: record.name,
          subject: record.subject,
          level: record.level,
          template: record.template,
          itemCount: record.itemCount,
          sizeBytes: record.sizeBytes,
          savedAt: record.savedAt,
        });
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

/**
 * Xóa một khóa học khỏi IndexedDB
 */
export async function removeCourseOffline(courseId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(courseId);

    req.onsuccess = () => {
      window.dispatchEvent(new CustomEvent('offline_course_changed', { detail: { courseId, action: 'removed' } }));
      resolve();
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Lấy danh sách metadata của toàn bộ các khóa học đã tải về
 */
export async function getAllOfflineMeta(): Promise<OfflineMeta[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => {
        const records = (req.result || []) as OfflineCourseRecord[];
        const metas: OfflineMeta[] = records.map(r => ({
          id: r.id,
          name: r.name,
          subject: r.subject,
          level: r.level,
          template: r.template,
          itemCount: r.itemCount,
          sizeBytes: r.sizeBytes,
          savedAt: r.savedAt,
        }));
        resolve(metas);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

/**
 * Lấy tổng dung lượng bộ nhớ đang lưu offline
 */
export async function getTotalOfflineSize(): Promise<number> {
  const metas = await getAllOfflineMeta();
  return metas.reduce((total, m) => total + (m.sizeBytes || 0), 0);
}

/**
 * Xóa toàn bộ dữ liệu ngoại tuyến
 */
export async function clearAllOfflineCourses(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.clear();

    req.onsuccess = () => {
      window.dispatchEvent(new CustomEvent('offline_course_changed', { detail: { action: 'cleared' } }));
      resolve();
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Đặt lại toàn bộ bộ nhớ ứng dụng (Self-Healing Recovery Tool)
 * Dọn sạch Service Worker, Cache Storage, IndexedDB và LocalStorage để giải phóng khóa xung đột.
 */
export async function resetAllAppStorageAndCache(): Promise<void> {
  try {
    // 1. Hủy đăng ký Service Workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const reg of registrations) {
        await reg.unregister();
      }
    }

    // 2. Xóa Cache Storage của trình duyệt
    if ('caches' in window) {
      const keys = await caches.keys();
      for (const key of keys) {
        await caches.delete(key);
      }
    }

    // 3. Xóa các cơ sở dữ liệu IndexedDB bị kẹt
    if (typeof indexedDB !== 'undefined') {
      try {
        if (indexedDB.databases) {
          const dbs = await indexedDB.databases();
          for (const dbInfo of dbs) {
            if (dbInfo.name) {
              indexedDB.deleteDatabase(dbInfo.name);
            }
          }
        }
      } catch {
        // Trình duyệt không hỗ trợ indexedDB.databases()
      }
      const knownDbs = [
        'nihongo_master_offline',
        'firebaseLocalStorageDb',
        'firestore/[DEFAULT]/[default]',
      ];
      for (const name of knownDbs) {
        try {
          indexedDB.deleteDatabase(name);
        } catch {}
      }
    }

    // 4. Xóa LocalStorage và SessionStorage
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}

    // 5. Tải lại trang sạch hoàn toàn
    window.location.replace('/');
  } catch (err) {
    console.error('[OfflineStorage] Error resetting storage:', err);
    window.location.replace('/');
  }
}

