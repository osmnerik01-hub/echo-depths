# Oyuncu görünümü — Chromium doğrulaması

2026-11-01, düzeltme 2/3: Bu oturumda üç kontrol de çıkış **0** ile tamamlandı. Yeni kontrol ayrıca açıkça çalıştırıldı; yalnızca production release testinin geçmesi bu kontrolün yerine sayılmadı. Beş güncel PNG üretildi ve her biri özgün 1280×800 boyutunda, büyütülmeden incelendi.

Yalnızca `e2e/player-visual.spec.js` ve bu belge düzenlendi. `src/renderer.js` içindeki mevcut kullanıcı değişiklikleri korundu; oyun kaynakları, HUD, kamera, oynanış ve test yapılandırması değiştirilmedi.

## Sabit sahne ve kontrol kapsamı

Beş silah: pulse, scatter, rail, arc, nova. Hepsinde seed **7301**, LCG **1664525 / 1013904223 / 2^32**, biyom **0**, oyuncu **(640,400)**, yarıçap **18**, açı **0 radyan (sağa)**, animasyon zamanı **0 saniye**, inv/flash **0**, kalite **HIGH**, viewport **1280×800**, DPR **1** kullanılır. Renderer dönüşümü: öteleme **(0,0)**, ölçek/zoom **1**, sarsıntı **0**. Test gerçek renderer ötelemesini, ölçeğini, DPR ve kalite değerlerini de doğrular.

Mevcut Renderer.robot ayrı belgede çizilir; oyun döngüsü çalışmaz. Bu kontrol sabit oyuncu görünümünü doğrular, tam oynanışın yerine geçmez. Her silahın etiketsiz pikselleri tekrarlı çizimde eşit, beş silahın pikselleri birbirinden farklı olmalıdır. Sayfa hataları dinlenir ve boş hata listesi aranır. Başlatılamayan veya atlanan kontrol başarılı sayılmaz.

## Güncel görüntüler ve inceleme

Aşağıdaki beş dosya son başarılı komutun `info.outputPath` çıktılarıdır; aynı dosyalar `info.attach` ile rapora eklenir. `scene-and-captures` metin eki sabit sahneyi ve kayıt günlüğünü içerir. Yeniden Playwright çalıştırılması bu geçici çıktıları yenileyebilir.

Her görüntüde koyu zırh, üst ve alt omuz plakaları ve turkuaz çekirdek normal ölçekte seçiliyor. Namlu ayrıntıları aşağıdaki gibi ayrışıyor; çekirdek rengi silahla değişmiyor.

| Güncel PNG | Normal ölçekte gözlem |
| --- | --- |
| [pulse](../../test-results/player-visual-Chromium-rec-e8397-er-weapons-in-a-fixed-scene/pulse.png) | Kısa tek namlu, turkuaz uç. |
| [scatter](../../test-results/player-visual-Chromium-rec-e8397-er-weapons-in-a-fixed-scene/scatter.png) | Turuncu üst/alt namlu çıkıntıları. |
| [rail](../../test-results/player-visual-Chromium-rec-e8397-er-weapons-in-a-fixed-scene/rail.png) | Uzun mor çift ray. |
| [arc](../../test-results/player-visual-Chromium-rec-e8397-er-weapons-in-a-fixed-scene/arc.png) | Mavi üst/alt çatal. |
| [nova](../../test-results/player-visual-Chromium-rec-e8397-er-weapons-in-a-fixed-scene/nova.png) | Geniş koyu namlu gövdesi, turuncu uç. |

[Playwright raporu](../../playwright-report/index.html), açma komutu: `npx.cmd playwright show-report`.
Doğrulanabilir önceki sürüm görüntüsü bulunmadığından önce/sonra karşılaştırması iddia edilmez.

## Doğrulama süreci ve gerçek komut sonuçları

Aşağıdaki üç komut doğrulama sürecinin tamamıdır; üçüncüsü özellikle yeni dosyayı seçer ve mevcut geliştirme yapılandırmasını kullanır. `playwright.production.config.js` ile çalışan release kontrolü bu dosyayı kapsamamaktadır. Yapılandırma değiştirilmedi. PowerShell'de npm/npx için `.cmd` kullanıldı.

| Komut | Çıkış kodu | Sonuç |
| --- | --- | --- |
| `npm.cmd test` | 0 | 80 test geçti, 0 başarısız, 0 atlanan |
| `npm.cmd run build` | 0 | 24 modül, build tamamlandı |
| `npx.cmd playwright test e2e/player-visual.spec.js --config playwright.config.js` | 0 | Yeni kontrol: 1 geçti, beş PNG ve ekleri üretildi |

Aşağıdakiler bu oturumun gerçek stdout parçalarıdır; Node çıktısının yalnızca son özeti alınmıştır. Çıkış kodları komut yürütücüsünden kaydedilmiştir.

```text
> npm.cmd test
> echo-depths@0.5.0 test
> node --test tests/*.test.js

ℹ tests 80
ℹ suites 0
ℹ pass 80
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 5894.0818
Çıkış kodu: 0
```

```text
> npm.cmd run build
> echo-depths@0.5.0 build
> vite build

vite v7.3.7 building client environment for production...
transforming...
✓ 24 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                  0.89 kB │ gzip:  0.53 kB
dist/assets/index-D5Zk3cME.css   8.87 kB │ gzip:  2.93 kB
dist/assets/index-BJhs4vKQ.js   82.84 kB │ gzip: 30.34 kB
✓ built in 1.27s
Çıkış kodu: 0
```

Son test değişikliğinden (renderer değerleri denetimi) sonraki çalışma:

```text
> npx.cmd playwright test e2e/player-visual.spec.js --config playwright.config.js

Running 1 test using 1 worker

(node:4852) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
player-visual: pulse (1280x800, scale=1, angle=0, t=0; repeat identical)
player-visual output: PRIVATE_LOCAL_PATH
player-visual: scatter (1280x800, scale=1, angle=0, t=0; repeat identical)
player-visual output: PRIVATE_LOCAL_PATH
player-visual: rail (1280x800, scale=1, angle=0, t=0; repeat identical)
player-visual output: PRIVATE_LOCAL_PATH
player-visual: arc (1280x800, scale=1, angle=0, t=0; repeat identical)
player-visual output: PRIVATE_LOCAL_PATH
player-visual: nova (1280x800, scale=1, angle=0, t=0; repeat identical)
player-visual output: PRIVATE_LOCAL_PATH
  ok 1 e2e\player-visual.spec.js:9:1 › Chromium records all five player weapons in a fixed scene (2.3s)

  1 passed (4.0s)
Çıkış kodu: 0
```

## Chromium başlatma engeli

Bildirilen başlatma engeli bu oturumdaki açık yeni test çalışmasında tekrarlanmadı: Chromium başladı, sayfa çizildi, beş güncel PNG kaydedildi ve test çıkış 0 ile tamamlandı. NO_COLOR/FORCE_COLOR uyarısı engelleyici değildi. Başlatma ayarları, kanal ve yapılandırma değiştirilmedi. Bu sonuç yalnızca bu ortamda gözlenen çalışmayı doğrular; başka ortamlar için engelin giderildiği iddia edilmez.
