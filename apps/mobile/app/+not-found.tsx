import { View } from "react-native";
import { router } from "expo-router";
import { sp } from "@/design/tokens";
import { Screen } from "@/components/ui/screen";
import { T } from "@/components/ui/text";
import { Button } from "@/components/ui/pressables";
import { Logo } from "@/brand";

export default function NotFound() {
  return (
    <Screen scroll>
      <View style={{ alignItems: "center", paddingTop: sp[56], gap: sp[12] }}>
        <Logo variant="mark" size={56} />
        <T variant="h2" weight="bold">الصفحة غير موجودة</T>
        <T variant="body" color="muted" align="center">
          الرابط الذي طلبته غير متاح في التطبيق — عُد إلى لوحتك أو إلى صفحة البداية.
        </T>
        <View style={{ flexDirection: "row", gap: sp[8], marginTop: sp[8] }}>
          <Button label="الرئيسية" kind="primary" onPress={() => router.replace("/")} small />
        </View>
      </View>
    </Screen>
  );
}
