import type { Stop, Prediction, Route, DirectionGroup, StopPredictions } from './types';
import { parseAlerts } from './alerts';

const BASE = 'https://api-v3.mbta.com';

function apiHeaders(): Record<string, string> {
  const key = process.env.MBTA_API_KEY;
  return key ? { 'x-api-key': key } : {};
}

async function mbtaFetch(path: string, revalidate?: number) {
  const res = await fetch(`${BASE}${path}`, {
    headers: apiHeaders(),
    next: revalidate !== undefined ? { revalidate } : { revalidate: 0 },
    cache: revalidate !== undefined ? undefined : 'no-store',
  });
  if (!res.ok) {
    throw new Error(`MBTA API ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

export async function searchStops(query: string): Promise<Stop[]> {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  // Fetch parent stations for subway, light rail, commuter rail — small dataset, cache 1 hour
  const data = await mbtaFetch(
    '/stops?filter[location_type]=1&page[limit]=500&fields[stop]=name,latitude,longitude',
    3600
  );

  return (data.data as any[])
    .filter((s: any) => s.attributes.name.toLowerCase().includes(q))
    .map((s: any) => ({
      id: s.id,
      name: s.attributes.name,
      lat: s.attributes.latitude,
      lng: s.attributes.longitude,
    }))
    .sort((a, b) => {
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();
      if (aName === q) return -1;
      if (bName === q) return 1;
      if (aName.startsWith(q) && !bName.startsWith(q)) return -1;
      if (!aName.startsWith(q) && bName.startsWith(q)) return 1;
      return a.name.localeCompare(b.name);
    });
}

export async function getStop(stopId: string): Promise<Stop | null> {
  try {
    const data = await mbtaFetch(
      `/stops/${encodeURIComponent(stopId)}?fields[stop]=name,latitude,longitude`,
      3600
    );
    return {
      id: data.data.id,
      name: data.data.attributes.name,
      lat: data.data.attributes.latitude,
      lng: data.data.attributes.longitude,
    };
  } catch {
    return null;
  }
}

export async function getStopPredictions(stopId: string): Promise<StopPredictions | null> {
  const [stop, predictionsData, alertsData] = await Promise.all([
    getStop(stopId),
    mbtaFetch(
      `/predictions?filter[stop]=${encodeURIComponent(stopId)}&include=route,vehicle&sort=departure_time&page[limit]=60`
    ),
    mbtaFetch(
      `/alerts?filter[stop]=${encodeURIComponent(stopId)}&filter[lifecycle]=NEW,ONGOING,ONGOING_UPCOMING&fields[alert]=effect,header,informed_entity`
    ),
  ]);
  if (!stop) return null;

  const data = predictionsData;

  const routes = new Map<string, any>();
  const vehicles = new Map<string, any>();

  for (const inc of (data.included ?? [])) {
    if (inc.type === 'route') routes.set(inc.id, inc);
    if (inc.type === 'vehicle') vehicles.set(inc.id, inc);
  }

  const predictions: Prediction[] = [];
  const now = Date.now();

  for (const p of (data.data as any[])) {
    const { attributes, relationships } = p;
    const schedRel: string | null = attributes.schedule_relationship ?? null;
    if (schedRel === 'CANCELLED' || schedRel === 'SKIPPED' || schedRel === 'NO_DATA') continue;

    // Use departure time; fall back to arrival time for terminal stops
    const departureTime: string | null = attributes.departure_time ?? null;
    const arrivalTime: string | null = attributes.arrival_time ?? null;
    const displayTime = departureTime ?? arrivalTime;
    if (!displayTime) continue;

    // Drop predictions more than 90 seconds in the past
    if (new Date(displayTime).getTime() < now - 90_000) continue;

    const routeId: string | undefined = relationships.route?.data?.id;
    if (!routeId) continue;
    const routeData = routes.get(routeId);
    if (!routeData) continue;

    const route: Route = {
      id: routeId,
      longName: routeData.attributes.long_name,
      shortName: routeData.attributes.short_name,
      color: routeData.attributes.color || '000000',
      textColor: routeData.attributes.text_color || 'FFFFFF',
      type: routeData.attributes.type,
      directionNames: routeData.attributes.direction_names as [string, string],
      directionDestinations: routeData.attributes.direction_destinations as [string, string],
    };

    const vehicleId: string | undefined = relationships.vehicle?.data?.id;
    const vehicleData = vehicleId ? vehicles.get(vehicleId) : undefined;

    const prediction: Prediction = {
      id: p.id,
      directionId: attributes.direction_id as 0 | 1,
      departureTime,
      arrivalTime,
      scheduleRelationship: schedRel,
      route,
      tripId: relationships.trip?.data?.id ?? '',
    };

    if (vehicleData) {
      prediction.occupancyStatus = vehicleData.attributes.occupancy_status ?? undefined;
      const carriages = vehicleData.attributes.carriages;
      if (Array.isArray(carriages) && carriages.length > 0) {
        prediction.carCount = carriages.length;
        prediction.carriageOccupancy = carriages.map(
          (c: any) => c.occupancy_status ?? 'NO_DATA_AVAILABLE'
        );
      }
    }

    predictions.push(prediction);
  }

  // Group by route + direction
  const groupMap = new Map<string, DirectionGroup>();

  for (const pred of predictions) {
    const key = `${pred.route.id}-${pred.directionId}`;
    if (!groupMap.has(key)) {
      groupMap.set(key, {
        key,
        routeId: pred.route.id,
        routeName: pred.route.longName || pred.route.shortName,
        routeShortName: pred.route.shortName,
        routeColor: pred.route.color,
        routeTextColor: pred.route.textColor,
        routeType: pred.route.type,
        directionId: pred.directionId,
        directionName: pred.route.directionNames[pred.directionId],
        destination: pred.route.directionDestinations[pred.directionId],
        predictions: [],
      });
    }
    const group = groupMap.get(key)!;
    if (group.predictions.length < 4) {
      group.predictions.push(pred);
    }
  }

  const directions = Array.from(groupMap.values()).sort((a, b) => {
    // Rail before bus, then by route name, then by direction
    if (a.routeType !== b.routeType) return a.routeType - b.routeType;
    const nameCompare = a.routeName.localeCompare(b.routeName);
    if (nameCompare !== 0) return nameCompare;
    return a.directionId - b.directionId;
  });

  const alerts = parseAlerts(alertsData);
  const stopAlerts = alerts.filter((a) => a.isStopScoped);
  const routeAlerts = alerts.filter((a) => !a.isStopScoped);

  return { stop, directions, stopAlerts, routeAlerts };
}
