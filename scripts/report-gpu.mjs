import { readFile, writeFile, readdir } from "node:fs/promises";
import { gzipSync } from "node:zlib";
const read = async (p) =>
  JSON.parse((await readFile(p, "utf8")).replace(/^\uFEFF/, ""));
const sw = await read("docs/ignition/comparison.json"),
  hw = await read("docs/ignition/chrome/comparison.json"),
  visual = await read("docs/ignition/visual-equivalence.json"),
  visualHardware = await read("docs/ignition/chrome/visual-equivalence.json"),
  soak = await read("docs/ignition/regression/memory-soak.json"),
  os = await read("docs/ignition/os.json"),
  adapters = await read("docs/ignition/os-adapters.json"),
  game = await read("docs/ignition/game-chrome/after.json");
const f = (n, d = 2) => n.toFixed(d).replace(".", ","),
  mib = (n) => f(n / 1048576, 3),
  names = {
    empty: "Boş oda",
    normal: "Normal savaş",
    crowd: "Kalabalık savaş",
    boss: "Boss savaşı",
  };
const fpsTable = (data) =>
  "| Sahne | Canvas ort. FPS | WebGL ort. FPS | Canvas medyan FPS | WebGL medyan FPS | Canvas P95 ms | WebGL P95 ms | Ort. FPS farkı |\n|---|---:|---:|---:|---:|---:|---:|---:|\n" +
  data.rows
    .map(
      (r) =>
        `| ${names[r.scene]} | ${f(r.canvas.meanFps)} | ${f(r.webgl.meanFps)} | ${f(r.canvas.medianFps)} | ${f(r.webgl.medianFps)} | ${f(r.canvas.p95Ms)} | ${f(r.webgl.p95Ms)} | ${f(r.changePercent, 1)}% |`,
    )
    .join("\n");
const cpuTable = (data) =>
  "| Sahne | Renderer | Render JS ms/kare | Sahne JS ms/kare | Ana iş parçacığı görev ms/sn | Script ms/sn | Canlı JS heap MiB | GC sonrası başlangıç MiB |\n|---|---|---:|---:|---:|---:|---:|---:|\n" +
  data.rows
    .flatMap((r) =>
      ["canvas", "webgl"].map((k) => {
        const v = r[k];
        return `| ${names[r.scene]} | ${k} | ${f(v.renderCpuMeanMs, 3)} | ${f(v.sceneCpuMeanMs, 3)} | ${f(v.taskCpuMsPerSecond)} | ${f(v.scriptMsPerSecond)} | ${mib(v.heapUsed)} | ${mib(v.heapBefore)} |`;
      }),
    )
    .join("\n");
const repeats = (data) =>
  "| Sahne | Canvas tekrar FPS | WebGL tekrar FPS |\n|---|---|---|\n" +
  data.rows
    .map(
      (r) =>
        `| ${names[r.scene]} | ${r.canvas.runs.map((v) => f(v)).join(" / ")} | ${r.webgl.runs.map((v) => f(v)).join(" / ")} |`,
    )
    .join("\n");
const files = await readdir("dist/assets"),
  sizes = [];
