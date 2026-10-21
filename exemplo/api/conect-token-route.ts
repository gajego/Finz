// app/api/connect-token/route.ts
import { PluggyClient } from "pluggy-sdk";

export async function POST(req: Request) {
  const pluggy = new PluggyClient({
    clientId: "eab3f800-fb91-4ee6-84c2-687d4765a3a7",
    clientSecret: "TJ5TAwwVAFFL2TIyYCWxEN0ew12BLZAHo8w9kNF7KAg",
  });

  const { clientUserId } = await req.json();

  const connectToken = await pluggy.createConnectToken({
    clientUserId,
  });

  return Response.json({ accessToken: connectToken.accessToken });
}
