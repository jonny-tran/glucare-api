export interface IReportSummary {
  period: string;
  mealDistribution: Record<string, number>;
  glycemicVariability: {
    sd: number;
    cv?: number;
  };
  compliance: {
    totalReadings: number;
    daysWithReadings: number;
    score: number; // Percentage
  };
}
