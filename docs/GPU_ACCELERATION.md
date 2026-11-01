# ECHO DEPTHS 0.5 — Project Ignition: Hardware Acceleration

Tarih: 1 Kasım 2026. Yeni oyun içeriği eklenmedi. Son teknik karar: **oyunda optimize Canvas 2D korunuyor; WebGL2 ayrı bir araştırma prototipi olarak kalıyor.** Donanım GPU erişimi sistem Chrome/Edge üzerinde doğrulandı. Playwright headless-shell ise hâlâ yazılımsal SwiftShader kullanıyor. Bu iki ortamın sonuçları karıştırılmadı.

## 1. Tespit edilen grafik altyapısı

İşletim sistemi: **Microsoft Windows 11 Pro, 10.0.26300, 64 bit**. Node v24.14.1. Windows WMI adaptörleri:

- NVIDIA GeForce RTX 3050 Ti Laptop GPU; sürücü 32.0.16.1047; durum OK.
- Intel(R) UHD Graphics; sürücü 30.0.101.1340; durum OK.

AdapterRAM WMI sayacı paylaşımlı/ayrılmış toplam VRAM için güvenilir bir ölçüm değildir; performans belleği olarak kullanılmadı. İşletim sisteminin bir GPU listelemesi, tarayıcının o GPU'yu kullandığını kanıtlamaz.

| Tarayıcı | Etkin grafik yolu | Canvas / raster / kompozisyon | WebGL2 | Donanım sonucu |
|---|---|---|---|---|
| Playwright headless-shell 156.0.8078.4 | ANGLE / SwiftShader Vulkan | unavailable_software / disabled_software / disabled_software | Oluşturulabildi | Yazılımsal; gerçek GPU değil |
| Sistem Chrome 156.0.8078.79 | Intel UHD / ANGLE / D3D11 | enabled / enabled / enabled | Oluşturulabildi | CDP ve WebGL adaptörüyle donanım yolu doğrulandı |
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
| Boş oda | 0 | 0 | 0 | 2 | 6 |
| Normal savaş | 6 | 24 | 60 | 8 | 102 |
| Kalabalık savaş | 12 | 80 | 180 | 14 | 290 |
| Boss savaşı | 1 | 120 | 240 | 10 | 375 |

Toplam ayrıca oda, iki ortak atmosfer katmanı ve oyuncuyu içerir. Boş odada oyuncu/atmosfer vardır. Boss sahnesi Hollow Mind atlasını kullanır. Bu **render-only sentetik prototiptir**; AI, HUD, gerçek boss faz animasyonu, tehlike geometrisi, tüm silah/biome efektleri burada yürütülmez. Atlas siluetleri paylaşılır ama tam oyunun tüm zamanlara yayılmış görsel eşdeğerliği iddia edilmez.

2560×1600 donmuş t=2 saniye kareleri piksel karşılaştırmasıyla doğrulandı (her iki pikselde örnek; RGB 0–255):

| Sahne | Ortalama mutlak RGB farkı | Herhangi RGB kanalında >16 fark olan piksel | WebGL hata |
|---|---:|---:|---:|
| Boş oda | 0,1297 | %0,000 | 0 |
| Normal savaş | 0,1827 | %0,000 | 0 |
| Kalabalık savaş | 0,2496 | %0,000 | 0 |
| Boss savaşı | 0,2354 | %0,000 | 0 |

Intel GPU üzerinde aynı piksel testi de tekrarlandı: ortalama RGB farkları Boş oda 0,0035; Normal savaş 0,0101; Kalabalık savaş 0,0183; Boss savaşı 0,0174. [Intel piksel ölçümü](ignition/chrome/visual-equivalence.json). Filtreleme/yuvarlama farkları vardır. Bu kare testi bir HDR/color-management veya bütün animasyonların kalite onayı değildir. Görseller [yazılımsal seri](ignition/screenshots) ve [Chrome serisi](ignition/chrome/screenshots) içindedir. WebGL bağlam kaybı testte WEBGL_lose_context ile tetiklendi; yeniden oluşturulan shader, buffer, VAO ve texture'larla çizim sürdü. Bağlam oluşturulamıyorsa yeni Canvas üzerinden 2D fallback çalışır.

## 5. Eş koşullu performans karşılaştırması

Her backend ve sahne için **3 tekrar × 5 saniye**, 1 saniye ısınma; sıralama tekrarlar arasında ters çevrilir. 1280×800 CSS, DPR2, gerçek 2560×1600, HIGH atlas, aynı obje/efekt sayısı kullanılır. Tablolar her metriğin üç tekrarının medyanıdır. Ortalama FPS 1000/ortalama kare aralığı, medyan FPS 1000/medyan kare aralığıdır. rAF frame-pacing ölçülür; görüntü sunum hızı veya saf GPU throughput değildir. Ekran yenilemesi, compositor, güç ve arka plan yükü etkiler; termal/frekans kilidi yoktur. Üç tekrar istatistiksel anlamlılık kanıtı değildir; tek tek tekrarlar aşağıdadır. Chrome ve headless-shell farklı browser buildleridir; aralarındaki fark yalnız GPU aç/kapat etkisine indirgenmez.

