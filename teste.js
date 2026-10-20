// app/api/connect-token/route.ts
import { PluggyClient } from "pluggy-sdk";

export async function POST(req) {
  const pluggy = new PluggyClient({
    clientId: "eab3f800-fb91-4ee6-84c2-687d4765a3a7",
    clientSecret: "xgTehB466Urm11dF_XFBUTEFNIPt4FdF5eFk9GST4ns",
  });

  const { clientUserId } = await req.json();

  const connectToken = await pluggy.createConnectToken({
    clientUserId, // Optional: track your users
  });

  return Response.json({ accessToken: connectToken.accessToken });
}
