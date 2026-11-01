import { distance, moveBody, circleRect } from "./math.js";
import { createRoom, W, H } from "./rooms.js";
import { AudioSystem } from "./audio.js";
import { Navigation } from "./navigation.js";
import {
  weapons,
  makeVolley,
  weaponStats,
  unlockWeapon,
  switchWeapon,
} from "./weapons.js";
import { upgradeChoices, applyUpgrade, upgrades } from "./upgrades.js";
import { enemyTypes, makeEnemy, difficulty, updateEnemies } from "./enemies.js";
import { Combat } from "./combat.js";
import { profiles, readQuality, storeQuality } from "./quality.js";
import { ParticlePool } from "./particles.js";
import {
  freshSeed,
  seeded,
  generateDungeon,
  nodeById,
  discover,
  canTravel,
} from "./dungeon.js";
import { biomes, roomHazards, updateEnvironment } from "./biomes.js";
import { makeBoss, updateBoss, restoreArena } from "./bosses.js";
import { grantScrap, createShop, buy } from "./economy.js";
import { mapHTML, shopHTML, endingHTML } from "./ui.js";
export class Game {
  constructor(canvas, renderer) {
    this.canvas = canvas;
    this.renderer = renderer;
    this.quality = profiles[readQuality()];
    this.particlePool = new ParticlePool();
    this.showFPS = false;
    this.audio = new AudioSystem();
    this.keys = new Set();
    this.pointer = { x: 0, y: 0, down: false };
    this.state = "menu";
    this.time = 0;
    this.biomeIndex = 0;
    this.hazards = [];
    this.roomTime = 0;
    this.boss = null;
    this.arenaBaseWalls = null;
    this.stats = this.makeStats();
    this.scrap = 0;
    this.resetEffects();
    this.bullets = [];
    this.enemies = [];
    this.player = this.makePlayer();
    this.room = createRoom(1);
    this.navigation = new Navigation(this.room.walls);
    this.combat = new Combat(this);
    this.overlay = document.querySelector("#overlay");
    this.hud = document.querySelector("#hud");
    this.bind();
    this.menu();
  }
  setQuality(id) {
    if (!profiles[id]) return false;
    this.quality = profiles[id];
    storeQuality(id);
    this.renderer.setQuality?.(id);
    while (this.particles.length > this.quality.maxParticles)
      this.particlePool.release(this.particles.pop());
    return true;
  }
  openSettings() {
    this.settingsReturn = this.state === "menu" ? "menu" : "paused";
    this.state = "settings";
    this.pointer.down = false;
    this.keys.clear();
    this.renderSettings();
  }
  renderSettings() {
    this.overlay.innerHTML = `<section class="panel"><div class="eyebrow">SİSTEM AYARLARI</div><h2>Görüntü kalitesi</h2><p class="description">Daha hafif efektler veya daha yoğun ışıklandırma. Savaş uyarıları her profilde korunur.</p><div class="cards">${Object.values(
      profiles,
    )
      .map(
        (q) =>
          `<button class="card quality-option ${q.id === this.quality.id ? "selected" : ""}" data-quality="${q.id}"><i>${q.id === this.quality.id ? "AKTİF PROFİL" : "GRAFİK PROFİLİ"}</i><b>${q.id}</b><span>${q.id === "LOW" ? "Daha az parçacık; sade ışık ve gölgeler." : q.id === "MEDIUM" ? "Dengeli çözünürlük, ışık ve parçacıklar." : "Tam çözünürlük ve ayrıntılı efektler."}</span></button>`,
      )
      .join(
        "",
      )}</div><p class="description">F3: Performans göstergesi · F4: GPU teşhisi.</p><button class="primary" id="settings-back">GERİ DÖN</button></section>`;
    this.overlay.querySelectorAll("[data-quality]").forEach(
      (b) =>
        (b.onclick = () => {
          if (this.state !== "settings") return;
          this.setQuality(b.dataset.quality);
          this.renderSettings();
        }),
    );
    document.querySelector("#settings-back").onclick = () => {
      if (this.settingsReturn === "menu") this.menu();
      else {
        this.state = "playing";
        this.pause();
      }
    };
  }
  makePlayer() {
    return {
      x: 640,
      y: 400,
      r: 17,
      hp: 100,
      maxHp: 100,
      speed: 245,
      damage: 24,
      fireDelay: 0.17,
      fire: 0,
      dashDelay: 1.6,
      dashCd: 0,
      dash: 0,
      inv: 0,
      angle: 0,
      dx: 0,
      dy: 0,
      weapon: "pulse",
      inventory: ["pulse"],
      upgrades: {},
      critChance: 0.05,
      critMult: 1.75,
      projectileSpeed: 1,
      range: 1,
      pierce: 0,
      chain: 0,
      chainPower: 0.55,
      chainRange: 180,
      blastRadius: 1,
      armor: 0,
      leech: 0,
      burn: 0,
      slow: 0,
      dashPower: 0,
      dashBoost: 0,
      dashShield: 0,
      dashNova: 0,
      echoBlast: false,
      bounces: 0,
      execution: 0,
      overclock: false,
      tempBoost: 0,
    };
  }
  makeStats() {
    return {
      roomsCleared: 0,
      bosses: 0,
      damage: 0,
      weaponsUsed: new Set(),
      scrapEarned: 0,
      scrapSpent: 0,
    };
  }
  upgradeById(id) {
    return upgrades.find((u) => u.id === id);
  }
  resetEffects() {
    this.shake = 0;
    this.flash = 0;
    this.hitStop = 0;
    if (this.particles) this.particlePool.clear(this.particles);
    else this.particles = [];
    this.effects = [];
    this.numbers = [];
    this.delayed = [];
    this.notice = "";
    this.noticeTime = 0;
  }
  bind() {
    window.addEventListener("keydown", (e) => {
      if (e.target?.closest?.('input,textarea,[contenteditable="true"]'))
        return;
      if (
        this.state === "playing" &&
        ["Space", "ArrowUp", "ArrowDown", "Tab"].includes(e.code)
      )
        e.preventDefault();
      if (e.repeat) return;
      if (e.code === "F3") {
        e.preventDefault();
        this.showFPS = !this.showFPS;
        return;
      }
      this.keys.add(e.code);
      if (
        e.code === "Tab" &&
        ["playing", "map", "paused"].includes(this.state)
      ) {
        e.preventDefault();
        if (this.state === "map") this.closeMap();
        else this.showMap(false);
        return;
      }
      if (e.code === "Escape") {
        if (this.state === "map") this.closeMap();
        else this.pause();
      }
      if (e.code === "KeyM") this.audio.muted = !this.audio.muted;
      if (this.state === "playing") {
        if (e.code === "Space") this.dash();
        if (e.code === "KeyQ") switchWeapon(this.player);
        if (e.code.startsWith("Digit")) {
          const id = this.player.inventory[Number(e.code.slice(5)) - 1];
          if (id) this.player.weapon = id;
        }
      }
    });
    window.addEventListener("keyup", (e) => this.keys.delete(e.code));
    this.canvas.addEventListener("pointermove", (e) => {
      this.pointer.x = e.clientX;
      this.pointer.y = e.clientY;
    });
    this.canvas.addEventListener("pointerdown", (e) => {
      if (e.button === 0) {
        this.pointer.down = true;
        this.audio.unlock();
      }
    });
    window.addEventListener("pointerup", () => (this.pointer.down = false));
    window.addEventListener("blur", () => {
      this.keys.clear();
      this.pointer.down = false;
      if (this.state === "map") this.mapReturnState = "paused";
      if (this.state === "playing") this.pause();
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && this.state === "map")
        this.mapReturnState = "paused";
      if (document.hidden && this.state === "playing") this.pause();
    });
  }
  menu() {
    this.state = "menu";
    this.overlay.innerHTML = `<section class="panel"><div class="eyebrow">◈ &nbsp; ASTRAL RESEARCH / UNIT E–07</div><h1 class="title">ECHO<br><span>DEPTHS</span></h1><div class="subtitle">YANKILARIN DERİNLİĞİ</div><p class="description">Sinyal hâlâ orada.<br>Unutulmuş tesise in. Karanlığı dinle.<br>Ve seni uyandıran şeyi bul.</p><label class="seed-label" for="seed-input">KOŞU SEED · BOŞ BIRAK: YENİ SİNYAL</label><input id="seed-input" class="seed-input" maxlength="64" placeholder="Örn. ABYSS-07" autocomplete="off"><br><button class="primary" id="start">SİSTEMİ BAŞLAT &nbsp; ↗</button><button class="secondary" id="settings">AYARLAR</button><div class="tag">04 / PROJECT OVERDRIVE &nbsp; · &nbsp; VERTICAL SLICE</div></section>`;
    document.querySelector("#settings").onclick = () => this.openSettings();
    document.querySelector("#start").onclick = () =>
      this.start(document.querySelector("#seed-input")?.value || freshSeed());
  }
  start(seed = freshSeed()) {
    this.audio.unlock();
    this.hudKey = null;
    this.seed = String(seed).trim().slice(0, 64) || freshSeed();
    this.player = this.makePlayer();
    this.kills = 0;
    this.score = 0;
    this.scrap = 0;
    this.stats = this.makeStats();
    this.elapsed = 0;
    this.roomIndex = 0;
    this.enemyId = 0;
    this.biomeIndex = 0;
    this.pendingBiome = null;
    this.transitionTarget = null;
    this.shopItems = [];
    this.rewardChoices = [];
    this.botNav = [];
    this.botNavCd = 0;
    this.currentNode = null;
    this.introTime = 0;
    this.finalized = false;
    this.mapMandatory = false;
    this.mapReturnState = null;
    this.transition = 0;
    this.dungeon = generateDungeon(this.seed, 0);
    this.resetEffects();
    this.nextRoom(this.dungeon.start);
  }
  nextRoom(id = null) {
    const target = id || this.currentNode?.next[0] || this.dungeon.start,
      node = nodeById(this.dungeon, target);
    if (!node) return false;
    this.combat.reset();
    this.currentNode = node;
    this.dungeon.current = node.id;
    discover(this.dungeon, node);
    this.roomIndex++;
    this.encounterRandom = seeded(node.seed + ":combat");
    this.rewardRandom = seeded(node.seed + ":reward");
    this.room = createRoom(this.roomIndex, () => node.layout / 4 + 0.001);
    this.balance = difficulty(
      this.biomeIndex * 4 + node.layer + 1,
      this.player,
    );
    if (node.type === "elite") {
      this.balance.hp *= 1.4;
      this.balance.count = Math.min(22, this.balance.count + 3);
    }
    this.room.spawnCount = this.balance.count;
    this.navigation = new Navigation(this.room.walls);
    Object.assign(this.player, {
      x: 640,
      y: 400,
      inv: 1.5,
      dash: 0,
      fire: 0,
      dashCd: 0,
      dashBoost: 0,
    });
    this.bullets = [];
    this.enemies = [];
    this.boss = null;
    this.arenaBaseWalls = null;
    this.resetEffects();
    this.transition = 0.45;
    this.roomTime = 0;
    this.hazards = roomHazards(this.biomeIndex, node.type);
    this.pendingSwarm = 0;
    this.remaining = this.room.spawnCount;
    this.spawnTimer = 1.25;
    this.clearTimer = 1;
    this.state = "playing";
    this.overlay.innerHTML = "";
    this.pointer.down = false;
    this.keys.clear();
    this.notice =
      this.roomIndex === 1
        ? "WASD hareket / fare ateş / SPACE dash / TAB harita"
        : biomes[this.biomeIndex].name;
    this.noticeTime = 5;
    if (node.type === "boss") {
      this.room.walls = this.room.walls.slice(0, 4);
      this.navigation = new Navigation(this.room.walls);
      this.remaining = 0;
      this.boss = makeBoss(
        this.biomeIndex,
        1 + Math.min(0.25, (this.player.damage / 24 - 1) * 0.1),
      );
      this.enemies = [this.boss];
      this.player.y = 610;
      this.state = "bossIntro";
      this.introTime = 2.2;
      this.introMax = 2.2;
      this.audio.play("bossIntro");
      this.clearTimer = 1.8;
    } else if (["shop", "repair", "treasure"].includes(node.type)) {
      this.remaining = 0;
      this.openSpecialRoom();
    }
    return true;
  }
  travelTo(id) {
    if (this.state !== "map" || !canTravel(this.dungeon, id)) return false;
    this.state = "transition";
    this.transitionTime = 0.4;
    this.transitionTarget = id;
    this.overlay.innerHTML = "";
    this.pointer.down = false;
    this.keys.clear();
    return true;
  }
  showMap(mandatory = false) {
    if (!mandatory && !["playing", "paused"].includes(this.state)) return false;
    this.mapReturnState = this.state === "paused" ? "paused" : "playing";
    this.mapMandatory = mandatory;
    this.state = "map";
    this.pointer.down = false;
    this.keys.clear();
    this.overlay.innerHTML = mapHTML(this);
    this.overlay
      .querySelectorAll("[data-node]")
      .forEach(
        (button) => (button.onclick = () => this.travelTo(button.dataset.node)),
      );
    if (!mandatory)
      document.querySelector("#close-map").onclick = () => this.closeMap();
    return true;
  }
  closeMap() {
    if (this.state !== "map" || this.mapMandatory) return false;
    this.state = "playing";
    this.overlay.innerHTML = "";
    this.keys.clear();
    this.pointer.down = false;
    if (this.mapReturnState === "paused") this.pause();
    return true;
  }
  openSpecialRoom() {
    if (this.currentNode.type === "shop") {
      this.state = "shop";
      this.shopItems = createShop(this);
      this.renderShop();
      return;
    }
    this.state = "event";
    const repair = this.currentNode.type === "repair";
    this.overlay.innerHTML = `<section class="panel"><div class="eyebrow">${repair ? "OTONOM SERVİS İSTASYONU" : "TERK EDİLMİŞ TEDARİK KASASI"}</div><h2>${repair ? "Bir anlığına güvendesin." : "Derinlikten bir armağan."}</h2><p class="description">${repair ? "Gövdeni tamamen onar. Sonra rotanı seç." : "45 Scrap ve bir modül seçimi seni bekliyor."}</p><button class="primary" id="claim-event">${repair ? "TAM ONARIM" : "KASAYI AÇ"} ↗</button></section>`;
    document.querySelector("#claim-event").onclick = () => {
      if (this.state !== "event") return;
      if (repair) {
        this.player.hp = this.player.maxHp;
        this.markCleared();
        this.showMap(true);
      } else {
        grantScrap(this, 45);
        this.chooseUpgrade();
      }
    };
  }
  renderShop() {
    this.overlay.innerHTML = shopHTML(this);
    this.overlay.querySelectorAll("[data-buy]").forEach(
      (button) =>
        (button.onclick = () => {
          if (buy(this, button.dataset.buy)) this.renderShop();
        }),
    );
    document.querySelector("#leave-shop").onclick = () => {
      if (this.state !== "shop") return;
      this.markCleared();
      this.showMap(true);
    };
  }
  markCleared() {
    const n = this.currentNode;
    if (n.cleared) return false;
    n.cleared = true;
    this.stats.roomsCleared++;
    return true;
  }
  rewardChosen() {
    if (this.currentNode.type === "boss") {
      this.state = "biomeTransition";
      this.transitionTime = 1.5;
      this.pendingBiome = this.biomeIndex + 1;
      this.overlay.innerHTML = "";
      this.notice = "DAHA DERİNE / " + biomes[this.pendingBiome].name;
      this.noticeTime = 2;
    } else this.showMap(true);
  }
  onBossKilled(b) {
    if (b.deathHandled) return;
    restoreArena(this);
    b.deathHandled = true;
    this.stats.bosses++;
    this.score += 2500 * (this.biomeIndex + 1);
    grantScrap(this, 100 + this.biomeIndex * 40);
    this.bullets = this.bullets.filter((shot) => !shot.enemy);
    this.delayed = [];
    this.hazards = [];
    b.attack = null;
    this.player.maxHp += 15;
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + 45);
    this.effects.push({
      kind: "bossDeath",
      x: b.x,
      y: b.y,
      r: 220,
      color: b.definition.color,
      life: 1.8,
      max: 1.8,
    });
    this.burst(b.x, b.y, b.definition.color, 100);
    this.shake = 14;
    this.audio.play("bossDeath");
  }
  finishRun(victory = false) {
    if (this.finalized) return;
    this.finalized = true;
    this.state = victory ? "victory" : "dead";
    this.pointer.down = false;
    this.keys.clear();
    this.bullets = [];
    this.delayed = [];
    this.audio.play(victory ? "victory" : "death");
    this.overlay.innerHTML = endingHTML(this, victory);
    document.querySelector("#restart").onclick = () => this.start();
    document.querySelector("#replay-seed").onclick = () =>
      this.start(this.seed);
  }
  pause() {
    if (this.state === "playing") {
      this.state = "paused";
      this.pointer.down = false;
      this.overlay.innerHTML =
        '<section class="panel"><div class="eyebrow">SİNYAL BEKLEMEDE</div><h2>Sistem askıya alındı.</h2><p class="description">Devam etmek için ESC tuşuna bas.</p><button class="primary" id="resume">DEVAM ET ↗</button><button class="secondary" id="settings">AYARLAR</button></section>';
      document.querySelector("#settings").onclick = () => this.openSettings();
      document.querySelector("#resume").onclick = () => this.pause();
    } else if (this.state === "paused") {
      this.state = "playing";
      this.overlay.innerHTML = "";
      this.keys.clear();
    }
  }
  dash() {
    const p = this.player;
    if (p.dashCd > 0) return;
    let x = Number(this.keys.has("KeyD")) - Number(this.keys.has("KeyA")),
      y = Number(this.keys.has("KeyS")) - Number(this.keys.has("KeyW"));
    const l = Math.hypot(x, y);
    p.dx = l ? x / l : Math.cos(p.angle);
    p.dy = l ? y / l : Math.sin(p.angle);
    p.dash = 0.16;
    p.inv = Math.max(p.inv, 0.23 + p.dashShield);
    p.dashCd = p.dashDelay;
    p.dashBoost = 1.4;
    this.audio.play("dash");
    this.burst(p.x, p.y, "#76ffe3", 15);
    if (p.dashNova) this.combat.explode(p, p.dashNova, 85 * p.blastRadius);
  }
  burst(x, y, color, n = 10) {
    const load =
      this.bullets.length > 100 ? 0.6 : this.enemies.length > 10 ? 0.8 : 1;
    const count = Math.max(1, Math.round(n * this.quality.particles * load));
    for (
      let i = 0;
      i < count && this.particles.length < this.quality.maxParticles;
      i++
    ) {
      const p = this.particlePool.acquire();
      if (!p) break;
      const a = Math.random() * Math.PI * 2,
        speed = 40 + Math.random() * 210;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(a) * speed;
      p.vy = Math.sin(a) * speed;
      p.life = 0.25 + Math.random() * 0.45;
      p.max = 0.7;
      p.color = color;
      p.size = 1 + Math.random() * 4;
      this.particles.push(p);
    }
  }
  findSpawn(type) {
    const r = enemyTypes[type].r;
    for (let tries = 0; tries < 48; tries++) {
      const side = Math.floor((this.encounterRandom || Math.random)() * 4),
        pos = {
          x:
            side < 2
              ? side === 0
                ? 95
                : W - 95
              : 95 + (this.encounterRandom || Math.random)() * (W - 190),
          y:
            side >= 2
              ? side === 2
                ? 95
                : H - 95
              : 95 + (this.encounterRandom || Math.random)() * (H - 190),
          r: r + 15,
        };
      if (
        this.room.walls.some((w) => circleRect(pos, w)) ||
        distance(pos, this.player) < 330 ||
        this.enemies.some((e) => distance(pos, e) < r + e.r + 35)
      )
        continue;
      if (!this.navigation.find(pos, this.player, r).length) continue;
      return pos;
    }
    return null;
  }
  spawn() {
    const i = this.room.spawnCount - this.remaining,
      types = this.balance.types;
    let type = this.pendingSwarm > 0 ? 5 : types[i % types.length];
    if (i % 7 === 0 && types.includes(5)) type = 5;
    const pos = this.findSpawn(type);
    if (!pos) return false;
    if (type === 5) {
      if (this.pendingSwarm > 0) this.pendingSwarm--;
      else this.pendingSwarm = 2;
    }
    this.enemies.push(makeEnemy(type, pos, this.balance.hp, ++this.enemyId));
    this.remaining--;
    this.burst(pos.x, pos.y, enemyTypes[type].color, 12);
    return true;
  }
  shoot(owner, angle, enemy = false) {
    if (this.bullets.length > 220) return;
    if (enemy) {
      const speed = owner.type === 4 ? 240 : 280;
      this.bullets.push({
        x: owner.x,
        y: owner.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: 6,
        life: 4,
        enemy: true,
        damage: owner.type === 4 ? 20 : 12,
        color: "#ff8d80",
      });
      return;
    }
    const w = weaponStats(this.player);
    this.bullets.push(...makeVolley(this.player, angle, this.encounterRandom));
    this.stats.weaponsUsed.add(this.player.weapon);
    this.audio.play(w.sound);
    this.shake = Math.max(this.shake, w.shake);
    this.effects.push({
      kind: "muzzle",
      x: owner.x + Math.cos(angle) * 34,
      y: owner.y + Math.sin(angle) * 34,
      angle,
      r: w.id === "rail" ? 46 : w.id === "scatter" ? 28 : 18,
      color: w.color,
      life: 0.08,
      max: 0.08,
    });
  }
  hurt(amount) {
    const p = this.player;
    if (p.inv > 0 || this.state !== "playing") return;
    p.hp = Math.max(0, p.hp - amount * (1 - p.armor));
    p.inv = 0.8;
    this.flash = 0.25;
    this.shake = 10;
    this.burst(p.x, p.y, "#ff796c", 22);
    this.audio.play("hit");
    if (p.hp <= 0) this.die();
  }
  die() {
    this.burst(this.player.x, this.player.y, "#77ffe5", 45);
    this.finishRun(false);
  }
  chooseUpgrade() {
    if (this.finalized) return;
    if (this.state === "upgrade" && this.currentNode.rewarded) return;
    this.state = "upgrade";
    this.pointer.down = false;
    if (!this.currentNode.rewarded) {
      this.currentNode.rewarded = true;
      this.markCleared();
      this.score += 250 + this.roomIndex * 50;
      grantScrap(this, this.currentNode.type === "elite" ? 60 : 25);
    }
    if (this.currentNode.type === "boss" && this.biomeIndex === 2) {
      this.finishRun(true);
      return;
    }
    const locked = Object.keys(weapons).filter(
      (id) => !this.player.inventory.includes(id),
    );
    // One guaranteed discovery per cleared room; every weapon is available by room five.
    const found = locked[0];
    if (found) unlockWeapon(this.player, found);
    const choices = upgradeChoices(this.player, this.rewardRandom);
    this.rewardChoices = choices;
    if (!choices.length) {
      this.overlay.innerHTML =
        '<section class="panel"><div class="eyebrow">TÜM MODÜLLER AZAMİ SEVİYEDE</div><h2>Servis döngüsü hazır.</h2><button class="primary" id="service">TAM ONARIM VE DEVAM ↗</button></section>';
      document.querySelector("#service").onclick = () => {
        if (this.state !== "upgrade") return;
        this.player.hp = this.player.maxHp;
        this.rewardChosen();
      };
      return;
    }
    this.overlay.innerHTML = `<section class="panel"><div class="eyebrow">ODA ${String(this.roomIndex).padStart(2, "0")} / TEHDİT TEMİZLENDİ</div><h2>Çatışmadan evrime.</h2><p class="description">${found ? "YENİ SİLAH: " + weapons[found].name + " · Q veya 1–5 ile değiştir." : "Tüm silah sistemleri çevrimiçi."}<br>${found ? weapons[found].description + "<br>" : ""}Bir modül seç; deneme boyunca etkili kalır.</p><div class="cards">${choices.map((u, i) => `<button class="card ${u.rarity.toLowerCase()}" data-up="${i}"><i>${u.rarity.toUpperCase()} / ${u.category}</i><b>${u.name}</b><span>${u.text}</span></button>`).join("")}</div></section>`;
    this.overlay.querySelectorAll("[data-up]").forEach(
      (b) =>
        (b.onclick = () => {
          if (this.state !== "upgrade") return;
          applyUpgrade(this.player, choices[Number(b.dataset.up)]);
          this.audio.play("upgrade");
          this.rewardChosen();
        }),
    );
  }
  updateEffects(dt) {
    this.shake = Math.max(0, this.shake - dt * 32);
    this.flash = Math.max(0, this.flash - dt);
    this.noticeTime = Math.max(0, this.noticeTime - dt);
    const particleTime = this.profile?.start();
    this.particlePool.update(this.particles, dt);
    this.profile?.end("particles", particleTime);
    for (const e of this.effects) e.life -= dt;
    this.effects = this.effects.filter((e) => e.life > 0).slice(-100);
    for (const n of this.numbers) {
      n.life -= dt;
      n.y -= dt * 32;
    }
    this.numbers = this.numbers.filter((n) => n.life > 0);
  }
  update(dt) {
    this.time += dt;
    this.audio.updateAmbient?.(
      this.biomeIndex,
      ["playing", "bossIntro"].includes(this.state),
    );
    if (
      ["paused", "upgrade", "map", "shop", "event", "settings"].includes(
        this.state,
      )
    )
      return;
    this.transition = Math.max(0, (this.transition || 0) - dt);
    if (this.state === "transition" || this.state === "biomeTransition") {
      this.transitionTime -= dt;
      if (this.transitionTime <= 0) {
        if (this.pendingBiome !== null) {
          this.biomeIndex = this.pendingBiome;
          this.pendingBiome = null;
          this.dungeon = generateDungeon(this.seed, this.biomeIndex);
          this.nextRoom(this.dungeon.start);
        } else {
          const id = this.transitionTarget;
          this.transitionTarget = null;
          this.nextRoom(id);
        }
      }
      return;
    }
    if (this.state === "bossIntro") {
      this.introTime = Math.max(0, this.introTime - dt);
      this.updateEffects(dt);
      if (this.introTime <= 0) {
        this.state = "playing";
        this.player.inv = 1;
      }
      return;
    }
    this.updateEffects(dt);
    if (this.state !== "playing") return;
    if (this.hitStop > 0) {
      this.hitStop = Math.max(0, this.hitStop - dt);
      return;
    }
    this.elapsed += dt;
    updateEnvironment(this, dt);
    if (this.state !== "playing") return;
    const p = this.player;
    p.inv = Math.max(0, p.inv - dt);
    p.dashCd = Math.max(0, p.dashCd - dt);
    p.fire -= dt;
    p.dash = Math.max(0, p.dash - dt);
    p.dashBoost = Math.max(0, p.dashBoost - dt);
    const aim = this.renderer.worldPoint(this.pointer);
    p.angle = Math.atan2(aim.y - p.y, aim.x - p.x);
    let x = Number(this.keys.has("KeyD")) - Number(this.keys.has("KeyA")),
      y = Number(this.keys.has("KeyS")) - Number(this.keys.has("KeyW")),
      len = Math.hypot(x, y);
    if (p.dash > 0) {
      if (len) {
        const turn = Math.min(1, dt * 10),
          nx = p.dx + (x / len - p.dx) * turn,
          ny = p.dy + (y / len - p.dy) * turn,
          norm = Math.hypot(nx, ny);
        if (norm > 0) {
          p.dx = nx / norm;
          p.dy = ny / norm;
        }
      }
      x = p.dx * 850;
      y = p.dy * 850;
      this.burst(p.x, p.y, "#65fce5", 1);
    } else {
      x = len ? (x / len) * p.speed : 0;
      y = len ? (y / len) * p.speed : 0;
    }
    moveBody(p, x * dt, y * dt, this.room.walls);
    if (this.pointer.down && p.fire <= 0) {
      this.shoot(p, p.angle);
      p.fire =
        weaponStats(p).delay *
        (p.overclock && p.hp / p.maxHp < 0.35 ? 0.75 : 1);
    }
    this.spawnTimer -= dt;
    if (
      this.remaining > 0 &&
      this.spawnTimer <= 0 &&
      this.enemies.length < this.balance.active
    ) {
      this.spawn();
      this.spawnTimer = this.balance.interval;
      // Small pack arrives over several readable, telegraphed spawns.
      if (this.balance.types.includes(5) && this.enemies.at(-1)?.type === 5)
        this.spawnTimer = 0.22;
    }
    const aiTime = this.profile?.start();
    updateEnemies(this, dt);
    this.profile?.end("ai", aiTime);
    const bossTime = this.profile?.start();
    updateBoss(this, dt);
    this.profile?.end("boss", bossTime);
    if (this.state !== "playing") return;
    this.combat.update(dt);
    if (
      this.state === "playing" &&
      !this.remaining &&
      !this.enemies.length &&
      !this.delayed.length
    ) {
      this.clearTimer -= dt;
      if (this.clearTimer <= 0) this.chooseUpgrade();
    }
  }
  updateHUD() {
    if (
      this.state === "menu" ||
      (this.state === "settings" && this.settingsReturn === "menu")
    ) {
      if (this.hud.innerHTML) this.hud.innerHTML = "";
      this.hudKey = "menu";
      this.hudNodes = null;
      return;
    }
    const p = this.player,
      w = weaponStats(p),
      mods = Object.entries(p.upgrades);
    const key = [
      this.state === "menu" ? "menu" : "run",
      w.id,
      p.damage,
      p.fireDelay,
      p.critChance,
      p.maxHp,
      p.inventory.join(","),
      mods.map(([id, n]) => id + ":" + n).join(","),
      this.roomIndex,
      this.biomeIndex,
      this.boss?.bossId,
      this.boss?.phase,
    ].join("|");
    if (this.hudKey === key && this.hudNodes) {
      this.patchHUD();
      return;
    }
    this.hudKey = key;
    this.hud.innerHTML =
      this.state === "menu"
        ? ""
        : `<div class="hud-block"><span class="muted">E–07 / GÖVDE BÜTÜNLÜĞÜ</span><b><span data-live="hp">${Math.ceil(p.hp)}</span> <small class="muted">/ ${p.maxHp}</small></b><div class="bar health"><div data-live="hpbar" style="width:${(p.hp / p.maxHp) * 100}%"></div></div><div class="hud-line"><span data-live="dash">FAZ ${p.dashCd <= 0 ? "HAZIR" : p.dashCd.toFixed(1) + "s"}</span> <span>SPACE</span></div><div class="bar"><div data-live="dashbar" style="width:${(1 - p.dashCd / p.dashDelay) * 100}%"></div></div></div><div class="hud-block weapon"><span class="muted">SİLAH SİSTEMİ / Q · 1–5</span><b style="color:${w.color}">${w.name}</b><span>${Math.round(w.damage)} HASAR × ${w.pellets} / ${(1 / w.delay).toFixed(1)} ATIŞ·SN / KRİT %${Math.round(p.critChance * 100)}</span><div class="weapon-slots">${p.inventory.map((id, i) => `<span class="${p.weapon === id ? "selected" : ""}">${i + 1} ${weapons[id].name}</span>`).join("")}</div></div><div class="hud-block right"><span class="muted">${biomes[this.biomeIndex].name}</span><b><span data-live="score">${this.score.toLocaleString("tr-TR")}</span> <small>SKOR</small></b><span><span data-live="threats">${this.enemies.length + this.remaining} TEHDİT / ODA ${this.roomIndex}</span><br><strong class="scrap" data-live="scrap">${this.scrap} SCRAP</strong> · TAB HARİTA</span></div><div class="mod-strip">${
            mods.length
              ? mods
                  .map(([id, n]) => {
                    const u = upgrades.find((u) => u.id === id);
                    return `<span class="${u.rarity.toLowerCase()}" title="${u.text}">${u.name}${n > 1 ? " ×" + n : ""}</span>`;
                  })
                  .join("")
              : "MODÜL YOK · ODA TEMİZLE VE GELİŞ"
          } </div>${this.boss && this.boss.hp > 0 ? `<div class="boss-bar"><div class="boss-name">${this.boss.definition.name}<span>FAZ ${this.boss.phase} / 3</span></div><div class="boss-track"><div data-live="bossbar" style="width:${Math.max(0, (this.boss.hp / this.boss.maxHp) * 100)}%;background:${this.boss.definition.color}"></div></div></div>` : ""}`;
    this.hudNodes = this.hud.querySelector
      ? Object.fromEntries(
          [
            "hp",
            "hpbar",
            "dash",
            "dashbar",
            "score",
            "threats",
            "scrap",
            "bossbar",
          ].map((id) => [id, this.hud.querySelector(`[data-live="${id}"]`)]),
        )
      : null;
  }
  patchHUD() {
    const n = this.hudNodes,
      p = this.player;
    if (!n) return;
    const text = (id, value) => {
      if (n[id] && n[id].textContent !== value) n[id].textContent = value;
    };
    const width = (id, value) => {
      if (n[id]) {
        const v = value.toFixed(1) + "%";
        if (n[id].style.width !== v) n[id].style.width = v;
      }
    };
    text("hp", String(Math.ceil(p.hp)));
    text(
      "dash",
      "FAZ " + (p.dashCd <= 0 ? "HAZIR" : p.dashCd.toFixed(1) + "s"),
    );
    text("score", this.score.toLocaleString("tr-TR"));
    text(
      "threats",
      `${this.enemies.length + this.remaining} TEHDİT / ODA ${this.roomIndex}`,
    );
    text("scrap", this.scrap + " SCRAP");
    width("hpbar", (p.hp / p.maxHp) * 100);
    width("dashbar", (1 - p.dashCd / p.dashDelay) * 100);
    if (this.boss)
      width("bossbar", Math.max(0, (this.boss.hp / this.boss.maxHp) * 100));
  }
}
