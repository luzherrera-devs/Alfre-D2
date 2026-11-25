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

  // ===== Plataforma: celular / tablet en vertical (issue #1) =====
  // Sección nueva: no modifica las verificaciones anteriores.
  for (const [w, h, name] of [[390, 844, 'celular'], [360, 640, 'celular chico'], [800, 1280, 'tablet']]) {
    console.log(`Vertical: ${name} ${w}×${h}`);
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true });
    const pv = await ctx.newPage();
    pv.on('pageerror', e => errors.push(e.message));
    await pv.goto(APP);
    const vstate = () => pv.evaluate(() => window.__comunicador.state());
    const vfocused = () => pv.evaluate(() => document.activeElement && document.activeElement.dataset.k);
    const vfocus = k => pv.evaluate(k => [...document.querySelectorAll('button,.nav')].find(x => x.dataset.k === k && x.getBoundingClientRect().width > 0).focus(), k);
    const vtap = async k => { await pv.tap(`[data-k="${k}"]`); await pv.waitForTimeout(350); };
    // Todo dentro de la pantalla y sin botones encimados.
    async function layoutOk(label) {
      const r = await pv.evaluate(() => {
        const vw = innerWidth, vh = innerHeight;
        const bs = window.__comunicador.focusables().map(b => {
          const q = b.getBoundingClientRect(), s = b === document.activeElement ? 1.07 : 1;
          const cx = (q.left + q.right) / 2, cy = (q.top + q.bottom) / 2, hw = q.width / s / 2, hh = q.height / s / 2;
          return { k: b.dataset.k, l: cx - hw, r: cx + hw, t: cy - hh, b: cy + hh, round: b.classList.contains('rl'), cx, cy, rad: hw };
        });
        const out = bs.filter(q => q.l < -1 || q.t < -1 || q.r > vw + 1 || q.b > vh + 1).map(q => q.k);
        const over = [];
        for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) {
          const a = bs[i], b = bs[j];
          const ix = Math.min(a.r, b.r) - Math.max(a.l, b.l), iy = Math.min(a.b, b.b) - Math.max(a.t, b.t);
          const hit = (a.round && b.round)   // letras redondas del círculo: se mide como círculo
            ? Math.hypot(a.cx - b.cx, a.cy - b.cy) < a.rad + b.rad - 2
            : ix > 2 && iy > 2;
          if (hit) over.push(a.k + '/' + b.k);
        }
        const scroll = document.documentElement.scrollWidth > vw || document.documentElement.scrollHeight > vh;
        return { out, over, scroll };
      });
      check(!r.scroll && r.out.length === 0, `${label}: todo entra en la pantalla` + (r.out.length ? ` (afuera: ${r.out})` : ''));
      check(r.over.length === 0, `${label}: ningún botón encimado` + (r.over.length ? ` (${r.over})` : ''));
    }
    async function vReachable(label) {
      const all = await pv.evaluate(() => window.__comunicador.focusables().map(b => b.dataset.k));
      const start = all[0], seen = new Set([start]), queue = [start];
      while (queue.length) {
        const k = queue.shift();
        for (const d of ['up', 'down', 'left', 'right']) {
          await vfocus(k); await pv.evaluate(d => window.onRemoteKey(d), d); await pv.waitForTimeout(255);
          const n = await vfocused(); if (n && !seen.has(n)) { seen.add(n); queue.push(n); }
        }
      }
      const missing = all.filter(k => !seen.has(k));
      check(missing.length === 0, `${label}: se llega con flechas a todos los botones` + (missing.length ? ` (faltan: ${missing})` : ''));
    }
    const fullCheck = name === 'celular';   // el recorrido con flechas completo, solo en un tamaño (es lento)

    check(await pv.evaluate(() => getComputedStyle(document.querySelector('.top')).gridTemplateColumns.split(' ').length === 1),
      'usa la disposición vertical (en columna)');
    await layoutOk('letras (grilla)');
    if (fullCheck) await vReachable('letras (grilla)');
    if (SHOTS) await pv.screenshot({ path: path.join(SHOTS, `v-${w}x${h}-1.png`) });
    await vtap('let-0');
    check((await vstate()).word.length === 1, 'tocar una letra la agrega');
    const letterPx = await pv.evaluate(() => parseFloat(getComputedStyle(document.querySelector('[data-k="let-0"]')).fontSize));
    check(letterPx >= h * 0.04, `letras grandes (${Math.round(letterPx)}px ≥ 4vh)`);
    await layoutOk('letras (círculo)');
    if (fullCheck) await vReachable('letras (círculo)');
    if (SHOTS) await pv.screenshot({ path: path.join(SHOTS, `v-${w}x${h}-2.png`) });
    await vtap('pred-0');
    check((await vstate()).word === '' && (await vstate()).text.length > 0, 'tocar una predicción la agrega');
    await vtap('bar-phr'); await layoutOk('frases'); if (fullCheck) await vReachable('frases');
    if (SHOTS) await pv.screenshot({ path: path.join(SHOTS, `v-${w}x${h}-3.png`) });
    await vtap('bar-words'); await layoutOk('palabras'); if (fullCheck) await vReachable('palabras');
    await vtap('volver'); await vtap('num'); await layoutOk('números'); if (fullCheck) await vReachable('números');
    await vtap('main-0');
    await vtap('bar-show'); await layoutOk('mensaje en grande');
    await vtap('ov-1');

    // Girar el celular: pasa a la disposición horizontal sin perder el mensaje, y vuelve.
    const msg = await vstate();
    await pv.setViewportSize({ width: h, height: w }); await pv.waitForTimeout(200);
    // Ajustada por el issue #3 (cambio pedido explícitamente): en un celular, el horizontal ahora puede ser
    // el diseño de tele o el de celular en horizontal; lo que importa es que deje el diseño vertical.
    check(await pv.evaluate(() => getComputedStyle(document.querySelector('.top')).gridTemplateColumns.split(' ').length !== 1),
      'al girar a horizontal usa la disposición horizontal');
    await pv.setViewportSize({ width: w, height: h }); await pv.waitForTimeout(200);
    const after = await vstate();
    check(after.text === msg.text && after.word === msg.word, 'al girar no se pierde el mensaje');
    await ctx.close();
  }

  // ===== Plataforma: celular en horizontal (issue #3) =====
  // Sección nueva: no modifica las verificaciones anteriores.
  const isPhoneLandscape = pg => pg.evaluate(() => getComputedStyle(document.getElementById('cur')).display === 'none'
    && getComputedStyle(document.querySelector('.top')).display === 'contents');
  console.log('Tele: no usa el diseño de celular en horizontal');
  for (const [w, h] of [[960, 540], [1280, 720], [1920, 1080], [640, 360]]) {
    const pt = await browser.newPage({ viewport: { width: w, height: h } });
    await pt.goto(APP);
    check(!(await isPhoneLandscape(pt)), `tele ${w}×${h} (16:9) mantiene su diseño`);
    await pt.close();
  }
  for (const [w, h, name] of [[844, 390, 'celular'], [915, 412, 'celular grande'], [760, 300, 'celular con barras del navegador']]) {
    console.log(`Horizontal: ${name} ${w}×${h}`);
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: true });
    const ph = await ctx.newPage();
    ph.on('pageerror', e => errors.push(e.message));
    await ph.goto(APP);
    const hstate = () => ph.evaluate(() => window.__comunicador.state());
    const hfocused = () => ph.evaluate(() => document.activeElement && document.activeElement.dataset.k);
    const hfocus = k => ph.evaluate(k => [...document.querySelectorAll('button,.nav')].find(x => x.dataset.k === k && x.getBoundingClientRect().width > 0).focus(), k);
    const htap = async k => { await ph.tap(`[data-k="${k}"]`); await ph.waitForTimeout(350); };
    async function hLayoutOk(label) {
      const r = await ph.evaluate(() => {
        const vw = innerWidth, vh = innerHeight;
        const bs = window.__comunicador.focusables().map(b => {
          const q = b.getBoundingClientRect(), s = b === document.activeElement ? 1.07 : 1;
          const cx = (q.left + q.right) / 2, cy = (q.top + q.bottom) / 2, hw = q.width / s / 2, hh = q.height / s / 2;
          return { k: b.dataset.k, l: cx - hw, r: cx + hw, t: cy - hh, b: cy + hh, round: b.classList.contains('rl'), cx, cy, rad: hw };
        });
        const out = bs.filter(q => q.l < -1 || q.t < -1 || q.r > vw + 1 || q.b > vh + 1).map(q => q.k);
        const over = [];
        for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) {
          const a = bs[i], b = bs[j];
          const ix = Math.min(a.r, b.r) - Math.max(a.l, b.l), iy = Math.min(a.b, b.b) - Math.max(a.t, b.t);
          const hit = (a.round && b.round) ? Math.hypot(a.cx - b.cx, a.cy - b.cy) < a.rad + b.rad - 2 : ix > 2 && iy > 2;
          if (hit) over.push(a.k + '/' + b.k);
        }
        const scroll = document.documentElement.scrollWidth > vw || document.documentElement.scrollHeight > vh;
        return { out, over, scroll };
      });
      check(!r.scroll && r.out.length === 0, `${label}: todo entra en la pantalla` + (r.out.length ? ` (afuera: ${r.out})` : ''));
      check(r.over.length === 0, `${label}: ningún botón encimado` + (r.over.length ? ` (${r.over})` : ''));
    }
    async function hReachable(label) {
      const all = await ph.evaluate(() => window.__comunicador.focusables().map(b => b.dataset.k));
      const start = all[0], seen = new Set([start]), queue = [start];
      while (queue.length) {
        const k = queue.shift();
        for (const d of ['up', 'down', 'left', 'right']) {
          await hfocus(k); await ph.evaluate(d => window.onRemoteKey(d), d); await ph.waitForTimeout(255);
          const n = await hfocused(); if (n && !seen.has(n)) { seen.add(n); queue.push(n); }
        }
      }
      const missing = all.filter(k => !seen.has(k));
      check(missing.length === 0, `${label}: se llega con flechas a todos los botones` + (missing.length ? ` (faltan: ${missing})` : ''));
    }
    const fullCheck = name === 'celular';

    check(await isPhoneLandscape(ph), 'usa el diseño de celular en horizontal');
    await hLayoutOk('letras (grilla)');
    if (fullCheck) await hReachable('letras (grilla)');
    const ringPx = await ph.evaluate(() => document.querySelector('.ring').getBoundingClientRect().height);
    check(ringPx >= h * 0.85, `las letras usan casi todo el alto (${Math.round(ringPx)}px de ${h}px)`);
    if (SHOTS) await ph.screenshot({ path: path.join(SHOTS, `h-${w}x${h}-1.png`) });
    await htap('let-0');
    check((await hstate()).word.length === 1, 'tocar una letra la agrega');
    await hLayoutOk('letras (círculo)');
    if (fullCheck) await hReachable('letras (círculo)');
    if (fullCheck) {
      // BORRAR queda a un paso de las letras (a la izquierda del círculo).
      await hfocus('let-4'); await ph.evaluate(() => window.onRemoteKey('left')); await ph.waitForTimeout(255);
      const fromLetters = await hfocused();
      check(!/^let-|^more$|^num$|^space$/.test(fromLetters), `desde las letras, una flecha a la izquierda sale a la columna de botones (${fromLetters})`);
    }
    await htap('pred-0');
    check((await hstate()).word === '' && (await hstate()).text.length > 0, 'tocar una predicción la agrega');
    await htap('del');
    check((await hstate()).text === '', 'tocar BORRAR quita la palabra');
    await htap('bar-phr'); await hLayoutOk('frases'); if (fullCheck) await hReachable('frases');
    if (SHOTS) await ph.screenshot({ path: path.join(SHOTS, `h-${w}x${h}-3.png`) });
    await htap('bar-words'); await hLayoutOk('palabras'); if (fullCheck) await hReachable('palabras');
    await htap('volver'); await htap('num'); await hLayoutOk('números'); if (fullCheck) await hReachable('números');
    await htap('main-0');
    await htap('bar-show'); await hLayoutOk('mensaje en grande');
    await htap('ov-1');
    const msg = await hstate();
    await ph.setViewportSize({ width: h, height: w }); await ph.waitForTimeout(200);
    check(!(await isPhoneLandscape(ph)), 'al girar a vertical usa el diseño vertical');
    await ph.setViewportSize({ width: w, height: h }); await ph.waitForTimeout(200);
    const after = await hstate();
    check(after.text === msg.text && after.word === msg.word && await isPhoneLandscape(ph), 'al girar y volver no se pierde el mensaje');
    await ctx.close();
  }

  check(errors.length === 0, 'sin errores de JavaScript' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await browser.close();
  if (fails.length) { console.log(`\n${fails.length} FALLA(S)`); process.exit(1); }
  console.log('\nOK');
})().catch(e => { console.error(e); process.exit(1); });
