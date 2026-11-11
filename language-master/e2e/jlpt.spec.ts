import { expect, test, type Page } from "@playwright/test";

const D1 = "kokusho-n2-20days-d01";
const D20 = "kokusho-n2-20days-d20";

async function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error" && !/firebase|firestore|googleapis/i.test(m.text())) {
      errors.push(m.text());
    }
  });
  return errors;
}

test("hub lists 20 days and opens a day", async ({ page }) => {
  const errors = await collectErrors(page);
  await page.goto("/exams/jlpt");
  await expect(page.locator("main")).toContainText("1080 câu hỏi");
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
  const dialog = page.getByRole("dialog", { name: "Bắt đầu bài có giờ" });
  await dialog.getByRole("button", { name: "Bắt đầu" }).click();
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
  await page.getByRole("button", { name: "Hoàn tác" }).click();
  await page.waitForTimeout(1800);
  await expect(page.getByText("Lời giải")).toHaveCount(0);
  await page.getByRole("radio").nth(1).check({ force: true });
  await expect(page.locator("main")).toContainText("Từ trọng tâm", { timeout: 4000 });
  await expect(page.locator("main")).toContainText("AI dịch");
});

test("review: Mondai 9 blanks link back to the passage", async ({ page }) => {
  await page.goto(`/exams/jlpt/${D20}/review`);
  await page.getByRole("button", { name: /Ô trống 50, tới câu hỏi/ }).first().waitFor();
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
