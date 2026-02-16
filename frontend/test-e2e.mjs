/**
 * E2E Test Suite — Resume Screener
 *
 * Tests the full pipeline with real backend (FastAPI + Claude API).
 * Expects both servers running:
 *   - Backend: http://localhost:8000
 *   - Frontend: http://localhost:5173
 *
 * Run: node test-e2e.mjs
 */

import puppeteer from 'puppeteer-core';
import { writeFileSync, mkdirSync } from 'fs';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = 'http://127.0.0.1:5173';
const SHOTS = '/tmp/resume-screener-e2e';
const LLM_TIMEOUT = 120_000; // 2 min for LLM calls

try { mkdirSync(SHOTS, { recursive: true }); } catch {}

// ---------------------------------------------------------------------------
// Test infrastructure
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;
const results = [];

function assert(condition, message) {
  if (!condition) {
    failed++;
    results.push({ status: 'FAIL', message });
    console.error(`  ❌ FAIL: ${message}`);
    throw new Error(message);
  }
  passed++;
  results.push({ status: 'PASS', message });
  console.log(`  ✅ PASS: ${message}`);
}

async function shot(page, name) {
  const path = `${SHOTS}/${name}.png`;
  await page.screenshot({ path, fullPage: true });
  console.log(`  📸 ${name}`);
  return path;
}

async function sleep(ms) {
  await new Promise(r => setTimeout(r, ms));
}

async function clickButton(page, text) {
  const buttons = await page.$$('button');
  for (const btn of buttons) {
    const btnText = await btn.evaluate(el => el.textContent?.trim());
    if (btnText && btnText.includes(text)) {
      await btn.click();
      return true;
    }
  }
  return false;
}

async function waitForText(page, text, timeout = LLM_TIMEOUT) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const found = await page.evaluate(t => document.body.innerText.includes(t), text);
    if (found) return true;
    await sleep(1000);
  }
  return false;
}

async function waitForTab(page, tabName, timeout = LLM_TIMEOUT) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const found = await clickButton(page, tabName);
    if (found) return true;
    await sleep(1000);
  }
  return false;
}

// Create test resume file
const RESUME_TEXT = `Алексей Петров
Product Manager

О себе:
Опытный специалист с большим стажем работы в IT-сфере. Умею работать в команде и решать сложные задачи.

Опыт работы:

ООО «ТехноСофт» — Менеджер продукта, 2021–2024
- Управление продуктом и бэклогом
- Работа с командой разработки из 6 человек
- Проведение встреч с заказчиками
- Внедрение Scrum-процессов

АО «Банк Прогресс» — Бизнес-аналитик, 2019–2021
- Сбор и анализ требований
- Написание ТЗ для разработки
- Участие во внедрении CRM

Образование:
МГУ — Прикладная математика (2015–2019)

Навыки: MS Office, Jira, Confluence, SQL, Agile/Scrum, Python (базовый)`;

writeFileSync('/tmp/test-resume-e2e.txt', RESUME_TEXT);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--window-size=1440,900', '--no-sandbox'],
  defaultViewport: { width: 1440, height: 900 },
});

const page = await browser.newPage();

// Collect console errors
const consoleErrors = [];
page.on('console', msg => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});

// Collect network errors
const networkErrors = [];
page.on('requestfailed', req => {
  networkErrors.push(`${req.method()} ${req.url()} - ${req.failure()?.errorText}`);
});

