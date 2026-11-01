# ECHO DEPTHS — Yankıların Derinliği

**0.5 / Project Ignition.** Canvas 2D, JavaScript ES modules ve Vite. Mevcut oyun genişletilmiştir; hazır oyun motoru veya çalışma zamanı bağımlılığı yoktur.

## Başlatma

Node.js 20.19+ veya 22.12+ gerekir.

```sh
npm ci
npm run dev
```

Terminaldeki yerel adresi açın (varsayılan `http://127.0.0.1:5173`). Üretim için `npm run build`, çıktı önizlemesi için `npm run preview` kullanın. Kaynakları `file://` ile açmayın.

## Oynanış

WASD hareket, fare nişan, sol tık/basılı tut ateş, Space dash, Q sonraki silah, 1–5 kazanılmış silah, TAB harita, ESC duraklat/devam, M ses, F3 performans göstergesi, F4 GPU teşhisi. Grafik profili ana menü veya duraklatma ayarlarından seçilir ve saklanır. Menüde seed girilebilir; boş bırakılırsa yeni seed seçilir.

Üç biyomda dallanan bir rota seçin. Normal/elit çatışmaları temizleyin; hazine, tamir veya mağaza fırsatlarını değerlendirin. Her biyomun sonunda bir boss bulunur. Üç boss yenilince özel zafer ekranı ve gerçek koşu istatistikleri gösterilir. Ölümde Scrap ve bütün koşu yükseltmeleri sıfırlanır.

Beş silah, altı normal düşman, 24 yükseltme, üç nadirlik, kritik/deliş/sekme, elektrik zinciri, patlama, yanma/kriyo ve dash sinerjileri korunmuştur. Harita ve ödül üretimi görsel rastgelelikten bağımsızdır.

## Dosya yapısı

```text
src/
  main.js           Sabit simülasyon, render ve DEV tanılama
  game.js           Giriş, koşu/oda yaşam döngüsü ve ekran akışı
  dungeon.js        Seed RNG, dallanan grafik, keşif ve rota kuralları
  biomes.js         Üç biyom ve çevresel tehlikeler
  bosses.js         Üç boss, fazlar, saldırılar ve arena değişiklikleri
  economy.js        Scrap, mağaza üretimi ve işlemleri
  ui.js             Harita, mağaza ve sonuç ekranları
  world-renderer.js Biyom dekorları, boss siluetleri ve tehlike çizimleri
  renderer.js       Canvas çizimi, robotlar, efektler ve önbellekler
  navigation.js     Gövde yarıçapına göre grid A*
  enemies.js        Altı düşman, separation ve zorluk
  weapons.js        Beş silah ve envanter
  upgrades.js       24 modül ve nadirlik seçimi
  combat.js         Sıralı çarpışma ve hasar sistemleri
  math.js           Geometri ve hareket
  rooms.js          Dört engel şablonu
  gpu-diagnostics.js F4 GPU teşhisi; güvenli, isteğe bağlı WebGL2 probe
  quality.js        Kalıcı LOW/MEDIUM/HIGH grafik profilleri
  particles.js      Sınırlı, yeniden kullanılan parçacık havuzu
  timing.js         Sabit adım saati ve kare ölçüm halkası
  audio.js          Web Audio efektleri ve ortam katmanları
  style.css         Menü, HUD, harita ve mağaza
  testing/bot.js    Yalnızca DEV QA/test denetleyicisi
 tests/             Node regresyon, sistem ve tam koşu testleri
 e2e/               Chromium kontrol/tam koşu/performance testleri
 ignition/          Aynı atlasları kullanan Canvas/WebGL2 laboratuvarı
 e2e-release/       Gerçek production build tarayıcı testi
 scripts/           Simülasyon ve benchmark araçları
 docs/              Türkçe rapor, gerçek görüntüler ve JSON kanıtlar
```

## Doğrulama

```sh
npm test
npm run test:e2e
npm run test:playthrough -- ABYSS-07
npm run test:production
```

Yeni makinede tarayıcı testlerinden önce `npx playwright install chromium` çalıştırın. 80 Node testi ve 12 geliştirme Chromium testi geçti. Intel GPU üzerinde ayrıca 8 kontrol geçti; production testi hem SwiftShader hem Intel GPU ortamında başarılıdır. İki seed'de simülasyonla, bir seed'de gerçek tarayıcıda 18 oda ve üç boss tamamlanarak zafer doğrulandı. QA botu sağlık/hasar/para hilesi kullanmaz; tam koşu testinde zamanı hızlandırır. Production build QA API'lerini ve botu içermez.

**Bütün cihazlarda 60 FPS garanti edilmez.** Sistem Chrome/Intel UHD yolunda mevcut renderer’ın dört kısa HIGH/DPR2 örneği 90,68–124,26 FPS ölçtü. Aşağıdaki SwiftShader sayıları önceki Overdrive ortamına aittir. HIGH/DPR 2 SwiftShader ortamındaki üç tekrarlı sahne medyanları optimizasyon sonrasında 21,23–29,21 FPS ölçtü; RTX ve diğer gerçek GPU’larda doğrulama bekliyor. On tam koşuluk bellek testi 180 oda ve 30 boss içerir. Ayrıntılar ve test edilmemiş alanlar rapordadır.

- [Project Overdrive teslimat ve performans raporu](docs/PROJECT_OVERDRIVE.md)
- [Into the Abyss teslimat raporu](docs/INTO_THE_ABYSS.md)
- [Gerçek ekran görüntüleri](docs/screenshots/README.md)
- [Tarayıcı koşusu kanıtı](docs/validation/browser-run.json)
- [Gerçek zamanlı performans örneği](docs/validation/browser-performance.json)
- [Önceki aşamanın tarihsel raporu](docs/COMBAT_EVOLUTION.md)

## GPU teşhisi ve izole prototip

Oyunda **F4** adaptör bilgisi, WebGL2 desteği, FPS ve render çözünürlüğünü gösterir. Web API donanım hızlandırmasını kesin kanıtlayamaz; kesin olmayan alanlar Bilinmiyor kalır. Oyunun aktif renderer’ı Canvas 2D’dir.

`npm run dev` açıkken `http://127.0.0.1:5173/ignition/index.html` adresi aynı atlaslarla Canvas/WebGL2 karşılaştırmasını açar. Beş saniyelik ölçüm düğmesi yerel JSON indirir. CDP teşhisi: `npm run gpu:probe`; üç tekrarlı karşılaştırma: `npm run gpu:compare`. Windows PowerShell’de sistem Chrome’u ölçmek için önce `$env:ECHO_GPU_CHANNEL="chrome"` ayarlayın; sonucu `docs/ignition/chrome/` altında bulun. Değişkeni kaldırınca Playwright headless-shell referansı kullanılır. Güvenlik/GPU zorlaması veya sürücü değişikliği yapılmaz.

- [Project Ignition GPU raporu](docs/GPU_ACCELERATION.md)
