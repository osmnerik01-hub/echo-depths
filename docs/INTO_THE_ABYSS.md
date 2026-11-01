# ECHO DEPTHS 0.3 — Into the Abyss

Üçüncü geliştirme aşamasının mevcut proje üzerinde tamamlanan entegrasyon raporu. Tarih: 31 Ekim 2026.

## Tamamlanan sistemler

- Ana menü → üç biyom → üç boss → özel zafer sahnesi → gerçek koşu istatistikleri akışı çalışır. Her biyomda altı oda ziyaret edilir; tam koşu 18 odadır.
- Aynı seed aynı grafiği üretir. Seed menüden girilebilir; boş bırakıldığında yeni seed oluşturulur. Sonuç ekranında aynı seed veya yeni seed ile yeniden başlama vardır.
- TAB haritası, dallanan/birleşen bağlantılar, mevcut konum, ziyaret/temizlik durumları, keşif sisi, boss işareti ve geçerli rota seçimi tamamlandı. Q ve 1–5 silah değiştirmeye devam eder. Harita açıkken çatışma ve cooldown süreleri donar.
- Normal/elit çatışma, hazine, ücretsiz tamir, mağaza ve boss odaları bağlandı. Biten oda bir kez ödüllendirilir. Özel oda işlemleri ve mağaza ürünleri tekrar kullanılamaz.
- Scrap kazanma, harcama ve koşu sıfırlaması; silah, modül, iyileşme ve süreli hasar güçlendirmesi satın alma çalışır.
- Beş silah, altı normal düşman, A*, 24 yükseltme ve üç nadirlik korundu. Eski 44 test kaldırılmadı; TAB ve ödül sonrası rota seçimi beklentileri yeni tasarıma uyarlandı.
- Boss girişlerinde kısa zoom ve sinematik şeritler; faz geçişleri, saldırı uyarıları, büyük özel siluetler, özel sesler/ölüm efektleri, boss can barı ve zafer ödülleri eklendi.
- Biyom/oda verisi, boss denetleyicileri, ekonomi ve yeni ekran üreticileri ayrı modüllerdedir. Geliştirme QA denetleyicisi production çıktısından çıkarılır.

## Üç biyom

| Bölge | Görsel ve işitsel sunum | Oynanış |
| --- | --- | --- |
| The Forgotten Labs | Lacivert/camgöbeği zemin, kırık konsollar, hareketli hologram çizgileri ve kıvılcımlar; düşük laboratuvar tonu | Başlangıç düşmanlarından kademeli öğretim |
| The Rusted Foundry | Turuncu/kırmızı metal, erimiş metal kanalları, hareketli pistonlar, buhar; daha kalın endüstriyel ortam tonu | Önceden işaretlenen döngüsel buhar/ısı alanları |
| The Void Core | Mor/siyah/pembe, enerji çatlakları, dönen bozulmuş yapılar ve farklı ışık; uyumsuz çekirdek tonu | Daha tehlikeli düşman birleşimleri ve enerji yarıkları |

Çevre tehlikelerinin uyarı süresi 1,25 saniyedir; tehlike alanları arenanın küçük bir kısmını kaplar. Dekoratif kanallar ile hasar veren, işaretli vent/yarık alanları ayrı çizilir. Ortam sesleri Web Audio ile sentezlenen temel katmanlardır.

## Üç boss

| Boss | Temel can | Saldırılar | Fazlar |
| --- | --- | --- | --- |
| SENTINEL-01 | 1.600 | Önceden gösterilen lazer taraması, radyal mermiler, genişleyen şok dalgası | %60 ve %28 can eşikleri; daha yoğun radyal yaylım ve daha kısa bekleme |
| The Iron Tyrant | 2.400 | İşaretli alana düşen mühimmat, dönen iki mekanik kol, kısa menzilli ezme, geçici cüruf alanları | %55 ve %25; daha fazla alan tehdidi ve daha hızlı saldırı döngüsü |
| The Hollow Mind | 3.200 | 3/4/5 kollu spiral, enerji ışınları, geçici holografik kopyalar, geçici arena sütunları ve enerji bölgeleri | %67 ve %34; üç faz, son fazda daha yoğun spiral ve üçüncü kopya |

Boss canı oyuncunun hasar gücüne göre en fazla %25 ek ölçeklenir. Faz geçişi 1,15 saniye sürer; düşman mermileri temizlenir, saldırı kesilir ve boss kısa süre korunur. Tehdit uyarıları saldırı çizgilerini/alanlarını gösterir. Lazer ve kolların hasarı çizilen kalınlıkla, şok dalgası ise genişleyen halkayla hesaplanır. Arena sütunları oyuncunun üzerinde oluşturulmaz; saldırı, faz değişimi veya ölümde temizlenir.

