import {readFile,writeFile,readdir} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
const read=async name=>JSON.parse(await readFile(name,'utf8'));
const comparison=await read('docs/overdrive/comparison.json'),soak=await read('docs/overdrive/memory-soak.json');
const initialBefore=await read('docs/overdrive/before.json'),initialAfter=await read('docs/overdrive/after.json');
const live=await read('docs/overdrive/full-run-performance.json'),run=await read('docs/overdrive/full-run.json');
const raw={before:[],after:[]};for(const phase of Object.keys(raw))for(let i=1;i<=3;i++)raw[phase].push(await read(`docs/overdrive/${phase}-final-r${i}.json`));
const labels={empty:'Boş oda',normal:'Normal savaş',crowd:'Kalabalık savaş',boss:'Boss savaşı'};
const f=(v,n=2)=>v.toFixed(n).replace('.',','),mib=v=>f(v/1048576,3),median=a=>a.sort((a,b)=>a-b)[Math.floor(a.length/2)];
const fpsTable='| Sahne | Önceki medyan FPS | Yeni medyan FPS | İyileşme |\n|---|---:|---:|---:|\n'+comparison.rows.map(r=>`| ${labels[r.scene]} | ${f(r.before.fps)} | ${f(r.after.fps)} | +%${f(r.changePercent,1)} |`).join('\n');
const latencyTable='| Sahne | Ortalama ms | P50 ms | P95 ms | P99 ms | >50 ms kare / 5 sn |\n|---|---:|---:|---:|---:|---:|\n'+comparison.rows.map(r=>'| '+labels[r.scene]+' | '+['meanMs','p50Ms','p95Ms','p99Ms'].map(k=>`${f(r.before[k])} → ${f(r.after[k])}`).join(' | ')+` | ${r.before.longFrames50} → ${r.after.longFrames50} |`).join('\n');
const heapTable='| Sahne | Önce JS heap MiB | Sonra JS heap MiB | Fark MiB | Fark |\n|---|---:|---:|---:|---:|\n'+comparison.rows.map(r=>`| ${labels[r.scene]} | ${mib(r.before.heapUsed)} | ${mib(r.after.heapUsed)} | +${mib(r.after.heapUsed-r.before.heapUsed)} | +%${f((r.after.heapUsed/r.before.heapUsed-1)*100,1)} |`).join('\n');
const categories=[['Canvas çizim komutları','render','crowd'],['Oyun güncellemesi','update','crowd'],['Düşman AI','ai','crowd'],['A* yol bulma','astar','crowd'],['Görüş hattı','lineOfSight','crowd'],['Parçacık güncellemesi','particles','crowd'],['Mermi integrasyonu','bulletIntegration','boss'],['Çarpışma kontrolleri','collisionChecks','boss'],['Toplam mermi/hasar işleme','bulletPhysicsCollision','boss'],['HUD','hud','crowd'],['Glow komutları','lights','crowd'],['Gölge geometrisi','shadowGeometry','crowd'],['Boss saldırı hesapları','boss','boss']];
const cpu=(phase,scene,key)=>{const a=raw[phase].map(r=>r.results.find(s=>s.scene===scene)).filter(r=>r.cpuCalls[key]>0).map(r=>r.cpuTotalsMs[key]/r.cpuCalls[key]);return a.length?f(median(a),4):'Çalışmadı';};
const cpuTable='| Alt sistem | Sahne | Önce ms/çağrı | Sonra ms/çağrı |\n|---|---|---:|---:|\n'+categories.map(([name,key,scene])=>`| ${name} | ${labels[scene]} | ${cpu('before',scene,key)} | ${cpu('after',scene,key)} |`).join('\n');
const initialTable='| Sahne | İlk temel ölçüm FPS | İlk optimizasyon ölçümü FPS |\n|---|---:|---:|\n'+initialBefore.results.map(b=>`| ${labels[b.scene]} | ${f(b.fps)} | ${f(initialAfter.results.find(a=>a.scene===b.scene).fps)} |`).join('\n');
const soakTable='| Tam koşu | GC sonrası heap MiB | DOM düğümü | Havuzda toplam üretilen | Havuz yeniden kullanım |\n|---|---:|---:|---:|---:|\n'+soak.samples.map(s=>`| ${s.run} | ${mib(s.heapUsed)} | ${s.dom.nodes} | ${s.pool.created} | ${s.pool.reused} |`).join('\n');
const assets=await readdir('dist/assets'),sizes=[];for(const extension of ['.js','.css']){const files=assets.filter(f=>f.endsWith(extension)),data=await Promise.all(files.map(f=>readFile('dist/assets/'+f)));sizes.push(`${extension.slice(1).toUpperCase()}: ${f(data.reduce((s,b)=>s+b.length,0)/1000)} kB / gzip ${f(data.reduce((s,b)=>s+gzipSync(b).length,0)/1000)} kB`);}
const immediate=await read('docs/overdrive/memory-soak-immediate.json');
const steady=soak.samples.slice(2),heapMin=Math.min(...steady.map(s=>s.heapUsed)),heapMax=Math.max(...steady.map(s=>s.heapUsed));
const report=`# ECHO DEPTHS 0.4 — Project Overdrive

Son doğrulama ve teslimat: **1 Kasım 2026**. Bu aşamada yeni düşman, silah, yükseltme, biyom veya oyun mekaniği eklenmedi. Önceki optimizasyonlar korundu; son doğrulama, sınırlı referans temizliği ve teslimat tamamlandı.

## 1. Doğrulanan ortam ve yöntem

Önceki oturumun saklanmış üç tekrarlı ölçümleri kullanıldı; FPS değerleri yeniden tahmin edilmedi. Her sahne için bir saniye ısınmadan sonra beş saniyelik üç örnek alınmıştır. Önce/sonra sırası dönüşümlüdür; tablolar her metriğin üç örneğinin medyanıdır. Örnek sayıları, tekrarlardaki dalgalanma ve ham sayaçlar [comparison.json](overdrive/comparison.json) ile before-final-r1…r3 / after-final-r1…r3 dosyalarında korunur.

- Chromium: **${comparison.chromium}**, headless; viewport **1280 × 800 CSS piksel**, cihaz DPR **2**, karşılaştırma profili **HIGH**, gerçek Canvas **2560 × 1600**.
- Seed **OVERDRIVE-V1**. Boş oda, altı düşmanlı normal savaş, on iki düşmanlı kalabalık savaş, üçüncü faz Hollow Mind sahnesi. Giriş parametreleri ve istenen efekt üretim oranları aynı fixture'dan gelir. Yoğunluk uyarlaması dekoratif parçacıkların gerçek sayısını değiştirebilir; peak sayaçları ham kayıtlardadır. Bunlar ölümsüz/sabit canlı aktörler kullanan sentetik yük sahneleridir; normal kurallı tam koşu testi ayrıdır.
- Son Chromium bellek testinde sürüm, GPU aygıt dizesi, viewport, HIGH ve 2560 × 1600 boyutu eski kayıtlarla **eşleşti**. Node: v24.14.1 / Windows. Arka plan yükü, sıcaklık ve frekanslar kilitlenmemiştir; bütün çalışma koşullarının bit düzeyinde aynı olduğu iddia edilmez.
- GPU: **${comparison.gpu[0].deviceString}**. Bu gerçek donanım GPU'su değil, CPU üzerinde çalışan **SwiftShader / SwANGLE** yazılımsal grafik yoludur.

Araçlar: Chromium DevTools Protocol Tracing, Performance.getMetrics, SystemInfo.getInfo, Memory.getDOMCounters ve GC kontrollü HeapProfiler. Ayrıntılı alt sistem süreleri de performance.now ile ölçülür. Sıkıştırılmış *.trace.json.gz kayıtları açılıp Chrome Performance veya Perfetto ile incelenebilir. İzleme araçlarının ek yükü vardır. İç içe süreler toplanarak toplam kare süresi oluşturulamaz.

## 2. Bulunan darboğazlar: JavaScript ve Canvas/kompozisyon ayrımı

Kare aralığı onlarca milisaniyeyken JavaScript güncellemesi ve Canvas komut gönderimi çok daha kısadır. İlk boş sahnenin beş saniyelik izinde Commit yaklaşık 4906 ms, LayerTreeHost::DoUpdateLayers yaklaşık 4896 ms kapsarken JavaScript render toplamı yaklaşık 39 ms'dir. Commit/DoUpdateLayers iç içe beklemeler içerir; bunlar saf GPU yürütme süreleri değildir ve toplanmaz. Veriler, SwiftShader yolundaki Canvas tamamlanması/katman aktarımı ve kompozitör senkronizasyonunun baskın olduğuna işaret eder; AI veya A* tek başına düşük FPS'i açıklamaz.

CPU komut gönderimini azaltmak yine faydalıdır. Ölçülen alt sistemler aşağıdadır. Her satır medyan **ms/çağrı** değeridir; çizim çağrısı bir render, güncelleme çağrısı bir sabit fizik adımıdır. A*, görüş hattı ve çarpışmalar üst kategorilerle iç içedir. Gölge satırı geometrinin JavaScript komut maliyetidir; ertelenmiş raster maliyeti değildir.

${cpuTable}

## 3. FPS karşılaştırması

**Aynı HIGH / DPR 2 koşullarındaki ayrıntılı üç tekrarlı CDP medyanları:**

${fpsTable}

Kare sürelerinde hücreler **önce → sonra** biçimindedir. Uzun kare eşiği >50 ms'dir; beş saniyedeki mutlak kare sayısı verilir.

${latencyTable}

İlk, daha az alt sistem sarmalayıcısı içeren temel ölçüm de saklanmıştır:

${initialTable}

Bu iki ölçüm serisi birleştirilmez: ayrıntılı gözlem ek yükü ve SwiftShader dalgalanması mutlak FPS'i etkiler. Sonuç yalnızca bu kayıtlı ortamda iyileşme gösterir; gerçek GPU'da aynı yüzdeler vaat edilmez. Normal oyundaki ayrı MEDIUM / DPR 1,5 örneği ${f(live.approxFps)} FPS, ${f(live.frameMeanMs)} ms ortalama ve ${f(live.frameP95Ms)} ms P95 kaydetti. Bu farklı profil, HIGH öncesi/sonrası tablosuna katılmamıştır. **60 FPS doğrulanmadı.**

## 4. Korunan optimizasyonlar ve oynanış düzenlemeleri

- Zemin, sabit dekor, duvar, sabit ışık ve işaretler oda katmanına önceden çizilir. Hareketli konsollar/pistonlar, tehlikeler, aktörler ve saldırı uyarıları ayrı çizilmeye devam eder. Görsel inceleme ve gerçek Chromium ekran görüntüleri yapıldı. Yeni bir OffscreenCanvas iş parçacığı veya oyun motoru eklenmedi.
- Canvas opak bağlam kullanır. Tekrarlanan duvar çizimleri ve büyük statik gradientler kare başına oluşturulmaz. Oda dışı parçacık/mermiler elenir; gölgeler ve ekran efektleri profile göre sınırlanır. Sürekli HUD bulanıklığı kullanılmaz.
- ParticlePool aynı nesneleri ve aktif diziyi yeniden kullanır; 650 nesne üst sınırı vardır. Profil ve sahne yükü dekoratif yoğunluğu azaltır. Kritik saldırı uyarıları bu havuzdan bağımsızdır.
- Navigasyon şişirilmiş duvar sınırlarını, grid noktalarını ve typed-array çalışma alanını yeniden kullanır. Aynı adımda yinelenen görüş hattı kontrolü kaldırıldı. Mevcut yol yenileme aralıkları ve bir adımda tek A* bütçesi korundu. En çok 12 düşman olduğu için yeni spatial hash yerine separation'ın uzak çiftleri kare mesafesiyle elendi.
- Mermilerde swept-AABB broad phase, önbellekli duvar sınırları, yeniden kullanılan temas kayıtları ve tahsis yapmayan slab testi kullanılır. Temas sırası, deliş, sekme ve hızlı mermilerin ince duvar kontrolü korunur.
- HUD bütün DOM ağacını her sayısal değişimde yeniden kurmaz; yapısal değişiklikte kurar, diğer zamanlarda ilgili metin/çubukları günceller. Chromium testi aynı HUD düğümünün bağlı kaldığını doğrular.
- FixedClock 120 Hz fiziği, en çok 50 ms delta / altı adım sınırını ve sekme dönüşü resetini tek yerde tutar. Uzun karede zamanın bir kısmı atılabilir; fizik kararlılığı korunur. Hit-stop, pause ve settings sırasında zaman yönetimi test edildi.
- Oyuncu efektlerden sonra çizilir ve ince görünürlük halkası kullanır. Sarsıntı sınırlandırılmıştır. Dash sırasında hız büyüklüğü korunarak sınırlı yön düzeltmesi yapılabilir. Yeni içerik eklenmemiştir.

## 5. Grafik profilleri, F3 ve kalıcılık

| Profil | Azami DPR | Parçacık oranı / aktif sınır | Glow | Aktör gölgesi | Ekran efekti / sarsıntı |
|---|---:|---:|---|---|---:|
| LOW | 1 | %35 / 180 | Kapalı | Kapalı | %35 / %55 |
| MEDIUM (varsayılan) | 1,5 | %65 / 360 | Azaltılmış | Açık | %70 / %75 |
| HIGH | 2 | %100 / 650 | Tam | Açık | %100 / %100 |

Gerçek DPR cihaz DPR'sini geçmez. Yoğun yükte dekoratif parçacıklar ayrıca seyreltilir. Duvar siluetleri, mermiler ve boss tehlike sınırları her profilde korunur. Ayarlar ana menü ve pause ekranından açılır, localStorage'da saklanır. Erişim engellenirse güvenli MEDIUM varsayılanına dönülür. F3; FPS, ortalama kare süresi, aktif düşman/mermi/parçacık sayısı ve profili gösterir. Ölçüm halkası sabit belleklidir.

## 6. Bellek karşılaştırması ve önbellek yaşam döngüsü

Aşağıdakiler eski üç tekrarlı ölçümden **CDP JSHeapUsedSize medyanlarıdır**. Bunlar geliştirme/ölçüm kodu dahil canlı JavaScript heap örnekleridir; kalıcı retained heap veya native GPU/Canvas belleği değildir. GPU/Canvas yerel belleği bu araçla sayısal olarak ölçülmedi.

${heapTable}

**Toplam canlı heap azaldı denmiyor.** Önbellekler ve yeniden kullanılan çalışma alanları daha çok nesneyi bilerek tutar. Kazanç, kısa ömürlü tahsis ve tekrar hesaplamanın azalmasıdır. Parçacık havuzu karşılaştırmanın sonrasında normal sahnede toplam ${comparison.rows.find(r=>r.scene==='normal').after.pool.created}, kalabalıkta ${comparison.rows.find(r=>r.scene==='crowd').after.pool.created}, boss'ta ${comparison.rows.find(r=>r.scene==='boss').after.pool.created} nesne üretmiştir; bu sayaçlar ısınmayı da içerir. Tam sayaçlar ve yeniden kullanım miktarları ham JSON'dadır.

Önbellek davranışı:

1. Oda katmanı mevcut duvar dizisi, oda numarası ve biyomla eşleştirilir. Aynı oda yeniden çizildiğinde aynı katman kullanılır. Oda/duvar dizisi değiştiğinde yeniden kurulur; geçmiş odaların Canvas katmanlarından oluşan bir liste tutulmaz.
2. Kalite veya ekran boyutu değişikliği roomLayer, floor ve vignette referanslarını geçersiz kılar. Sonraki çizimde yeni çözünürlükte kurulur. Eski katman referansı bırakılır; native kaynakların gerçekten serbest bırakılma anı tarayıcı/GC'ye aittir.
3. Boss arena sütunları duvar dizisini ve Navigation örneğini değiştirir. Saldırı/faz/ölüm temizliğinde temel duvarlar geri gelir, katman da yeni referansa göre yenilenir.
4. Navigasyon önbelleği oda başınadır. Parçacıklar oda/koşu resetinde havuza geri döner; sınırlı havuz sonraki odalar için tutulur.
5. Son kontrolde Combat.reset eklendi: oda geçişinde duvar sınırları ve eski hedef referansları bırakılır; temas kayıt nesneleri boş halde yeniden kullanılır. Bu, yeniden yazım değil, sınırlı referans temizliğidir ve yeni Node testiyle korunur.

## 7. Uzatılmış bellek kontrolü

Yeni Chromium testi **10 tam koşu / 180 oda / 30 boss** tamamladı. Her oda en az bir kez gerçekten çizdirildi; yeniden başlatmadan sonra HIGH/DPR 2 boyutu ve katmanın güncel odayla eşleşmesi denetlendi. Yaklaşık ${f(soak.simulatedSeconds/60,1)} dakikalık **simülasyon** yürütüldü; bu kadar süre duvar saatinde oynanmadı. Her koşu sonrası yeniden başlatılıp oyun duraklatıldı; kısa ömürlü ses/tarayıcı işleri için ${soak.quietPauseMs} ms gerçek zaman beklendikten sonra zorlanmış GC yapıldı ve heap/DOM/havuz sayaçları toplandı.

${soakTable}

İlk iki ısınma koşusu dışarıda bırakıldığında heap ${mib(heapMin)}–${mib(heapMax)} MiB aralığında; aralık ${soak.steadyHeapRangeBytes} bayt, son−ilk farkı ${soak.lastMinusFirstSteadyBytes} bayttır. Beklemesiz ilk kontrolün aynı farkı ${immediate.lastMinusFirstSteadyBytes} bayttı; o kayıt [memory-soak-immediate.json](overdrive/memory-soak-immediate.json) içinde korunur. Duraklama bu küçük artışı gidermedi; kısa ömürlü ses işlerinin tek neden olduğu söylenemez. Pozitif küçük farklar olası yavaş sızıntıyı dışlamaz; retained-object heap snapshot karşılaştırması ve daha uzun test sonraki inceleme adımıdır. Testte 2 MiB aralık, 1 MiB net artış ve 100 DOM düğümü fark sınırları aşılmadı. Bu kısa, hızlandırılmış tekrar testinde belirlenen büyüme sınırları aşılmadı; **saatler süren gerçek zamanlı veya native GPU bellek sızıntısı yoktur** sonucunu kanıtlamaz. [memory-soak.json](overdrive/memory-soak.json) bütün örnekleri içerir.

## 8. Son doğrulama ve kalan işler

Son Node suite'i **78/78**, Chromium regresyon suite'i **7/7**, production tarayıcı testi **1/1** başarılıdır. Beş silah, altı normal düşman, 24 yükseltme, üç biyom/boss, seed haritası, Scrap/mağaza, ölüm, zafer ve koşu istatistikleri korunur. Node testleri iki seed'de tam koşuyu, tarayıcı da ABYSS-07 seed'inde 18 oda/üç boss zaferini yeniden doğruladı. Son normal tarayıcı koşusu ${run.stats.roomsCleared} oda, ${run.stats.bosses} boss ve ${Math.round(run.stats.damage)} gerçek hasar kaydetti. Bellek suite testinin ardından iki saniye duraklama içeren hedefli tekrar da 1/1 geçti; bu tekrar aynı testtir ve yedi test sayısına ikinci kez eklenmedi.

Production build başarılı: **${sizes.join('; ')}**. Production tarayıcı testi oyunu, haritayı, LOW seçimini, kalıcılığı ve F3'ü doğrular; QA API'leri dağıtımda yoktur. Yeni ekran görüntüleri [overdrive/screenshots](overdrive/screenshots) klasöründedir. Önceki sürümün rapor ve verileri korunmuştur.

**Kalan performans sorunları:** HIGH/DPR 2 altında SwiftShader/kompozitör maliyeti ve uzun kareler sürüyor. 60 FPS hedefi karşılandı sayılmıyor. Yeni önbelleklerin toplam native grafik belleği ölçülmedi; kalite/oda değişimindeki katman kurulum maliyeti gerçek cihazda ayrıca profillenmeli. Canlı JS heap artışı bir ödündür. Manuel oynanış dengesi, ses miks değerlendirmesi ve saatler süren soak bu aşamada yapılmadı.

**Gerçek GPU ile yapılacaklar:** donanım hızlandırmasının açık olduğunu ve renderer aygıtını kaydetmek; aynı dört sahneyi HIGH/DPR 2 ve ayrı LOW/MEDIUM profillerinde tekrar ölçmek; 60 FPS/P95/P99 ve uzun kareleri incelemek; browser process/native Canvas/GPU belleğini, çözünürlük değişimlerini ve uzun oyun oturumlarını gözlemek. Bu testler yapılmış gibi raporlanmamıştır.

## Çalıştırma ve kanıtlar

Terminal 1: npm ci ardından npm run dev. Terminal 2: npm run profile:compare. İlk sürümün kontrol kaynağı bench/baseline/src içinde tutulur; yalnızca profil zamanlayıcıları eklenmiştir, production'a girmez. Vite dinamik import uyarıları benchmark yükleme aşamasına aittir. Final ölçüm aktif navigasyon örneğini sarar; Vite HMR kaynaklı modül kimliği farkı A* sayacını devre dışı bırakmaz.

Regresyon: npm test; npm run test:e2e; npm run test:production. Tam koşu: npm run test:playthrough -- ABYSS-07. Production dosyaları dist/ altında, önizleme npm run preview ile açılır.

Ana kanıtlar: [comparison.json](overdrive/comparison.json), before-final-r*.json / after-final-r*.json ve trace arşivleri, [full-run.json](overdrive/full-run.json), [memory-soak.json](overdrive/memory-soak.json), [full-run-performance.json](overdrive/full-run-performance.json).

## Teslimat özeti

- **Testler:** 78 Node + 7 Chromium regresyon + 1 production testi geçti.
- **Production:** başarılı; ${sizes.join('; ')}.
- **FPS karşılaştırması:**

${fpsTable}

- **Bellek karşılaştırması:**

${heapTable}

- **Kalan sorunlar:** yazılımsal GPU/kompozisyon beklemesi, uzun kareler ve artan canlı heap; 60 FPS açık hedef.
- **Gerçek GPU doğrulaması:** aynı sahneler ve ayarlarda FPS/kuyruk/bellek ölçümleri ve uzun gerçek zamanlı soak yapılmalı.
`;
await writeFile('docs/PROJECT_OVERDRIVE.md',report);console.log('docs/PROJECT_OVERDRIVE.md written');
