# docs/design — مقعد مخرجات قياس التصميم

> **R357:** هذا الدليل مات مع squash الـ 1.0 (لم يوجد قط في التاريخ
> بعد السكواش — `git log --all -- docs/design/` = 0) ومعه مات ملفه
> التاريخي `r190-reference-matrix.md` (أُعيد توجيه استشهاده في
> components.css إلى قواعده الحية). أُعيد إنشاؤه فارغًا لأن أداة
> القياس `scripts/gates/css-coverage.mjs` تكتب ملخصها هنا
> (`css-coverage.json` — مخرج محلي غير مُتتبَّع، ليس جزءًا من بوابة
> CI) — بدون الدليل كانت الأداة تنهار بـ ENOENT بعد السكواش.

## محتويات هذا الدليل

- `css-coverage.json` — مولَّد محليًّا بواسطة
  `npm run gate:css-coverage -w frontend`؛ لا يُوثَّق في git.
- (تاريخيًّا: `r190-reference-matrix.md` — انظر
  `docs/redesign/r357/LOST-DOCS.md` §2.)
