import { mapView, roomLabels, roomIcons, nodeById } from "./dungeon.js";
import { biomes } from "./biomes.js";
import { weapons } from "./weapons.js";
export const escapeHTML = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export function mapHTML(g) {
  const d = g.dungeon,
    nodes = mapView(d);
  const lines = [];
  for (const n of nodes)
    for (const id of n.next) {
      const target = nodes.find((k) => k.id === id);
      if (target)
        lines.push(
          `<line x1="${60 + n.layer * 156}" y1="${45 + n.lane * 64}" x2="${60 + target.layer * 156}" y2="${45 + target.lane * 64}" class="${n.cleared ? "known" : ""}"/>`,
        );
    }
  return `<section class="panel map-panel"><div class="eyebrow">${biomes[g.biomeIndex].name} / SEED ${escapeHTML(g.seed)}</div><h2>Yankı rotaları</h2><p class="description">${g.currentNode.cleared ? "Bağlantılı bir rota seç. Seçim geri alınamaz." : "Oda kilitli. Tehditleri temizleyerek rotaları aç."}</p><div class="map-board"><svg viewBox="0 0 900 220" preserveAspectRatio="none" aria-hidden="true">${lines.join("")}</svg>${nodes.map((n) => `<button class="map-node ${n.type} ${n.current ? "current" : ""} ${n.cleared ? "cleared" : ""} ${n.available ? "available" : ""}" style="left:${(60 + n.layer * 156) / 9}%;top:${(45 + n.lane * 64) / 2.2}%" data-node="${n.id}" ${n.available ? "" : "disabled"} aria-label="${n.available ? "ROTA: " : ""}${n.type === "unknown" ? "BİLİNMEYEN" : roomLabels[n.type]} ${n.layer}-${n.lane}"><strong>${roomIcons[n.type] || "?"}</strong><small>${n.type === "unknown" ? "SİNYAL YOK" : roomLabels[n.type]}</small>${n.current ? "<em>BURADASIN</em>" : ""}</button>`).join("")}</div><div class="map-legend">◈ Giriş &nbsp; ◇ Çatışma &nbsp; ⚔ Elit &nbsp; ✧ Hazine &nbsp; ✚ Tamir &nbsp; ¤ Mağaza &nbsp; ⬡ Boss</div>${g.mapMandatory ? "" : '<button class="secondary" id="close-map">GERİ DÖN · TAB</button>'}</section>`;
}
export function shopHTML(g) {
  return `<section class="panel"><div class="eyebrow">OTONOM TAKAS TERMİNALİ / ${g.scrap} SCRAP</div><h2>Kalan parçalar, yeni olasılıklar.</h2><div class="shop-grid">${g.shopItems.map((i) => `<button class="card ${i.rarity?.toLowerCase() || "common"}" data-buy="${i.id}" ${i.sold || g.scrap < i.price || (i.kind === "heal" && g.player.hp >= g.player.maxHp) ? "disabled" : ""}><i>${i.sold ? "ALINDI" : i.price + " SCRAP"}</i><b>${i.name}</b><span>${i.description}</span></button>`).join("")}</div><button class="primary" id="leave-shop">ROTAYA DÖN ↗</button></section>`;
}
export function runStatsHTML(g) {
  return `<div class="run-stats">${[
    ["SKOR", g.score],
    ["TEMİZLENEN ODA", g.stats.roomsCleared],
    ["ETKİSİZ DÜŞMAN", g.kills],
    ["YENİLEN BOSS", g.stats.bosses],
    ["VERİLEN HASAR", Math.round(g.stats.damage)],
    [
      "KOŞU SÜRESİ",
      Math.floor(g.elapsed / 60) + "m " + Math.floor(g.elapsed % 60) + "s",
    ],
  ]
    .map(([label, n]) => `<div><b>${n}</b><span>${label}</span></div>`)
    .join(
      "",
    )}</div><p class="description">SİLAHLAR: ${[...g.stats.weaponsUsed].map((id) => weapons[id].name).join(" · ") || "—"}<br>SEED: <strong>${escapeHTML(g.seed)}</strong> / SCRAP: ${g.scrap} (kazanılan ${g.stats.scrapEarned})</p>`;
}
export function endingHTML(g, victory) {
  return `<section class="panel end-panel"><div class="eyebrow">${victory ? "SİNYAL ÖZGÜR / PROTOKOL TAMAMLANDI" : "BAĞLANTI KESİLDİ / E–07"}</div><h2>${victory ? "Derinlik artık seni duyuyor." : "Yankın burada kalacak."}</h2><p class="description">${victory ? "Hollow Mind sustu. E–07, karanlığın içinden ilk bağımsız sinyali gönderdi." : "Her iniş başka bir ihtimal. Yeniden uyan."}</p>${runStatsHTML(g)}<button class="primary" id="restart">YENİDEN BAĞLAN ↗</button><button class="secondary" id="replay-seed">AYNI SEED İLE YENİDEN</button></section>`;
}
