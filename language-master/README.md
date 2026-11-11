# Language Master

Ứng dụng học ngoại ngữ (React 19 + TypeScript + Vite, Firebase), gồm cả phần Luyện đề JLPT N2 (bộ 20 ngày, 1.080 câu).

## Chạy

```bash
npm install
npm run dev        # http://localhost:5173
npm run build
npm run preview    # http://127.0.0.1:4173
```

Biến môi trường Firebase (`VITE_FIREBASE_*`) đặt trong `.env.local`. Sau khi sửa `firestore.rules`, triển khai bằng `firebase deploy --only firestore:rules`.

## Kiểm thử

| Lệnh | Phạm vi |
|---|---|
| `npm run test:jlpt` | Logic và dữ liệu đề (node test runner) |
| `npm run test:jlpt:ui` | Giao diện (vitest + jsdom, Firebase được mock) |
| `npm run test:e2e` | Playwright trên bản đã build. Lần đầu chạy `npx playwright install chromium` |

## Luyện đề JLPT

- Mô tả hành vi: [docs/specs/jlpt-current-behavior.md](docs/specs/jlpt-current-behavior.md)
- Dữ liệu đề nằm ở `src/data/exams/jlpt/n2/kokusho-20days/dayXX.json`.
- Nội dung tiếng Việt (bản dịch, từ trọng tâm, ghi chú phương án):
  1. Sửa nguồn trong `imports/jlpt/kokusho-20days/enrichment/src/dayXX.txt`.
  2. Chạy `node scripts/jlpt/compile-enrichment.mjs XX`.
  3. Chạy `node scripts/jlpt/apply-enrichment.mjs dayXX`.
- Sau khi đổi dữ liệu đề, dựng lại bản từ điển rút gọn bằng `node scripts/jlpt/build-lexicon.mjs`.
