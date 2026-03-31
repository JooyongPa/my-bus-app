/** Stable id from your transit provider or internal slug */
export type BusStopId = string;

export interface BusStop {
  id: BusStopId;
  name: string;
}

export interface RouteRef {
  id: string;
  shortName: string;
}
