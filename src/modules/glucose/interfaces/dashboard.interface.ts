export interface IDashboardData {
  latestReading: {
    value: number;
    unit: string;
    mealContext: string;
    statusLabel: string;
    recordedAt: Date;
  } | null;
  daySummary: {
    average: number | null;
    totalReadings: number;
    target: number;
  };
  trend: 'UP' | 'DOWN' | 'STABLE';
  sparkline: {
    value: number;
    recordedAt: Date;
  }[];
}

export interface IReportSummary {
  period: string; // e.g. "Last 7 days" or dates
  mealDistribution: Record<string, number>; // "Fasting": 20 etc
  glycemicVariability: {
    sd: number; // Standard Deviation
    cv: number; // Coefficient of Variation (optional but nice)
  };
  compliance: {
    totalReadings: number;
    daysWithReadings: number;
    complianceScore: number; // Percentage
  };
}
