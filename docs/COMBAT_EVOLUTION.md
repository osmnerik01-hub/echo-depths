# ECHO DEPTHS 0.2 — Combat Evolution teslimatı

31 Ekim 2026. Mevcut Vite/Canvas projesi geliştirilmiştir; menü, oda şablonları, render döngüsü ve temel kontroller korunmuştur.

## Uygulanan değişiklikler

- `navigation.js`: gövde yarıçapına göre önbelleklenen 32 piksel grid, sekiz yönlü A*, köşe kesme engeli ve görüş hattıyla yol sadeleştirme.
- `enemies.js`: altı veri tanımı, takip/mesafe/orbit/kuşatma davranışları, saldırı hazırlıkları, separation ve zorluk hesabı.
- `weapons.js`: beş silahın veri tanımları, yaylım üretimi, istatistik hesaplama ve envanter.
- `upgrades.js`: 24 modül, Common/Rare/Epic, ağırlıklı ve tekrarsız seçim, modül başına yığın sınırı.
- `combat.js`: sıralı süpürülmüş çarpışmalar, deliş, sekme, elektrik, alan hasarı, durum etkileri ve öldürme ödülleri.
- Mevcut `game.js`: giriş, koşu/oda yaşam döngüsü ve ekranlar. `renderer.js`: mevcut tesis ve robot çizimlerinin üzerine yeni siluetler ve efektler.

## Silahlar

Tablodaki sayılar yükseltmesiz, kritik olmayan temel değerlerdir. Patlamalar merkezden uzaklaştıkça %55'e kadar azalır.

| Silah | Hasar / aralık | Özellik ve bedeli |
| --- | --- | --- |
| Pulse Pistol | 24 / 0,22 sn | Başlangıç silahı, tek hedef ve hassas atış |
| Scatter Cannon | 7 × 13 / 0,70 sn | Geniş yayılım, kısa ömürlü saçma; yakın mesafede güçlü |
| Rail Lance | 100 / 1,10 sn | Dört ek hedefi deler; yavaş atış, uzun ışık izi |
| Arc Blaster | 29 / 0,50 sn | Yakındaki iki hedefe %55 zincir hasarı; sınırlı menzil |
| Nova Launcher | 62 / 1,15 sn | 105 piksel alan, 340 piksel/sn mermi; yavaş seyahat |

Her silah farklı Web Audio frekans zarfı, renk, mermi çizimi, namlu parlaması ve sarsıntı değeri kullanır. İlk dört oda temizliğinde sırasıyla Scatter, Rail, Arc ve Nova kazanılır ve yeni silah kuşanılır. Q/Tab envanteri döndürür; 1–5 kazanılmış silahı seçer. Ölümde envanter Pulse'a döner.

## Düşmanlar ve denge

Tracker, Sentry ve Guardian korunmuştur. Specter hızlı ve kırılgandır; orbit hareketinden mor izli saldırıya geçer (0,55 sn hazırlık). Bulwark yüksek canlıdır, yavaş döner ve ön 120 derecelik kalkanında hasarı %75 azaltır; 0,95 sn hazırlıktan sonra beşli yaylım yapar. Swarmer küçük gövdelerle üçlü doğum dizileri oluşturur, farklı kuşatma açılarını kullanır ve 0,28 sn hazırlıklı kısa sıçrama yapar.

Oda 1 yalnızca Tracker; oda 2 Sentry; oda 3 Guardian; oda 4 Specter; oda 5 Swarmer; oda 6 Bulwark tanıtır. Toplam tehdit en çok 22, eşzamanlı düşman en çok 12. Can ölçeği oda ve oyuncunun hasar/modül gücüyle sınırlı artar; düşman hızı odalarla sınırsız büyümez. Doğumda en az 330 piksel oyuncu mesafesi, duvar/düşman boşluğu ve erişilebilirlik denetlenir. Uygun nokta bulunamazsa geçersiz konuma doğum yapılmaz; sonraki doğum zamanında yeniden denenir. Her doğum 0,85 sn görsel hazırlık içerir.

## Yükseltmeler

Common %64, Rare %29, Epic %7 ağırlıkla çekilir. Aynı ekranda tekrarlı modül bulunmaz; azami yığına ulaşan modüller havuzdan çıkar. İlgili nadirlik tükenmişse kalan havuz kullanılır. Tüm havuz tükenirse tam onarım ve devam seçeneği sunulur.

24 modül: Plazma çekirdeği, Hızlandırıcı devre, Onarım protokolü, Faz kapasitörü, Servo motor, Manyetik ray, Odak merceği, Hedef analizi, Seramik kaplama, Geri dönüşüm, Faz mermisi, Zayıf nokta, İletken ağ, İyon güçlendirici, Genişleyen nova, Termal yük, Kriyo kapsül, Faz aşırımı, Güvenli faz, Faz boşalması, İkincil süpernova, Yankı yüzeyi, Kesin çözüm, Kırmızı protokol.

Çalışan etkileşimler: kritik + deliş; zincir sayısı + elektrik gücü/menzili; patlama yarıçapı + 0,22 sn gecikmeli %45 ikinci patlama; dash + 1,4 sn geçici hasar; dash patlaması + alan genişlemesi/ikinci patlama. Yanma iki saniye sürer, kriyo 1,5 saniye yavaşlatır. Zincir ve alan hasarı duvar arkasına geçmez. Nova temasında patlar; deliş/sekme diğer mermi türleri içindir.

## Çatışma ve HUD

Normal isabette 14 ms, kritikte 35 ms hit-stop (120 Hz adımlarına yuvarlanır), hasar sayıları ve CRIT işaretleri, parçalanma animasyonu, elektrik yayları, halka patlamalar, duvar parçacıkları ve kontrollü düşük can kenar efekti eklendi. Oyuncu hasarında flaş ve sarsıntı korunur.