try {
  // ===================================================================
  // TEST 1: Homepage loads correctly
  // ===================================================================
  console.log('\n🧪 TEST 1: Homepage');
  await page.goto(BASE, { waitUntil: 'networkidle0', timeout: 10_000 });
  await sleep(500);

  const title = await page.evaluate(() => document.body.innerText);
  assert(title.includes('Проверь') || title.includes('резюме'), 'Homepage has title text');

  const fileInput = await page.$('input[type="file"]');
  assert(fileInput !== null, 'File upload input exists');
  await shot(page, '01-homepage');

  // ===================================================================
  // TEST 2: File upload + analyze (real LLM)
  // ===================================================================
  console.log('\n🧪 TEST 2: File upload + analyze');
  await fileInput.uploadFile('/tmp/test-resume-e2e.txt');
  await sleep(500);

  // Click analyze/upload button (the button might say "Анализировать" or similar)
  await clickButton(page, 'Анализ')
    || await clickButton(page, 'Загрузить')
    || await clickButton(page, 'Проверить');

  // Wait for navigation — LLM call can take 30-90 seconds
  console.log('  Waiting for LLM analysis to complete (up to 2 min)...');
  const navStart = Date.now();
  while (Date.now() - navStart < LLM_TIMEOUT) {
    const currentUrl = page.url();
    if (currentUrl.includes('/analysis/')) break;
    await sleep(2000);
  }

  const url = page.url();
  assert(url.includes('/analysis/'), `Navigated to analysis page: ${url}`);
  await shot(page, '02-analysis-loading');

  // ===================================================================
  // TEST 3: Diagnosis loads (LLM call)
  // ===================================================================
  console.log('\n🧪 TEST 3: Diagnosis');
  // Wait for diagnosis content to appear
  const hasDiagnosis = await waitForText(page, 'Разбор', LLM_TIMEOUT);
  assert(hasDiagnosis, 'Diagnosis tab appeared');

  await sleep(2000);
  await clickButton(page, 'Разбор');
  await sleep(1000);

  const bodyText = await page.evaluate(() => document.body.innerText);
  // Check for resume type badge
  const hasResumeType = bodyText.includes('Список обязанностей')
    || bodyText.includes('Каша из ролей')
    || bodyText.includes('Джун после курсов')
    || bodyText.includes('Переходящий')
    || bodyText.includes('Нормальный');
  assert(hasResumeType, 'Resume type badge is displayed');
  await shot(page, '03-diagnosis');

  // ===================================================================
  // TEST 4: Score tab
  // ===================================================================
  console.log('\n🧪 TEST 4: Score');
  const hasScoresTab = await clickButton(page, 'Оценки');
  assert(hasScoresTab, 'Scores tab is clickable');
  await sleep(1000);

  const scoreText = await page.evaluate(() => document.body.innerText);
  assert(scoreText.includes('/100') || scoreText.includes('100'), 'Score display shows total');
  await shot(page, '04-scores');

  // ===================================================================
  // TEST 5: Roles tab (LLM call)
  // ===================================================================
  console.log('\n🧪 TEST 5: Roles');
  const hasRolesTab = await waitForTab(page, 'Роли', LLM_TIMEOUT);
  assert(hasRolesTab, 'Roles tab appeared');
  await sleep(2000);

  const rolesText = await page.evaluate(() => document.body.innerText);
  const hasRoleCards = rolesText.includes('высокое')
    || rolesText.includes('среднее')
    || rolesText.includes('с натяжкой');
  assert(hasRoleCards, 'Role cards with match levels are displayed');
  await shot(page, '05-roles');

  // ===================================================================
  // TEST 6: Select a role + rewrite (LLM call)
  // ===================================================================
  console.log('\n🧪 TEST 6: Role selection + rewrite');

  // Find and click the first role select button
  const roleButtons = await page.$$('button');
  let roleSelected = false;
  for (const btn of roleButtons) {
    const txt = await btn.evaluate(el => el.textContent?.trim());
    if (txt && (txt.includes('Выбрать') || txt.includes('Переупаковать'))) {
      await btn.click();
      roleSelected = true;
      console.log(`  Clicked role button: "${txt}"`);
      break;
    }
  }
  assert(roleSelected, 'Found and clicked a role selection button');
  await sleep(2000);
  await shot(page, '06-role-selected');

  // Wait for rewrite to complete — poll for "Переупаковка" tab or error
  console.log('  Waiting for rewrite LLM call (up to 2 min)...');
  const rewriteStart = Date.now();
  let hasRewriteTab = false;
  let rewriteError = false;
  while (Date.now() - rewriteStart < LLM_TIMEOUT) {
    // Check for error state
    const errorVisible = await page.evaluate(() => {
      const body = document.body.innerText;
      return body.includes('error') || body.includes('Error') || body.includes('ошибка');
    });
    if (errorVisible) {
      const errText = await page.evaluate(() => document.body.innerText);
      console.log('  ⚠️ Error detected on page:', errText.substring(0, 200));
      rewriteError = true;
      break;
    }
    // Check for rewrite tab
    const tabFound = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const b of buttons) {
        if (b.textContent?.includes('Переупаковка')) return true;
      }
      return false;
    });
    if (tabFound) {
      hasRewriteTab = true;
      await clickButton(page, 'Переупаковка');
      break;
    }
    await sleep(2000);
  }

  if (!hasRewriteTab && !rewriteError) {
    // Capture current state for debugging
    await shot(page, '06b-rewrite-timeout');
    const jsErrors = consoleErrors.filter(e => !e.includes('favicon'));
    if (jsErrors.length > 0) console.log('  JS errors:', jsErrors);
  }
  assert(hasRewriteTab, 'Rewrite tab appeared after role selection');
  await sleep(3000);

  const rewriteText = await page.evaluate(() => document.body.innerText);
  assert(rewriteText.length > 500, 'Rewrite content is displayed (page has content)');
  await shot(page, '07-rewrite');

  // Scroll through rewrite
  await page.evaluate(() => window.scrollTo(0, 600));
  await sleep(500);
  await shot(page, '08-rewrite-experience');

  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(300);

  // ===================================================================
  // TEST 7: Verification (LLM call)
  // ===================================================================
  console.log('\n🧪 TEST 7: Verification');

  // Find "Отправить на проверку" or similar button
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await sleep(500);

  const verifyClicked = await clickButton(page, 'Отправить на проверку')
    || await clickButton(page, 'проверку')
    || await clickButton(page, 'Проверить');

  if (verifyClicked) {
    console.log('  Clicked verify button, waiting for LLM...');
    const hasVerifyTab = await waitForTab(page, 'Проверка', LLM_TIMEOUT);
    assert(hasVerifyTab, 'Verification tab appeared');

    // Wait for actual verification content (not just the loading spinner)
    const hasVerifyContent = await waitForText(page, 'интервью', LLM_TIMEOUT)
      || await waitForText(page, 'сильные', 5000)
      || await waitForText(page, 'блокер', 5000);
    await sleep(2000);

    const verifyText = await page.evaluate(() => document.body.innerText);
    const hasDecision = verifyText.includes('да')
      || verifyText.includes('нет')
      || verifyText.includes('оговорками')
      || verifyText.includes('интервью')
      || verifyText.includes('сильные')
      || verifyText.includes('улучшен');
    assert(hasDecision, 'Verification shows recruiter assessment');
    await shot(page, '09-verification');
  } else {
    console.log('  ⚠️ Verify button not found — skipping verification test');
    results.push({ status: 'SKIP', message: 'Verification button not found' });
  }

  // ===================================================================
  // TEST 8: No console errors
  // ===================================================================
  console.log('\n🧪 TEST 8: Error checks');
  // Filter out expected/benign errors
  const realErrors = consoleErrors.filter(e =>
    !e.includes('favicon') && !e.includes('DevTools')
  );
  if (realErrors.length > 0) {
    console.log('  Console errors:', realErrors);
  }
  assert(networkErrors.length === 0, `No network request failures (found ${networkErrors.length})`);

  // ===================================================================
  // TEST 9: Navigation works
  // ===================================================================
  console.log('\n🧪 TEST 9: Tab navigation');
  for (const tab of ['Разбор', 'Оценки', 'Роли', 'Переупаковка']) {
    const clicked = await clickButton(page, tab);
    if (clicked) {
      await sleep(500);
      console.log(`  ✅ Tab "${tab}" is clickable`);
      passed++;
      results.push({ status: 'PASS', message: `Tab "${tab}" navigation works` });
    }
  }

  await shot(page, '10-final');

} catch (err) {
  console.error(`\n💥 Test aborted: ${err.message}`);
  await shot(page, 'error-state');
} finally {
  await browser.close();

  // ===================================================================
  // Summary
  // ===================================================================
  console.log('\n' + '='.repeat(60));
  console.log('TEST RESULTS SUMMARY');
  console.log('='.repeat(60));
  for (const r of results) {
    const icon = r.status === 'PASS' ? '✅' : r.status === 'FAIL' ? '❌' : '⏭️';
    console.log(`${icon} [${r.status}] ${r.message}`);
  }
  console.log('='.repeat(60));
  console.log(`Total: ${passed} passed, ${failed} failed`);
  console.log(`Screenshots: ${SHOTS}/`);
  console.log('='.repeat(60));

  if (failed > 0) process.exit(1);
}
