export interface IPatientMetrics {
  totalPatients: number;
  newPatientsThisMonth: number;
  growthPercentage: number;
  activePatients7Days: number;
}

export interface IDoctorMetrics {
  totalDoctors: number;
  pendingDoctors: number;
  activeDoctors: number;
  blockedDoctors: number;
  activeConnections: number;
}

export interface IAiCostMetrics {
  totalRequestsThisMonth: number;
  voiceUsagePercentage: number;
  ocrUsagePercentage: number;
  successRatePercentage: number;
  failedRequests: number;
}

export interface ISystemHealthMetrics {
  dataIngestionToday: number;
  publishedArticles: number;
  draftArticles: number;
}

export interface IDashboardOverview {
  patients: IPatientMetrics;
  doctors: IDoctorMetrics;
  aiTracking: IAiCostMetrics;
  systemHealth: ISystemHealthMetrics;
  lastUpdatedAt: Date;
}