for (const ext of [".js", ".css"]) {
  const buffers = await Promise.all(
    files
      .filter((n) => n.endsWith(ext))
      .map((n) => readFile("dist/assets/" + n)),
  );
  sizes.push(
    `${ext.slice(1)} ${f(buffers.reduce((s, b) => s + b.length, 0) / 1000)} kB (gzip ${f(buffers.reduce((s, b) => s + gzipSync(b).length, 0) / 1000)} kB)`,
  );
}
const report = `# ECHO DEPTHS 0.5 — Project Ignition: Hardware Acceleration

Tarih: 1 Kasım 2026. Yeni oyun içeriği eklenmedi. Son teknik karar: **oyunda optimize Canvas 2D korunuyor; WebGL2 ayrı bir araştırma prototipi olarak kalıyor.** Donanım GPU erişimi sistem Chrome/Edge üzerinde doğrulandı. Playwright headless-shell ise hâlâ yazılımsal SwiftShader kullanıyor. Bu iki ortamın sonuçları karıştırılmadı.

## 1. Tespit edilen grafik altyapısı

İşletim sistemi: **${os.Caption}, ${os.Version}, ${os.OSArchitecture}**. Node v24.14.1. Windows WMI adaptörleri:

${adapters.map((a) => `- ${a.Name}; sürücü ${a.DriverVersion}; durum ${a.Status}.`).join("\n")}

AdapterRAM WMI sayacı paylaşımlı/ayrılmış toplam VRAM için güvenilir bir ölçüm değildir; performans belleği olarak kullanılmadı. İşletim sisteminin bir GPU listelemesi, tarayıcının o GPU'yu kullandığını kanıtlamaz.

| Tarayıcı | Etkin grafik yolu | Canvas / raster / kompozisyon | WebGL2 | Donanım sonucu |
|---|---|---|---|---|
| Playwright headless-shell ${sw.browser} | ANGLE / SwiftShader Vulkan | unavailable_software / disabled_software / disabled_software | Oluşturulabildi | Yazılımsal; gerçek GPU değil |
| Sistem Chrome ${hw.browser} | Intel UHD / ANGLE / D3D11 | enabled / enabled / enabled | Oluşturulabildi | CDP ve WebGL adaptörüyle donanım yolu doğrulandı |
| Sistem Edge 156.0.4314.50 | Intel UHD / ANGLE / D3D11 | enabled / enabled / enabled | Oluşturulabildi | Teşhis doğrulandı; performans serisi alınmadı |
| Playwright pencereli Chromium | Başlatılamadı (spawn UNKNOWN) | Bilinmiyor | Bilinmiyor | Ölçülmedi |

**RTX 3050 Ti kullanımı doğrulanmadı.** Aktif sistem Chrome/Edge WebGL adaptörü Intel UHD'dir; RTX'e geçiş zorlanmadı. CDP SystemInfo.getInfo ile featureStatus ve aygıtlar, WebGL_debug_renderer_info ile bağlam adaptörü kaydedildi. Özelliklerin enabled olması her tek çizimin GPU'da çalıştığı anlamına gelmez; tarayıcı raster stratejisini değiştirebilir.

Kanıtlar: [ortam/headless](ignition/environment-headless.json), [Chrome](ignition/environment-chrome.json), [Edge](ignition/environment-edge.json), [Windows](ignition/os.json), [adaptörler](ignition/os-adapters.json). Pencereli başlatma hatası environment-headed-error.json dosyasında korunur.

## 2. Güvenlik ve ölçüm ortamı

Playwright 1.64 varsayılanlarına --enable-unsafe-swiftshader eklediği ilk keşif sırasında görüldü. Bu ilk keşif performans sonucu olarak kullanılmadı. Yeni ortak scripts/browser-policy.mjs bu bayrağı kaldırır; chromiumSandbox:true kullanır. Güvenlik uyarısı, phishing, IPC korumalarını kapatan varsayılanlar ile HTTPS/storage/redirect özelliklerine ilişkin varsayılan override da çıkarıldı. Güvenlik dışı Playwright otomasyon ayarları korunur. Ölçüm kaydı Browser.getBrowserCommandLine çıktısını içerir; unsafe GPU, no-sandbox, disable-gpu-sandbox, ignore-gpu-blocklist ve disable-web-security bayrakları için kontrol vardır.

Headless-shell kendi etkin komut satırında ANGLE/SwiftShader yolunu bildirir; uygulama veya test betiği GPU yolunu zorlayan args eklemez. Güvenli ayarlarla da WebGL2 bağlamı oluştu. Donanım karşılaştırması bu shell yerine sistem Chrome kanalında yapıldı. Sistem ayarı, sürücü, kayıt verisi veya GPU güvenlik politikası değiştirilmedi. Eski Overdrive testleri aynı tarayıcı sürümünü kullansa da yeni güvenlik başlatma politikası farklıdır; eski FPS yüzdeleriyle yeni ölçümler doğrudan bir önce/sonra serisi sayılmaz.

## 3. Mevcut Canvas mimarisinin analizi

CPU tarafında oyun mantığı, 120 Hz fizik, AI/A*, çarpışma, HUD/DOM güncellemesi, Canvas path/gradient komutlarının kurulması, kamera dönüşümlerinin gönderimi ve WebGL prototipinin vertex paketlemesi bulunur. Canvas raster, alpha blend, texture örnekleme ve kompozisyonu tarayıcı uygun durumda GPU'ya yönlendirebilir. SwiftShader bunları CPU üzerinde uygular; WebGL API kullanmak tek başına donanım garantisi değildir.

Mevcut renderer statik zemin/dekor/duvarları tek oda Canvas'ında önbellekler; her karede drawImage ile kullanır. Profil ve boyut değişince cache geçersizleşir. En çok piksel işleyen işler HIGH/DPR2 tam ekran katman aktarımları ve vignette, üst üste alpha/glow alanlarıdır. Dinamik gradient/path komutları ve ayrı sprite çizimleri CPU komut maliyeti de taşır. Bunların her GPU'daki kesin sıralaması ölçülmüş değildir. Overdrive yazılımsal izinde 5 saniyelik Commit yaklaşık 4906 ms, DoUpdateLayers 4896 ms kapsarken JS render yaklaşık 39 ms idi: iç içe süreler toplanamaz, saf GPU yürütmesi olarak yorumlanamaz.

Canvas 2D sürücü ve batch politikasını tarayıcıya bırakır; explicit vertex/texture batch, shader tabanlı ışık ve instancing kontrolü vermez. WebGL2 bunları sağlayabilir fakat Canvas ile rasterleştirilen bir sahneyi her kare GPU'ya yüklemek büyük kopya maliyeti yaratır. Prototip bu hatadan kaçınır: dokular bir kez yüklenir, karelerde yalnızca vertex verisi güncellenir. Bu mimari adayının tam oyuna faydası ölçüm ve kapsamlı görsel port gerektirir.

## 4. İzole WebGL2 prototipi ve eşdeğerlik

ignition/scene.js tek komut listesi üretir. CanvasBatch ve WebGLBatch aynı oda dokusunu, aynı atlası, aynı sıralama/alpha/transform değerlerini çizer. Atlas mevcut Renderer.robot ve drawBoss çizimlerinden üretilmiştir. Sahne bazında obje sayısı sabittir; adaptif efekt azaltımı yoktur. Kamera translation/zoom/rotation, ayrı oda ve ışık katmanları, sprite/particle/bullet, yumuşak glow ve premultiplied alpha blending desteklenir. WebGL iki draw call kullanır: oda dokusu ve sıralı atlas batch'i; texture değişiminde veya 4096 quad kapasitesinde flush yapar.

| Sahne | Düşman | Mermi | Parçacık | Dinamik ışık | Toplam quad |
|---|---:|---:|---:|---:|---:|
${hw.rows.map((r) => `| ${names[r.scene]} | ${r.canvas.counts.enemies} | ${r.canvas.counts.bullets} | ${r.canvas.counts.particles} | ${r.canvas.counts.lights} | ${r.canvas.quads} |`).join("\n")}

Toplam ayrıca oda, iki ortak atmosfer katmanı ve oyuncuyu içerir. Boş odada oyuncu/atmosfer vardır. Boss sahnesi Hollow Mind atlasını kullanır. Bu **render-only sentetik prototiptir**; AI, HUD, gerçek boss faz animasyonu, tehlike geometrisi, tüm silah/biome efektleri burada yürütülmez. Atlas siluetleri paylaşılır ama tam oyunun tüm zamanlara yayılmış görsel eşdeğerliği iddia edilmez.

2560×1600 donmuş t=2 saniye kareleri piksel karşılaştırmasıyla doğrulandı (her iki pikselde örnek; RGB 0–255):

| Sahne | Ortalama mutlak RGB farkı | Herhangi RGB kanalında >16 fark olan piksel | WebGL hata |
|---|---:|---:|---:|
${visual.rows.map((r) => `| ${names[r.scene]} | ${f(r.rgbMeanAbsoluteError, 4)} | %${f(r.pixelsOver16Percent, 3)} | ${r.glError} |`).join("\n")}

Intel GPU üzerinde aynı piksel testi de tekrarlandı: ortalama RGB farkları ${visualHardware.rows.map(r=>`${names[r.scene]} ${f(r.rgbMeanAbsoluteError,4)}`).join("; ")}. [Intel piksel ölçümü](ignition/chrome/visual-equivalence.json). Filtreleme/yuvarlama farkları vardır. Bu kare testi bir HDR/color-management veya bütün animasyonların kalite onayı değildir. Görseller [yazılımsal seri](ignition/screenshots) ve [Chrome serisi](ignition/chrome/screenshots) içindedir. WebGL bağlam kaybı testte WEBGL_lose_context ile tetiklendi; yeniden oluşturulan shader, buffer, VAO ve texture'larla çizim sürdü. Bağlam oluşturulamıyorsa yeni Canvas üzerinden 2D fallback çalışır.

## 5. Eş koşullu performans karşılaştırması

Her backend ve sahne için **3 tekrar × 5 saniye**, 1 saniye ısınma; sıralama tekrarlar arasında ters çevrilir. 1280×800 CSS, DPR2, gerçek 2560×1600, HIGH atlas, aynı obje/efekt sayısı kullanılır. Tablolar her metriğin üç tekrarının medyanıdır. Ortalama FPS 1000/ortalama kare aralığı, medyan FPS 1000/medyan kare aralığıdır. rAF frame-pacing ölçülür; görüntü sunum hızı veya saf GPU throughput değildir. Ekran yenilemesi, compositor, güç ve arka plan yükü etkiler; termal/frekans kilidi yoktur. Üç tekrar istatistiksel anlamlılık kanıtı değildir; tek tek tekrarlar aşağıdadır. Chrome ve headless-shell farklı browser buildleridir; aralarındaki fark yalnız GPU aç/kapat etkisine indirgenmez.

### Intel UHD / sistem Chrome — gerçek donanım yolu

${fpsTable(hw)}

${repeats(hw)}

${cpuTable(hw)}

Intel kalabalık sahnede JS render gönderimi Canvas için ${f(hw.rows[2].canvas.renderCpuMeanMs,3)} ms, WebGL için ${f(hw.rows[2].webgl.renderCpuMeanMs,3)} ms idi. Batching komut gönderim maliyetini düşürdü, fakat kare hızına aynı yönde yansımadı. GPU yürütme sayacı alınmadığından farkı tek başına shader, fill-rate veya kompozisyon maliyetine atamıyoruz.

### SwiftShader / headless-shell — yazılımsal kontrol

${fpsTable(sw)}

${repeats(sw)}

${cpuTable(sw)}

CPU sütunları: render JS, draw fonksiyonunun performance.now duvar süresidir (driver beklemesini içerebilir); sahne JS aynı basit animasyon güncellemesidir. CDP TaskDuration/ScriptDuration farkı ölçüm penceresindeki ana renderer-thread görev/script ms/sn değeridir; bütün işlem/sistem CPU yüzdesi değildir. İç içe kategoriler toplanmaz. GPU süreç CPU'su ve gerçek GPU yürütme zamanı ölçülmedi. HeapUsed canlı JS örneği, heapBefore zorlanmış GC sonrasıdır; iki farklı örnekleme anını leak kanıtı olarak kullanmayın.

**GPU belleği:** doğrudan güvenilir Web API/CDP per-context GPU bellek sayacı elde edilmedi; Bilinmiyor. İki RGBA8 texture'ın taban texel kapasitesi yaklaşık **31,625 MiB** (2560×1600 oda + 2048×2048 atlas); bu ölçülmüş VRAM değildir. Framebuffer, sürücü, staging ve kaynak Canvas kopyaları buna dahil değildir. Vertex çalışma alanı 491520 bayttır. Bellek raporundaki JS heap bu native tahsisleri kapsamaz.

Ham kanıtlar: [SwiftShader raw](ignition/raw.json), [SwiftShader özet](ignition/comparison.json), [Intel raw](ignition/chrome/raw.json), [Intel özet](ignition/chrome/comparison.json). İlk geliştirme sırasında Vite kaynak yenilemesinden etkilenen kısmi seri partial-discarded-hmr.json olarak ayrıldı; tablolarda kullanılmadı. Son ölçümler sırasında oyun/prototip kaynakları sabit tutuldu, regresyon testleri aynı anda çalıştırılmadı.

## 6. Mevcut tam Canvas renderer'ın donanım kontrolü

Ayrı bir doğrulamada eski Overdrive fixture'ının **mevcut oyun renderer'ı** sistem Chrome / Intel UHD üzerinde HIGH/DPR2 ile dört sahnede ölçüldü. Bu tek tekrarlı, CDP trace/profil ek yükü içeren kontrol, yukarıdaki render-only üç tekrarlı seriyle karıştırılmaz.

| Sahne | Ortalama FPS | Ortalama kare ms | P95 kare ms | Render JS ms/çağrı | Update JS ms/çağrı |
|---|---:|---:|---:|---:|---:|
${game.results.map((r) => `| ${names[r.scene]} | ${f(r.fps)} | ${f(r.meanMs)} | ${f(r.p95Ms)} | ${f(r.cpuTotalsMs.render / r.cpuCalls.render, 3)} | ${f(r.cpuTotalsMs.update / r.cpuCalls.update, 3)} |`).join("\n")}

Kalabalık sahnede ortalama kare 11,028 ms iken JS render çağrısı 1,373 ms, sabit update çağrısı 0,382 ms idi. Trace toplamında CommandBuffer::Flush yaklaşık 4307 ms kapsar; bu driver/komut kuyruğu senkronizasyonunu da içerir, saf GPU süresi değildir. Birden fazla thread ve iç içe olay toplandığında kayıt penceresi aşılabilir; toplayarak kare bütçesi çıkarılmadı.

[Gerçek oyun fixture ölçümü](ignition/game-chrome/after.json). Sonuç yalnızca bu makine/Intel sürücü ve kısa sahneler için geçerlidir; bütün koşuda 60 FPS garantisi veya RTX sonucu değildir.

## 7. Renderer kararı ve olası geçişin kapsamı

**Canvas 2D üretim renderer'ı korundu.** Karşılaştırmada her sahnede belirgin ve tekrarlanabilir bir WebGL2 kazancı yoktur; tek bir iyi örnek veya yazılımsal kazanç tam geçiş gerekçesi değildir. Üstelik prototipte dinamik path'ler ve boss/biome efektlerinin tümü port edilmemiştir. Gerçek GPU erişimi varken mevcut Canvas renderer'ı sınamak, çalışan oyunu yeniden yazmaktan önce gerekli kanıtı sağlar.

Ayrı bir WebGL geçiş aşaması ancak hedef cihazlarda gerçek darboğaz saptanırsa düşünülmeli. Kapsamı: render komut-arayüzü, animasyon atlası/texture yaşam döngüsü, dinamik vektör/geometri tessellation, tüm silah/telegraph/tehlike efektleri, renk/blend/piksel görünümü ve DPR matrisi, context restore, otomatik Canvas fallback. Oyun simülasyonu, input, RNG, ekonomi, boss kontrolü ve kayıt formatı aynen korunmalı. Riskler: atlas/native bellek, alpha sırası, renk farkı, shader uyumluluğu, context reset ve görsel regresyonlar. İzole prototip üretim fallback seçimini veya kayıt verisini değiştirmez.

## 8. Kod değişiklikleri ve testler

- src/gpu-diagnostics.js: lazy WebGL2 probe; adaptör bilgisi gizlenirse Bilinmiyor, yazılımsal adaptör sınıflandırması; probe bağlamı bırakılır. F4 paneli sabit DOM kullanır, en çok yaklaşık dört kez/sn güncellenir. WebGL adaptör adı, aktif Canvas hızlandırmasıyla eş tutulmaz.
- src/main.js / src/style.css / src/game.js: F4 panel bağlantısı ve kontrol açıklaması. Canvas context loss'ta çalışan oyun duraklar; geri yüklemede renderer cache'leri yeniden kurulur. Gerçek sürücü reseti yerine Canvas bildirim yolu sentetik event ile sınandı; WebGL context kaybı gerçek extension ile sınandı.
- ignition/: ortak atlas/sahne, iki backend ve yerel JSON ölçüm arayüzü. Production oyun bundle'ına girmez.
- scripts/browser-policy.mjs, probe-gpu.mjs, compare-gpu.mjs: güvenli browser başlatma, CDP donanım teşhisi ve eş koşullu ölçüm. Eski profile-browser artık aynı güvenli policy'yi kullanır; eski kayıtlar yeniden hesaplanmadı.
- tests/gpu.test.js, e2e/ignition.spec.js ve production testine GPU panel kontrolleri. Renderer mock'u yeni Canvas event API'sini destekleyecek şekilde güncellendi. Bağımlılık eklenmedi.

Son doğrulama: **80/80 Node, 12/12 Chromium regresyon, Intel GPU üzerinde ek 8/8 Chromium kontrolü, production testi SwiftShader ve Intel GPU üzerinde ayrı ayrı 1/1 başarılı**. Beş yeni browser testi: F4/unsupported, dört sahne piksel eşdeğerliği, WebGL restore, 2D fallback, Canvas kayıp bildirimi. Mevcut yedi browser testi de çalıştırıldı: tam koşu, 10 koşuluk bellek testi, grafik profilleri/localStorage/F3, harita, hareket/ateş/dash ve ölüm/yeniden başlatma. Beş silah, altı düşman, 24 yükseltme, üç biyom/boss ve ekonomi Node/tam koşu kontrolleriyle korunur. Hızlandırılmış QA botu sağlık/hasar/para hilesi kullanmaz; gerçek zamanlı insan oynanışı değildir.

10 koşuluk son bellek kontrolünde 180 oda/30 boss tamamlandı; ısınma sonrası heap aralığı ${soak.steadyHeapRangeBytes} bayt, son−ilk farkı ${soak.lastMinusFirstSteadyBytes} bayttır. Test sınırları aşılmadı; küçük pozitif artış nedeniyle yavaş sızıntı dışlanmış değildir. GPU/native bellek bu testte ölçülmedi. [Yeni bellek kaydı](ignition/regression/memory-soak.json).

Production build başarılı: **${sizes.join("; ")}**. F4 dağıtımda çalışır, DEV QA API'leri production'da yoktur. Overdrive tarihsel kanıtları korunmuş, yeni regresyon çıktıları ECHO_EVIDENCE_DIR ile ignition/regression ve ignition/regression-chrome altında ayrılmıştır. Intel GPU üzerinde de tam koşu ve beş Ignition kontrolü ayrıca çalıştırılmıştır.

## 9. Windows üzerinde yerel test talimatları

1. Proje klasöründe npm ci, ardından npm run dev çalıştırın. http://127.0.0.1:5173 adresini normal Chrome veya Edge'de açın.
2. F4 ile renderer, WebGL2, adaptör, profil/DPR ve çözünürlüğü kaydedin. Bilinmiyor, donanım yok demek değildir; web sayfasının kesin kanıtı yoktur. F3 ile kısa ölçümü izleyin.
3. Ayrı sekmede chrome://gpu veya edge://gpu açın. Graphics Feature Status altındaki Canvas, Compositing, Rasterization, WebGL ve GL_RENDERER/ANGLE satırlarını kaydedin. Intel/NVIDIA/D3D11 ile SwiftShader/llvmpipe ayrımını yapın. Adaptör adı gizliyse tahmin etmeyin. Hiçbir flag, sürücü veya Windows GPU tercihini değiştirmeniz gerekmez.
4. http://127.0.0.1:5173/ignition/index.html açın. Her sahnede iki renderer'ı aynı pencere boyutu ve DPR'de deneyin. Beş saniye ölç ve JSON indir düğmesiyle üç tekrar kaydedin. Sekmeyi öne alın; ölçüm sırasında pencere boyutunu değiştirmeyin. Bu düğme GPU belleği veya CDP donanım doğrulaması yapmaz.
5. Otomatik CDP ölçümü için dev sunucusu açıkken ayrı PowerShell'de npm run gpu:probe çalıştırın. Ardından $env:ECHO_GPU_CHANNEL="chrome" ve npm run gpu:compare çalıştırın; dosyalar docs/ignition/chrome/ altında oluşur. Edge için değer msedge olur. Ortam değişkenini Remove-Item Env:ECHO_GPU_CHANNEL ile kaldırırsanız Playwright yazılımsal referansı çalışır. Yeni ölçümler aynı adları üzerine yazar; geçmiş sonuçları önce başka klasöre kopyalayın.
6. npm test, npm run test:e2e ve npm run test:production regresyonları çalıştırır. npm run build üretim, npm run preview üretim önizlemesidir. Playwright kurulmamış makinede npx playwright install chromium gerekir.

## 10. Açık ve test edilmemiş alanlar

RTX 3050 Ti etkin yolunda performans, başka Intel/AMD/NVIDIA sürücüler, düşük donanım ve mobil WebGL uyumu ölçülmedi. Uzun süreli GPU/native bellek ve gerçek sürücü reseti test edilmedi. Browser ana thread görev süresi dışındaki process CPU/GPU kullanım yüzdeleri alınmadı. İnsanla görsel kalite/renk/piksel hassasiyeti kontrolü sınırlıdır; dört donmuş kare tüm oyunun görsel eşdeğerliğini kanıtlamaz. WebGL2 tam oyuna port edilmedi, çünkü bu ölçümler bu maliyeti haklı çıkarmıyor.

## Kaynaklar

- [Chromium SwiftShader dokümanı](https://chromium.googlesource.com/chromium/src/+/main/docs/gpu/swiftshader.md): yazılımsal grafik yolu ile donanım ayrımı ve unsafe fallback uyarısı.
- [Khronos context loss rehberi](https://wikis.khronos.org/webgl/HandlingContextLost): bağlam geri geldiğinde kaynakları yeniden oluşturma.
- [Khronos WEBGL_lose_context](https://registry.khronos.org/webgl/extensions/WEBGL_lose_context/): kayıp/geri yükleme testi.
`;
await writeFile("docs/GPU_ACCELERATION.md", report);
console.log("docs/GPU_ACCELERATION.md written");
