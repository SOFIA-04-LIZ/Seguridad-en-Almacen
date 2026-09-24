'use strict';
(() => {
  const $ = (s) => document.querySelector(s),
    canvas = $('#game'),
    ctx = canvas.getContext('2d');
  const H = 540,
    FLOOR = 446,
    WORLD = 8000,
    keys = { left: false, right: false, jump: false };
  let W = 1200,
    viewHeight = H;
  const baseStorage = [
    { x: 410, y: 391, w: 105, h: 55 },
    { x: 565, y: 350, w: 110, h: 96 },
    { x: 1360, y: 392, w: 105, h: 54 },
    { x: 1510, y: 345, w: 110, h: 101 },
    { x: 2200, y: 390, w: 110, h: 56 },
  ];
  const basePallets = [
    { x: 1230, brand: 'FLYING FISH', color: '#4b9cb1' },
    { x: 2500, brand: 'STELLA', color: '#aa4237' },
  ];
  const equipment = [
    ['helmet', '⛑️', 'Casco de seguridad', true],
    ['vest', '🦺', 'Chaleco de alta visibilidad', true],
    ['boots', '🥾', 'Botas de seguridad', true],
    ['sandals', '🩴', 'Sandalias', false],
    ['cap', '🧢', 'Gorra', false],
    ['headphones', '🎧', 'Audífonos de música', false],
  ];
  const incidentScenarios = window.WAREHOUSE_SCENARIOS.equipment;
  const storage = [],
    crossings = [],
    pallets = [],
    hazards = [],
    workers = [],
    stairs = [],
    noJumpZones = [],
    focusTokens = [],
    coins = [];
  const learnedReports = new Set();
  const previousInventory = { STELLA: 0, 'FLYING FISH': 0 };
  let railHeld = false;
  let sector = 1,
    completedDistance = 0,
    sectorProgress = 0,
    totalReports = 0,
    totalPallets = 0,
    totalFish = 0,
    incorrectPallets = 0,
    totalCoins = 0,
    coinsTowardLife = 0,
    completedStairs = 0,
    totalActs = 0;
  const MAX_LIVES = 5;
  const previousLocations = new Map();
  const previousCrossings = new Map(),
    previousStairs = new Map();
  let previousStairRoute = '',
    previousStairSlots = '';
  function shuffle(items) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
  function variedPosition(slot, previous, range) {
    let position;
    for (let i = 0; i < 20; i++) {
      position = slot + Math.floor(Math.random() * (range * 2 + 1)) - range;
      if (
        previous.get(slot) === undefined ||
        Math.abs(position - previous.get(slot)) >= 50
      )
        break;
    }
    if (
      previous.get(slot) !== undefined &&
      Math.abs(position - previous.get(slot)) < 50
    )
      position = slot + (previous.get(slot) > slot ? -range : range);
    previous.set(slot, position);
    return position;
  }
  function randomLocations() {
    // Observation bays stay clear of moving equipment, stairs and the inventory pallets.
    const bays = [];
    for (let x = 470; x < WORLD - 220; x += 190) {
      if (crossings.some((c) => x + 85 >= c.x - stopWidth() && x - 85 <= c.x + c.w))
        continue;
      if (stairs.some((s) => x + 85 >= s.x && x - 85 <= s.x + stairWidth(s))) continue;
      if (pallets.some((p) => x + 95 >= p.x && x - 95 <= p.x + 106)) continue;
      bays.push(x);
    }
    const ids = [
      ...window.WAREHOUSE_SCENARIOS.hazards.map((h) => h.id),
      ...window.WAREHOUSE_SCENARIOS.acts
        .filter((a) => a.id !== 'noHandrail')
        .map((a) => a.id),
    ];
    function assign(index, available, result) {
      if (index === ids.length) return result;
      for (const bay of shuffle(available)) {
        if (previousLocations.get(ids[index]) === bay) continue;
        const next = assign(
          index + 1,
          available.filter((x) => x !== bay),
          [...result, bay],
        );
        if (next) return next;
      }
      return null;
    }
    const chosen = assign(0, bays, []),
      locations = new Map();
    if (!chosen)
      throw new Error('No hay espacio para todas las observaciones del sector');
    ids.forEach((id, i) => {
      previousLocations.set(id, chosen[i]);
      locations.set(id, chosen[i] + Math.floor(Math.random() * 17) - 8);
    });
    return locations;
  }
  function buildInventory() {
    if (sector === 1) {
      pallets.splice(0, pallets.length, ...basePallets.map(p => ({ ...p, registered: false })));
      return;
    }
    const count = Math.min(4, sector);
    const brands = [
      ...Array.from({ length: Math.ceil(count / 2) }, () => ({ brand: 'STELLA', color: '#aa4237' })),
      ...Array.from({ length: Math.floor(count / 2) }, () => ({ brand: 'FLYING FISH', color: '#4b9cb1' })),
      ...Array.from({ length: count }, (_, i) => ({ brand: i % 2 ? 'VICTORIA' : 'CORONA', color: i % 2 ? '#aa4237' : '#4b9cb1' })),
    ];
    const mixed = shuffle(brands);
    const spacing = Math.max(106, 118 - sector * 2);
    pallets.splice(0, pallets.length, ...mixed.map((p, i) => ({
      ...p, x: (i < count ? 1140 : 2180) + (i % count) * spacing, registered: false,
    })));
  }
  function inventoryReach() { return sector === 1 ? 115 : Math.max(36, 78 - sector * 6); }
  function buildSector() {
    buildInventory();
    stairs.length = 0;
    const count = sector === 1 ? 1 : 2,
      steps = Math.min(12, 8 + sector),
      tread = Math.max(19, 27 - sector);
    const stairSlots = [3250, 4200, 5150];
    let selected = shuffle(stairSlots)
      .slice(0, count)
      .sort((a, b) => a - b);
    if (selected.join(',') === previousStairSlots)
      selected = shuffle(stairSlots.filter((x) => !selected.includes(x)))
        .slice(0, 1)
        .concat(selected.slice(0, count - 1))
        .sort((a, b) => a - b);
    previousStairSlots = selected.join(',');
    for (const slot of selected)
      stairs.push({
        x: variedPosition(slot, previousStairs, 55),
        steps,
        tread,
        rise: 15,
        deck: 200,
        completed: false,
        visitedTop: false,
      });
    stairs.sort((a, b) => a.x - b.x);
    const crossingSlots =
      sector === 1
        ? shuffle([900, 1920, 2850]).slice(0, 2)
        : shuffle([900, 1920, 2850, 6300]).slice(0, sector >= 4 ? 4 : 3);
    crossings.splice(
      0,
      crossings.length,
      ...crossingSlots
        .map((slot) => ({
          x: variedPosition(
            slot,
            previousCrossings,
            slot === 900 ? 35 : slot === 2850 ? 90 : 100,
          ),
          w: slot === 900 || slot === 1920 ? 170 : 140,
          hold: 0,
          cleared: false,
          coinTrap: false,
        }))
        .sort((a, b) => a.x - b.x),
    );
    const trapCrossings = crossings.slice(0, 2);
    const locations = randomLocations();
    hazards.splice(
      0,
      hazards.length,
      ...window.WAREHOUSE_SCENARIOS.hazards.map((h) => ({
        ...h,
        x: locations.get(h.id),
        reported: false,
        missed: false,
      })),
    );
    storage.splice(
      0,
      storage.length,
      ...baseStorage
        .filter(
          (p) =>
            !pallets.some((item) => item.x + 114 > p.x && item.x < p.x + p.w) &&
            ![...locations.values()].some((x) => x + 85 > p.x && x - 85 < p.x + p.w) &&
            !crossings.some(
              (c) => p.x + p.w > c.x - stopWidth() - 30 && p.x < c.x + c.w + 30,
            ) &&
            !stairs.some((s) => p.x + p.w > s.x - 30 && p.x < s.x + stairWidth(s) + 30),
        )
        .map((p) => ({ ...p })),
    );
    const routes = stairs.flatMap((s, i) =>
      ['up', 'down'].map((side) => ({ s, key: i + ':' + side, side })),
    );
    const route = shuffle(routes.filter((r) => r.key !== previousStairRoute))[0];
    previousStairRoute = route.key;
    const run = route.s.steps * route.s.tread;
    workers.splice(
      0,
      workers.length,
      ...window.WAREHOUSE_SCENARIOS.acts.map((a) => {
        const ground = a.id !== 'noHandrail';
        const stairSide = route.side;
        const min = ground
          ? locations.get(a.id) - 25
          : stairSide === 'up'
            ? route.s.x + 25
            : route.s.x + run + route.s.deck + 15;
        const max = ground
          ? locations.get(a.id) + 25
          : stairSide === 'up'
            ? route.s.x + run - 15
            : route.s.x + stairWidth(route.s) - 25;
        const x = min + Math.random() * (max - min);
        return {
          ...a,
          type: 'act',
          onStairs: !ground,
          reported: false,
          missed: false,
          min,
          max,
          x,
          feet: ground ? FLOOR : floorAt(x),
          direction: Math.random() < 0.5 ? -1 : 1,
          phase: Math.random() * Math.PI * 2,
        };
      }),
    );
    noJumpZones.splice(
      0,
      noJumpZones.length,
      ...storage.map((p) => ({ x: p.x - 8, w: p.w + 16 })),
      ...pallets.map((p) => ({ x: p.x - 10, w: 124 })),
      ...hazards.map((h) => ({ x: h.x - 48, w: 96 })),
    );
    const tokenSpots = [];
    for (let x = 500; x < WORLD - 180; x += 150)
      if (
        noJumpZones.every((z) => x < z.x - 70 || x > z.x + z.w + 70) &&
        crossings.every((c) => x < c.x - stopWidth() - 70 || x > c.x + c.w + 70) &&
        stairs.every((st) => x < st.x - 70 || x > st.x + stairWidth(st) + 70) &&
        workers.every((w) => w.onStairs || x < w.min - 90 || x > w.max + 90)
      )
        tokenSpots.push(x);
    focusTokens.splice(
      0,
      focusTokens.length,
      ...shuffle(tokenSpots)
        .slice(0, Math.min(3, tokenSpots.length))
        .map((x) => ({ x, y: 350, collected: false })),
    );
    const safeSpots = [];
    for (let x = 190; x < WORLD - 90; x += 165) {
      if (
        noJumpZones.some((z) => x > z.x - 55 && x < z.x + z.w + 55) ||
        crossings.some((c) => x > c.x - stopWidth() - 45 && x < c.x + c.w + 45) ||
        stairs.some((st) => x > st.x - 50 && x < st.x + stairWidth(st) + 50) ||
        workers.some((w) => !w.onStairs && x > w.min - 65 && x < w.max + 65)
      )
        continue;
      safeSpots.push(x);
    }
    coins.splice(
      0,
      coins.length,
      ...safeSpots.map((x) => ({ x, y: 400, collected: false, risky: false })),
      ...trapCrossings.map((c) => ({
        x: c.x + c.w / 2,
        y: 400,
        collected: false,
        risky: true,
        crossing: c,
        active: false,
        expired: false,
        timeLeft: 1,
      })),
    );
  }
  function stairWidth(s) {
    return s.steps * s.tread * 2 + s.deck;
  }
  function stairAt(x) {
    return stairs.find((s) => x >= s.x && x <= s.x + stairWidth(s));
  }
  function floorAt(x) {
    const s = stairAt(x);
    if (!s) return FLOOR;
    const offset = x - s.x,
      run = s.steps * s.tread;
    const n =
      offset < run
        ? Math.floor(offset / s.tread) + 1
        : offset < run + s.deck
          ? s.steps
          : Math.max(0, Math.ceil((stairWidth(s) - offset) / s.tread));
    return FLOOR - n * s.rise;
  }
  function advanceSector() {
    for (const p of pallets) if (p.brand in previousInventory) previousInventory[p.brand]++;
    railHeld = false;
    completedDistance += sectorProgress;
    sectorProgress = 0;
    sector++;
    found = false;
    fishFound = false;
    buildSector();
    player.x = 30;
    player.y = FLOOR - player.h;
    player.vx = player.vy = 0;
    player.ground = true;
    camera = 0;
    hud();
    toast('Sector ' + sector + ' · ¡El ritmo aumenta!', 2);
  }

  let worn = new Set(),
    incident = null,
    triggered = new Set();

  let autoRun = false,
    streak = 0,
    startDelay = 0;
  let state = 'ready',
    player,
    lives = 3,
    found = false,
    fishFound = false,
    epp = false,
    camera = 0,
    time = 0,
    last = 0,
    toastTime = 0,
    deathTime = 0,
    crash = null;
  const speedLever = $('#speed-lever');
  let leverPointer = null;
  function setLever(value) {
    const width = speedLever.getBoundingClientRect().width;
    const travel = Math.max(0, width / 2 - 22);
    speedLever.style.setProperty('--lever-offset', `${value * travel}px`);
    const direction = value < -0.25 ? -1 : value > 0.25 ? 1 : 0;
    speedLever.setAttribute('aria-valuenow', String(direction));
    speedLever.setAttribute(
      'aria-valuetext',
      direction < 0 ? 'Frenar' : direction > 0 ? 'Acelerar' : 'Avance normal',
    );
    keys.left = state === 'playing' && direction < 0;
    keys.right = state === 'playing' && direction > 0;
  }
  function resetLever() {
    leverPointer = null;
    setLever(0);
  }
  function clearKeys() {
    resetLever();
    keys.jump = false;
  }
  function toast(message, seconds = 4) {
    $('#toast').textContent = message;
    $('#toast').classList.add('visible');
    toastTime = seconds;
  }
  function hud() {
    $('#lives').textContent = '♥ '.repeat(lives) + '♡ '.repeat(MAX_LIVES - lives);
    $('#lives').setAttribute('aria-label', lives + ' vidas');
    $('#life-number').textContent = lives + '/' + MAX_LIVES;
    $('#count').textContent = totalPallets;
    $('#fish-count').textContent = totalFish;
    $('#coin-count').textContent = totalCoins;
    $('#sector').textContent = sector;
    epp =
      worn.has('helmet') &&
      worn.has('vest') &&
      worn.has('boots') &&
      !worn.has('headphones') &&
      !worn.has('cap') &&
      !worn.has('sandals');
    $('#hazard-count').textContent = totalReports;
    $('#act-count').textContent = totalActs;
    $('#streak').textContent = streak;
  }
  function reset() {
    learnedReports.clear();
    previousInventory.STELLA = previousInventory['FLYING FISH'] = 0;
    railHeld = false;
    sector = 1;
    completedDistance = sectorProgress = 0;
    totalReports =
      totalPallets =
      totalFish =
      incorrectPallets =
      totalCoins =
      coinsTowardLife =
      completedStairs =
      totalActs =
        0;
    buildSector();
    worn = new Set();
    triggered = new Set();
    incident = null;
    hazards.forEach((h) => (h.reported = false));
    lives = 3;
    streak = 0;
    autoRun = false;
    startDelay = 0;
    found = fishFound = epp = false;
    camera = 0;
    crash = null;
    deathTime = 0;
    player = {
      x: 110,
      y: FLOOR - 66,
      w: 32,
      h: 66,
      vx: 0,
      vy: 0,
      ground: true,
      face: 1,
    };
    crossings.forEach((c) => {
      c.cleared = false;
      c.hold = 0;
    });
    clearKeys();
    $('#toast').classList.remove('visible');
    $('#zone').textContent = '● ACCESO AL ALMACÉN';
    hud();
    showWelcome();
  }
  function showWelcome() {
    state = 'ready';
    $('#pause').disabled = true;
    $('#overlay').classList.remove('hidden');
    $('#overlay').classList.add('ready');
    $('#modal').innerHTML =
      '<p class="eyebrow">INICIO DEL RECORRIDO</p><h2>¿Ya quieres iniciar el juego?</h2><p>Primero elegirás tu EPP. Después comenzará el recorrido por el almacén.</p><button class="primary" id="start-game">Sí, elegir mi EPP →</button>';
    $('#start-game').onclick = showEquipment;
  }
  function showEquipment() {
    state = 'equipment';
    $('#pause').disabled = true;
    $('#overlay').classList.remove('ready');
    $('#overlay').classList.remove('hidden');
    document
      .querySelector('.game-shell')
      .scrollIntoView({ block: 'start', behavior: 'instant' });
    $('#modal').innerHTML =
      '<div class="epp-heading"><p class="eyebrow">ANTES DE ENTRAR / 01</p><h2>La seguridad empieza contigo.</h2><p>Elige cómo entrar al almacén. <b>Jugarás con lo que selecciones</b>, aunque sea incorrecto. Las decisiones inseguras activan incidentes, restan una vida y explican qué debes corregir.</p></div><div class="equipment"></div><p class="feedback" role="status"></p><button class="primary" id="enter">Comenzar recorrido con mi elección →</button><p class="tiny">El personaje avanza solo. Frena con ← para observar y detenerte en los cruces; acelera con →. Salta con espacio e inspecciona con E.</p>';
    const selected = new Set();
    equipment.forEach(([id, icon, name]) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-pressed', 'false');
      b.innerHTML = '<span>' + icon + '</span>' + name;
      b.dataset.equipment = id;
      b.onclick = () => {
        if (selected.has(id)) selected.delete(id);
        else {
          const opposite = {
            helmet: 'cap',
            cap: 'helmet',
            boots: 'sandals',
            sandals: 'boots',
          }[id];
          if (opposite) selected.delete(opposite);
          selected.add(id);
        }
        document
          .querySelectorAll('[data-equipment]')
          .forEach((button) =>
            button.setAttribute(
              'aria-pressed',
              String(selected.has(button.dataset.equipment)),
            ),
          );
      };
      $('.equipment').append(b);
    });
    $('#enter').onclick = () => {
      worn = new Set(selected);
      autoRun = true;
      startDelay = 2.5;
      state = 'playing';
      clearKeys();
      $('#overlay').classList.add('hidden');
      toast('Observa el almacén antes de avanzar.', 2.5);
      $('#pause').disabled = false;
      hud();
      document
        .querySelector('.game-shell')
        .scrollIntoView({ block: 'start', behavior: 'instant' });
    };
  }
  function missObservation(item) {
    item.missed = true;
    lives--;
    streak = 0;
    state = 'lesson';
    clearKeys();
    $('#pause').disabled = true;
    hud();
    $('#overlay').classList.remove('hidden');
    const kind = item.type === 'act' ? 'acto inseguro' : 'condición insegura';
    $('#modal').innerHTML =
      '<p class="eyebrow">PASASTE SIN REPORTAR · −1 VIDA</p><h2>Se te pasó un ' +
      kind +
      '.</h2><p><b>' +
      item.title +
      '</b></p><p>' +
      item.explanation +
      '</p><p class="tiny">Perdiste una vida porque avanzaste sin identificar y reportar esta situación. Observa cada zona antes de seguir; puedes regresar a reportarla si conservas vidas.</p><button class="primary" id="continue-miss">' +
      (lives ? 'Continuar y observar →' : 'Ver resultado del turno →') +
      '</button>';
    $('#continue-miss').onclick = () => {
      if (!lives) {
        finish();
        return;
      }
      state = 'playing';
      $('#overlay').classList.add('hidden');
      $('#pause').disabled = false;
    };
  }
  function needsIncident(s) {
    return s.id === 'head'
      ? !worn.has('helmet')
      : s.id === 'audio'
        ? worn.has('headphones')
        : s.id === 'feet'
          ? !worn.has('boots')
          : !worn.has('vest');
  }
  function startIncident(s) {
    incident = s;
    triggered.add(s.id);
    lives--;
    streak = 0;
    state = 'incident';
    deathTime = 1.1;
    player.y = FLOOR - player.h;
    player.vx = player.vy = 0;
    player.ground = true;
    clearKeys();
    $('#pause').disabled = true;
    hud();
    toast('Incidente por tu elección de equipo · −1 vida', 2);
  }
  function showLesson() {
    state = 'lesson';
    $('#overlay').classList.remove('hidden');
    const title =
      incident.missingTitle && !worn.has(incident.remove)
        ? incident.missingTitle
        : incident.title;
    $('#modal').innerHTML =
      '<p class="eyebrow">APRENDE DE TU DECISIÓN · −1 VIDA</p><h2>' +
      title +
      '</h2><p>' +
      incident.explanation +
      '</p><p class="tiny">Escena ficticia: el EPP reduce riesgos, pero no sustituye las rutas seguras ni el control de las cargas y los vehículos.</p><button class="primary" id="correct">' +
      (lives ? incident.fix + ' y continuar →' : 'Ver resultado del turno →') +
      '</button>';
    $('#correct').onclick = () => {
      if (!lives) {
        finish(false);
        return;
      }
      if (incident.remove) worn.delete(incident.remove);
      if (incident.add) worn.add(incident.add);
      incident = null;
      state = 'playing';
      clearKeys();
      $('#overlay').classList.add('hidden');
      $('#pause').disabled = false;
      hud();
      toast('Equipo corregido.', 4);
    };
  }
  function reportObservation(h) {
    if (h.reported) return;
    h.reported = true;
    learnedReports.add((h.type === 'act' ? 'act:' : 'hazard:') + h.id);
    if (h.type === 'act') totalActs++;
    else totalReports++;
    streak++;
    hud();
    toast(h.type === 'act' ? '✓ Acto reportado' : '✓ Condición reportada', 2);
  }
  function inspectHazard(h) {
    if (h.reported) { toast('✓ Ya reportaste esta situación.', 2); return; }
    if (learnedReports.has((h.type === 'act' ? 'act:' : 'hazard:') + h.id)) {
      reportObservation(h);
      return;
    }
    const isAct = h.type === 'act';
    state = 'inspection';
    clearKeys();
    $('#pause').disabled = true;
    $('#overlay').classList.remove('hidden');
    $('#modal').innerHTML =
      '<p class="eyebrow">OBSERVA · IDENTIFICA · REPORTA</p><h2>¿Qué ' +
      (isAct ? 'acto' : 'condición') +
      ' encontraste?</h2><p>Identifica lo que viste cerca de ti. Reporta desde una distancia segura.</p><div class="hazard-options"></div><p class="feedback" role="status"></p><button class="secondary" id="back">Volver a observar</button>';
    h.choices.forEach((choice, i) => {
      const b = document.createElement('button');
      b.textContent = choice;
      b.onclick = () => {
        if (i !== h.answer) {
          $('.feedback').textContent =
            'Esa opción no corresponde a lo que estás observando. Revisa la escena y la acción de las personas.';
          return;
        }
        if (h.reported) return;
        reportObservation(h);
        closeInspection();
      };
      $('.hazard-options').append(b);
    });
    $('#back').onclick = closeInspection;
  }
  function closeInspection() {
    state = 'playing';
    clearKeys();
    $('#overlay').classList.add('hidden');
    $('#pause').disabled = false;
  }

  function pause() {
    if (state === 'playing') {
      state = 'paused';
      clearKeys();
      $('#overlay').classList.remove('hidden');
      $('#modal').innerHTML =
        '<p class="eyebrow">TOMA UN RESPIRO</p><h2>Turno en pausa.</h2><p>Sector ' +
        sector +
        ' · Recorrido continuo. La partida se conserva mientras está en pausa.</p><button class="primary" id="resume">Continuar misión →</button>';
      $('#resume').onclick = pause;
    } else if (state === 'paused') {
      state = 'playing';
      $('#overlay').classList.add('hidden');
    }
  }
  function inventorySummary() {
    const rows = [
      { name: 'Stella Artois', brand: 'STELLA', detected: totalPallets },
      { name: 'Flying Fish', brand: 'FLYING FISH', detected: totalFish },
    ].map((item) => {
      const expected = previousInventory[item.brand] + pallets.filter((p) => p.brand === item.brand).length;
      return { ...item, expected, missing: Math.max(0, expected - item.detected) };
    });
    const missing = rows.reduce((sum, item) => sum + item.missing, 0);
    return '<h3>Inventario de tarimas</h3><p class="inventory-scope">Todos los sectores iniciados, incluso las tarimas que no alcanzaste a recorrer.</p>' +
      '<table class="inventory-result"><thead><tr><th scope="col">Presentación</th><th scope="col">Detectadas</th><th scope="col">Faltantes</th></tr></thead><tbody>' +
      rows.map((item) => '<tr><th scope="row"><img class="result-box" src="assets/' + (item.brand === 'STELLA' ? 'stella' : 'flying-fish') + '-box.svg" alt="" />' + item.name + '</th><td>' + item.detected + ' de ' + item.expected + '</td><td>' + item.missing + '</td></tr>').join('') +
      '</tbody></table><p class="inventory-difference"><span aria-hidden="true">' + (missing > 0 ? '⚠' : '✓') + '</span> ' +
      (missing > 0 ? 'Tenemos una diferencia de inventario de ' + missing + (missing === 1 ? ' tarima' : ' tarimas') + ' sin detectar y registrar.' : '¡Detectaste todas las tarimas! No hay diferencia de inventario.') + '</p>';
  }
  function scoreSummary() {
    const distance = Math.floor(completedDistance + sectorProgress);
    const inventory = (totalPallets + totalFish) * 100;
    const travel = Math.floor(distance / 100);
    const risks = totalReports * 150;
    const acts = totalActs * 150;
    const penalty = incorrectPallets * 50;
    return { distance, inventory, travel, risks, acts, penalty, total: inventory + travel + risks + acts - penalty };
  }
  function scoreMarkup() {
    const score = scoreSummary();
    return '<section class="score-result" aria-label="Puntuación final"><span aria-hidden="true">🏆</span> <strong>' + score.total + ' puntos</strong>' +
      '<div class="score-breakdown"><span>📦 Inventario: ' + score.inventory + ' pts</span><span>↗ Recorrido: ' + score.travel + ' pts</span><span>⚠ Riesgos: ' + score.risks + ' pts</span><span>👷 Actos: ' + score.acts + ' pts</span></div>' +
      '<p>Tarimas incorrectas: ' + incorrectPallets + ' · −' + score.penalty + ' pts. Distancia recorrida: ' + score.distance + ' unidades. Tarima: +100; riesgo o acto correcto: +150; cada 100 unidades nuevas: +1.</p></section>';
  }
  function finish() {
    state = 'lost';
    clearKeys();
    $('#pause').disabled = true;
    $('#overlay').classList.remove('hidden');
    $('#modal').innerHTML =
      '<div class="end-heading"><p class="eyebrow">FIN DEL TURNO</p><h2>La próxima decisión cuenta.</h2><p class="end-intro">Te quedaste sin vidas. Cada recorrido es una nueva oportunidad para reconocer los riesgos.</p></div><div class="end-body"><div class="end-inventory"><div class="result"><span>Sector: ' +
      sector +
      '</span><span>Monedas: ' +
      totalCoins +
      '</span><span>Reportes: ' +
      totalReports +
      '</span><span>Actos: ' +
      totalActs +
      '</span><span>Escaleras: ' +
      completedStairs +
      '</span></div>' + inventorySummary() + '</div>' + scoreMarkup() + '</div><div class="end-actions"><button class="primary" id="again">Reintentar con mi EPP ↻</button><button class="secondary" id="change-epp">Cambiar mi EPP</button></div>';
    $('#again').onclick = () => {
      const gear = new Set(worn);
      reset();
      worn = gear;
      autoRun = true;
      startDelay = 2.5;
      state = 'playing';
      toast('Observa el almacén antes de avanzar.', 2.5);
      $('#overlay').classList.remove('ready');
      $('#overlay').classList.add('hidden');
      $('#pause').disabled = false;
      hud();
      document
        .querySelector('.game-shell')
        .scrollIntoView({ block: 'start', behavior: 'instant' });
    };
    $('#change-epp').onclick = () => {
      reset();
      showEquipment();
    };
  }
  function interact() {
    if (state !== 'playing') return;
    if (player.ground && nearbyHandrail() && !railHeld) {
      toggleHandrail();
      return;
    }
    const h = [...hazards, ...workers]
      .filter(
        (h) =>
          !h.reported &&
          Math.abs(player.x + 16 - h.x) < 90 &&
          player.ground &&
          Math.abs(player.y + player.h - (h.feet ?? FLOOR)) < 85,
      )
      .sort((a, b) => Math.abs(player.x + 16 - a.x) - Math.abs(player.x + 16 - b.x))[0];
    if (h) {
      inspectHazard(h);
      return;
    }
    if (player.ground && nearbyHandrail()) {
      toggleHandrail();
      return;
    }
    const p = pallets
      .filter(p => Math.abs(player.x + 16 - (p.x + 53)) < inventoryReach() && player.ground && player.y > 300)
      .sort((a, b) => Math.abs(player.x + 16 - (a.x + 53)) - Math.abs(player.x + 16 - (b.x + 53)))[0];
    if (!p) {
      toast('No se registró ninguna interacción.', 2);
      return;
    }
    if (!['STELLA', 'FLYING FISH'].includes(p.brand)) {
      incorrectPallets++;
      toast('−50 puntos: esta tarima es de ' + p.brand + '. Busca Stella o Flying Fish.', 3);
      return;
    }
    if (p.registered) {
      toast('Tarima ya registrada.', 2);
      return;
    }
    p.registered = true;
    if (p.brand === 'STELLA') {
      found = true;
      totalPallets++;
    } else {
      fishFound = true;
      totalFish++;
    }
    streak++;
    hud();
    toast('¡Tarima ' + p.brand + ' registrada! Racha ' + streak, 3);
  }
  function missHandrail(stair) {
    stair.handrailMissed = true;
    lives--;
    streak = 0;
    state = 'lesson';
    clearKeys();
    player.vx = 0;
    $('#pause').disabled = true;
    hud();
    $('#overlay').classList.remove('hidden');
    $('#modal').innerHTML = '<p class="eyebrow">DECISIÓN INSEGURA · −1 VIDA</p><h2>No te sujetaste del pasamanos.</h2><p>Al subir o bajar, el pasamanos te da apoyo y equilibrio. Si tropiezas o resbalas, sujetarte ayuda a evitar una caída por las escaleras.</p><p>Es obligatorio sujetarse durante todo el trayecto. Cerca de la escalera, usa <b>E o Interactuar</b> para sujetarte; úsalo de nuevo para soltar.</p><button class="primary" id="after-handrail">' + (lives ? 'Entendido, continuar →' : 'Ver resultado →') + '</button>';
    $('#after-handrail').onclick = () => {
      if (!lives) { finish(); return; }
      state = 'playing';
      startDelay = 2.5;
      $('#overlay').classList.add('hidden');
      $('#pause').disabled = false;
    };
  }
  function nearbyHandrail() {
    const center = player.x + player.w / 2;
    return stairs.find((s) => center >= s.x - 100 && center <= s.x + stairWidth(s));
  }
  function toggleHandrail() {
    if (state !== 'playing' || !player.ground || !nearbyHandrail()) return;
    railHeld = !railHeld;
    toast(railHeld ? "Sujeto al pasamanos." : "Soltaste el pasamanos.", 1.5);
  }
  $('#pause').onclick = pause;
  $('#restart').onclick = () => {
    reset();
    document
      .querySelector('.setup')
      .scrollIntoView({ block: 'start', behavior: 'instant' });
  };
  window.addEventListener('keydown', (e) => {
    if (
      ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'Space'].includes(e.code) &&
      !['BUTTON', 'INPUT'].includes(e.target.tagName)
    )
      e.preventDefault();
    if (
      e.repeat &&
      ['KeyE', 'KeyP', 'Escape', 'Space', 'ArrowUp', 'KeyW'].includes(e.code)
    )
      return;
    if (['KeyP', 'Escape'].includes(e.code)) {
      pause();
      return;
    }
    if (state !== 'playing') return;
    if (['ArrowLeft', 'KeyA'].includes(e.code)) keys.left = true;
    if (['ArrowRight', 'KeyD'].includes(e.code)) keys.right = true;
    if (['Space', 'ArrowUp', 'KeyW'].includes(e.code)) keys.jump = true;
    if (e.code === 'KeyE') interact();
  });
  window.addEventListener('keyup', (e) => {
    if (['ArrowLeft', 'KeyA'].includes(e.code)) keys.left = false;
    if (['ArrowRight', 'KeyD'].includes(e.code)) keys.right = false;
    if (['Space', 'ArrowUp', 'KeyW'].includes(e.code)) keys.jump = false;
  });
  window.addEventListener('blur', () => {
    clearKeys();
    if (state === 'playing') pause();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state === 'playing') pause();
  });
  document.querySelectorAll('[data-key]').forEach((b) => {
    const key = b.dataset.key;
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      b.setPointerCapture(e.pointerId);
      if (state !== 'playing') return;
      if (key === 'interact') interact();
      else keys[key] = true;
    });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((ev) =>
      b.addEventListener(ev, () => {
        if (key !== 'interact') keys[key] = false;
      }),
    );
  });
  function dragLever(e) {
    const rect = speedLever.getBoundingClientRect(),
      travel = Math.max(1, rect.width / 2 - 22);
    setLever(
      Math.max(-1, Math.min(1, (e.clientX - rect.left - rect.width / 2) / travel)),
    );
  }
  speedLever.addEventListener('pointerdown', (e) => {
    if (state !== 'playing' || leverPointer !== null) return;
    e.preventDefault();
    leverPointer = e.pointerId;
    speedLever.setPointerCapture(e.pointerId);
    dragLever(e);
  });
  speedLever.addEventListener('pointermove', (e) => {
    if (e.pointerId === leverPointer) dragLever(e);
  });
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture'])
    speedLever.addEventListener(event, (e) => {
      if (e.pointerId === leverPointer) resetLever();
    });
  speedLever.addEventListener('keydown', (e) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(e.code)) return;
    e.preventDefault();
    if (state === 'playing') setLever(e.code === 'ArrowLeft' ? -1 : 1);
  });
  speedLever.addEventListener('keyup', (e) => {
    if (['ArrowLeft', 'ArrowRight'].includes(e.code)) resetLever();
  });
  speedLever.addEventListener('blur', resetLever);
  function collectCoin(coin) {
    coin.collected = true;
    if (coin.risky) coin.crossing.coinTrap = false;
    totalCoins++;
    coinsTowardLife++;
    streak++;
    if (coinsTowardLife >= 5) {
      coinsTowardLife = 0;
      if (lives < MAX_LIVES) {
        lives++;
        toast('¡Cinco monedas seguras! +1 vida', 3);
      } else toast('¡Cinco monedas seguras! Vida al máximo', 3);
    }
    hud();
  }
  function hit(c) {
    lives--;
    streak = 0;
    state = 'dying';
    deathTime = 0.9;
    crash = c;
    clearKeys();
    hud();
    toast(
      c.coinTrap
        ? '¡Alto! Una moneda no vale tu vida. −1 vida.'
        : '¡Alto! Cruzaste sin detenerte. −1 vida.',
      3,
    );
  }
  function showCoinLesson() {
    state = 'lesson';
    player.x = crash.x - 140;
    player.y = FLOOR - player.h;
    player.vx = player.vy = 0;
    player.ground = true;
    crash.hold = 0;
    crash = null;
    $('#overlay').classList.remove('hidden');
    $('#modal').innerHTML =
      '<p class="eyebrow">DECISIÓN INSEGURA · −1 VIDA</p><h2>Una moneda no vale tu vida.</h2><p>Entraste al cruce por una moneda sin esperar la señal. Un montacargas puede aparecer: por una moneda tu vida puede acabar. Cuídate. Detente, observa y cruza solo cuando sea seguro.</p><button class="primary" id="after-coin">' +
      (lives ? 'Entendido, continuar →' : 'Ver resultado →') +
      '</button>';
    $('#after-coin').onclick = () => {
      if (!lives) {
        finish();
        return;
      }
      state = 'playing';
      $('#overlay').classList.add('hidden');
    };
  }
  function update(dt) {
    if (['paused', 'lesson', 'inspection'].includes(state) || document.hidden) return;
    time += dt;
    if (toastTime > 0) {
      toastTime -= dt;
      if (toastTime <= 0) $('#toast').classList.remove('visible');
    }
    if (state === 'incident') {
      deathTime -= dt;
      if (deathTime <= 0) showLesson();
      return;
    }
    if (state === 'dying') {
      deathTime -= dt;
      if (deathTime <= 0) {
        if (crash.coinTrap) {
          showCoinLesson();
          return;
        }
        if (lives === 0) {
          finish(false);
          return;
        }
        player.x = crash.x - 140;
        player.y = FLOOR - player.h;
        player.vx = player.vy = 0;
        player.ground = true;
        crash.hold = 0;
        crash = null;
        state = 'playing';
      }
      return;
    }
    if (state !== 'playing') return;
    if (startDelay > 0) {
      startDelay = Math.max(0, startDelay - dt);
      player.vx = 0;
      return;
    }
    updateWorkers(dt);
    player.vx = autoRun
      ? keys.left
        ? 0
        : runSpeed() + (keys.right ? 90 : 0)
      : (Number(keys.right) - Number(keys.left)) * 300;
    if (player.vx) player.face = Math.sign(player.vx);
    const onStairs = stairAt(player.x + player.w / 2);
    const besideStorage =
      !!onStairs ||
      noJumpZones.some((p) => player.x + player.w > p.x && player.x < p.x + p.w);
    if (keys.jump && player.ground) {
      if (!besideStorage) {
        player.vy = -530;
        player.ground = false;
      }
    }
    keys.jump = false;
    const oldX = player.x,
      wasGround = player.ground;
    player.x = Math.max(20, Math.min(WORLD - player.w - 20, player.x + player.vx * dt));
    // Storage is behind the pedestrian lane. Walking past it is safe;
    // jumping into its horizontal span is blocked from either direction.
    if (!player.ground) {
      for (const p of noJumpZones) {
        if (player.x + player.w > p.x && player.x < p.x + p.w) {
          player.x =
            oldX + player.w <= p.x
              ? p.x - player.w
              : oldX >= p.x + p.w
                ? p.x + p.w
                : oldX;
          player.vx = 0;
        }
      }
    }
    let nextStair = stairAt(player.x + player.w / 2);
    const activeRail = onStairs || nextStair;
    if (wasGround && activeRail && !railHeld && !activeRail.handrailMissed && player.x !== oldX) {
      player.x = oldX;
      missHandrail(activeRail);
      return;
    }
    if (!onStairs && !nextStair && !nearbyHandrail()) railHeld = false;
    if (!wasGround && nextStair) {
      player.x = oldX;
      player.vx = 0;
    }
    sectorProgress = Math.max(sectorProgress, player.x - (sector === 1 ? 110 : 30));
    const surface = floorAt(player.x + player.w / 2);
    if (wasGround && (onStairs || nextStair)) {
      player.y = surface - player.h;
      player.vy = 0;
      player.ground = true;
      const active = onStairs || nextStair;
      if (surface === FLOOR - active.steps * active.rise) active.visitedTop = true;
      if (
        active.visitedTop &&
        !active.completed &&
        player.x + player.w / 2 >= active.x + stairWidth(active)
      ) {
        active.completed = true;
        completedStairs++;
        streak++;
        hud();
      }
    } else {
      player.vy += 1450 * dt;
      player.y += player.vy * dt;
      player.ground = false;
      if (player.y + player.h >= surface) {
        player.y = surface - player.h;
        player.vy = 0;
        player.ground = true;
      }
    }
    for (const coin of coins) {
      if (
        coin.risky &&
        !coin.active &&
        !coin.expired &&
        player.x + player.w > coin.crossing.x - stopWidth() - 25
      ) {
        coin.active = true;
        coin.crossing.coinTrap = true;
      }
      if (coin.risky && coin.active && !coin.collected) {
        coin.timeLeft -= dt;
        if (coin.timeLeft <= 0) {
          coin.expired = true;
          coin.active = false;
          coin.crossing.coinTrap = false;
        }
      }
      if (
        !coin.collected &&
        (!coin.risky || coin.active) &&
        (!coin.risky || coin.crossing.cleared) &&
        player.ground &&
        Math.abs(player.x + player.w / 2 - coin.x) < 23 &&
        player.y + player.h >= FLOOR - 5
      )
        collectCoin(coin);
    }
    for (const token of focusTokens) {
      if (
        !token.collected &&
        Math.abs(player.x + player.w / 2 - token.x) < 24 &&
        player.y < token.y + 12 &&
        player.y + player.h > token.y - 12
      ) {
        token.collected = true;
        streak++;
        hud();
        toast('Punto de atención · racha ' + streak, 2);
      }
    }
    for (const c of crossings) {
      if (c.cleared) continue;
      const inStop =
        player.x + player.w > c.x - stopWidth() &&
        player.x + player.w <= c.x &&
        player.ground &&
        player.y + player.h >= FLOOR - 1;
      if (inStop && player.vx === 0) {
        c.hold += dt;
        if (c.hold >= stopTime()) {
          c.cleared = true;
          streak++;
          hud();
        }
      } else c.hold = 0;
      if (!c.cleared && player.x + player.w > c.x && player.x < c.x + c.w) {
        hit(c);
        break;
      }
    }
    if (state === 'playing' && sector === 1) {
      const next = incidentScenarios.find(
        (s) => !triggered.has(s.id) && player.x >= s.x && needsIncident(s),
      );
      if (next) startIncident(next);
    }
    if (state === 'playing' && player.vx > 0) {
      const missed = [...hazards, ...workers]
        .filter(
          (item) =>
            !item.reported &&
            !item.missed &&
            player.x + player.w >
              Math.min((item.type === 'act' ? item.max : item.x) + 120, WORLD - 60),
        )
        .sort(
          (a, b) => (a.type === 'act' ? a.max : a.x) - (b.type === 'act' ? b.max : b.x),
        )[0];
      if (missed) missObservation(missed);
    }
    if (state === 'playing' && player.x >= WORLD - player.w - 22) advanceSector();
    camera = Math.max(0, Math.min(WORLD - W, player.x - W * 0.3));
    $('#zone').textContent =
      '● SECTOR ' + String(sector).padStart(2, '0') + ' · NIVEL ' + sector;
  }
  function runSpeed() {
    return 275 + Math.min(250, (sector - 1) * 50);
  }
  function stopTime() {
    return Math.min(1.6, 0.8 + (sector - 1) * 0.15);
  }
  function stopWidth() {
    return Math.max(65, 115 - (sector - 1) * 8);
  }
  function rect(x, y, w, h, c) {
    ctx.fillStyle = c;
    ctx.fillRect(x, y, w, h);
  }
  function text(s, x, y, size = 12, color = '#25453b', align = 'left') {
    ctx.fillStyle = color;
    ctx.font = 'bold ' + size + 'px Arial';
    ctx.textAlign = align;
    ctx.fillText(s, x, y);
  }
  function line(x, y, x2, y2, c, w = 1) {
    ctx.strokeStyle = c;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  function box(x, y, w = 46, h = 36, brand = 'CERVEZA', color = '#bfac79') {
    const artwork = brand === 'STELLA' ? $('#stella-box') : brand === 'FISH' ? $('#fish-box') : null;
    if (artwork && artwork.complete && artwork.naturalWidth > 0) {
      ctx.drawImage(artwork, x, y, w, h);
      return;
    }
    rect(x, y, w, h, color);
    rect(x + 3, y + 3, w - 6, h - 6, '#ffffff0d');
    line(x + w / 2, y, x + w / 2, y + 8, '#84754c', 2);
    text(
      brand,
      x + w / 2,
      y + h * 0.62,
      brand === 'STELLA' ? 7 : 6,
      ['STELLA', 'CORONA', 'VICTORIA'].includes(brand) ? '#fff6df' : '#504c35',
      'center',
    );
    if (brand === 'STELLA')
      line(x + 8, y + h * 0.74, x + w - 8, y + h * 0.74, '#e5d4a0');
  }
  function pallet(p) {
    ctx.save();
    ctx.translate(0, -78);
    for (let row = 0; row < 2; row++)
      for (let col = 0; col < 2; col++)
        box(
          p.x + col * 52,
          FLOOR - 88 + row * 37,
          50,
          36,
          p.brand === 'FLYING FISH' ? 'FISH' : p.brand,
          p.color,
        );
    rect(p.x - 5, FLOOR - 12, 114, 7, '#96764e');
    for (let i = 0; i < 3; i++) rect(p.x + i * 47, FLOOR - 5, 13, 5, '#665237');
    text(p.brand, p.x + 51, FLOOR - 112, 10, '#f4f4ed', 'center');
    if (p.registered)
      text('✓ REGISTRADA', p.x + 51, FLOOR - 103, 11, '#ffe079', 'center');
    ctx.restore();
  }
  function forklift(x, y, dir = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(dir, 1);
    rect(-53, -51, 70, 37, '#ffc600');
    rect(-56, -26, 78, 13, '#bc8730');
    rect(-12, -91, 6, 43, '#263d36');
    rect(31, -93, 7, 82, '#263d36');
    rect(-16, -96, 57, 6, '#263d36');
    rect(-6, -87, 33, 31, '#a4bbb18a');
    rect(42, -80, 7, 73, '#45534c');
    rect(44, -9, 43, 5, '#45534c');
    rect(8, -51, 17, 6, '#374a40');
    rect(12, -69, 6, 20, '#374a40');
    for (const xx of [-32, 23]) {
      ctx.fillStyle = '#283c35';
      ctx.beginPath();
      ctx.arc(xx, -10, 13, 0, 7);
      ctx.fill();
      ctx.fillStyle = '#899483';
      ctx.beginPath();
      ctx.arc(xx, -10, 6, 0, 7);
      ctx.fill();
    }
    rect(-5, -102, 10, 6, Math.sin(time * 7) > 0 ? '#ffce58' : '#bc8730');
    ctx.restore();
  }
  function character() {
    ctx.save();
    ctx.translate(player.x + 16, player.y + 66);
    const impact = state === 'incident' && deathTime < 0.5;
    const crushed = state === 'dying' || (impact && incident.kind !== 'foot');
    if (crushed) {
      ctx.scale(1.8, 0.22);
      ctx.rotate(-0.12);
    }
    if (impact && incident.kind === 'foot') ctx.rotate(Math.sin(time * 22) * 0.16);
    const walk =
      player.ground && player.vx && state === 'playing' ? Math.sin(time * 15) * 7 : 0;
    ctx.scale(player.face, 1);
    rect(-13, -24, 10, 21 + walk, '#28475a');
    rect(3, -24, 10, 21 - walk, '#28475a');
    const boots = worn.has('boots');
    rect(-15, -6 + walk, 14, boots ? 7 : 4, boots ? '#171717' : '#ca986b');
    rect(3, -6 - walk, 15, boots ? 7 : 4, boots ? '#171717' : '#ca986b');
    if (worn.has('sandals')) {
      rect(-15, -3 + walk, 14, 3, '#b84d35');
      rect(3, -3 - walk, 15, 3, '#b84d35');
    }
    rect(-15, -46, 30, 24, worn.has('vest') ? '#ffc600' : '#454a51');
    if (worn.has('vest')) {
      rect(-9, -46, 4, 24, '#fff3b0');
      rect(6, -46, 4, 24, '#fff3b0');
      rect(-15, -30, 30, 4, '#fff3b0');
    }
    rect(-21, -44, 6, 22, '#323232');
    rect(-21, -24, 6, 7, '#b7845c');
    if (railHeld && stairAt(player.x + 16) && player.ground) {
      line(15, -43, 25, -53, '#323232', 6);
      rect(22, -56, 7, 6, '#b7845c');
    } else {
      rect(15, -44, 6, 22, '#323232');
      rect(15, -24, 6, 7, '#b7845c');
    }
    rect(-9, -62, 21, 17, '#ca986b');
    rect(-10, -64, 22, 5, '#493527');
    if (worn.has('helmet')) {
      rect(-12, -65, 26, 9, '#ffc600');
      rect(-7, -71, 17, 9, '#ffc600');
      rect(-15, -58, 33, 4, '#ffe079');
    } else if (worn.has('cap')) {
      rect(-11, -65, 23, 9, '#3386c7');
      rect(9, -59, 13, 4, '#226298');
    }
    if (worn.has('headphones')) {
      line(-12, -52, -12, -69, '#c28cff', 4);
      line(-12, -69, 14, -69, '#c28cff', 4);
      rect(-15, -57, 7, 13, '#8d4fbb');
      rect(11, -57, 7, 13, '#8d4fbb');
    }
    rect(7, -53, 3, 3, '#283c35');
    ctx.restore();
    if (crushed || impact) {
      text('¡PLOF!', player.x + 10, player.y - 20, 24, '#ffbe65', 'center');
      for (let i = 0; i < 5; i++)
        text(
          '✦',
          player.x + Math.cos(time * 4 + i * 1.25) * 42,
          player.y + 15 + Math.sin(time * 4 + i * 1.25) * 16,
          14,
          '#f3cb53',
          'center',
        );
    }
  }
  function drawIncident() {
    if (state !== 'incident' || !incident) return;
    const progress = Math.min(1, (1.1 - deathTime) / 0.7);
    if (incident.kind === 'forklift') {
      forklift(player.x - 190 + progress * 230, FLOOR, 1);
      text(
        incident.id === 'audio' ? '♪  ♪   ¡BIP, BIP!' : '¡NO TE VI!',
        player.x + 30,
        player.y - 47,
        15,
        '#ffe079',
        'center',
      );
    } else {
      const target = incident.kind === 'foot' ? FLOOR - 27 : player.y - 22;
      box(
        player.x + (incident.kind === 'foot' ? 16 : -5),
        target - 190 + progress * 190,
        42,
        30,
        'CERVEZA',
        '#d4a85f',
      );
      for (let i = 0; i < 3; i++)
        line(
          player.x + i * 14,
          target - 204 + progress * 190,
          player.x + i * 14,
          target - 194 + progress * 190,
          '#ffe079',
          2,
        );
    }
  }
  function drawHazard(h) {
    ctx.save();
    ctx.translate(h.x, 0);
    if (h.id === 'leaning') {
      ctx.save();
      ctx.translate(0, 365);
      ctx.rotate(-0.22 + Math.sin(time * 2) * 0.018);
      rect(-48, -8, 96, 8, '#a17d49');
      for (let r = 0; r < 3; r++)
        for (let c = 0; c < 2; c++)
          box(-43 + c * 43, -43 - r * 33, 41, 31, 'CERVEZA', '#b99b61');
      ctx.restore();
    } else if (h.id === 'leak') {
      rect(-40, 294, 80, 7, '#707879');
      rect(-4, 300, 8, 20, '#607478');
      for (let i = 0; i < 3; i++) {
        const drop = (time * 85 + i * 42) % 106;
        rect(-2 + i * 9 - 9, 322 + drop, 5, 10, '#88d9e6');
      }
      ctx.fillStyle = '#66bdd0';
      ctx.beginPath();
      ctx.ellipse(0, 420, 51, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      text('GOTERA', 0, 288, 10, '#d9f4f6', 'center');
    } else if (h.id === 'spill') {
      ctx.fillStyle = '#62baca';
      ctx.beginPath();
      ctx.ellipse(0, 420, 49, 12, -0.08, 0, Math.PI * 2);
      ctx.fill();
      line(-28, 417, 8, 417, '#c1edf0', 2);
      ctx.save();
      ctx.translate(28, 390);
      ctx.rotate(1.1);
      rect(-9, -17, 18, 30, '#a96537');
      rect(-8, -19, 16, 4, '#ddd4a0');
      ctx.restore();
    } else if (h.id === 'wrap') {
      line(-42, 406, -19, 416, '#dddde0', 5);
      line(-19, 416, 13, 403, '#dddde0', 5);
      line(13, 403, 39, 418, '#dddde0', 5);
      ctx.strokeStyle = '#76a5df';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(0, 416, 26, 10, 0.4, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      rect(-23, 275, 46, 42, '#ad3535');
      text('EXTINTOR', 0, 301, 8, '#fff', 'center');
      rect(-10, 330, 20, 42, '#d2443c');
      rect(-5, 324, 13, 6, '#ddd');
      line(10, 329, 17, 352, '#171717', 4);
      for (let i = 0; i < 2; i++) box(-43 + i * 43, 374, 41, 36, 'CERVEZA', '#bd9c62');
      box(-21, 341, 42, 32, 'CERVEZA', '#bd9c62');
    }
    if (h.reported) {
      rect(-53, 237, 106, 21, '#1c2920');
      text('✓ REPORTADO', 0, 251, 10, '#b7ea91', 'center');
    }
    ctx.restore();
  }
  function updateWorkers(dt) {
    for (const worker of workers) {
      const { min, max } = worker;
      worker.x += worker.direction * 48 * dt;
      if (worker.x >= max) {
        worker.x = max;
        worker.direction = -1;
      } else if (worker.x <= min) {
        worker.x = min;
        worker.direction = 1;
      }
      worker.feet = worker.onStairs ? floorAt(worker.x) : FLOOR;
      worker.phase += dt * 8;
    }
  }
  function drawWorker(worker) {
    ctx.save();
    ctx.translate(worker.x, worker.feet);
    ctx.scale(worker.direction, 1);
    const stride = Math.sin(worker.phase) * 5;
    rect(-12, -26, 9, 23 + stride, '#435166');
    rect(3, -26, 9, 23 - stride, '#435166');
    rect(-14, -5 + stride, 14, 6, '#171717');
    rect(3, -5 - stride, 14, 6, '#171717');
    rect(-15, -48, 30, 25, worker.id === 'noVest' ? '#4c5560' : '#f38b30');
    if (worker.id !== 'noVest') {
      rect(-10, -46, 4, 23, '#fff1c1');
      rect(7, -46, 4, 23, '#fff1c1');
      rect(-15, -31, 30, 4, '#fff1c1');
    }
    // The phone hand is raised; other workers keep both hands by their hips.
    rect(-22, -45, 7, 20, '#495361');
    rect(-22, -25, 7, 6, '#d6a074');
    if (worker.id !== 'phoneWalking') {
      rect(15, -45, 7, 20, '#495361');
      rect(15, -25, 7, 6, '#d6a074');
    }
    rect(-9, -64, 21, 17, '#d6a074');
    rect(-11, -67, 23, 7, '#38281e');
    rect(-11, -63, 5, 10, '#38281e');
    if (worker.id !== 'noHelmet') {
      rect(-12, -68, 27, 9, '#ebebe6');
      rect(-7, -74, 17, 9, '#ebebe6');
      rect(-15, -60, 33, 4, '#fffdf4');
    }
    if (worker.id === 'phoneWalking') {
      line(17, -44, 25, -36, '#495361', 7);
      line(25, -36, 18, -55, '#495361', 7);
      rect(11, -65, 7, 15, '#101820');
      rect(13, -63, 3, 9, '#83c4d8');
      rect(16, -57, 6, 7, '#d6a074');
    }
    rect(7, -56, 3, 3, '#222');
    ctx.restore();
    if (worker.reported) {
      rect(worker.x - 54, worker.feet - 106, 108, 20, '#1c2920');
      text('✓ REPORTADO', worker.x, worker.feet - 92, 10, '#b7ea91', 'center');
    }
  }
  function drawHandrailSign(x) {
    const y = FLOOR - 166;
    rect(x - 3, y + 77, 6, 89, '#8b9398');
    rect(x - 40, y, 80, 83, '#f4f4ed');
    ctx.fillStyle = '#1768bc';
    ctx.beginPath();
    ctx.arc(x, y + 31, 27, 0, Math.PI * 2);
    ctx.fill();
    // White pictogram: person on steps, with a hand meeting the sloping rail.
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x - 9, y + 16, 5, 0, Math.PI * 2);
    ctx.fill();
    line(x - 9, y + 24, x - 9, y + 36, '#fff', 5);
    line(x - 9, y + 26, x + 2, y + 30, '#fff', 4);
    line(x + 2, y + 30, x + 10, y + 23, '#fff', 4);
    line(x - 9, y + 36, x - 16, y + 47, '#fff', 4);
    line(x - 9, y + 36, x + 1, y + 42, '#fff', 4);
    line(x - 1, y + 32, x + 21, y + 14, '#fff', 3);
    line(x - 21, y + 51, x - 6, y + 51, '#fff', 2);
    line(x - 6, y + 51, x - 6, y + 45, '#fff', 2);
    line(x - 6, y + 45, x + 8, y + 45, '#fff', 2);
    text('OBLIGATORIO', x, y + 67, 9, '#123454', 'center');
    text('USAR PASAMANOS', x, y + 78, 8, '#123454', 'center');
  }
  function drawStairs(s) {
    drawHandrailSign(s.x - 82);
    const run = s.steps * s.tread,
      top = FLOOR - s.steps * s.rise,
      end = s.x + stairWidth(s);
    // Fixed metal steps and handrails: the walking surface follows every step.
    for (let i = 0; i < s.steps; i++) {
      const y = FLOOR - (i + 1) * s.rise;
      for (const x of [s.x + i * s.tread, end - (i + 1) * s.tread]) {
        rect(x, y, s.tread, FLOOR - y, '#353a3d');
        rect(x, y, s.tread, 4, '#ffc600');
        line(x, y + 6, x, FLOOR, '#737879', 1);
      }
    }
    rect(s.x + run, top, s.deck, FLOOR - top, '#292e31');
    rect(s.x + run, top, s.deck, 6, '#ffc600');
    for (let x = s.x + run + 22; x < s.x + run + s.deck; x += 50)
      line(x, top + 15, x + 24, FLOOR - 12, '#454d50', 3);
    const rail = '#e7bb36';
    line(s.x, FLOOR - 53, s.x + run, top - 53, rail, 5);
    line(s.x + run, top - 53, s.x + run + s.deck, top - 53, rail, 5);
    line(s.x + run + s.deck, top - 53, end, FLOOR - 53, rail, 5);
    for (let i = 0; i <= s.steps; i += 2) {
      line(
        s.x + i * s.tread,
        FLOOR - i * s.rise - 53,
        s.x + i * s.tread,
        FLOOR - i * s.rise,
        rail,
        3,
      );
      line(
        end - i * s.tread,
        FLOOR - i * s.rise - 53,
        end - i * s.tread,
        FLOOR - i * s.rise,
        rail,
        3,
      );
    }
  }
  function render() {
    ctx.clearRect(0, 0, W, viewHeight);
    ctx.save();
    ctx.translate(0, viewHeight - H);
    rect(0, 0, W, H, '#525252');
    const bg = camera * 0.35;
    for (let i = -1; i < 9; i++) {
      const x = i * 180 - (bg % 180);
      rect(x, 0, 4, 335, '#3a3a3a');
      rect(x + 25, 25, 120, 54, '#93938c');
      rect(x + 28, 29, 114, 45, '#b7b7a5');
      line(x + 85, 28, x + 85, 74, '#68685f', 3);
      line(x + 26, 52, x + 144, 52, '#68685f', 2);
      rect(x + 42, 96, 89, 5, '#242424');
      rect(x + 57, 101, 59, 4, '#f3efcf');
    }
    rect(0, 303, W, 143, '#66665e');
    rect(0, 446, W, 94, '#303030');
    ctx.save();
    ctx.translate(-camera, 0);
    for (let r = 0; r < Math.ceil(WORLD / 292); r++) {
      const x = 80 + r * 292;
      rect(x, 145, 240, 211, '#41413d');
      for (let level = 0; level < 3; level++) {
        const y = 177 + level * 61;
        for (let col = 0; col < 4; col++)
          box(
            x + 13 + col * 55,
            y,
            48,
            40,
            level === 1 ? 'CERVEZA' : 'PREMIUM',
            r % 2 ? '#b4a779' : '#bab28a',
          );
        rect(x, y + 42, 240, 7, '#8b6949');
      }
      rect(x, 142, 9, 218, '#242424');
      rect(x + 231, 142, 9, 218, '#242424');
      rect(x, 140, 240, 10, '#242424');
      rect(x + 92, 143, 56, 18, '#ffc600');
      text(
        'A – ' + String(r + 1).padStart(2, '0'),
        x + 120,
        156,
        9,
        '#171717',
        'center',
      );
    }
    rect(0, 361, WORLD, 4, '#222222');
    rect(0, 451, WORLD, 5, '#ffc600');
    rect(0, 508, WORLD, 5, '#ffc600');
    for (let x = 36; x < WORLD; x += 132)
      for (let stripe = 0; stripe < 5; stripe++)
        rect(x + stripe * 12, 468, 7, 29, '#ffc600');
    for (const p of storage) {
      ctx.save();
      ctx.translate(0, -78);
      rect(p.x, p.y, p.w, p.h, '#a59363');
      for (let y = p.y; y < FLOOR - 5; y += 29)
        for (let x = p.x; x < p.x + p.w - 5; x += 36)
          box(x + 2, y + 2, 32, 25, '', '#b8a577');
      rect(p.x - 3, p.y, p.w + 6, 5, '#d2bf89');
      rect(p.x - 3, FLOOR - 7, p.w + 6, 7, '#756343');
      ctx.restore();
    }
    for (const c of crossings) {
      rect(c.x - stopWidth(), FLOOR, stopWidth() - 5, 62, '#ffc600');
      text('ALTO', c.x - stopWidth() / 2, 482, 15, '#181818', 'center');
      rect(c.x, 353, c.w, 166, '#242424');
      for (let y = 367; y < 511; y += 24) rect(c.x + 8, y, c.w - 16, 12, '#eeeee5');
      line(c.x - 3, 351, c.x - 3, 519, '#ffc600', 4);
      line(c.x + c.w + 3, 351, c.x + c.w + 3, 519, '#ffc600', 4);
      rect(c.x - 25, 278, 5, 110, '#292929');
      rect(c.x - 47, 250, 50, 40, '#171717');
      text(
        c.cleared ? 'PASA' : 'ALTO',
        c.x - 22,
        275,
        12,
        c.cleared ? '#d7f365' : '#ffc600',
        'center',
      );
      if (c.hold > 0 && !c.cleared) {
        rect(c.x - 113, 426, 103, 7, '#292929');
        rect(c.x - 113, 426, 103 * Math.min(1, c.hold / stopTime()), 7, '#ffc600');
      }
      if (c.cleared) {
        forklift(c.x + c.w - 5, 349, -1);
        text('DETENIDO', c.x + c.w - 5, 237, 9, '#b7ea91', 'center');
      } else if (crash !== c)
        forklift(
          c.x + c.w / 2 + Math.sin(time * (1.5 + Math.min(sector - 1, 10) * 0.3)) * 35,
          352,
          1,
        );
    }
    for (const coin of coins) {
      if (coin.collected || (coin.risky && !coin.active)) continue;
      ctx.fillStyle = coin.risky ? '#ffdd52' : '#ffd537';
      ctx.beginPath();
      ctx.arc(coin.x, coin.y, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = coin.risky ? '#ad3e27' : '#fff2b2';
      ctx.lineWidth = 3;
      ctx.stroke();
      text('$', coin.x, coin.y + 5, 15, '#6c4c00', 'center');
      if (coin.risky) {
        rect(coin.x - 40, coin.y - 59, 80, 30, '#ffc600');
        text(
          Math.max(0, coin.timeLeft).toFixed(1) + ' s',
          coin.x,
          coin.y - 38,
          19,
          '#111111',
          'center',
        );
      }
    }
    for (const token of focusTokens) {
      if (token.collected) continue;
      ctx.save();
      ctx.translate(token.x, token.y);
      ctx.rotate(time * 2);
      rect(-9, -9, 18, 18, '#ffc600');
      rect(-5, -5, 10, 10, '#fff0a0');
      ctx.restore();
    }
    pallets.forEach(pallet);
    hazards.forEach(drawHazard);
    stairs.forEach(drawStairs);
    workers
      .filter((w) => w.id === 'nearForklift')
      .forEach((w) => forklift(w.x + 100, FLOOR, -1));
    workers.forEach(drawWorker);
    character();
    drawIncident();
    if (state === 'dying' && crash)
      forklift(player.x - 100 + (0.9 - deathTime) * 290, FLOOR, 1);
    ctx.restore();
    ctx.restore();
    if (W >= 440) {
      rect(20, 19, 187, 35, '#181818ec');
      text('RUTA PEATONAL', 30, 34, 10, '#ffc600');
      text('ALMACÉN 07 / DISTRIBUCIÓN', 30, 47, 8, '#e6e6dc');
    }
    rect(W - 205, 22, 177, 33, '#181818ec');
    text(
      'DISTANCIA ' + Math.floor(((sector - 1) * WORLD + player.x) / 50) + ' m',
      W - 194,
      35,
      8,
      '#ffc600',
    );
    rect(W - 194, 43, 154, 3, '#5e5e56');
    rect(W - 194, 43, 154 * Math.min(1, player.x / (WORLD - 70)), 3, '#ffc600');
  }
  function resize() {
    const bounds = canvas.getBoundingClientRect();
    if (!bounds.height || !bounds.width) return;
    viewHeight = bounds.height < 300 && bounds.width > bounds.height ? 360 : H;
    W = (viewHeight * bounds.width) / bounds.height;
    const density = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.round(bounds.width * density),
      height = Math.round(bounds.height * density);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    ctx.setTransform(width / W, 0, 0, height / viewHeight, 0, 0);
    camera = Math.max(0, Math.min(WORLD - W, player.x - W * 0.3));
  }
  window.addEventListener('resize', () => {
    clearKeys();
    resize();
  });
  window.visualViewport?.addEventListener('resize', resize);
  if (typeof ResizeObserver !== 'undefined')
    new ResizeObserver(resize).observe(document.querySelector('.stage'));
  function frame(now) {
    const dt = Math.min((now - last) / 1000 || 0, 0.035);
    last = now;
    update(dt);
    render();
    requestAnimationFrame(frame);
  }
  reset();
  requestAnimationFrame(frame);
  resize();
})();
