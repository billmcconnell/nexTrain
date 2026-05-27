import type { StopPredictions, Prediction, Alert } from '@/lib/types';

const STOPS_SERVICE = new Set(['SUSPENSION', 'NO_SERVICE', 'SHUTTLE']);

function formatArrival(departureTime: string | null, arrivalTime: string | null): string {
  const iso = departureTime ?? arrivalTime;
  if (!iso) return '—';
  const diffSec = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
  if (diffSec < 60) return 'Due';
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min`;
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

const OCCUPANCY_CONFIG: Record<string, { label: string; color: string }> = {
  MANY_SEATS_AVAILABLE: { label: 'Seats available', color: 'bg-green-500' },
  FEW_SEATS_AVAILABLE: { label: 'Few seats', color: 'bg-yellow-400' },
  STANDING_ROOM_ONLY: { label: 'Standing only', color: 'bg-orange-400' },
  CRUSHED_STANDING_ROOM_ONLY: { label: 'Very crowded', color: 'bg-red-500' },
  FULL: { label: 'Full', color: 'bg-red-600' },
};

function OccupancyDot({ status }: { status?: string }) {
  if (!status || status === 'NO_DATA') return null;
  const config = OCCUPANCY_CONFIG[status];
  if (!config) return null;
  return (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full ${config.color} flex-shrink-0`}
      title={config.label}
    />
  );
}

function PredictionRow({ prediction, dimmed }: { prediction: Prediction; dimmed: boolean }) {
  const time = formatArrival(prediction.departureTime, prediction.arrivalTime);
  const isDue = time === 'Due';

  return (
    <div className={`flex items-center gap-3 py-2 ${dimmed ? 'opacity-40' : ''}`}>
      <span
        className={`w-16 text-right font-mono font-semibold tabular-nums text-sm ${
          isDue ? 'text-amber-400' : 'text-white'
        }`}
      >
        {time}
      </span>
      <OccupancyDot status={prediction.occupancyStatus} />
      {prediction.carCount != null && prediction.route.type !== 3 && (
        <span className="text-zinc-500 text-xs">{prediction.carCount} cars</span>
      )}
    </div>
  );
}

function RouteLabel({ color, textColor, name }: { color: string; textColor: string; name: string }) {
  return (
    <span
      className="inline-block rounded px-2 py-0.5 text-xs font-bold leading-none"
      style={{ backgroundColor: `#${color}`, color: `#${textColor}` }}
    >
      {name}
    </span>
  );
}

function AlertRow({ alert }: { alert: Alert }) {
  return (
    <div className="flex items-start gap-2 rounded-lg bg-amber-950/60 border border-amber-700/50 px-3 py-2 text-amber-300 text-xs">
      <span className="mt-0.5 flex-shrink-0">⚠</span>
      <span>{alert.header}</span>
    </div>
  );
}

function alertsForCard(routeAlerts: Alert[], routeId: string, directionId: 0 | 1): Alert[] {
  return routeAlerts.filter(
    (a) =>
      a.routeIds.includes(routeId) &&
      (a.directionId === null || a.directionId === directionId)
  );
}

export default function PredictionBoard({ data }: { data: StopPredictions }) {
  const { stop, directions, stopAlerts, routeAlerts } = data;

  return (
    <div className="mt-6 space-y-4">
      <div>
        <h2 className="text-2xl font-semibold text-white">{stop.name}</h2>
        <p className="text-zinc-500 text-sm mt-0.5">Live departures · refreshes every 30 s</p>
      </div>

      {stopAlerts.length > 0 && (
        <div className="space-y-2">
          {stopAlerts.map((a) => <AlertRow key={a.id} alert={a} />)}
        </div>
      )}

      {directions.length === 0 && (
        <p className="text-zinc-400 text-sm">No upcoming trips found.</p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {directions.map((group) => {
          const cardAlerts = alertsForCard(routeAlerts, group.routeId, group.directionId);
          const dimPredictions = cardAlerts.some((a) => STOPS_SERVICE.has(a.effect));

          return (
            <div
              key={group.key}
              className="rounded-2xl bg-zinc-800 p-4"
              style={{ borderLeft: `4px solid #${group.routeColor}` }}
            >
              <div className="flex items-center gap-2 mb-1">
                <RouteLabel
                  color={group.routeColor}
                  textColor={group.routeTextColor}
                  name={group.routeShortName || group.routeName}
                />
                <span className="text-zinc-300 text-sm font-medium truncate">
                  {group.directionName}
                </span>
              </div>
              <p className="text-zinc-500 text-xs mb-2 truncate">→ {group.destination}</p>

              {cardAlerts.length > 0 && (
                <div className="space-y-1.5 mb-2">
                  {cardAlerts.map((a) => <AlertRow key={a.id} alert={a} />)}
                </div>
              )}

              <div className="divide-y divide-zinc-700">
                {group.predictions.map((pred) => (
                  <PredictionRow key={pred.id} prediction={pred} dimmed={dimPredictions} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
