import { StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import Monitor from "lucide-react-native/icons/monitor-check";
import Building2 from "lucide-react-native/icons/building";
import { API_BASE } from "@/api/client";
import { usePalette, useSemanticTheme } from "@/design/theme";
import { sp } from "@/design/tokens";
import { Screen } from "@/components/ui/screen";
import { T, MonoLabel } from "@/components/ui/text";
import { Card } from "@/components/ui/surfaces";
import { RowList, LedgerRow } from "@/components/ui/data";
import { StackHeader } from "@/components/shell/AppTopBar";

/**
 * /campus — «بيئة العمل الرقمية» (Phase Ω).
 *
 * The retired screen was the real-university documentary rail (Commons
 * photographs + official-channel videos of public universities). Phase Ω
 * (identity purity) retires it whole: ULARA is an independent
 * multi-tenant University Operating System — no campus to document, no
 * university affiliation to imply. What lives here instead is the
 * platform's OWN environment, honestly:
 *   · real product captures of the running surfaces (the labeled demo
 *     workspace «مساحة عمل أُلارا التجريبية» — every frame carries the
 *     demo-data disclosure);
 *   · the honest statement that every institution's environment is built
 *     from its own data after onboarding.
 *
 * The captures are the SAME registry the web composes (frontend/src/data/
 * product-media.ts) served from the web origin's /media/product ladder —
 * expo-image (memory+disk caching, sunken placeholder, 200ms fade).
 */

interface CaptureRow {
  id: string;
  name: string;
  caption: string;
  alt: string;
}

const PRODUCT_CAPTURES: CaptureRow[] = [
  {
    id: "student-dashboard",
    name: "لوحة الطالب",
    caption: "المقررات والواجبات والتقدّم — نظرة واحدة",
    alt: "لقطة حقيقية للوحة الطالب في أُلارا مع بطاقات المقررات والواجبات القادمة — بيانات العرض التجريبية",
  },
  {
    id: "student-lecture-player",
    name: "المحاضرة التفاعلية",
    caption: "مشغّل المحاضرة مع نقطة فحص تُصحّح فورًا",
    alt: "لقطة حقيقية لمشغّل المحاضرة التفاعلية في أُلارا مع بطاقة نقطة الفحص — بيانات العرض التجريبية",
  },
  {
    id: "student-matrix",
    name: "مصفوفة الإتقان",
    caption: "درجة إتقان لكل مفهوم، وربطها بالدرس المناسب",
    alt: "لقطة حقيقية لمصفوفة الإتقان في أُلارا — بيانات العرض التجريبية",
  },
  {
    id: "student-library",
    name: "المكتبة البحثية",
    caption: "قارئ PDF مع البحث والشروح داخل المستند",
    alt: "لقطة حقيقية للمكتبة البحثية وقارئ PDF في أُلارا — بيانات العرض التجريبية",
  },
  {
    id: "teacher-dashboard",
    name: "لوحة الأستاذ",
    caption: "الشعب، التقدّم، والتصحيح — من مكان واحد",
    alt: "لقطة حقيقية للوحة الأستاذ في أُلارا — بيانات العرض التجريبية",
  },
  {
    id: "admin-dashboard",
    name: "لوحة الإدارة",
    caption: "الكليات والمقررات والمستخدمون — حاكمية واضحة",
    alt: "لقطة حقيقية للوحة الإدارة في أُلارا — بيانات العرض التجريبية",
  },
  {
    id: "quality-dashboard",
    name: "لوحة الجودة",
    caption: "رقابة قرائية للمقررات والأساتذة والاختبارات",
    alt: "لقطة حقيقية للوحة مكتب الجودة في أُلارا — بيانات العرض التجريبية",
  },
  {
    id: "owner-dashboard",
    name: "لوحة المالك",
    caption: "مؤشرات المنصّة والتنبيهات التشغيلية",
    alt: "لقطة حقيقية للوحة مالك المنصّة في أُلارا — بيانات العرض التجريبية",
  },
];

/** The web origin that serves `/media/product/*` (API_BASE minus /api/v1). */
const WEB_ORIGIN = API_BASE.replace(/\/api\/v1\/?$/, "");

/** 720px WebP rendition — the same derivative the web landing composes. */
function captureUrl(id: string): string {
  return `${WEB_ORIGIN}/media/product/${id}-720.webp`;
}

export default function Campus() {
  const p = usePalette();
  const { colors } = useSemanticTheme();
  return (
    <Screen scroll>
      <StackHeader title="بيئة العمل الرقمية" kicker="المنصّة" />

      {/* [01] بيئة العمل — the platform's own surfaces */}
      <View style={{ gap: sp[8] }}>
        <MonoLabel>[01] بيئة العمل</MonoLabel>
        <T variant="h3" weight="bold">
          لا حرمَ جامعيًّا — بيئة تُبنى من بياناتك
        </T>
        <T variant="body" color="secondary">
          أُلارا منظومة مستقلّة متعدّدة المؤسسات: لا تصوّر حرمًا ولا تتبنّى جامعة. ما تراه هنا لقطات حقيقية لأسطح المنصّة نفسها، وبيئة كل مؤسسة تُبنى من بياناتها بعد الانضمام.
        </T>
      </View>

      <RowList>
        {PRODUCT_CAPTURES.map((capture, i, all) => (
          <LedgerRow
            key={capture.id}
            last={i === all.length - 1}
            accessibilityLabel={`${capture.name} — لقطة من سطح المنصّة`}
          >
            <View style={{ gap: sp[8] }}>
              <Image
                source={{ uri: captureUrl(capture.id) }}
                contentFit="cover"
                transition={200}
                recyclingKey={capture.id}
                accessibilityLabel={capture.alt}
                style={{
                  aspectRatio: 16 / 10,
                  backgroundColor: colors.sunken,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: p.border,
                }}
              />
              <View style={{ gap: sp[4] }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
                  <Monitor size={18} color={p.textMuted} />
                  <T variant="body" weight="bold" style={{ flex: 1 }} numberOfLines={1}>
                    {capture.name}
                  </T>
                  <MonoLabel>DEMO</MonoLabel>
                </View>
                <T variant="sm" color="muted">
                  {capture.caption}
                </T>
              </View>
            </View>
          </LedgerRow>
        ))}
      </RowList>

      <T variant="sm" color="muted">
        كل الإطارات لقطات حقيقية لأسطح المنصّة من «مساحة عمل أُلارا التجريبية» — بيانات عرض موسومة بوضوح، لا تنتمي لأي مؤسسة تعليمية.
      </T>

      {/* [02] مؤسستك — the multi-tenant honest statement */}
      <View style={{ gap: sp[8] }}>
        <MonoLabel>[02] مؤسستك</MonoLabel>
        <T variant="h3" weight="bold">
          بيئة مؤسستك… من بياناتها
        </T>
        <T variant="body" color="secondary">
          عند انضمام مؤسستك إلى أُلارا تُبنى كلياتها ومقرراتها ومستخدموها من بياناتها هي — لا قوائم جاهزة ولا فروع مفترضة. ما يظهر لكل دور هو ما تملكه المؤسسة فعلًا.
        </T>
      </View>

      <Card>
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: sp[8] }}>
          <Building2 size={18} color={p.textMuted} />
          <T variant="sm" color="muted" style={{ flex: 1 }}>
            مستقلّية معلنة: أُلارا ليست موقعًا لأي جامعة بعينها ولا تتبع أي جهة تعليمية — إنما نظام تشغيل واحد تديره كل مؤسسة بنفسها.
          </T>
        </View>
      </Card>
    </Screen>
  );
}
