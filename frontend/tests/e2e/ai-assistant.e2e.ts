/**
 * ai-assistant.e2e.ts — رحلة المساعد الذكيّ (r166d, WS-F7).
 *
 * أول رحلة متصفح لمساعد الذكاء الاصطناعي: الطالب يفتح /student/ai،
 * الصفحة تُحمّل الإعداد الصادق (نمط محليّ من /ai/config: العنوان
 * الفرعي «مساعد تحليليّ محليّ» + شارة AI العامة — لا ادّعاء نموذج)،
 * ثم يرسل سؤاله عبر النقل الوهمي STATEFUL: فقّة سؤاله تظهر فورًا
 * (optimistic)، والردّ يهبط بفقّته مع بطاقة المحرّك لكلّ ردّ
 * (r166d: وسم محوّد خافت باسم الملحّن المحليّ gap-aware-composer —
 * الصدق في الاتجاهين)، والمحادثة الجديدة تدخل قائمة «محادثاتك» عبر
 * إبطال React Query الحقيقي، والشكل على السلك حرفيّ { message } فقط.
 */
import { test, expect } from './fixtures/e2e';
import { FIXED_NOW_ISO } from './fixtures/api-fixtures';
import { installStatefulApi, statefulOk } from './fixtures/mock-transport';
/* r351 A3 debt-pay: the SSE/JSON wire bodies come from the corpus's
 * own factories (ai-fixtures.ts) — ONE source of the r323 grammar
 * (round-trip-pinned against the production parser by
 * tests/unit/ai-fixtures-roundtrip.test.ts), not three inline copies. */
import { aiChatJsonReply, aiChatSseReply } from './fixtures/ai-fixtures';

test.use({ e2eRole: 'STUDENT' });

