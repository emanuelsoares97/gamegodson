const OFDD_DEV_MODE = new URLSearchParams(window.location.search).get('dev') === '1';
window.OFDD_DEV_MODE = OFDD_DEV_MODE;

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const kraidusResetBtn = document.getElementById('kraidusResetBtn');
if (kraidusResetBtn) {
  kraidusResetBtn.addEventListener('click', () => {
    if (!OFDD_DEV_MODE) return;
    goToKraidusFight(true);
  });
}

const gameTitle = document.getElementById('gameTitle');
const gameSubtitle = document.getElementById('gameSubtitle');
const chapterBadge = document.getElementById('chapterBadge');
const questTitle = document.getElementById('questTitle');
const questObjective = document.getElementById('questObjective');
const questDetails = document.getElementById('questDetails');
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
let questToast = null;
let saveToast = null;
let lastSaveToastFrame = -999;
let battle = null;
let battleMessage = '';
let battleLog = [];
let battleFlash = 0;
let battleEffects = [];
let battleActionBanner = null;
let battleShake = 0;
let enemyHitPulse = 0;
let enemyHitColor = '#ffffff';
let shop = null;
let quickEvent = null;
let kraidusEvent = null;
let pausedKraidusEnemy = null;
let lureiEvent = null;
let pausedLureiEnemy = null;
let shadowEntranceEvent = null;
let nilzinAbductionEvent = null;
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
  if (Array.isArray(object?.allowQuestKeys) && object.allowQuestKeys.includes(currentQuest?.key)) return true;
  const requiredQuest = object.questKey || (object.type === 'light_target' ? 'staff_precision_trial' : 'forest_hunt');
  if (currentQuest?.key === requiredQuest) return true;
  if (requiredQuest === 'mirlon_prepare' && currentQuest?.key === 'public_battle_mirlon') return true;
  if (requiredQuest === 'elranor_farm' && ['outer_elranor_watch', 'elranor_gate_warning', 'break_elranor_seal'].includes(currentQuest?.key)) return true;
  if (requiredQuest === 'denzel2_free_roam' && ['denzel2_free_roam', 'denzel2_lurei_walk', 'denzel2_nilzin_hint', 'd2_council_shadow', 'd2_years_later_return'].includes(currentQuest?.key)) return true;
  return false;
}

let npcs = [];

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return '';
}

const MOBILE_SAVE_KEY = 'ofdd_mobile_save_v33';

const KRAIDUS_CHECKPOINT_KEY = 'ofdd_mobile_kraidus_checkpoint_v1';
const KRAIDUS_CUTSCENE_DENZEL_SCALE = 0.42;
const KRAIDUS_CUTSCENE_STAFF_SCALE = 0.58;
const DENZEL2_FREE_ROAM_REQUIRED_SHADOWS = 3;
const BOSS_SHORTCUTS_TEXT = 'Atalhos: M=Mirlon · K=Kraidus · N=Nilzin · J=Guerreiro Sombrio · L=Lurei · F=Nilzin Final';

function getSceneConfig(key) {
  return (window.GAME_SCENES && window.GAME_SCENES[key]) || {};
}

function isTitleMenuOpen() {
  const menu = document.getElementById('titleMenu');
  return Boolean(window.OFDD_MENU_OPEN || (menu && !menu.classList.contains('hidden')));
}

function showQuestToast(title, objective = '') {
  questToast = {
    title: title || 'Nova missão',
    objective: objective || '',
    life: 170,
    maxLife: 170,
  };
}

function showSaveToast() {
  if (frame - lastSaveToastFrame < 95) return;
  lastSaveToastFrame = frame;
  saveToast = { text: 'Progresso guardado', life: 90, maxLife: 90 };
}

function updateUiToasts() {
  if (questToast) {
    questToast.life -= 1;
    if (questToast.life <= 0) questToast = null;
  }
  if (saveToast) {
    saveToast.life -= 1;
    if (saveToast.life <= 0) saveToast = null;
  }
}

function drawUiToasts() {
  if (questToast) {
    const alpha = Math.max(0, Math.min(1, questToast.life / 32));
    ctx.save();
    ctx.globalAlpha = alpha;
    rect(154, 24, 332, 74, 'rgba(15, 23, 42, 0.90)');
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.82)';
    ctx.lineWidth = 2;
    ctx.strokeRect(154, 24, 332, 74);
    ctx.fillStyle = '#fde68a';
    ctx.font = '900 12px system-ui';
    ctx.fillText('NOVA MISSÃO', 176, 47);
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 16px system-ui';
    ctx.fillText(String(questToast.title).slice(0, 38), 176, 68);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '800 11px system-ui';
    ctx.fillText(String(questToast.objective).slice(0, 58), 176, 86);
    ctx.restore();
  }

  if (saveToast) {
    const alpha = Math.max(0, Math.min(1, saveToast.life / 28));
    ctx.save();
    ctx.globalAlpha = alpha;
    rect(486, 18, 132, 26, 'rgba(15, 23, 42, 0.84)');
    ctx.fillStyle = '#bbf7d0';
    ctx.font = '900 11px system-ui';
    ctx.fillText(saveToast.text, 500, 35);
    ctx.restore();
  }
}

function getLureiFormConfig(formKey) {
  return (window.LUREI_FORMS && window.LUREI_FORMS[formKey]) || window.LUREI_FORMS?.normal || {};
}

function getDenzelWingConfigForDirection(direction = 'down') {
  const visual = window.DENZEL_VISUAL_CONFIG || {};
  const wingConfig = visual.mapWings || {};
  const key = direction === 'up' ? 'back' : (direction === 'left' || direction === 'right' ? 'side' : 'front');
  return wingConfig[key] || wingConfig.front || {};
}

function getCinematicWingsConfig(sceneKey = '', direction = 'down') {
  // As cutscenes usam a mesma configuração das asas do mapa.
  // sceneKey fica no argumento só para manter compatibilidade com chamadas antigas.
  return getDenzelWingConfigForDirection(direction);
}

function getCurrentSavePayload() {
  return {
    currentMapKey: currentMap.key,
    currentQuestKey: currentQuest.key,
    playerX: player.gridX,
    playerY: player.gridY,
    stats: deepClone(player.stats),
    gold: player.gold,
    inventory: deepClone(player.inventory),
    flags: deepClone(flags),
  };
}

function loadKraidusCheckpoint() {
  try {
    return JSON.parse(localStorage.getItem(KRAIDUS_CHECKPOINT_KEY) || 'null');
  } catch (error) {
    console.warn('Checkpoint do Kraidus inválido:', error);
    return null;
  }
}

