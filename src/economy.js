import { weapons, unlockWeapon } from "./weapons.js";
import { upgradeChoices, applyUpgrade } from "./upgrades.js";
import { seeded } from "./dungeon.js";
export function grantScrap(g, amount) {
  if (!Number.isFinite(amount) || amount <= 0) return;
  g.scrap += Math.floor(amount);
  g.stats.scrapEarned += Math.floor(amount);
}
export function createShop(g) {
  const random = seeded(`${g.currentNode.seed}:shop`),
    locked = Object.keys(weapons).filter(
      (id) => !g.player.inventory.includes(id),
    ),
    u = upgradeChoices(g.player, random, 1)[0];
  return [
    locked.length
      ? {
          id: "weapon",
          kind: "weapon",
          weapon: locked[Math.floor(random() * locked.length)],
          name: "Silah kasası",
          price: 75 + g.biomeIndex * 20,
        }
      : null,
    u
      ? {
          id: "module",
          kind: "upgrade",
          upgrade: u.id,
          name: u.name,
          description: u.text,
          rarity: u.rarity,
          price: u.rarity === "Epic" ? 100 : u.rarity === "Rare" ? 65 : 40,
        }
      : null,
    {
      id: "heal",
      kind: "heal",
      name: "Onarım kiti",
      description: "Gövdeyi 40 can onarır.",
      price: 30,
    },
    {
      id: "boost",
      kind: "boost",
      name: "Aşırı güç hücresi",
      description: "45 saniye boyunca hasar +%25. Yalnızca savaşta tükenir.",
      price: 45,
    },
  ]
    .filter(Boolean)
    .map((item) => ({
      ...item,
      price: Math.round(item.price * (1 + g.biomeIndex * 0.75)),
      name: item.weapon ? weapons[item.weapon].name : item.name,
      description: item.weapon
        ? weapons[item.weapon].description
        : item.description,
      sold: false,
    }));
}
export function buy(g, id) {
  if (g.state !== "shop" || g.currentNode?.type !== "shop") return false;
  const item = g.shopItems.find((i) => i.id === id);
  if (!item || item.sold || g.scrap < item.price) return false;
  if (item.kind === "heal" && g.player.hp >= g.player.maxHp) return false;
  if (item.kind === "weapon" && !unlockWeapon(g.player, item.weapon))
    return false;
  if (
    item.kind === "upgrade" &&
    !applyUpgrade(g.player, g.upgradeById(item.upgrade))
  )
    return false;
  if (item.kind === "heal")
    g.player.hp = Math.min(g.player.maxHp, g.player.hp + 40);
  if (item.kind === "boost")
    g.player.tempBoost = Math.max(g.player.tempBoost || 0, 45);
  g.scrap -= item.price;
  g.stats.scrapSpent += item.price;
  item.sold = true;
  g.audio.play("purchase");
  return true;
}
