export interface IGlucoseReading {
  userId: string;
  glucoseValue: string;
  readingType: string;
  mealContext: string;
  recordedAt: Date;
  notes?: string;
  createdAt?: Date;
}

export interface ITirStats {
  tir: number;
  tbr: number;
  tar: number;
}

export interface IAnalyticsResult {
  period: string;
  stats: ITirStats;
  hba1c: number | null;
  chartData: IChartData[];
}

export interface IChartData {
  date: string;
  value: number;
  type: string;
}

export interface IDashboardData {
  latestReading: (IGlucoseReading & { glucoseValue: number }) | null;
  todayAverage: number | null;
  status: 'NORMAL' | 'LOW' | 'HIGH' | null;
}
