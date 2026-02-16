import puppeteer from 'puppeteer-core';
import { writeFileSync } from 'fs';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 5173;
const BASE = `http://127.0.0.1:${PORT}`;
const SHOTS = '/tmp/resume-screener';

// Create screenshot directory
import { mkdirSync } from 'fs';
try { mkdirSync(SHOTS, { recursive: true }); } catch {}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--window-size=1440,900', '--no-sandbox'],
  defaultViewport: { width: 1440, height: 900 },
});

const page = await browser.newPage();

async function shot(name, opts = {}) {
  const path = `${SHOTS}/${name}.png`;
  await page.screenshot({ path, fullPage: opts.fullPage ?? false });
  console.log(`📸 ${name}`);
  return path;
}

async function wait(ms) {
  await new Promise(r => setTimeout(r, ms));
}

async function clickButtonWithText(text) {
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

async function scrollAndShot(name) {
  // Full page
  await shot(`${name}-full`, { fullPage: true });
  // Viewport only
  await shot(`${name}-viewport`);
}

try {
  // ========== Step 1: Homepage ==========
  console.log('\n=== STEP 1: Homepage ===');
  await page.goto(BASE, { waitUntil: 'networkidle0' });
  await wait(500);
  await shot('01-homepage');

  // ========== Step 2: Upload a file ==========
  console.log('\n=== STEP 2: Upload ===');
  writeFileSync('/tmp/test-resume.txt', `Алексей Петров
Product Manager

О себе:
Опытный специалист с большим стажем работы в IT-сфере. Умею работать в команде и решать сложные задачи.

Опыт работы:
ООО «ТехноСофт» — Менеджер продукта, 2021–2024
- Управление продуктом
- Работа с командой разработки
- Проведение встреч с заказчиками

АО «Банк Прогресс» — Бизнес-аналитик, 2019–2021
- Сбор и анализ требований
- Написание ТЗ

Навыки: MS Office, Jira, Confluence, SQL, Agile/Scrum`);

  const fileInput = await page.$('input[type="file"]');
  if (fileInput) {
    await fileInput.uploadFile('/tmp/test-resume.txt');
    console.log('File uploaded via input');
    await wait(1000);
    await shot('02-file-selected');

    // Find and click analyze button
    const clicked = await clickButtonWithText('Анализ') || await clickButtonWithText('Загрузить') || await clickButtonWithText('Проверить');
    if (clicked) {
      console.log('Clicked analyze button');
    } else {
      // Maybe auto-navigates
      console.log('No button found, waiting for navigation...');
    }
  } else {
    console.log('No file input found, trying drop zone...');
  }

  // Wait for navigation to analysis page
  await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 }).catch(() => {});
  await wait(3000);
  await shot('03-analysis-loading');

  // ========== Step 3: Diagnosis tab (should auto-load) ==========
  console.log('\n=== STEP 3: Diagnosis ===');
  // Wait for mock data to load
  await wait(5000);
  await scrollAndShot('04-diagnosis');

  // Click on an annotation to test popup
  // Find spans with cursor:pointer inside the annotated text sections
  const annotationSpan = await page.evaluateHandle(() => {
    const spans = document.querySelectorAll('span');
    for (const s of spans) {
      if (s.style.cursor === 'pointer' && s.style.borderBottom) return s;
    }
    return null;
  });
  if (annotationSpan && annotationSpan.asElement()) {
    await annotationSpan.asElement().click();
    await wait(600);
    await shot('05-annotation-popup');
    // Close it
    await annotationSpan.asElement().click();
    await wait(300);
  } else {
    console.log('No annotation span found for click');
    await shot('05-annotation-popup');
  }

  // ========== Step 4: Scores tab ==========
  console.log('\n=== STEP 4: Scores ===');
  const clickedScores = await clickButtonWithText('Оценки');
  if (clickedScores) {
    await wait(2000); // Let animations run
    await scrollAndShot('06-scores');
  } else {
    console.log('Scores tab not found yet');
    await shot('06-scores-missing');
  }

  // ========== Step 5: Roles tab ==========
  console.log('\n=== STEP 5: Roles ===');
  // Wait for roles to load
  await wait(3000);
  const clickedRoles = await clickButtonWithText('Роли');
  if (clickedRoles) {
    await wait(1500);
    await scrollAndShot('07-roles');

    // Click on a role to select it
    const selectButtons = await page.$$('button');
    for (const btn of selectButtons) {
      const txt = await btn.evaluate(el => el.textContent?.trim());
      if (txt && (txt.includes('Выбрать') || txt.includes('Product'))) {
        // Look for role select buttons
        const parentText = await btn.evaluate(el => el.closest('div')?.textContent || '');
        if (parentText.includes('Product Manager') || parentText.includes('высокое')) {
          await btn.click();
          console.log('Selected a role');
          break;
        }
      }
    }
    await wait(500);
    await shot('08-role-selected');

    // Click the "Repack" CTA button
    const ctaClicked = await clickButtonWithText('Переупаковать') || await clickButtonWithText('Перепис');
    if (ctaClicked) {
      console.log('Clicked repack CTA');
    }
  } else {
    console.log('Roles tab not available');
  }

  // ========== Step 6: Rewrite tab ==========
  console.log('\n=== STEP 6: Rewrite ===');
  await wait(5000); // Wait for rewrite to load
  const clickedRewrite = await clickButtonWithText('Переупаковка');
  if (clickedRewrite) {
    await wait(1500);
    await scrollAndShot('09-rewrite');

    // Scroll through sections
    await page.evaluate(() => window.scrollTo(0, 600));
    await wait(500);
    await shot('10-rewrite-experience');

    await page.evaluate(() => window.scrollTo(0, 1200));
    await wait(500);
    await shot('11-rewrite-skills');

    // Look for CopyAllBlock toggle
    const allElements = await page.$$('div, span');
    for (const el of allElements) {
      const text = await el.evaluate(e => e.textContent?.trim());
      if (text && text.includes('Готовый текст')) {
        await el.click();
        console.log('Opened CopyAllBlock');
        await wait(500);
        break;
      }
    }
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await wait(500);
    await shot('12-rewrite-copyall');

    // Scroll back up
    await page.evaluate(() => window.scrollTo(0, 0));
    await wait(300);
  } else {
    console.log('Rewrite tab not available');
    await shot('09-rewrite-missing');
  }

  // ========== Step 7: Verification tab ==========
  console.log('\n=== STEP 7: Verification ===');
  await wait(3000);
  const clickedVerify = await clickButtonWithText('Проверка');
  if (clickedVerify) {
    await wait(1500);
    await scrollAndShot('13-verification');
  } else {
    console.log('Verification tab not available');
  }

  // ========== Step 8: Recheck flow ==========
  console.log('\n=== STEP 8: Recheck ===');
  // Go back to rewrite, submit for recheck
  const backToRewrite = await clickButtonWithText('Переупаковка');
  if (backToRewrite) {
    await wait(500);
    // Find submit recheck button
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await wait(500);
    const recheckBtn = await clickButtonWithText('Отправить на проверку') || await clickButtonWithText('Проверить ещё') || await clickButtonWithText('Recheck');
    if (recheckBtn) {
      console.log('Submitted for recheck');
      await wait(4000);
    }
  }

  // Check if recheck tab appeared
  const clickedRecheck = await clickButtonWithText('Recheck');
  if (clickedRecheck) {
    await wait(1500);
    await scrollAndShot('14-recheck');
  } else {
    console.log('Recheck tab not available');
  }

  // ========== Final: All screenshots summary ==========
  console.log('\n=== DONE ===');
  console.log(`Screenshots saved to ${SHOTS}/`);

} catch (err) {
  console.error('Error:', err.message);
  await shot('error-state');
} finally {
  await browser.close();
}