HUD aktif silah/yuvalar, temel hasar × saçma, atış hızı, kritik şansı, aktif modüller/yığınlar, can, dash dolumu, oda, skor ve düşman sayısını gösterir. Oda başlangıcında kısa kontrol/tehdit mesajı vardır. Nadirlikler yeşil, mavi ve mor kartlarla ayrılır.

## Yapay zekâ ve performans önlemleri

Açık görüşte arama yapılmaz. Kapalı görüşte yollar yaklaşık 0,55–0,87 sn aralıkla yenilenir; bir simülasyon adımında en fazla bir hareket yol araması yapılır. Doğum doğrulaması ayrıca sınırlı sayıda aday kontrol eder. Gridler oda başına önbelleklenir. Oyuncu duvara yaslandığında büyük gövde en yakın erişilebilir grid noktasına yaklaşır. Yedi saniye erişim bulunamayan düşman güvenli noktaya, yeniden doğum hazırlığıyla taşınır; güvenli nokta yoksa ödülsüz devre dışı kalır. Böylece erişilemeyen tehdit oda akışını kilitlemez.

Sabit 120 Hz simülasyon, sınırlı delta ve DPI, önbellekli zemin, sınırlı efekt/mermi/ses kanalları kullanılır. Separation en çok 12 düşman üzerinde sınırlı çift karşılaştırmasıdır. Geliştirme sürümündeki salt okunur `window.__echoSnapshot()` oyun ve son 600 karenin zaman ölçümlerini döndürür; production build'e dahil edilmez.

## Yapılan doğrulama

- `npm test`: **44/44 geçti**. A*, gerçek hareketle engel aşma, tüm oda şablonları/büyük gövde, separation, erişilemez hedef, doğum güvenliği, beş silah, zincir, alan hasarı, deliş, sekme, kritik, yönlü kalkan, yanma/kriyo, zırh, dash sinerjileri, 24 modül, nadirlik sınırları/dağılımı, oda seçimi, ölüm/yeniden başlama ve koşu temizliği kapsanır.
- Canvas sözleşme testi altı silueti, beş mermiyi, ekranları ve efektleri çizerken sayısal değerleri, gerekli argüman sayılarını ve save/restore dengesini denetler. Bu test piksel çıktısını veya gerçek tarayıcı çizimini doğrulamaz.
- `npm run build`: **başarılı**. JS 40,92 kB (gzip 15,85 kB), CSS 4,62 kB (gzip 1,71 kB).
- `npx playwright test --list`: **iki senaryo başarıyla keşfedildi**. Gerçek tarayıcı çalıştırılmadı; bu sonuç E2E testlerinin geçtiği anlamına gelmez.
- Bağımlılık kurulum denetimi: **0 açık**. Çalışma zamanı bağımlılığı yok; Vite ve Playwright geliştirme bağımlılıklarıdır.

Node v24.14.1 üzerinde seed `20261031` ile 7.200 adım / 60 saniye simülasyon ufku (hit-stop nedeniyle 56,95 sn oyun süresi), en çok 12 düşman ve 20 aktif mermi: ortalama **0,0494 ms**, p95 **0,1373 ms**, p99 **0,4114 ms**, en uzun adım **3,7693 ms**. Süreler simülasyon ve periyodik düşman eklemeyi içerir; Canvas, GPU, gerçek DOM maliyeti ve tarayıcı girişini içermez. **60 FPS doğrulanmadı.** Tek çalıştırma ölçümüdür; cihaz ve koşullara göre değişir.

## Hazır fakat çalıştırılmamış tarayıcı testleri

Önceki tarayıcı önizleme erişimi otomatik onay kapısında reddedilmişti. Bu aşamada bu kısıtlama başka tarayıcı/otomasyon yoluyla aşılmadı; browser kurulumu veya E2E çalıştırılması yapılmadı.

Kullanıcının kendi yetkili ortamında:

```sh
npm ci
npx playwright install chromium
npm run test:e2e
```

Playwright Vite'ı otomatik başlatır. Senaryo 1: menü, hareket, ateş, dash, duraklatma/devam, yüksek DPI/yeniden boyutlandırma, runtime hata toplama ve ekran görüntüleri. Senaryo 2: gerçek düşman hasarıyla ölüm ve arayüzden yeniden başlatma. Çıktılar `test-results/` ve `playwright-report/` içindedir. Tarayıcı senaryoları yalnızca kullanıcı tarafından başlatılmak üzere hazırlanmıştır.

## Bilinen sınırlamalar ve sonraki aşama

Otomatik testlerde açık kalan hata yoktur; gerçek tarayıcıda görsel kalite, ses dengesi, uzun süreli oynanış ve performans QA tamamlanmamıştır. Separation sert düşman çarpışması değildir; sıkışık gruplarda kısmi örtüşme olabilir. A* statik oda duvarlarını kullanır; hareketli engeller için grid geçersizleştirme gerekir. Yol bulunamaması için güvenlik taşıması tasarlanmış bir kurtarma davranışıdır; tam taktiksel AI değildir. Odalar hâlâ dört şablondur; harita grafiği, boss, kalıcı ilerleme ve kayıt yoktur.

Sonraki aşama önerileri: önce izinli tarayıcı QA ve uzun koşu denge testi; ardından seed'li oda grafiği/kapı geçişleri, boss durum makineleri, silah animasyon atlasları, miks kanalları ve sürümlü kalıcı ilerleme. Bunlar bu teslimatta uygulanmamıştır.
