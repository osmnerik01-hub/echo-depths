const mod = (id, name, text, category, rarity, apply, max = 5) => ({
  id,
  name,
  text,
  category,
  rarity,
  apply,
  max,
});
export const upgrades = [
  mod(
    "damage",
    "Plazma çekirdeği",
    "Hasar +%20.",
    "Hasar",
    "Common",
    (p) => (p.damage *= 1.2),
  ),
  mod(
    "rate",
    "Hızlandırıcı devre",
    "Ateş aralığı −%14.",
    "Atış hızı",
    "Common",
    (p) => (p.fireDelay = Math.max(0.045, p.fireDelay * 0.86)),
  ),
  mod(
    "hull",
    "Onarım protokolü",
    "Azami can +25; tam onarım.",
    "Savunma",
    "Common",
    (p) => {
      p.maxHp += 25;
      p.hp = p.maxHp;
    },
  ),
  mod(
    "dash",
    "Faz kapasitörü",
    "Dash beklemesi −%18.",
    "Dash",
    "Common",
    (p) => (p.dashDelay = Math.max(0.45, p.dashDelay * 0.82)),
  ),
  mod(
    "speed",
    "Servo motor",
    "Hareket hızı +%8.",
    "Hareket",
    "Common",
    (p) => (p.speed = Math.min(380, p.speed * 1.08)),
  ),
  mod(
    "velocity",
    "Manyetik ray",
    "Mermi hızı +%15.",
    "Mermi",
    "Common",
    (p) => (p.projectileSpeed *= 1.15),
  ),
  mod(
    "range",
    "Odak merceği",
    "Mermi ömrü +%20.",
    "Mermi",
    "Common",
    (p) => (p.range *= 1.2),
  ),
  mod(
    "crit",
    "Hedef analizi",
    "Kritik ihtimali +%8 (en çok %75).",
    "Kritik",
    "Common",
    (p) => (p.critChance = Math.min(0.75, p.critChance + 0.08)),
  ),
  mod(
    "armor",
    "Seramik kaplama",
    "Gelen hasar −%8 (en çok %50).",
    "Savunma",
    "Common",
    (p) => (p.armor = Math.min(0.5, p.armor + 0.08)),
  ),
  mod(
    "repair",
    "Geri dönüşüm",
    "Her etkisiz hedef +2 can.",
    "Savunma",
    "Rare",
    (p) => (p.leech += 2),
    3,
  ),
  mod(
    "pierce",
    "Faz mermisi",
    "Mermiler +1 hedef deler.",
    "Mermi",
    "Rare",
    (p) => p.pierce++,
    3,
  ),
  mod(
    "critpower",
    "Zayıf nokta",
    "Kritik hasar çarpanı +0,5.",
    "Kritik",
    "Rare",
    (p) => (p.critMult += 0.5),
  ),
  mod(
    "chain",
    "İletken ağ",
    "Elektrik +1 hedefe sıçrar. Her silaha zincir verir.",
    "Element",
    "Rare",
    (p) => p.chain++,
    3,
  ),
  mod(
    "electric",
    "İyon güçlendirici",
    "Zincir hasarı +%25, sıçrama mesafesi +20.",
    "Element",
    "Rare",
    (p) => {
      p.chainPower += 0.25;
      p.chainRange += 20;
    },
  ),
  mod(
    "blast",
    "Genişleyen nova",
    "Patlama yarıçapı +%25. Nova ve dash patlamasını büyütür.",
    "Mermi",
    "Rare",
    (p) => (p.blastRadius *= 1.25),
    3,
  ),
  mod(
    "burn",
    "Termal yük",
    "İsabetler 2 saniye boyunca saniyede +6 yanma.",
    "Element",
    "Rare",
    (p) => (p.burn += 6),
    3,
  ),
  mod(
    "slow",
    "Kriyo kapsül",
    "İsabetler hedefi 1,5 sn %15 yavaşlatır (en çok %60).",
    "Element",
    "Common",
    (p) => (p.slow = Math.min(0.6, p.slow + 0.15)),
    4,
  ),
  mod(
    "dashpower",
    "Faz aşırımı",
    "Dash sonrası 1,4 sn hasar +%30.",
    "Dash",
    "Rare",
    (p) => (p.dashPower += 0.3),
    3,
  ),
  mod(
    "dashshield",
    "Güvenli faz",
    "Dash dokunulmazlığı +0,1 sn.",
    "Dash",
    "Common",
    (p) => (p.dashShield += 0.1),
    3,
  ),
  mod(
    "dashnova",
    "Faz boşalması",
    "Dash başlangıcında 35 hasarlı, 85 yarıçaplı patlama.",
    "Dash",
    "Epic",
    (p) => (p.dashNova += 35),
    2,
  ),
  mod(
    "echo",
    "İkincil süpernova",
    "Patlamadan 0,22 sn sonra %45 hasarlı ikinci patlama.",
    "Mermi",
    "Epic",
    (p) => (p.echoBlast = true),
    1,
  ),
  mod(
    "ricochet",
    "Yankı yüzeyi",
    "Mermiler duvardan +1 kez seker.",
    "Mermi",
    "Epic",
    (p) => p.bounces++,
    2,
  ),
  mod(
    "execution",
    "Kesin çözüm",
    "Canı %25 altındaki hedeflere hasar +%40.",
    "Hasar",
    "Rare",
    (p) => (p.execution += 0.4),
    2,
  ),
  mod(
    "overclock",
    "Kırmızı protokol",
    "Can %35 altındayken ateş aralığı −%25.",
    "Atış hızı",
    "Epic",
    (p) => (p.overclock = true),
    1,
  ),
];
export function applyUpgrade(p, u) {
  p.upgrades ??= {};
  if ((p.upgrades[u.id] || 0) >= u.max) return false;
  u.apply(p);
  p.upgrades[u.id] = (p.upgrades[u.id] || 0) + 1;
  return true;
}
export function rollRarity(random = Math.random) {
  const n = random();
  return n < 0.64 ? "Common" : n < 0.93 ? "Rare" : "Epic";
}
export function upgradeChoices(p, random = Math.random, count = 3) {
  const available = upgrades.filter((u) => (p.upgrades?.[u.id] || 0) < u.max),
    out = [];
  while (out.length < count && available.length) {
    const rarity = rollRarity(random);
    const pool = available.filter((u) => u.rarity === rarity);
    const candidates = pool.length ? pool : available;
    const u =
      candidates[
        Math.min(
          candidates.length - 1,
          Math.floor(random() * candidates.length),
        )
      ];
    out.push(u);
    available.splice(available.indexOf(u), 1);
  }
  return out;
}