### Intel UHD / sistem Chrome — gerçek donanım yolu

| Sahne | Canvas ort. FPS | WebGL ort. FPS | Canvas medyan FPS | WebGL medyan FPS | Canvas P95 ms | WebGL P95 ms | Ort. FPS farkı |
|---|---:|---:|---:|---:|---:|---:|---:|
| Boş oda | 129,64 | 126,02 | 142,86 | 142,86 | 13,90 | 13,90 | -2,8% |
| Normal savaş | 119,63 | 115,16 | 142,86 | 142,86 | 13,90 | 13,90 | -3,7% |
| Kalabalık savaş | 112,49 | 106,85 | 142,86 | 142,86 | 13,90 | 14,00 | -5,0% |
| Boss savaşı | 114,88 | 107,45 | 142,86 | 142,86 | 13,90 | 14,00 | -6,5% |

| Sahne | Canvas tekrar FPS | WebGL tekrar FPS |
|---|---|---|
| Boş oda | 123,62 / 131,02 / 129,64 | 115,52 / 126,02 / 130,20 |
| Normal savaş | 114,48 / 122,60 / 119,63 | 115,16 / 114,44 / 117,20 |
| Kalabalık savaş | 107,70 / 112,49 / 115,32 | 95,53 / 106,85 / 114,20 |
| Boss savaşı | 115,40 / 114,88 / 109,65 | 118,96 / 107,45 / 106,85 |

| Sahne | Renderer | Render JS ms/kare | Sahne JS ms/kare | Ana iş parçacığı görev ms/sn | Script ms/sn | Canlı JS heap MiB | GC sonrası başlangıç MiB |
|---|---|---:|---:|---:|---:|---:|---:|
| Boş oda | canvas | 0,225 | 0,025 | 158,69 | 45,66 | 2,285 | 2,134 |
| Boş oda | webgl | 0,239 | 0,025 | 164,17 | 50,68 | 2,374 | 2,165 |
| Normal savaş | canvas | 0,662 | 0,050 | 299,78 | 102,18 | 2,681 | 2,177 |
| Normal savaş | webgl | 0,315 | 0,064 | 168,67 | 60,17 | 2,372 | 2,211 |
| Kalabalık savaş | canvas | 1,704 | 0,095 | 529,09 | 212,67 | 2,626 | 2,203 |
| Kalabalık savaş | webgl | 0,501 | 0,109 | 193,53 | 79,26 | 2,914 | 2,279 |
| Boss savaşı | canvas | 2,145 | 0,117 | 634,13 | 276,77 | 2,636 | 2,217 |
| Boss savaşı | webgl | 0,362 | 0,088 | 152,37 | 63,12 | 2,484 | 2,309 |

Intel kalabalık sahnede JS render gönderimi Canvas için 1,704 ms, WebGL için 0,501 ms idi. Batching komut gönderim maliyetini düşürdü, fakat kare hızına aynı yönde yansımadı. GPU yürütme sayacı alınmadığından farkı tek başına shader, fill-rate veya kompozisyon maliyetine atamıyoruz.

### SwiftShader / headless-shell — yazılımsal kontrol

| Sahne | Canvas ort. FPS | WebGL ort. FPS | Canvas medyan FPS | WebGL medyan FPS | Canvas P95 ms | WebGL P95 ms | Ort. FPS farkı |
|---|---:|---:|---:|---:|---:|---:|---:|
| Boş oda | 22,55 | 11,84 | 20,04 | 12,00 | 66,70 | 116,60 | -47,5% |
| Normal savaş | 14,70 | 10,44 | 12,00 | 10,00 | 100,00 | 116,60 | -29,0% |
| Kalabalık savaş | 10,40 | 8,75 | 10,00 | 8,58 | 133,40 | 133,40 | -15,9% |
| Boss savaşı | 9,80 | 9,40 | 8,58 | 10,00 | 150,00 | 133,40 | -4,1% |

| Sahne | Canvas tekrar FPS | WebGL tekrar FPS |
|---|---|---|
| Boş oda | 20,00 / 22,88 / 22,55 | 11,84 / 12,48 / 11,35 |
| Normal savaş | 14,30 / 14,70 / 14,75 | 9,83 / 10,71 / 10,44 |
| Kalabalık savaş | 9,40 / 11,48 / 10,40 | 8,46 / 8,75 / 9,15 |
| Boss savaşı | 9,40 / 9,80 / 10,84 | 8,63 / 9,40 / 10,80 |

