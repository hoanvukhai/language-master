import { expect, test, type Page } from "@playwright/test";

const D1 = "kokusho-n2-20days-d01";
const D20 = "kokusho-n2-20days-d20";

async function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error" && !/firebase|firestore|googleapis|ERR_TUNNEL|ERR_NAME_NOT_RESOLVED|ERR_INTERNET/i.test(m.text())) {
      errors.push(m.text());
    }
  });
  return errors;
}

test("hub lists 20 days and opens a day", async ({ page }) => {
  const errors = await collectErrors(page);
  await page.goto("/exams/jlpt/books");
  await expect(page.locator("main")).toContainText("1080 câu");
  await expect(page.getByRole("button", { name: /Mở 20 bài học/ })).toBeVisible();
  await page.goto(`/exams/jlpt/${D1}`);
  await expect(page.locator("main")).toContainText("Mondai");
  expect(errors).toEqual([]);
});

test("strict mock hides help tools and loads no dictionary", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", (r) => requests.push(r.url()));
  await page.goto(`/exams/jlpt/${D1}/mock`);
  await page.getByRole("button", { name: "Bắt đầu làm bài" }).click();
  // Vào thẳng phòng thi, không còn hộp xác nhận khi không thay bài nào
  await expect(page.getByRole("radio").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Nghe câu" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Dịch câu" })).toHaveCount(0);
  await page.keyboard.press("F9");
  await expect(page.locator("dialog[open]")).toHaveCount(0);
  expect(requests.filter((u) => /registry-|lexicon/.test(u))).toEqual([]);
});

test("drill answer can be undone before it commits", async ({ page }) => {
  await page.goto(`/exams/jlpt/${D1}/drill`);
  await page.getByRole("button", { name: "Bắt đầu luyện" }).click();
  await page.getByRole("radio").nth(1).check({ force: true });
  await expect(page.getByRole("status").filter({ hasText: "đang chốt" })).toBeVisible();
  // Trên điện thoại nút Hoàn tác nằm ở thanh dưới (nút trong thẻ câu bị thanh che)
  await page.locator('button:has-text("Hoàn tác"):visible').last().click();
  await page.waitForTimeout(1800);
  await expect(page.getByText("Lời giải")).toHaveCount(0);
  await page.getByRole("radio").nth(1).check({ force: true });
  await expect(page.locator("main")).toContainText("Từ trọng tâm", { timeout: 4000 });
  await expect(page.locator("main")).toContainText("AI dịch");
});

test("review: Mondai 9 blanks link back to the passage", async ({ page }) => {
  await page.goto(`/exams/jlpt/${D20}/review`);
  await expect(page.getByText("Câu 1 / 54")).toBeVisible();
  const aside = page.locator("aside a[title^='Câu 50']").first();
  if (await aside.isVisible()) {
    await aside.click();
  } else {
    await page.getByRole("navigation", { name: "Điều hướng xem đáp án" }).getByRole("button").nth(1).click();
    await page.locator("a[title^='Câu 50']").last().click();
  }
  await page.getByRole("button", { name: "Xem đoạn văn" }).click();
  await page.getByRole("button", { name: /Ô trống 50, tới câu hỏi/ }).first().click();
  const back = page.getByRole("button", { name: "Xem trong đoạn văn ↑" }).first();
  await back.scrollIntoViewIfNeeded();
  await back.click();
  await expect(page.locator(".exam-blank-flash")).toHaveCount(1);
});

test("no horizontal overflow on the review page", async ({ page }) => {
  await page.goto(`/exams/jlpt/${D1}/review`);
  await page.getByRole("radio").first().waitFor({ state: "attached" }).catch(() => undefined);
  const { sw, iw } = await page.evaluate(() => ({
    sw: document.documentElement.scrollWidth,
    iw: window.innerWidth,
  }));
  expect(sw).toBeLessThanOrEqual(iw);
});

test("hub: an unfinished mock shows once; Đề mới asks before discarding it", async ({ page }) => {
  await page.goto("/exams/jlpt");
  const thiThu = page.getByRole("region", { name: /^Thi thử/ });
  await thiThu.getByRole("button", { name: "Bắt đầu thi thử" }).click();
  await expect(page.getByRole("radio").first()).toBeAttached();
  await page.getByRole("radio").nth(1).check({ force: true });
  await page.goto("/exams/jlpt");
  await expect(thiThu.getByRole("button", { name: /^Làm tiếp/ })).toBeVisible();
  const historyBtn = page.getByRole("button", { name: /^Lịch sử/ });
  await expect(historyBtn).toContainText("1 đang làm");
  await historyBtn.click();
  const popup = page.getByRole("dialog", { name: "Lịch sử làm bài" });
  await expect(popup.getByRole("tab", { name: "Đang làm (1)" })).toBeVisible();
  await popup.getByRole("button", { name: "Đóng" }).click();
  await expect(popup).toBeHidden();
  await thiThu.getByRole("button", { name: "Đề mới" }).click();
  await expect(page.getByRole("dialog")).toContainText("sẽ bị xóa và không tính điểm");
});
