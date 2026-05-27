import { describe, it, expect } from 'vitest';
import { parseAlerts, alertsForCard } from './alerts';
import type { Alert } from './types';

// --- fixtures ---

function makeRawAlert(overrides: {
  id?: string;
  effect?: string;
  header?: string;
  informed_entity?: object[];
}) {
  return {
    id: overrides.id ?? 'alert-1',
    attributes: {
      effect: overrides.effect ?? 'SUSPENSION',
      header: overrides.header ?? 'Service suspended',
      informed_entity: overrides.informed_entity ?? [{ route: 'Red' }],
    },
  };
}

function makeAlert(overrides: Partial<Alert> = {}): Alert {
  return {
    id: 'alert-1',
    effect: 'SUSPENSION',
    header: 'Service suspended',
    routeIds: ['Red'],
    directionId: null,
    stopIds: [],
    isStopScoped: false,
    ...overrides,
  };
}

// --- parseAlerts ---

describe('parseAlerts', () => {
  it('returns empty array for empty data', () => {
    expect(parseAlerts({ data: [] })).toEqual([]);
  });

  it('keeps service-impacting effects', () => {
    const effects = [
      'SUSPENSION', 'NO_SERVICE', 'SIGNIFICANT_DELAYS', 'STOP_CLOSURE',
      'SHUTTLE', 'DETOUR', 'REDUCED_SERVICE', 'DELAY', 'SERVICE_CHANGE', 'MODIFIED_SERVICE',
    ];
    for (const effect of effects) {
      const result = parseAlerts({ data: [makeRawAlert({ effect })] });
      expect(result).toHaveLength(1);
      expect(result[0].effect).toBe(effect);
    }
  });

  it('drops non-service-impacting effects', () => {
    const dropped = ['ELEVATOR_CLOSURE', 'ESCALATOR_CLOSURE', 'NO_EFFECT',
      'ADDITIONAL_SERVICE', 'PARKING_ISSUE', 'BIKE_ISSUE', 'POLICY_CHANGE'];
    for (const effect of dropped) {
      expect(parseAlerts({ data: [makeRawAlert({ effect })] })).toHaveLength(0);
    }
  });

  it('classifies alert with route IDs as route-scoped', () => {
    const result = parseAlerts({
      data: [makeRawAlert({ informed_entity: [{ route: 'Red' }] })],
    });
    expect(result[0].isStopScoped).toBe(false);
    expect(result[0].routeIds).toEqual(['Red']);
  });

  it('classifies alert with no route IDs as stop-scoped', () => {
    const result = parseAlerts({
      data: [makeRawAlert({ informed_entity: [{ stop: 'place-pktrm' }] })],
    });
    expect(result[0].isStopScoped).toBe(true);
    expect(result[0].routeIds).toEqual([]);
    expect(result[0].stopIds).toEqual(['place-pktrm']);
  });

  it('classifies alert with both route and stop IDs as route-scoped', () => {
    const result = parseAlerts({
      data: [makeRawAlert({
        informed_entity: [{ route: 'Red' }, { stop: 'place-pktrm' }],
      })],
    });
    expect(result[0].isStopScoped).toBe(false);
    expect(result[0].routeIds).toEqual(['Red']);
  });

  it('extracts direction when all entities agree on one direction', () => {
    const result = parseAlerts({
      data: [makeRawAlert({
        informed_entity: [{ route: 'Red', direction_id: 0 }, { route: 'Red', direction_id: 0 }],
      })],
    });
    expect(result[0].directionId).toBe(0);
  });

  it('sets directionId to null when entities have mixed directions', () => {
    const result = parseAlerts({
      data: [makeRawAlert({
        informed_entity: [{ route: 'Red', direction_id: 0 }, { route: 'Red', direction_id: 1 }],
      })],
    });
    expect(result[0].directionId).toBeNull();
  });

  it('sets directionId to null when no entities have a direction', () => {
    const result = parseAlerts({
      data: [makeRawAlert({ informed_entity: [{ route: 'Red' }] })],
    });
    expect(result[0].directionId).toBeNull();
  });

  it('deduplicates multiple route IDs from informed_entity', () => {
    const result = parseAlerts({
      data: [makeRawAlert({
        informed_entity: [{ route: 'Red' }, { route: 'Red' }, { route: 'Orange' }],
      })],
    });
    expect(result[0].routeIds).toEqual(['Red', 'Orange']);
  });

  it('parses the alert header', () => {
    const result = parseAlerts({
      data: [makeRawAlert({ header: 'Red Line delays due to signal problem' })],
    });
    expect(result[0].header).toBe('Red Line delays due to signal problem');
  });
});

// --- alertsForCard ---

describe('alertsForCard', () => {
  it('returns empty array when there are no alerts', () => {
    expect(alertsForCard([], 'Red', 0)).toEqual([]);
  });

  it('returns alert when route ID matches', () => {
    const alert = makeAlert({ routeIds: ['Red'] });
    expect(alertsForCard([alert], 'Red', 0)).toEqual([alert]);
  });

  it('returns empty when route ID does not match', () => {
    const alert = makeAlert({ routeIds: ['Orange'] });
    expect(alertsForCard([alert], 'Red', 0)).toEqual([]);
  });

  it('returns alert with null directionId for both directions', () => {
    const alert = makeAlert({ routeIds: ['Red'], directionId: null });
    expect(alertsForCard([alert], 'Red', 0)).toEqual([alert]);
    expect(alertsForCard([alert], 'Red', 1)).toEqual([alert]);
  });

  it('returns alert with matching directionId only for that direction', () => {
    const alert = makeAlert({ routeIds: ['Red'], directionId: 0 });
    expect(alertsForCard([alert], 'Red', 0)).toEqual([alert]);
    expect(alertsForCard([alert], 'Red', 1)).toEqual([]);
  });

  it('returns all alerts when multiple match', () => {
    const a1 = makeAlert({ id: 'a1', effect: 'SUSPENSION', routeIds: ['Red'], directionId: null });
    const a2 = makeAlert({ id: 'a2', effect: 'SHUTTLE', routeIds: ['Red'], directionId: null });
    const result = alertsForCard([a1, a2], 'Red', 0);
    expect(result).toHaveLength(2);
    expect(result).toContain(a1);
    expect(result).toContain(a2);
  });

  it('filters out alerts for other routes when multiple routes present', () => {
    const redAlert = makeAlert({ id: 'r', routeIds: ['Red'] });
    const orangeAlert = makeAlert({ id: 'o', routeIds: ['Orange'] });
    expect(alertsForCard([redAlert, orangeAlert], 'Red', 0)).toEqual([redAlert]);
  });
});