test.describe('المساعد الذكيّ — رحلة محادثة كاملة', () => {
  test('الصفحة تُحمّل بالنمط المحليّ الصادق، والسؤال يجلب ردًّا موسومًا بمحرّكه، والمحادثة تدخل القائمة', async ({ page }) => {
    /* الحالة الوهمية: لا فجوات معرفيّة (لا بطاقات)، لا محادثات سابقة
     * (قائمة فارغة صادقة)، النمط محليّ من /ai/config، وكلّ POST /ai/chat
     * يُنشئ محادثة تنعكس في قراءة القائمة التالية (الإبطال الحقيقي). */
    const QUESTION = 'ما المفاهيم التي أحتاج إلى مراجعتها؟';
    const REPLY = 'لاحظت من بياناتك أنك بحاجة لتعزيز فهمك — راجع محاضرة الأسبوع الماضي.';
    const conversations: Array<{ id: string; title: string | null; createdAt: string }> = [];
    const chatBodies: Array<{ conversationId?: string; message: string }> = [];

    await installStatefulApi(page, [
      {
        method: 'GET',
        pattern: '**/api/v1/ai/config',
        fulfill: async ({ route }) => {
          await statefulOk(route, { provider: 'local', model: null });
        },
      },
      {
        method: 'GET',
        pattern: '**/api/v1/me/gaps',
        fulfill: async ({ route }) => {
          await statefulOk(route, []);
        },
      },
      {
        method: 'GET',
        pattern: '**/api/v1/ai/conversations',
        fulfill: async ({ route }) => {
          await statefulOk(route, conversations);
        },
      },
      {
        method: 'POST',
        /* r323 B1.1: the page's real transport is now the SSE grammar —
         * POST /ai/chat?stream=1 (fetch + ReadableStream). The glob
         * must therefore also catch the query string (query strings
         * count in page.route globs) and answer BOTH grammars: the
         * stream call gets token frames + the done frame (the final
         * persisted turn with ids + engine + model), the legacy JSON
         * envelope stays for the fallback path. Same wire body either
         * way: first turn is literally { message } only. */
        pattern: '**/api/v1/ai/chat*',
        fulfill: async ({ route, url }) => {
          chatBodies.push(route.request().postDataJSON() as { conversationId?: string; message: string });
          const conversation = { id: 'conv_e2e_ai_1', title: QUESTION.slice(0, 60), createdAt: FIXED_NOW_ISO };
          conversations.push(conversation);
          if (url.searchParams.get('stream') === '1') {
            const sse = aiChatSseReply({
              reply: REPLY,
              conversationId: conversation.id,
              messageId: 'msg_e2e_ai_1',
            });
            await route.fulfill({
              status: 200,
              headers: { 'Content-Type': 'text/event-stream; charset=utf-8' },
              body: sse,
            });
            return;
          }
          await statefulOk(
            route,
            aiChatJsonReply({ reply: REPLY, conversationId: conversation.id, messageId: 'msg_e2e_ai_1' }),
          );
        },
      },
    ]);

    await page.goto('/student/ai');
    await expect(page).toHaveTitle('المساعد الذكي · أُلارا');
    // (G re-pin — R287 precedent: the header rides the patterns contract
    // now, so the h1 carries the family's pf-page-title class.)
    await expect(page.locator('h1.pf-page-title')).toHaveText('المساعد الذكيّ');

    /* السطح الصادق للنمط المحليّ (r351 AI-3): سطر واحد + شارة AI
     * العامة + تحية الملحّن المحليّ المختصرة. */
    await expect(
      page.getByText('مساعد تحليليّ محليّ بلا نموذج خارجيّ.'),
    ).toBeVisible();
    await expect(page.locator('.badge', { hasText: 'AI' })).toBeVisible();
    await expect(page.getByText(/أحلّل إتقانك محليًّا/)).toBeVisible();
    /* لا محادثات سابقة — سطر واحد هادئ. */
    await expect(page.getByText('لا محادثات بعد')).toBeVisible();
    await expect(page.getByText('ابدأ بسؤال وستظهر هنا.')).toBeVisible();

    /* الإرسال — فقّة السؤال تظهر فورًا، ثم الردّ بفقّته. */
    await page.getByLabel('اكتب سؤالك للمساعد').fill(QUESTION);
    await page.getByRole('button', { name: 'إرسال' }).click();
    await expect(page.locator('.chat-msg.user', { hasText: QUESTION })).toBeVisible();
    const replyBubble = page.locator('.chat-msg.bot .chat-bubble', { hasText: REPLY });
    await expect(replyBubble).toBeVisible();

    /* r166d: وسم المحرّك لكلّ ردّ — نص محوّد خافت داخل الفقّة يسمّي
     * الملحّن المحليّ بصدق (لا يدّعي نموذجًا لغويًّا). */
    await expect(replyBubble.locator('.font-mono')).toHaveText('gap-aware-composer');

    /* r351 AI-2/AI-3: شرائح المصادر — مرجع استشهادات «المصدر: [رقم]»
     * داخل الردّ؛ ذات الرابط تُفتح، وبلا رابط تبقى معلوماتية. */
    const citeRow = replyBubble.locator('.ai-cite-row');
    await expect(citeRow).toBeVisible();
    await expect(citeRow.locator('.ai-cite-chip')).toHaveCount(2);
    const citeLink = citeRow.locator('a.ai-cite-chip', { hasText: 'محاضرة الاستعلامات المركّبة' });
    await expect(citeLink).toHaveAttribute('href', 'https://example.invalid/materials/lecture-7');
    await expect(citeLink).toHaveAttribute('target', '_blank');
    await expect(citeRow.locator('.ai-cite-chip--info', { hasText: 'ورقة عمل الفهارس' })).toBeVisible();

    /* المحادثة الجديدة دخلت قائمة «محادثاتك» عبر الإبطال وإعادة
     * الجلب الحقيقيين (لا إعادة تحميل صفحة). */
    const convRow = page.locator('.ai-conv-row', { hasText: QUESTION });
    await expect(convRow).toBeVisible();
    await expect(convRow).toHaveAttribute('aria-current', 'true');
    await expect(convRow.locator('.ai-current-dot')).toBeVisible();

    /* الشكل على السلك حرفيًّا: أول دورٍ بلا conversationId — { message }
     * فقط، عقد chatSchema الصارم. */
    expect(chatBodies).toEqual([{ message: QUESTION }]);
  });
});