Her boss bir kez skor, Scrap ve gövde ödülü verir. İlk iki boss sonrası modül seçilip sonraki biyoma geçilir. Son boss sonrası özel animasyonlu sinyal sahnesi ve sonuç ekranı açılır. Skor, temizlenen odalar, normal düşmanlar, boss'lar, gerçek verilen hasar, gerçekten ateşlenen silahlar, oyun süresi ve seed gösterilir. Fazla hasar istatistiğe eklenmez; ölüm/zafer sonrası istatistikler donar.

## Harita algoritması

Her biyom 6 katman ve 11 aday odadan oluşan yönlü, döngüsüz bir grafiktir. Katman genişlikleri `1 → 2 → 3 → 2 → 2 → 1` şeklindedir. Komşu katmanlara zorunlu bağlantılar eklenerek her odanın başlangıçtan erişilmesi ve boss'a devam edebilmesi sağlanır. Sonra seed'li ek bağlantılar dallanma/birleşmeleri değiştirir. Düzen seçimi ve bazı özel oda türleri de seed'lidir.

İkinci çatışma katmanından hazine ve tamir alternatiflerine erişim garanti edilir. Her grafikte mağaza ve belirgin son boss bulunur. Seçilen rota tek yönlüdür; bitmiş odalara geri dönülerek ödül tekrarlanamaz. Keşfedilmemiş oda içerikleri gizlenir. Her biyomdaki 11 aday odadan 6'sı ziyaret edildiği için üç biyomda 33 aday oda / 18 ziyaret vardır.

Grafik, oda çatışması, ödül ve mağaza RNG akışları ayrı seed'lerden türetilir. Görsel parçacıklar/ışıklar bu akışları tüketmez; çizim sıklığı harita deterministikliğini değiştirmez.

## Ekonomi

Normal düşmanlar tipe göre 3–8 Scrap verir. Savaş odası temizliği 25, elit temizliği 60 Scrap; hazine ayrıca 45 Scrap verir. Boss'lar biyoma göre 100/140/180 Scrap verir. Para yalnızca mevcut koşuda kalır.

İlk biyomda örnek fiyatlar: silah 75, Common/Rare/Epic modül 40/65/100, 40 can onarımı 30, 45 saniye +%25 hasar hücresi 45 Scrap. Sonraki biyomlarda ürün fiyatı `1 + biyomIndex × 0,75` ile ölçeklenir; silahın temel fiyatına ayrıca biyom başına 20 eklenir. Yetersiz para, satılmış ürün, yinelenen silah ve tam canda onarım satın alımı reddedilir. Süreli hücre harita/mağaza açıkken tükenmez.

## Testler ve kabul doğrulaması

| Kontrol | Sonuç |
| --- | --- |
| Başlangıçtaki 44 test | Entegrasyondan önce tamamı geçti |
| Güncel Node testleri | **66/66 geçti** |
| Seed grafikleri | **500 seed × 3 biyom = 1.500 grafikte** bağlantı, erişim, boss ve özel oda garantileri geçti |
| Tam koşu simülasyonu | `ABYSS-07` ve `ECHO-DEPTHS`: 18 oda, üç boss ve zafer; sağlık/hasar/para hilesi yok |
| Geliştirme Chromium testleri | **5/5 geçti**: ilk sürüm kontrolleri, ölüm/yeniden başlama, TAB/sis, tam koşu ve gerçek zamanlı kare ölçümü |
| Production Chromium testi | **1/1 geçti**: build açılışı, oyun/HUD, harita, ateş/dash/duraklatma; QA API'leri yok |
| Production build | **Başarılı**; JS 69,85 kB / gzip 25,92 kB, CSS 8,23 kB / gzip 2,73 kB |
| Dağıtımda QA işaretleri | `__echoSnapshot`, `__echoQA` ve QA bot işaretleri bulunmadı |
| Bağımlılık denetimi | Kurulum denetiminde 0 açık; çalışma zamanı bağımlılığı yok |

Eski mermi, silah, kritik/deliş/sekme, zincir, patlama, yükseltme, yol bulma ve dash testleri geçmeye devam eder. Yeni testler ekonomi, özel oda tekrar koruması, boss desenleri/fazları, geçici arena temizliği, harita duraklatması, biyom geçişi, terminal istatistikleri ve yeni koşu temizliğini kapsar. Canvas sözleşme testi üç biyomun ve tüm boss saldırılarının uyarı/aktif çizimlerini de çalıştırır.

