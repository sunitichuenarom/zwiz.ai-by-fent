import { connection } from "next/server";
import { PasscodeForm } from "@/components/PasscodeForm";
import { WebChat } from "@/components/WebChat";
import { isAuthorized } from "@/lib/auth";
import { getBotInfo } from "@/lib/line";

export default async function Home() {
  await connection();

  if (!(await isAuthorized())) return <PasscodeForm />;

  return <WebChat bot={await getBotInfo()} />;
}