/* ═══════════════════════════════════════════════════════════════════
 * r351 AI-5 — the full hermetic journey: stream · stop · retry ·
 * error · quota · a11y. The fixture corpus (ai-fixtures.ts + the A3
 * marker block) feeds the read surfaces; each turn's transport is
 * stateful, exactly like the base journey.
 * ═══════════════════════════════════════════════════════════════════ */

test.describe('المساعد الذكيّ — التدفّق والتحكّم (r351 AI-5)', () => {
  test('زر الإيقاف يظهر أثناء الاتصال ويلغي المحاولة بلا صفّ خطأ', async ({ page }) => {
    await installStatefulApi(page, [
      {
        method: 'GET',
        pattern: '**/api/v1/ai/config',
        fulfill: async ({ route }) => statefulOk(route, { provider: 'local', model: null }),
      },
      {
        method: 'GET',
        pattern: '**/api/v1/me/gaps',
        fulfill: async ({ route }) => statefulOk(route, []),
      },
      {
        method: 'GET',
        pattern: '**/api/v1/ai/conversations',
        fulfill: async ({ route }) => statefulOk(route, []),
      },
      {
        method: 'POST',
        pattern: '**/api/v1/ai/chat*',
        fulfill: async ({ route }) => {
          // The response is HELD 3s — the request is genuinely
          // in-flight (the connecting window the stop button owns).
          await new Promise((r) => setTimeout(r, 3000));
          await statefulOk(route, { conversationId: 'never', reply: 'لن يصل' });
        },
      },
    ]);

    await page.goto('/student/ai');
    await page.getByLabel('اكتب سؤالك للمساعد').fill('سؤال بثّ');
    await page.getByRole('button', { name: 'إرسال' }).click();
    // The send slot IS the stop button while the request is in flight.
    const stop = page.getByRole('button', { name: 'إيقاف التوليد' });
    await expect(stop).toBeVisible();
    await stop.click();
    // A cancellation, not an outage: no error row, the composer
    // returns, and the held reply never lands.
    await expect(page.getByRole('button', { name: 'إرسال' })).toBeVisible();
    await expect(page.locator('.chat-error')).toHaveCount(0);
    await expect(page.locator('.chat-msg.bot .chat-bubble', { hasText: 'لن يصل' })).toHaveCount(0);
  });

  test('فشل المزوّد يعرض صفًّا قابلًا لإعادة المحاولة، وإعادة المحاولة تنجح', async ({ page }) => {
    /* The suite's frozen clock freezes CSS smooth-scrolling mid-flight
     * (time-based animation) — the auto-scroll to the failed row would
     * land half-clipped and its retry button under the composer.
     * Reduced motion is the page's own instant-scroll path (and the
     * honest condition for a deterministic journey). */
    await page.emulateMedia({ reducedMotion: 'reduce' });
    let calls = 0;
    await installStatefulApi(page, [
      {
        method: 'GET',
        pattern: '**/api/v1/ai/config',
        fulfill: async ({ route }) => statefulOk(route, { provider: 'local', model: null }),
      },
      {
        method: 'GET',
        pattern: '**/api/v1/me/gaps',
        fulfill: async ({ route }) => statefulOk(route, []),
      },
      {
        method: 'GET',
        pattern: '**/api/v1/ai/conversations',
        fulfill: async ({ route }) => statefulOk(route, []),
      },
      {
        method: 'POST',
        pattern: '**/api/v1/ai/chat*',
        fulfill: async ({ route }) => {
          calls += 1;
          if (calls === 1) {
            await route.fulfill({
              status: 500,
              contentType: 'application/json',
              body: JSON.stringify({ error: { code: 'PROVIDER_FAILURE', message: 'تعذَّر الوصول إلى نموذج المساعد الآن — حاول مرة أخرى' } }),
            });
            return;
          }
          await route.fulfill({
            status: 200,
            contentType: 'text/event-stream; charset=utf-8',
            body: aiChatSseReply({ reply: 'نجحت المحاولة', conversationId: 'conv_r2', messageId: 'm_r2' }),
          });
        },
      },
    ]);

    await page.goto('/student/ai');
    await page.getByLabel('اكتب سؤالك للمساعد').fill('سؤال متعثّر');
    await page.getByRole('button', { name: 'إرسال' }).click();
    // The honest recoverable row + the envelope's own code.
    await expect(page.locator('.chat-error', { hasText: 'تعذَّر الوصول' })).toBeVisible();
    await expect(page.locator('.r305ai-err-code', { hasText: 'PROVIDER_FAILURE' })).toBeVisible();
    // Retry in place — the same question, one new wire call.
    await page.getByRole('button', { name: 'أعد الإرسال' }).click();
    await expect(page.locator('.chat-msg.bot .chat-bubble', { hasText: 'نجحت المحاولة' })).toBeVisible();
    expect(calls).toBe(2);
  });

  test('حصّة اليوم تنتهي: بطاقة «وصلتَ حدَّ اليوم» والعداد الصادق', async ({ page }) => {
    await installStatefulApi(page, [
      {
        method: 'GET',
        pattern: '**/api/v1/ai/config',
        fulfill: async ({ route }) => statefulOk(route, { provider: 'local', model: null }),
      },
      {
        method: 'GET',
        pattern: '**/api/v1/me/gaps',
        fulfill: async ({ route }) => statefulOk(route, []),
      },
      {
        method: 'GET',
        pattern: '**/api/v1/ai/conversations',
        fulfill: async ({ route }) => statefulOk(route, []),
      },
      {
        method: 'POST',
        pattern: '**/api/v1/ai/chat*',
        fulfill: async ({ route }) => {
          await route.fulfill({
            status: 200,
            contentType: 'text/event-stream; charset=utf-8',
            // A done frame with remaining = 0 arms the card; the NEXT
            // ask would be the server's own 429 sentence.
            body: aiChatSseReply({ reply: 'آخر جواب', remaining: 0, conversationId: 'conv_q', messageId: 'm_q' }),
          });
        },
      },
    ]);

    await page.goto('/student/ai');
    await page.getByLabel('اكتب سؤالك للمساعد').fill('سؤال أخير');
    await page.getByRole('button', { name: 'إرسال' }).click();
    await expect(page.locator('.chat-msg.bot .chat-bubble', { hasText: 'آخر جواب' })).toBeVisible();
    // The quota state card renders (preemptive honesty: the NEXT ask
    // will be rejected).
    await expect(page.locator('.ai-quota-card', { hasText: 'وصلتَ حدَّ اليوم' })).toBeVisible();
  });
});

