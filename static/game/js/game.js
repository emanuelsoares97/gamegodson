const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const gameTitle = document.getElementById('gameTitle');
const gameSubtitle = document.getElementById('gameSubtitle');
const chapterBadge = document.getElementById('chapterBadge');
const questTitle = document.getElementById('questTitle');
const questObjective = document.getElementById('questObjective');
const levelText = document.getElementById('levelText');
const hpText = document.getElementById('hpText');
const xpText = document.getElementById('xpText');
const atkDefText = document.getElementById('atkDefText');
const hpFill = document.getElementById('hpFill');
const xpFill = document.getElementById('xpFill');
const goldText = document.getElementById('goldText');
const potionText = document.getElementById('potionText');

const dialog = document.getElementById('dialog');
const dialogName = document.getElementById('dialogName');
const dialogText = document.getElementById('dialogText');
const dialogPortrait = document.getElementById('dialogPortrait');

const cutscene = document.getElementById('cutscene');
const cutsceneImage = document.getElementById('cutsceneImage');
const cutsceneTitle = document.getElementById('cutsceneTitle');
const cutsceneText = document.getElementById('cutsceneText');
const cutsceneButton = document.getElementById('cutsceneButton');

let DATA = null;
let currentMap = null;
let currentQuest = null;
let flags = {};
let keys = {};
let frame = 0;
let dialogQueue = [];
let dialogSpeaker = null;
let cutsceneQueue = [];
let powerEvent = null;
let floatingMessages = [];
let battle = null;
let battleMessage = '';
let battleLog = [];
let battleFlash = 0;
let battleEffects = [];
let shop = null;
let quickEvent = null;
let battleTimeout = null;
const BATTLE_ACTION_DELAY = 500;

const player = {
  gridX: 8,
  gridY: 8,
  x: 8 * 32,
  y: 8 * 32,
  targetX: 8 * 32,
  targetY: 8 * 32,
  speed: 4,
  moving: false,
  direction: 'down',
  colors: {
    body: '#2563eb',
    accent: '#dbeafe',
    skin: '#6b3f2a',
    hair: '#111827',
  },
  stats: {
    level: 1,
    xp: 0,
    xpToNext: 50,
    hp: 35,
    maxHp: 35,
    attack: 5,
    defense: 2,
  },
  gold: 0,
  inventory: {
    potion: 2,
    lightShard: 0,
  },
};



function maxStaffEnergy() {
  return 3 + Math.max(0, Math.floor((player.stats.level || 1) / 4));
}

function getStaffEnergy() {
  if (typeof flags.staffEnergy !== 'number') flags.staffEnergy = maxStaffEnergy();
  flags.staffEnergy = Math.max(0, Math.min(maxStaffEnergy(), flags.staffEnergy));
  return flags.staffEnergy;
}

function setStaffEnergy(value) {
  flags.staffEnergy = Math.max(0, Math.min(maxStaffEnergy(), value));
}

function rechargeStaffEnergy(amount = 1) {
  const before = getStaffEnergy();
  setStaffEnergy(before + amount);
  return getStaffEnergy() - before;
}

function consumeStaffEnergy(amount) {
  const current = getStaffEnergy();
  if (current < amount) return false;
  setStaffEnergy(current - amount);
  return true;
}

function getRespawnFlags() {
  if (!flags.enemyRespawns || typeof flags.enemyRespawns !== 'object') {
    flags.enemyRespawns = {};
  }
  return flags.enemyRespawns;
}

function isEnemyRespawning(object) {
  if (!object?.key || !object.respawnSeconds) return false;
  const respawns = getRespawnFlags();
  const availableAt = Number(respawns[object.key] || 0);
  if (!availableAt) return false;
  if (Date.now() >= availableAt) {
    delete respawns[object.key];
    flags[`enemy_${object.key}_defeated`] = false;
    saveProgress();
    return false;
  }
  return true;
}

function secondsUntilRespawn(object) {
  if (!object?.key || !object.respawnSeconds) return 0;
  const availableAt = Number(getRespawnFlags()[object.key] || 0);
  return Math.max(0, Math.ceil((availableAt - Date.now()) / 1000));
}

function isEnemyTemporarilyDefeated(object) {
  if (!object?.key) return false;
  if (!flags[`enemy_${object.key}_defeated`]) return false;
  if (object.respawnSeconds) return isEnemyRespawning(object);
  return true;
}

function enemyAllowedForCurrentQuest(object) {
  const requiredQuest = object.questKey || (object.type === 'light_target' ? 'staff_precision_trial' : 'forest_hunt');
  if (currentQuest?.key === requiredQuest) return true;
  if (requiredQuest === 'mirlon_prepare' && currentQuest?.key === 'public_battle_mirlon') return true;
  if (requiredQuest === 'elranor_farm' && ['outer_elranor_watch', 'elranor_gate_warning', 'break_elranor_seal'].includes(currentQuest?.key)) return true;
  return false;
}

let npcs = [];

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return '';
}

function apiPost(url, payload = {}) {
  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCookie('csrftoken'),
    },
    body: JSON.stringify(payload),
  });
}

async function loadGame() {
  const response = await fetch('/api/bootstrap/');
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Não foi possível carregar o jogo.');
  }

  DATA = await response.json();
  if (gameTitle) gameTitle.textContent = DATA.game.title;
  if (gameSubtitle) gameSubtitle.textContent = DATA.game.subtitle;

  const firstChapter = DATA.chapters[0];
  if (chapterBadge) chapterBadge.textContent = `Capítulo ${firstChapter.order}`;

  flags = DATA.save.flags || {};
  if (typeof flags.staffEnergy !== 'number') flags.staffEnergy = maxStaffEnergy();
  currentMap = DATA.maps[DATA.save.currentMapKey] || Object.values(DATA.maps)[0];
  currentQuest = DATA.quests[DATA.save.currentQuestKey] || Object.values(DATA.quests).sort((a, b) => a.order - b.order)[0];

  const tile = currentMap.tileSize;
  player.gridX = DATA.save.playerX ?? currentMap.startX;
  player.gridY = DATA.save.playerY ?? currentMap.startY;
  player.x = player.gridX * tile;
  player.y = player.gridY * tile;
  player.targetX = player.x;
  player.targetY = player.y;

  player.stats = {
    ...player.stats,
    ...(DATA.save.stats || {}),
  };
  player.gold = DATA.save.gold ?? player.gold;
  player.inventory = {
    ...player.inventory,
    ...(DATA.save.inventory || {}),
  };

  const denzel = DATA.characters.denzel;
  if (denzel) {
    player.name = denzel.name;
    player.role = denzel.role;
    player.portrait = denzel.portrait;
    player.spriteKey = denzel.spriteKey;
    player.colors.body = denzel.colorPrimary || player.colors.body;
    player.colors.accent = denzel.colorSecondary || player.colors.accent;
    player.colors.skin = denzel.skinColor || player.colors.skin;
    player.colors.hair = denzel.hairColor || player.colors.hair;
  }

  applyQuestMapTransition({ resetPosition: false });
  buildNpcs();
  refreshQuestPanel();
  refreshStatsPanel();
  maybeShowStartingCutscene();
  requestAnimationFrame(loop);
}

function buildNpcs() {
  npcs = [];

  for (const placement of currentMap.npcs) {
    if (!isNpcVisible(placement)) continue;

    const character = DATA.characters[placement.characterKey];
    if (!character) continue;

    npcs.push({
      characterKey: placement.characterKey,
      name: character.name,
      role: character.role,
      portrait: character.portrait,
      gridX: placement.x,
      gridY: placement.y,
      x: placement.x * currentMap.tileSize,
      y: placement.y * currentMap.tileSize,
      targetX: placement.x * currentMap.tileSize,
      targetY: placement.y * currentMap.tileSize,
      moving: false,
      speed: 2,
      direction: placement.direction || 'down',
      spriteKey: character.spriteKey || 'villager',
      wander: placement.wander,
      movementBounds: placement.movementBounds || {},
      colors: {
        body: character.colorPrimary || '#be185d',
        accent: character.colorSecondary || '#f9a8d4',
        skin: character.skinColor || '#7c4a32',
        hair: character.hairColor || (character.kind === 'support' ? '#e5e7eb' : '#111827'),
      },
    });
  }
}

function isNpcVisible(placement) {
  const questOrder = currentQuest?.order ?? 1;

  if (placement.visibleFromQuest) {
    const minQuest = DATA.quests[placement.visibleFromQuest];
    if (minQuest && questOrder < minQuest.order) return false;
  }

  if (placement.hiddenAfterQuest) {
    const maxQuest = DATA.quests[placement.hiddenAfterQuest];
    if (maxQuest && questOrder > maxQuest.order) return false;
  }

  return true;
}

function refreshQuestPanel() {
  if (!currentQuest) return;
  questTitle.textContent = currentQuest.title;
  questObjective.textContent = currentQuest.objective;
}

function refreshStatsPanel() {
  const s = player.stats;
  if (!s) return;

  if (levelText) levelText.textContent = `Nível ${s.level}`;
  if (hpText) hpText.textContent = `HP ${s.hp}/${s.maxHp}`;
  if (xpText) xpText.textContent = `XP ${s.xp}/${s.xpToNext}`;
  if (atkDefText) atkDefText.textContent = `ATK ${s.attack} · DEF ${s.defense}`;
  if (goldText) goldText.textContent = `${player.gold} ouro`;
  if (potionText) potionText.textContent = `Poções: ${player.inventory.potion || 0} · Energia cajado: ${getStaffEnergy()}/${maxStaffEnergy()} · Fragmentos: ${player.inventory.lightShard || 0}`;

  if (hpFill) hpFill.style.width = `${Math.max(0, Math.min(100, (s.hp / s.maxHp) * 100))}%`;
  if (xpFill) xpFill.style.width = `${Math.max(0, Math.min(100, (s.xp / s.xpToNext) * 100))}%`;
}

function maybeShowStartingCutscene() {
  const startCutscenes = (currentQuest.cutscenes || []).filter(c => c.showWhenQuestStarts);
  const unseen = startCutscenes.filter(c => !flags[`cutscene_${c.key}`]);
  if (unseen.length) {
    queueCutscenes(unseen);
  }
}

function queueCutscenes(items) {
  const wasOpen = isCutsceneOpen();
  cutsceneQueue.push(...items);
  if (!wasOpen) {
    showNextCutscene();
  }
}

function showNextCutscene() {
  if (cutsceneQueue.length === 0) {
    cutscene.classList.add('hidden');
    return;
  }

  const item = cutsceneQueue.shift();
  flags[`cutscene_${item.key}`] = true;
  cutsceneTitle.textContent = item.title;
  cutsceneText.textContent = item.text;

  if (item.image) {
    cutsceneImage.src = item.image;
    cutsceneImage.classList.remove('hidden');
  } else {
    cutsceneImage.classList.add('hidden');
  }

  cutscene.classList.remove('hidden');
  saveProgress();
}

cutsceneButton.addEventListener('click', showNextCutscene);

function isDialogOpen() {
  return !dialog.classList.contains('hidden');
}

function isCutsceneOpen() {
  return !cutscene.classList.contains('hidden');
}

function openDialog(speaker, lines) {
  dialogSpeaker = speaker;
  dialogQueue = [...lines];
  showNextDialogLine();
}

function showNextDialogLine() {
  if (!dialogQueue.length) {
    closeDialog();
    return;
  }

  const item = dialogQueue.shift();
  dialogName.textContent = dialogSpeaker.name;
  dialogText.textContent = item.text;

  if (dialogSpeaker.portrait) {
    dialogPortrait.src = dialogSpeaker.portrait;
    dialogPortrait.classList.remove('hidden');
  } else {
    dialogPortrait.classList.add('hidden');
  }

  dialog.classList.remove('hidden');

  if (item.advancesToNextQuest && !dialogQueue.length) {
    dialog.dataset.advanceAfterClose = '1';
  }
}

function closeDialog() {
  const shouldAdvance = dialog.dataset.advanceAfterClose === '1';
  dialog.classList.add('hidden');
  dialogQueue = [];
  dialogSpeaker = null;
  dialog.dataset.advanceAfterClose = '';

  if (shouldAdvance) {
    advanceQuest();
  }
}

function advanceQuest() {
  if (!currentQuest?.nextQuestKey) return;

  const completedQuest = currentQuest;

  if (completedQuest.key === 'accept_call') {
    flags.has_staff = true;
  }

  const completedCutscenes = (completedQuest.cutscenes || []).filter(c => c.showWhenQuestCompletes);
  if (completedCutscenes.length) {
    queueCutscenes(completedCutscenes);
  }

  flags[`quest_${completedQuest.key}_done`] = true;
  currentQuest = DATA.quests[completedQuest.nextQuestKey];

  // Quando versões antigas deixaram missões técnicas como 'Fim da versão',
  // salta automaticamente para a próxima missão real sem obrigar refresh/reset.
  let safety = 0;
  while (currentQuest && (currentQuest.key === 'v14_done' || currentQuest.key === 'v15_done' || currentQuest.key === 'v16_done' || currentQuest.key === 'v18_done' || currentQuest.key === 'v19_done' || currentQuest.key === 'v21_done' || currentQuest.key === 'v22_done' || currentQuest.title?.toLowerCase().startsWith('fim da versão')) && currentQuest.nextQuestKey && safety < 10) {
    flags[`quest_${currentQuest.key}_done`] = true;
    currentQuest = DATA.quests[currentQuest.nextQuestKey];
    safety++;
  }

  applyQuestMapTransition({ resetPosition: true });
  buildNpcs();
  refreshQuestPanel();
  refreshStatsPanel();
  maybeShowStartingCutscene();
  saveProgress();
}

function targetMapKeyForQuest(questKey) {
  if (['training_intro', 'first_training', 'first_combat', 'forest_hunt', 'prepare_journey', 'return_to_sage', 'demo_done', 'staff_mastery_intro', 'staff_precision_trial', 'vision_of_ruin', 'staff_mastery_done', 'spiritual_training_intro', 'prayer_trial', 'declared_son_owner', 'return_aldara_trained'].includes(questKey)) {
    return 'floresta_treino';
  }
  if (['find_nilzin', 'heal_nilzin', 'mirlon_road'].includes(questKey)) {
    return 'aldara';
  }
  if (['enter_mirlon', 'mirlon_prepare', 'public_battle_mirlon', 'mirlon_after_battle', 'road_after_mirlon', 'v14_done', 'v15_done', 'v16_done'].includes(questKey)) {
    return 'mirlon';
  }
  if (['road_to_elranor', 'survivor_camp', 'elranor_warning', 'approach_elranor', 'outer_elranor_watch', 'elranor_gate_warning', 'break_elranor_seal', 'v18_done', 'v19_done', 'v21_done', 'v22_done'].includes(questKey)) {
    return 'estrada_elranor';
  }
  if (['enter_shadow_valley', 'physical_training', 'figure_in_black'].includes(questKey)) {
    return 'vale_sombras';
  }
  return 'aldara';
}

function applyQuestMapTransition({ resetPosition = false } = {}) {
  if (!DATA || !currentQuest) return false;

  const targetKey = targetMapKeyForQuest(currentQuest.key);
  const targetMap = DATA.maps[targetKey];
  if (!targetMap) return false;

  if (currentMap?.key === targetKey) return false;

  currentMap = targetMap;

  if (resetPosition || player.gridX == null || player.gridY == null) {
    player.gridX = currentMap.startX;
    player.gridY = currentMap.startY;
  }

  player.x = player.gridX * currentMap.tileSize;
  player.y = player.gridY * currentMap.tileSize;
  player.targetX = player.x;
  player.targetY = player.y;
  player.moving = false;

  return true;
}

function saveProgress() {
  apiPost('/api/save/', {
    currentMapKey: currentMap.key,
    currentQuestKey: currentQuest.key,
    playerX: player.gridX,
    playerY: player.gridY,
    stats: player.stats,
    gold: player.gold,
    inventory: player.inventory,
    flags,
  }).catch(() => {});
}

