import type { Alert } from './types';

export const SERVICE_IMPACTING_EFFECTS = new Set([
  'SUSPENSION', 'NO_SERVICE', 'SIGNIFICANT_DELAYS', 'STOP_CLOSURE',
  'SHUTTLE', 'DETOUR', 'REDUCED_SERVICE', 'DELAY', 'SERVICE_CHANGE', 'MODIFIED_SERVICE',
]);

// Effects that mean service has stopped — predictions on the card should be dimmed.
export const STOPS_SERVICE = new Set(['SUSPENSION', 'NO_SERVICE', 'SHUTTLE']);

export function parseAlerts(data: { data: any[] }): Alert[] {
  const alerts: Alert[] = [];
  for (const a of data.data) {
    const effect: string = a.attributes.effect ?? '';
    if (!SERVICE_IMPACTING_EFFECTS.has(effect)) continue;

    const entities: any[] = a.attributes.informed_entity ?? [];
    const routeIds = [...new Set<string>(entities.map((e: any) => e.route).filter(Boolean))];
    const stopIds = [...new Set<string>(entities.map((e: any) => e.stop).filter(Boolean))];
    const rawDirs = [...new Set(entities.map((e: any) => e.direction_id).filter((d: any) => d != null))];
    const directionId: 0 | 1 | null = rawDirs.length === 1 ? (rawDirs[0] as 0 | 1) : null;

    alerts.push({
      id: a.id,
      effect,
      header: a.attributes.header ?? '',
      routeIds,
      directionId,
      stopIds,
      isStopScoped: routeIds.length === 0,
    });
  }
  return alerts;
}

export function alertsForCard(
  routeAlerts: Alert[],
  routeId: string,
  directionId: 0 | 1,
): Alert[] {
  return routeAlerts.filter(
    (a) =>
      a.routeIds.includes(routeId) &&
      (a.directionId === null || a.directionId === directionId),
  );
}
