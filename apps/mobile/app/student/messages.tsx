import { router } from "expo-router";
import { MessagesUI } from "@/features/messages/MessagesUI";

/** /student/messages — the shared DM inbox (pushed: back + safe areas). */
export default function Messages() {
  return <MessagesUI onBack={() => router.back()} />;
}