async function resetProgress() {
  await apiPost('/api/reset/').catch(() => {});
  window.location.reload();
}

document.addEventListener('keydown', (event) => {
  // Evita que espaço/setas façam scroll na página em modo fullscreen.
  if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key) || ['Numpad1', 'Numpad2', 'Numpad3', 'Numpad4'].includes(event.code)) {
    event.preventDefault();
  }

  keys[event.key] = true;

  if (quickEvent?.active) {
    handleQuickEventInput(event);
    return;
  }

  if (shop?.active) {
    handleShopInput(event);
    return;
  }

  if (battle?.active) {
    handleBattleInput(event);
    return;
  }

  const input = getInputDirectionFromKey(event.key);
  if (input && !isDialogOpen() && !isCutsceneOpen() && !powerEvent?.active) {
    event.preventDefault();
    // Resposta imediata: ao tocar no WASD/setas, Denzel vira logo nessa direção,
    // mesmo antes de começar o próximo passo da grelha.
    player.direction = input.dir;
  }

  if (event.key === ' ' && isDialogOpen()) {
    event.preventDefault();
    showNextDialogLine();
  }

  if (event.key === ' ' && isCutsceneOpen()) {
    event.preventDefault();
    showNextCutscene();
  }

  if ((event.key === 'e' || event.key === 'E') && !isDialogOpen() && !isCutsceneOpen() && !powerEvent?.active) {
    interact();
  }

  if (event.key === 'r' || event.key === 'R') {
    resetProgress();
  }
});

document.addEventListener('keyup', (event) => {
  keys[event.key] = false;
});

function loop() {
  frame++;
  update();
  draw();
  requestAnimationFrame(loop);
}

function update() {
  if (!DATA) return;

  if (powerEvent?.active) {
    updatePowerEvent();
    return;
  }

  if (quickEvent?.active) {
    updateQuickEvent();
    updateFloatingMessages();
    updateBattleEffects();
    return;
  }

  if (shop?.active) {
    updateFloatingMessages();
    return;
  }

  if (battle?.active) {
    updateFloatingMessages();
    updateBattleEffects();
    if (battleFlash > 0) battleFlash--;
    return;
  }

  updatePlayer();
  updateNpcs();
  checkEnemyAggroRange();
  updateBattleEffects();
  updateFloatingMessages();
}

function getInputDirectionFromKey(key) {
  if (key === 'ArrowUp' || key === 'w' || key === 'W') return { dx: 0, dy: -1, dir: 'up' };
  if (key === 'ArrowDown' || key === 's' || key === 'S') return { dx: 0, dy: 1, dir: 'down' };
  if (key === 'ArrowLeft' || key === 'a' || key === 'A') return { dx: -1, dy: 0, dir: 'left' };
  if (key === 'ArrowRight' || key === 'd' || key === 'D') return { dx: 1, dy: 0, dir: 'right' };
  return null;
}

function getHeldInputDirection() {
  // Prioridade simples: a última direção visível fica natural para RPG top-down.
  // Como o keydown já vira o personagem na hora, aqui basta decidir o próximo passo.
  if (keys.ArrowUp || keys.w || keys.W) return { dx: 0, dy: -1, dir: 'up' };
  if (keys.ArrowDown || keys.s || keys.S) return { dx: 0, dy: 1, dir: 'down' };
  if (keys.ArrowLeft || keys.a || keys.A) return { dx: -1, dy: 0, dir: 'left' };
  if (keys.ArrowRight || keys.d || keys.D) return { dx: 1, dy: 0, dir: 'right' };
  return null;
}

function updatePlayer() {
  updateMovement(player);

  if (isDialogOpen() || isCutsceneOpen()) return;

  const input = getHeldInputDirection();
  if (input) {
    player.direction = input.dir;
  }

  if (player.moving) return;
  if (!input) return;

  attemptMove(player, input.dx, input.dy, input.dir);
}

function updateNpcs() {
  for (const npc of npcs) {
    updateMovement(npc);

    if (!npc.wander || npc.moving || isDialogOpen() || isCutsceneOpen()) continue;
    if (frame % 110 !== 0) continue;
    if (Math.random() < 0.45) continue;

    const dirs = [
      { dx: 0, dy: -1, dir: 'up' },
      { dx: 0, dy: 1, dir: 'down' },
      { dx: -1, dy: 0, dir: 'left' },
      { dx: 1, dy: 0, dir: 'right' },
    ];
    const choice = dirs[Math.floor(Math.random() * dirs.length)];
    const nx = npc.gridX + choice.dx;
    const ny = npc.gridY + choice.dy;

    const b = npc.movementBounds;
    if (Object.keys(b).length) {
      if (nx < b.minX || nx > b.maxX || ny < b.minY || ny > b.maxY) continue;
    }

    attemptMove(npc, choice.dx, choice.dy, choice.dir);
  }
}

function updateMovement(entity) {
  if (!entity.moving) return;

  const dx = entity.targetX - entity.x;
  const dy = entity.targetY - entity.y;

  if (Math.abs(dx) <= entity.speed && Math.abs(dy) <= entity.speed) {
    entity.x = entity.targetX;
    entity.y = entity.targetY;
    entity.gridX = Math.round(entity.x / currentMap.tileSize);
    entity.gridY = Math.round(entity.y / currentMap.tileSize);
    entity.moving = false;

    if (entity === player) {
      handleTileEvents();
      saveProgress();
    }
    return;
  }

  if (dx !== 0) entity.x += Math.sign(dx) * entity.speed;
  if (dy !== 0) entity.y += Math.sign(dy) * entity.speed;
}

function attemptMove(entity, dx, dy, direction) {
  entity.direction = direction;

  const nx = entity.gridX + dx;
  const ny = entity.gridY + dy;
  if (isBlocked(nx, ny, entity)) return;

  entity.targetX = nx * currentMap.tileSize;
  entity.targetY = ny * currentMap.tileSize;
  entity.moving = true;
}

function isMapObjectVisible(object) {
  if (!object) return false;

  if (object.type === 'training_shadow') {
    return currentQuest?.key === 'first_combat' && !flags.training_shadow_defeated;
  }

  if (object.type === 'forest_enemy') {
    return enemyAllowedForCurrentQuest(object) && !isEnemyTemporarilyDefeated(object);
  }

  if (object.type === 'light_target') {
    return enemyAllowedForCurrentQuest(object) && !isEnemyTemporarilyDefeated(object);
  }

  if (object.type === 'vision_stone') {
    return currentQuest?.key === 'vision_of_ruin';
  }

  if (object.type === 'prayer_altar') {
    return currentQuest?.key === 'prayer_trial' && !flags[`prayer_${object.key}_done`];
  }

  if (['return_aldara_gate', 'nilzin_survivor', 'nilzin_heal', 'mirlon_gate', 'story_marker', 'mirlon_boss_gate', 'mirlon_minor_demon', 'map_exit'].includes(object.type)) {
    return !object.questKey || currentQuest?.key === object.questKey;
  }

  if (object.questKey && currentQuest?.key !== object.questKey) return false;

  return true;
}

function isBlocked(x, y, entity = null) {
  if (!currentMap) return true;
  if (x < 0 || x >= currentMap.width || y < 0 || y >= currentMap.height) return true;

  const tile = currentMap.mapData.tiles[y]?.[x];
  if ([1, 3, 4, 7, 8].includes(tile)) return true;

  for (const house of currentMap.mapData.houses || []) {
    const inside = x >= house.x && x < house.x + house.w && y >= house.y && y < house.y + house.h;
    const isDoor = x === house.doorX && y === house.doorY;
    if (inside && !isDoor) return true;
  }

  for (const obj of currentMap.mapData.objects || []) {
    if (!isMapObjectVisible(obj)) continue;
    if (obj.solid && obj.x === x && obj.y === y) return true;
  }

  if (entity !== player && player.gridX === x && player.gridY === y) return true;

  for (const npc of npcs) {
    if (npc !== entity && npc.gridX === x && npc.gridY === y) return true;
  }

  return false;
}

function getFacingTile() {
  let x = player.gridX;
  let y = player.gridY;

  if (player.direction === 'up') y--;
  if (player.direction === 'down') y++;
  if (player.direction === 'left') x--;
  if (player.direction === 'right') x++;

  return { x, y };
}

function getInteractionTiles() {
  const facing = getFacingTile();
  const adjacent = [
    facing,
    { x: player.gridX, y: player.gridY - 1 },
    { x: player.gridX, y: player.gridY + 1 },
    { x: player.gridX - 1, y: player.gridY },
    { x: player.gridX + 1, y: player.gridY },
    { x: player.gridX, y: player.gridY },
  ];

  const unique = [];
  for (const tile of adjacent) {
    if (!unique.some(t => t.x === tile.x && t.y === tile.y)) {
      unique.push(tile);
    }
  }
  return unique;
}

function interact() {
  const tiles = getInteractionTiles();

  const npc = npcs.find(n => tiles.some(t => n.gridX === t.x && n.gridY === t.y));
  if (npc) {
    const lines = getDialogueForNpc(npc);
    openDialog(npc, lines);
    return;
  }

  const object = findInteractableObject(tiles);
  const shouldHandleObject = object && (object.type !== 'home_ruins' || currentQuest.key === 'find_father');
  if (shouldHandleObject) {
    faceObject(object);
    handleObjectInteraction(object);
    return;
  }

  const house = (currentMap.mapData.houses || []).find(h => tiles.some(t => h.doorX === t.x && h.doorY === t.y));
  if (house) {
    openDialog({ name: house.name, portrait: '' }, [{ text: 'A porta está fechada por agora. Mais tarde podemos criar interiores para cada casa.' }]);
  }
}

function getDialogueForNpc(npc) {
  const lines = DATA.dialogues[npc.characterKey]?.[currentQuest.key];
  if (lines?.length) return lines;

  return [{ text: 'Ainda não tenho novas falas para esta missão.' }];
}

function handleObjectInteraction(object) {
  if (object.type === 'sign') {
    openDialog({ name: 'Placa', portrait: '' }, [{ text: object.text }]);
    return;
  }

  if (object.type === 'campfire') {
    const recovered = Math.min(player.stats.maxHp, player.stats.hp + 8);
    player.stats.hp = recovered;
    refreshStatsPanel();
    saveProgress();
    openDialog({ name: object.name || 'Fogueira', portrait: '' }, [{ text: `${object.text} Recuperaste algum HP.` }]);
    return;
  }

  if (object.type === 'training_crystal') {
    handleTrainingCrystal();
    return;
  }

  if (object.type === 'training_shadow') {
    handleTrainingShadow(object);
    return;
  }

  if (object.type === 'forest_enemy' || object.type === 'light_target') {
    handleForestEnemy(object);
    return;
  }

  if (object.type === 'vision_stone') {
    handleVisionStone(object);
    return;
  }

  if (object.type === 'healer_shop') {
    handleHealerShop(object);
    return;
  }

  if (object.type === 'north_gate') {
    handleNorthGate(object);
    return;
  }

  if (object.type === 'home_ruins' && currentQuest.key === 'find_father') {
    const father = DATA.characters.pai;
    openDialog(
      { name: father?.name || 'Pai de Denzel', portrait: father?.portrait || '' },
      [
        { text: 'Denzel... eles levaram o teu irmão... levaram Lurei...', advancesToNextQuest: false },
        { text: 'Tens de fugir para a floresta. Procura o Velho Sábio. Ele saberá o que fazer.', advancesToNextQuest: true },
      ]
    );
    return;
  }

  if (object.type === 'prayer_altar') {
    handlePrayerAltar(object);
    return;
  }

  if (object.type === 'return_aldara_gate') {
    handleReturnToAldara();
    return;
  }

  if (object.type === 'nilzin_survivor') {
    const nilzin = DATA.characters.nilzin || { name: 'Sobrevivente', portrait: '' };
    openDialog(nilzin, [
      { text: 'Água... por favor...' },
      { text: 'Denzel ajoelha-se junto dela. A luz do cajado começa a aquecer-lhe as mãos.', advancesToNextQuest: true },
    ]);
    return;
  }

  if (object.type === 'nilzin_heal') {
    const nilzin = DATA.characters.nilzin || { name: 'Nilzin', portrait: '' };
    addBattleEffect('heal', { x: object.x * 32 + 16, y: object.y * 32 + 10, life: 60 });
    flags.nilzin_healed = true;
    saveProgress();
    openDialog(nilzin, [
      { text: 'Quem... és tu?' },
      { text: 'Essa luz... esse cajado...' },
      { text: 'Tu és... o Filho do Dono?', advancesToNextQuest: true },
    ]);
    return;
  }

  if (object.type === 'mirlon_gate') {
    openDialog({ name: object.name || 'Estrada para Mirlon', portrait: '' }, [
      { text: 'Denzel olha para a estrada. À distância, vê fumo sobre outra aldeia.' },
      { text: 'O cajado brilha com mais força. Mirlon precisa de ajuda agora.', advancesToNextQuest: true },
    ]);
    return;
  }

  if (object.type === 'mirlon_boss_gate') {
    handleMirlonBossGate(object);
    return;
  }

  if (object.type === 'story_marker') {
    const lines = [{ text: object.text || 'Denzel observa o caminho à sua frente.' }];
    if (object.nextText) {
      lines.push({ text: object.nextText, advancesToNextQuest: !object.noAdvance });
    } else if (!object.noAdvance) {
      lines.push({ text: 'A missão continua.', advancesToNextQuest: true });
    }
    openDialog({ name: object.name || 'Evento', portrait: '' }, lines);
    return;
  }

  if (object.type === 'map_exit') {
    if (object.targetMap === 'trilho_mirlon') {
      switchMap('trilho_mirlon', 4, 7);
      addFloatingMessage('Trilho de treino', player.x + 18, player.y - 18, '#fde68a');
      return;
    }
    if (object.text) {
      openDialog({ name: object.name || 'Saída', portrait: '' }, [{ text: object.text }]);
      return;
    }
  }

  if (object.text) {
    openDialog({ name: object.name || 'Objeto', portrait: '' }, [{ text: object.text }]);
  }
}


function handleMirlonBossGate(object) {
  if (currentQuest.key !== 'mirlon_prepare') return;
  const required = object.requiredLevel || 7;
  const lines = [];

  if (player.stats.level < required) {
    lines.push({ text: `O demónio principal está no topo da aldeia. Ele é nível ${required}, e Denzel está no nível ${player.stats.level}.` });
    lines.push({ text: 'Podes tentar lutar agora, mas o risco é alto. Se caíres, a luz do cajado vai recuar-te para um ponto seguro.' });
    lines.push({ text: 'Para upar primeiro, segue a seta dourada na saída leste de Mirlon e entra no Trilho Sombrio.', advancesToNextQuest: true });
  } else {
    lines.push({ text: 'Denzel aperta o Cajado Sagrado. A luz já não treme.' });
    lines.push({ text: 'No topo da aldeia, o demónio principal vira-se lentamente. Chegou a hora da primeira batalha pública.', advancesToNextQuest: true });
  }

  openDialog({ name: object.name || 'Demónio da Praça', portrait: '' }, lines);
}


function handlePrayerAltar(object) {
  if (currentQuest.key !== 'prayer_trial') return;

  flags[`prayer_${object.key}_done`] = true;
  const done = ['prayer_altar_1', 'prayer_altar_2', 'prayer_altar_3']
    .filter(key => flags[`prayer_${key}_done`]).length;

  addFloatingMessage(`${done}/3`, object.x * 32 + 16, object.y * 32 - 4, '#fde68a');
  saveProgress();

  const lines = [
    { text: 'Denzel pousa a mão no altar. A luz do cajado fica calma, quase silenciosa.' },
    { text: `Altar ativado: ${done}/3.` },
  ];

  if (done >= 3) {
    lines.push({ text: 'Os três altares respondem. A força de Denzel parece mais firme, menos impulsiva.', advancesToNextQuest: true });
  } else {
    lines.push({ text: 'Ainda faltam altares de oração na clareira.' });
  }

  openDialog({ name: object.name || 'Altar de Oração', portrait: '' }, lines);
}

