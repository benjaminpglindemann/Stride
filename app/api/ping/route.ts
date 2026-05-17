export async function GET() {
  return Response.json({ ok: true });
}
export async function POST(request: Request) {
  const auth = request.headers.get('authorization') ?? 'none';
  return Response.json({ ok: true, auth: auth.slice(0, 30) });
}
