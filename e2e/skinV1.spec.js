import { test, expect } from '@playwright/test'

// Smoke test for Skin Diagnosis V1.0's UI wiring — runs with no Supabase env
// configured (see .env.example / src/supabase.js), so every
// diagnosisTracking.js call no-ops and this only exercises the quiz
// flow/scoring/rendering, not persistence.

async function answerEveryQuestion(page) {
  // Every question screen shows exactly one <article class="question">.
  // Loop until the result screen appears.
  for (let i = 0; i < 60; i++) {
    if (await page.locator('.result-card').count()) return
    if (await page.locator('.insight-screen').count()) {
      await page.locator('.insight-screen .themed-btn').click()
      continue
    }
    const question = page.locator('.question-panel .question').first()
    await expect(question).toBeVisible()
    const numericCells = question.locator('.numeric-cell')
    // The footer "다음" button (.nav .themed-btn) only renders for a
    // multi_select question (q48) — App.jsx never renders it for
    // single-select/numeric questions, which auto-advance instead. Check
    // for it BEFORE clicking anything, since clicking a single-select
    // answer navigates away within ~200ms.
    const nextButton = page.locator('.nav .themed-btn')
    const isMultiSelect = await nextButton.count() > 0

    if (await numericCells.count()) {
      await numericCells.nth(5).click() // mid-range numeric_0_10 pick
      // choose() debounces auto-advance by 200ms (re-clicking within that
      // window reschedules it) — without this wait, the tight loop below
      // would keep re-clicking the same question and the timer would never
      // fire.
      await page.waitForTimeout(300)
    } else if (isMultiSelect) {
      const answerButtons = question.locator('.answers .answer')
      const total = await answerButtons.count()
      // Click 3 options (q48's multiSelectMax is 2) and assert the cap holds.
      await answerButtons.nth(0).click()
      await answerButtons.nth(1).click()
      await answerButtons.nth(2).click()
      await expect(question.locator('.answer.selected')).toHaveCount(2)
      await nextButton.click()
    } else {
      const answerButtons = question.locator('.answers .answer')
      const count = await answerButtons.count()
      if (count === 0) throw new Error('question has no answer buttons: ' + await question.locator('h3').innerText())
      await answerButtons.first().click()
      // Same 200ms auto-advance debounce as numeric_0_10 above.
      await page.waitForTimeout(300)
    }
  }
  throw new Error('did not reach result screen within 60 steps')
}

test('Skin V1.0 QUICK 16 completes and shows a valid type16', async ({ page }) => {
  await page.goto('/')
  await page.getByText('V1.0 QUICK 16').click()
  await page.getByRole('button', { name: '처음부터 시작하기' }).click()
  await answerEveryQuestion(page)

  await expect(page.locator('.mode-badge')).toHaveText('SKIN V1.0 · QUICK 16')
  const typeText = await page.locator('.type').innerText()
  expect(typeText).toMatch(/^[ODSRPNWT]{4}$/)
  // QUICK never produces a type64 sub-label.
  await expect(page.locator('.type-sub')).toHaveCount(0)
})

test('Skin V1.0 DEEP 48 completes, shows type64, STATE block, and enforces the q48 2-pick cap', async ({ page }) => {
  await page.goto('/')
  await page.getByText('V1.0 DEEP 48').click()
  await page.getByRole('button', { name: '처음부터 시작하기' }).click()
  await answerEveryQuestion(page)

  await expect(page.locator('.mode-badge')).toHaveText('SKIN V1.0 · DEEP 48')
  const typeText = await page.locator('.type').innerText()
  expect(typeText).toMatch(/^[ODSRPNWTBGAC]{6}$/)
  await expect(page.locator('.type-sub')).toContainText('Skin16 기준')

  // STATE block: 7 chips, none of which fed into the TYPE letters above.
  const stateChips = page.locator('.history-list-scores span')
  await expect(stateChips).toHaveCount(7)
})

// ---- v4.0 regression: the pre-existing quiz must behave exactly as before ----

test('v4.0 QUICK 16 still completes and shows the existing 64-unlock teaser (unaffected by Skin V1.0 additions)', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /QUICK 16/ }).first().click()
  await page.getByRole('button', { name: '처음부터 시작하기' }).click()
  await answerEveryQuestion(page)

  await expect(page.locator('.mode-badge')).toHaveText('QUICK 16')
  const typeText = await page.locator('.type').innerText()
  expect(typeText).toMatch(/^[ODSRPNWT]{4}$/)
  await expect(page.getByText('64가지 세부 피부 MBTI가 궁금하다면?')).toBeVisible()
})
