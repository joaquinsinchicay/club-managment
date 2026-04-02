import { signOut } from "@/lib/auth/service";

export async function GET(request: Request) {
  return signOut(request.url);
}
