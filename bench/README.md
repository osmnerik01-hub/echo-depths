# Project Overdrive ölçüm düzeneği

`baseline/src` önceki sürümün kontrol kopyasıdır; yalnızca profil süreleri eklenmiştir. Özgün dosya hashleri `baseline/manifest.json` içinde korunur. Bu dizin production build girdisi değildir.

1. Proje kökünde `npm run dev` başlatın.
2. Ayrı terminalde `npm run profile:compare` çalıştırın.
3. Sonuçlar `docs/overdrive/comparison.json` ve before/after-final-r1…r3 kayıtlarına yazılır. Eski sonuçları korumak için `ECHO_PROFILE_GROUP` ortam değişkenine farklı bir ad verin; comparison.json yine yeniden yazılır.

Fixture dört sentetik sahneyi aynı seed ve giriş parametreleriyle çalıştırır. HIGH, DPR2, 1280×800 CSS boyutunda üç tekrar alınır; her tekrar bir saniye ısınma ve beş saniye ölçüm içerir. Aktörlerin korunması yükün sabit kalması içindir; normal oynanabilirlik kanıtı değildir. Normal kurallı tam koşu ayrı Chromium testiyle doğrulanır.

Sıkıştırılmış trace dosyaları CDP izleridir. CPU süreleri iç içedir ve toplanmamalıdır. FPS, yazılımsal SwiftShader ve izleme ek yükünden etkilenir. Son teslimat raporu `docs/PROJECT_OVERDRIVE.md` içindedir; sayılar ham kayıtlardan `node scripts/report-overdrive.mjs` ile üretilir.