test.describe('المساعد الذكيّ — الوصول (r351 AI-5)', () => {
  test('axe: لا انتهاكات serious/critical على الصفحة (فاتح وداكن)', async ({ page }) => {
    const { readFile } = await import('node:fs/promises');
    const { fileURLToPath } = await import('node:url');
    const axeSource = await readFile(
      fileURLToPath(new URL('../../../node_modules/axe-core/axe.min.js', import.meta.url)),
      'utf8',
    );

    await installStatefulApi(page, [
      {
        method: 'GET',
        pattern: '**/api/v1/ai/config',
        fulfill: async ({ route }) => statefulOk(route, { provider: 'local', model: null }),
      },
      {
        method: 'GET',
        pattern: '**/api/v1/me/gaps',
        fulfill: async ({ route }) =>
          statefulOk(route, [
            { conceptId: 'c1', conceptName: 'الاستعلامات المركّبة', courseName: 'قواعد البيانات', level: 0.22 },
          ]),
      },
      {
        method: 'GET',
        pattern: '**/api/v1/ai/conversations',
        fulfill: async ({ route }) =>
          statefulOk(route, [{ id: 'conv_axe', title: 'محادثة الفحص', createdAt: FIXED_NOW_ISO }]),
      },
    ]);

    for (const scheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto('/student/ai');
      await expect(page.locator('h1.pf-page-title')).toBeVisible();
      await page.evaluate(axeSource);
      const result = await page.evaluate(async () => {
        const run = await (window as unknown as { axe: { run: (ctx: unknown) => Promise<{ violations: Array<{ impact: string; id: string }> }> } }).axe.run(document);
        return run.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id);
      });
      expect(result, `axe ${scheme}: ${result.join(', ')}`).toHaveLength(0);
    }
  });
});