| Sahne | Renderer | Render JS ms/kare | Sahne JS ms/kare | Ana iş parçacığı görev ms/sn | Script ms/sn | Canlı JS heap MiB | GC sonrası başlangıç MiB |
|---|---|---:|---:|---:|---:|---:|---:|
| Boş oda | canvas | 0,115 | 0,022 | 999,10 | 4,15 | 2,358 | 2,048 |
| Boş oda | webgl | 0,112 | 0,026 | 999,49 | 2,56 | 2,570 | 2,062 |
| Normal savaş | canvas | 0,544 | 0,025 | 999,31 | 9,17 | 2,680 | 2,086 |
| Normal savaş | webgl | 0,268 | 0,047 | 999,56 | 4,07 | 2,451 | 2,162 |
| Kalabalık savaş | canvas | 1,304 | 0,047 | 999,66 | 14,85 | 2,471 | 2,118 |
| Kalabalık savaş | webgl | 0,393 | 0,079 | 999,63 | 5,01 | 2,570 | 2,312 |
| Boss savaşı | canvas | 1,769 | 0,076 | 999,68 | 18,11 | 2,470 | 2,133 |
| Boss savaşı | webgl | 0,453 | 0,111 | 999,59 | 5,72 | 2,333 | 2,380 |

CPU sütunları: render JS, draw fonksiyonunun performance.now duvar süresidir (driver beklemesini içerebilir); sahne JS aynı basit animasyon güncellemesidir. CDP TaskDuration/ScriptDuration farkı ölçüm penceresindeki ana renderer-thread görev/script ms/sn değeridir; bütün işlem/sistem CPU yüzdesi değildir. İç içe kategoriler toplanmaz. GPU süreç CPU'su ve gerçek GPU yürütme zamanı ölçülmedi. HeapUsed canlı JS örneği, heapBefore zorlanmış GC sonrasıdır; iki farklı örnekleme anını leak kanıtı olarak kullanmayın.

**GPU belleği:** doğrudan güvenilir Web API/CDP per-context GPU bellek sayacı elde edilmedi; Bilinmiyor. İki RGBA8 texture'ın taban texel kapasitesi yaklaşık **31,625 MiB** (2560×1600 oda + 2048×2048 atlas); bu ölçülmüş VRAM değildir. Framebuffer, sürücü, staging ve kaynak Canvas kopyaları buna dahil değildir. Vertex çalışma alanı 491520 bayttır. Bellek raporundaki JS heap bu native tahsisleri kapsamaz.

Ham kanıtlar: [SwiftShader raw](ignition/raw.json), [SwiftShader özet](ignition/comparison.json), [Intel raw](ignition/chrome/raw.json), [Intel özet](ignition/chrome/comparison.json). İlk geliştirme sırasında Vite kaynak yenilemesinden etkilenen kısmi seri partial-discarded-hmr.json olarak ayrıldı; tablolarda kullanılmadı. Son ölçümler sırasında oyun/prototip kaynakları sabit tutuldu, regresyon testleri aynı anda çalıştırılmadı.

## 6. Mevcut tam Canvas renderer'ın donanım kontrolü

Ayrı bir doğrulamada eski Overdrive fixture'ının **mevcut oyun renderer'ı** sistem Chrome / Intel UHD üzerinde HIGH/DPR2 ile dört sahnede ölçüldü. Bu tek tekrarlı, CDP trace/profil ek yükü içeren kontrol, yukarıdaki render-only üç tekrarlı seriyle karıştırılmaz.

| Sahne | Ortalama FPS | Ortalama kare ms | P95 kare ms | Render JS ms/çağrı | Update JS ms/çağrı |
|---|---:|---:|---:|---:|---:|
| Boş oda | 124,26 | 8,05 | 13,90 | 0,554 | 0,107 |
| Normal savaş | 111,31 | 8,98 | 13,90 | 0,992 | 0,279 |
| Kalabalık savaş | 90,68 | 11,03 | 14,00 | 1,373 | 0,382 |
| Boss savaşı | 100,80 | 9,92 | 14,00 | 0,996 | 0,250 |

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

10 koşuluk son bellek kontrolünde 180 oda/30 boss tamamlandı; ısınma sonrası heap aralığı 211864 bayt, son−ilk farkı 211864 bayttır. Test sınırları aşılmadı; küçük pozitif artış nedeniyle yavaş sızıntı dışlanmış değildir. GPU/native bellek bu testte ölçülmedi. [Yeni bellek kaydı](ignition/regression/memory-soak.json).

Production build başarılı: **js 82,36 kB (gzip 30,20 kB); css 8,87 kB (gzip 2,93 kB)**. F4 dağıtımda çalışır, DEV QA API'leri production'da yoktur. Overdrive tarihsel kanıtları korunmuş, yeni regresyon çıktıları ECHO_EVIDENCE_DIR ile ignition/regression ve ignition/regression-chrome altında ayrılmıştır. Intel GPU üzerinde de tam koşu ve beş Ignition kontrolü ayrıca çalıştırılmıştır.

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
