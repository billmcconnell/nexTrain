export interface Stop {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export interface Route {
  id: string;
  longName: string;
  shortName: string;
  color: string;
  textColor: string;
  type: number; // 0=light rail, 1=heavy rail, 2=commuter rail, 3=bus, 4=ferry
  directionNames: [string, string];
  directionDestinations: [string, string];
}

export interface Prediction {
  id: string;
  directionId: 0 | 1;
  departureTime: string | null;
  arrivalTime: string | null;
  scheduleRelationship: string | null;
  route: Route;
  occupancyStatus?: string;
  carCount?: number;
  tripId: string;
}

export interface DirectionGroup {
  key: string; // `${routeId}-${directionId}`
  routeId: string;
  routeName: string;
  routeShortName: string;
  routeColor: string;
  routeTextColor: string;
  routeType: number;
  directionId: 0 | 1;
  directionName: string;
  destination: string;
  predictions: Prediction[];
}

export interface StopPredictions {
  stop: Stop;
  directions: DirectionGroup[];
}