function handleReturnToAldara() {
  if (currentQuest.key !== 'return_aldara_trained') return;
  openDialog({ name: 'Passagem para Aldara', portrait: '' }, [
    { text: 'Três anos passaram desde o ataque. Denzel respira fundo antes de voltar às ruínas.' },
    { text: 'Ele já não é o mesmo rapaz que fugiu naquela noite.', advancesToNextQuest: true },
  ]);
}

function handleTrainingCrystal() {
  if (currentQuest.key !== 'first_training') {
    openDialog({ name: 'Cristal de Treino', portrait: '' }, [
      { text: 'O cristal ainda está silencioso. Fala primeiro com o Velho Sábio.' },
    ]);
    return;
  }

  if (flags.first_training_completed) {
    openDialog({ name: 'Cristal de Treino', portrait: '' }, [
      { text: 'O cristal continua a brilhar, mas este treino já foi concluído.' },
    ]);
    return;
  }

  const beforeLevel = player.stats.level;
  player.stats.hp = Math.max(1, player.stats.hp - 6);
  const result = gainXp(60);
  flags.first_training_completed = true;
  addFloatingMessage('+60 XP', player.x + 12, player.y - 6, '#fde68a');

  const lines = [
    { text: 'Denzel ergue o cajado. O cristal responde com uma luz quente.' },
    { text: 'A energia atravessa-lhe o corpo. O treino custa HP, mas fortalece a sua luz.' },
    { text: `Ganhaste 60 XP. HP atual: ${player.stats.hp}/${player.stats.maxHp}.` },
  ];

  if (result.leveledUp) {
    lines.push({ text: `Subiste para o nível ${player.stats.level}! HP, Ataque e Defesa aumentaram.` });
    addFloatingMessage(`NÍVEL ${player.stats.level}!`, player.x - 4, player.y - 22, '#facc15');
  } else if (beforeLevel === player.stats.level) {
    lines.push({ text: `Faltam ${player.stats.xpToNext - player.stats.xp} XP para o próximo nível.` });
  }

  lines.push({ text: 'O Velho Sábio observa em silêncio. O primeiro passo foi dado.', advancesToNextQuest: true });

  refreshStatsPanel();
  saveProgress();
  openDialog({ name: 'Cristal de Treino', portrait: '' }, lines);
}

function gainXp(amount) {
  const stats = player.stats;
  stats.xp += amount;

  let leveledUp = false;
  while (stats.xp >= stats.xpToNext) {
    stats.xp -= stats.xpToNext;
    stats.level += 1;
    stats.xpToNext = Math.round(stats.xpToNext * 1.55);
    stats.maxHp += 8;
    stats.hp = stats.maxHp;
    stats.attack += 2;
    stats.defense += 1;
    setStaffEnergy(maxStaffEnergy());
    leveledUp = true;
  }

  return { leveledUp };
}

function addFloatingMessage(text, x, y, color = '#fff') {
  floatingMessages.push({ text, x, y, color, life: 70 });
}

function updateFloatingMessages() {
  floatingMessages = floatingMessages
    .map(item => ({ ...item, y: item.y - 0.35, life: item.life - 1 }))
    .filter(item => item.life > 0);
}

function addBattleEffect(type, options = {}) {
  battleEffects.push({ type, life: options.life || 28, maxLife: options.life || 28, ...options });
}

function updateBattleEffects() {
  battleEffects = battleEffects
    .map(effect => ({ ...effect, life: effect.life - 1 }))
    .filter(effect => effect.life > 0);
}

function drawBattleEffects() {
  if (!battleEffects.length) return;

  ctx.save();
  for (const effect of battleEffects) {
    const progress = 1 - (effect.life / effect.maxLife);
    const alpha = Math.max(0, Math.min(1, effect.life / effect.maxLife));

    if (effect.type === 'slash') {
      ctx.strokeStyle = `rgba(255, 243, 196, ${alpha})`;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(effect.x + progress * 30, effect.y - 18 + progress * 22);
      ctx.lineTo(effect.x + 38 - progress * 18, effect.y + 22 - progress * 14);
      ctx.stroke();
    }

    if (effect.type === 'light_beam') {
      ctx.strokeStyle = `rgba(255, 210, 138, ${alpha * 0.95})`;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(effect.fromX, effect.fromY);
      ctx.lineTo(effect.toX, effect.toY);
      ctx.stroke();

      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.7})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(effect.fromX, effect.fromY - 4);
      ctx.lineTo(effect.toX, effect.toY - 4);
      ctx.stroke();
    }

    if (effect.type === 'dark_hit') {
      const radius = 8 + progress * 18;
      ctx.strokeStyle = `rgba(124, 58, 237, ${alpha})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = `rgba(76, 5, 25, ${alpha * 0.35})`;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, radius * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }

    if (effect.type === 'heal') {
      ctx.fillStyle = `rgba(187, 247, 208, ${alpha})`;
      ctx.font = '900 24px system-ui';
      ctx.fillText('+', effect.x - 7, effect.y - progress * 18);
    }

    if (effect.type === 'power_burst') {
      const radius = 18 + progress * 190;
      ctx.strokeStyle = `rgba(255, 210, 138, ${alpha})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.7})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, Math.max(4, radius - 16), 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function checkEnemyAggroRange() {
  if (!currentMap || !currentQuest || isDialogOpen() || isCutsceneOpen() || battle?.active || shop?.active || powerEvent?.active || quickEvent?.active || player.moving) return;

  const objects = (currentMap.mapData.objects || []).filter(isMapObjectVisible);

  // Boss de Mirlon: basta chegar perto para entrar na luta pública.
  const bossGate = objects.find(object => object.type === 'mirlon_boss_gate' && currentQuest.key === 'mirlon_prepare');
  if (bossGate) {
    const bossDistance = Math.abs(player.gridX - bossGate.x) + Math.abs(player.gridY - bossGate.y);
    if (bossDistance <= 1) {
      startMirlonBossFromGate(bossGate);
      return;
    }
  }

  const enemies = objects.filter(object => {
    if (object.type !== 'forest_enemy') return false;
    return enemyAllowedForCurrentQuest(object);
  });

  for (const enemy of enemies) {
    const distance = Math.abs(player.gridX - enemy.x) + Math.abs(player.gridY - enemy.y);
    if (distance <= 1) {
      faceObject(enemy);
      handleForestEnemy(enemy);
      return;
    }
  }
}

function startMirlonBossFromGate(object) {
  if (currentQuest.key !== 'mirlon_prepare') return;

  flags.quest_mirlon_prepare_done = true;
  currentQuest = DATA.quests.public_battle_mirlon;
  refreshQuestPanel();
  saveProgress();

  const bossObject = (currentMap.mapData.objects || []).find(obj => obj.key === 'mirlon_public_demon') || object;
  const enemy = buildEnemyFromObject({
    ...bossObject,
    type: 'forest_enemy',
    enemyType: 'boss',
    questKey: 'public_battle_mirlon',
    name: bossObject.name || object.name || 'Demónio da Praça',
    stats: bossObject.stats || { level: object.requiredLevel || 7, maxHp: 118, attack: 18, defense: 6, xp: 180 },
    drop: bossObject.drop || { goldMin: 24, goldMax: 40, potionChance: 60, lightShardChance: 85 },
  });

  addFloatingMessage('Batalha pública!', player.x + 16, player.y - 24, '#fde68a');
  startBattle(enemy);
}

function faceObject(object) {
  const dx = object.x - player.gridX;
  const dy = object.y - player.gridY;
  if (Math.abs(dx) > Math.abs(dy)) {
    player.direction = dx > 0 ? 'right' : 'left';
  } else if (dy !== 0) {
    player.direction = dy > 0 ? 'down' : 'up';
  }
}

function objectInteractionRange(object) {
  if (!object) return 1;
  if (object.type === 'training_crystal') return 999;
  if (['training_shadow', 'forest_enemy', 'healer_shop', 'north_gate', 'vision_stone', 'light_target', 'prayer_altar', 'return_aldara_gate', 'nilzin_survivor', 'nilzin_heal', 'mirlon_gate', 'story_marker', 'mirlon_boss_gate', 'mirlon_minor_demon', 'map_exit'].includes(object.type)) return 2;
  return 1;
}

function findInteractableObject(tiles) {
  const objects = (currentMap.mapData.objects || []).filter(isMapObjectVisible);

  const direct = objects.find(object => tiles.some(tile => object.x === tile.x && object.y === tile.y));
  if (direct) return direct;

  const trainingCrystal = objects.find(object => object.type === 'training_crystal' && currentQuest?.key === 'first_training');
  if (trainingCrystal) return trainingCrystal;

  const ranged = objects
    .map(object => ({
      object,
      distance: Math.abs(player.gridX - object.x) + Math.abs(player.gridY - object.y),
    }))
    .filter(item => item.distance <= objectInteractionRange(item.object))
    .sort((a, b) => a.distance - b.distance)[0];

  return ranged?.object || null;
}


function drawFloatingMessages() {
  ctx.save();
  ctx.font = 'bold 13px system-ui';
  ctx.textAlign = 'center';

  for (const item of floatingMessages) {
    ctx.globalAlpha = Math.max(0, Math.min(1, item.life / 35));
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(Math.round(item.x - 34), Math.round(item.y - 15), 68, 18);
    ctx.fillStyle = item.color;
    ctx.fillText(item.text, Math.round(item.x), Math.round(item.y));
  }

  ctx.restore();
}


function handleHealerShop(object) {
  if (!['forest_hunt', 'prepare_journey', 'enter_shadow_valley', 'physical_training', 'figure_in_black', 'return_to_sage', 'demo_done', 'staff_mastery_intro', 'staff_precision_trial', 'vision_of_ruin', 'staff_mastery_done', 'spiritual_training_intro', 'prayer_trial', 'declared_son_owner', 'return_aldara_trained'].includes(currentQuest.key)) {
    openDialog({ name: object.name || 'Lia', portrait: '' }, [
      { text: 'A guardiã observa-te em silêncio. Ainda não é altura de usar a loja.' },
    ]);
    return;
  }

  openShop(object);
}

function openShop(object) {
  shop = {
    active: true,
    name: object.name || 'Lia, Guardiã da Clareira',
    message: 'Escolhe uma opção.',
    potionPrice: 8,
    restPrice: 6,
  };
}

function closeShop() {
  shop = null;
}

function handleShopInput(event) {
  if (!shop?.active) return;

  const key = event.key;
  const code = event.code;
  if (['1', '2', '3', 'Escape', 'e', 'E', ' '].includes(key) || ['Numpad1', 'Numpad2', 'Numpad3'].includes(code)) {
    event.preventDefault();
  }

  if (key === '1' || code === 'Numpad1') {
    buyPotion();
    return;
  }

  if (key === '2' || code === 'Numpad2') {
    restAtHealer();
    return;
  }

  if (key === '3' || code === 'Numpad3' || key === 'Escape' || key === 'e' || key === 'E' || key === ' ') {
    closeShop();
  }
}

function buyPotion() {
  const price = shop?.potionPrice || 8;
  if (player.gold < price) {
    shop.message = `Precisas de ${price} ouro para comprar uma poção.`;
    return;
  }

  player.gold -= price;
  player.inventory.potion = (player.inventory.potion || 0) + 1;
  shop.message = `Compraste 1 poção por ${price} ouro.`;
  addFloatingMessage(`-${price} ouro`, player.x + 16, player.y - 22, '#facc15');
  addFloatingMessage('+1 poção', player.x + 16, player.y - 42, '#bbf7d0');
  refreshStatsPanel();
  saveProgress();
}

function restAtHealer() {
  const price = shop?.restPrice || 6;
  if (player.stats.hp >= player.stats.maxHp) {
    shop.message = 'O teu HP já está no máximo.';
    return;
  }

  if (player.gold < price) {
    shop.message = `Precisas de ${price} ouro para recuperar o HP.`;
    return;
  }

  player.gold -= price;
  player.stats.hp = player.stats.maxHp;
  shop.message = `Lia recuperou o teu HP por ${price} ouro.`;
  addFloatingMessage('HP cheio', player.x + 16, player.y - 22, '#bbf7d0');
  refreshStatsPanel();
  saveProgress();
}

function handleNorthGate(object) {
  if (currentQuest.key !== 'prepare_journey') {
    openDialog({ name: object.name || 'Passagem Norte', portrait: '' }, [
      { text: 'A passagem continua para fora da clareira, mas ainda não é altura de seguir.' },
    ]);
    return;
  }

  if (player.stats.level < 3) {
    openDialog({ name: object.name || 'Passagem Norte', portrait: '' }, [
      { text: `A luz do cajado ainda está instável. Precisas estar pelo menos no nível 3. Nível atual: ${player.stats.level}.` },
    ]);
    return;
  }

  if (player.stats.hp < Math.ceil(player.stats.maxHp * 0.5)) {
    openDialog({ name: object.name || 'Passagem Norte', portrait: '' }, [
      { text: 'Denzel ainda está demasiado ferido. Recupera HP com a Lia ou com a fogueira antes de avançar.' },
    ]);
    return;
  }

  flags.north_gate_unlocked = true;
  openDialog({ name: object.name || 'Passagem Norte', portrait: '' }, [
    { text: 'Denzel respira fundo. A luz do cajado já não treme como antes.' },
    { text: 'A passagem norte abre caminho para uma zona mais perigosa.', advancesToNextQuest: true },
  ]);
}


function handleTrainingShadow(object) {
  if (currentQuest.key !== 'first_combat') {
    openDialog({ name: object.name || 'Sombra de Treino', portrait: '' }, [
      { text: 'A sombra ainda não se formou. Primeiro completa o treino com o cristal.' },
    ]);
    return;
  }

  if (flags.training_shadow_defeated) {
    openDialog({ name: object.name || 'Sombra de Treino', portrait: '' }, [
      { text: 'A sombra já foi derrotada. A clareira voltou ao silêncio.' },
    ]);
    return;
  }

  startBattle({
    key: 'training_shadow',
    name: object.name || 'Sombra de Treino',
    maxHp: 26,
    hp: 26,
    attack: 6,
    defense: 1,
    xp: 45,
  });
}



function buildEnemyFromObject(object) {
  const requiredQuest = object.questKey || (object.type === 'light_target' ? 'staff_precision_trial' : 'forest_hunt');
  const stats = object.stats || {};
  return {
    key: object.key,
    objectKey: object.key,
    type: object.enemyType || (object.type === 'light_target' ? 'light_target' : 'wisp'),
    name: object.name || 'Criatura de Treino',
    level: stats.level || 1,
    maxHp: stats.maxHp || 24,
    hp: stats.maxHp || 24,
    attack: stats.attack || 5,
    defense: stats.defense || 1,
    xp: stats.xp || 25,
    drop: object.drop || {},
    questKey: requiredQuest,
    respawnSeconds: object.respawnSeconds || 0,
    noQuestProgress: Boolean(object.noQuestProgress),
  };
}

function canUseQuickShoutAgainst(enemy) {
  return enemy && player.stats.level - (enemy.level || 1) >= 3;
}

function handleForestEnemy(object) {
  const requiredQuest = object.questKey || (object.type === 'light_target' ? 'staff_precision_trial' : 'forest_hunt');
  const allowedNow = enemyAllowedForCurrentQuest(object);
  if (!allowedNow) {
    openDialog({ name: object.name || 'Criatura', portrait: '' }, [
      { text: 'A criatura observa-te de longe, mas ainda não é altura de enfrentar este treino.' },
    ]);
    return;
  }

  const enemy = buildEnemyFromObject(object);

  if (enemy.questKey === 'public_battle_mirlon' && player.stats.level < (enemy.level || 7)) {
    addFloatingMessage(`Nv ${enemy.level} recomendado`, player.x + 16, player.y - 20, '#fde68a');
  }

  if (canUseQuickShoutAgainst(enemy)) {
    startQuickShoutEvent(enemy);
    return;
  }

  startBattle(enemy);
}