Tarayıcıdaki tam koşu için geliştirme sürümünde `?qa` ile etkinleşen denetleyici normal hareket, nişan, mermi, dash ve hak edilmiş ödülleri kullanır. Bazı süreler hızlandırılarak simüle edilir; boss canı, oyuncu canı, hasar ve para değiştirilmez. Temel kontrol/ölüm testi gerçek klavye-fare olaylarını kullanır. Bu doğrulamalar manuel oyuncu denge testinin yerine geçmez.

## Gerçek ekran görüntüleri ve kanıtlar

Chromium başarılı şekilde çalıştı; görüntüler gerçek Canvas ve DOM çıktısından alındı. Üretilmiş görsel veya tasarım maketi kullanılmadı.

- [Ana menü](screenshots/menu.png)
- [Normal savaş](screenshots/combat.png)
- [Yükseltme](screenshots/upgrade.png)
- [Harita](screenshots/map.png)
- [SENTINEL-01](screenshots/boss-sentinel.png)
- [Iron Tyrant](screenshots/boss-tyrant.png)
- [Hollow Mind](screenshots/boss-hollow.png)
- [Zafer](screenshots/victory.png)

Makine tarafından kaydedilen sonuçlar: [tam tarayıcı koşusu](validation/browser-run.json), [gerçek zamanlı kare ölçümü](validation/browser-performance.json). Tam koşu JSON'undaki kare süreleri hızlandırma beklemelerini de içerir; performans için ayrı gerçek zamanlı ölçüm dosyası kullanılmalıdır.

## Açık kalan / yarım kalan kalite hedefleri

İstenen temel harita, biyom, boss, mağaza ve zafer entegrasyonlarında yarım kalan bir akış yoktur. **60 FPS hedefi bu ortamda karşılanmadı.** Headless Chromium, 1280×800 CSS piksel / DPR 2 / Hollow Mind çatışması örneğinde 182 karede ortalama 42,50 ms (~23,53 FPS), p95 50,10 ms ve JS simülasyon/çizim komutu CPU ortalaması 0,797 ms ölçüldü. Önceki örnekler de yaklaşık 21–26 FPS aralığındaydı. Bu tek ortama ve kısa örneğe özgüdür; düşük CPU süresi tek başına GPU/kompozitör performansını kanıtlamaz.

Statik vignette önbelleğe alındı; sürekli arka plan bulanıklığı kaldırıldı. Fizik 120 Hz sabit adım, sınırlı delta, mermi temas sırası ve sınırlı efekt sayısıyla korunur. Buna rağmen 60 FPS tamamlandı olarak işaretlenmemiştir.

Diğer bilinen sınırlar: separation sert düşman çarpışması değildir; yoğun gruplarda örtüşme olabilir. Normal odalar hâlâ dört engel şablonunu kullanır; çeşitlilik bağlantı, tür, biyom, içerik ve seed'den gelir. Ortam sesleri temel sentez katmanlarıdır. Kalıcı ilerleme ve kayıt bu aşamanın kapsamında değildir.

## Test edilmemiş veya tamamlanmamış doğrulamalar

- Firefox, Safari, mobil/touch ve farklı gerçek GPU'larda performans/uyumluluk matrisi.
- Uzun süreli insan oyuncu testi, tüm seed'lerde oynanış dengesi ve ekonomi ayarı. 1.500 grafik yapısal olarak doğrulandı; her biri oynanarak tamamlanmadı.
- Hoparlör/kulaklık üzerinden manuel ses miks değerlendirmesi.
- 60 FPS'in gerçek masaüstü tarayıcıda doğrulanması.

## Sonraki aşama önerileri

Öncelik gerçek GPU'lu profil ve çizim/kompozitör darboğazının ölçülmesi; ardından insan oyuncularla boss ve ekonomi dengelemesi. Daha sonra ek oda şablonları, biyoma özgü düşman varyantları, atlas animasyonları, ses miks kanalları ve sürümlü kalıcı ilerleme önerilir. Bu öneriler uygulanmış özellik olarak sayılmamıştır.

## Çalıştırma

```sh
npm ci
npm run dev
npm test
npm run test:e2e
npm run test:playthrough -- ABYSS-07
npm run test:production
```

Yeni bir makinede Playwright için önce `npx playwright install chromium` gerekir. `npm run build` çıktısı `dist/` içindedir; `npm run preview` üretim çıktısını sunar. Test sunucuları test sonunda kapatılır.
