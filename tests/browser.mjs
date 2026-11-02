import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const baseURL = process.env.TEST_URL || 'http://127.0.0.1:4173';
const browser = await chromium.launch({ executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium', args:['--no-sandbox'] });
const output = 'test-results';
await mkdir(output, { recursive:true });
const results = [];
const key = 'mrsEnglishV3.profile';
const context = await browser.newContext({ viewport:{width:1844,height:853}, deviceScaleFactor:1 });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(String(error)));
page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
async function screen(name) { await page.waitForFunction(name => document.querySelector('#stage').dataset.screen === name, name); }
async function settled() {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].filter(im => im.getAttribute('src')).map(im => im.decode()));
  });
}
async function screenshot(name) { await settled(); await page.screenshot({ path:`${output}/${name}.png` }); }
const click = id => page.locator(`[data-action="${id}"]`).click();
try {
  await page.goto(baseURL); await screen('title'); await screenshot('title');
  await click('start'); await screen('nickname'); await screenshot('nickname');
  await page.getByRole('textbox').fill('   '); await click('confirm'); await screen('nickname');
  assert.match(await page.locator('#notice').innerText(), /入力/);
  await page.getByRole('textbox').fill('Nene'); await click('confirm'); await screen('member'); await screenshot('member');
  await click('hiroto'); await screen('member');
  await page.waitForFunction(() => document.querySelector('[data-action="hiroto"]')?.getAttribute('aria-pressed') === 'true');
  await screenshot('member-hiroto');
  await click('ryoka'); await page.waitForFunction(() => document.querySelector('[data-action="ryoka"]')?.getAttribute('aria-pressed') === 'true');
  await screenshot('member-ryoka');
  await click('back'); await screen('nickname'); assert.equal(await page.getByRole('textbox').inputValue(), 'Nene');
  await click('confirm'); await screen('member'); await click('motoki');
  await page.waitForFunction(() => document.querySelector('[data-action="motoki"]')?.getAttribute('aria-pressed') === 'true');
  await click('confirm'); await screen('background'); await screenshot('background');
  assert.equal(await page.locator('button[aria-label^="背景 "]').count(), 22);
  // Every tile updates its own photograph, preview, frame and pressed state.
  for (let i=1; i<=22; i++) {
    const id = String(i).padStart(2,'0');
    await click(`background_${id}`);
    await page.waitForFunction(id => document.querySelector(`[data-action="background_${id}"]`)?.getAttribute('aria-pressed') === 'true', id);
    const src = await page.locator('[data-layer="background_selected_preview"]').getAttribute('src');
    assert.match(src, new RegExp(`bg-${id}\\.`));
  }
  await screenshot('background-22');
  await click('background_01'); await page.waitForFunction(() => document.querySelector('[data-action="background_01"]')?.getAttribute('aria-pressed') === 'true');
  await click('confirm'); await screen('home'); await screenshot('home');
  assert.deepEqual(await page.evaluate(key => JSON.parse(localStorage.getItem(key)), key), {version:3,nickname:'Nene',memberId:'motoki',backgroundId:'bg-01',setupComplete:true});
  for (const id of ['player','menu','inventory','collection','mission','shop','ready']) {
    if (id === 'menu') { await click(id); await page.locator('.me-menu-compact[data-state="open"]').waitFor(); await page.keyboard.press('Escape'); await screen('home'); continue; }
    if (id === 'ready') { await click(id); await screen('play_ready'); await click('back'); await screen('home'); continue; }
    if (id === 'shop') {
      await click(id); await screen('shop_main'); await click('back'); await screen('home'); continue;
    }
    if (id === 'inventory') {
      await click(id); await screen('inventory_main'); await click('back'); await screen('home'); continue;
    }
    if (id === 'collection') {
      await click(id); await screen('collection_empty'); await click('back'); await screen('home'); continue;
    }
    await click(id); await screen(`placeholder/${id === 'player' ? 'profile' : id}`);
    await page.getByRole('button', {name:'ホームへ戻る'}).click(); await screen('home');
  }
  results.push('初回5画面・空欄防止・戻る時の下書き保持・3人の選択・22背景の選択・保存・7メニュー往復: PASS');
  await page.reload(); await screen('title'); await click('start'); await screen('home');
  results.push('2回目起動のタイトル→ホーム: PASS');
  await page.evaluate(key => localStorage.setItem(key, '{broken'), key);
  await page.reload(); await screen('title'); await click('start'); await screen('nickname');
  await page.getByRole('textbox').fill('   あいうえおかきくけこさしすせそ   ');
  await click('confirm'); await screen('member'); await click('confirm'); await screen('background');
  await click('background_22'); await page.waitForFunction(() => document.querySelector('[data-action="background_22"]')?.getAttribute('aria-pressed') === 'true');
  await click('confirm'); await screen('home');
  assert.equal(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).nickname, key), 'あいうえおかきくけこさし');
  await page.reload(); await screen('title'); await click('start'); await screen('home');
  assert.match(await page.locator('#scene-background').getAttribute('src'), /bg-22/);
  results.push('不正JSONからの復帰・日本語12文字制限・背景22の再読込: PASS');
  // A wholly invalid saved profile must not bypass onboarding.
  await page.evaluate(key => localStorage.setItem(key, JSON.stringify({version:3,nickname:'Nene',memberId:'invalid',backgroundId:'bg-99',setupComplete:true})), key);
  await page.reload(); await screen('title'); await click('start'); await screen('nickname');
  results.push('不正な推し・背景IDの拒否: PASS');
  await page.setViewportSize({width:844,height:390}); await screenshot('iphone-landscape');
  const rect = await page.locator('#stage').boundingBox();
  assert.ok(rect.x >= -1 && rect.y >= -1 && rect.x+rect.width <= 845 && rect.y+rect.height <= 391);
  await page.getByRole('textbox').focus();
  // Approximate the available area with a landscape keyboard (real iOS keyboard remains a device check).
  await page.setViewportSize({width:844,height:180});
  await page.waitForFunction(() => {
    const r = document.querySelector('[data-action="confirm"]').getBoundingClientRect();
    return r.y >= 0 && r.bottom <= 180;
  });
  const confirm = await page.locator('[data-action="confirm"]').boundingBox();
  assert.ok(confirm.y >= 0 && confirm.y + confirm.height <= 180);
  await screenshot('keyboard-available-area');
  await page.setViewportSize({width:390,height:844}); assert.equal(await page.locator('#rotate-notice').isVisible(), true);
  results.push('844×390の均一縮小・狭い表示領域での決定操作・縦画面案内: PASS');
  await page.setViewportSize({width:844,height:390});
  // Wait for production's complete offline installation, then navigate while disconnected.
  await page.evaluate(async () => { await navigator.serviceWorker.ready; if (!navigator.serviceWorker.controller) await new Promise(resolve => navigator.serviceWorker.addEventListener('controllerchange', resolve, {once:true})); });
  await context.setOffline(true);
  await page.reload(); await screen('title'); await click('start'); await screen('nickname');
  await click('confirm'); await screen('member'); await click('confirm'); await screen('background');
  await click('background_22'); await page.waitForFunction(() => document.querySelector('[data-action="background_22"]')?.getAttribute('aria-pressed') === 'true');
  await click('confirm'); await screen('home'); await settled();
  results.push('オフライン再読込・初回設定・背景22表示: PASS');
  assert.deepEqual(errors, []);
  // Browser storage denied: keep current-session settings and visibly inform the player.
  const denied = await browser.newContext({viewport:{width:844,height:390}});
  await denied.addInitScript(() => { Storage.prototype.getItem = Storage.prototype.setItem = () => { throw new DOMException('blocked','SecurityError'); }; });
  const p = await denied.newPage(); await p.goto(baseURL);
  await p.locator('[data-action="start"]').click();
  for (const next of ['member', 'background', 'home']) {
    await p.locator('[data-action="confirm"]').click();
    await p.waitForFunction(next => document.querySelector('#stage').dataset.screen === next, next);
  }
  await p.waitForFunction(() => document.querySelector('#stage').dataset.screen === 'home');
  assert.match(await p.locator('#notice').innerText(), /保存できません/);
  await denied.close(); results.push('localStorage拒否時のメモリ保持と通知: PASS');
  await writeFile(`${output}/results.json`, JSON.stringify({results, errors}, null, 2));
  console.log(results.join('\n'));
} finally { await browser.close(); }