function handleVisionStone(object) {
  if (currentQuest.key !== 'vision_of_ruin') {
    openDialog({ name: object.name || 'Pedra da Visão', portrait: '' }, [{ text: 'A pedra está silenciosa.' }]);
    return;
  }

  openDialog({ name: object.name || 'Pedra da Visão', portrait: '' }, [
    { text: 'Denzel toca na pedra. A luz do cajado treme, e uma visão invade-lhe a mente.' },
    { text: 'Ele vê Elranor em ruínas, pessoas presas pela escuridão e demónios a dominar a terra.' },
    { text: 'A voz do Velho Sábio ecoa: “Se desistires agora, é isto que acontecerá.”', advancesToNextQuest: true },
  ]);
}

function startQuickShoutEvent(enemy) {
  quickEvent = {
    active: true,
    enemy,
    startFrame: frame,
    duration: 105,
    resolved: false,
    zoneStart: 0.42,
    zoneEnd: 0.58,
  };
  addFloatingMessage('Grito disponível!', player.x + 16, player.y - 18, '#fde68a');
}

function updateQuickEvent() {
  if (!quickEvent?.active) return;
  const elapsed = frame - quickEvent.startFrame;
  if (elapsed >= quickEvent.duration) {
    failQuickShoutEvent();
  }
}

function quickEventMarkerPosition() {
  if (!quickEvent) return 0;
  const elapsed = frame - quickEvent.startFrame;
  return Math.max(0, Math.min(1, elapsed / quickEvent.duration));
}

function handleQuickEventInput(event) {
  if (!quickEvent?.active) return;
  if ([' ', 'e', 'E'].includes(event.key)) {
    event.preventDefault();
    const pos = quickEventMarkerPosition();
    if (pos >= quickEvent.zoneStart && pos <= quickEvent.zoneEnd) {
      succeedQuickShoutEvent();
    } else {
      failQuickShoutEvent();
    }
  }
}

function succeedQuickShoutEvent() {
  if (!quickEvent?.active) return;
  const enemy = quickEvent.enemy;
  quickEvent.active = false;
  quickEvent = null;

  addBattleEffect('power_burst', { x: player.x + 16, y: player.y + 16, life: 70 });
  addFloatingMessage('GRITO PERFEITO!', player.x + 16, player.y - 28, '#fde68a');

  const result = gainXp(enemy.xp);
  const reward = applyBattleRewards(enemy);
  markEnemyDefeated(enemy);
  refreshStatsPanel();
  saveProgress();
  buildNpcs();

  const lines = [
    { text: `Denzel liberta o Grito do Filho do Dono no momento certo.` },
    { text: `${enemy.name} não resiste à diferença de poder e desfaz-se antes do combate começar.` },
    { text: `Ganhaste ${enemy.xp} XP${reward.gold ? `, ${reward.gold} ouro` : ''}${reward.potion ? ' e 1 poção' : ''}.` },
  ];

  if (result.leveledUp) {
    lines.push({ text: `Denzel subiu para o nível ${player.stats.level}!` });
  }

  addQuestProgressLines(enemy, lines);
  openDialog({ name: 'Grito do Filho do Dono', portrait: player.portrait || '' }, lines);
}

function failQuickShoutEvent() {
  if (!quickEvent?.active) return;
  const enemy = quickEvent.enemy;
  quickEvent.active = false;
  quickEvent = null;
  addFloatingMessage('Timing falhou', player.x + 16, player.y - 28, '#fecaca');
  startBattle(enemy);
}

function drawQuickEventOverlay() {
  if (!quickEvent?.active) return;

  const x = 112;
  const y = 72;
  const w = 416;
  const h = 82;
  const marker = quickEventMarkerPosition();
  const markerX = x + 28 + marker * (w - 56);
  const zoneX = x + 28 + quickEvent.zoneStart * (w - 56);
  const zoneW = (quickEvent.zoneEnd - quickEvent.zoneStart) * (w - 56);

  ctx.save();
  ctx.fillStyle = 'rgba(2, 6, 23, 0.82)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 3;
  ctx.strokeRect(x, y, w, h);

  ctx.fillStyle = '#fde68a';
  ctx.font = '900 16px system-ui';
  ctx.fillText('GRITO DO FILHO DO DONO', x + 24, y + 27);
  ctx.fillStyle = '#cbd5e1';
  ctx.font = '800 12px system-ui';
  ctx.fillText('Carrega ESPAÇO ou E quando o marcador entrar na zona dourada.', x + 24, y + 46);

  rect(x + 28, y + 58, w - 56, 10, '#1e293b');
  rect(zoneX, y + 56, zoneW, 14, '#facc15');
  rect(markerX - 3, y + 51, 6, 24, '#ffffff');
  ctx.restore();
}

function startBattle(enemy) {
  if (battleTimeout) {
    clearTimeout(battleTimeout);
    battleTimeout = null;
  }
  battle = {
    active: true,
    enemy,
    charge: false,
    turn: 'player',
  };
  battleMessage = `${enemy.name} surgiu diante de Denzel.`;
  battleLog = ['1 Atacar recarrega energia · 2 Luz custa energia · 3 Recuperar · 4 Poção'];
  battleFlash = 0;
  battleEffects = [];
}

function closeBattle() {
  if (battleTimeout) {
    clearTimeout(battleTimeout);
    battleTimeout = null;
  }
  battle = null;
  battleMessage = '';
  battleLog = [];
  battleFlash = 0;
  battleEffects = [];
}

function handleBattleInput(event) {
  const key = event.key;

  if (['1', '2', '3', '4', ' ', 'Escape'].includes(key) || ['Numpad1', 'Numpad2', 'Numpad3', 'Numpad4'].includes(event.code)) {
    event.preventDefault();
  }

  if (!battle?.active || battle.turn !== 'player') return;

  if (key === '1' || event.code === 'Numpad1') {
    playerBasicAttack();
  } else if (key === '2' || event.code === 'Numpad2') {
    playerStaffLight();
  } else if (key === '3' || event.code === 'Numpad3') {
    playerRecover();
  } else if (key === '4' || event.code === 'Numpad4') {
    playerUsePotion();
  }
}

