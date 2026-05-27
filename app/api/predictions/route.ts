import { NextRequest } from 'next/server';
import { getStopPredictions } from '@/lib/mbta';

export async function GET(request: NextRequest) {
  const stopId = request.nextUrl.searchParams.get('stop') ?? '';
  if (!stopId) {
    return Response.json({ error: 'stop parameter required' }, { status: 400 });
  }
  try {
    const result = await getStopPredictions(stopId);
    if (!result) {
      return Response.json({ error: 'Stop not found' }, { status: 404 });
    }
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return Response.json({ error: message }, { status: 502 });
  }
}
