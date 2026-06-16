// Visual dos personagens aprovado no preview do mapa.
// Este ficheiro não altera a lógica do jogo: apenas substitui o desenho dos personagens.
(function () {
  const originalVisuals = {
    drawCharacter,
    drawDenzelCinematic,
    drawLureiNormalAt,
    drawHoodedShadowWarriorAt,
    drawLureiShadowAt,
    drawFallenLureiShadowAt,
    drawNilzinShadowAt,
    drawNilzinBattleSprite,
    drawLureiBattleSprite,
    drawKraidusMiniAt,
    drawKraidusMapSymbol,
    drawKraidusBattleSprite,
  };

  function vQuestOrder(key) {
    return DATA?.quests?.[key]?.order || 999999;
  }

  function vIsDenzelCrowned() {
    return Boolean(currentQuest?.order >= vQuestOrder('declared_son_owner') || flags?.denzel_declared_son_owner || flags?.denzel_wings_unlocked);
  }

  function vIsNilzinShadowMoment() {
    const key = currentQuest?.key || '';
    return Boolean(
      key.startsWith('d2_') ||
      flags?.d2_nilzin_first_defeated ||
      flags?.nilzin_transformation_done ||
      flags?.d2_nilzin_final_defeated
    );
  }

  // Visualmente, quando alguém anda para a esquerda/direita continua virado para a frente.
  // Mantemos apenas o "up" para momentos em que o jogo precisa mesmo de mostrar costas.
  function vFrontWhenSide(direction = 'down') {
    return direction === 'left' || direction === 'right' ? 'down' : direction;
  }

  function vShadow(x, y, rx = 9, ry = 3) {
    ellipse(x, y, rx, ry, 'rgba(0,0,0,0.30)');
  }

  function vHalo(x, y, rx = 12, ry = 4, color = 'rgba(250,204,21,0.78)') {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, -0.15, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function vDenzelMark(x, y, scale = 1) {
    ctx.save();
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 1.5 * scale;
    ctx.beginPath();
    ctx.moveTo(x - 6 * scale, y);
    ctx.lineTo(x + 6 * scale, y);
    ctx.stroke();
    rect(x - 1.5 * scale, y - 4 * scale, 3 * scale, 7 * scale, '#facc15');
    rect(x - 4 * scale, y - 1.5 * scale, 8 * scale, 2 * scale, '#fde68a');
    ctx.restore();
  }

  function vDrawSlimBody(x, y, cfg = {}) {
    const direction = cfg.direction || 'down';
    const skin = cfg.skin || '#7c4a32';
    const hair = cfg.hair || '#111827';
    const body = cfg.body || '#2563eb';
    const accent = cfg.accent || '#dbeafe';
    const pants = cfg.pants || '#111827';
    const eyes = cfg.eyes || '#111827';
    const mouth = cfg.mouth || '#3f1f14';
    const cloak = cfg.cloak || null;
    const bob = cfg.bob || 0;
    const step = cfg.step || 0;
    const child = Boolean(cfg.child);
    const headW = child ? 12 : 13;
    const bodyW = child ? 13 : 15;
    const yShift = child ? 4 : 0;
    const bY = y + yShift + bob;

    vShadow(x + 16, y + 30, child ? 8 : 9, 3);

    if (cloak) {
      polygon([
        [x + 7, bY + 13], [x + 25, bY + 13],
        [x + 28, bY + 29], [x + 4, bY + 29],
      ], cloak);
    }

    rect(x + 10, bY + 23 + step, 4, child ? 5 : 7, pants);
    rect(x + 18, bY + 23 - step, 4, child ? 5 : 7, pants);
    rect(x + 9, bY + 29 + step, 5, 2, '#020617');
    rect(x + 18, bY + 29 - step, 5, 2, '#020617');

    polygon([
      [x + 16 - bodyW / 2, bY + 13], [x + 16 + bodyW / 2, bY + 13],
      [x + 16 + bodyW / 2 + 2, bY + 24], [x + 20, bY + 29],
      [x + 12, bY + 29], [x + 16 - bodyW / 2 - 2, bY + 24],
    ], body);
    rect(x + 16 - bodyW / 2, bY + 13, bodyW, 3, accent);
    rect(x + 14.5, bY + 16, 3, 12, accent);

    if (direction === 'left') {
      rect(x + 6, bY + 16, 3, 9, skin);
      rect(x + 23, bY + 17, 3, 8, skin);
    } else if (direction === 'right') {
      rect(x + 6, bY + 17, 3, 8, skin);
      rect(x + 23, bY + 16, 3, 9, skin);
    } else {
      rect(x + 6, bY + 16 - step, 3, 9, skin);
      rect(x + 23, bY + 16 + step, 3, 9, skin);
    }

    rect(x + 14, bY + 12, 4, 3, skin);
    rect(x + 16 - headW / 2, bY + 5, headW, 12, skin);

    if (direction === 'up') {
      rect(x + 16 - headW / 2 - 1, bY + 2, headW + 2, 7, hair);
      rect(x + 16 - headW / 2 - 1, bY + 9, headW + 2, 4, hair);
      rect(x + 16 - headW / 2 - 1, bY + 8, 3, 7, hair);
      rect(x + 16 + headW / 2 - 2, bY + 8, 3, 7, hair);
    } else if (direction === 'left') {
      rect(x + 16 - headW / 2 - 1, bY + 2, headW + 2, 6, hair);
      rect(x + 16 - headW / 2 - 2, bY + 8, 5, 8, hair);
      rect(x + 11, bY + 11, 2, 2, eyes);
      rect(x + 11, bY + 15, 5, 1, mouth);
    } else if (direction === 'right') {
      rect(x + 16 - headW / 2 - 1, bY + 2, headW + 2, 6, hair);
      rect(x + 16 + headW / 2 - 3, bY + 8, 5, 8, hair);
      rect(x + 19, bY + 11, 2, 2, eyes);
      rect(x + 16, bY + 15, 5, 1, mouth);
    } else {
      rect(x + 16 - headW / 2 - 1, bY + 2, headW + 2, 6, hair);
      rect(x + 16 - headW / 2 - 2, bY + 8, 3, 7, hair);
      rect(x + 16 + headW / 2 - 1, bY + 8, 3, 7, hair);
      rect(x + 12, bY + 11, 2, 2, eyes);
      rect(x + 19, bY + 11, 2, 2, eyes);
      rect(x + 13, bY + 15, 6, 1, mouth);
    }
  }

  function vDrawStaff(x, y, direction = 'down', bob = 0, color = '#8b5e34') {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();

    if (direction === 'left') {
      ctx.moveTo(x + 4, y + 7 + bob);
      ctx.lineTo(x + 4, y + 31 + bob);
      ctx.stroke();
      radialGlow(x + 4, y + 7 + bob, 11, 'rgba(250,204,21,0.28)');
      rect(x + 1, y + 3 + bob, 6, 4, '#facc15');
    } else if (direction === 'up') {
      // De costas o cajado continua visível na mão do Denzel.
      ctx.moveTo(x + 27, y + 8 + bob);
      ctx.lineTo(x + 27, y + 32 + bob);
      ctx.stroke();
      radialGlow(x + 27, y + 8 + bob, 11, 'rgba(250,204,21,0.28)');
      rect(x + 24, y + 4 + bob, 6, 4, '#facc15');
    } else {
      ctx.moveTo(x + 28, y + 7 + bob);
      ctx.lineTo(x + 28, y + 31 + bob);
      ctx.stroke();
      radialGlow(x + 28, y + 7 + bob, 11, 'rgba(250,204,21,0.28)');
      rect(x + 25, y + 3 + bob, 6, 4, '#facc15');
    }
    ctx.restore();
  }

  function vDrawDenzelMap(x, y, options = {}) {
    const direction = options.direction || 'down';
    const hasWings = Boolean(options.wings);
    const mark = Boolean(options.mark);
    const hasStaff = Boolean(options.hasStaff);
    const moving = Boolean(options.moving);
    const flightLift = hasWings ? Math.sin(frame / 9) * 2.5 - 6 : 0;
    const baseY = y + flightLift;
    const step = moving && !hasWings ? (Math.sin(frame / 4) >= 0 ? 1 : -1) : 0;
    const bob = moving ? Math.sin(frame / 5) * (hasWings ? 0.8 : 1.2) : 0;
    const crowned = mark || hasWings;
    const body = crowned ? '#f8fafc' : (options.body || '#2563eb');
    const accent = crowned ? '#facc15' : (options.accent || '#dbeafe');

    if (hasWings && direction !== 'up') drawDenzelMapWings(x, baseY, bob, direction);
    if (hasWings) vHalo(x + 16, baseY + 1 + bob, 13, 4);

    vDrawSlimBody(x, baseY, {
      direction,
      bob,
      step,
      skin: options.skin || '#7c4a32',
      hair: options.hair || '#111827',
      body,
      accent,
      pants: '#111827',
      eyes: '#111827',
      mouth: '#3f1f14',
    });

    if (hasWings && direction === 'up') drawDenzelMapWings(x, baseY, bob, direction);
    if (hasStaff) vDrawStaff(x, baseY, direction, bob);
    if (crowned) vDenzelMark(x + 16, baseY + 2 + bob, 0.72);
  }

  function vDrawLureiMapAt(x, y, scale = 1, form = 'normal', direction = 'down') {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    const dominated = form === 'dominado';
    const warrior = form === 'guerreiro' || dominated;
    const fallen = form === 'caido_sombra' || form === 'caido';
    const purified = form === 'purificado';

    if (fallen) {
      radialGlow(16, 22, 25, 'rgba(126,34,206,0.22)');
      ellipse(16, 29, 15, 4, 'rgba(0,0,0,0.42)');
      rect(5, 22, 22, 5, '#050505');
      rect(8, 18, 9, 5, '#111827');
      rect(18, 18, 7, 4, '#3b0764');
      rect(4, 20, 7, 2, '#7c4a32');
      rect(24, 20, 7, 2, '#7c4a32');
      ctx.restore();
      return;
    }

    if (warrior) {
      radialGlow(16, 17, dominated ? 32 : 26, dominated ? 'rgba(239,68,68,0.18)' : 'rgba(126,34,206,0.18)');
      if (dominated) {
        polygon([[12,17],[-8,2],[-2,21],[-12,31],[7,28]], '#050505');
        polygon([[20,17],[40,2],[34,21],[44,31],[25,28]], '#050505');
        strokePolygon([[12,17],[-8,2],[-2,21],[-12,31],[7,28]], '#7f1d1d', 1.2);
        strokePolygon([[20,17],[40,2],[34,21],[44,31],[25,28]], '#7f1d1d', 1.2);
      }
      vDrawSlimBody(0, 0, {
        direction,
        skin: '#7c4a32',
        hair: '#050505',
        body: dominated ? '#050505' : '#0f172a',
        accent: dominated ? '#991b1b' : '#6d28d9',
        pants: '#050505',
        cloak: '#020617',
        eyes: dominated ? '#ef4444' : '#c084fc',
        mouth: dominated ? '#ef4444' : '#e9d5ff',
      });
      // lança negra, não cajado
      ctx.strokeStyle = dominated ? '#7f1d1d' : '#1e1b4b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      if (direction === 'left') {
        ctx.moveTo(5, 5); ctx.lineTo(24, 31); ctx.stroke();
        polygon([[5,4],[-2,-3],[1,8]], dominated ? '#ef4444' : '#7e22ce');
      } else if (direction !== 'up') {
        ctx.moveTo(27, 5); ctx.lineTo(8, 31); ctx.stroke();
        polygon([[27,4],[34,-3],[31,8]], dominated ? '#ef4444' : '#7e22ce');
      }
      if (dominated) {
        polygon([[11,2],[4,-5],[8,5]], '#050505');
        polygon([[21,2],[28,-5],[24,5]], '#050505');
      }
      ctx.restore();
      return;
    }

    vDrawSlimBody(0, 0, {
      direction,
      skin: '#7c4a32',
      hair: '#050505',
      body: '#0b1120',
      accent: purified ? '#facc15' : '#334155',
      pants: '#050505',
      cloak: purified ? 'rgba(250,204,21,0.18)' : 'rgba(0,0,0,0.22)',
      eyes: '#111827',
      mouth: '#3f1f14',
    });
    if (purified) vHalo(16, 2, 10, 3, 'rgba(250,204,21,0.55)');
    ctx.restore();
  }

  function vDrawNilzinMapAt(x, y, scale = 1, shadow = false, queen = false, direction = 'down') {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    if (shadow) {
      radialGlow(16, 17, queen ? 42 : 32, queen ? 'rgba(2,0,8,0.42)' : 'rgba(2,0,8,0.34)');
      radialGlow(16, 17, queen ? 30 : 23, queen ? 'rgba(76,5,25,0.24)' : 'rgba(126,34,206,0.20)');
      ctx.save();
      ctx.strokeStyle = queen ? 'rgba(2,0,8,0.72)' : 'rgba(76,5,25,0.56)';
      ctx.lineWidth = queen ? 2 : 1.5;
      ctx.beginPath();
      ctx.ellipse(16, 17, queen ? 23 : 18, queen ? 30 : 24, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ellipse(16, 30, 10, 3, 'rgba(0,0,0,0.32)');
    const body = shadow ? '#050505' : '#111827';
    const accent = shadow ? '#3b0764' : '#334155';
    polygon([[10,13],[22,13],[26,30],[6,30]], body);
    rect(10, 13, 12, 3, accent);
    rect(15, 16, 2, 13, shadow ? '#7e22ce' : '#475569');
    rect(6, 17, 3, 10, '#f1d0b5');
    rect(23, 17, 3, 10, '#f1d0b5');
    rect(12, 5, 8, 11, '#f1d0b5');

    if (direction === 'up') {
      rect(10, 2, 12, 7, shadow ? '#0f172a' : '#111827');
      rect(8, 7, 5, 16, shadow ? '#111827' : '#1f2937');
      rect(19, 7, 5, 16, shadow ? '#111827' : '#1f2937');
    } else if (direction === 'left') {
      rect(9, 2, 13, 6, shadow ? '#0f172a' : '#111827');
      rect(8, 7, 5, 16, shadow ? '#111827' : '#1f2937');
      rect(13, 11, 2, 2, shadow ? '#a855f7' : '#111827');
    } else if (direction === 'right') {
      rect(10, 2, 13, 6, shadow ? '#0f172a' : '#111827');
      rect(19, 7, 5, 16, shadow ? '#111827' : '#1f2937');
      rect(18, 11, 2, 2, shadow ? '#a855f7' : '#111827');
    } else {
      rect(10, 2, 12, 6, shadow ? '#0f172a' : '#111827');
      rect(8, 7, 5, 16, shadow ? '#111827' : '#1f2937');
      rect(19, 7, 5, 16, shadow ? '#111827' : '#1f2937');
      rect(12, 11, 2, 2, shadow ? '#a855f7' : '#111827');
      rect(18, 11, 2, 2, shadow ? '#a855f7' : '#111827');
      rect(13, 16, 6, 1, shadow ? '#581c87' : '#7f1d1d');
    }
    if (queen) {
      polygon([[7,14],[-2,4],[11,16]], '#020617');
      polygon([[25,14],[34,4],[21,16]], '#020617');
    }
    ctx.restore();
  }

  function vDrawKraidusSmallAt(x, y, scale = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    const bob = Math.sin(frame / 10) * 1.5;
    radialGlow(16, 14, 35, 'rgba(127,29,29,0.26)');
    polygon([[9,16],[-14,2],[-8,22],[-18,32],[7,27]], '#020617');
    polygon([[23,16],[46,2],[40,22],[50,32],[25,27]], '#020617');
    strokePolygon([[9,16],[-14,2],[-8,22],[-18,32],[7,27]], '#7f1d1d', 1.4);
    strokePolygon([[23,16],[46,2],[40,22],[50,32],[25,27]], '#7f1d1d', 1.4);
    polygon([[7,12 + bob],[25,12 + bob],[29,30 + bob],[21,41 + bob],[11,41 + bob],[3,30 + bob]], '#111827');
    rect(8, 16 + bob, 16, 4, '#7f1d1d');
    rect(14, 20 + bob, 4, 18, '#991b1b');
    rect(4, 20 + bob, 4, 15, '#111827');
    rect(24, 20 + bob, 4, 15, '#111827');
    rect(9, -1 + bob, 14, 13, '#1f2937');
    rect(7, -5 + bob, 18, 5, '#020617');
    polygon([[9,-5 + bob],[-7,-15 + bob],[0,3 + bob]], '#020617');
    polygon([[23,-5 + bob],[39,-15 + bob],[32,3 + bob]], '#020617');
    rect(12, 5 + bob, 2, 2, '#ef4444');
    rect(19, 5 + bob, 2, 2, '#ef4444');
    rect(12, 11 + bob, 8, 1.5, '#ef4444');
    ctx.restore();
  }

  drawCharacter = function (entity, isPlayer = false) {
    if (!entity) return;
    const style = entity.spriteKey || (isPlayer ? 'hero' : 'villager');
    const colors = entity.colors || {};
    const rawDirection = entity.direction || 'down';
    const direction = vFrontWhenSide(rawDirection);

    if (isPlayer || style === 'hero') {
      vDrawDenzelMap(entity.x, entity.y, {
        direction,
        moving: entity.moving,
        wings: Boolean(flags?.denzel_wings_unlocked),
        mark: vIsDenzelCrowned(),
        hasStaff: typeof hasPlayerStaff === 'function' ? hasPlayerStaff() : true,
        body: colors.body,
        accent: colors.accent,
        skin: colors.skin,
        hair: colors.hair,
      });
      return;
    }

    if (entity.characterKey === 'divan') {
      vDrawSlimBody(entity.x, entity.y, {
        direction,
        bob: entity.moving ? Math.sin(frame / 5) * 1.1 : 0,
        step: entity.moving ? (Math.sin(frame / 4) >= 0 ? 1 : -1) : 0,
        skin: colors.skin || '#7c4a32',
        hair: colors.hair || '#111827',
        body: '#1e3a8a',
        accent: '#93c5fd',
        pants: '#111827',
      });
      vDenzelMark(entity.x + 16, entity.y + 2, 0.55);
      return;
    }

    if (style === 'lurei_light_knight') {
      vDrawLureiMapAt(entity.x, entity.y, 1, 'normal', direction);
      return;
    }

    if (style === 'lurei_shadow') {
      vDrawLureiMapAt(entity.x, entity.y, 1, flags?.lurei_identity_revealed ? 'dominado' : 'guerreiro', direction);
      return;
    }

    if (style === 'nilzin') {
      vDrawNilzinMapAt(entity.x, entity.y, 1, vIsNilzinShadowMoment(), false, direction);
      return;
    }

    if (style === 'sage') {
      vDrawSlimBody(entity.x, entity.y, {
        direction,
        bob: entity.moving ? Math.sin(frame / 5) * 1.1 : 0,
        step: entity.moving ? (Math.sin(frame / 4) >= 0 ? 1 : -1) : 0,
        skin: '#f8fafc',
        hair: '#e5e7eb',
        body: '#f8fafc',
        accent: '#facc15',
        pants: '#475569',
        cloak: 'rgba(250,204,21,0.14)',
      });
      vDrawStaff(entity.x, entity.y, direction, 0, '#8b5e34');
      return;
    }

    if (style === 'kraidus') {
      vDrawKraidusSmallAt(entity.x - 6, entity.y - 10, 0.86);
      return;
    }

    originalVisuals.drawCharacter(entity, isPlayer);
  };

  drawDenzelCinematic = function (x, y, withWings = false, glowing = false, frameOffset = 0, scale = 0.86, sceneKey = '', direction = 'down') {
    ctx.save();
    const visualDirection = vFrontWhenSide(direction);
    const lift = withWings ? Math.sin((frame + frameOffset) / 9) * 6 - 10 : 0;

    // O desenho novo é baseado no tamanho do mapa, por isso nas cutscenes precisa de subir de escala.
    const visualScale = scale * 3.15;
    if (glowing) radialGlow(x + 16 * visualScale, y + 15 * visualScale + lift, 92 * Math.max(0.85, scale), 'rgba(250,204,21,0.26)');

    ctx.translate(x, y + lift);
    ctx.scale(visualScale, visualScale);

    if (withWings && visualDirection !== 'up') {
      drawDenzelMapWings(0, 0, 0, visualDirection);
    }
    if (withWings) vHalo(16, 1, 13, 4);

    vDrawSlimBody(0, 0, {
      direction: visualDirection,
      skin: '#7c4a32',
      hair: '#111827',
      body: '#f8fafc',
      accent: '#facc15',
      pants: '#111827',
    });

    if (withWings && visualDirection === 'up') {
      drawDenzelMapWings(0, 0, 0, visualDirection);
    }

    if (typeof hasPlayerStaff !== 'function' || hasPlayerStaff()) {
      vDrawStaff(0, 0, visualDirection, 0);
    }

    vDenzelMark(16, 2, 0.72);
    if (withWings || glowing) {
      ctx.strokeStyle = 'rgba(250,204,21,0.62)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(16, 15, 22 + Math.sin(frame / 8) * 2, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  };

  drawLureiNormalAt = function (cx, cy, scale = 1) {
    vDrawLureiMapAt(cx, cy, scale, 'normal', 'down');
  };

  drawHoodedShadowWarriorAt = function (x, y, scale = 1) {
    vDrawLureiMapAt(x, y, scale, 'guerreiro', 'down');
  };

  drawLureiShadowAt = function (x, y, scale = 1) {
    vDrawLureiMapAt(x, y, scale, 'dominado', 'down');
  };

  drawFallenLureiShadowAt = function (x, y, scale = 1) {
    vDrawLureiMapAt(x, y, scale, 'caido_sombra', 'down');
  };

  drawNilzinShadowAt = function (x, y, scale = 1) {
    vDrawNilzinMapAt(x, y, scale, true, false, 'down');
  };

  drawNilzinBattleSprite = function (cx, cy, scale = 1) {
    ctx.save();
    radialGlow(cx, cy + 20 * scale, 95 * scale, 'rgba(2,0,8,0.35)');
    for (let i = 0; i < 4; i++) {
      ctx.strokeStyle = `rgba(76,5,25,${0.22 + i * 0.10})`;
      ctx.lineWidth = 2 * scale;
      ctx.beginPath();
      ctx.arc(cx, cy + 22 * scale, (36 + i * 12 + Math.sin(frame / 10 + i) * 4) * scale, 0, Math.PI * 2);
      ctx.stroke();
    }
    vDrawNilzinMapAt(cx - 16 * scale, cy - 14 * scale, 1.70 * scale, true, true, 'down');
    ctx.restore();
  };

  drawLureiBattleSprite = function (cx, cy, scale = 1) {
    ctx.save();
    radialGlow(cx, cy + 20 * scale, 105 * scale, 'rgba(2,6,23,0.38)');
    vDrawLureiMapAt(cx - 18 * scale, cy - 18 * scale, 2.15 * scale, 'dominado', 'down');
    ctx.restore();
  };

  drawKraidusMiniAt = function (x, y, scale = 1) {
    vDrawKraidusSmallAt(x, y, scale);
  };

  drawKraidusMapSymbol = function (object) {
    const x = object.x * 32;
    const y = object.y * 32;
    ctx.save();
    vDrawKraidusSmallAt(x - 18, y - 30, 0.9);
    ctx.fillStyle = '#fecaca';
    ctx.font = '900 8px system-ui';
    ctx.fillText('KRAIDUS', x - 8, y - 36);
    ctx.restore();
  };

  drawKraidusBattleSprite = function (cx, cy, scale = 1, frameOffset = 0) {
    // O Kraidus no battle passa a usar o mesmo desenho/base do mapa.
    // Só aumentamos a escala para manter presença de boss.
    const bossScale = 4.1 * scale;
    ctx.save();
    const bob = Math.sin((frame + frameOffset) / 12) * 1.5;
    ctx.translate(cx - 16 * bossScale, cy - 10 * bossScale + bob);
    vDrawKraidusSmallAt(0, 0, bossScale);
    ctx.restore();
  };
})();
