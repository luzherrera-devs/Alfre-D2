// Prueba de regresión del comunicador (ver DEFINITION_OF_DONE.md).
// Uso:  node tests/regresion.js [carpeta_para_capturas]
// Requiere Playwright con Chromium. Termina con código 0 y "OK" si todo pasa.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const APP = 'file://' + path.resolve(__dirname, '..', 'web', 'index.html');
const SHOTS = process.argv[2] || null;
const fails = [];
function check(cond, msg) { console.log((cond ? '  ok   ' : '  FALLA ') + msg); if (!cond) fails.push(msg); }

(async () => {
  if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(APP);

  const shot = async name => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, name + '.png') }); };
  const focused = () => page.evaluate(() => { const a = document.activeElement; return a && a.dataset ? a.dataset.k : null; });
  const state = () => page.evaluate(() => window.__comunicador.state());
  const focus = k => page.evaluate(k => {
    const b = [...document.querySelectorAll('button,.nav')].find(x => x.dataset.k === k && x.getBoundingClientRect().width > 0);
    if (!b) throw new Error('No existe el botón ' + k); b.focus();
  }, k);
  const press = async key => { await page.keyboard.press(key); await page.waitForTimeout(420); };

  // Recorre con flechas desde el foco actual y verifica que se llega a todos los botones visibles.
  async function allReachable(label) {
    const all = await page.evaluate(() => window.__comunicador.focusables().map(b => b.dataset.k));
    const start = await focused();
    const seen = new Set([start]), queue = [start];
    while (queue.length) {
      const k = queue.shift();
      for (const d of ['up', 'down', 'left', 'right']) {
        await focus(k);
        await page.evaluate(d => window.onRemoteKey(d), d);
        await page.waitForTimeout(255);
        const n = await focused();
        if (n && !seen.has(n)) { seen.add(n); queue.push(n); }
      }
    }
    const missing = all.filter(k => !seen.has(k));
    check(missing.length === 0, `${label}: se llega con flechas a los ${all.length} botones` + (missing.length ? ` (faltan: ${missing})` : ''));
    await focus(start);
  }

  console.log('Tele / control remoto (horizontal 16:9)');
  check(await focused() === 'pred-0', 'al arrancar, el foco está en la primera predicción');
  await shot('01-inicio');
  await allReachable('pantalla de letras (grilla)');

  await focus('let-0'); await press('Enter');
  let s = await state();
  check(s.word.length === 1, 'OK sobre una letra la agrega al instante');
  check(await focused() === 'let-0', 'después de una letra, el foco va a la letra más probable');
  await page.keyboard.press('Enter'); await page.waitForTimeout(100); await page.keyboard.press('Enter'); await page.waitForTimeout(420);
  check((await state()).word.length === 2, 'un segundo OK a menos de 400 ms se ignora');
  await shot('02-circulo');
  await allReachable('pantalla de letras (círculo)');

  await press('Backspace');
  check((await state()).word.length === 1, 'Atrás/Backspace borra la última letra');

  await focus('pred-0'); await press('Enter');
  s = await state();
  check(s.word === '' && s.text.trim().length > 0, 'OK sobre una predicción agrega la palabra');
  const textAfterPred = s.text;
  await press('Backspace');
  check((await state()).text !== textAfterPred, 'Atrás borra la palabra predicha entera');

  await focus('bar-phr'); await press('Enter');
  check(await focused() === 'main-0', 'al abrir Frases, el foco va a la primera frase');
  await shot('03-frases');
  await allReachable('pantalla de frases');
  const before = (await state()).text;
  await focus('main-1'); await press('Enter');
  check((await state()).text.length > before.length, 'OK sobre una frase la agrega');
  await press('Backspace');
  check((await state()).text === before, 'Atrás borra la frase entera');

  await focus('bar-words'); await press('Enter');
  await shot('04-palabras');
  await allReachable('pantalla de palabras');
  await focus('main-0'); await press('Enter');

  await focus('num'); await press('Enter');
  check((await state()).screen === 'num', '123 abre los números');
  await press('Enter');
  check(/1$/.test((await state()).word), 'OK sobre un número lo agrega');
  await shot('05-numeros');
  await allReachable('pantalla de números');

  await focus('main-0');
  let moves = 0, last = await focused();
  for (let i = 0; i < 20; i++) {
    await page.evaluate(() => window.onRemoteKey('down', true)); await page.waitForTimeout(30);
    const f = await focused(); if (f !== last) { moves++; last = f; }
  }
  check(moves <= 4, `flecha mantenida: como máximo 1 paso cada 250 ms (${moves} pasos en ~700 ms)`);

  await focus('bar-show'); await press('Enter');
  check(await focused() === 'ov-0', 'Mostrar abre el mensaje en grande con foco en "Leer en voz alta"');
  await shot('06-grande');
  const t0 = (await state()).text;
  await press('Backspace');
  check(!(await page.evaluate(() => document.getElementById('ov').classList.contains('on'))) && (await state()).text === t0,
    'Atrás con el mensaje en grande lo cierra sin borrar');

  const full = await state();
  await focus('trash'); await press('Enter'); await press('Enter');
  check((await state()).text === '' && (await state()).word === '', 'TODO (dos OK) borra todo');
  await press('Backspace');
  s = await state();
  check(s.text === full.text && s.word === full.word, 'Atrás después de TODO recupera el mensaje');

  console.log('Toque / mouse');
  await page.mouse.click(5, 5);
  const box = await page.evaluate(() => { const r = [...document.querySelectorAll('button')].find(x => x.dataset.k === 'main-0').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  const w0 = (await state()).word;
  await page.mouse.click(box.x, box.y); await page.waitForTimeout(350);
  check((await state()).word.length === w0.length + 1, 'un clic sobre un botón funciona');
  check(!(await page.evaluate(() => document.documentElement.classList.contains('kb'))), 'con mouse/toque no se muestra el recuadro de foco');
  await press('ArrowLeft');
  check(await page.evaluate(() => document.documentElement.classList.contains('kb')), 'al volver a usar flechas, el foco aparece de nuevo');

  console.log('Tamaños');
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.waitForTimeout(200);
  await shot('07-1080p');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth || document.documentElement.scrollHeight > innerHeight);
  check(!overflow, 'en 1920×1080 no hay desbordes ni barras de desplazamiento');

  check(errors.length === 0, 'sin errores de JavaScript' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await browser.close();
  if (fails.length) { console.log(`\n${fails.length} FALLA(S)`); process.exit(1); }
  console.log('\nOK');
})().catch(e => { console.error(e); process.exit(1); });
