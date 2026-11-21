import { View } from "react-native";
import { PushFrame } from "@/features/student/components";
import Wallet from "lucide-react-native/icons/wallet";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { T } from "@/components/ui/text";
import { Card } from "@/components/ui/surfaces";
import { EmptyState } from "@/components/ui/states";

/**
 * /student/payment — الشؤون المالية (web PaymentPage parity, mobile
 * honest-empty): the platform's data model has no Fee / Payment /
 * Invoice entities, so this screen renders no figures and no checkout —
 * only the honest «قيد التطوير» disclosure.
 */
export default function PaymentScreen() {
  const p = usePalette();
  return (
    <PushFrame title="الشؤون المالية" kicker="حالة رسومك الجامعية">

      <EmptyState
        icon={<Wallet size={26} color={p.textFaint} />}
        title="لا رسوم مسجّلة بعد"
        message="تكامل الدفع الإلكترونيّ قيد التطوير — لا تُعرض أيّ مبالغ تقديريّة."
      />

      <Card style={{ gap: sp[8] }}>
        <T variant="body" color="secondary">
          رصيدك الفعليّ وسجلّ سدادك مصدرهما مكتب الشؤون الماليّة — راجعه في كليّتك عند الحاجة.
        </T>
      </Card>

      <View style={{ gap: sp[4] }}>
        <T variant="xs" color="faint">
          الإعلانات الرسميّة الخاصّة بالرسوم ومواعيدها تُنشر على لوحة المجتمع الجامعيّ.
        </T>
      </View>
    </PushFrame>
  );
}