function storeKraidusCheckpoint(payload) {
  try {
    localStorage.setItem(KRAIDUS_CHECKPOINT_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn('Não foi possível guardar o checkpoint do Kraidus:', error);
  }
}

function clearKraidusCheckpoint() {
  try {
    localStorage.removeItem(KRAIDUS_CHECKPOINT_KEY);
  } catch (error) {
    console.warn('Não foi possível limpar o checkpoint do Kraidus:', error);
  }
}

function saveKraidusCheckpoint(force = false) {
  if (!force && loadKraidusCheckpoint()) return;
  const snapshot = getCurrentSavePayload();
  snapshot.flags = snapshot.flags || {};
  snapshot.flags.denzel_wings_unlocked = false;
  snapshot.flags.kraidus_phase_two = false;
  snapshot.flags.kraidus_transformed = false;
  snapshot.flags.kraidus_defeated = false;
  storeKraidusCheckpoint(snapshot);
  updateKraidusResetButton();
}

function restoreKraidusCheckpoint(checkpointOverride = null) {
  const checkpoint = checkpointOverride || loadKraidusCheckpoint();
  if (!checkpoint) return false;
  storeLocalSave(checkpoint);
  window.location.reload();
  return true;
}

function normaliseKraidusReplaySnapshot(snapshot) {
  snapshot.flags = snapshot.flags || {};
  snapshot.flags.has_staff = true;
  snapshot.flags.denzel_wings_unlocked = false;
  snapshot.flags.kraidus_phase_two = false;
  snapshot.flags.kraidus_transformed = false;
  snapshot.flags.kraidus_defeated = false;

  [
    'enemy_kraidus_final_boss_defeated',
    'enemy_castle_demon_1_defeated',
    'enemy_castle_demon_2_defeated',
    'enemy_castle_demon_3_defeated',
    'enemy_castle_demon_4_defeated',
  ].forEach(key => {
    snapshot.flags[key] = false;
  });

  if (!snapshot.inventory || typeof snapshot.inventory !== 'object') snapshot.inventory = {};
  snapshot.inventory.potion = Math.max(Number(snapshot.inventory.potion || 0), 5);
  snapshot.inventory.lightShard = Math.max(Number(snapshot.inventory.lightShard || 0), 0);

  if (!snapshot.stats || typeof snapshot.stats !== 'object') snapshot.stats = {};
  snapshot.stats.hp = Math.max(Number(snapshot.stats.hp || 0), Math.ceil(Number(snapshot.stats.maxHp || 35) * 0.75));

  return snapshot;
}

function buildKraidusFallbackCheckpoint() {
  const baseStats = deepClone(player.stats || DATA?.save?.stats || {});
  const preparedMaxHp = Math.max(Number(baseStats.maxHp || 35), 160);
  const preparedStats = {
    ...baseStats,
    level: Math.max(Number(baseStats.level || 1), 14),
    xp: Number(baseStats.xp || 0),
    xpToNext: Math.max(Number(baseStats.xpToNext || 50), 1600),
    maxHp: preparedMaxHp,
    hp: preparedMaxHp,
    attack: Math.max(Number(baseStats.attack || 5), 24),
    defense: Math.max(Number(baseStats.defense || 2), 10),
  };

  return normaliseKraidusReplaySnapshot({
    currentMapKey: 'kraidus_castle',
    currentQuestKey: 'kraidus_battle',
    playerX: 10,
    playerY: 6,
    stats: preparedStats,
    gold: Math.max(Number(player.gold || DATA?.save?.gold || 0), 80),
    inventory: deepClone(player.inventory || DATA?.save?.inventory || {}),
    flags: deepClone(flags || DATA?.save?.flags || {}),
  });
}


function clearFlagKeys(keys) {
  keys.forEach(key => {
    flags[key] = false;
  });
  if (flags.enemyRespawns && typeof flags.enemyRespawns === 'object') {
    keys.forEach(key => {
      const enemyKey = key.replace(/^enemy_/, '').replace(/_defeated$/, '');
      delete flags.enemyRespawns[enemyKey];
    });
  }
}

function resetBossState(bossKey) {
  const common = ['battle_locked', 'battle_complete'];
  if (bossKey === 'mirlon') {
    clearFlagKeys([...common, 'mirlon_boss_defeated', 'mirlon_minor_demons_dispelled', 'enemy_mirlon_public_demon_defeated']);
  }
  if (bossKey === 'kraidus') {
    clearFlagKeys([...common, 'kraidus_defeated', 'kraidus_phase_two', 'kraidus_transformed', 'enemy_kraidus_final_boss_defeated', 'enemy_castle_demon_1_defeated', 'enemy_castle_demon_2_defeated', 'enemy_castle_demon_3_defeated', 'enemy_castle_demon_4_defeated']);
    flags.denzel_wings_unlocked = false;
  }
  if (bossKey === 'nilzin') {
    clearFlagKeys([...common, 'd2_nilzin_first_defeated', 'nilzin_transformation_done', 'enemy_nilzin_boss_d2_defeated', 'auto_d2_lurei_abducted_lurei_abduction_marker']);
    // Nesta fase Denzel já usa as Asas de Luz; não há nova transformação antes da luta.
    flags.denzel_wings_unlocked = true;
  }
  if (bossKey === 'shadow_warrior') {
    clearFlagKeys([...common, 'd2_shadow_warrior_defeated', 'lurei_identity_revealed', 'enemy_lurei_shadow_first_defeated', 'auto_d2_lurei_reveal_lurei_reveal_marker']);
    // A partir da primeira luta contra Nilzin, Denzel mantém as asas.
    flags.denzel_wings_unlocked = true;
  }
  if (bossKey === 'lurei') {
    clearFlagKeys([...common, 'd2_lurei_weakened', 'enemy_lurei_shadow_second_defeated', 'auto_d2_purification_purification_marker']);
    flags.lurei_identity_revealed = true;
    flags.denzel_wings_unlocked = true;
  }
  if (bossKey === 'nilzin_final') {
    clearFlagKeys([...common, 'd2_nilzin_final_defeated', 'enemy_nilzin_final_boss_defeated']);
    flags.lurei_identity_revealed = true;
    flags.denzel_wings_unlocked = true;
  }
}

function prepareBossStats(level, maxHp, attack, defense, potions = 4) {
  player.stats.level = Math.max(player.stats.level || 1, level);
  player.stats.maxHp = Math.max(player.stats.maxHp || 35, maxHp);
  player.stats.hp = player.stats.maxHp;
  player.stats.attack = Math.max(player.stats.attack || 5, attack);
  player.stats.defense = Math.max(player.stats.defense || 2, defense);
  player.inventory.potion = Math.max(player.inventory.potion || 0, potions);
  setStaffEnergy(maxStaffEnergy());
}

function goToKraidusFight(confirmAction = false) {
  if (confirmAction) {
    const confirmed = window.confirm('Queres voltar diretamente à luta contra Kraidus?');
    if (!confirmed) return false;
  }

  const checkpoint = normaliseKraidusReplaySnapshot(loadKraidusCheckpoint() || buildKraidusFallbackCheckpoint());
  checkpoint.flags = checkpoint.flags || {};
  ['kraidus_defeated','kraidus_phase_two','kraidus_transformed','enemy_kraidus_final_boss_defeated','enemy_castle_demon_1_defeated','enemy_castle_demon_2_defeated','enemy_castle_demon_3_defeated','enemy_castle_demon_4_defeated'].forEach(key => checkpoint.flags[key] = false);
  checkpoint.flags.denzel_wings_unlocked = false;
  storeKraidusCheckpoint(checkpoint);
  return restoreKraidusCheckpoint(checkpoint);
}

function goToNilzinPreFight(confirmAction = false) {
  if (confirmAction) {
    const confirmed = window.confirm('Queres ir diretamente para o mapa antes da luta contra a Nilzin?');
    if (!confirmed) return false;
  }

  const target = DATA.maps.eldoria_ceremony_attack;
  const quest = DATA.quests.d2_nilzin_battle;
  if (!target || !quest) return false;

  currentMap = target;
  currentQuest = quest;
  flags.has_staff = true;
  flags.d2CeremonyDemonsDefeated = 3;
  resetBossState('nilzin');
  prepareBossStats(19, 160, 28, 11, 4);

  player.gridX = 12;
  player.gridY = 10;
  player.x = player.gridX * target.tileSize;
  player.y = player.gridY * target.tileSize;
  player.targetX = player.x;
  player.targetY = player.y;
  player.direction = 'up';
  player.moving = false;

  closeBattle();
  buildNpcs();
  refreshQuestPanel();
  refreshStatsPanel();
  addFloatingMessage('Mapa antes da Nilzin', player.x + 16, player.y - 20, '#fde68a');
  saveProgress();
  return true;
}

function applyBossJumpState(targetMapKey, targetQuestKey, x, y, setup = () => {}, label = 'Boss') {
  const target = DATA.maps[targetMapKey];
  const quest = DATA.quests[targetQuestKey];
  if (!target || !quest) return false;

  currentMap = target;
  currentQuest = quest;
  flags.has_staff = true;
  closeBattle();
  setup();

  player.gridX = x;
  player.gridY = y;
  player.x = player.gridX * target.tileSize;
  player.y = player.gridY * target.tileSize;
  player.targetX = player.x;
  player.targetY = player.y;
  player.direction = 'up';
  player.moving = false;

  buildNpcs();
  refreshQuestPanel();
  refreshStatsPanel();
  addFloatingMessage(label, player.x + 16, player.y - 20, '#fde68a');
  saveProgress();
  return true;
}

function goToMirlonBoss(confirmAction = false) {
  if (confirmAction && !window.confirm('Queres ir diretamente para o boss de Mirlon?')) return false;
  return applyBossJumpState('mirlon', 'public_battle_mirlon', 10, 8, () => {
    resetBossState('mirlon');
    flags.denzel_wings_unlocked = false;
    prepareBossStats(7, 82, 13, 4, 3);
  }, 'Boss de Mirlon');
}

function goToShadowWarriorBoss(confirmAction = false) {
  if (confirmAction && !window.confirm('Queres ir diretamente para o Guerreiro Sombrio?')) return false;
  return applyBossJumpState('d2_ruined_village', 'd2_first_lurei_battle', 10, 11, () => {
    resetBossState('shadow_warrior');
    prepareBossStats(18, 146, 26, 10, 4);
    flags.denzel_wings_unlocked = true;
  }, 'Guerreiro Sombrio');
}

function goToLureiBoss(confirmAction = false) {
  if (confirmAction && !window.confirm('Queres ir diretamente para a luta contra Lurei?')) return false;
  return applyBossJumpState('d2_ruined_village', 'd2_lurei_phase_two', 10, 11, () => {
    resetBossState('lurei');
    prepareBossStats(19, 158, 29, 11, 5);
    flags.denzel_wings_unlocked = true;
  }, 'Lurei');
}

function goToNilzinFinalBoss(confirmAction = false) {
  if (confirmAction && !window.confirm('Queres ir diretamente para a luta final contra a Nilzin?')) return false;
  return applyBossJumpState('d2_ruined_village', 'd2_nilzin_final', 10, 9, () => {
    resetBossState('nilzin_final');
    prepareBossStats(20, 170, 31, 12, 5);
    flags.denzel_wings_unlocked = true;
  }, 'Nilzin Final');
}

function updateKraidusResetButton() {
  const btn = document.getElementById('kraidusResetBtn');
  if (!btn) return;
  const checkpoint = loadKraidusCheckpoint();
  const canShow = Boolean(checkpoint) && OFDD_DEV_MODE;
  btn.hidden = !canShow;
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadLocalSave() {
  try {
    return JSON.parse(localStorage.getItem(MOBILE_SAVE_KEY) || 'null');
  } catch (error) {
    console.warn('Save local inválido:', error);
    return null;
  }
}

function storeLocalSave(payload) {
  try {
    localStorage.setItem(MOBILE_SAVE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn('Não foi possível guardar o progresso:', error);
  }
}

function apiPost(url, payload = {}) {
  if (url.includes('/api/save/')) {
    storeLocalSave(payload);
  }
  if (url.includes('/api/reset/')) {
    localStorage.removeItem(MOBILE_SAVE_KEY);
  }
  return Promise.resolve({ ok: true });
}

async function loadGame() {
  if (!window.OFDD_BOOTSTRAP_DATA) {
    throw new Error('Dados offline em falta. Abre o ficheiro index.html completo da versão mobile.');
  }

  DATA = deepClone(window.OFDD_BOOTSTRAP_DATA);
  const localSave = loadLocalSave();
  if (localSave) {
    DATA.save = {
      ...DATA.save,
      ...localSave,
      stats: { ...(DATA.save.stats || {}), ...(localSave.stats || {}) },
      inventory: { ...(DATA.save.inventory || {}), ...(localSave.inventory || {}) },
      flags: { ...(DATA.save.flags || {}), ...(localSave.flags || {}) },
    };
  }
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
  updateKraidusResetButton();
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

  if (questDetails) {
    const details = buildQuestDetails();
    questDetails.innerHTML = details.map(item => `
      <div class="quest-detail ${item.type || ''}">
        <strong>${item.label}</strong>
        <span>${item.text}</span>
      </div>
    `).join('');
  }
}

function buildQuestDetails() {
  if (!currentQuest) return [];
  const q = currentQuest.key;
  const mapKey = currentMap?.key || '';
  const details = [];

  if (mapKey === 'elranor_peace') {
    details.push({ label: 'Zona', text: 'Elranor em Paz — cidade protegida pelos Cavaleiros da Luz.' });
  } else if (mapKey === 'd2_light_training_ground') {
    details.push({ label: 'Zona', text: 'Campo dos Cavaleiros — treino opcional, loja e projeções de combate.' });
  } else if (mapKey === 'd2_golden_fields') {
    details.push({ label: 'Zona', text: 'Campos Dourados — farm livre com sombras remanescentes.' });
  } else if (mapKey === 'kraidus_castle') {
    details.push({ label: 'Zona', text: 'Castelo de Kraidus — área de boss.', type: 'warning' });
    details.push({ label: 'Ajuda', text: 'À esquerda tens a saída dourada UPAR para o Pátio Sombrio. Lá há monstros pensados para farm antes do boss.', type: 'optional' });
  } else if (mapKey === 'mirlon') {
    details.push({ label: 'Ajuda', text: 'Se o boss de Mirlon estiver difícil, usa a saída dourada UPAR à esquerda para ir farmar.', type: 'optional' });
  } else if (mapKey === 'eldoria_ceremony_attack') {
    details.push({ label: 'Zona', text: 'Cerimónia Invadida — confronto importante contra Nilzin.', type: 'warning' });
    details.push({ label: 'Ajuda', text: 'À esquerda tens a saída dourada UPAR para o Bosque de Eldoria. Os monstros lá ficam cerca de 2 níveis abaixo de Denzel.', type: 'optional' });
  } else if (mapKey === 'd2_ruined_village') {
    details.push({ label: 'Zona', text: 'Ruínas de Elranor — sequência final de bosses.', type: 'warning' });
    details.push({ label: 'Ajuda', text: 'À esquerda tens a saída dourada UPAR para as Ruínas Externas. Podes farmar antes de voltar ao boss.', type: 'optional' });
  } else if (['mirlon_training_field','kraidus_training_hall','eldoria_training_outskirts','ruined_village_training'].includes(mapKey)) {
    details.push({ label: 'Zona', text: 'Área de treino de boss — monstros para upar antes do combate principal.' });
    details.push({ label: 'Regra', text: 'Os monstros daqui escalam cerca de 2 níveis abaixo de Denzel e reaparecem ao fim de alguns segundos.', type: 'optional' });
  }

  if (q === 'denzel2_free_roam') {
    const defeated = flags.denzel2FreeRoamDefeated || 0;
    details.push({ label: 'Principal', text: 'Para continuar: aproxima-te de Lurei na cidade ou derrota 3 sombras nos mapas laterais.' });
    details.push({ label: 'Progresso', text: `Sombras derrotadas: ${defeated}/${DENZEL2_FREE_ROAM_REQUIRED_SHADOWS}.`, type: defeated >= DENZEL2_FREE_ROAM_REQUIRED_SHADOWS ? '' : 'optional' });
    details.push({ label: 'Mapas', text: 'Oeste: Campo dos Cavaleiros. Este: Campos Dourados. Pisa as setas douradas nas laterais, sem carregar E.', type: 'optional' });
    return details;
  }

  if (['d2_shadow_attack', 'd2_nilzin_battle', 'd2_first_lurei_battle', 'd2_lurei_phase_two', 'd2_nilzin_final'].includes(q)) {
    details.push({ label: 'Atenção', text: 'Boss ou combate importante. Garante HP, energia do cajado e poções.', type: 'warning' });
  }

  if (['mirlon_prepare', 'outer_elranor_watch', 'hordes_to_zaridon', 'liberate_zaridon'].includes(q)) {
    details.push({ label: 'Dica', text: 'Se estiver difícil, procura inimigos opcionais ou zonas de respawn para upar.', type: 'optional' });
  }

  return details;
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

function normaliseDialogLine(line) {
  if (typeof line === 'string') return { text: line };
  if (!line || typeof line !== 'object') return { text: String(line || '') };
  return { ...line, text: line.text || String(line.text || '') };
}

function openDialog(speaker, lines) {
  dialogSpeaker = speaker;
  dialogQueue = (Array.isArray(lines) ? lines : [lines]).map(normaliseDialogLine).filter(item => item.text);
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

  if (completedQuest.key === 'd2_nilzin_reveal') {
    // Ao enfrentar Nilzin, Denzel já mantém as Asas de Luz. Não há cutscene de transformação aqui.
    flags.denzel_wings_unlocked = true;
  }

  if (completedQuest.key === 'd2_nilzin_battle') {
    flags.denzel_wings_unlocked = true;
    player.stats.hp = Math.max(player.stats.hp, Math.ceil(player.stats.maxHp * 0.80));
    setStaffEnergy(maxStaffEnergy());
  }

  if (completedQuest.key === 'd2_lurei_reveal') {
    flags.lurei_identity_revealed = true;
    flags.denzel_wings_unlocked = true;
    player.stats.hp = Math.max(player.stats.hp, Math.ceil(player.stats.maxHp * 0.75));
    setStaffEnergy(maxStaffEnergy());
    addFloatingMessage('Vou salvar o meu irmão!', player.x + 16, player.y - 30, '#fde68a');
  }

  if (completedQuest.key === 'd2_purification') {
    flags.lurei_purified = true;
    player.stats.hp = Math.max(player.stats.hp, Math.ceil(player.stats.maxHp * 0.85));
    setStaffEnergy(maxStaffEnergy());
    addFloatingMessage('Lurei purificado!', player.x + 16, player.y - 30, '#fde68a');
  }

  if (completedQuest.key === 'd2_first_lurei_battle') {
    flags.lurei_identity_revealed = true;
    flags.auto_d2_lurei_reveal_lurei_reveal_marker = false;
    flags['cutscene_d2-lurei-revelado'] = false;
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
  while (currentQuest && (currentQuest.key === 'v14_done' || currentQuest.key === 'v15_done' || currentQuest.key === 'v16_done' || currentQuest.key === 'v18_done' || currentQuest.key === 'v19_done' || currentQuest.key === 'v21_done' || currentQuest.key === 'v22_done' || currentQuest.key === 'v23_done' || currentQuest.key === 'v24_done' || currentQuest.key === 'v25_done' || currentQuest.key === 'v26_done' || currentQuest.title?.toLowerCase().startsWith('fim da versão')) && currentQuest.nextQuestKey && safety < 10) {
    flags[`quest_${currentQuest.key}_done`] = true;
    currentQuest = DATA.quests[currentQuest.nextQuestKey];
    safety++;
  }

  // As asas conquistadas contra Kraidus continuam visíveis no final do livro 1.
  // Só desaparecem no salto temporal, quando Denzel regressa a Elranor já em paz.
  if (currentQuest?.key === 'denzel2_peace_intro') {
    flags.denzel_wings_unlocked = false;
    flags.kraidus_phase_two = false;
  }

  // Depois da primeira luta contra Nilzin, Denzel mantém sempre as Asas de Luz.
  // Só ficam desligadas em pontos anteriores da história ou em atalhos que levam a fases anteriores.

  if (['d2_lurei_reveal', 'd2_purification'].includes(currentQuest?.key)) {
    // Mantém Denzel no ponto certo depois da luta, para a cena seguinte começar automática.
    player.gridX = 10;
    player.gridY = 7;
    player.x = player.gridX * currentMap.tileSize;
    player.y = player.gridY * currentMap.tileSize;
    player.targetX = player.x;
    player.targetY = player.y;
    player.direction = 'up';
  }

  applyQuestMapTransition({ resetPosition: !['d2_lurei_reveal', 'd2_purification'].includes(currentQuest?.key) });
  buildNpcs();
  refreshQuestPanel();
  refreshStatsPanel();
  showQuestToast(currentQuest?.title, currentQuest?.objective);
  maybeShowStartingCutscene();
  saveProgress({ notify: true });

  if (['d2_lurei_reveal', 'd2_purification', 'd2_nilzin_final'].includes(currentQuest?.key)) {
    setTimeout(() => {
      if (!battle?.active && !isDialogOpen() && !isCutsceneOpen()) handleAutoStoryMarkers();
    }, 120);
  }
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
  if (['enter_elranor', 'elranor_ruins_intro', 'elranor_rescue', 'v23_done'].includes(questKey)) {
    return 'elranor_ruins';
  }
  if (['dravon_safe', 'road_to_zaridon'].includes(questKey)) {
    return 'dravon';
  }
  if (['hordes_to_zaridon'].includes(questKey)) {
    return 'zaridon_road';
  }
  if (['zaridon_arrival', 'liberate_zaridon'].includes(questKey)) {
    return 'zaridon_ruins';
  }
  if (['castle_approach', 'meet_kraidus', 'kraidus_battle', 'v24_done', 'v25_done', 'denzel1_family_rescue', 'denzel1_final'].includes(questKey)) {
    return 'kraidus_castle';
  }
  if (['denzel2_peace_intro', 'denzel2_free_roam', 'denzel2_lurei_walk', 'denzel2_nilzin_hint', 'd2_council_shadow', 'd2_years_later_return'].includes(questKey)) {
    return 'elranor_peace';
  }
  if (['d2_ceremony_prepare', 'd2_ceremony_started'].includes(questKey)) {
    return 'eldoria_ceremony';
  }
  if (['d2_shadow_attack', 'd2_nilzin_reveal', 'd2_nilzin_battle', 'd2_lurei_abducted'].includes(questKey)) {
    return 'eldoria_ceremony_attack';
  }
  if (['d2_search_lurei'].includes(questKey)) {
    return 'd2_search_woods';
  }
  if (['d2_shadow_cave', 'd2_lurei_corruption'].includes(questKey)) {
    return 'nilzin_shadow_cave';
  }
  if (['d2_shadow_army'].includes(questKey)) {
    return 'd2_border_villages';
  }
  if (['d2_ruined_village', 'd2_first_lurei_battle', 'd2_lurei_reveal', 'd2_lurei_phase_two', 'd2_purification', 'd2_nilzin_final'].includes(questKey)) {
    return 'd2_ruined_village';
  }
  if (['denzel2_final'].includes(questKey)) {
    return 'eldoria_final';
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

function saveProgress(options = {}) {
  apiPost('/api/save/', getCurrentSavePayload()).catch(() => {});
  if (options.notify) showSaveToast();
  updateKraidusResetButton();
}

async function resetProgress() {
  clearKraidusCheckpoint();
  await apiPost('/api/reset/').catch(() => {});
  window.location.reload();
}

document.addEventListener('keydown', (event) => {
  // Evita que espaço/setas façam scroll na página em modo fullscreen.
  if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key) || ['Numpad1', 'Numpad2', 'Numpad3', 'Numpad4'].includes(event.code)) {
    event.preventDefault();
  }

  keys[event.key] = true;

  if (OFDD_DEV_MODE) {
    if (event.key === 'k' || event.key === 'K') {
      event.preventDefault();
      goToKraidusFight(false);
      return;
    }

    if (event.key === 'n' || event.key === 'N') {
      event.preventDefault();
      goToNilzinPreFight(false);
      return;
    }

    if (event.key === 'm' || event.key === 'M') {
      event.preventDefault();
      goToMirlonBoss(false);
      return;
    }

    if (event.key === 'j' || event.key === 'J') {
      event.preventDefault();
      goToShadowWarriorBoss(false);
      return;
    }

    if (event.key === 'l' || event.key === 'L') {
      event.preventDefault();
      goToLureiBoss(false);
      return;
    }

    if (event.key === 'f' || event.key === 'F') {
      event.preventDefault();
      goToNilzinFinalBoss(false);
      return;
    }

    if (event.key === 'b' || event.key === 'B') {
      event.preventDefault();
      addFloatingMessage('Atalhos de boss ativos', player.x + 16, player.y - 20, '#fde68a');
      battleLog = [BOSS_SHORTCUTS_TEXT];
      return;
    }
  }

  if (shadowEntranceEvent?.active) {
    handleShadowEntranceEventInput(event);
    return;
  }

  if (nilzinAbductionEvent?.active) {
    handleNilzinAbductionEventInput(event);
    return;
  }

  if (quickEvent?.active) {
    handleQuickEventInput(event);
    return;
  }

  if (kraidusEvent?.active) {
    handleKraidusEventInput(event);
    return;
  }

  if (lureiEvent?.active) {
    handleLureiRevealEventInput(event);
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

  if ((event.key === '3' || event.code === 'Numpad3') && canUseFieldActions()) {
    event.preventDefault();
    useFieldRecover();
  }

  if ((event.key === '4' || event.code === 'Numpad4') && canUseFieldActions()) {
    event.preventDefault();
    useFieldPotion();
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
  syncMobileControlMode();
  requestAnimationFrame(loop);
}

function update() {
  if (!DATA) return;

  updateUiToasts();

  if (isTitleMenuOpen()) {
    updateFloatingMessages();
    return;
  }

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

  if (kraidusEvent?.active) {
    updateFloatingMessages();
    updateBattleEffects();
    return;
  }

  if (lureiEvent?.active) {
    updateFloatingMessages();
    updateBattleEffects();
    return;
  }

  if (shadowEntranceEvent?.active || nilzinAbductionEvent?.active) {
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
  if (isBlocked(nx, ny, entity)) {
    // Se o jogador estiver a tentar sair pela borda do mapa, troca de mapa
    // mesmo que a próxima tile esteja bloqueada por limite/parede.
    if (entity === player) handleAutoMapExit();
    return;
  }

  entity.targetX = nx * currentMap.tileSize;
  entity.targetY = ny * currentMap.tileSize;
  entity.moving = true;
}

function isMapObjectVisible(object) {
  if (!object) return false;

  // Bosses e marcadores importantes desaparecem definitivamente depois de cumpridos.
  // Isto evita ver Kraidus/Nilzin/Lurei outra vez no mapa depois da cena ou combate terminar.
  const hiddenByFlag = {
    kraidus_final_boss: 'kraidus_defeated',
    kraidus_first_look: 'kraidus_defeated',
    nilzin_boss_d2: 'd2_nilzin_first_defeated',
    lurei_abduction_marker: 'quest_d2_lurei_abducted_done',
    ruined_village_intro: 'quest_d2_ruined_village_done',
    lurei_shadow_first: 'd2_shadow_warrior_defeated',
    lurei_reveal_marker: 'lurei_identity_revealed',
    lurei_shadow_second: 'd2_lurei_weakened',
    purification_marker: 'lurei_purified',
    nilzin_final_boss: 'd2_nilzin_final_defeated',
  };
  if (hiddenByFlag[object.key] && flags[hiddenByFlag[object.key]]) return false;

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

  return getContextualFallbackDialogue(npc);
}

function getContextualFallbackDialogue(npc) {
  const key = npc.characterKey || npc.spriteKey || 'aldeao';
  const questKey = currentQuest?.key || '';
  const mapKey = currentMap?.key || '';
  const finalStage = currentQuest?.key === 'denzel2_final';
  const afterKraidus = (currentQuest?.order || 0) >= (DATA.quests?.denzel1_final?.order || 999);
  const afterLurei = Boolean(flags.lurei_purified || currentQuest?.key === 'denzel2_final');
  const afterAbduction = ['d2_lurei_abducted', 'd2_search_lurei', 'd2_shadow_cave', 'd2_lurei_corruption', 'd2_years_later_return'].includes(questKey);

  if (afterAbduction && key !== 'nilzin') {
    return [
      { text: 'Denzel, ninguém te culpa pelo que aconteceu a Lurei.' },
      { text: 'Mas todos sabemos que tu vais continuar a procurá-lo até a luz o alcançar outra vez.' },
    ];
  }

  if (questKey === 'd2_years_later_return' && key !== 'nilzin') {
    return [
      { text: 'Passaram anos, Denzel, mas tu nunca deixaste o teu irmão para trás.' },
      { text: 'Há feridas que só a fidelidade consegue atravessar.' },
    ];
  }

  if (key === 'lurei' || key === 'lurei_cavaleiro') {
    if (finalStage) {
      return [
        { text: 'Denzel... obrigado por nunca desistires de mim.' },
        { text: 'Mesmo quando eu estava preso à escuridão, tu continuaste a olhar para mim como irmão.' },
        { text: 'Agora caminhamos juntos outra vez. A luz venceu, mas também nos ensinou a guardar o coração.' },
      ];
    }
    if (afterLurei) return [{ text: 'Ainda sinto marcas da sombra, mas a luz voltou a chamar-me pelo nome.' }];
    if (questKey.startsWith('d2_')) return [{ text: 'Fica atento, Denzel. A paz também precisa de vigilância.' }];
    return [{ text: 'Vamos brincar mais um pouco, Denzel? Antes que a mãe nos chame para casa.' }];
  }

  if (key === 'divan') {
    if (finalStage) return [{ text: 'Mestre Denzel, hoje entendi: a luz não abandona os seus, mesmo quando tudo parece perdido.' }];
    return [{ text: 'Estou pronto para aprender, mestre. Mostra-me como a luz permanece firme no meio da sombra.' }];
  }

  if (key === 'cavaleiro_luz') {
    if (finalStage) return [{ text: 'Filho do Dono, os portões estão seguros. Hoje Elranor celebra sem medo.' }];
    return [{ text: 'Mantemos a guarda, Denzel. Enquanto houver luz, esta cidade não estará sozinha.' }];
  }

  if (key === 'velho-sabio') {
    return [
      { text: 'Sê forte e corajoso, Denzel. A luz não te foi dada para fugires da escuridão.' },
      { text: 'Nem sempre vais ver o caminho todo. Às vezes, o Dono mostra apenas o próximo passo.' },
    ];
  }

  if (key === 'maria') {
    if (afterKraidus) return [{ text: 'Meu filho, quando te vejo de pé, lembro-me que a esperança também sobrevive às ruínas.' }];
    return [{ text: 'Denzel, fica perto de casa. Há dias em que o coração de mãe sente coisas que ainda não consegue explicar.' }];
  }

  if (key === 'pai') {
    if (afterKraidus) return [{ text: 'Denzel, tu carregaste um peso que nenhum pai queria ver no filho. Mas não o carregaste sozinho.' }];
    return [{ text: 'Cuida do teu irmão, Denzel. Família é uma luz que não se larga no escuro.' }];
  }

  if (key === 'nilzin') {
    if (questKey.startsWith('d2_')) return [{ text: 'A paz pode ser frágil, Denzel. Às vezes precisa de uma mão firme para não se quebrar.' }];
    return [{ text: 'A tua luz incomoda as sombras, Denzel. Talvez seja por isso que todos olham para ti.' }];
  }

  if (mapKey === 'eldoria_final') {
    return [
      { text: 'Obrigado, Denzel. Hoje a cidade não celebra só uma vitória. Celebra o regresso da esperança.' },
      { text: 'Que Deus continue connosco.' },
    ];
  }

  if (mapKey === 'elranor_peace') {
    return [{ text: 'Cinco anos de paz mudaram esta cidade. Mas todos sabem que a luz precisa de continuar acesa.' }];
  }

  if (mapKey?.includes('ruin') || mapKey?.includes('shadow') || mapKey?.includes('cave')) {
    return [{ text: 'Há sombras por todo o lado. Mesmo assim, quando passas, a esperança parece voltar a respirar.' }];
  }

  if (afterKraidus) {
    return [{ text: 'Denzel, o povo fala do que fizeste. Mas mais do que a tua força, lembram-se da luz que trouxeste.' }];
  }

  return [{ text: 'Força, Denzel. Mesmo quando o caminho parece pequeno, cada passo conta.' }];
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

  if (object.type === 'training_dummy') {
    handleTrainingDummy(object);
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

  if (object.type === 'story_marker' && object.key === 'ruined_village_intro') {
    startShadowEntranceEvent(object);
    return;
  }

  if (object.type === 'story_marker' && object.key === 'lurei_abduction_marker') {
    startNilzinAbductionEvent(object);
    return;
  }

  if (object.type === 'story_marker') {
    let lines = [];
    if (Array.isArray(object.lines) && object.lines.length) {
      lines = object.lines.map((text, index) => ({
        text,
        advancesToNextQuest: !object.noAdvance && index === object.lines.length - 1,
      }));
    } else {
      lines = [{ text: object.text || 'Denzel observa o caminho à sua frente.' }];
      if (object.nextText) {
        lines.push({ text: object.nextText, advancesToNextQuest: !object.noAdvance });
      } else if (!object.noAdvance) {
        lines.push({ text: 'A missão continua.', advancesToNextQuest: true });
      }
    }
    openDialog({ name: object.name || 'Evento', portrait: '' }, lines);
    return;
  }

  if (object.type === 'map_exit') {
    if (object.targetMap && DATA.maps[object.targetMap]) {
      const target = DATA.maps[object.targetMap];
      switchMap(object.targetMap, object.startX ?? target.startX, object.startY ?? target.startY);
      addFloatingMessage(object.name || target.name || 'Nova área', player.x + 18, player.y - 18, '#fde68a');
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

function showBattleActionBanner(text, color = '#fff7c2') {
  // Desativado para não aparecer a caixa visual feia no ataque.
  battleActionBanner = null;
}

function triggerBattleImpact(power = 8, color = '#ffffff') {
  battleShake = Math.max(battleShake, power);
  enemyHitPulse = Math.max(enemyHitPulse, Math.round(power * 1.4));
  enemyHitColor = color;
}

function updateBattleEffects() {
  battleEffects = battleEffects
    .map(effect => ({ ...effect, life: effect.life - 1 }))
    .filter(effect => effect.life > 0);

  if (battleActionBanner) {
    battleActionBanner = { ...battleActionBanner, life: battleActionBanner.life - 1 };
    if (battleActionBanner.life <= 0) battleActionBanner = null;
  }

  if (battleShake > 0) battleShake--;
  if (enemyHitPulse > 0) enemyHitPulse--;
}

function drawBattleEffects() {
  if (!battleEffects.length && !battleActionBanner) return;

  ctx.save();
  for (const effect of battleEffects) {
    const progress = 1 - (effect.life / effect.maxLife);
    const alpha = Math.max(0, Math.min(1, effect.life / effect.maxLife));

    if (effect.type === 'slash') {
      ctx.strokeStyle = `rgba(255, 243, 196, ${alpha})`;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(effect.x + progress * 28, effect.y - 20 + progress * 24);
      ctx.lineTo(effect.x + 40 - progress * 16, effect.y + 24 - progress * 16);
      ctx.stroke();
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.8})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(effect.x + 5 + progress * 26, effect.y - 12 + progress * 20);
      ctx.lineTo(effect.x + 42 - progress * 12, effect.y + 16 - progress * 12);
      ctx.stroke();
    }

    if (effect.type === 'light_beam') {
      ctx.strokeStyle = `rgba(255, 210, 138, ${alpha * 0.30})`;
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.moveTo(effect.fromX, effect.fromY);
      ctx.lineTo(effect.toX, effect.toY);
      ctx.stroke();

      ctx.strokeStyle = `rgba(255, 210, 138, ${alpha * 0.95})`;
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(effect.fromX, effect.fromY);
      ctx.lineTo(effect.toX, effect.toY);
      ctx.stroke();

      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.85})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(effect.fromX, effect.fromY - 4);
      ctx.lineTo(effect.toX, effect.toY - 4);
      ctx.stroke();
    }


    if (effect.type === 'falling_light') {
      const beamX = effect.x + Math.sin(progress * Math.PI) * 3;
      const topY = effect.y - 92 + progress * 28;
      ctx.strokeStyle = `rgba(250, 204, 21, ${alpha * 0.35})`;
      ctx.lineWidth = 18;
      ctx.beginPath();
      ctx.moveTo(beamX, topY);
      ctx.lineTo(effect.x, effect.y + 18);
      ctx.stroke();
      ctx.strokeStyle = `rgba(255,255,255, ${alpha * 0.88})`;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(beamX, topY + 8);
      ctx.lineTo(effect.x, effect.y + 10);
      ctx.stroke();
    }

    if (effect.type === 'light_rain') {
      for (let i = 0; i < 5; i++) {
        const offset = (i - 2) * 16;
        const rx = effect.x + offset;
        const startY = effect.y - 108 + progress * (18 + i * 3);
        ctx.strokeStyle = `rgba(250, 204, 21, ${alpha * 0.28})`;
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.moveTo(rx, startY);
        ctx.lineTo(rx - 8, effect.y + 14);
        ctx.stroke();
        ctx.strokeStyle = `rgba(255,255,255, ${alpha * 0.75})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(rx, startY + 8);
        ctx.lineTo(rx - 8, effect.y + 8);
        ctx.stroke();
      }
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
      ctx.strokeStyle = `rgba(255,255,255, ${alpha * 0.65})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(effect.x + 4, effect.y - progress * 10, 10 + progress * 12, 0, Math.PI * 2);
      ctx.stroke();
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

  if (battleActionBanner) {
    const progress = battleActionBanner.life / battleActionBanner.maxLife;
    const alpha = Math.min(1, Math.max(0, progress));
    ctx.fillStyle = `rgba(15, 23, 42, ${0.70 * alpha})`;
    rect(204, 146, 232, 30, `rgba(15, 23, 42, ${0.70 * alpha})`);
    ctx.strokeStyle = `rgba(255,255,255, ${0.65 * alpha})`;
    ctx.lineWidth = 2;
    ctx.strokeRect(204, 146, 232, 30);
    ctx.fillStyle = battleActionBanner.color || '#fff7c2';
    ctx.font = '900 14px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(battleActionBanner.text, 320, 166);
    ctx.textAlign = 'start';
  }

  ctx.restore();
}

function checkEnemyAggroRange() {
  if (!currentMap || !currentQuest || isDialogOpen() || isCutsceneOpen() || battle?.active || shop?.active || powerEvent?.active || quickEvent?.active || shadowEntranceEvent?.active || nilzinAbductionEvent?.active || player.moving) return;

  const objects = (currentMap.mapData.objects || []).filter(isMapObjectVisible);

  // Boss de Mirlon: basta chegar perto para entrar na luta pública.
  const bossGate = objects.find(object => object.type === 'mirlon_boss_gate' && currentQuest.key === 'mirlon_prepare');
  if (bossGate) {
    const bossDistance = Math.abs(player.gridX - bossGate.x) + Math.abs(player.gridY - bossGate.y);
    if (bossDistance <= 2) {
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
  if (!['forest_hunt', 'prepare_journey', 'enter_shadow_valley', 'physical_training', 'figure_in_black', 'return_to_sage', 'demo_done', 'staff_mastery_intro', 'staff_precision_trial', 'vision_of_ruin', 'staff_mastery_done', 'spiritual_training_intro', 'prayer_trial', 'declared_son_owner', 'return_aldara_trained', 'denzel2_free_roam', 'denzel2_lurei_walk', 'd2_shadow_army'].includes(currentQuest.key)) {
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
    potionPrice: object.potionPrice || 8,
    restPrice: object.restPrice || 6,
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
  const autoScaleOffset = Number.isFinite(object.autoScaleFromPlayer) ? object.autoScaleFromPlayer : null;
  const scaledLevel = autoScaleOffset === null ? null : Math.max(1, (player.stats.level || 1) + autoScaleOffset);
  const level = scaledLevel ?? (stats.level || 1);
  const maxHp = scaledLevel !== null ? Math.max(stats.maxHp || 22, 14 + level * 8) : (stats.maxHp || 24);
  const attack = scaledLevel !== null ? Math.max(stats.attack || 4, 2 + Math.round(level * 1.5)) : (stats.attack || 5);
  const defense = scaledLevel !== null ? Math.max(stats.defense || 1, Math.floor(level / 3)) : (stats.defense || 1);
  const xp = scaledLevel !== null ? Math.max(stats.xp || 18, 10 + level * 7) : (stats.xp || 25);
  return {
    key: object.key,
    objectKey: object.key,
    type: object.enemyType || (object.type === 'light_target' ? 'light_target' : 'wisp'),
    name: object.name || 'Criatura de Treino',
    level,
    maxHp,
    hp: maxHp,
    attack,
    defense,
    accuracy: stats.accuracy || object.accuracy || 88,
    evasion: stats.evasion || object.evasion || 8,
    xp,
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


function handleTrainingDummy(object) {
  const cooldownKey = `dummy_${object.key}_cooldown`;
  const now = Date.now();
  if (flags[cooldownKey] && flags[cooldownKey] > now) {
    const seconds = Math.ceil((flags[cooldownKey] - now) / 1000);
    openDialog({ name: 'Boneco de Treino', portrait: '' }, [
      { text: `O boneco ainda está a balançar. Espera ${seconds}s antes de repetir o treino.` },
    ]);
    return;
  }

  flags[cooldownKey] = now + 9000;
  const result = gainXp(22);
  rechargeStaffEnergy(1);
  addFloatingMessage('+22 XP treino', object.x * 32 + 16, object.y * 32 - 8, '#fde68a');
  refreshStatsPanel();
  saveProgress({ notify: true });

  const lines = [
    { text: 'Denzel pratica um golpe controlado no boneco dos Cavaleiros da Luz.' },
    { text: 'Ganhaste 22 XP e recuperaste 1 energia do cajado.' },
  ];
  if (result.leveledUp) lines.push({ text: `Denzel subiu para o nível ${player.stats.level}!` });
  openDialog({ name: 'Treino rápido', portrait: player.portrait || '' }, lines);
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
  ctx.fillText('Toca no jogo quando o marcador entrar na zona dourada.', x + 24, y + 46);

  rect(x + 28, y + 58, w - 56, 10, '#1e293b');
  rect(zoneX, y + 56, zoneW, 14, '#facc15');
  rect(markerX - 3, y + 51, 6, 24, '#ffffff');
  ctx.restore();
}

function tuneEnemyForMobileBattle(enemy) {
  if (!enemy) return enemy;
  const tuned = { ...enemy };

  if (tuned.type === 'brute') {
    tuned.attack = Math.max(1, (tuned.attack || 0) - 3);
    tuned.accuracy = Math.min(tuned.accuracy || 88, 80);
  }

  if (tuned.questKey === 'elranor_rescue') {
    tuned.level = Math.max(1, (tuned.level || 1) - 1);
    tuned.maxHp = Math.max(28, Math.round((tuned.maxHp || tuned.hp || 40) * 0.72));
    tuned.hp = Math.min(tuned.hp ?? tuned.maxHp, tuned.maxHp);
    tuned.attack = Math.max(1, (tuned.attack || 0) - 3);
    tuned.defense = Math.max(0, (tuned.defense || 0) - 1);
    tuned.accuracy = Math.min(tuned.accuracy || 88, 78);
    tuned.evasion = Math.max(0, (tuned.evasion || 8) - 3);
    tuned.xp = Math.max(tuned.xp || 20, 30);
    tuned.drop = {
      ...(tuned.drop || {}),
      potionChance: Math.max(tuned.drop?.potionChance || 0, 45),
      goldMin: Math.max(tuned.drop?.goldMin || 0, 10),
      goldMax: Math.max(tuned.drop?.goldMax || 0, 22),
    };
  }

  if (tuned.questKey === 'hordes_to_zaridon') {
    tuned.level = Math.max(1, (tuned.level || 1) - 1);
    tuned.maxHp = Math.max(24, Math.round((tuned.maxHp || tuned.hp || 38) * 0.68));
    tuned.hp = Math.min(tuned.hp ?? tuned.maxHp, tuned.maxHp);
    tuned.attack = Math.max(1, (tuned.attack || 0) - 4);
    tuned.defense = Math.max(0, (tuned.defense || 0) - 2);
    tuned.accuracy = Math.min(tuned.accuracy || 88, 76);
    tuned.evasion = Math.max(0, (tuned.evasion || 8) - 4);
    tuned.xp = Math.max(tuned.xp || 25, 36);
    tuned.drop = {
      ...(tuned.drop || {}),
      potionChance: Math.max(tuned.drop?.potionChance || 0, 35),
      goldMin: Math.max(tuned.drop?.goldMin || 0, 12),
      goldMax: Math.max(tuned.drop?.goldMax || 0, 25),
    };
  }

  if (tuned.questKey === 'kraidus_battle' && !flags.kraidus_transformed) {
    tuned.accuracy = Math.min(tuned.accuracy || 88, 80);
    tuned.attack = Math.max(1, (tuned.attack || 0) - 3);
  }

  if (tuned.questKey === 'liberate_zaridon') {
    tuned.maxHp = Math.max(32, Math.round((tuned.maxHp || tuned.hp || 45) * 0.82));
    tuned.hp = Math.min(tuned.hp ?? tuned.maxHp, tuned.maxHp);
    tuned.attack = Math.max(1, (tuned.attack || 0) - 2);
    tuned.accuracy = Math.min(tuned.accuracy || 88, 80);
  }

  if (tuned.questKey === 'liberate_zaridon') {
    tuned.level = Math.max(1, (tuned.level || 1) - 2);
    tuned.maxHp = Math.max(26, Math.round((tuned.maxHp || tuned.hp || 45) * 0.64));
    tuned.hp = Math.min(tuned.hp ?? tuned.maxHp, tuned.maxHp);
    tuned.attack = Math.max(1, (tuned.attack || 0) - 4);
    tuned.defense = Math.max(0, (tuned.defense || 0) - 2);
    tuned.accuracy = Math.min(tuned.accuracy || 88, 76);
    tuned.evasion = Math.max(0, (tuned.evasion || 8) - 4);
    tuned.xp = Math.max(tuned.xp || 25, 36);
    tuned.drop = {
      ...(tuned.drop || {}),
      potionChance: Math.max(tuned.drop?.potionChance || 0, 55),
      goldMin: Math.max(tuned.drop?.goldMin || 0, 12),
      goldMax: Math.max(tuned.drop?.goldMax || 0, 26),
    };
  }

  return tuned;
}

function syncMobileControlMode() {
  const controls = document.getElementById('mobileControls');
  if (!controls) return;
  const isBattle = Boolean(battle?.active);
  controls.classList.toggle('battle-mode', isBattle);
  controls.style.display = isBattle ? 'none' : '';
}


function battleOpeningMessage(enemy) {
  if (enemy?.type === 'kraidus') {
    return flags.kraidus_transformed
      ? 'Kraidus ruge, mas agora Denzel permanece de pé com as Asas de Luz abertas.'
      : 'Kraidus domina o salão. A escuridão aperta, mas Denzel recusa recuar.';
  }
  if (enemy?.questKey === 'd2_nilzin_battle') {
    return 'Nilzin ergue a aura negra. Denzel mantém as Asas de Luz abertas e prepara o Cajado Sagrado.';
  }
  if (enemy?.questKey === 'd2_nilzin_final') {
    return 'Nilzin tenta recuperar o controlo, mas a luz de Denzel protege Lurei.';
  }
  if (enemy?.questKey === 'd2_first_lurei_battle') {
    return 'O Guerreiro Sombrio avança. Denzel ainda não sabe que está diante do próprio irmão.';
  }
  if (enemy?.questKey === 'd2_lurei_phase_two') {
    return 'Lurei ataca preso à sombra. Denzel não luta para o destruir, luta para o salvar.';
  }
  return `${enemyDisplayName(enemy)} surgiu diante de Denzel.`;
}

function battleVictoryTitle(enemy) {
  if (enemy?.questKey === 'kraidus_battle') return 'Kraidus destruído';
  if (enemy?.questKey === 'd2_nilzin_battle') return 'Nilzin recua';
  if (enemy?.questKey === 'd2_first_lurei_battle') return 'A sombra recua';
  if (enemy?.questKey === 'd2_lurei_phase_two') return 'Lurei enfraquecido';
  if (enemy?.questKey === 'd2_nilzin_final') return 'Rainha das Sombras vencida';
  return 'Vitória';
}

function startBattle(enemy) {
  if (battleTimeout) {
    clearTimeout(battleTimeout);
    battleTimeout = null;
  }
  const tunedEnemy = tuneEnemyForMobileBattle(enemy);

  if (tunedEnemy.type === 'kraidus' && !flags.kraidus_transformed && !flags.kraidus_defeated) {
    saveKraidusCheckpoint();
  }

  if (tunedEnemy.questKey === 'liberate_zaridon' && (flags.zaridonDemonsDefeated || 0) >= 3) {
    tunedEnemy.name = `${tunedEnemy.name} Enfraquecido`;
    tunedEnemy.maxHp = Math.max(20, Math.round(tunedEnemy.maxHp * 0.72));
    tunedEnemy.hp = Math.min(tunedEnemy.hp, tunedEnemy.maxHp);
    tunedEnemy.attack = Math.max(1, tunedEnemy.attack - 3);
    tunedEnemy.defense = Math.max(0, tunedEnemy.defense - 1);
    tunedEnemy.accuracy = Math.min(tunedEnemy.accuracy || 76, 72);
    tunedEnemy.evasion = Math.max(0, (tunedEnemy.evasion || 5) - 2);
  }

  battle = {
    active: true,
    enemy: tunedEnemy,
    charge: false,
    turn: 'player',
    phase: enemy.type === 'kraidus' && flags.denzel_wings_unlocked ? 2 : 1,
    kraidusHalfTriggered: Boolean(flags.denzel_wings_unlocked),
  };
  battleMessage = battleOpeningMessage(tunedEnemy);
  if (tunedEnemy.questKey === 'liberate_zaridon' && (flags.zaridonDemonsDefeated || 0) >= 3) {
    battleMessage = 'O último demónio da praça está enfraquecido. Esta é a abertura de Denzel.';
  }
  battleLog = ['Ataques podem falhar. Crítico depende da diferença de nível e do tipo de golpe.'];
  battleFlash = 0;
  battleEffects = [];
  syncMobileControlMode();
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
  syncMobileControlMode();
}


function startKraidusTransformationEvent() {
  const isKraidus = isKraidusBattle();
  const isNilzin = isNilzinFirstBattle();
  if (!isKraidus && !isNilzin) return;

  pausedKraidusEnemy = {
    ...battle.enemy,
    hp: Math.max(1, battle.enemy.hp),
    maxHp: battle.enemy.maxHp,
  };

  closeBattle();

  const sceneKey = isKraidus ? 'kraidusTransformation' : 'nilzinTransformation';
  const scene = getSceneConfig(sceneKey);
  const fallbackLines = isKraidus
    ? [
      'Kraidus domina o combate. Denzel cai de joelhos, já sem forças para acompanhar o poder do Rei Demoníaco.',
      'Com um golpe brutal, Kraidus separa Denzel do Cajado Sagrado e fere-lhe o braço.',
      'O cajado cai longe. Denzel sente o corpo falhar, como se a luz tivesse sido arrancada dele.',
      'Kraidus avança para esmagar Denzel diante dos demónios que cercam o salão.',
      'Denzel arrasta-se até ao cajado. Uma luz desce sobre ele e começa a regenerar o braço ferido.',
      'Asas de luz pura abrem-se nas suas costas. Denzel desperta no nível 18 e regressa ao combate com vida e energia restauradas.',
    ]
    : [
      'A aura negra de Nilzin fecha-se sobre Denzel, tentando prendê-lo outra vez no medo.',
      'O Cajado Sagrado treme. A mesma luz que um dia venceu Kraidus responde de novo ao chamado de Denzel.',
      'Denzel ergue o olhar, envolve-se em luz dourada e as asas de luz pura voltam a abrir-se nas suas costas.',
      'Com a presença de Deus a fortalecê-lo, Denzel regressa ao combate pronto para terminar a batalha.',
    ];

  kraidusEvent = {
    active: true,
    step: 0,
    startFrame: frame,
    enemy: pausedKraidusEnemy,
    sceneKey,
    lines: scene.lines || fallbackLines,
  };

  addBattleEffect(isNilzin ? 'light_beam' : 'dark_hit', { x: 320, y: 210, life: 60 });
  saveProgress();
}

function handleKraidusEventInput(event) {
  if (!kraidusEvent?.active) return;

  if ([' ', 'e', 'E'].includes(event.key)) {
    event.preventDefault();
    kraidusEvent.step++;

    if (kraidusEvent?.enemy?.type === 'kraidus'
        && kraidusEvent.step >= kraidusEvent.lines.length - 1
        && !kraidusEvent.angelSfxPlayed) {
      kraidusEvent.angelSfxPlayed = true;
      window.OFDD_AUDIO?.playSfx?.('angel');
      addFloatingMessage('AAAAAA!', player.x + 16, player.y - 40, '#fde68a');
    }

    if (kraidusEvent.step >= kraidusEvent.lines.length) {
      finishKraidusTransformationEvent();
    }
  }
}

function finishKraidusTransformationEvent() {
  if (!kraidusEvent?.active) return;

  const enemy = kraidusEvent.enemy || pausedKraidusEnemy;
  const isNilzin = enemy?.type === 'nilzin_shadow';
  flags.denzel_wings_unlocked = true;
  flags.kraidus_phase_two = true;
  if (enemy?.type === 'kraidus') flags.kraidus_transformed = true;
  if (isNilzin) flags.nilzin_transformation_done = true;

  const targetLevel = enemy?.type === 'kraidus' ? 18 : Math.max(player.stats.level || 1, 14);
  if ((player.stats.level || 1) < targetLevel) {
    const diff = targetLevel - (player.stats.level || 1);
    player.stats.level = targetLevel;
    player.stats.maxHp += diff * 8;
    player.stats.attack += diff * 2;
    player.stats.defense += diff;
  }

  player.stats.hp = player.stats.maxHp;
  setStaffEnergy(maxStaffEnergy());
  refreshStatsPanel();

  kraidusEvent.active = false;
  kraidusEvent = null;
  startBattle({
    ...enemy,
    hp: enemy?.hp || Math.max(1, Math.round((enemy?.maxHp || 20) * 0.7)),
    maxHp: enemy?.maxHp || 20,
  });
  if (battle) {
    battle.phase = 2;
    battle.kraidusHalfTriggered = true;
  }
  battleMessage = isNilzin
    ? 'As asas de luz voltam a envolver Denzel. Nilzin recua perante a transformação.'
    : 'As asas de luz pura envolvem Denzel. A fase final contra Kraidus começou.';
  saveProgress();
}

function drawKraidusTransformationOverlay() {
  if (!kraidusEvent?.active) return;

  const step = Math.min(kraidusEvent.step, kraidusEvent.lines.length - 1);
  if (kraidusEvent?.enemy?.type === 'kraidus'
      && step >= kraidusEvent.lines.length - 1
      && !kraidusEvent.angelSfxPlayed) {
    kraidusEvent.angelSfxPlayed = true;
    window.OFDD_AUDIO?.playSfx?.('angel');
  }
  const t = frame - kraidusEvent.startFrame;
  const sceneKey = kraidusEvent.sceneKey || (kraidusEvent?.enemy?.type === 'nilzin_shadow' ? 'nilzinTransformation' : 'kraidusTransformation');
  const scene = getSceneConfig(sceneKey);
  const dpos = scene.denzelPositions || {};
  const spos = scene.staffPositions || {};

  ctx.save();

  // Usa o próprio mapa como cenário da cutscene para ficar mais natural no mundo.
  drawMap();
  drawPeaceCityAura();
  drawDarkMapAtmosphere();
  drawAttackSceneDecorations();

  const entities = [
    ...npcs.map(n => ({ type: 'npc', entity: n })),
    { type: 'player', entity: player },
  ].sort((a, b) => a.entity.y - b.entity.y);

  for (const item of entities) {
    // Durante esta cutscene, o Denzel é redesenhado de forma cinematográfica.
    if (item.type === 'player') continue;
    drawCharacter(item.entity, false);
  }

  // escurece ligeiramente o mapa para foco visual
  ctx.fillStyle = 'rgba(2, 6, 23, 0.46)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // demónios a assistir à cena
  drawMinorDemon(2.6, 5.1, 0.68, 0);
  drawMinorDemon(16.7, 5.1, 0.68, 1);
  drawMinorDemon(4.4, 11.6, 0.60, 0);
  drawMinorDemon(14.8, 11.6, 0.60, 1);

  // Inimigo principal no topo/centro
  if (kraidusEvent?.enemy?.type === 'nilzin_shadow') {
    drawNilzinBattleSprite(300, 126, 0.72);
    radialGlow(300, 174, 58, 'rgba(124, 58, 237, 0.10)');
  } else {
    drawKraidusMiniAt(250, 108, 1.45);
    radialGlow(301, 174, 58, 'rgba(239, 68, 68, 0.08)');
  }

  // chão/sombra para a área central da cena
  ellipse(300, 284, 118, 26, 'rgba(0,0,0,0.28)');

  if (step <= 1) {
    drawDenzelCinematic(dpos.down?.x ?? 278, dpos.down?.y ?? 236, false, false, t, dpos.down?.scale ?? KRAIDUS_CUTSCENE_DENZEL_SCALE, sceneKey, dpos.down?.direction || 'down');
    drawSeparatedStaff(spos.first?.x ?? 332, spos.first?.y ?? 290, false, t, spos.first?.scale ?? KRAIDUS_CUTSCENE_STAFF_SCALE);
  } else if (step <= 3) {
    drawDenzelCinematic(dpos.crawling?.x ?? 238, dpos.crawling?.y ?? 256, false, false, t, dpos.crawling?.scale ?? KRAIDUS_CUTSCENE_DENZEL_SCALE, sceneKey, dpos.crawling?.direction || 'down');
    drawSeparatedStaff(spos.far?.x ?? 350, spos.far?.y ?? 290, false, t, spos.far?.scale ?? KRAIDUS_CUTSCENE_STAFF_SCALE);
    ctx.strokeStyle = 'rgba(239, 36, 22, 0.82)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(302, 174);
    ctx.lineTo(246, 262);
    ctx.stroke();
  } else if (step === 4) {
    // Cajado separado, Denzel a aproximar-se, luz a começar a descer no próprio mapa.
    drawDenzelCinematic(dpos.reachingStaff?.x ?? 292, dpos.reachingStaff?.y ?? 242, false, false, t, dpos.reachingStaff?.scale ?? KRAIDUS_CUTSCENE_DENZEL_SCALE, sceneKey, dpos.reachingStaff?.direction || 'down');
    drawSeparatedStaff(spos.glowing?.x ?? 350, spos.glowing?.y ?? 288, true, t, spos.glowing?.scale ?? KRAIDUS_CUTSCENE_STAFF_SCALE);
    radialGlow(300, 120, 60, 'rgba(250, 204, 21, 0.32)');
    radialGlow(300, 230, 92, 'rgba(250, 204, 21, 0.12)');
    ctx.fillStyle = 'rgba(250, 204, 21, 0.16)';
    ctx.fillRect(276, 24, 48, 256);
    ctx.strokeStyle = 'rgba(255, 246, 190, 0.72)';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(300, 24);
    ctx.lineTo(300, 282);
    ctx.stroke();
  } else {
    // Transformação no mapa com luz forte a descer sobre Denzel.
    radialGlow(300, 78, 92, 'rgba(250, 204, 21, 0.42)');
    radialGlow(300, 214, 142, 'rgba(250, 204, 21, 0.22)');
    ctx.fillStyle = 'rgba(255, 244, 184, 0.14)';
    ctx.fillRect(254, 8, 92, 292);
    ctx.fillStyle = 'rgba(250, 204, 21, 0.18)';
    ctx.fillRect(268, 14, 64, 280);
    ctx.strokeStyle = 'rgba(255, 251, 219, 0.95)';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(300, 8);
    ctx.lineTo(300, 294);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.82)';
    ctx.lineWidth = 22;
    ctx.beginPath();
    ctx.moveTo(300, 12);
    ctx.lineTo(300, 286);
    ctx.stroke();
    drawDenzelCinematic(dpos.transformed?.x ?? 282, dpos.transformed?.y ?? 224, true, true, t, dpos.transformed?.scale ?? KRAIDUS_CUTSCENE_DENZEL_SCALE, sceneKey, dpos.transformed?.direction || 'down');
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.90)';
    ctx.font = '900 28px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('AAAAAA!', 300, 72 + Math.sin(frame / 6) * 3);
    ctx.restore();
    drawSeparatedStaff(spos.glowing?.x ?? 350, spos.glowing?.y ?? 288, true, t, spos.glowing?.scale ?? KRAIDUS_CUTSCENE_STAFF_SCALE);
  }

  // caixa de texto mais narrativa, sem parecer painel de batalha.
  rect(34, 366, 572, 86, 'rgba(255, 246, 221, 0.96)');
  ctx.strokeStyle = '#172033';
  ctx.lineWidth = 3;
  ctx.strokeRect(34, 366, 572, 86);

  ctx.fillStyle = '#111827';
  ctx.font = '900 15px system-ui';
  ctx.fillText(scene.title || (kraidusEvent?.enemy?.type === 'nilzin_shadow' ? 'Transformação — Asas de Luz contra Nilzin' : 'Transformação — Asas de Luz'), 54, 392);
  ctx.font = 'bold 14px system-ui';
  wrapText(kraidusEvent.lines[step], 54, 416, 530, 18);

  ctx.fillStyle = '#64748b';
  ctx.font = '900 11px system-ui';
  ctx.fillText('ESPAÇO para continuar', 448, 438);

  ctx.restore();
}

function wrapText(text, x, y, maxWidth, lineHeight) {
  const words = String(text).split(' ');
  let line = '';
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line, x, y);
      line = words[n] + ' ';
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, y);
}




function getObjectByKey(key) {
  return (currentMap?.mapData?.objects || []).find(obj => obj.key === key);
}

function startShadowEntranceEvent(object = null) {
  if (shadowEntranceEvent?.active || battle?.active) return;
  const marker = object || getObjectByKey('ruined_village_intro');
  const scene = getSceneConfig('lureiShadowEntrance');
  shadowEntranceEvent = {
    active: true,
    step: 0,
    startFrame: frame,
    marker,
    sceneKey: 'lureiShadowEntrance',
    lines: scene.lines || [
      'Nilzin espera no centro das ruínas. O Guerreiro Sombrio está atrás dela, imóvel, como uma sombra obediente.',
      'Denzel aproxima-se. Antes de chegar a Nilzin, o Guerreiro Sombrio avança e coloca-se à frente dela.',
      'Nilzin sorri: “Se queres chegar até mim, primeiro passa por ele.”',
    ],
  };
  flags.auto_d2_ruined_village_ruined_village_intro = true;
  saveProgress();
}

function handleShadowEntranceEventInput(event) {
  if (!shadowEntranceEvent?.active) return;
  if ([' ', 'e', 'E'].includes(event.key)) {
    event.preventDefault();
    shadowEntranceEvent.step++;
    shadowEntranceEvent.startFrame = frame;
    if (shadowEntranceEvent.step >= shadowEntranceEvent.lines.length) finishShadowEntranceEvent();
  }
}

function finishShadowEntranceEvent() {
  if (!shadowEntranceEvent?.active) return;
  shadowEntranceEvent.active = false;
  shadowEntranceEvent = null;

  flags.quest_d2_ruined_village_done = true;
  flags['cutscene_d2-denzel-vs-lurei'] = true;
  currentQuest = DATA.quests.d2_first_lurei_battle;
  buildNpcs();
  refreshQuestPanel();
  refreshStatsPanel();

  const bossObject = getObjectByKey('lurei_shadow_first');
  if (bossObject) {
    faceObject(bossObject);
    startBattle(buildEnemyFromObject(bossObject));
  }
  saveProgress();
}

function drawShadowEntranceOverlay() {
  if (!shadowEntranceEvent?.active) return;
  const step = Math.min(shadowEntranceEvent.step, shadowEntranceEvent.lines.length - 1);
  const t = Math.min(1, (frame - shadowEntranceEvent.startFrame) / 52);
  const eased = t * t * (3 - 2 * t);

  ctx.save();
  drawMap();
  drawDarkMapAtmosphere();
  ctx.fillStyle = 'rgba(2, 6, 23, 0.40)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const scene = getSceneConfig(shadowEntranceEvent.sceneKey || 'lureiShadowEntrance');
  const nilzin = scene.actors?.nilzin || { x: 320, y: 150, scale: 1.02 };
  const lurei = scene.actors?.lurei || { formBehind: 'guerreiro', formFront: 'guerreiro', x: 320, behindY: 170, frontY: 232, scale: 1.04 };
  const denzel = scene.actors?.denzel || { x: 132, y: 288, runToX: 202, runToY: 280, scale: 0.50 };
  const warriorY = step === 0 ? lurei.behindY : lurei.behindY + ((lurei.frontY ?? lurei.behindY) - lurei.behindY) * eased;
  const lureiForm = step === 0 ? (lurei.formBehind || 'guerreiro') : (lurei.formFront || lurei.formBehind || 'guerreiro');

  drawNilzinShadowAt(nilzin.x - 16, nilzin.y - 16, nilzin.scale ?? 1.02);
  drawLureiFormAt(lureiForm, (lurei.x ?? nilzin.x) - 18, warriorY - 18, lurei.scale ?? 1.04);
  let denzelDrawX = denzel.x;
  let denzelDrawY = denzel.y;
  if (step === 1) {
    denzelDrawX = denzel.x + ((denzel.runToX ?? denzel.x) - denzel.x) * eased;
    denzelDrawY = denzel.y + ((denzel.runToY ?? denzel.y) - denzel.y) * eased;
  } else if (step > 1) {
    denzelDrawX = denzel.runToX ?? denzel.x;
    denzelDrawY = denzel.runToY ?? denzel.y;
  }
  drawDenzelCinematic(denzelDrawX, denzelDrawY, true, false, frame, denzel.scale ?? 0.58, shadowEntranceEvent.sceneKey || 'lureiShadowEntrance', denzel.direction || 'right');

  rect(38, 366, 564, 82, 'rgba(255, 246, 221, 0.97)');
  ctx.strokeStyle = '#172033';
  ctx.lineWidth = 3;
  ctx.strokeRect(38, 366, 564, 82);
  ctx.fillStyle = '#111827';
  ctx.font = '900 15px system-ui';
  ctx.fillText((getSceneConfig(shadowEntranceEvent.sceneKey || 'lureiShadowEntrance').title || 'Ruínas de Elranor — O Guerreiro Sombrio'), 58, 392);
  ctx.font = 'bold 14px system-ui';
  wrapText(shadowEntranceEvent.lines[step], 58, 416, 510, 18);
  ctx.fillStyle = '#64748b';
  ctx.font = '900 11px system-ui';
  ctx.fillText('ESPAÇO para continuar', 432, 438);
  ctx.restore();
}

function startNilzinAbductionEvent(object = null) {
  if (nilzinAbductionEvent?.active) return;
  const scene = getSceneConfig('nilzinAbduction');
  nilzinAbductionEvent = {
    active: true,
    step: 0,
    startFrame: frame,
    object,
    sceneKey: 'nilzinAbduction',
    lines: scene.lines || [
      'Nilzin dissolve-se em sombra e reaparece ao lado de Lurei, que ainda está normal.',
      'Só agora a roda escura se abre atrás deles. O portal começa a puxar a luz à volta.',
      'Denzel corre na direção de Lurei, mas Nilzin agarra-o antes que ele chegue.',
      'A roda fecha-se. Nilzin desaparece com Lurei, e a praça fica em silêncio.',
    ],
  };
  flags.auto_d2_lurei_abducted_lurei_abduction_marker = true;
  saveProgress();
}

function handleNilzinAbductionEventInput(event) {
  if (!nilzinAbductionEvent?.active) return;
  if ([' ', 'e', 'E'].includes(event.key)) {
    event.preventDefault();
    nilzinAbductionEvent.step++;
    nilzinAbductionEvent.startFrame = frame;
    if (nilzinAbductionEvent.step >= nilzinAbductionEvent.lines.length) finishNilzinAbductionEvent();
  }
}

function finishNilzinAbductionEvent() {
  if (!nilzinAbductionEvent?.active) return;
  nilzinAbductionEvent.active = false;
  nilzinAbductionEvent = null;
  advanceQuest();
}

function drawLureiNormalAt(cx, cy, scale = 1) {
  ctx.save();
  ctx.translate(cx - 16 * scale, cy - 30 * scale);
  ctx.scale(scale, scale);
  drawLightKnightCharacter({
    x: 0,
    y: 0,
    moving: false,
    direction: 'down',
    spriteKey: 'lurei_light_knight',
    colors: {
      skin: '#7c4a32',
      hair: '#111827',
    },
  }, false);
  ctx.restore();
}

function drawFallenLureiShadowAt(x, y, scale = 1) {
  const pulse = 0.22 + Math.sin(frame / 18) * 0.06;
  ctx.save();
  radialGlow(x + 16*scale, y + 19*scale, 38*scale, `rgba(88,28,135,${pulse})`);
  ctx.strokeStyle = 'rgba(88,28,135,0.42)';
  ctx.lineWidth = 2*scale;
  ctx.beginPath();
  ctx.ellipse(x + 16*scale, y + 18*scale, 23*scale, 12*scale, 0, 0, Math.PI * 2);
  ctx.stroke();
  ellipse(x + 16*scale, y + 25*scale, 16*scale, 5*scale, 'rgba(0,0,0,0.36)');
  rect(x + 7*scale, y + 17*scale, 23*scale, 8*scale, '#090014');
  rect(x + 10*scale, y + 15*scale, 14*scale, 5*scale, '#2e1065');
  rect(x + 25*scale, y + 13*scale, 7*scale, 8*scale, '#7c4a32');
  rect(x + 25*scale, y + 11*scale, 8*scale, 4*scale, '#111827');
  ctx.strokeStyle = 'rgba(168,85,247,0.70)';
  ctx.lineWidth = 2*scale;
  ctx.beginPath();
  ctx.moveTo(x + 4*scale, y + 12*scale);
  ctx.lineTo(x + 31*scale, y + 27*scale);
  ctx.stroke();
  ctx.restore();
}

function drawHealedLureiObject(object) {
  const x = object.x * 32;
  const y = object.y * 32;
  const scene = getSceneConfig('lureiPurification');
  drawLureiFormAt(scene.forms?.after || 'purificado', x + 16, y + 31, 1.0);
}

function drawLureiFormAt(formKey, x, y, scale = 1, options = {}) {
  const cfg = getLureiFormConfig(formKey);
  const finalScale = scale * (cfg.scale ?? 1);
  const ox = cfg.offsetX ?? 0;
  const oy = cfg.offsetY ?? 0;
  const drawType = cfg.drawType || 'normalKnight';

  if (drawType === 'normalKnight') {
    drawLureiNormalAt(x + ox, y + oy, finalScale);
    return;
  }

  if (drawType === 'hoodedShadow') {
    drawHoodedShadowWarriorAt(x - 23 * finalScale + ox, y - 28 * finalScale + oy, 2.22 * finalScale);
    return;
  }

  if (drawType === 'shadowLurei') {
    drawLureiShadowAt(x - 24 * finalScale + ox, y - 20 * finalScale + oy, 2.15 * finalScale);
    return;
  }

  if (drawType === 'fallenShadow') {
    drawFallenLureiShadowAt(x + ox, y + oy, finalScale);
    return;
  }

  drawLureiNormalAt(x + ox, y + oy, finalScale);
}

function drawShadowPortalRing(cx, cy, scale = 1, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  radialGlow(cx, cy, 42 * scale, 'rgba(76, 5, 25, 0.22)');
  for (let i = 0; i < 3; i++) {
    ctx.strokeStyle = `rgba(88, 28, 135, ${0.38 - i * 0.08})`;
    ctx.lineWidth = (5 - i) * scale;
    ctx.beginPath();
    ctx.ellipse(cx, cy, (20 + i * 8) * scale, (34 + i * 10) * scale, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawNilzinAbductionOverlay() {
  if (!nilzinAbductionEvent?.active) return;
  const step = Math.min(nilzinAbductionEvent.step, nilzinAbductionEvent.lines.length - 1);
  const t = Math.min(1, (frame - nilzinAbductionEvent.startFrame) / 58);
  const eased = t * t * (3 - 2 * t);

  ctx.save();
  drawMap();
  drawAttackSceneDecorations();
  ctx.fillStyle = 'rgba(2, 6, 23, 0.36)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const scene = getSceneConfig(nilzinAbductionEvent.sceneKey || 'nilzinAbduction');
  const portal = scene.portal || { x: 330, y: 210, scale: 1.25, showFromStep: 1, fadeOutOnStep: 3 };
  const lurei = scene.actors?.lurei || { form: 'normal', x: 312, y: 212, scale: 1.05 };
  const nilzin = scene.actors?.nilzin || { x: 348, y: 194, scale: 0.78 };
  const denzel = scene.actors?.denzel || { startX: 108, endX: 278, y: 290, yLift: 10, scale: 0.48 };
  const fadeStep = portal.fadeOutOnStep ?? 3;
  const portalAlpha = step < (portal.showFromStep ?? 1) ? 0 : (step > fadeStep ? 0 : (step === fadeStep ? 1 - eased : 1));
  const charAlpha = step > fadeStep ? 0 : (step === fadeStep ? 1 - eased : 1);
  if (portalAlpha > 0.02) drawShadowPortalRing(portal.x ?? 330, portal.y ?? 210, (portal.scale ?? 1.25) + Math.sin(frame / 12) * 0.04, portalAlpha);

  if (charAlpha > 0.02) {
    ctx.save();
    ctx.globalAlpha = charAlpha;
    drawLureiFormAt(lurei.form || 'normal', lurei.x ?? 312, lurei.y ?? 212, lurei.scale ?? 1.05);
    drawNilzinShadowAt(nilzin.x ?? 348, nilzin.y ?? 194, nilzin.scale ?? 0.78);
    ctx.restore();
  }

  let denzelProgress = 0;
  if (step === 2) denzelProgress = eased;
  else if (step > 2) denzelProgress = 1;
  const denzelX = (denzel.startX ?? 108) + ((denzel.endX ?? 278) - (denzel.startX ?? 108)) * denzelProgress;
  const denzelY = (denzel.y ?? 290) - (denzel.yLift ?? 10) * denzelProgress;
  drawDenzelCinematic(denzelX, denzelY, true, false, frame, denzel.scale ?? 0.58, 'nilzinAbduction', denzel.direction || 'right');

  rect(38, 366, 564, 82, 'rgba(255, 246, 221, 0.97)');
  ctx.strokeStyle = '#172033';
  ctx.lineWidth = 3;
  ctx.strokeRect(38, 366, 564, 82);
  ctx.fillStyle = '#111827';
  ctx.font = '900 15px system-ui';
  ctx.fillText((getSceneConfig(nilzinAbductionEvent.sceneKey || 'nilzinAbduction').title || 'Rapto de Lurei'), 58, 392);
  ctx.font = 'bold 14px system-ui';
  wrapText(nilzinAbductionEvent.lines[step], 58, 416, 510, 18);
  ctx.fillStyle = '#64748b';
  ctx.font = '900 11px system-ui';
  ctx.fillText('ESPAÇO para continuar', 432, 438);
  ctx.restore();
}

function startLureiRevealEvent() {
  if (!battle?.active || !battle.enemy) return;
  pausedLureiEnemy = {
    ...battle.enemy,
    hp: Math.max(1, battle.enemy.hp),
    maxHp: battle.enemy.maxHp,
    name: 'Lurei Corrompido',
  };
  closeBattle();
  const scene = getSceneConfig('lureiReveal');
  lureiEvent = {
    active: true,
    step: 0,
    startFrame: frame,
    enemy: pausedLureiEnemy,
    sceneKey: 'lureiReveal',
    lines: scene.lines || [
      'O Guerreiro Sombrio recua. A energia roxa à volta dele cresce como fogo vivo.',
      'Ele invoca uma lança negra. O golpe rasga o ar e passa a centímetros do rosto de Denzel.',
      'O capuz cai. Denzel vê o rosto do irmão: Lurei está diante dele, preso à escuridão.',
      'Denzel hesita. Lurei aproveita a abertura e acerta-lhe no peito com a lança negra.',
      'Denzel mantém as Asas de Luz abertas. Ele não vai matar o irmão. Vai salvá-lo.',
    ],
  };
  addBattleEffect('dark_hit', { x: 320, y: 230, life: 70 });
  saveProgress();
}

function handleLureiRevealEventInput(event) {
  if (!lureiEvent?.active) return;
  if ([' ', 'e', 'E'].includes(event.key)) {
    event.preventDefault();
    lureiEvent.step++;
    if (lureiEvent.step >= lureiEvent.lines.length) finishLureiRevealEvent();
  }
}

function finishLureiRevealEvent() {
  if (!lureiEvent?.active) return;
  const enemy = lureiEvent.enemy || pausedLureiEnemy;
  flags.lurei_identity_revealed = true;
  flags.lurei_spear_revealed = true;
  player.stats.hp = Math.max(1, Math.ceil(player.stats.hp * 0.72));
  setStaffEnergy(maxStaffEnergy());
  lureiEvent.active = false;
  lureiEvent = null;
  startBattle(enemy);
  battle.lureiRevealTriggered = true;
  battle.phase = 2;
  battleMessage = 'Denzel volta ao combate sabendo a verdade: o inimigo é Lurei.';
  pushBattleLog('Revelação: Lurei Corrompido · Denzel luta para salvar, não para matar.');
  addBattleEffect('power_burst', { x: 150, y: 245, life: 80 });
  refreshStatsPanel();
  saveProgress();
}

function drawLureiRevealOverlay() {
  if (!lureiEvent?.active) return;
  const step = Math.min(lureiEvent.step, lureiEvent.lines.length - 1);
  const t = frame - lureiEvent.startFrame;
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.86)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawShadowBattleBackground('lurei_shadow');

  const scene = getSceneConfig(lureiEvent.sceneKey || 'lureiReveal');
  const before = scene.actors?.beforeReveal || { form: 'guerreiro', x: 398, y: 210, scale: 1.05 };
  const after = scene.actors?.afterReveal || { form: 'dominado', x: 398, y: 210, scale: 1.05 };
  const denzel = scene.actors?.denzel || { x: 118, y: 300, scale: 0.86 };

  if (step <= 1) {
    drawLureiFormAt(before.form || 'guerreiro', before.x ?? 398, before.y ?? 210, before.scale ?? 1.05);
  } else {
    drawLureiFormAt(after.form || 'dominado', after.x ?? 398, after.y ?? 210, after.scale ?? 1.05);
  }

  drawDenzelCinematic(denzel.x ?? 118, denzel.y ?? 300, true, false, t, denzel.scale ?? 0.96, 'lureiReveal', denzel.direction || 'right');
  if (step >= 1) {
    ctx.save();
    ctx.strokeStyle = 'rgba(168,85,247,0.82)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(412, 135);
    ctx.lineTo(step >= 3 ? 160 : 210, step >= 3 ? 288 : 248);
    ctx.stroke();
    ctx.restore();
  }
  if (step >= 3) {
    radialGlow(152, 274, 44, 'rgba(239,68,68,0.24)');
    ctx.fillStyle = '#fecaca';
    ctx.font = '900 16px system-ui';
    ctx.fillText('Golpe no peito', 92, 350);
  }

  rect(54, 372, 532, 80, '#fff6dd');
  ctx.strokeStyle = '#172033';
  ctx.lineWidth = 3;
  ctx.strokeRect(54, 372, 532, 80);
  ctx.fillStyle = '#111827';
  ctx.font = '900 15px system-ui';
  ctx.fillText((getSceneConfig(lureiEvent.sceneKey || 'lureiReveal').title || 'Revelação — O Guerreiro Sombrio é Lurei'), 74, 398);
  ctx.font = 'bold 14px system-ui';
  wrapText(lureiEvent.lines[step], 74, 422, 490, 18);
  ctx.fillStyle = '#64748b';
  ctx.font = '900 11px system-ui';
  ctx.fillText('ESPAÇO para continuar', 428, 443);
  ctx.restore();
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

function isKraidusBattle() {
  return battle?.active && battle.enemy?.type === 'kraidus';
}

function isNilzinFirstBattle() {
  return battle?.active && battle.enemy?.type === 'nilzin_shadow' && battle.enemy?.questKey === 'd2_nilzin_battle';
}

function playerPowerMultiplier() {
  return flags.denzel_wings_unlocked ? 1.35 : 1;
}

function boostedDamage(value) {
  return Math.max(1, Math.round(value * playerPowerMultiplier()));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function isHiddenLureiEnemy(enemy) {
  return enemy?.type === 'lurei_shadow' && enemy?.questKey === 'd2_first_lurei_battle' && !flags.lurei_identity_revealed;
}

function enemyDisplayName(enemy) {
  if (isHiddenLureiEnemy(enemy)) return 'Guerreiro Sombrio';
  return enemy?.name || 'Inimigo';
}

function shouldRevealLureiDuringBattle(enemy) {
  return enemy?.type === 'lurei_shadow'
    && enemy?.questKey === 'd2_first_lurei_battle'
    && !flags.lurei_identity_revealed
    && enemy.hp <= Math.ceil(enemy.maxHp / 2);
}

function revealLureiDuringBattle() {
  startLureiRevealEvent();
}

function enemyBattleTitle(enemy) {
  if (enemy?.type === 'kraidus') return `Castelo de Kraidus · Fase ${battle?.phase || 1}`;
  if (enemy?.type === 'nilzin_shadow') return 'Aura Negra de Nilzin';
  if (isHiddenLureiEnemy(enemy)) return 'Figura Sombria';
  if (enemy?.type === 'lurei_shadow') return flags.lurei_identity_revealed ? 'Lurei · Modo Demónio · Lança Negra' : 'Figura Sombria';
  return 'Combate RPG';
}

function hitChanceFor(attacker, moveType, enemy) {
  const levelDiff = (player.stats.level || 1) - (enemy?.level || 1);

  if (attacker === 'player') {
    let base = moveType === 'staff_light' ? 86 : 92;
    if (moveType === 'shout') base = 82;
    const enemyEvasion = enemy?.evasion ?? 8;
    return clamp(base + levelDiff * 2 - Math.floor(enemyEvasion / 2), 62, 98);
  }

  let base = moveType === 'special' ? 82 : (enemy?.accuracy || 88);
  const playerFocus = flags.denzel_wings_unlocked ? 8 : 3;
  return clamp(base - levelDiff * 2 - playerFocus, 55, 96);
}

function rollHit(attacker, moveType, enemy) {
  const chance = hitChanceFor(attacker, moveType, enemy);
  const roll = randomInt(1, 100);
  return { hit: roll <= chance, chance, roll };
}

function criticalChanceFor(attacker, moveType, enemy) {
  const playerLevel = player.stats.level || 1;
  const enemyLevel = enemy?.level || 1;
  const levelDiff = playerLevel - enemyLevel;

  if (attacker === 'player') {
    let chance = 5 + Math.max(-2, levelDiff) * 2;
    if (moveType === 'staff_light') chance += 3;
    if (flags.denzel_wings_unlocked) chance += 4;
    return clamp(chance, 3, 28);
  }

  let chance = 4 + Math.max(0, enemyLevel - playerLevel) * 2;
  if (moveType === 'special') chance += 3;
  return clamp(chance, 2, 18);
}

function rollCritical(attacker, moveType, enemy) {
  const chance = criticalChanceFor(attacker, moveType, enemy);
  const roll = randomInt(1, 100);
  return { critical: roll <= chance, chance, roll };
}

function applyCriticalDamage(damage, critical, attacker = 'player') {
  if (!critical?.critical) return damage;
  const multiplier = attacker === 'player' ? 1.5 : 1.35;
  return Math.max(1, Math.round(damage * multiplier));
}

function showCriticalAt(x, y) {
  addFloatingMessage('CRÍTICO!', x, y, '#fde68a');
}

function showMissAt(x, y, color = '#e2e8f0') {
  addFloatingMessage('MISS', x, y, color);
}

function playerBasicAttack() {
  const enemy = battle.enemy;
  const recharged = rechargeStaffEnergy(1);
  const accuracy = rollHit('player', 'basic', enemy);

  if (!accuracy.hit) {
    battleMessage = `Denzel tenta golpear ${enemyDisplayName(enemy)}, mas falha.`;
    showBattleActionBanner('Ataque Básico', '#fff7c2');
    pushBattleLog(`Ataque falhou · precisão ${accuracy.chance}%.${recharged ? ` +${recharged} EN` : ''}`);
    showMissAt(enemyScreenX(), enemyScreenY() - 10, '#e2e8f0');
    if (recharged) addFloatingMessage(`+${recharged} EN`, player.x + 16, player.y - 26, '#fde68a');
    addBattleEffect(flags.denzel_wings_unlocked ? 'falling_light' : 'slash', { x: enemyScreenX(), y: enemyScreenY(), life: 32 });
    refreshStatsPanel();
    afterPlayerBattleAction();
    return;
  }

  const critical = rollCritical('player', 'basic', enemy);
  let damage = boostedDamage(Math.max(2, player.stats.attack + randomInt(0, 2) - enemy.defense));
  damage = applyCriticalDamage(damage, critical, 'player');
  enemy.hp = Math.max(0, enemy.hp - damage);
  battleMessage = critical.critical
    ? `CRÍTICO! Denzel golpeia ${enemyDisplayName(enemy)} e causa ${damage} de dano.`
    : `Denzel golpeia ${enemyDisplayName(enemy)} com o cajado. Causou ${damage} de dano.`;
  showBattleActionBanner(critical.critical ? 'Crítico!' : 'Ataque Básico', critical.critical ? '#fde68a' : '#fff7c2');
  pushBattleLog(`Ataque básico: ${damage} dano · precisão ${accuracy.chance}% · crítico ${critical.chance}%${recharged ? ` · +${recharged} EN` : ''}.`);
  addFloatingMessage(`-${damage}`, enemyScreenX(), enemyScreenY() - 10, critical.critical ? '#fde68a' : '#fecaca');
  if (critical.critical) showCriticalAt(enemyScreenX(), enemyScreenY() - 30);
  triggerBattleImpact(critical.critical ? 10 : 6, critical.critical ? '#fde68a' : '#fecaca');
  if (recharged) addFloatingMessage(`+${recharged} EN`, player.x + 16, player.y - 26, '#fde68a');
  battleFlash = 8;
  addBattleEffect(flags.denzel_wings_unlocked ? 'falling_light' : 'slash', { x: enemyScreenX(), y: enemyScreenY(), life: 40 });
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

  // A Luz do Cajado é forte, mas não é garantida: contra alvos rápidos também pode falhar.
  const hpCost = player.stats.hp <= Math.ceil(player.stats.maxHp * 0.28) ? 2 : 0;
  if (hpCost) player.stats.hp = Math.max(1, player.stats.hp - hpCost);

  const accuracy = rollHit('player', 'staff_light', enemy);
  if (!accuracy.hit) {
    battleMessage = `A Luz do Cajado rasga o ar, mas ${enemyDisplayName(enemy)} desvia-se.`;
    showBattleActionBanner('Luz do Cajado', '#fde68a');
    pushBattleLog(`Luz do Cajado falhou · precisão ${accuracy.chance}% · -${costEnergy} EN${hpCost ? ` · -${hpCost} HP` : ''}.`);
    showMissAt(enemyScreenX(), enemyScreenY() - 10, '#fde68a');
    addBattleEffect(flags.denzel_wings_unlocked ? 'light_rain' : 'light_beam', { x: enemyScreenX(), y: enemyScreenY(), fromX: 166, fromY: 248, toX: 474, toY: 205, life: 38 });
    refreshStatsPanel();
    afterPlayerBattleAction();
    return;
  }

  const critical = rollCritical('player', 'staff_light', enemy);
  let damage = boostedDamage(Math.max(6, player.stats.attack + 9 + randomInt(2, 6) - enemy.defense));
  damage = applyCriticalDamage(damage, critical, 'player');
  enemy.hp = Math.max(0, enemy.hp - damage);
  battleMessage = critical.critical
    ? `CRÍTICO! A Luz do Cajado explode contra ${enemyDisplayName(enemy)}. ${damage} de dano.`
    : `Denzel liberta a Luz do Cajado. ${damage} de dano.`;
  showBattleActionBanner(critical.critical ? 'Luz Crítica!' : 'Luz do Cajado', '#fde68a');
  pushBattleLog(`Luz do Cajado: ${damage} dano · precisão ${accuracy.chance}% · crítico ${critical.chance}% · -${costEnergy} EN${hpCost ? ` · -${hpCost} HP` : ''}.`);
  addFloatingMessage(`-${damage}`, enemyScreenX(), enemyScreenY() - 10, '#fde68a');
  if (critical.critical) showCriticalAt(enemyScreenX(), enemyScreenY() - 30);
  triggerBattleImpact(critical.critical ? 14 : 10, '#fde68a');
  battleFlash = 12;
  addBattleEffect(flags.denzel_wings_unlocked ? 'light_rain' : 'light_beam', { x: enemyScreenX(), y: enemyScreenY(), fromX: 166, fromY: 248, toX: 474, toY: 228, life: 46 });
  refreshStatsPanel();
  afterPlayerBattleAction();
}

function playerRecover() {
  const costEnergy = 1;
  if (!consumeStaffEnergy(costEnergy)) {
    battleMessage = 'Energia insuficiente para recuperar. Usa 1 Atacar para recuperar EN.';
    pushBattleLog(`Recuperar precisa de ${costEnergy} EN.`);
    refreshStatsPanel();
    return;
  }

  let minHeal = Math.ceil(player.stats.maxHp * 0.15);
  let maxHeal = Math.ceil(player.stats.maxHp * 0.25);
  if (battle?.enemy?.questKey === 'liberate_zaridon') {
    minHeal = Math.ceil(player.stats.maxHp * 0.22);
    maxHeal = Math.ceil(player.stats.maxHp * 0.32);
  }
  const healAmount = randomInt(minHeal, maxHeal);
  const before = player.stats.hp;
  player.stats.hp = Math.min(player.stats.maxHp, player.stats.hp + healAmount);
  const healed = player.stats.hp - before;

  const reduction = randomInt(10, 15);
  battle.nextDamageReduction = Math.max(battle.nextDamageReduction || 0, reduction);

  battleMessage = `Denzel gasta 1 EN, recupera ${healed} HP e prepara a defesa.`;
  showBattleActionBanner('Recuperar', '#bbf7d0');
  pushBattleLog(`Recuperaste ${healed} HP · -1 EN · próximo dano -${reduction}%.`);
  addFloatingMessage(`+${healed}`, player.x + 16, player.y - 5, '#bbf7d0');
  addFloatingMessage('-1 EN', player.x + 16, player.y - 22, '#fde68a');
  addFloatingMessage(`-${reduction}% dano`, player.x + 16, player.y - 38, '#bfdbfe');
  addBattleEffect('heal', { x: 149, y: 235, life: 60 });
  battleShake = Math.max(battleShake, 2);
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
  showBattleActionBanner('Poção', '#c4b5fd');
  pushBattleLog(`Poção usada: +${healed} HP.`);
  addFloatingMessage(`+${healed}`, player.x + 16, player.y - 5, '#bbf7d0');
  addBattleEffect('heal', { x: 149, y: 235, life: 60 });
  battleShake = Math.max(battleShake, 2);
  refreshStatsPanel();
  afterPlayerBattleAction();
}


function canUseFieldActions() {
  return !battle?.active && !isDialogOpen() && !isCutsceneOpen() && !shop?.active && !quickEvent?.active && !shadowEntranceEvent?.active && !nilzinAbductionEvent?.active && !kraidusEvent?.active && !lureiEvent?.active && !powerEvent?.active;
}

function useFieldRecover() {
  if (!canUseFieldActions()) return false;
  if (player.stats.hp >= player.stats.maxHp) {
    addFloatingMessage('HP cheio', player.x + 16, player.y - 8, '#e2e8f0');
    return true;
  }
  if (!consumeStaffEnergy(1)) {
    addFloatingMessage('Sem EN', player.x + 16, player.y - 8, '#fecaca');
    return true;
  }
  const heal = Math.max(10, 7 + Math.floor(player.stats.level * 1.5));
  const before = player.stats.hp;
  player.stats.hp = Math.min(player.stats.maxHp, player.stats.hp + heal);
  const restored = player.stats.hp - before;
  addFloatingMessage(`+${restored} HP`, player.x + 16, player.y - 14, '#bbf7d0');
  addFloatingMessage('-1 EN', player.x + 16, player.y - 28, '#fde68a');
  refreshStatsPanel();
  saveProgress();
  return true;
}

function useFieldPotion() {
  if (!canUseFieldActions()) return false;
  const amount = player.inventory.potion || 0;
  if (amount <= 0) {
    addFloatingMessage('Sem poções', player.x + 16, player.y - 8, '#fecaca');
    return true;
  }
  if (player.stats.hp >= player.stats.maxHp) {
    addFloatingMessage('HP cheio', player.x + 16, player.y - 8, '#e2e8f0');
    return true;
  }
  player.inventory.potion = amount - 1;
  const before = player.stats.hp;
  player.stats.hp = Math.min(player.stats.maxHp, player.stats.hp + 18);
  const restored = player.stats.hp - before;
  addFloatingMessage(`+${restored} HP`, player.x + 16, player.y - 14, '#bbf7d0');
  addFloatingMessage('-1 poção', player.x + 16, player.y - 28, '#c4b5fd');
  refreshStatsPanel();
  saveProgress();
  return true;
}

function applyFieldVictoryRecovery(enemy) {
  let hpRate = 0.30;
  let energyRate = 0.50;

  if (enemy?.questKey === 'liberate_zaridon') {
    hpRate = 0.45;
    energyRate = 0.75;
  }

  if (enemy?.questKey === 'hordes_to_zaridon') {
    hpRate = 0.38;
    energyRate = 0.65;
  }

  const hpGain = Math.max(4, Math.round(player.stats.maxHp * hpRate));
  const beforeHp = player.stats.hp;
  player.stats.hp = Math.min(player.stats.maxHp, player.stats.hp + hpGain);
  const healed = player.stats.hp - beforeHp;
  const energyRecovered = rechargeStaffEnergy(Math.ceil(maxStaffEnergy() * energyRate));
  return { healed, energyRecovered };
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

  if (shouldRevealLureiDuringBattle(battle.enemy) && !battle.lureiRevealTriggered) {
    battle.lureiRevealTriggered = true;
    battleTimeout = setTimeout(() => {
      if (battle?.active) startLureiRevealEvent();
    }, BATTLE_ACTION_DELAY);
    return;
  }

  battleTimeout = setTimeout(() => {
    if (battle?.active) enemyBattleTurn();
  }, BATTLE_ACTION_DELAY);
}

function enemySpecialMove(enemy) {
  let chance = ['kraidus', 'nilzin_shadow', 'lurei_shadow'].includes(enemy.type) ? 42 : (enemy.type === 'brute' ? 12 : 22);
  if (enemy.questKey === 'hordes_to_zaridon') chance = Math.min(chance, 10);
  if (randomInt(1, 100) > chance) return null;

  if (enemy.type === 'nilzin_shadow') {
    return { name: 'Aura Negra', damageBonus: 2, effect: 'dark_hit', log: 'Nilzin envolve Denzel numa aura negra.' };
  }
  if (enemy.type === 'lurei_shadow') {
    if (flags.lurei_identity_revealed) return { name: 'Lança Negra', damageBonus: 12, effect: 'dark_hit', log: 'Lurei invoca a lança negra contra Denzel.' };
    return { name: 'Golpe Corrompido', damageBonus: 9, effect: 'dark_hit', log: `${enemyDisplayName(enemy)} ataca com uma lâmina envolta em sombra.` };
  }
  if (enemy.type === 'kraidus') {
    return { name: 'Rugido do Castelo', damageBonus: flags.kraidus_transformed ? 11 : 6, effect: 'dark_hit', log: 'Kraidus faz o castelo tremer com um rugido.' };
  }
  if (enemy.type === 'brute') {
    return { name: 'Investida Pesada', damageBonus: 2, effect: 'dark_hit', log: `${enemy.name} usa uma investida pesada.` };
  }
  if (enemy.type === 'imp') {
    return { name: 'Garra Sombria', damageBonus: 4, effect: 'dark_hit', log: `${enemy.name} arranha com energia sombria.` };
  }
  if (enemy.type === 'wisp') {
    return { name: 'Rajada Etérea', damageBonus: 3, effect: 'light_beam', log: `${enemy.name} dispara uma rajada de energia.` };
  }
  return null;
}

function enemyBattleTurn() {
  if (!battle?.active) return;
  battle.turn = 'enemy';
  const enemy = battle.enemy;
  const special = enemySpecialMove(enemy);
  const moveType = special ? 'special' : 'basic';
  const accuracy = rollHit('enemy', moveType, enemy);
  const displayName = enemyDisplayName(enemy);

  if (!accuracy.hit) {
    if (special) {
      battleMessage += ` ${displayName} tenta ${special.name}, mas falha.`;
      pushBattleLog(`${displayName} falhou ${special.name} · precisão ${accuracy.chance}%.`);
    } else {
      battleMessage += ` ${displayName} tenta atacar, mas falha.`;
      pushBattleLog(`${displayName} falhou o ataque · precisão ${accuracy.chance}%.`);
    }
    showMissAt(player.x + 16, player.y - 8, '#e2e8f0');
    refreshStatsPanel();
    saveProgress();
    battleTimeout = setTimeout(() => {
      if (battle?.active) {
        battle.turn = 'player';
        battleMessage = 'Escolhe a próxima ação.';
      }
    }, BATTLE_ACTION_DELAY);
    return;
  }

  const critical = rollCritical('enemy', moveType, enemy);
  let damage = Math.max(1, enemy.attack + randomInt(0, 2) + (special?.damageBonus || 0) - player.stats.defense);
  damage = applyCriticalDamage(damage, critical, 'enemy');
  if (battle.nextDamageReduction) {
    const reduction = battle.nextDamageReduction;
    damage = Math.max(1, Math.round(damage * (1 - reduction / 100)));
    pushBattleLog(`Defesa preparada reduziu o dano em ${reduction}%.`);
    battle.nextDamageReduction = 0;
  }
  player.stats.hp = Math.max(0, player.stats.hp - damage);

  if (special) {
    battleMessage += critical.critical
      ? ` CRÍTICO! ${special.name}: ${damage} de dano.`
      : ` ${special.name}: ${damage} de dano.`;
    pushBattleLog(`${special.log} ${damage} dano · precisão ${accuracy.chance}% · crítico ${critical.chance}%.`);
  } else {
    battleMessage += critical.critical
      ? ` CRÍTICO! ${displayName} causa ${damage} de dano.`
      : ` ${displayName} contra-ataca e causa ${damage} de dano.`;
    pushBattleLog(`${displayName} causou ${damage} dano · precisão ${accuracy.chance}% · crítico ${critical.chance}%.`);
  }

  addFloatingMessage(`-${damage}`, player.x + 16, player.y - 8, critical.critical ? '#fde68a' : '#fecaca');
  if (critical.critical) showCriticalAt(player.x + 16, player.y - 28);
  if (special?.effect === 'light_beam') {
    addBattleEffect('light_beam', { fromX: 455, fromY: 220, toX: 150, toY: 248, life: 42 });
  } else {
    addBattleEffect('dark_hit', { x: 148, y: 248, life: special ? 58 : 42 });
  }
  refreshStatsPanel();
  saveProgress();

  if (isKraidusBattle() && !battle.kraidusHalfTriggered && !flags.kraidus_transformed && player.stats.hp <= 0) {
    battle.kraidusHalfTriggered = true;
    player.stats.hp = 1;
    battleTimeout = setTimeout(() => {
      if (battle?.active) startKraidusTransformationEvent();
    }, BATTLE_ACTION_DELAY);
    return;
  }

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

  if (enemy.objectKey || enemy.questKey || enemy.key) {
    const key = enemy.objectKey || enemy.key;
    if (key) flags[`enemy_${key}_defeated`] = true;
    if (key && enemy.respawnSeconds) {
      getRespawnFlags()[key] = Date.now() + enemy.respawnSeconds * 1000;
    }
  }

  if (enemy.questKey === 'denzel2_free_roam') {
    flags.denzel2FreeRoamDefeated = Math.min(DENZEL2_FREE_ROAM_REQUIRED_SHADOWS, (flags.denzel2FreeRoamDefeated || 0) + 1);
  }

  if (enemy.noQuestProgress && enemy.questKey !== 'denzel2_free_roam') return;

  if (enemy.questKey === 'forest_hunt') flags.forestEnemiesDefeated = Math.min(3, (flags.forestEnemiesDefeated || 0) + 1);
  if (enemy.questKey === 'physical_training') flags.darkDemonsDefeated = Math.min(3, (flags.darkDemonsDefeated || 0) + 1);
  if (enemy.questKey === 'outer_elranor_watch') flags.elranorSentinelsDefeated = Math.min(2, (flags.elranorSentinelsDefeated || 0) + 1);
  if (enemy.questKey === 'elranor_rescue') flags.elranorJailersDefeated = Math.min(2, (flags.elranorJailersDefeated || 0) + 1);
  if (enemy.questKey === 'hordes_to_zaridon') flags.zaridonRoadDemonsDefeated = Math.min(4, (flags.zaridonRoadDemonsDefeated || 0) + 1);
  if (enemy.questKey === 'liberate_zaridon') flags.zaridonDemonsDefeated = Math.min(4, (flags.zaridonDemonsDefeated || 0) + 1);
  if (enemy.questKey === 'staff_precision_trial') flags.staffTargetsDefeated = Math.min(3, (flags.staffTargetsDefeated || 0) + 1);
  if (enemy.questKey === 'd2_shadow_attack') flags.d2CeremonyDemonsDefeated = Math.min(3, (flags.d2CeremonyDemonsDefeated || 0) + 1);
  if (enemy.questKey === 'd2_shadow_army') flags.d2ShadowArmyDefeated = Math.min(4, (flags.d2ShadowArmyDefeated || 0) + 1);

  if (enemy.questKey === 'public_battle_mirlon') {
    flags.mirlon_boss_defeated = true;
    flags.mirlon_minor_demons_dispelled = true;
  }
  if (enemy.questKey === 'kraidus_battle') {
    flags.kraidus_defeated = true;
    flags.denzel_wings_unlocked = true;
    flags.kraidus_phase_two = true;
  }
  if (enemy.questKey === 'd2_nilzin_battle') {
    flags.d2_nilzin_first_defeated = true;
    flags.auto_d2_lurei_abducted_lurei_abduction_marker = false;
  }
  if (enemy.questKey === 'd2_first_lurei_battle') {
    flags.d2_shadow_warrior_defeated = true;
    flags.auto_d2_lurei_reveal_lurei_reveal_marker = false;
  }
  if (enemy.questKey === 'd2_lurei_phase_two') {
    flags.d2_lurei_weakened = true;
    flags.auto_d2_purification_purification_marker = false;
  }
  if (enemy.questKey === 'd2_nilzin_final') flags.d2_nilzin_final_defeated = true;
}

function addQuestProgressLines(enemy, lines) {
  if (enemy.noQuestProgress) {
    lines.push({ text: 'Treino concluído. Ganhaste XP, mas a história principal não avançou.' });
    lines.push({ text: 'Continua a farmar ou volta pela saída BOSS quando estiveres preparado.' });
    return;
  }

  if (enemy.key === 'training_shadow') {
    lines.push({ text: 'O Velho Sábio acena em silêncio. Denzel está pronto para continuar o treino.', advancesToNextQuest: true });
    return;
  }

  if (enemy.questKey === 'forest_hunt') {
    const defeated = flags.forestEnemiesDefeated || 0;
    if (defeated >= 3) lines.push({ text: 'Três criaturas foram derrotadas. Denzel sente a luz mais firme dentro de si.', advancesToNextQuest: true });
    else lines.push({ text: `Treino livre: ${defeated}/3 criaturas derrotadas. Continua a explorar a clareira.` });
    return;
  }

  if (enemy.questKey === 'physical_training') {
    const defeated = flags.darkDemonsDefeated || 0;
    if (defeated >= 3) lines.push({ text: 'A última criatura cai. A floresta fica estranhamente silenciosa.', advancesToNextQuest: true });
    else lines.push({ text: `Treino físico e mental: ${defeated}/3 criaturas derrotadas. Continua, mas gere bem o HP.` });
    return;
  }

  if (enemy.questKey === 'outer_elranor_watch') {
    const defeated = flags.elranorSentinelsDefeated || 0;
    if (defeated >= 2) lines.push({ text: 'As sentinelas caem. O caminho até ao selo negro fica aberto, mas a entrada de Elranor ainda resiste.', advancesToNextQuest: true });
    else lines.push({ text: `Sentinelas de Elranor: ${defeated}/2 derrotadas. A outra ainda guarda a estrada.` });
    return;
  }

  if (enemy.questKey === 'elranor_rescue') {
    const defeated = flags.elranorJailersDefeated || 0;
    if (defeated >= 2) {
      lines.push({ text: 'O segundo carcereiro cai. Os sobreviventes de Elranor já conseguem sair das celas.', advancesToNextQuest: true });
    } else {
      lines.push({ text: `Carcereiros de Elranor: ${defeated}/2 derrotados. Falta derrotar mais um para libertar os sobreviventes.` });
    }
    return;
  }

  if (enemy.questKey === 'hordes_to_zaridon') {
    const defeated = flags.zaridonRoadDemonsDefeated || 0;
    if (defeated >= 4) lines.push({ text: 'A última criatura da estrada cai. Denzel avança depois de dias de combate, ferido, mas firme.', advancesToNextQuest: true });
    else lines.push({ text: `Estrada para Zaridon: ${defeated}/4 demónios derrotados. Continua a lutar e a upar antes da capital.` });
    return;
  }

  if (enemy.questKey === 'liberate_zaridon') {
    const defeated = flags.zaridonDemonsDefeated || 0;
    if (defeated >= 4) lines.push({ text: 'Os demónios da praça caem. As correntes deixam de arrastar o povo por instantes.', advancesToNextQuest: true });
    else lines.push({ text: `Praça de Zaridon: ${defeated}/4 demónios derrotados. Ainda há opressores entre as ruínas.` });
    return;
  }

  if (enemy.questKey === 'staff_precision_trial') {
    const defeated = flags.staffTargetsDefeated || 0;
    if (defeated >= 3) lines.push({ text: 'Os três alvos de luz foram destruídos com precisão. O cajado já não responde apenas à força, mas também ao controlo.', advancesToNextQuest: true });
    else lines.push({ text: `Domínio do Cajado: ${defeated}/3 alvos destruídos. Procura os restantes alvos da clareira.` });
    return;
  }

  if (enemy.questKey === 'denzel2_free_roam') {
    const defeated = flags.denzel2FreeRoamDefeated || 0;
    if (defeated >= DENZEL2_FREE_ROAM_REQUIRED_SHADOWS) {
      lines.push({ text: 'As últimas sombras remanescentes dissipam-se. Denzel percebe que a paz de Elranor está segura por agora.', advancesToNextQuest: true });
    } else {
      lines.push({ text: `Exploração de Elranor: ${defeated}/${DENZEL2_FREE_ROAM_REQUIRED_SHADOWS} sombras derrotadas. Podes continuar a treinar ou voltar à cidade e falar com Lurei.` });
    }
    return;
  }

  if (enemy.questKey === 'public_battle_mirlon') {
    lines.push({ text: 'O demónio principal cai no topo da aldeia.' });
    lines.push({ text: 'Denzel ergue o cajado e liberta um grito de poder. Os demónios menores dissipam-se como cinza no vento.' });
    lines.push({ text: 'A aldeia de Mirlon fica em silêncio. Pela primeira vez, todos viram o Filho do Dono lutar em público.', advancesToNextQuest: true });
    return;
  }

  if (enemy.questKey === 'kraidus_battle') {
    lines.push({ text: 'Kraidus cai de joelhos. As fissuras vermelhas do seu corpo começam a apagar-se.' });
    lines.push({ text: 'Denzel junta a luz das asas ao Cajado Sagrado e desfere o golpe final.' });
    lines.push({ text: 'O castelo inteiro treme. O rei demoníaco é destruído, e as correntes que prendiam Elranor começam a partir.', advancesToNextQuest: true });
    return;
  }

  if (enemy.questKey === 'd2_shadow_attack') {
    const defeated = flags.d2CeremonyDemonsDefeated || 0;
    if (defeated >= 3) lines.push({ text: 'Os demónios recuam entre os gritos da multidão. No meio do caos, uma presença sombria revela-se.', advancesToNextQuest: true });
    else lines.push({ text: `Cerimónia invadida: ${defeated}/3 demónios derrotados.` });
    return;
  }

  if (enemy.questKey === 'd2_nilzin_battle') {
    flags.denzel_wings_unlocked = true;
    lines.push({ text: 'Nilzin cai, ferida, mas os seus olhos continuam frios.' });
    lines.push({ text: 'As Asas de Luz permanecem ativas. O poder despertado em Denzel já não volta a fechar-se.' });
    lines.push({ text: 'Denzel corre para ajudar os feridos da praça, acreditando que a ameaça terminou.' });
    lines.push({ text: 'Mas a sombra de Nilzin ainda tem um último plano.', advancesToNextQuest: true });
    return;
  }

  if (enemy.questKey === 'd2_shadow_army') {
    const defeated = flags.d2ShadowArmyDefeated || 0;
    if (defeated >= 4) lines.push({ text: 'O último demónio da fronteira cai. Ao longe, Denzel sente a presença de Nilzin e de uma figura ainda mais ameaçadora.', advancesToNextQuest: true });
    else lines.push({ text: `Aldeias da fronteira: ${defeated}/4 demónios derrotados.` });
    return;
  }

  if (enemy.questKey === 'd2_first_lurei_battle') {
    lines.push({ text: 'O guerreiro sombrio recua. Agora Denzel sabe a verdade: era Lurei por baixo da escuridão.' });
    lines.push({ text: 'A lança negra deixou uma dor no peito, mas Denzel não pensa em vencer. Pensa em salvar o irmão.', advancesToNextQuest: true });
    return;
  }

  if (enemy.questKey === 'd2_lurei_phase_two') {
    lines.push({ text: 'Lurei cai no chão. A aura negra continua presa ao corpo dele, mas a lança negra começa a desfazer-se.' });
    lines.push({ text: 'Denzel percebe que ainda há luz dentro do irmão. Assim que se aproximar, a purificação começa automaticamente.', advancesToNextQuest: true });
    return;
  }

  if (enemy.questKey === 'd2_nilzin_final') {
    lines.push({ text: 'Nilzin tenta recuperar o controlo sobre Lurei, mas a luz do cajado bloqueia as sombras.' });
    lines.push({ text: 'Denzel ergue o cajado: “Nunca mais atormentarás esta terra.”' });
    lines.push({ text: 'As chamas sagradas consomem Nilzin. A Rainha das Sombras desaparece no silêncio.', advancesToNextQuest: true });
    return;
  }
}

function finishBattleVictory() {
  const enemy = battle.enemy;
  const result = gainXp(enemy.xp);
  const reward = applyBattleRewards(enemy);
  const sustain = applyFieldVictoryRecovery(enemy);
  markEnemyDefeated(enemy);

  addFloatingMessage(`+${enemy.xp} XP`, player.x + 16, player.y - 20, '#fde68a');
  if (reward.gold > 0) addFloatingMessage(`+${reward.gold} ouro`, player.x + 16, player.y - 38, '#facc15');
  if (reward.potion > 0) addFloatingMessage(`+${reward.potion} poção`, player.x + 16, player.y - 56, '#bbf7d0');
  if (sustain.healed > 0) addFloatingMessage(`+${sustain.healed} HP`, player.x + 16, player.y - 74, '#bbf7d0');
  if (sustain.energyRecovered > 0) addFloatingMessage(`+${sustain.energyRecovered} EN`, player.x + 16, player.y - 92, '#fde68a');

  refreshStatsPanel();
  saveProgress({ notify: true });

  const lines = [
    { text: `${enemy.name} desfaz-se em partículas de luz.` },
    { text: `Ganhaste ${enemy.xp} XP${reward.gold ? `, ${reward.gold} ouro` : ''}${reward.potion ? ' e 1 poção' : ''}.` },
    { text: `A vitória restaura 30% HP e 50% EN: +${sustain.healed} HP${sustain.energyRecovered ? ` e +${sustain.energyRecovered} EN` : ''}.` },
  ];

  if (result.leveledUp) {
    lines.push({ text: `Denzel subiu para o nível ${player.stats.level}! HP, Ataque e Defesa aumentaram.` });
  }

  addQuestProgressLines(enemy, lines);
  closeBattle();
  buildNpcs();
  openDialog({ name: battleVictoryTitle(enemy), portrait: '' }, lines);
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
  if (['kraidus', 'nilzin_shadow', 'lurei_shadow'].includes(battle?.enemy?.type)) return 410;
  return 456;
}

function enemyScreenY() {
  if (['kraidus', 'nilzin_shadow', 'lurei_shadow'].includes(battle?.enemy?.type)) return 210;
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
  refreshQuestPanel();
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

  // Qualquer saída do mapa agora é automática: basta pisar na zona marcada.
  // Isto evita o problema de ter de carregar no E para trocar de área.
  if (handleAutoMapExit()) return;

  if (handleAutoStoryMarkers()) return;
}

function handleAutoMapExit() {
  if (!currentMap || !currentQuest || player.moving || battle?.active || shop?.active || quickEvent?.active || shadowEntranceEvent?.active || nilzinAbductionEvent?.active || powerEvent?.active || kraidusEvent?.active || lureiEvent?.active) return false;

  const exits = (currentMap.mapData.objects || [])
    .filter(obj => obj.type === 'map_exit' && isMapObjectVisible(obj) && obj.targetMap && DATA.maps[obj.targetMap]);

  if (!exits.length) return false;

  const exactExit = exits.find(obj => obj.x === player.gridX && obj.y === player.gridY);
  const adjacentExit = exits.find(obj => Math.abs(obj.x - player.gridX) + Math.abs(obj.y - player.gridY) <= 1);

  // Saídas automáticas mais estáveis: só disparam mesmo na borda e na direção correta.
  // Isto evita bugs nas zonas do salto temporal (5 anos depois), onde havia mudanças de mapa confusas.
  const exitCfg = window.WORLD_CONFIG?.autoMapExit || {};
  const edgeExit = exits.find(obj => {
    const nearY = Math.abs((obj.y ?? player.gridY) - player.gridY) <= (exitCfg.nearY ?? 2);
    const nearX = Math.abs((obj.x ?? player.gridX) - player.gridX) <= (exitCfg.nearX ?? 2);
    const requireDirection = exitCfg.requireDirection !== false;
    const rightSide = obj.x >= currentMap.width - 3 && player.gridX >= currentMap.width - (exitCfg.rightEdgeOffset ?? 2) && (!requireDirection || player.direction === 'right');
    const leftSide = obj.x <= 2 && player.gridX <= (exitCfg.leftEdgeMax ?? 1) && (!requireDirection || player.direction === 'left');
    const topSide = obj.y <= 2 && player.gridY <= (exitCfg.topEdgeMax ?? 1) && (!requireDirection || player.direction === 'up');
    const bottomSide = obj.y >= currentMap.height - 3 && player.gridY >= currentMap.height - (exitCfg.bottomEdgeOffset ?? 2) && (!requireDirection || player.direction === 'down');
    return (nearY && (rightSide || leftSide)) || (nearX && (topSide || bottomSide));
  });

  const exit = exactExit || adjacentExit || edgeExit;
  if (!exit) return false;

  const target = DATA.maps[exit.targetMap];
  // Ao voltar de uma zona de treino para o boss, limpa só o estado desse boss.
  // Isto evita saves de teste onde o jogo pensa que o boss já morreu.
  if (['mirlon_training_field','kraidus_training_hall','eldoria_training_outskirts','ruined_village_training'].includes(currentMap.key)) {
    if (currentQuest?.key === 'public_battle_mirlon') resetBossState('mirlon');
    if (currentQuest?.key === 'kraidus_battle') resetBossState('kraidus');
    if (currentQuest?.key === 'd2_nilzin_battle') resetBossState('nilzin');
    if (currentQuest?.key === 'd2_first_lurei_battle') resetBossState('shadow_warrior');
    if (currentQuest?.key === 'd2_lurei_phase_two') resetBossState('lurei');
    if (currentQuest?.key === 'd2_nilzin_final') resetBossState('nilzin_final');
  }
  switchMap(exit.targetMap, exit.startX ?? target.startX, exit.startY ?? target.startY);
  addFloatingMessage(exit.name || target.name || 'Nova área', player.x + 18, player.y - 18, '#fde68a');
  return true;
}

function getAutoNpcForCurrentQuest() {
  if (currentMap?.key !== 'elranor_peace') return null;

  const autoByQuest = {
    denzel2_free_roam: 'lurei_cavaleiro',
    denzel2_lurei_walk: 'lurei_cavaleiro',
    denzel2_nilzin_hint: 'nilzin',
    d2_council_shadow: 'nilzin',
  };

  const targetCharacter = autoByQuest[currentQuest.key];
  if (!targetCharacter) return null;

  const npc = npcs.find(item => item.characterKey === targetCharacter);
  if (!npc) return null;

  const distance = Math.abs(player.gridX - npc.gridX) + Math.abs(player.gridY - npc.gridY);
  return distance <= 1 ? npc : null;
}

function handleAutoStoryMarkers() {
  if (!currentMap || !currentQuest || isDialogOpen() || isCutsceneOpen() || battle?.active || shop?.active || quickEvent?.active || shadowEntranceEvent?.active || nilzinAbductionEvent?.active || powerEvent?.active) return false;

  const autoNpc = getAutoNpcForCurrentQuest();
  if (autoNpc) {
    autoNpc.direction = autoNpc.gridX < player.gridX ? 'right' : autoNpc.gridX > player.gridX ? 'left' : autoNpc.gridY < player.gridY ? 'down' : 'up';
    player.direction = player.gridX < autoNpc.gridX ? 'right' : player.gridX > autoNpc.gridX ? 'left' : player.gridY < autoNpc.gridY ? 'down' : 'up';
    openDialog(autoNpc, getDialogueForNpc(autoNpc));
    return true;
  }

  if (currentQuest.key === 'elranor_rescue' && (flags.elranorJailersDefeated || 0) >= 2) {
    openDialog({ name: 'Sobreviventes', portrait: '' }, [
      { text: 'Os carcereiros foram derrotados. Os sobreviventes de Elranor começam a sair das celas.', advancesToNextQuest: true },
    ]);
    return true;
  }

  if (currentQuest.key === 'liberate_zaridon' && (flags.zaridonDemonsDefeated || 0) >= 4) {
    openDialog({ name: 'Zaridon', portrait: '' }, [
      { text: 'Os demónios da praça foram derrotados. A cidade respira por instantes, e o caminho para o castelo começa a abrir-se.', advancesToNextQuest: true },
    ]);
    return true;
  }

  const object = (currentMap.mapData.objects || [])
    .filter(isMapObjectVisible)
    .filter(obj => obj.autoTrigger && obj.type === 'story_marker')
    .map(obj => ({
      object: obj,
      distance: Math.abs(player.gridX - obj.x) + Math.abs(player.gridY - obj.y),
    }))
    .filter(item => item.distance <= (['d2_lurei_reveal','d2_purification','d2_nilzin_final','d2_lurei_abducted'].includes(currentQuest.key) ? 2 : 1))
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
  drawPeaceCityAura();
  drawDarkMapAtmosphere();
  drawAttackSceneDecorations();

  const entities = [
    ...npcs.map(n => ({ type: 'npc', entity: n })),
    { type: 'player', entity: player },
  ].sort((a, b) => a.entity.y - b.entity.y);

  const sceneOverlayActive = Boolean(shadowEntranceEvent?.active || nilzinAbductionEvent?.active || kraidusEvent?.active || lureiEvent?.active);
  if (!sceneOverlayActive) {
    for (const item of entities) {
      drawCharacter(item.entity, item.type === 'player');
    }
    drawInteractionIndicators();
  }

  drawCeremonyCelebrationEffects();
  drawPowerWaveEvent();
  drawHud();
  drawWorldHint();
  drawUiToasts();
  drawBattleOverlay();
  drawQuickEventOverlay();
  drawShopOverlay();
  drawKraidusTransformationOverlay();
  drawLureiRevealOverlay();
  drawShadowEntranceOverlay();
  drawNilzinAbductionOverlay();
  drawFloatingMessages();
}


function drawInteractionIndicators() {
  if (!currentMap || battle?.active || shop?.active || quickEvent?.active || shadowEntranceEvent?.active || nilzinAbductionEvent?.active || kraidusEvent?.active || lureiEvent?.active) return;

  for (const npc of npcs) {
    const distance = Math.abs(player.gridX - npc.gridX) + Math.abs(player.gridY - npc.gridY);
    const visible = distance <= 4;
    if (visible) drawInteractionBubble(npc.x + 16, npc.y - 8, distance <= 1 ? '!' : '…');
  }

  const objects = (currentMap.mapData.objects || []).filter(isMapObjectVisible);
  for (const object of objects) {
    if (!['story_marker', 'healer_shop', 'map_exit', 'mirlon_boss_gate', 'nilzin_survivor', 'nilzin_heal', 'return_aldara_gate', 'mirlon_gate'].includes(object.type)) continue;
    if (object.autoTrigger && object.type === 'story_marker') continue;
    const distance = Math.abs(player.gridX - object.x) + Math.abs(player.gridY - object.y);
    if (distance <= 4) drawInteractionBubble(object.x * 32 + 16, object.y * 32 - 6, distance <= 1 ? '!' : '…');
  }
}

function drawInteractionBubble(cx, cy, symbol = '!') {
  const y = cy + Math.sin(frame / 10) * 2;
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.94)';
  ctx.strokeStyle = '#111827';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(cx - 9, y - 15, 18, 18, 5);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#facc15';
  ctx.font = '900 14px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText(symbol, cx, y - 1);
  ctx.textAlign = 'start';
  ctx.restore();
}

function drawCeremonyCelebrationEffects() {
  if (currentMap?.key !== 'eldoria_ceremony') return;
  if (!['d2_ceremony_prepare', 'd2_ceremony_started'].includes(currentQuest?.key)) return;

  ctx.save();
  const pulse = 0.70 + Math.sin(frame / 12) * 0.20;
  ctx.globalAlpha = pulse;
  ctx.fillStyle = '#fff7ed';
  ctx.font = '900 16px system-ui';
  ctx.fillText('CLAP! CLAP!', 78, 128 + Math.sin(frame / 9) * 3);
  ctx.fillText('CLAP! CLAP!', 438, 128 + Math.sin(frame / 11) * 3);

  // pequena coroa visual sobre Denzel durante a cerimónia
  if (currentQuest?.key === 'd2_ceremony_prepare') {
    const cx = player.x + 16;
    const cy = player.y - 3;
    ctx.globalAlpha = 1;
    rect(cx - 8, cy - 8, 16, 5, '#facc15');
    polygon([[cx - 8, cy - 8], [cx - 5, cy - 15], [cx - 1, cy - 8]], '#fde68a');
    polygon([[cx - 2, cy - 8], [cx + 1, cy - 17], [cx + 4, cy - 8]], '#fde68a');
    polygon([[cx + 4, cy - 8], [cx + 8, cy - 15], [cx + 8, cy - 8]], '#fde68a');
  }
  ctx.restore();
}

function drawPeaceCityAura() {
  if (!currentMap || currentMap.mapData?.theme !== 'peace_city') return;
  ctx.save();
  const alpha = 0.09 + (Math.sin(frame / 32) * 0.03);
  ctx.strokeStyle = `rgba(250, 204, 21, ${alpha + 0.10})`;
  ctx.lineWidth = 3;
  ctx.strokeRect(26, 26, canvas.width - 52, canvas.height - 52);

  for (let i = 0; i < 7; i++) {
    const x = 70 + i * 82;
    ctx.fillStyle = `rgba(250, 204, 21, ${alpha})`;
    ctx.beginPath();
    ctx.ellipse(x, 38 + Math.sin(frame / 18 + i) * 3, 12, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
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
        if (currentMap?.key !== 'kraidus_castle') {
          drawTree(x, y);
          if (isAldaraFullyDestroyed() && ((x + y) % 5 === 0 || y === 0 || x === 0 || x === currentMap.width - 1)) drawFire(x, y);
        }
      }
      if (tiles[y][x] === 8) drawFire(x, y);
    }
  }

  if (currentMap?.key === 'd2_search_woods') {
    // A busca por Lurei deve parecer mais pesada e escura.
    ctx.fillStyle = 'rgba(2, 6, 23, 0.34)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    radialGlow(canvas.width * 0.55, canvas.height * 0.46, 150, 'rgba(88,28,135,0.10)');
  }
}

function rect(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}

function terrainPalette() {
  const theme = currentMap?.mapData?.theme || '';
  if (theme === 'peace_city') {
    return {
      grass: '#b6d47a', grassDark: '#93b85d', grassLight: '#d9f99d',
      path: '#d8bd72', pathDark: '#b99145', pathLight: '#fef3c7',
      water: '#4fb3d8', wood: '#a16207', stone: '#d6d3d1'
    };
  }
  if (currentMap?.key === 'd2_golden_fields') {
    return {
      grass: '#d9c75d', grassDark: '#b59f34', grassLight: '#fef08a',
      path: '#c9a35d', pathDark: '#9a6d32', pathLight: '#fde68a',
      water: '#38bdf8', wood: '#92400e', stone: '#a8a29e'
    };
  }
  if (currentMap?.key === 'd2_light_training_ground') {
    return {
      grass: '#9fcf76', grassDark: '#75a94f', grassLight: '#ecfccb',
      path: '#c9a35d', pathDark: '#8a5a31', pathLight: '#fde68a',
      water: '#60a5fa', wood: '#854d0e', stone: '#d6d3d1'
    };
  }
  if (currentMap?.key === 'd2_search_woods') {
    return {
      grass: '#263322', grassDark: '#1b2718', grassLight: '#33462b',
      path: '#5f4b3a', pathDark: '#3f3128', pathLight: '#7c6650',
      water: '#1e3a5f', wood: '#3b281d', stone: '#475569'
    };
  }
  if (currentMap?.key === 'kraidus_castle') {
    return {
      grass: '#1a1a1f', grassDark: '#0f0f13', grassLight: '#2a2a31',
      path: '#5b1221', pathDark: '#2f0a13', pathLight: '#991b1b',
      water: '#1f2937', wood: '#3f2a21', stone: '#4b5563'
    };
  }
  return {
    grass: '#77b866', grassDark: '#68a657', grassLight: '#5dd06d',
    path: '#c5ad76', pathDark: '#b89c64', pathLight: '#d2bf8a',
    water: '#337ec5', wood: '#8b5e34', stone: '#64748b'
  };
}

function drawTile(type, col, row) {
  const size = currentMap.tileSize;
  const x = col * size;
  const y = row * size;
  const p = terrainPalette();
  const isKraidusCastle = currentMap?.key === 'kraidus_castle';

  if (isKraidusCastle) {
    if ([0, 5, 8].includes(type)) {
      rect(x, y, size, size, '#17171d');
      rect(x + 2, y + 2, 28, 28, '#20202a');
      rect(x + 5, y + 9, 9, 3, '#2e2e39');
      rect(x + 18, y + 20, 8, 3, '#111118');
    }

    if (type === 1) {
      rect(x, y, size, size, '#0b0b10');
      rect(x, y + 20, size, 12, '#15151d');
      rect(x + 2, y + 2, 28, 6, '#23232f');
      rect(x + 4, y + 12, 8, 8, '#1f2937');
      rect(x + 20, y + 12, 8, 8, '#111827');
    }

    if (type === 2) {
      rect(x, y, size, size, '#2a1016');
      rect(x + 2, y + 2, 28, 28, '#48111d');
      rect(x + 5, y + 7, 22, 3, '#7f1d1d');
      rect(x + 6, y + 22, 20, 3, '#991b1b');
    }

    if (type === 7) {
      rect(x, y, size, size, '#17171d');
      rect(x + 8, y + 11, 16, 14, '#6b7280');
      rect(x + 10, y + 7, 12, 5, '#d1d5db');
      rect(x + 13, y + 4, 6, 3, '#f3f4f6');
    }

    if (type === 4) {
      rect(x, y, size, size, '#1a1a1f');
      rect(x + 4, y + 18, 24, 8, '#4b5563');
      rect(x + 7, y + 13, 18, 5, '#6b7280');
    }

    if (type === 3) {
      rect(x, y, size, size, '#0f172a');
      rect(x + 3, y + 8, 13, 2, '#334155');
      rect(x + 15, y + 22, 14, 2, '#475569');
    }

    return;
  }

  if ([0, 5, 8].includes(type)) {
    rect(x, y, size, size, p.grass);
    rect(x + 4, y + 6, 5, 2, p.grassDark);
    rect(x + 20, y + 24, 4, 2, p.grassDark);
    if (currentMap?.mapData?.theme === 'peace_city' && (col + row + frame) % 13 === 0) {
      rect(x + 24, y + 7, 2, 2, '#fde68a');
    }
  }

  if (type === 2) {
    rect(x, y, size, size, p.path);
    rect(x + 4, y + 6, 8, 3, p.pathDark);
    rect(x + 18, y + 23, 9, 3, p.pathLight);
  }

  if (type === 3) {
    rect(x, y, size, size, p.water);
    const wave = (frame + col * 8 + row * 5) % 45 < 22;
    rect(x + 3, y + 8, 13, 2, wave ? '#bae6fd' : '#4ca3dc');
    rect(x + 15, y + 22, 14, 2, wave ? '#4ca3dc' : '#bae6fd');
  }

  if (type === 4) {
    rect(x, y, size, size, p.grass);
    rect(x + 3, y + 13, 26, 7, p.wood);
    rect(x + 6, y + 8, 4, 17, '#6b4424');
    rect(x + 22, y + 8, 4, 17, '#6b4424');
  }

  if (type === 5) {
    rect(x, y, size, size, p.grass);
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
    rect(x, y, size, size, p.grass);
    rect(x + 8, y + 14, 17, 11, p.stone);
    rect(x + 11, y + 12, 12, 4, '#e7e5e4');
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
  if (currentMap?.key === 'kraidus_castle') {
    drawCastleTower(house);
    return;
  }

  // Mirlon tem um desenho próprio, sem rio e com casas variadas/queimadas.
  if (currentMap?.mapData?.theme === 'mirlon_burning') {
    drawMirlonHouse(house);
    return;
  }

  if (currentMap?.mapData?.theme === 'elranor_ruins') {
    drawRuinedHouse(house, true);
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

function drawCastleTower(house) {
  const x = house.x * 32;
  const y = house.y * 32;
  const w = house.w * 32;
  const h = house.h * 32;

  rect(x + 3, y + h - 4, w - 6, 8, 'rgba(0,0,0,0.40)');
  rect(x + 6, y + 8, w - 12, h - 8, '#111827');
  rect(x + 10, y + 14, w - 20, h - 20, '#1f2937');
  rect(x + 4, y + 4, w - 8, 10, '#0b0f19');
  for (let i = 0; i < w - 18; i += 14) {
    rect(x + 9 + i, y, 8, 8, '#374151');
  }
  const doorX = house.doorX * 32 + 9;
  const doorY = house.doorY * 32 + 3;
  rect(doorX, doorY, 14, 29, '#2b170f');
  rect(doorX + 4, doorY + 6, 6, 14, '#050505');
  rect(doorX + 10, doorY + 14, 3, 3, '#ef4444');
  rect(x + 16, y + 42, 12, 18, '#0b1020');
  rect(x + w - 28, y + 42, 12, 18, '#0b1020');
  rect(x + 19, y + 46, 6, 8, '#7f1d1d');
  rect(x + w - 25, y + 46, 6, 8, '#7f1d1d');
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


function drawElranorSeal(object) {
  const x = object.x * 32;
  const y = object.y * 32;
  const cracked = object.visual === 'seal_cracked';
  const pulse = frame % 60 < 30 ? 0.42 : 0.24;

  ctx.save();
  // pequenas colunas/entrada para ficar óbvio que é a porta de Elranor
  rect(x - 34, y - 24, 16, 70, '#111827');
  rect(x + 50, y - 24, 16, 70, '#111827');
  rect(x - 42, y - 30, 32, 10, '#1f2937');
  rect(x + 42, y - 30, 32, 10, '#1f2937');

  ctx.fillStyle = `rgba(124, 58, 237, ${pulse})`;
  ctx.beginPath();
  ctx.arc(x + 16, y + 16, 34, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#020617';
  ctx.beginPath();
  ctx.arc(x + 16, y + 16, 24, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = cracked ? '#facc15' : '#a855f7';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(x + 16, y + 16, 21, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = cracked ? '#fde68a' : '#c084fc';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x + 16, y - 4);
  ctx.lineTo(x + 16, y + 36);
  ctx.moveTo(x - 4, y + 16);
  ctx.lineTo(x + 36, y + 16);
  ctx.stroke();

  if (cracked) {
    ctx.strokeStyle = '#fff7ed';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 13, y - 2);
    ctx.lineTo(x + 20, y + 12);
    ctx.lineTo(x + 13, y + 20);
    ctx.lineTo(x + 23, y + 39);
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(2, 6, 23, 0.82)';
  ctx.fillRect(x - 36, y - 50, 104, 18);
  ctx.fillStyle = cracked ? '#fde68a' : '#e9d5ff';
  ctx.font = '900 11px system-ui';
  ctx.fillText(cracked ? 'SELO RACHADO' : 'SELO NEGRO', x - 28, y - 37);
  ctx.restore();
}

function drawObject(object) {
  // Durante cutscenes, alguns atores são desenhados pela própria cena.
  // Se também desenharmos o marcador do mapa, aparecem Nilzins/Lureis duplicados.
  if ((shadowEntranceEvent?.active && object.key === 'ruined_village_intro')
      || (nilzinAbductionEvent?.active && object.key === 'lurei_abduction_marker')
      || (lureiEvent?.active && object.key === 'lurei_reveal_marker')) {
    return;
  }

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


  if (object.type === 'market_stall') {
    drawMarketStall(object);
    return;
  }

  if (object.type === 'golden_lamp') {
    drawGoldenLamp(object);
    return;
  }

  if (object.type === 'peace_banner') {
    drawPeaceBanner(object);
    return;
  }

  if (object.type === 'happy_citizen') {
    drawHappyCitizen(object);
    return;
  }

  if (object.type === 'light_guard') {
    drawLightGuard(object);
    return;
  }

  if (object.type === 'ceremony_stage') {
    drawCeremonyStage(object);
    return;
  }

  if (object.type === 'shadow_portal') {
    drawShadowPortal(object);
    return;
  }

  if (object.type === 'story_visual' && object.visual === 'lurei_healed') {
    drawHealedLureiObject(object);
    return;
  }

  if (object.type === 'story_marker' && object.visual === 'nilzin_with_shadow_guard') {
    const bx = object.x * 32;
    const by = object.y * 32;
    const scene = getSceneConfig('lureiShadowEntrance');
    const scale = 0.98;
    drawNilzinShadowAt(bx - 28, by - 2, scale);
    drawLureiFormAt(scene.actors?.lurei?.formBehind || 'guerreiro', bx + 28, by + 10, scale);
    return;
  }

  if (object.type === 'story_marker' && object.visual === 'nilzin_shadow') {
    drawNilzinShadowAt(object.x * 32, object.y * 32, 1.25);
    return;
  }

  if (object.type === 'story_marker' && object.visual === 'lurei_shadow') {
    drawLureiFormAt(flags.lurei_identity_revealed ? 'dominado' : 'guerreiro', object.x * 32, object.y * 32, 1.25);
    return;
  }

  if (object.type === 'story_marker' && object.visual === 'fallen_lurei_shadow') {
    const scene = getSceneConfig('lureiPurification');
    drawLureiFormAt(scene.forms?.before || 'caido_sombra', object.x * 32, object.y * 32 + 4, 1.18);
    return;
  }

  if (object.type === 'story_marker' && object.visual === 'shadow_portal') {
    drawShadowPortal(object);
    return;
  }

  if (object.type === 'story_marker' && object.visual === 'light_pillar') {
    drawLightPillar(object);
    return;
  }

  if (object.type === 'story_marker' && (object.visual === 'seal' || object.visual === 'seal_cracked' || object.key?.includes('seal'))) {
    drawElranorSeal(object);
    return;
  }

  if (object.type === 'story_marker' && object.visual === 'kraidus') {
    drawKraidusMapSymbol(object);
    return;
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

  if (object.type === 'training_dummy') {
    const x = object.x * 32;
    const y = object.y * 32;
    ellipse(x + 16, y + 29, 11, 4, 'rgba(0,0,0,0.25)');
    rect(x + 14, y + 8, 4, 22, '#7c2d12');
    rect(x + 8, y + 10, 16, 13, '#facc15');
    rect(x + 10, y + 12, 12, 3, '#fff7ed');
    rect(x + 11, y + 17, 10, 2, '#92400e');
    rect(x + 5, y + 15, 5, 5, '#d97706');
    rect(x + 22, y + 15, 5, 5, '#d97706');
    return;
  }

  if (object.type === 'map_exit') {
    drawMapExit(object);
  }

  if (object.type === 'home_ruins') {
    // objeto invisível para interação
  }
}



function polygon(points, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
  ctx.closePath();
  ctx.fill();
}

function strokePolygon(points, color, width = 2) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
  ctx.stroke();
}

function radialGlow(x, y, r, colorStart, colorEnd = 'rgba(0,0,0,0)') {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, colorStart);
  g.addColorStop(1, colorEnd);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function drawDenzelWing(x, y, side = 'left', scale = 1, frameOffset = 0) {
  const dir = side === 'left' ? -1 : 1;
  const flap = Math.sin((frame + frameOffset) / 10) * 2;
  radialGlow(x + dir * 34 * scale, y - 4 * scale, 34 * scale, 'rgba(250, 204, 21, 0.16)');
  const points = [
    [x + dir * 8 * scale, y - 4 * scale],
    [x + dir * 32 * scale, y - (18 + flap) * scale],
    [x + dir * 55 * scale, y - 26 * scale],
    [x + dir * 45 * scale, y - 1 * scale],
    [x + dir * 22 * scale, y + 9 * scale],
  ];
  polygon(points, 'rgba(248, 250, 252, 0.96)');
  strokePolygon(points, '#facc15', 1.5 * scale);
  ctx.strokeStyle = 'rgba(250, 204, 21, 0.72)';
  ctx.lineWidth = 1 * scale;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(x + dir * (13 + i * 6) * scale, y + (-2 + i * 2) * scale);
    ctx.lineTo(x + dir * (33 + i * 7) * scale, y + (-15 + i * 7) * scale);
    ctx.stroke();
  }
}

function drawDenzelMapWings(x, y, bob = 0, direction = 'down') {
  const cfg = getDenzelWingConfigForDirection(direction);

  const wingY = y + (cfg.y ?? 17) + bob;
  const scale = cfg.scale ?? 0.54;
  const leftX = x + (cfg.leftX ?? 14);
  const rightX = x + (cfg.rightX ?? 18);
  const alpha = cfg.alpha ?? 0.86;

  ctx.save();
  ctx.globalAlpha = alpha;
  drawDenzelWing(leftX, wingY, 'left', scale, 0);
  drawDenzelWing(rightX, wingY, 'right', scale, 12);
  ctx.restore();
}

function drawDenzelCinematic(x, y, withWings = false, glowing = false, frameOffset = 0, scale = 0.86, sceneKey = '', direction = 'down') {
  ctx.save();
  const cinematic = getCinematicWingsConfig(sceneKey, direction);
  const lift = withWings ? Math.sin((frame + frameOffset) / 9) * 6 - 10 : 0;
  const wingScale = withWings ? (cinematic.scale ?? 0.54) : scale;
  const wingAnchorY = y + (cinematic.y ?? 17) + lift;
  if (glowing) radialGlow(x + 16, y - 16 + lift, 82 * Math.max(0.70, scale), 'rgba(250, 204, 21, 0.26)');
  if (withWings) {
    ctx.save();
    ctx.globalAlpha = cinematic.alpha ?? 0.86;
    drawDenzelWing(x + (cinematic.leftX ?? 14), wingAnchorY, 'left', wingScale, frameOffset);
    drawDenzelWing(x + (cinematic.rightX ?? 18), wingAnchorY, 'right', wingScale, frameOffset + 15);
    ctx.restore();
  }
  ellipse(x + 14, y + 47, (withWings ? 10 : 15) * Math.max(0.58, scale), (withWings ? 3 : 5), 'rgba(0,0,0,0.35)');
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  rect(6, 20 + lift, 8, 34, '#1f2937');
  rect(18, 20 + lift, 8, 34, '#1f2937');
  polygon([[-5, -6 + lift], [37, -6 + lift], [43, 38 + lift], [26, 52 + lift], [6, 52 + lift], [-11, 38 + lift]], '#f8fafc');
  rect(-5, -6 + lift, 42, 5, '#facc15');
  rect(14, 0 + lift, 5, 43, '#facc15');
  rect(-13, 2 + lift, 9, 30, '#6b4423');
  rect(36, 2 + lift, 9, 30, '#6b4423');
  rect(2, -42 + lift, 28, 27, '#6b3f2a');
  rect(0, -48 + lift, 32, 11, '#111111');
  rect(6, -30 + lift, 4, 4, '#111827');
  rect(21, -30 + lift, 4, 4, '#111827');
  if (glowing) {
    ctx.strokeStyle = 'rgba(250,204,21,0.85)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(16, 9 + lift, 54 + Math.sin(frame / 8) * 4, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawSeparatedStaff(x, y, glowing = false, frameOffset = 0, scale = 1) {
  ctx.save();
  if (glowing) radialGlow(x + 4, y - 16, 42 * scale, 'rgba(250, 204, 21, 0.35)');
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.rotate(-0.35);
  rect(0, -5, 5, 72, '#8b5e34');
  rect(1, -5, 1, 72, '#fff3c4');
  ctx.shadowColor = '#facc15';
  ctx.shadowBlur = glowing ? 18 : 8;
  rect(-5, -16, 16, 14, glowing ? '#fde68a' : '#ffb347');
  rect(-1, -12, 8, 6, '#fff3c4');
  ctx.restore();
}

function drawKraidusCastleBackground(dramatic = false) {
  rect(0, 0, canvas.width, canvas.height, dramatic ? 'rgba(2, 6, 23, 0.98)' : '#08070a');
  for (let i = 0; i < 6; i++) {
    const x = 35 + i * 110;
    rect(x, 88, 28, 296, '#050505');
    rect(x - 6, 88, 40, 14, '#111827');
    rect(x - 4, 365, 36, 19, '#111827');
  }
  rect(36, 358, 568, 26, '#17110f');
  rect(44, 92, 552, 292, dramatic ? 'rgba(10, 10, 14, 0.76)' : 'rgba(15, 23, 42, 0.82)');
  for (let i = 0; i < 8; i++) {
    const fx = 75 + i * 70;
    const fy = 352 + (i % 2) * 8;
    rect(fx, fy, 18, 5, '#7f1d1d');
    rect(fx + 4, fy - 8, 5, 10, frame % 20 < 10 ? '#ef4444' : '#f97316');
    rect(fx + 9, fy - 12, 5, 14, '#facc15');
  }
  ctx.fillStyle = 'rgba(69, 26, 3, 0.20)';
  ctx.fillRect(44, 92, 552, 292);
}

function drawKraidusBattleSprite(cx, cy, scale = 1, frameOffset = 0) {
  const bob = Math.sin((frame + frameOffset) / 12) * 3 * scale;
  radialGlow(cx, cy + 18, 120 * scale, 'rgba(239, 36, 22, 0.18)');

  // asas
  polygon([[cx - 28*scale, cy - 18*scale], [cx - 135*scale, cy - 88*scale], [cx - 150*scale, cy + 10*scale], [cx - 95*scale, cy - 8*scale], [cx - 74*scale, cy + 60*scale]], '#050505');
  polygon([[cx + 28*scale, cy - 18*scale], [cx + 135*scale, cy - 88*scale], [cx + 150*scale, cy + 10*scale], [cx + 95*scale, cy - 8*scale], [cx + 74*scale, cy + 60*scale]], '#050505');
  polygon([[cx - 48*scale, cy - 12*scale], [cx - 118*scale, cy - 66*scale], [cx - 112*scale, cy + 8*scale]], 'rgba(127,29,29,0.58)');
  polygon([[cx + 48*scale, cy - 12*scale], [cx + 118*scale, cy - 66*scale], [cx + 112*scale, cy + 8*scale]], 'rgba(127,29,29,0.58)');
  strokePolygon([[cx - 48*scale, cy - 12*scale], [cx - 110*scale, cy - 55*scale], [cx - 140*scale, cy - 60*scale]], 'rgba(239,36,22,0.55)', 2*scale);
  strokePolygon([[cx + 48*scale, cy - 12*scale], [cx + 110*scale, cy - 55*scale], [cx + 140*scale, cy - 60*scale]], 'rgba(239,36,22,0.55)', 2*scale);

  // cauda
  ctx.strokeStyle = '#050505';
  ctx.lineWidth = 12 * scale;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx + 22*scale, cy + 72*scale);
  ctx.quadraticCurveTo(cx + 110*scale, cy + 108*scale, cx + 150*scale, cy + 55*scale);
  ctx.stroke();

  // pernas
  polygon([[cx - 34*scale, cy + 52*scale], [cx - 14*scale, cy + 55*scale], [cx - 20*scale, cy + 120*scale], [cx - 55*scale, cy + 120*scale]], '#060606');
  polygon([[cx + 34*scale, cy + 52*scale], [cx + 14*scale, cy + 55*scale], [cx + 20*scale, cy + 120*scale], [cx + 55*scale, cy + 120*scale]], '#060606');

  // braços
  polygon([[cx - 38*scale, cy - 8*scale], [cx - 82*scale, cy + 12*scale], [cx - 100*scale, cy + 76*scale], [cx - 76*scale, cy + 82*scale], [cx - 56*scale, cy + 28*scale]], '#070707');
  polygon([[cx + 38*scale, cy - 8*scale], [cx + 82*scale, cy + 12*scale], [cx + 100*scale, cy + 76*scale], [cx + 76*scale, cy + 82*scale], [cx + 56*scale, cy + 28*scale]], '#070707');

  // corpo
  polygon([[cx - 44*scale, cy - 44*scale + bob], [cx + 44*scale, cy - 44*scale + bob], [cx + 58*scale, cy + 28*scale + bob], [cx + 30*scale, cy + 88*scale + bob], [cx, cy + 105*scale + bob], [cx - 30*scale, cy + 88*scale + bob], [cx - 58*scale, cy + 28*scale + bob]], '#0a0a0a');

  // ombros
  polygon([[cx - 44*scale, cy - 38*scale + bob], [cx - 86*scale, cy - 52*scale + bob], [cx - 66*scale, cy - 15*scale + bob]], '#050505');
  polygon([[cx + 44*scale, cy - 38*scale + bob], [cx + 86*scale, cy - 52*scale + bob], [cx + 66*scale, cy - 15*scale + bob]], '#050505');

  // chifres
  polygon([[cx - 18*scale, cy - 70*scale + bob], [cx - 76*scale, cy - 118*scale + bob], [cx - 96*scale, cy - 72*scale + bob], [cx - 28*scale, cy - 52*scale + bob]], '#020202');
  polygon([[cx + 18*scale, cy - 70*scale + bob], [cx + 76*scale, cy - 118*scale + bob], [cx + 96*scale, cy - 72*scale + bob], [cx + 28*scale, cy - 52*scale + bob]], '#020202');

  // cabeça
  polygon([[cx - 28*scale, cy - 74*scale + bob], [cx + 28*scale, cy - 74*scale + bob], [cx + 34*scale, cy - 42*scale + bob], [cx, cy - 20*scale + bob], [cx - 34*scale, cy - 42*scale + bob]], '#050505');

  // olhos
  ctx.save();
  ctx.shadowColor = '#ef2416';
  ctx.shadowBlur = 12 * scale;
  rect(cx - 16*scale, cy - 55*scale + bob, 7*scale, 4*scale, '#ef2416');
  rect(cx + 9*scale, cy - 55*scale + bob, 7*scale, 4*scale, '#ef2416');
  ctx.restore();

  // fissuras
  ctx.save();
  ctx.strokeStyle = '#ef2416';
  ctx.lineWidth = 2.4 * scale;
  ctx.shadowColor = '#ef2416';
  ctx.shadowBlur = 8 * scale;
  strokePolygon([[cx, cy - 32*scale + bob], [cx - 8*scale, cy - 5*scale + bob], [cx + 4*scale, cy + 25*scale + bob], [cx - 9*scale, cy + 58*scale + bob]], ctx.strokeStyle, 2.4*scale);
  strokePolygon([[cx + 10*scale, cy - 10*scale + bob], [cx + 28*scale, cy + 10*scale + bob], [cx + 22*scale, cy + 42*scale + bob]], ctx.strokeStyle, 2.1*scale);
  strokePolygon([[cx - 12*scale, cy + 4*scale + bob], [cx - 34*scale, cy + 25*scale + bob], [cx - 28*scale, cy + 52*scale + bob]], ctx.strokeStyle, 2.1*scale);
  ctx.restore();
}

function drawKraidusMiniAt(x, y, scale = 1) {
  const cx = x + 16 * scale;
  const cy = y + 18 * scale;
  const bob = Math.sin(frame / 10) * 2 * scale;
  radialGlow(cx, cy, 38 * scale, 'rgba(239,36,22,0.22)');

  polygon([[cx - 12*scale, cy - 5*scale], [cx - 55*scale, cy - 30*scale], [cx - 66*scale, cy + 5*scale], [cx - 38*scale, cy - 1*scale], [cx - 28*scale, cy + 22*scale]], '#040404');
  polygon([[cx + 12*scale, cy - 5*scale], [cx + 55*scale, cy - 30*scale], [cx + 66*scale, cy + 5*scale], [cx + 38*scale, cy - 1*scale], [cx + 28*scale, cy + 22*scale]], '#040404');
  polygon([[cx - 11*scale, cy - 32*scale + bob], [cx - 36*scale, cy - 62*scale + bob], [cx - 44*scale, cy - 32*scale + bob], [cx - 18*scale, cy - 25*scale + bob]], '#020202');
  polygon([[cx + 11*scale, cy - 32*scale + bob], [cx + 36*scale, cy - 62*scale + bob], [cx + 44*scale, cy - 32*scale + bob], [cx + 18*scale, cy - 25*scale + bob]], '#020202');
  rect(cx - 23*scale, cy - 12*scale + bob, 46*scale, 40*scale, '#080808');
  rect(cx - 15*scale, cy - 34*scale + bob, 30*scale, 21*scale, '#050505');
  rect(cx - 35*scale, cy + 4*scale + bob, 10*scale, 33*scale, '#070707');
  rect(cx + 25*scale, cy + 4*scale + bob, 10*scale, 33*scale, '#070707');
  rect(cx - 14*scale, cy + 27*scale + bob, 9*scale, 27*scale, '#050505');
  rect(cx + 5*scale, cy + 27*scale + bob, 9*scale, 27*scale, '#050505');
  ctx.save();
  ctx.shadowColor = '#ef2416';
  ctx.shadowBlur = 8 * scale;
  rect(cx - 8*scale, cy - 25*scale + bob, 4*scale, 3*scale, '#ef2416');
  rect(cx + 4*scale, cy - 25*scale + bob, 4*scale, 3*scale, '#ef2416');
  ctx.strokeStyle = '#ef2416';
  ctx.lineWidth = 2 * scale;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 8*scale + bob);
  ctx.lineTo(cx - 5*scale, cy + 8*scale + bob);
  ctx.lineTo(cx + 3*scale, cy + 23*scale + bob);
  ctx.stroke();
  ctx.restore();
}



function drawMarketStall(object) {
  const x = object.x * 32;
  const y = object.y * 32;
  const color = object.color || '#d97706';
  ctx.save();
  ellipse(x + 16, y + 28, 14, 4, 'rgba(0,0,0,0.20)');
  rect(x + 4, y + 16, 24, 10, '#8b5e34');
  rect(x + 6, y + 11, 20, 7, color);
  rect(x + 4, y + 8, 24, 5, '#fef3c7');
  rect(x + 5, y + 8, 5, 5, color);
  rect(x + 15, y + 8, 5, 5, color);
  rect(x + 25, y + 8, 3, 5, color);
  rect(x + 8, y + 22, 5, 4, '#facc15');
  rect(x + 17, y + 22, 5, 4, '#84cc16');
  ctx.restore();
}

function drawGoldenLamp(object) {
  const x = object.x * 32;
  const y = object.y * 32;
  const pulse = frame % 60 < 30 ? 0.34 : 0.18;
  ctx.save();
  ctx.fillStyle = `rgba(250, 204, 21, ${pulse})`;
  ctx.beginPath();
  ctx.ellipse(x + 16, y + 12, 22, 24, 0, 0, Math.PI * 2);
  ctx.fill();
  rect(x + 14, y + 10, 4, 20, '#92400e');
  rect(x + 10, y + 8, 12, 5, '#facc15');
  rect(x + 12, y + 3, 8, 7, '#fde68a');
  rect(x + 8, y + 29, 16, 3, '#78350f');
  ctx.restore();
}

function drawPeaceBanner(object) {
  const x = object.x * 32;
  const y = object.y * 32;
  ctx.save();
  rect(x + 5, y + 4, 3, 28, '#92400e');
  rect(x + 24, y + 4, 3, 28, '#92400e');
  rect(x + 6, y + 7, 20, 12, '#facc15');
  rect(x + 10, y + 10, 12, 2, '#fff7ed');
  rect(x + 12, y + 14, 8, 2, '#fff7ed');
  ctx.restore();
}

function drawHappyCitizen(object) {
  const x = object.x * 32;
  const y = object.y * 32;
  const bob = Math.sin((frame + object.x * 7) / 12) * 1.2;
  ctx.save();
  ellipse(x + 16, y + 29, 9, 4, 'rgba(0,0,0,0.22)');
  rect(x + 10, y + 20 + bob, 5, 8, '#1f2937');
  rect(x + 18, y + 20 - bob, 5, 8, '#1f2937');
  rect(x + 8, y + 13 + bob, 16, 11, object.color || '#0ea5e9');
  rect(x + 5, y + 15 + bob, 4, 8, '#7c4a32');
  rect(x + 24, y + 15 - bob, 4, 8, '#7c4a32');
  rect(x + 9, y + 5 + bob, 14, 12, '#7c4a32');
  rect(x + 9, y + 3 + bob, 14, 4, '#111827');
  rect(x + 12, y + 11 + bob, 2, 2, '#111827');
  rect(x + 18, y + 11 + bob, 2, 2, '#111827');
  rect(x + 14, y + 16 + bob, 5, 1, '#fef3c7');
  ctx.restore();
}

function drawLightGuard(object) {
  const x = object.x * 32;
  const y = object.y * 32;
  const bob = Math.sin((frame + object.x * 7) / 14) * 0.9;
  ctx.save();
  radialGlow(x + 16, y + 16, 30, 'rgba(250,204,21,0.18)');
  ellipse(x + 16, y + 30, 12, 4, 'rgba(0,0,0,0.24)');
  // pernas
  rect(x + 10, y + 22 + bob, 5, 7, '#111827');
  rect(x + 18, y + 22 - bob, 5, 7, '#111827');
  // túnica branca/dourada
  rect(x + 7, y + 13 + bob, 18, 12, '#f8fafc');
  rect(x + 7, y + 13 + bob, 18, 3, '#facc15');
  rect(x + 14, y + 16 + bob, 4, 11, '#facc15');
  // capa dourada
  rect(x + 5, y + 15 + bob, 4, 13, '#ca8a04');
  rect(x + 23, y + 15 - bob, 4, 13, '#ca8a04');
  // cabeça
  rect(x + 9, y + 5 + bob, 14, 12, '#7c4a32');
  rect(x + 8, y + 2 + bob, 16, 6, '#111827');
  rect(x + 12, y + 11 + bob, 2, 2, '#111827');
  rect(x + 18, y + 11 + bob, 2, 2, '#111827');
  // símbolo de luz
  rect(x + 13, y + 3 + bob, 6, 2, '#fde68a');
  rect(x + 15, y + 1 + bob, 2, 6, '#fde68a');
  // lança/estandarte de luz
  ctx.strokeStyle = '#fde68a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 27, y + 7 + bob);
  ctx.lineTo(x + 27, y + 31 + bob);
  ctx.stroke();
  polygon([[x + 27, y + 5 + bob], [x + 34, y + 10 + bob], [x + 27, y + 15 + bob]], '#facc15');
  ctx.restore();
}


function drawCeremonyStage(object) {
  const x = object.x * 32;
  const y = object.y * 32;
  ctx.save();
  ellipse(x + 16, y + 25, 34, 8, 'rgba(0,0,0,0.24)');
  rect(x - 28, y + 10, 88, 22, object.broken ? '#3f2a1d' : '#92400e');
  rect(x - 24, y + 6, 80, 6, object.broken ? '#57534e' : '#facc15');
  rect(x - 20, y + 15, 14, 10, object.broken ? '#111827' : '#fde68a');
  rect(x + 3, y + 15, 14, 10, object.broken ? '#111827' : '#fde68a');
  rect(x + 26, y + 15, 14, 10, object.broken ? '#111827' : '#fde68a');
  if (object.broken) {
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 20, y + 6);
    ctx.lineTo(x + 42, y + 30);
    ctx.stroke();
  }
  ctx.restore();
}

function drawShadowPortal(object) {
  const x = object.x * 32;
  const y = object.y * 32;
  const pulse = 0.18 + (Math.sin(frame / 14) * 0.05);
  ctx.save();
  radialGlow(x + 16, y + 17, 26, `rgba(76, 5, 25, ${pulse})`);
  ctx.fillStyle = 'rgba(20, 0, 28, 0.72)';
  ctx.beginPath();
  ctx.ellipse(x + 16, y + 17, 15, 20, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(168, 85, 247, 0.38)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(x + 16, y + 17, 9, 14, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawLightPillar(object) {
  const x = object.x * 32;
  const y = object.y * 32;
  ctx.save();
  ctx.fillStyle = 'rgba(250, 204, 21, 0.22)';
  ctx.fillRect(x + 6, y - 34, 20, 70);
  ctx.strokeStyle = 'rgba(255,255,255,0.65)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x + 16, y - 38);
  ctx.lineTo(x + 16, y + 36);
  ctx.stroke();
  ellipse(x + 16, y + 18, 23, 9, 'rgba(250,204,21,0.22)');
  ctx.restore();
}


function drawNilzinShadowAt(x, y, scale = 1) {
  const bob = Math.sin(frame / 10) * 1.1 * scale;
  ctx.save();

  // Aura leve e curta. Sem círculos grandes no mapa.
  radialGlow(x + 16*scale, y + 18*scale, 22*scale, 'rgba(76, 5, 25, 0.20)');
  ellipse(x + 16*scale, y + 31*scale, 9*scale, 3*scale, 'rgba(0,0,0,0.30)');

  // Corpo pequeno/frágil.
  polygon([[x + 11*scale, y + 15*scale + bob], [x + 21*scale, y + 15*scale + bob], [x + 23*scale, y + 28*scale + bob], [x + 9*scale, y + 28*scale + bob]], '#050505');
  rect(x + 11*scale, y + 16*scale + bob, 10*scale, 9*scale, '#050505');
  rect(x + 12*scale, y + 16*scale + bob, 8*scale, 2*scale, '#3b0764');
  rect(x + 9*scale, y + 17*scale + bob, 2.5*scale, 7*scale, '#f1d0b5');
  rect(x + 21*scale, y + 17*scale + bob, 2.5*scale, 7*scale, '#f1d0b5');

  // Cabeça/cabelo menor.
  rect(x + 12*scale, y + 8*scale + bob, 8*scale, 8*scale, '#f1d0b5');
  rect(x + 10*scale, y + 5*scale + bob, 12*scale, 5*scale, '#f8fafc');
  rect(x + 9*scale, y + 9*scale + bob, 3*scale, 9*scale, '#e5e7eb');
  rect(x + 20*scale, y + 9*scale + bob, 3*scale, 9*scale, '#e5e7eb');

  rect(x + 13*scale, y + 12*scale + bob, 1.4*scale, 1.4*scale, '#a855f7');
  rect(x + 17*scale, y + 12*scale + bob, 1.4*scale, 1.4*scale, '#a855f7');

  ctx.restore();
}

function drawHoodedShadowWarriorAt(x, y, scale = 1) {
  const float = Math.sin(frame / 9) * 2 * scale;
  ctx.save();
  radialGlow(x + 18*scale, y + 22*scale, 34*scale, 'rgba(88,28,135,0.24)');
  ellipse(x + 18*scale, y + 50*scale, 18*scale, 6*scale, 'rgba(0,0,0,0.35)');
  // capa/capuz escondem a identidade
  polygon([[x + 4*scale, y + 18*scale + float], [x + 32*scale, y + 18*scale + float], [x + 39*scale, y + 52*scale + float], [x - 3*scale, y + 52*scale + float]], '#07030c');
  polygon([[x + 7*scale, y + 8*scale + float], [x + 29*scale, y + 8*scale + float], [x + 35*scale, y + 25*scale + float], [x + 18*scale, y + 32*scale + float], [x + 1*scale, y + 25*scale + float]], '#0f0718');
  rect(x + 11*scale, y + 19*scale + float, 14*scale, 20*scale, '#111827');
  rect(x + 10*scale, y + 42*scale + float, 6*scale, 15*scale, '#050505');
  rect(x + 21*scale, y + 42*scale + float, 6*scale, 15*scale, '#050505');
  rect(x - 5*scale, y + 28*scale + float, 10*scale, 24*scale, '#090311');
  rect(x + 31*scale, y + 28*scale + float, 10*scale, 24*scale, '#090311');
  ctx.save();
  ctx.shadowColor = '#a855f7';
  ctx.shadowBlur = 10*scale;
  rect(x + 11*scale, y + 18*scale + float, 4*scale, 3*scale, '#a855f7');
  rect(x + 22*scale, y + 18*scale + float, 4*scale, 3*scale, '#a855f7');
  ctx.strokeStyle = '#a855f7';
  ctx.lineWidth = 2*scale;
  ctx.beginPath();
  ctx.moveTo(x + 36*scale, y + 12*scale + float);
  ctx.lineTo(x + 48*scale, y + 54*scale + float);
  ctx.stroke();
  ctx.restore();
  ctx.restore();
}

function drawHoodedShadowWarriorBattleSprite(cx, cy, scale = 1) {
  drawHoodedShadowWarriorAt(cx - 23*scale, cy - 28*scale, 2.22*scale);
  ctx.save();
  ctx.strokeStyle = 'rgba(168,85,247,0.55)';
  ctx.lineWidth = 3*scale;
  ctx.beginPath();
  ctx.arc(cx, cy + 32*scale, 60*scale + Math.sin(frame / 8) * 5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawLureiShadowAt(x, y, scale = 1) {
  const bob = Math.sin(frame / 9) * 1.5 * scale;
  ctx.save();
  radialGlow(x + 16*scale, y + 17*scale, 54*scale, 'rgba(88, 28, 135, 0.34)');
  radialGlow(x + 16*scale, y + 17*scale, 34*scale, 'rgba(124, 58, 237, 0.30)');
  // aura em chamas roxas
  for (let i = 0; i < 5; i++) {
    ctx.strokeStyle = `rgba(168,85,247,${0.24 + i * 0.08})`;
    ctx.lineWidth = 2*scale;
    ctx.beginPath();
    ctx.arc(x + 16*scale, y + 18*scale + bob, (18 + i*7 + Math.sin(frame/8+i)*2)*scale, 0, Math.PI * 2);
    ctx.stroke();
  }
  // asas/energia sombria
  drawDenzelWing(x + 16*scale, y + 18*scale + bob, 'left', 0.50*scale, 6);
  drawDenzelWing(x + 16*scale, y + 18*scale + bob, 'right', 0.50*scale, 16);
  ctx.globalAlpha = 0.62;
  rect(x - 8*scale, y + 4*scale + bob, 48*scale, 26*scale, '#020617');
  ctx.globalAlpha = 1;
  ellipse(x + 16*scale, y + 31*scale, 15*scale, 4*scale, 'rgba(0,0,0,0.42)');
  // botas/pernas
  rect(x + 8*scale, y + 21*scale + bob, 7*scale, 12*scale, '#050505');
  rect(x + 18*scale, y + 21*scale - bob, 7*scale, 12*scale, '#050505');
  // armadura corrompida
  rect(x + 6*scale, y + 13*scale + bob, 20*scale, 14*scale, '#090014');
  rect(x + 8*scale, y + 13*scale + bob, 16*scale, 3*scale, '#7e22ce');
  rect(x + 14*scale, y + 15*scale + bob, 4*scale, 12*scale, '#a855f7');
  // ombros/espinhos
  polygon([[x + 6*scale, y + 13*scale + bob], [x - 3*scale, y + 9*scale + bob], [x + 5*scale, y + 20*scale + bob]], '#020617');
  polygon([[x + 26*scale, y + 13*scale + bob], [x + 35*scale, y + 9*scale + bob], [x + 27*scale, y + 20*scale + bob]], '#020617');
  rect(x + 4*scale, y + 14*scale + bob, 5*scale, 12*scale, '#6b3f2a');
  rect(x + 24*scale, y + 14*scale - bob, 5*scale, 12*scale, '#6b3f2a');
  rect(x + 9*scale, y + 5*scale + bob, 14*scale, 12*scale, '#6b3f2a');
  rect(x + 7*scale, y + 1*scale + bob, 18*scale, 8*scale, '#050505');
  // olhos roxos
  ctx.save();
  ctx.shadowColor = '#c084fc';
  ctx.shadowBlur = 8*scale;
  rect(x + 12*scale, y + 11*scale + bob, 2*scale, 2*scale, '#c084fc');
  rect(x + 18*scale, y + 11*scale + bob, 2*scale, 2*scale, '#c084fc');
  ctx.restore();
  // lança negra roxa
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 3*scale;
  ctx.beginPath();
  ctx.moveTo(x + 29*scale, y + 0*scale + bob);
  ctx.lineTo(x + 8*scale, y + 35*scale + bob);
  ctx.stroke();
  ctx.strokeStyle = '#a855f7';
  ctx.lineWidth = 1.2*scale;
  ctx.beginPath();
  ctx.moveTo(x + 29*scale, y + 0*scale + bob);
  ctx.lineTo(x + 8*scale, y + 35*scale + bob);
  ctx.stroke();
  polygon([[x + 29*scale, y - 1*scale + bob], [x + 37*scale, y - 9*scale + bob], [x + 34*scale, y + 6*scale + bob]], '#7e22ce');
  ctx.restore();
}

function drawNilzinBattleSprite(cx, cy, scale = 1) {
  ctx.save();
  radialGlow(cx, cy + 20*scale, 95*scale, 'rgba(76,5,25,0.28)');
  for (let i = 0; i < 5; i++) {
    ctx.strokeStyle = `rgba(124,58,237,${0.25 + i * 0.08})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy + 25*scale, (38 + i*13 + Math.sin(frame/10+i)*4)*scale, 0, Math.PI*2);
    ctx.stroke();
  }
  drawNilzinShadowAt(cx - 12*scale, cy - 14*scale, 1.45*scale);
  ctx.restore();
}

function drawLureiBattleSprite(cx, cy, scale = 1) {
  ctx.save();
  radialGlow(cx, cy + 20*scale, 105*scale, 'rgba(2,6,23,0.38)');
  drawLureiShadowAt(cx - 24*scale, cy - 20*scale, 2.15*scale);
  ctx.restore();
}

function drawKraidusMapSymbol(object) {
  const x = object.x * 32;
  const y = object.y * 32;
  ctx.save();
  drawKraidusMiniAt(x - 18, y - 28, 0.88);
  ctx.fillStyle = '#fecaca';
  ctx.font = '900 8px system-ui';
  ctx.fillText('KRAIDUS', x - 8, y - 36);
  ctx.restore();
}


function drawMapExit(object) {
  const x = object.x * 32;
  const y = object.y * 32;
  const pulse = frame % 50 < 25 ? 0.40 : 0.20;
  const label = object.label || 'SAÍDA';
  ctx.save();
  ctx.fillStyle = `rgba(250, 204, 21, ${pulse})`;
  ctx.beginPath();
  ctx.ellipse(x + 16, y + 16, 24, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  rect(x + 4, y + 12, 17, 8, '#facc15');
  rect(x + 19, y + 8, 9, 16, '#facc15');
  rect(x + 7, y + 15, 13, 2, '#7c2d12');
  ctx.fillStyle = '#fef3c7';
  ctx.font = '900 7px system-ui';
  ctx.fillText(label.substring(0, 8), x - 1, y + 6);
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


function drawLightKnightCharacter(entity, isPlayer = false) {
  const x = entity.x;
  const y = entity.y;
  const colors = entity.colors || {};
  const style = entity.spriteKey || 'light_knight';
  const bob = entity.moving ? (Math.sin(frame / 5) * 1.2) : 0;
  const movingStep = entity.moving ? (Math.sin(frame / 4) >= 0 ? 1 : -1) : 0;
  const skin = colors.skin || '#7c4a32';
  const hair = colors.hair || '#111827';
  const white = '#f8fafc';
  const gold = '#facc15';
  const darkGold = '#b45309';
  const dark = '#111827';

  ctx.save();
  if (style === 'lurei_light_knight') radialGlow(x + 16, y + 16 + bob, 24, 'rgba(250,204,21,0.20)');
  ellipse(x + 16, y + 29, 12, 4, 'rgba(0,0,0,0.28)');

  // pernas e botas
  rect(x + 9, y + 22 + movingStep, 6, 7, dark);
  rect(x + 18, y + 22 - movingStep, 6, 7, dark);
  rect(x + 8, y + 28 + movingStep, 7, 2, '#020617');
  rect(x + 18, y + 28 - movingStep, 7, 2, '#020617');

  // capa dourada e ombros
  rect(x + 5, y + 13 + bob, 22, 14, 'rgba(202,138,4,0.80)');
  rect(x + 6, y + 13 + bob, 20, 4, darkGold);

  // túnica/armadura branca com símbolo dourado
  rect(x + 8, y + 13 + bob, 16, 12, white);
  rect(x + 8, y + 13 + bob, 16, 3, gold);
  rect(x + 14, y + 15 + bob, 4, 10, gold);
  rect(x + 11, y + 18 + bob, 10, 2, '#fff7ed');
  if (style === 'lurei_light_knight') {
    rect(x + 12, y + 16 + bob, 8, 2, '#fde68a');
    rect(x + 15, y + 13 + bob, 2, 12, '#fde68a');
  }

  // braços
  rect(x + 5, y + 16 - movingStep + bob, 4, 8, skin);
  rect(x + 23, y + 16 + movingStep + bob, 4, 8, skin);

  // espada/lança curta dourada para Lurei
  if (style === 'lurei_light_knight') {
    ctx.strokeStyle = '#fde68a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 27, y + 7 + bob);
    ctx.lineTo(x + 9, y + 29 + bob);
    ctx.stroke();
    polygon([[x + 29, y + 5 + bob], [x + 34, y + 0 + bob], [x + 32, y + 10 + bob]], '#facc15');
  }

  // cabeça / cabelo / olhos
  rect(x + 9, y + 5 + bob, 14, 12, skin);
  rect(x + 8, y + 2 + bob, 16, 6, hair);
  rect(x + 8, y + 6 + bob, 3, 5, hair);
  rect(x + 21, y + 6 + bob, 3, 5, hair);
  rect(x + 12, y + 11 + bob, 2, 2, '#111827');
  rect(x + 18, y + 11 + bob, 2, 2, '#111827');

  // halo/símbolo dos Cavaleiros da Luz
  ctx.strokeStyle = 'rgba(250,204,21,0.65)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(x + 16, y + 7 + bob, 12, 0, Math.PI * 2);
  ctx.stroke();
  rect(x + 13, y + 1 + bob, 6, 2, '#fde68a');
  rect(x + 15, y - 1 + bob, 2, 6, '#fde68a');
  ctx.restore();
}

function drawCharacter(entity, isPlayer = false) {
  const x = entity.x;
  const colors = entity.colors || {};
  const spriteKey = entity.spriteKey || (isPlayer ? 'hero' : 'villager');
  const style = spriteKey;
  const hasActiveWings = (isPlayer || style === 'hero') && Boolean(flags.denzel_wings_unlocked);
  const flightLift = hasActiveWings ? Math.sin(frame / 9) * 2.5 - 6 : 0;
  const y = entity.y + flightLift;

  const movingStep = entity.moving && !hasActiveWings ? (Math.sin(frame / 4) >= 0 ? 1 : -1) : 0;
  const bob = entity.moving ? (Math.sin(frame / 5) * (hasActiveWings ? 0.8 : 1.2)) : 0;
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

  if (style === 'light_knight' || style === 'lurei_light_knight') {
    drawLightKnightCharacter(entity, isPlayer);
    return;
  }

  const wingsDrawOrder = window.DENZEL_VISUAL_CONFIG?.drawOrder?.mapWings || 'behind';

  // Asas de Luz Pura: por defeito ficam atrás do corpo.
  if (hasActiveWings && direction !== 'up') {
    drawDenzelMapWings(x, y, bob, direction);
  }

  // sombra arredondada para dar profundidade ao mapa; com asas, a sombra fica mais baixa e pequena.
  ellipse(x + 16, hasActiveWings ? entity.y + 31 : y + 29, isChild ? 9 : (hasActiveWings ? 8 : 11), hasActiveWings ? 3 : 4, 'rgba(0,0,0,0.28)');

  // pernas com animação de passo
  const leftLegOffset = entity.moving ? movingStep : 0;
  const rightLegOffset = entity.moving ? -movingStep : 0;

  if (style === 'nilzin') {
    // Nilzin em mapa: cerca de 60% menor e fisicamente mais frágil.
    rect(x + 13, y + 21 + bob, 5, 5, '#050505');
    rect(x + 12, y + 24 + bob, 7, 4, '#111827');
    rect(x + 13, y + 28, 2, 2, shoes);
    rect(x + 17, y + 28, 2, 2, shoes);
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

  if (style === 'nilzin') {
    rect(x + 13, bodyTop + 2, 5, 1, '#2d3748');
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
  } else if (style === 'nilzin') {
    rect(x + 13, headTop + 3, 5, 5, skin);
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

  // Se quiseres testar as asas à frente do corpo, muda mapWings para 'front'
  // no ficheiro js/config/denzel-visual-config.js.
  if (hasActiveWings && direction === 'up') {
  drawDenzelMapWings(x, y, bob, direction);
}
}



function getDisplayEnemyLevel(object) {
  if (Number.isFinite(object?.autoScaleFromPlayer)) {
    return Math.max(1, (player.stats.level || 1) + object.autoScaleFromPlayer);
  }
  return object?.stats?.level || 1;
}

function drawEnemyLevelLabel(object) {
  const level = getDisplayEnemyLevel(object);
  const x = object.x * 32;
  const y = object.y * 32;
  const label = `Nv ${level}`;
  const width = Math.max(30, 8 + label.length * 6);
  rect(x + 1, y - 8, width, 10, 'rgba(2, 6, 23, 0.78)');
  ctx.fillStyle = '#fde68a';
  ctx.font = '900 8px system-ui';
  ctx.fillText(label, x + 5, y);
}


function drawForestEnemy(object) {
  const x = object.x * 32;
  const y = object.y * 32;
  const float = Math.sin((frame + object.x * 5) / 10) * 2;

  if ((object.enemyType || '') === 'nilzin_shadow') {
    drawNilzinShadowAt(x - 2, y - 6, 1.05);
    return;
  }

  if ((object.enemyType || '') === 'lurei_shadow') {
    drawLureiFormAt((object.questKey === 'd2_first_lurei_battle' && !flags.lurei_identity_revealed) ? 'guerreiro' : 'dominado', x + 16, y + 16, 0.64);
    return;
  }

  if ((object.enemyType || '') === 'kraidus') {
    ctx.save();
    drawKraidusMiniAt(x - 18, y - 28, 0.88);
    ctx.restore();
    return;
  }

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

  if (currentMap.key === 'estrada_elranor' && ['elranor_gate_warning', 'break_elranor_seal'].includes(currentQuest.key)) {
    ctx.save();
    ctx.fillStyle = 'rgba(2, 6, 23, 0.72)';
    ctx.fillRect(386, 12, 240, 46);
    ctx.fillStyle = '#e9d5ff';
    ctx.font = '900 12px system-ui';
    ctx.fillText('Selo negro: topo/centro ↑', 402, 32);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '800 10px system-ui';
    ctx.fillText('Procura o símbolo roxo e preto.', 402, 48);
    ctx.restore();
  }

  if (currentMap.key === 'elranor_ruins' && currentQuest.key === 'elranor_rescue') {
    ctx.save();
    ctx.fillStyle = 'rgba(2, 6, 23, 0.72)';
    ctx.fillRect(390, 12, 236, 46);
    ctx.fillStyle = '#fde68a';
    ctx.font = '900 12px system-ui';
    ctx.fillText('Objetivo: derrotar 2 carcereiros', 402, 32);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '800 10px system-ui';
    ctx.fillText('Eles guardam os sobreviventes.', 402, 48);
    ctx.restore();
  }

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

  if (currentMap.key === 'zaridon_road' && currentQuest.key === 'hordes_to_zaridon') {
    ctx.save();
    ctx.fillStyle = 'rgba(2, 6, 23, 0.72)';
    ctx.fillRect(386, 12, 240, 46);
    ctx.fillStyle = '#fde68a';
    ctx.font = '900 12px system-ui';
    ctx.fillText('Derrota 4 demónios da estrada', 402, 32);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '800 10px system-ui';
    ctx.fillText('Eles reaparecem para poderes upar.', 402, 48);
    ctx.restore();
  }

  if (currentMap.key === 'zaridon_ruins' && currentQuest.key === 'liberate_zaridon') {
    ctx.save();
    ctx.fillStyle = 'rgba(2, 6, 23, 0.72)';
    ctx.fillRect(382, 12, 244, 46);
    ctx.fillStyle = '#fde68a';
    ctx.font = '900 12px system-ui';
    ctx.fillText('Liberta a praça: 4 demónios', 398, 32);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '800 10px system-ui';
    ctx.fillText('Depois segue para o castelo.', 398, 48);
    ctx.restore();
  }

  if (currentMap.key === 'kraidus_castle') {
    ctx.save();
    ctx.fillStyle = 'rgba(2, 6, 23, 0.74)';
    ctx.fillRect(386, 12, 240, 46);
    ctx.fillStyle = '#e9d5ff';
    ctx.font = '900 12px system-ui';
    ctx.fillText('Castelo de Kraidus', 402, 32);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '800 10px system-ui';
    ctx.fillText('Aproxima-te do salão central.', 402, 48);
    ctx.restore();
  }

  if (currentQuest.key === 'denzel2_free_roam') {
    ctx.save();
    ctx.fillStyle = 'rgba(2, 6, 23, 0.74)';
    ctx.fillRect(364, 12, 262, 62);
    ctx.fillStyle = '#fde68a';
    ctx.font = '900 12px system-ui';
    if (currentMap.key === 'elranor_peace') {
      ctx.fillText('História: aproxima-te de Lurei', 380, 32);
      ctx.fillStyle = '#e5e7eb';
      ctx.font = '800 10px system-ui';
      ctx.fillText('Ou derrota 3 sombras nos mapas laterais.', 380, 49);
      ctx.fillText('Esquerda/direita mudam de mapa automaticamente.', 380, 64);
      ctx.fillText('B para ver atalhos de bosses.', 380, 78);
    } else if (currentMap.key === 'd2_light_training_ground') {
      const defeated = flags.denzel2FreeRoamDefeated || 0;
      ctx.fillText(`Campo dos Cavaleiros: ${defeated}/3 sombras`, 380, 32);
      ctx.fillStyle = '#e5e7eb';
      ctx.font = '800 10px system-ui';
      ctx.fillText('Derrota 3 para avançar ou volta à cidade.', 380, 49);
      ctx.fillText('Pisa a saída à direita. Não precisas carregar E.', 380, 64);
    } else if (currentMap.key === 'd2_golden_fields') {
      const defeated = flags.denzel2FreeRoamDefeated || 0;
      ctx.fillText(`Campos Dourados: ${defeated}/3 sombras`, 380, 32);
      ctx.fillStyle = '#e5e7eb';
      ctx.font = '800 10px system-ui';
      ctx.fillText('Derrota 3 para avançar ou volta à cidade.', 380, 49);
      ctx.fillText('Pisa a saída à esquerda. Não precisas carregar E.', 380, 64);
    }
    ctx.restore();
  }

}


function drawShadowBattleBackground(type = 'nilzin_shadow') {
  rect(44, 92, 552, 292, 'rgba(5, 0, 12, 0.94)');
  for (let i = 0; i < 9; i++) {
    const x = 55 + i * 63;
    const y = 102 + ((i * 37 + frame) % 230);
    ctx.fillStyle = i % 2 ? 'rgba(76,5,25,0.28)' : 'rgba(88,28,135,0.24)';
    ctx.beginPath();
    ctx.ellipse(x, y, 20 + (i % 3) * 6, 6 + (i % 2) * 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // chamas/sombras laterais
  drawMinorDemon(3, 5, 0.38, 0);
  drawMinorDemon(16, 5, 0.38, 1);
  if (type === 'nilzin_shadow') {
    radialGlow(470, 210, 130, 'rgba(76,5,25,0.28)');
  } else {
    radialGlow(470, 210, 130, 'rgba(124,58,237,0.22)');
  }
}

function drawBattleOverlay() {
  if (!battle?.active) return;

  const enemy = battle.enemy;
  const specialBattle = ['kraidus', 'nilzin_shadow', 'lurei_shadow'].includes(enemy.type);
  ctx.save();

  if (battleShake > 0) {
    const dx = (Math.random() - 0.5) * battleShake * 1.4;
    const dy = (Math.random() - 0.5) * battleShake * 0.9;
    ctx.translate(dx, dy);
  }

  ctx.fillStyle = specialBattle ? 'rgba(0, 0, 0, 0.90)' : 'rgba(2, 6, 23, 0.60)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (['nilzin_shadow', 'lurei_shadow'].includes(enemy.type)) {
    drawShadowBattleBackground(enemy.type);
  } else if (enemy.type === 'kraidus') {
    drawKraidusCastleBackground(false);
    drawMinorDemon(3, 4, 0.62, 0);
    drawMinorDemon(16, 4, 0.62, 1);
    drawMinorDemon(4, 11, 0.50, 0);
    drawMinorDemon(15, 11, 0.50, 1);
  } else {
    rect(24, 42, 592, 300, 'rgba(235, 245, 222, 0.90)');
    ctx.fillStyle = 'rgba(99, 148, 255, 0.10)';
    ctx.beginPath();
    ctx.ellipse(454, 170, 124, 34, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(34, 197, 94, 0.16)';
    ctx.beginPath();
    ctx.ellipse(156, 290, 126, 38, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const enemyName = enemyDisplayName(enemy);
  const enemyBoxColor = specialBattle ? '#f3e8ff' : '#f8fafc';
  rect(46, 52, 248, 76, enemyBoxColor);
  ctx.strokeStyle = specialBattle ? '#a855f7' : '#172033';
  ctx.lineWidth = 3;
  ctx.strokeRect(46, 52, 248, 76);
  ctx.fillStyle = '#111827';
  ctx.font = '900 15px system-ui';
  ctx.fillText(enemyName, 62, 76);
  ctx.font = '900 12px system-ui';
  ctx.fillText(`Nv ${enemy.level || 1}`, 240, 76);
  drawMiniBar(62, 88, 196, 10, enemy.hp, enemy.maxHp, specialBattle ? '#a855f7' : '#ef4444');
  ctx.fillStyle = '#334155';
  ctx.font = '800 11px system-ui';
  ctx.fillText(`HP ${Math.max(0, Math.ceil(enemy.hp))}/${enemy.maxHp}`, 62, 112);
  if (specialBattle) {
    rect(214, 98, 56, 18, 'rgba(88, 28, 135, 0.92)');
    ctx.fillStyle = '#f5d0fe';
    ctx.font = '900 10px system-ui';
    ctx.fillText('BOSS', 229, 111);
  }

  ctx.fillStyle = specialBattle ? '#e9d5ff' : '#334155';
  ctx.font = '900 13px system-ui';
  ctx.fillText(enemyBattleTitle(enemy), 54, 144);

  drawBattleHero(122, 248);
  drawBattleEnemy(enemy, enemy.type === 'kraidus' ? 392 : 436, enemy.type === 'kraidus' ? 150 : 139);
  drawBattleEffects();

  rect(372, 258, 224, 72, '#f8fafc');
  ctx.strokeStyle = '#172033';
  ctx.lineWidth = 3;
  ctx.strokeRect(372, 258, 224, 72);
  ctx.fillStyle = '#111827';
  ctx.font = '900 15px system-ui';
  ctx.fillText('Denzel', 390, 282);
  ctx.font = '900 12px system-ui';
  ctx.fillText(`Nv ${player.stats.level || 1}`, 530, 282);
  drawMiniBar(390, 294, 166, 9, player.stats.hp, player.stats.maxHp, '#ef4444');
  drawMiniBar(390, 311, 166, 7, getStaffEnergy(), maxStaffEnergy(), '#facc15');
  ctx.fillStyle = '#334155';
  ctx.font = '800 11px system-ui';
  ctx.fillText(`HP ${player.stats.hp}/${player.stats.maxHp}`, 478, 292);
  ctx.fillText(`EN ${getStaffEnergy()}/${maxStaffEnergy()}`, 488, 311);

  rect(34, 350, 370, 96, '#fffdf0');
  ctx.strokeStyle = '#172033';
  ctx.lineWidth = 3;
  ctx.strokeRect(34, 350, 370, 96);
  ctx.fillStyle = '#111827';
  ctx.font = '900 14px system-ui';
  wrapText(battleMessage || 'Escolhe uma ação.', 54, 379, 320, 18);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '800 11px system-ui';
  ctx.fillText('Toca diretamente nas opções 1-4 do painel da batalha.', 54, 430);

  rect(420, 350, 186, 96, '#fffdf0');
  ctx.strokeStyle = '#172033';
  ctx.lineWidth = 3;
  ctx.strokeRect(420, 350, 186, 96);
  if (battle.turn === 'player') {
    const opts = [
      { label: '1 ATACAR', x: 432, y: 362, w: 78, h: 24 },
      { label: '2 CAJADO', x: 518, y: 362, w: 78, h: 24 },
      { label: '3 CURAR', x: 432, y: 394, w: 78, h: 24 },
      { label: '4 POÇÃO', x: 518, y: 394, w: 78, h: 24 },
    ];
    opts.forEach((opt, idx) => {
      rect(opt.x, opt.y, opt.w, opt.h, idx === 1 ? '#fff6d6' : '#f8fafc');
      ctx.strokeStyle = idx === 1 ? '#eab308' : '#172033';
      ctx.lineWidth = 2;
      ctx.strokeRect(opt.x, opt.y, opt.w, opt.h);
      ctx.fillStyle = '#111827';
      ctx.font = '900 11px system-ui';
      ctx.fillText(opt.label, opt.x + 10, opt.y + 16);
    });
    ctx.fillStyle = '#64748b';
    ctx.font = '800 9px system-ui';
    ctx.fillText(`Atq ${hitChanceFor('player', 'basic', enemy)}%`, 440, 430);
    ctx.fillText(`Luz ${hitChanceFor('player', 'staff_light', enemy)}%`, 520, 430);
  } else {
    ctx.fillStyle = '#64748b';
    ctx.font = '900 15px system-ui';
    ctx.fillText('Aguarda...', 466, 404);
  }

  ctx.fillStyle = specialBattle ? '#e9d5ff' : '#cbd5e1';
  ctx.font = '800 11px system-ui';
  battleLog.slice(0, 2).forEach((line, index) => {
    ctx.fillText(line.slice(0, 82), 42, 462 + (index * 13));
  });

  ctx.restore();
}

function drawBattleHero(x, y) {
  ctx.save();
  const oldX = player.x;
  const oldY = player.y;
  const oldDirection = player.direction;

  // No combate mobile, Denzel fica um pouco maior e de costas,
  // como se estivesse de frente para o inimigo.
  const battleHeroCfg = window.DENZEL_VISUAL_CONFIG?.battleHero || {};
  ctx.translate(x + (battleHeroCfg.translateX ?? 16), y + (battleHeroCfg.translateY ?? 18));
  ctx.scale(battleHeroCfg.scale ?? 1.35, battleHeroCfg.scale ?? 1.35);
  player.x = -18;
  player.y = -18;
  player.direction = 'up';
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
  const hitScale = enemyHitPulse > 0 ? 1 + (enemyHitPulse / 28) * 0.08 : 1;
  const hitOffsetX = enemyHitPulse > 0 ? Math.sin(frame * 1.8) * 3 : 0;
  const hitOffsetY = enemyHitPulse > 0 ? -Math.min(6, enemyHitPulse * 0.2) : 0;
  x += hitOffsetX;
  y += hitOffsetY;

  if (enemy.type === 'kraidus') {
    ctx.save();
    ctx.translate(x + 16, y + 20);
    ctx.scale(hitScale, hitScale);
    drawKraidusBattleSprite(0, -8, 0.72, 0);
    ctx.restore();
    if (flashAlpha) {
      ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`;
      ctx.fillRect(x - 90, y - 95, 220, 230);
    }
    ctx.restore();
    return;
  }

  if (enemy.type === 'nilzin_shadow') {
    ctx.save();
    ctx.translate(x + 18, y + 52);
    ctx.scale(hitScale, hitScale);
    drawNilzinBattleSprite(0, -12, 0.70);
    ctx.restore();
    if (flashAlpha) {
      ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`;
      ctx.fillRect(x - 55, y - 48, 165, 170);
    }
    ctx.restore();
    return;
  }

  if (enemy.type === 'lurei_shadow') {
    ctx.save();
    ctx.translate(x + 18, y + 56);
    ctx.scale(hitScale, hitScale);
    drawLureiFormAt(isHiddenLureiEnemy(enemy) ? 'guerreiro' : 'dominado', 0, -14, 0.78);
    ctx.restore();
    if (flashAlpha) {
      ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`;
      ctx.fillRect(x - 58, y - 50, 170, 175);
    }
    ctx.restore();
    return;
  }

  if (enemy.type === 'light_target') {
    ctx.translate(x + 18, y + 33);
    ctx.scale(hitScale, hitScale);
    ctx.translate(-(x + 18), -(y + 33));
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
    ctx.translate(x + 18, y + 34);
    ctx.scale(hitScale, hitScale);
    ctx.translate(-(x + 18), -(y + 34));
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

  if (currentMap?.mapData?.theme === 'elranor_ruins') {
    ctx.save();
    ctx.fillStyle = 'rgba(2, 6, 23, 0.36)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(88, 28, 135, 0.12)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < 12; i++) {
      const x = (i * 71 + frame * 0.18) % canvas.width;
      const y = 60 + ((i * 47) % 330);
      ctx.fillStyle = 'rgba(148, 163, 184, 0.09)';
      ctx.beginPath();
      ctx.ellipse(x, y, 46, 8, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    return;
  }

  if (!['dark', 'dark_city'].includes(currentMap?.mapData?.theme)) return;

  ctx.save();
  const isTrainingTrail = currentMap?.key === 'trilho_mirlon';
  const isDarkCity = currentMap?.mapData?.theme === 'dark_city';
  ctx.fillStyle = isTrainingTrail ? 'rgba(2, 6, 23, 0.50)' : (isDarkCity ? 'rgba(2, 6, 23, 0.42)' : 'rgba(2, 6, 23, 0.28)');
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

  ctx.fillStyle = isTrainingTrail ? 'rgba(49, 46, 129, 0.14)' : (isDarkCity ? 'rgba(127, 29, 29, 0.20)' : 'rgba(127, 29, 29, 0.10)');
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
}

function drawHud() {
  rect(12, 12, 300, 34, 'rgba(15, 23, 42, 0.62)');
  rect(17, 18, 8, 8, '#facc15');
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px system-ui';
  ctx.fillText(currentQuest.title, 32, 29);
  ctx.fillStyle = '#cbd5e1';
  ctx.font = '11px system-ui';
  ctx.fillText(`${currentMap.name}`, 32, 42);

  const s = player.stats;
  const x = 12;
  const y = 52;
  rect(x, y, 214, 58, 'rgba(15, 23, 42, 0.56)');
  ctx.fillStyle = '#fde68a';
  ctx.font = 'bold 12px system-ui';
  ctx.fillText(`Denzel Nv ${s.level}`, x + 10, y + 15);

  drawMiniBar(x + 10, y + 22, 82, 7, s.hp / s.maxHp, '#ef4444');
  drawMiniBar(x + 102, y + 22, 82, 7, s.xp / s.xpToNext, '#facc15');

  ctx.fillStyle = '#e2e8f0';
  ctx.font = '10px system-ui';
  ctx.fillText(`HP ${s.hp}/${s.maxHp}`, x + 10, y + 40);
  ctx.fillText(`XP ${s.xp}/${s.xpToNext}`, x + 102, y + 40);
  ctx.fillStyle = '#fde68a';
  ctx.fillText(`O ${player.gold} · P ${player.inventory.potion || 0} · EN ${getStaffEnergy()}/${maxStaffEnergy()}`, x + 10, y + 54);
}

function drawMiniBar(x, y, w, h, valueOrRatio, maxOrColor, colorMaybe) {
  let ratio;
  let color;
  if (typeof colorMaybe === 'undefined') {
    ratio = Number(valueOrRatio) || 0;
    color = maxOrColor;
  } else {
    const value = Number(valueOrRatio) || 0;
    const max = Number(maxOrColor) || 1;
    ratio = max > 0 ? (value / max) : 0;
    color = colorMaybe;
  }
  ratio = Math.max(0, Math.min(1, ratio));
  rect(x, y, w, h, 'rgba(2, 6, 23, 0.9)');
  rect(x, y, Math.max(0, Math.min(w, w * ratio)), h, color || '#ef4444');
}


function triggerVirtualKey(key, code = '') {
  const down = new KeyboardEvent('keydown', { key, code, bubbles: true, cancelable: true });
  document.dispatchEvent(down);
  window.setTimeout(() => {
    const up = new KeyboardEvent('keyup', { key, code, bubbles: true, cancelable: true });
    document.dispatchEvent(up);
  }, 60);
}

function bindHoldButton(button, key) {
  const press = (event) => {
    event.preventDefault();
    keys[key] = true;
    player.direction = getInputDirectionFromKey(key)?.dir || player.direction;
    button.classList.add('is-pressed');
  };
  const release = (event) => {
    event.preventDefault();
    keys[key] = false;
    button.classList.remove('is-pressed');
  };
  button.addEventListener('touchstart', press, { passive: false });
  button.addEventListener('touchend', release, { passive: false });
  button.addEventListener('touchcancel', release, { passive: false });
  button.addEventListener('mousedown', press);
  button.addEventListener('mouseup', release);
  button.addEventListener('mouseleave', release);
}

function setupTouchControls() {
  const controls = document.getElementById('mobileControls');
  if (!controls) return;

  controls.querySelectorAll('[data-hold-key]').forEach(button => {
    bindHoldButton(button, button.dataset.holdKey);
  });

  controls.querySelectorAll('[data-tap-key]').forEach(button => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      const key = button.dataset.tapKey;
      triggerVirtualKey(key, key === ' ' ? 'Space' : '');
    });
  });

  const actionMain = controls.querySelector('[data-main-action]');
  if (actionMain) {
    actionMain.addEventListener('click', (event) => {
      event.preventDefault();
      if (isDialogOpen() || isCutsceneOpen() || quickEvent?.active || kraidusEvent?.active || lureiEvent?.active) {
        triggerVirtualKey(' ', 'Space');
      } else {
        triggerVirtualKey('e', 'KeyE');
      }
    });
  }
}


function battleCanvasActionAt(x, y) {
  if (!battle?.active || battle.turn !== 'player') return false;

  const opts = [
    { key: '1', x: 432, y: 362, w: 78, h: 24 },
    { key: '2', x: 518, y: 362, w: 78, h: 24 },
    { key: '3', x: 432, y: 394, w: 78, h: 24 },
    { key: '4', x: 518, y: 394, w: 78, h: 24 },
  ];

  const hit = opts.find(opt => x >= opt.x && x <= opt.x + opt.w && y >= opt.y && y <= opt.y + opt.h);
  if (!hit) return false;

  if (hit.key === '1') playerBasicAttack();
  else if (hit.key === '2') playerStaffLight();
  else if (hit.key === '3') playerRecover();
  else if (hit.key === '4') playerUsePotion();
  return true;
}

function setupBattleCanvasTouch() {
  const canvasEl = document.getElementById('gameCanvas');
  if (!canvasEl) return;

  canvasEl.addEventListener('pointerup', (event) => {
    if (!battle?.active) return;
    const rect = canvasEl.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;

    if (battleCanvasActionAt(x, y)) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, { passive: false });
}

function setupStageTapActions() {
  const stage = document.querySelector('.stage');
  if (!stage) return;

  stage.addEventListener('pointerup', (event) => {
    if (event.target.closest('button')) return;

    if (isDialogOpen() || isCutsceneOpen() || quickEvent?.active || kraidusEvent?.active || lureiEvent?.active) {
      event.preventDefault();
      triggerVirtualKey(' ', 'Space');
    }
  }, { passive: false });

  dialog.addEventListener('pointerup', (event) => {
    event.preventDefault();
    triggerVirtualKey(' ', 'Space');
  }, { passive: false });
}

setupTouchControls();
setupBattleCanvasTouch();
setupStageTapActions();

loadGame().catch(error => {
  questTitle.textContent = 'Erro ao carregar';
  questObjective.textContent = error.message;
  console.error(error);
});