function pushBattleLog(text) {
  battleLog.unshift(text);
  battleLog = battleLog.slice(0, 4);
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function playerBasicAttack() {
  const enemy = battle.enemy;
  const recharged = rechargeStaffEnergy(1);
  const damage = Math.max(2, player.stats.attack + randomInt(0, 2) - enemy.defense);
  enemy.hp = Math.max(0, enemy.hp - damage);
  battleMessage = `Denzel golpeia com o cajado. Causou ${damage} de dano.`;
  pushBattleLog(`Ataque básico: ${damage} dano${recharged ? ` · +${recharged} energia` : ''}.`);
  addFloatingMessage(`-${damage}`, enemyScreenX(), enemyScreenY() - 10, '#fecaca');
  if (recharged) addFloatingMessage(`+${recharged} EN`, player.x + 16, player.y - 26, '#fde68a');
  battleFlash = 8;
  addBattleEffect('slash', { x: 434, y: 210, life: 40 });
  refreshStatsPanel();
  afterPlayerBattleAction();
}

function playerStaffLight() {
  const enemy = battle.enemy;
  const costEnergy = 2;

  if (!consumeStaffEnergy(costEnergy)) {
    battleMessage = `Energia do cajado insuficiente. Usa o ataque 1 para recarregar.`;
    pushBattleLog(`Luz do Cajado precisa de ${costEnergy} energia.`);
    refreshStatsPanel();
    return;
  }

  // Mais forte que o ataque normal, mas tem custo real: energia do cajado.
  // Se usado com pouca vida, também pesa no corpo de Denzel.
  const hpCost = player.stats.hp <= Math.ceil(player.stats.maxHp * 0.28) ? 2 : 0;
  if (hpCost) player.stats.hp = Math.max(1, player.stats.hp - hpCost);

  const damage = Math.max(6, player.stats.attack + 9 + randomInt(2, 6) - enemy.defense);
  enemy.hp = Math.max(0, enemy.hp - damage);
  battleMessage = `Denzel liberta a Luz do Cajado. ${damage} de dano.`;
  pushBattleLog(`Luz do Cajado: ${damage} dano · -${costEnergy} energia${hpCost ? ` · -${hpCost} HP` : ''}.`);
  addFloatingMessage(`-${damage}`, enemyScreenX(), enemyScreenY() - 10, '#fde68a');
  battleFlash = 12;
  addBattleEffect('light_beam', { fromX: 166, fromY: 248, toX: 474, toY: 228, life: 42 });
  refreshStatsPanel();
  afterPlayerBattleAction();
}

function playerRecover() {
  const before = player.stats.hp;
  player.stats.hp = Math.min(player.stats.maxHp, player.stats.hp + 9);
  const healed = player.stats.hp - before;
  battleMessage = `Denzel respira fundo e recupera ${healed} HP.`;
  pushBattleLog(`Recuperaste ${healed} HP.`);
  addFloatingMessage(`+${healed}`, player.x + 16, player.y - 5, '#bbf7d0');
  addBattleEffect('heal', { x: 149, y: 235, life: 60 });
  refreshStatsPanel();
  afterPlayerBattleAction();
}


function playerUsePotion() {
  const amount = player.inventory.potion || 0;
  if (amount <= 0) {
    battleMessage = 'Não tens poções disponíveis.';
    pushBattleLog('Sem poções no inventário.');
    return;
  }

  if (player.stats.hp >= player.stats.maxHp) {
    battleMessage = 'O HP já está cheio. Guarda a poção para depois.';
    pushBattleLog('HP cheio. A poção não foi usada.');
    return;
  }

  player.inventory.potion = amount - 1;
  const before = player.stats.hp;
  player.stats.hp = Math.min(player.stats.maxHp, player.stats.hp + 18);
  const healed = player.stats.hp - before;
  battleMessage = `Denzel usa uma poção e recupera ${healed} HP.`;
  pushBattleLog(`Poção usada: +${healed} HP.`);
  addFloatingMessage(`+${healed}`, player.x + 16, player.y - 5, '#bbf7d0');
  addBattleEffect('heal', { x: 149, y: 235, life: 60 });
  refreshStatsPanel();
  afterPlayerBattleAction();
}

function afterPlayerBattleAction() {
  if (!battle?.active) return;
  battle.turn = 'animating';
  if (battle.enemy.hp <= 0) {
    battleTimeout = setTimeout(() => {
      if (battle?.active) finishBattleVictory();
    }, BATTLE_ACTION_DELAY);
    return;
  }

  battleTimeout = setTimeout(() => {
    if (battle?.active) enemyBattleTurn();
  }, BATTLE_ACTION_DELAY);
}

function enemyBattleTurn() {
  if (!battle?.active) return;
  battle.turn = 'enemy';
  const enemy = battle.enemy;
  const damage = Math.max(1, enemy.attack + randomInt(0, 2) - player.stats.defense);
  player.stats.hp = Math.max(0, player.stats.hp - damage);
  battleMessage += ` ${enemy.name} contra-ataca e causa ${damage} de dano.`;
  pushBattleLog(`${enemy.name} causou ${damage} de dano.`);
  addFloatingMessage(`-${damage}`, player.x + 16, player.y - 8, '#fecaca');
  addBattleEffect('dark_hit', { x: 148, y: 248, life: 42 });
  refreshStatsPanel();
  saveProgress();

  if (player.stats.hp <= 0) {
    battleTimeout = setTimeout(() => {
      if (battle?.active) handlePlayerDefeat(enemy);
    }, BATTLE_ACTION_DELAY);
    return;
  }

  if (player.stats.hp <= 5) {
    pushBattleLog('HP baixo. Usa 3 para recuperar ou 4 para poção.');
  }

  battleTimeout = setTimeout(() => {
    if (battle?.active) {
      battle.turn = 'player';
      battleMessage = 'Escolhe a próxima ação.';
    }
  }, BATTLE_ACTION_DELAY);
}

function handlePlayerDefeat(enemy) {
  const lostGold = Math.floor((player.gold || 0) * 0.20);
  player.gold = Math.max(0, (player.gold || 0) - lostGold);
  player.stats.hp = Math.max(1, Math.ceil(player.stats.maxHp * 0.55));
  setStaffEnergy(Math.ceil(maxStaffEnergy() / 2));

  // Recuo seguro: não apaga progresso, apenas penaliza e coloca Denzel num ponto de segurança do mapa.
  player.gridX = currentMap.startX;
  player.gridY = currentMap.startY;
  player.x = player.gridX * currentMap.tileSize;
  player.y = player.gridY * currentMap.tileSize;
  player.targetX = player.x;
  player.targetY = player.y;
  player.moving = false;

  closeBattle();
  refreshStatsPanel();
  saveProgress();
  openDialog({ name: 'Denzel caiu', portrait: player.portrait || '' }, [
    { text: `${enemy.name} foi demasiado forte. Denzel perde a consciência por instantes.` },
    { text: `A luz do cajado protege-o da morte, mas ele recua para recuperar fôlego${lostGold ? ` e perde ${lostGold} ouro` : ''}.` },
    { text: 'Treina, compra poções e volta mais forte.' },
  ]);
}

function markEnemyDefeated(enemy) {
  if (enemy.key === 'training_shadow') {
    flags.training_shadow_defeated = true;
    return;
  }

  if (enemy.noQuestProgress) {
    if (enemy.objectKey || enemy.key) {
      const key = enemy.objectKey || enemy.key;
      flags[`enemy_${key}_defeated`] = true;
      if (enemy.respawnSeconds) {
        getRespawnFlags()[key] = Date.now() + enemy.respawnSeconds * 1000;
      }
    }
    return;
  }

  if (enemy.objectKey || enemy.questKey) {
    const key = enemy.objectKey || enemy.key;
    flags[`enemy_${key}_defeated`] = true;
    if (enemy.respawnSeconds) {
      getRespawnFlags()[key] = Date.now() + enemy.respawnSeconds * 1000;
    }
  }

  if (enemy.questKey === 'forest_hunt') {
    flags.forestEnemiesDefeated = Math.min(3, (flags.forestEnemiesDefeated || 0) + 1);
  }

  if (enemy.questKey === 'physical_training') {
    flags.darkDemonsDefeated = Math.min(3, (flags.darkDemonsDefeated || 0) + 1);
  }

  if (enemy.questKey === 'outer_elranor_watch') {
    flags.elranorSentinelsDefeated = Math.min(2, (flags.elranorSentinelsDefeated || 0) + 1);
  }

  if (enemy.questKey === 'staff_precision_trial') {
    flags.staffTargetsDefeated = Math.min(3, (flags.staffTargetsDefeated || 0) + 1);
  }

  if (enemy.questKey === 'public_battle_mirlon') {
    flags.mirlon_boss_defeated = true;
    flags.mirlon_minor_demons_dispelled = true;
  }
}

function addQuestProgressLines(enemy, lines) {
  if (enemy.key === 'training_shadow') {
    lines.push({ text: 'O Velho Sábio acena em silêncio. Denzel está pronto para continuar o treino.', advancesToNextQuest: true });
    return;
  }

  if (enemy.questKey === 'forest_hunt') {
    const defeated = flags.forestEnemiesDefeated || 0;
    if (defeated >= 3) {
      lines.push({ text: 'Três criaturas foram derrotadas. Denzel sente a luz mais firme dentro de si.', advancesToNextQuest: true });
    } else {
      lines.push({ text: `Treino livre: ${defeated}/3 criaturas derrotadas. Continua a explorar a clareira.` });
    }
    return;
  }

  if (enemy.questKey === 'physical_training') {
    const defeated = flags.darkDemonsDefeated || 0;
    if (defeated >= 3) {
      lines.push({ text: 'A última criatura cai. A floresta fica estranhamente silenciosa.', advancesToNextQuest: true });
    } else {
      lines.push({ text: `Treino físico e mental: ${defeated}/3 criaturas derrotadas. Continua, mas gere bem o HP.` });
    }
    return;
  }

  if (enemy.questKey === 'outer_elranor_watch') {
    const defeated = flags.elranorSentinelsDefeated || 0;
    if (defeated >= 2) {
      lines.push({ text: 'As sentinelas caem. O caminho até ao selo negro fica aberto, mas a entrada de Elranor ainda resiste.', advancesToNextQuest: true });
    } else {
      lines.push({ text: `Sentinelas de Elranor: ${defeated}/2 derrotadas. A outra ainda guarda a estrada.` });
    }
    return;
  }

  if (enemy.questKey === 'staff_precision_trial') {
    const defeated = flags.staffTargetsDefeated || 0;
    if (defeated >= 3) {
      lines.push({ text: 'Os três alvos de luz foram destruídos com precisão. O cajado já não responde apenas à força, mas também ao controlo.', advancesToNextQuest: true });
    } else {
      lines.push({ text: `Domínio do Cajado: ${defeated}/3 alvos destruídos. Procura os restantes alvos da clareira.` });
    }
    return;
  }

  if (enemy.questKey === 'public_battle_mirlon') {
    lines.push({ text: 'O demónio principal cai no topo da aldeia.' });
    lines.push({ text: 'Denzel ergue o cajado e liberta um grito de poder. Os demónios menores dissipam-se como cinza no vento.' });
    lines.push({ text: 'A aldeia de Mirlon fica em silêncio. Pela primeira vez, todos viram o Filho do Dono lutar em público.', advancesToNextQuest: true });
  }
}

function finishBattleVictory() {
  const enemy = battle.enemy;
  const result = gainXp(enemy.xp);
  const reward = applyBattleRewards(enemy);
  markEnemyDefeated(enemy);

  addFloatingMessage(`+${enemy.xp} XP`, player.x + 16, player.y - 20, '#fde68a');
  if (reward.gold > 0) addFloatingMessage(`+${reward.gold} ouro`, player.x + 16, player.y - 38, '#facc15');
  if (reward.potion > 0) addFloatingMessage(`+${reward.potion} poção`, player.x + 16, player.y - 56, '#bbf7d0');

  refreshStatsPanel();
  saveProgress();

  const lines = [
    { text: `${enemy.name} desfaz-se em partículas de luz.` },
    { text: `Ganhaste ${enemy.xp} XP${reward.gold ? `, ${reward.gold} ouro` : ''}${reward.potion ? ' e 1 poção' : ''}.` },
  ];

  if (result.leveledUp) {
    lines.push({ text: `Denzel subiu para o nível ${player.stats.level}! HP, Ataque e Defesa aumentaram.` });
  }

  addQuestProgressLines(enemy, lines);
  closeBattle();
  buildNpcs();
  openDialog({ name: 'Vitória', portrait: '' }, lines);
}

function applyBattleRewards(enemy) {
  const drop = enemy.drop || {};
  const gold = randomInt(drop.goldMin || 0, drop.goldMax || 0);
  const potion = randomInt(1, 100) <= (drop.potionChance || 0) ? 1 : 0;
  const shard = randomInt(1, 100) <= (drop.lightShardChance || 0) ? 1 : 0;

  player.gold += gold;
  player.inventory.potion = (player.inventory.potion || 0) + potion;
  player.inventory.lightShard = (player.inventory.lightShard || 0) + shard;

  return { gold, potion, shard };
}

function enemyScreenX() {
  return 456;
}

function enemyScreenY() {
  return 228;
}


function switchMap(targetKey, startX = null, startY = null) {
  const target = DATA.maps[targetKey];
  if (!target) return false;
  currentMap = target;
  player.gridX = startX ?? target.startX;
  player.gridY = startY ?? target.startY;
  player.x = player.gridX * target.tileSize;
  player.y = player.gridY * target.tileSize;
  player.targetX = player.x;
  player.targetY = player.y;
  player.moving = false;
  buildNpcs();
  saveProgress();
  return true;
}

function handleTileEvents() {
  if (currentQuest.key === 'return_home' && player.gridX >= 7 && player.gridX <= 11 && player.gridY >= 4 && player.gridY <= 7) {
    startPowerEvent();
    return;
  }

  if (currentQuest.key === 'escape_forest' && player.gridY <= 1 && player.gridX >= 8 && player.gridX <= 11) {
    advanceQuest();
    return;
  }

  // Passagens automáticas para farm/treino perto de Mirlon.
  // Não precisa carregar E: basta andar até à saída.
  if (currentMap.key === 'mirlon' && ['mirlon_prepare', 'public_battle_mirlon'].includes(currentQuest.key)) {
    if (player.gridX >= 18 && player.gridY >= 5 && player.gridY <= 9) {
      switchMap('trilho_mirlon', 4, 7);
      addFloatingMessage('Trilho de treino', player.x + 18, player.y - 18, '#fde68a');
      return;
    }
  }

  if (currentMap.key === 'trilho_mirlon') {
    if (player.gridX <= 0 && player.gridY >= 5 && player.gridY <= 9) {
      switchMap('mirlon', 17, 7);
      addFloatingMessage('Mirlon', player.x + 18, player.y - 18, '#fde68a');
      return;
    }
  }

  if (handleAutoStoryMarkers()) return;
}

function handleAutoStoryMarkers() {
  if (!currentMap || !currentQuest || isDialogOpen() || isCutsceneOpen() || battle?.active || shop?.active || quickEvent?.active || powerEvent?.active) return false;

  const object = (currentMap.mapData.objects || [])
    .filter(isMapObjectVisible)
    .filter(obj => obj.autoTrigger && obj.type === 'story_marker')
    .map(obj => ({
      object: obj,
      distance: Math.abs(player.gridX - obj.x) + Math.abs(player.gridY - obj.y),
    }))
    .filter(item => item.distance <= 1)
    .sort((a, b) => a.distance - b.distance)[0]?.object;

  if (!object) return false;

  const flagKey = `auto_${currentQuest.key}_${object.key}`;
  if (flags[flagKey]) return false;

  flags[flagKey] = true;
  faceObject(object);
  handleObjectInteraction(object);
  saveProgress();
  return true;
}

function startPowerEvent() {
  if (flags.power_wave_done || powerEvent?.active) return;

  powerEvent = {
    active: true,
    startFrame: frame,
    duration: 118,
  };

  flags.power_wave_started = true;
  saveProgress();
}

function updatePowerEvent() {
  const elapsed = frame - powerEvent.startFrame;

  if (elapsed >= powerEvent.duration) {
    flags.minor_demons_destroyed = true;
    flags.power_wave_done = true;
    powerEvent.active = false;
    powerEvent = null;
    saveProgress();

    openDialog(
      { name: 'Denzel', portrait: player.portrait || '' },
      [
        { text: 'ONDE ESTÁ O MEU IRMÃO?!' },
        { text: 'O grito de Denzel rasga o ar. Uma onda de poder explode à sua volta.' },
        { text: 'Os dois demónios menores desfazem-se em pó diante da energia que dele emanava.', advancesToNextQuest: true },
      ]
    );
  }
}

function draw() {
  if (!DATA || !currentMap) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawMap();
  drawDarkMapAtmosphere();
  drawAttackSceneDecorations();

  const entities = [
    ...npcs.map(n => ({ type: 'npc', entity: n })),
    { type: 'player', entity: player },
  ].sort((a, b) => a.entity.y - b.entity.y);

  for (const item of entities) {
    drawCharacter(item.entity, item.type === 'player');
  }

  drawPowerWaveEvent();
  drawHud();
  drawWorldHint();
  drawBattleOverlay();
  drawQuickEventOverlay();
  drawShopOverlay();
  drawFloatingMessages();
}

function drawMap() {
  const tiles = currentMap.mapData.tiles;
  for (let y = 0; y < currentMap.height; y++) {
    for (let x = 0; x < currentMap.width; x++) {
      drawTile(tiles[y][x], x, y);
    }
  }

  for (const house of currentMap.mapData.houses || []) drawHouse(house);
  for (const object of currentMap.mapData.objects || []) {
    if (isMapObjectVisible(object)) drawObject(object);
  }

  for (let y = 0; y < currentMap.height; y++) {
    for (let x = 0; x < currentMap.width; x++) {
      if (tiles[y][x] === 1) {
        drawTree(x, y);
        if (isAldaraFullyDestroyed() && ((x + y) % 5 === 0 || y === 0 || x === 0 || x === currentMap.width - 1)) drawFire(x, y);
      }
      if (tiles[y][x] === 8) drawFire(x, y);
    }
  }
}

function rect(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}

function drawTile(type, col, row) {
  const size = currentMap.tileSize;
  const x = col * size;
  const y = row * size;

  if ([0, 5, 8].includes(type)) {
    rect(x, y, size, size, '#77b866');
    rect(x + 4, y + 6, 5, 2, '#68a657');
    rect(x + 20, y + 24, 4, 2, '#68a657');
  }

  if (type === 2) {
    rect(x, y, size, size, '#c5ad76');
    rect(x + 4, y + 6, 8, 3, '#b89c64');
    rect(x + 18, y + 23, 9, 3, '#d2bf8a');
  }

  if (type === 3) {
    rect(x, y, size, size, '#337ec5');
    const wave = (frame + col * 8 + row * 5) % 45 < 22;
    rect(x + 3, y + 8, 13, 2, wave ? '#72c3f5' : '#4ca3dc');
    rect(x + 15, y + 22, 14, 2, wave ? '#4ca3dc' : '#72c3f5');
  }

  if (type === 4) {
    rect(x, y, size, size, '#77b866');
    rect(x + 3, y + 13, 26, 7, '#8b5e34');
    rect(x + 6, y + 8, 4, 17, '#6b4424');
    rect(x + 22, y + 8, 4, 17, '#6b4424');
  }

  if (type === 5) {
    rect(x + 7, y + 9, 4, 4, '#f472b6');
    rect(x + 12, y + 14, 3, 3, '#fde047');
    rect(x + 23, y + 10, 4, 4, '#fb7185');
  }

  if (type === 6) {
    rect(x, y, size, size, '#b9824b');
    rect(x, y + 5, size, 4, '#8a5a31');
    rect(x, y + 22, size, 4, '#8a5a31');
  }

  if (type === 7) {
    rect(x, y, size, size, '#77b866');
    rect(x + 8, y + 14, 17, 11, '#64748b');
    rect(x + 11, y + 12, 12, 4, '#94a3b8');
  }
}

function drawTree(col, row) {
  const x = col * currentMap.tileSize;
  const y = row * currentMap.tileSize;
  rect(x, y, 32, 32, '#77b866');
  rect(x + 13, y + 16, 6, 13, '#7a4d2b');
  rect(x + 6, y + 8, 20, 15, '#1f7a3a');
  rect(x + 9, y + 3, 14, 12, '#2f9e44');
  rect(x + 3, y + 14, 26, 10, '#166534');
  rect(x + 11, y + 7, 5, 4, '#5dd06d');
}

function drawFire(col, row) {
  const x = col * 32;
  const y = row * 32;
  const flicker = frame % 20 < 10;
  rect(x + 10, y + 15, 12, 13, flicker ? '#ef4444' : '#f97316');
  rect(x + 13, y + 9, 7, 16, '#facc15');
  rect(x + 15, y + 14, 4, 10, '#fff7ed');
}

function isAldaraFullyDestroyed() {
  return currentMap?.key === 'aldara' && currentQuest?.order >= (DATA?.quests?.return_aldara_trained?.order || 999);
}

function staffGlowLevel() {
  const order = currentQuest?.order || 1;
  let level = 0.35 + Math.min(0.38, order * 0.012);
  if (flags.has_staff) level += 0.08;
  if (order >= (DATA?.quests?.declared_son_owner?.order || 999)) level += 0.10;
  if (order >= (DATA?.quests?.return_aldara_trained?.order || 999)) level += 0.14;
  return Math.min(0.88, level);
}

function drawHouse(house) {
  // Mirlon tem um desenho próprio, sem rio e com casas variadas/queimadas.
  if (currentMap?.mapData?.theme === 'mirlon_burning') {
    drawMirlonHouse(house);
    return;
  }

  // No regresso após o treino, Aldara já está completamente devastada.
  if (isAldaraFullyDestroyed()) {
    drawRuinedHouse(house, true);
    return;
  }

  // Depois do primeiro ataque, a casa de Denzel fica destruída.
  if (house.key === 'casa_denzel' && currentQuest.order >= DATA.quests.find_father.order) {
    drawRuinedHouse(house, true);
    return;
  }

  drawCleanHouse(house);
}

function drawCleanHouse(house) {
  const x = house.x * 32;
  const y = house.y * 32;
  const w = house.w * 32;
  const h = house.h * 32;
  const roof = house.roof || '#b94a48';
  const wall = house.wall || '#f6d6a7';

  rect(x + 4, y + h - 2, w - 8, 8, 'rgba(0,0,0,0.20)');
  rect(x + 6, y, w - 12, 12, roof);
  rect(x, y + 12, w, 16, roof);
  rect(x + 8, y + 31, w - 16, h - 35, wall);
  rect(x + 8, y + h - 8, w - 16, 8, '#bd8b63');

  const doorX = house.doorX * 32 + 9;
  const doorY = house.doorY * 32 + 3;
  rect(doorX, doorY, 14, 29, '#6b3f1d');
  rect(doorX + 10, doorY + 14, 3, 3, '#facc15');

  if (w >= 80) {
    rect(x + 16, y + 45, 13, 12, '#7dd3fc');
    rect(x + w - 30, y + 45, 13, 12, '#7dd3fc');
  } else {
    rect(x + 12, y + 42, 12, 10, '#7dd3fc');
  }
}

function drawMirlonHouse(house) {
  const x = house.x * 32;
  const y = house.y * 32;
  const w = house.w * 32;
  const h = house.h * 32;
  const roof = house.roof || '#451a03';
  const wall = house.wall || '#8a5a31';
  const damaged = house.ruined || house.burning;

  const wallX = x + 9;
  const wallY = y + 33;
  const wallW = Math.max(24, w - 18);
  const wallH = Math.max(26, h - 42);

  rect(x + 5, y + h - 4, Math.max(24, w - 10), 8, 'rgba(0,0,0,0.32)');
  rect(wallX, wallY, wallW, wallH, damaged ? '#5b341c' : wall);
  rect(wallX, wallY + wallH - 7, wallW, 7, damaged ? '#2a160c' : '#7c4a24');

  rect(x + 12, y + 4, Math.max(10, w - 24), 7, damaged ? '#171717' : roof);
  rect(x + 7, y + 11, Math.max(20, w - 14), 9, damaged ? '#292524' : roof);
  rect(x + 2, y + 20, Math.max(26, w - 4), 12, damaged ? '#1c1917' : roof);
  rect(x + 6, y + 31, Math.max(22, w - 12), 4, '#111827');

  if (damaged) {
    rect(x + 10, y + 12, 14, 4, '#0f172a');
    rect(x + Math.max(22, w - 32), y + 20, 13, 5, '#020617');
    rect(wallX + 5, wallY + 12, 14, 9, '#111827');
    rect(wallX + wallW - 18, wallY + 7, 12, 7, '#0f172a');
  }

  const doorX = x + Math.floor(w / 2) - 7;
  const doorY = y + h - 36;
  rect(doorX, doorY, 14, 29, damaged ? '#111827' : '#4a2d16');
  if (!damaged) rect(doorX + 10, doorY + 13, 3, 3, '#facc15');

  if (w >= 88) {
    rect(x + 14, wallY + 10, 13, 11, damaged ? '#111827' : '#fbbf24');
    rect(x + w - 27, wallY + 10, 13, 11, damaged ? '#111827' : '#fbbf24');
  } else {
    rect(x + w - 25, wallY + 9, 12, 10, damaged ? '#111827' : '#fbbf24');
  }

  rect(wallX + 3, wallY + wallH - 12, 8, 3, '#3b2414');
  rect(wallX + wallW - 13, wallY + wallH - 15, 7, 3, '#3b2414');

  if (house.burning) {
    drawFire(house.x + 1, house.y + 1);
    if (w >= 88) drawFire(house.x + house.w - 1, house.y + 1);
    if ((frame + house.x + house.y) % 40 < 22) drawFire(house.x + Math.max(1, Math.floor(house.w / 2)), house.y + Math.max(1, house.h - 2));
  }
}

function drawRuinedHouse(house, fullyDestroyed = false) {
  const x = house.x * 32;
  const y = house.y * 32;
  const w = house.w * 32;
  const h = house.h * 32;

  rect(x + 3, y + h - 7, Math.max(24, w - 6), 11, 'rgba(0,0,0,0.30)');
  rect(x + 7, y + 30, Math.max(20, w - 14), Math.max(18, h - 38), '#5b341c');
  rect(x + 4, y + 14, Math.max(22, w - 14), 16, '#3b1d12');
  rect(x + Math.max(18, Math.floor(w * 0.42)), y + 7, Math.max(18, Math.floor(w * 0.42)), 17, '#1c1917');

  // buracos/partes queimadas
  rect(x + 12, y + 46, 15, 9, '#111827');
  rect(x + Math.max(34, w - 34), y + 38, 14, 8, '#0f172a');

  const doorX = Math.max(x + 12, Math.min(x + w - 26, house.doorX * 32 + 9));
  const doorY = Math.max(y + 38, Math.min(y + h - 34, house.doorY * 32 + 3));
  rect(doorX, doorY, 14, 29, '#111827');

  drawFire(house.x + 1, house.y + 1);
  if (fullyDestroyed) {
    rect(x + 8, y + 31, 18, 5, '#111827');
    rect(x + Math.max(26, w - 32), y + 24, 13, 6, '#0f172a');
    if ((house.x + house.y + frame) % 3 === 0) drawFire(house.x, house.y + 2);
    if (w >= 96 && (house.x + frame) % 4 === 0) drawFire(house.x + house.w - 1, house.y + 1);
  }
}

function drawObject(object) {
  if (object.type === 'sign') {
    const x = object.x * 32;
    const y = object.y * 32;
    rect(x + 14, y + 12, 4, 18, '#6b4424');
    rect(x + 5, y + 5, 22, 12, '#b9824b');
    rect(x + 8, y + 8, 16, 2, '#6b4424');
  }

  if (object.type === 'fountain') {
    const x = object.x * 32;
    const y = object.y * 32;
    rect(x + 4, y + 11, 24, 18, '#94a3b8');
    rect(x + 7, y + 8, 18, 6, '#cbd5e1');
    rect(x + 8, y + 14, 16, 9, '#38bdf8');
    rect(x + 14, y + 3, 4, 10, '#e2e8f0');
  }

  if (object.type === 'campfire') {
    const x = object.x * 32;
    const y = object.y * 32;
    rect(x + 7, y + 20, 18, 5, '#6b4424');
    rect(x + 10, y + 14, 5, 10, frame % 20 < 10 ? '#f97316' : '#ef4444');
    rect(x + 15, y + 10, 5, 14, '#facc15');
    rect(x + 17, y + 15, 3, 7, '#fff7ed');
  }

  if (object.type === 'training_crystal') {
    const x = object.x * 32;
    const y = object.y * 32;
    const glow = frame % 55 < 28 ? 0.42 : 0.24;
    ctx.fillStyle = `rgba(255, 210, 138, ${glow})`;
    ctx.beginPath();
    ctx.ellipse(x + 16, y + 17, 15, 17, 0, 0, Math.PI * 2);
    ctx.fill();
    rect(x + 13, y + 6, 7, 19, '#ffd28a');
    rect(x + 10, y + 12, 13, 12, '#ffb347');
    rect(x + 14, y + 8, 3, 15, '#fff3c4');
    rect(x + 8, y + 25, 17, 4, '#7c2d12');
  }

  if (object.type === 'training_shadow') {
    drawTrainingShadow(object);
  }

  if (object.type === 'forest_enemy' || object.type === 'light_target') {
    drawForestEnemy(object);
    drawEnemyLevelLabel(object);
  }

  if (object.type === 'vision_stone') {
    drawVisionStone(object);
  }

  if (object.type === 'healer_shop') {
    drawHealerShop(object);
  }

  if (object.type === 'north_gate') {
    drawNorthGate(object);
  }

  if (object.type === 'prayer_altar') {
    drawPrayerAltar(object);
  }

  if (object.type === 'return_aldara_gate' || object.type === 'mirlon_gate') {
    drawStoryGate(object);
  }

  if (object.type === 'nilzin_survivor' || object.type === 'nilzin_heal') {
    drawFallenSurvivor(object);
  }

  if (object.type === 'mirlon_minor_demon') {
    drawMinorDemon(object.x, object.y, flags.mirlon_minor_demons_dispelled ? 0 : 1, object.phase || 0);
  }

  if (object.type === 'mirlon_boss_gate') {
    const bossPreview = {
      ...object,
      enemyType: 'boss',
      stats: { level: object.requiredLevel || 7 },
    };
    drawForestEnemy(bossPreview);
    drawEnemyLevelLabel(bossPreview);
  }

  if (object.type === 'story_marker') {
    const x = object.x * 32;
    const y = object.y * 32;
    const glow = frame % 50 < 25 ? 0.28 : 0.14;
    ctx.fillStyle = `rgba(255, 210, 138, ${glow})`;
    ctx.beginPath();
    ctx.ellipse(x + 16, y + 16, 18, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    rect(x + 9, y + 13, 14, 6, '#facc15');
  }

  if (object.type === 'map_exit') {
    drawMapExit(object);
  }

  if (object.type === 'home_ruins') {
    // objeto invisível para interação
  }
}


function drawMapExit(object) {
  const x = object.x * 32;
  const y = object.y * 32;
  const pulse = frame % 50 < 25 ? 0.36 : 0.18;
  ctx.save();
  ctx.fillStyle = `rgba(250, 204, 21, ${pulse})`;
  ctx.beginPath();
  ctx.ellipse(x + 16, y + 16, 22, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  rect(x + 4, y + 12, 17, 8, '#facc15');
  rect(x + 19, y + 8, 9, 16, '#facc15');
  rect(x + 7, y + 15, 13, 2, '#7c2d12');
  ctx.fillStyle = '#fef3c7';
  ctx.font = '900 8px system-ui';
  ctx.fillText('UPAR', x + 4, y + 6);
  ctx.restore();
}

function drawPrayerAltar(object) {
  const x = object.x * 32;
  const y = object.y * 32;
  const glow = frame % 60 < 30 ? 0.34 : 0.18;
  ctx.fillStyle = `rgba(255, 210, 138, ${glow})`;
  ctx.beginPath();
  ctx.ellipse(x + 16, y + 17, 15, 17, 0, 0, Math.PI * 2);
  ctx.fill();
  rect(x + 8, y + 18, 17, 9, '#57534e');
  rect(x + 11, y + 10, 11, 10, '#78716c');
  rect(x + 14, y + 5, 5, 9, '#fde68a');
}

function drawStoryGate(object) {
  const x = object.x * 32;
  const y = object.y * 32;
  rect(x + 3, y + 12, 26, 8, '#b9824b');
  rect(x + 6, y + 7, 4, 20, '#6b4424');
  rect(x + 22, y + 7, 4, 20, '#6b4424');
  rect(x + 11, y + 4, 10, 5, '#facc15');
}

function drawFallenSurvivor(object) {
  const x = object.x * 32;
  const y = object.y * 32;
  rect(x + 8, y + 20, 18, 5, 'rgba(0,0,0,0.25)');
  rect(x + 8, y + 17, 17, 7, '#050505');
  rect(x + 20, y + 13, 8, 8, '#f1d0b5');
  rect(x + 20, y + 11, 9, 4, '#111827');
  if (object.type === 'nilzin_heal') {
    const glow = frame % 50 < 25 ? 0.26 : 0.12;
    ctx.fillStyle = `rgba(255, 210, 138, ${glow})`;
    ctx.beginPath();
    ctx.ellipse(x + 17, y + 18, 20, 11, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawVisionStone(object) {
  const x = object.x * 32;
  const y = object.y * 32;
  const glow = frame % 60 < 30 ? 0.35 : 0.18;
  ctx.fillStyle = `rgba(147, 197, 253, ${glow})`;
  ctx.beginPath();
  ctx.ellipse(x + 16, y + 16, 17, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  rect(x + 8, y + 14, 17, 12, '#475569');
  rect(x + 11, y + 9, 11, 7, '#64748b');
  rect(x + 14, y + 11, 4, 12, '#93c5fd');
  rect(x + 9, y + 26, 16, 4, '#1e293b');
}

function drawHealerShop(object) {
  const x = object.x * 32;
  const y = object.y * 32;
  const glow = frame % 50 < 25 ? 0.28 : 0.16;

  ctx.fillStyle = `rgba(253, 230, 138, ${glow})`;
  ctx.beginPath();
  ctx.ellipse(x + 16, y + 18, 17, 18, 0, 0, Math.PI * 2);
  ctx.fill();

  // pequena banca de apoio
  rect(x + 3, y + 19, 26, 8, '#7c2d12');
  rect(x + 5, y + 15, 22, 5, '#f59e0b');
  rect(x + 6, y + 12, 5, 5, '#bbf7d0');
  rect(x + 14, y + 10, 5, 7, '#fef3c7');
  rect(x + 22, y + 12, 4, 5, '#fca5a5');

  // símbolo de cura
  rect(x + 14, y + 3, 4, 12, '#fef3c7');
  rect(x + 10, y + 7, 12, 4, '#fef3c7');
}

function drawNorthGate(object) {
  const x = object.x * 32;
  const y = object.y * 32;
  const open = flags.north_gate_unlocked || currentQuest?.key === 'demo_done';
  const color = open ? '#92400e' : '#3f2a1d';

  rect(x + 2, y + 5, 5, 25, '#5b341b');
  rect(x + 25, y + 5, 5, 25, '#5b341b');
  rect(x + 5, y + 8, 22, 5, color);
  rect(x + 5, y + 20, 22, 5, color);
  rect(x + 9, y + 1, 14, 6, '#facc15');

  if (!open) {
    rect(x + 13, y + 13, 6, 8, '#020617');
    rect(x + 15, y + 15, 2, 2, '#facc15');
  } else {
    rect(x + 12, y + 14, 8, 6, '#65a30d');
  }
}


function ellipse(x, y, radiusX, radiusY, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(Math.round(x), Math.round(y), radiusX, radiusY, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawEyes(x, y, direction, bob = 0) {
  ctx.fillStyle = '#111827';

  if (direction === 'left') {
    ctx.fillRect(Math.round(x + 11), Math.round(y + 10 + bob), 2, 2);
    ctx.fillRect(Math.round(x + 16), Math.round(y + 10 + bob), 2, 2);
    return;
  }

  if (direction === 'right') {
    ctx.fillRect(Math.round(x + 14), Math.round(y + 10 + bob), 2, 2);
    ctx.fillRect(Math.round(x + 19), Math.round(y + 10 + bob), 2, 2);
    return;
  }

  if (direction === 'up') {
    // De costas: não mostra olhos, só cabelo.
    return;
  }

  ctx.fillRect(Math.round(x + 12), Math.round(y + 10 + bob), 2, 2);
  ctx.fillRect(Math.round(x + 19), Math.round(y + 10 + bob), 2, 2);
}

function drawHair(x, y, colors, style, direction, bob = 0) {
  const hair = colors.hair || '#111827';

  if (style === 'dark_sage') {
    rect(x + 7, y + 1 + bob, 18, 8, '#020617');
    rect(x + 6, y + 8 + bob, 5, 12, '#020617');
    rect(x + 21, y + 8 + bob, 5, 12, '#020617');
    rect(x + 10, y + 15 + bob, 12, 5, '#111827');
    return;
  }

  if (style === 'sage') {
    rect(x + 7, y + 2 + bob, 18, 6, hair);
    rect(x + 8, y + 6 + bob, 4, 8, hair);
    rect(x + 20, y + 6 + bob, 4, 8, hair);
    rect(x + 10, y + 15 + bob, 12, 7, '#f8fafc'); // barba
    return;
  }

  if (style === 'nilzin') {
    rect(x + 7, y + 2 + bob, 18, 7, hair);
    rect(x + 6, y + 7 + bob, 5, 13, hair);
    rect(x + 21, y + 7 + bob, 5, 13, hair);
    return;
  }

  if (style === 'mother') {
    rect(x + 7, y + 2 + bob, 18, 7, hair);
    rect(x + 7, y + 7 + bob, 4, 10, hair);
    rect(x + 21, y + 7 + bob, 4, 10, hair);
    rect(x + 10, y + 3 + bob, 12, 3, '#ffffff22');
    return;
  }

  if (style === 'child') {
    rect(x + 10, y + 6 + bob, 12, 5, hair);
    rect(x + 11, y + 4 + bob, 10, 3, hair);
    return;
  }

  if (direction === 'up') {
    rect(x + 8, y + 3 + bob, 16, 10, hair);
    rect(x + 9, y + 11 + bob, 14, 4, hair);
    return;
  }

  rect(x + 8, y + 3 + bob, 16, 6, hair);
  rect(x + 9, y + 7 + bob, 3, 4, hair);
  rect(x + 20, y + 7 + bob, 3, 4, hair);
}

function hasPlayerStaff() {
  const acceptCallQuest = DATA?.quests?.accept_call;
  if (!acceptCallQuest || !currentQuest) return false;

  // O cajado só aparece depois de o Velho Sábio o entregar.
  return Boolean(flags.has_staff) || currentQuest.order > acceptCallQuest.order;
}

function drawGlowingStaff(x, y, direction, bob = 0, owner = 'hero') {
  const baseGlow = owner === 'hero' ? staffGlowLevel() : 0.48;
  const glow = frame % 50 < 25 ? baseGlow : Math.max(0.26, baseGlow - 0.18);
  const core = '#ffe7a3';
  const light = '#ffb347';
  const dark = '#9a5a16';

  ctx.save();

  if (owner === 'hero') {
    let staffX = x + 24;
    let staffY = y + 8 + bob;

    if (direction === 'left') staffX = x + 5;
    if (direction === 'up') staffX = x + 7;

    ctx.fillStyle = `rgba(255, 179, 71, ${glow})`;
    ctx.beginPath();
    ctx.ellipse(Math.round(staffX + 2), Math.round(staffY + 3), 8 + (glow * 5), 9 + (glow * 5), 0, 0, Math.PI * 2);
    ctx.fill();

    rect(staffX + 1, staffY + 5, 3, 19, dark);
    rect(staffX + 1, staffY + 5, 1, 19, core);
    rect(staffX - 2, staffY, 9, 8, light);
    rect(staffX, staffY + 2, 5, 4, core);
    if (glow > 0.62) rect(staffX - 4, staffY + 3, 13, 2, '#fff3c4');
    rect(staffX + 1, staffY, 3, 2, '#fff3c4');
  } else {
    const staffX = x + 25;
    const staffY = y + 11 + bob;
    ctx.fillStyle = `rgba(255, 179, 71, ${glow})`;
    ctx.beginPath();
    ctx.ellipse(Math.round(staffX + 1), Math.round(staffY), 7, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    rect(staffX, staffY + 2, 3, 17, dark);
    rect(staffX, staffY + 2, 1, 17, core);
    rect(staffX - 1, staffY - 2, 5, 4, light);
    rect(staffX, staffY - 1, 3, 2, '#fff3c4');
  }

  ctx.restore();
}

function drawCharacter(entity, isPlayer = false) {
  const x = entity.x;
  const y = entity.y;
  const colors = entity.colors || {};
  const spriteKey = entity.spriteKey || (isPlayer ? 'hero' : 'villager');
  const style = spriteKey;

  const movingStep = entity.moving ? (Math.sin(frame / 4) >= 0 ? 1 : -1) : 0;
  const bob = entity.moving ? (Math.sin(frame / 5) * 1.2) : 0;
  const direction = entity.direction || 'down';

  const skin = colors.skin || '#6b3f2a';
  let body = colors.body || '#2563eb';
  let accent = colors.accent || '#dbeafe';
  if ((isPlayer || style === 'hero') && currentQuest?.order >= (DATA?.quests?.declared_son_owner?.order || 999)) {
    body = '#f8fafc';
    accent = '#facc15';
  }
  const trouser = style === 'sage' ? '#3f2a1d' : (style === 'nilzin' ? '#111827' : '#1f2937');
  const shoes = '#0f172a';

  const isChild = style === 'child';
  const yShift = isChild ? 4 : 0;
  const bodyTop = y + 13 + yShift + bob;
  const headTop = y + 5 + yShift + bob;

  // sombra arredondada para dar profundidade ao mapa
  ellipse(x + 16, y + 29, isChild ? 9 : 11, 4, 'rgba(0,0,0,0.28)');

  // pernas com animação de passo
  const leftLegOffset = entity.moving ? movingStep : 0;
  const rightLegOffset = entity.moving ? -movingStep : 0;

  if (style === 'nilzin') {
    rect(x + 9, y + 16 + bob, 14, 12, '#050505');
    rect(x + 8, y + 22 + bob, 16, 7, '#111827');
    rect(x + 10, y + 28, 5, 2, shoes);
    rect(x + 18, y + 28, 5, 2, shoes);
  } else if (style === 'mother') {
    // vestido comprido, mas ainda com pés visíveis
    rect(x + 9, y + 16 + bob, 14, 12, body);
    rect(x + 8, y + 21 + bob, 16, 6, body);
    rect(x + 10, y + 28, 5, 2, shoes);
    rect(x + 18, y + 28, 5, 2, shoes);
  } else {
    rect(x + 10, y + 22 + yShift + leftLegOffset, 5, isChild ? 5 : 7, trouser);
    rect(x + 18, y + 22 + yShift + rightLegOffset, 5, isChild ? 5 : 7, trouser);
    rect(x + 9, y + 28 + yShift + leftLegOffset, 6, 2, shoes);
    rect(x + 18, y + 28 + yShift + rightLegOffset, 6, 2, shoes);
  }

  // braços com balanço simples
  if (style !== 'sage') {
    if (direction === 'left') {
      rect(x + 5, y + 15 + yShift + bob, 4, 9, skin);
      rect(x + 23, y + 16 + yShift - movingStep, 4, 8, skin);
    } else if (direction === 'right') {
      rect(x + 5, y + 16 + yShift + movingStep, 4, 8, skin);
      rect(x + 23, y + 15 + yShift + bob, 4, 9, skin);
    } else {
      rect(x + 5, y + 16 + yShift - movingStep, 4, 8, skin);
      rect(x + 23, y + 16 + yShift + movingStep, 4, 8, skin);
    }
  }

  // tronco/roupa
  if (style !== 'mother') {
    rect(x + 8, bodyTop, 16, isChild ? 9 : 11, body);
    rect(x + 8, bodyTop, 16, 3, accent);
  }

  // detalhes específicos por tipo de personagem
  if (style === 'father') {
    rect(x + 7, bodyTop + 2, 18, 4, body); // ombros mais largos
    rect(x + 12, bodyTop + 4, 8, 2, accent);
  }

  if (style === 'sage') {
    rect(x + 6, y + 14 + bob, 20, 13, body); // túnica
    rect(x + 10, y + 14 + bob, 12, 3, accent);
    drawGlowingStaff(x, y, direction, bob, 'sage');
  }

  if (style === 'dark_sage') {
    rect(x + 6, y + 14 + bob, 20, 13, '#020617');
    rect(x + 10, y + 14 + bob, 12, 3, '#7f1d1d');
    rect(x + 6, y + 10 + bob, 20, 4, '#111827');
  }

  if (style === 'villager') {
    rect(x + 12, bodyTop + 4, 8, 2, '#ffffff33');
  }

  // cajado de Denzel: aparece só após o Velho Sábio entregar o cajado.
  if ((isPlayer || style === 'hero') && hasPlayerStaff()) {
    drawGlowingStaff(x, y, direction, bob, 'hero');
  }

  // pescoço
  rect(x + 14, headTop + 9, 4, 4, skin);

  // cabeça
  if (isChild) {
    rect(x + 10, headTop, 12, 11, skin);
  } else {
    rect(x + 9, headTop, 14, 12, skin);
  }

  drawHair(x, y + yShift, colors, style, direction, bob);
  drawEyes(x, y + yShift, direction, bob);

  // nariz / detalhe central, apenas de frente
  if (direction === 'down') {
    rect(x + 16, y + 13 + yShift + bob, 2, 2, '#3f2a1d44');
  }

  // marcador visual do protagonista
  if (isPlayer || style === 'hero') {
    rect(x + 12, y + 2 + bob, 8, 3, '#facc15'); // fita/coroa discreta
    rect(x + 13, bodyTop + 4, 6, 2, '#facc15'); // símbolo na roupa
  }

  // Denzel e família: cabelo mais escuro e forma mais marcada
  if (['hero', 'mother', 'father', 'child'].includes(style)) {
    rect(x + 9, y + 4 + yShift + bob, 14, 2, colors.hair || '#111827');
  }
}



function drawEnemyLevelLabel(object) {
  const level = object.stats?.level || 1;
  const x = object.x * 32;
  const y = object.y * 32;
  rect(x + 1, y - 8, 30, 10, 'rgba(2, 6, 23, 0.78)');
  ctx.fillStyle = '#fde68a';
  ctx.font = '900 8px system-ui';
  ctx.fillText(`Nv ${level}`, x + 5, y);
}


function drawForestEnemy(object) {
  const x = object.x * 32;
  const y = object.y * 32;
  const float = Math.sin((frame + object.x * 5) / 10) * 2;

  if ((object.enemyType || '') === 'light_target' || object.type === 'light_target') {
    const glow = frame % 55 < 28 ? 0.44 : 0.24;
    ctx.save();
    ctx.fillStyle = `rgba(255, 210, 138, ${glow})`;
    ctx.beginPath();
    ctx.ellipse(x + 16, y + 16 + float, 16, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    rect(x + 13, y + 5 + float, 7, 22, '#ffd28a');
    rect(x + 8, y + 14 + float, 18, 7, '#ffb347');
    rect(x + 15, y + 7 + float, 3, 18, '#fff3c4');
    ellipse(x + 16, y + 28, 11, 4, 'rgba(0,0,0,0.24)');
    ctx.restore();
    return;
  }

  if ((object.enemyType || '') === 'boss') {
    ctx.save();
    const glow = frame % 50 < 25 ? 0.34 : 0.20;
    ctx.fillStyle = `rgba(99, 102, 241, ${glow})`;
    ctx.beginPath();
    ctx.ellipse(x + 16, y + 15 + float, 17, 19, 0, 0, Math.PI * 2);
    ctx.fill();
    ellipse(x + 16, y + 29, 12, 4, 'rgba(0,0,0,0.34)');
    rect(x + 8, y + 12 + float, 16, 14, '#1e1b4b');
    rect(x + 10, y + 7 + float, 12, 9, '#312e81');
    rect(x + 6, y + 18 + float, 5, 8, '#1e1b4b');
    rect(x + 22, y + 18 + float, 5, 8, '#1e1b4b');
    rect(x + 10, y + 25 + float, 5, 5, '#111827');
    rect(x + 18, y + 25 + float, 5, 5, '#111827');
    rect(x + 13, y + 11 + float, 2, 2, '#facc15');
    rect(x + 19, y + 11 + float, 2, 2, '#facc15');
    rect(x + 14, y + 4 + float, 4, 4, '#a5b4fc');
    ctx.restore();
    return;
  }

  if ((object.enemyType || '') === 'brute') {
    ctx.save();
    ellipse(x + 16, y + 29, 14, 5, 'rgba(0,0,0,0.34)');
    rect(x + 7, y + 12 + float, 18, 14, '#3b0a0a');
    rect(x + 9, y + 6 + float, 14, 9, '#7f1d1d');
    rect(x + 4, y + 7 + float, 7, 4, '#111827');
    rect(x + 21, y + 7 + float, 7, 4, '#111827');
    rect(x + 4, y + 18 + float, 5, 9, '#4c0519');
    rect(x + 23, y + 18 + float, 5, 9, '#4c0519');
    rect(x + 10, y + 25 + float, 5, 5, '#111827');
    rect(x + 18, y + 25 + float, 5, 5, '#111827');
    rect(x + 12, y + 11 + float, 2, 2, '#facc15');
    rect(x + 18, y + 11 + float, 2, 2, '#facc15');
    ctx.restore();
    return;
  }

  if ((object.enemyType || 'wisp') === 'imp') {
    ctx.save();
    ellipse(x + 16, y + 28, 11, 4, 'rgba(0,0,0,0.32)');
    rect(x + 8, y + 13 + float, 16, 13, '#4c0519');
    rect(x + 10, y + 8 + float, 12, 8, '#7f1d1d');
    rect(x + 5, y + 7 + float, 6, 4, '#111827');
    rect(x + 21, y + 7 + float, 6, 4, '#111827');
    rect(x + 11, y + 13 + float, 2, 2, '#facc15');
    rect(x + 19, y + 13 + float, 2, 2, '#facc15');
    rect(x + 9, y + 25 + float, 5, 4, '#111827');
    rect(x + 19, y + 25 + float, 5, 4, '#111827');
    ctx.restore();
    return;
  }

  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(x + 16, y + 27, 10, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(99, 102, 241, 0.26)';
  ctx.beginPath();
  ctx.ellipse(x + 16, y + 15 + float, 13, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  rect(x + 10, y + 10 + float, 12, 13, '#312e81');
  rect(x + 12, y + 13 + float, 2, 2, '#facc15');
  rect(x + 18, y + 13 + float, 2, 2, '#facc15');
  rect(x + 14, y + 5 + float, 4, 4, '#a5b4fc');
  ctx.restore();
}

function drawTrainingShadow(object) {
  const x = object.x * 32;
  const y = object.y * 32;
  const float = Math.sin(frame / 12) * 2;
  const glow = frame % 60 < 30 ? 0.34 : 0.2;

  ctx.save();
  ctx.fillStyle = `rgba(99, 102, 241, ${glow})`;
  ctx.beginPath();
  ctx.ellipse(x + 16, y + 17 + float, 15, 18, 0, 0, Math.PI * 2);
  ctx.fill();

  ellipse(x + 16, y + 28, 11, 4, 'rgba(0,0,0,0.32)');
  rect(x + 9, y + 12 + float, 14, 14, '#1e1b4b');
  rect(x + 11, y + 8 + float, 10, 8, '#312e81');
  rect(x + 7, y + 18 + float, 4, 8, '#1e1b4b');
  rect(x + 21, y + 18 + float, 4, 8, '#1e1b4b');
  rect(x + 12, y + 12 + float, 2, 2, '#facc15');
  rect(x + 18, y + 12 + float, 2, 2, '#facc15');
  rect(x + 14, y + 4 + float, 4, 4, '#a5b4fc');
  ctx.restore();
}

function drawShopOverlay() {
  if (!shop?.active) return;

  ctx.save();
  ctx.fillStyle = 'rgba(2, 6, 23, 0.72)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const x = 92;
  const y = 92;
  const w = 456;
  const h = 286;

  rect(x, y, w, h, '#fff7db');
  rect(x, y, w, 5, '#1f2937');
  rect(x, y + h - 5, w, 5, '#1f2937');
  rect(x, y, 5, h, '#1f2937');
  rect(x + w - 5, y, 5, h, '#1f2937');

  ctx.fillStyle = '#1f2937';
  ctx.font = '900 22px system-ui';
  ctx.fillText(shop.name, x + 24, y + 42);

  ctx.font = '700 15px system-ui';
  ctx.fillStyle = '#475569';
  ctx.fillText('Apoio da clareira', x + 24, y + 66);

  ctx.fillStyle = '#172033';
  ctx.font = '800 17px system-ui';
  ctx.fillText(`Ouro: ${player.gold}`, x + 24, y + 106);
  ctx.fillText(`HP: ${player.stats.hp}/${player.stats.maxHp}`, x + 154, y + 106);
  ctx.fillText(`Poções: ${player.inventory.potion || 0}`, x + 294, y + 106);

  drawShopOption(x + 24, y + 135, '1', `Comprar poção — ${shop.potionPrice} ouro`);
  drawShopOption(x + 24, y + 176, '2', `Recuperar HP — ${shop.restPrice} ouro`);
  drawShopOption(x + 24, y + 217, '3', 'Sair');

  ctx.fillStyle = '#7c2d12';
  ctx.font = '800 15px system-ui';
  ctx.fillText(shop.message || 'Escolhe uma opção.', x + 24, y + 263);

  ctx.restore();
}

function drawShopOption(x, y, key, text) {
  rect(x, y - 20, 34, 28, '#334155');
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 15px system-ui';
  ctx.fillText(key, x + 12, y - 1);

  ctx.fillStyle = '#172033';
  ctx.font = '800 16px system-ui';
  ctx.fillText(text, x + 48, y - 1);
}


function drawWorldHint() {
  if (!currentQuest || !currentMap) return;

  if (currentMap.key === 'mirlon' && currentQuest.key === 'mirlon_prepare') {
    ctx.save();
    ctx.fillStyle = 'rgba(2, 6, 23, 0.70)';
    ctx.fillRect(410, 12, 216, 42);
    ctx.fillStyle = '#fde68a';
    ctx.font = '900 12px system-ui';
    ctx.fillText('Para upar: saída leste →', 424, 31);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '800 10px system-ui';
    ctx.fillText('Boss no topo. Podes tentar quando quiseres.', 424, 46);
    ctx.restore();
  }
}

function drawBattleOverlay() {
  if (!battle?.active) return;

  const enemy = battle.enemy;
  ctx.save();

  ctx.fillStyle = 'rgba(2, 6, 23, 0.68)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // arena
  rect(44, 92, 552, 292, 'rgba(15, 23, 42, 0.94)');
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 3;
  ctx.strokeRect(44, 92, 552, 292);

  ctx.fillStyle = '#fde68a';
  ctx.font = 'bold 18px system-ui';
  ctx.fillText('Combate RPG', 68, 124);

  // jogador
  drawBattleHero(130, 235);
  drawBattleEnemy(enemy, 455, 205);
  drawBattleEffects();

  drawBattleBar(82, 320, 180, 12, player.stats.hp, player.stats.maxHp, '#ef4444', `Denzel HP ${player.stats.hp}/${player.stats.maxHp}`);
  drawBattleBar(366, 320, 180, 12, enemy.hp, enemy.maxHp, '#8b5cf6', `${enemy.name} Nv ${enemy.level || 1} · HP ${enemy.hp}/${enemy.maxHp}`);

  // message box
  rect(64, 344, 512, 78, '#fff6dd');
  ctx.strokeStyle = '#172033';
  ctx.lineWidth = 3;
  ctx.strokeRect(64, 344, 512, 78);
  ctx.fillStyle = '#111827';
  ctx.font = 'bold 14px system-ui';
  ctx.fillText(battleMessage, 82, 370);
  ctx.font = '13px system-ui';
  ctx.fillText(battle.turn === 'player' ? `1 Atacar(+EN)   2 Luz(-2 EN)   3 Recuperar   4 Poção   EN ${getStaffEnergy()}/${maxStaffEnergy()}` : 'Aguarda o movimento...', 82, 397);

  ctx.fillStyle = '#cbd5e1';
  ctx.font = '12px system-ui';
  battleLog.slice(0, 3).forEach((line, index) => {
    ctx.fillText(line, 70, 445 + (index * 15));
  });

  ctx.restore();
}

function drawBattleHero(x, y) {
  ctx.save();
  const oldX = player.x;
  const oldY = player.y;
  const oldDirection = player.direction;
  player.x = x;
  player.y = y;
  player.direction = 'right';
  drawCharacter(player, true);
  player.x = oldX;
  player.y = oldY;
  player.direction = oldDirection;
  ctx.restore();
}

function drawBattleEnemy(enemy, x, y) {
  ctx.save();
  const pulse = Math.sin(frame / 8) * 2;
  const flashAlpha = battleFlash > 0 ? 0.35 : 0;

  if (enemy.type === 'light_target') {
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(x + 18, y + 63, 28, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    const glow = battleFlash > 0 ? 0.7 : 0.35;
    ctx.fillStyle = `rgba(255, 210, 138, ${glow})`;
    ctx.beginPath();
    ctx.ellipse(x + 18, y + 33 + pulse, 34, 38, 0, 0, Math.PI * 2);
    ctx.fill();
    rect(x + 11, y + 12 + pulse, 14, 38, '#ffb347');
    rect(x + 15, y + 6 + pulse, 6, 50, '#fff3c4');
    rect(x + 5, y + 27 + pulse, 26, 10, '#f97316');
    ctx.restore();
    return;
  }

  if (enemy.type === 'boss') {
    ctx.fillStyle = 'rgba(0,0,0,0.32)';
    ctx.beginPath();
    ctx.ellipse(x + 18, y + 63, 35, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(99, 102, 241, 0.24)';
    ctx.beginPath();
    ctx.ellipse(x + 18, y + 31 + pulse, 42, 50, 0, 0, Math.PI * 2);
    ctx.fill();

    rect(x, y + 22 + pulse, 36, 36, '#1e1b4b');
    rect(x + 5, y + 8 + pulse, 26, 22, '#312e81');
    rect(x - 5, y + 30 + pulse, 10, 22, '#1e1b4b');
    rect(x + 31, y + 30 + pulse, 10, 22, '#1e1b4b');
    rect(x + 10, y + 16 + pulse, 5, 5, '#facc15');
    rect(x + 22, y + 16 + pulse, 5, 5, '#facc15');
    rect(x + 14, y + 2 + pulse, 10, 8, '#a5b4fc');
    if (flashAlpha) {
      ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`;
      ctx.fillRect(x - 10, y, 56, 68);
    }
    ctx.restore();
    return;
  }

  if (enemy.type === 'brute') {
    ctx.fillStyle = 'rgba(0,0,0,0.36)';
    ctx.beginPath();
    ctx.ellipse(x + 18, y + 66, 42, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    rect(x - 8, y + 25 + pulse, 52, 38, '#3b0a0a');
    rect(x + 0, y + 4 + pulse, 36, 28, '#7f1d1d');
    rect(x - 9, y + 8 + pulse, 13, 8, '#111827');
    rect(x + 32, y + 8 + pulse, 13, 8, '#111827');
    rect(x - 18, y + 32 + pulse, 12, 28, '#4c0519');
    rect(x + 42, y + 32 + pulse, 12, 28, '#4c0519');
    rect(x + 2, y + 56 + pulse, 12, 17, '#111827');
    rect(x + 24, y + 56 + pulse, 12, 17, '#111827');
    rect(x + 10, y + 16 + pulse, 6, 6, '#facc15');
    rect(x + 24, y + 16 + pulse, 6, 6, '#facc15');
    if (flashAlpha) {
      ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`;
      ctx.fillRect(x - 18, y, 74, 80);
    }
    ctx.restore();
    return;
  }

  if (enemy.type === 'imp') {
    ctx.fillStyle = 'rgba(0,0,0,0.32)';
    ctx.beginPath();
    ctx.ellipse(x + 18, y + 63, 35, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    rect(x - 2, y + 23 + pulse, 40, 36, '#4c0519');
    rect(x + 4, y + 8 + pulse, 28, 23, '#7f1d1d');
    rect(x - 6, y + 8 + pulse, 12, 8, '#111827');
    rect(x + 30, y + 8 + pulse, 12, 8, '#111827');
    rect(x + 10, y + 17 + pulse, 5, 5, '#facc15');
    rect(x + 22, y + 17 + pulse, 5, 5, '#facc15');
    rect(x + 1, y + 33 + pulse, 8, 23, '#3b0a0a');
    rect(x + 30, y + 33 + pulse, 8, 23, '#3b0a0a');
    if (flashAlpha) {
      ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`;
      ctx.fillRect(x - 10, y, 58, 70);
    }
    ctx.restore();
    return;
  }

  ctx.fillStyle = 'rgba(0,0,0,0.32)';
  ctx.beginPath();
  ctx.ellipse(x + 18, y + 63, 35, 9, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(99, 102, 241, 0.24)';
  ctx.beginPath();
  ctx.ellipse(x + 18, y + 31 + pulse, 42, 50, 0, 0, Math.PI * 2);
  ctx.fill();

  rect(x, y + 22 + pulse, 36, 36, '#1e1b4b');
  rect(x + 5, y + 8 + pulse, 26, 22, '#312e81');
  rect(x - 5, y + 30 + pulse, 10, 22, '#1e1b4b');
  rect(x + 31, y + 30 + pulse, 10, 22, '#1e1b4b');
  rect(x + 10, y + 16 + pulse, 5, 5, '#facc15');
  rect(x + 22, y + 16 + pulse, 5, 5, '#facc15');
  rect(x + 14, y + 2 + pulse, 10, 8, '#a5b4fc');

  if (flashAlpha) {
    ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`;
    ctx.fillRect(x - 10, y, 56, 68);
  }

  ctx.restore();
}

function drawBattleBar(x, y, w, h, value, max, color, label) {
  rect(x, y, w, h, '#020617');
  rect(x, y, Math.max(0, Math.min(w, w * (value / max))), h, color);
  ctx.fillStyle = '#e2e8f0';
  ctx.font = 'bold 12px system-ui';
  ctx.fillText(label, x, y - 6);
}

function shouldShowAttackAftermath() {
  if (!currentQuest) return false;
  const q = currentQuest.key;
  return ['return_home', 'find_father', 'escape_forest'].includes(q) || powerEvent?.active || isAldaraFullyDestroyed();
}

function shouldShowMinorDemons() {
  if (!currentQuest) return false;
  if (flags.minor_demons_destroyed) return false;
  return currentQuest.key === 'return_home' || powerEvent?.active;
}

function drawAttackSceneDecorations() {
  if (!shouldShowAttackAftermath()) return;

  drawFallenVillager(6, 6, '#0f766e', '#7c4a32', '#1e293b', 'right');
  drawFallenVillager(12, 8, '#be185d', '#6b3f2a', '#111827', 'left');
  drawFallenVillager(15, 6, '#92400e', '#7c4a32', '#111827', 'right');

  if (isAldaraFullyDestroyed()) {
    drawFallenVillager(4, 10, '#475569', '#7c4a32', '#111827', 'left');
    drawFallenVillager(9, 9, '#854d0e', '#6b3f2a', '#111827', 'right');
    drawFallenVillager(16, 11, '#7c3aed', '#7c4a32', '#111827', 'left');
    drawFallenVillager(2, 6, '#1d4ed8', '#6b3f2a', '#111827', 'right');
    drawAshAndSmoke();
  }

  if (shouldShowMinorDemons()) {
    let alpha = 1;
    if (powerEvent?.active) {
      const elapsed = frame - powerEvent.startFrame;
      if (elapsed > 42) {
        alpha = Math.max(0, 1 - ((elapsed - 42) / 58));
      }
    }

    drawMinorDemon(9, 5, alpha, 0);
    drawMinorDemon(12, 6, alpha, 1);
  }
}

function drawAshAndSmoke() {
  ctx.save();
  for (let i = 0; i < 18; i++) {
    const x = ((i * 37 + frame * 0.35) % 640);
    const y = 58 + ((i * 29 + Math.sin(frame / 20 + i) * 18) % 330);
    ctx.fillStyle = i % 2 ? 'rgba(15, 23, 42, 0.16)' : 'rgba(226, 232, 240, 0.14)';
    ctx.beginPath();
    ctx.ellipse(x, y, 8 + (i % 4) * 3, 3 + (i % 3), 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(69, 26, 3, 0.18)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
}

function drawFallenVillager(gridX, gridY, body, skin, hair, direction = 'right') {
  const x = gridX * 32;
  const y = gridY * 32;

  rect(x + 4, y + 23, 24, 5, 'rgba(0,0,0,0.25)');

  if (direction === 'right') {
    rect(x + 8, y + 18, 15, 7, body);
    rect(x + 22, y + 17, 8, 8, skin);
    rect(x + 24, y + 15, 6, 3, hair);
    rect(x + 5, y + 20, 5, 3, '#0f172a');
    rect(x + 10, y + 25, 5, 3, '#0f172a');
  } else {
    rect(x + 9, y + 18, 15, 7, body);
    rect(x + 2, y + 17, 8, 8, skin);
    rect(x + 2, y + 15, 6, 3, hair);
    rect(x + 23, y + 20, 5, 3, '#0f172a');
    rect(x + 18, y + 25, 5, 3, '#0f172a');
  }

  rect(x + 12, y + 18, 8, 2, '#ffffff33');
}

function drawMinorDemon(gridX, gridY, alpha = 1, phase = 0) {
  const x = gridX * 32;
  const y = gridY * 32;
  const shake = powerEvent?.active && frame - powerEvent.startFrame > 35 ? Math.sin(frame + phase * 10) * 2 : 0;
  const px = x + shake;
  const py = y + Math.sin((frame + phase * 14) / 9) * 1.2;

  ctx.save();
  ctx.globalAlpha = Math.max(0, alpha);

  ellipse(px + 16, py + 28, 10, 4, 'rgba(0,0,0,0.32)');

  // corpo pequeno, escuro e demoníaco
  rect(px + 9, py + 13, 14, 13, '#3b0a0a');
  rect(px + 11, py + 9, 10, 8, '#4c0519');
  rect(px + 7, py + 7, 6, 4, '#111827');
  rect(px + 19, py + 7, 6, 4, '#111827');
  rect(px + 7, py + 18, 4, 7, '#3b0a0a');
  rect(px + 21, py + 18, 4, 7, '#3b0a0a');
  rect(px + 11, py + 25, 4, 4, '#111827');
  rect(px + 18, py + 25, 4, 4, '#111827');

  // olhos
  rect(px + 12, py + 12, 2, 2, '#facc15');
  rect(px + 18, py + 12, 2, 2, '#facc15');

  // energia a desfazer os demónios durante o grito
  if (powerEvent?.active && frame - powerEvent.startFrame > 42) {
    const elapsed = frame - powerEvent.startFrame;
    const spread = Math.min(16, (elapsed - 42) * 0.35);
    rect(px + 7 - spread * 0.25, py + 8 - spread * 0.35, 3, 3, '#ffd28a');
    rect(px + 22 + spread * 0.2, py + 13 - spread * 0.25, 3, 3, '#ffb347');
    rect(px + 13, py + 26 + spread * 0.15, 3, 3, '#fff3c4');
    rect(px + 18 + spread * 0.1, py + 22, 2, 2, '#ffd28a');
  }

  ctx.restore();
}

function drawPowerWaveEvent() {
  if (!powerEvent?.active) return;

  const elapsed = frame - powerEvent.startFrame;
  const cx = player.x + 16;
  const cy = player.y + 16;
  const radius = Math.min(210, elapsed * 2.2);
  const alpha = Math.max(0, 0.58 - elapsed / 210);

  ctx.save();
  ctx.lineWidth = 4;
  ctx.strokeStyle = `rgba(255, 210, 138, ${alpha})`;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.lineWidth = 2;
  ctx.strokeStyle = `rgba(255, 243, 196, ${Math.max(0, alpha - 0.08)})`;
  ctx.beginPath();
  ctx.arc(cx, cy, Math.max(0, radius - 13), 0, Math.PI * 2);
  ctx.stroke();

  if (elapsed < 45) {
    ctx.fillStyle = `rgba(255, 179, 71, ${0.22 - elapsed / 260})`;
    ctx.beginPath();
    ctx.arc(cx, cy, 28 + elapsed * 0.9, 0, Math.PI * 2);
    ctx.fill();
  }

  // pequeno texto de impacto durante o grito
  if (elapsed > 10 && elapsed < 72) {
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.font = 'bold 15px system-ui';
    ctx.fillText('ONDE ESTÁ O MEU IRMÃO?!', Math.max(12, cx - 105), Math.max(34, cy - 28));
  }

  ctx.restore();
}


function drawDarkMapAtmosphere() {
  if (isAldaraFullyDestroyed()) {
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.20)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    return;
  }

  if (currentMap?.mapData?.theme === 'mirlon_burning') {
    ctx.save();
    ctx.fillStyle = 'rgba(69, 26, 3, 0.16)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < 8; i++) {
      const x = (i * 83 + frame * 0.25) % canvas.width;
      const y = 46 + ((i * 41) % 330);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.12)';
      ctx.beginPath();
      ctx.ellipse(x, y, 24, 6, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    return;
  }

  if (currentMap?.mapData?.theme !== 'dark') return;

  ctx.save();
  const isTrainingTrail = currentMap?.key === 'trilho_mirlon';
  ctx.fillStyle = isTrainingTrail ? 'rgba(2, 6, 23, 0.50)' : 'rgba(2, 6, 23, 0.28)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const mistOffset = (frame % 180) - 90;
  ctx.fillStyle = isTrainingTrail ? 'rgba(148, 163, 184, 0.12)' : 'rgba(226, 232, 240, 0.08)';
  ctx.beginPath();
  ctx.ellipse(120 + mistOffset, 120, isTrainingTrail ? 160 : 120, 20, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(430 - mistOffset * 0.6, 270, isTrainingTrail ? 190 : 150, 24, 0, 0, Math.PI * 2);
  ctx.fill();

  if (isTrainingTrail) {
    for (let i = 0; i < 18; i++) {
      const sx = (i * 37 + 19) % canvas.width;
      const sy = (i * 53 + 11) % 130;
      ctx.fillStyle = i % 3 === 0 ? 'rgba(253, 230, 138, 0.40)' : 'rgba(226, 232, 240, 0.22)';
      ctx.fillRect(sx, sy, 2, 2);
    }

    const gradient = ctx.createRadialGradient(player.x + 16, player.y + 16, 40, player.x + 16, player.y + 16, 250);
    gradient.addColorStop(0, 'rgba(255, 210, 138, 0.05)');
    gradient.addColorStop(1, 'rgba(2, 6, 23, 0.34)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  ctx.fillStyle = isTrainingTrail ? 'rgba(49, 46, 129, 0.14)' : 'rgba(127, 29, 29, 0.10)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
}

function drawHud() {
  rect(12, 12, 330, 38, 'rgba(15, 23, 42, 0.78)');
  rect(17, 18, 8, 8, '#facc15');
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 15px system-ui';
  ctx.fillText(currentQuest.title, 32, 30);
  ctx.fillStyle = '#cbd5e1';
  ctx.font = '12px system-ui';
  ctx.fillText(`${currentMap.name} · Dados do Django`, 32, 44);

  const s = player.stats;
  const x = 12;
  const y = 58;
  rect(x, y, 230, 72, 'rgba(15, 23, 42, 0.78)');
  ctx.fillStyle = '#fde68a';
  ctx.font = 'bold 13px system-ui';
  ctx.fillText(`Denzel · Nível ${s.level}`, x + 10, y + 17);

  drawMiniBar(x + 10, y + 24, 88, 8, s.hp / s.maxHp, '#ef4444');
  drawMiniBar(x + 110, y + 24, 88, 8, s.xp / s.xpToNext, '#facc15');

  ctx.fillStyle = '#e2e8f0';
  ctx.font = '11px system-ui';
  ctx.fillText(`HP ${s.hp}/${s.maxHp}`, x + 10, y + 46);
  ctx.fillText(`XP ${s.xp}/${s.xpToNext}`, x + 110, y + 46);
  ctx.fillStyle = '#fde68a';
  ctx.fillText(`Ouro ${player.gold} · Poções ${player.inventory.potion || 0} · EN ${getStaffEnergy()}/${maxStaffEnergy()}`, x + 10, y + 62);
}

function drawMiniBar(x, y, w, h, ratio, color) {
  rect(x, y, w, h, 'rgba(2, 6, 23, 0.9)');
  rect(x, y, Math.max(0, Math.min(w, w * ratio)), h, color);
}

loadGame().catch(error => {
  questTitle.textContent = 'Erro ao carregar';
  questObjective.textContent = error.message;
  console.error(error);
});
