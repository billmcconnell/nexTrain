import { NextRequest } from 'next/server';
import { searchStops } from '@/lib/mbta';

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q') ?? '';
  try {
    const stops = await searchStops(q);
    return Response.json(stops);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return Response.json({ error: message }, { status: 502 });
  }
}
