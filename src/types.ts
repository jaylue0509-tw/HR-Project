export type Role = 'HR' | 'Employee' | 'Supervisor';

export interface HRAccount {
  id: number;
  name: string;
  email: string;
  canImport: number;
  canExport: number;
  canManageAccounts: number;
  createdAt?: string;
}

export interface User {
  company: string;
  department: string;
  name: string;
  title: string;
  email: string; // primary key
  supervisorName: string;
  supervisorEmail: string;
}

export interface AssessmentScores {
  // 1-5 scale
  textGeneration: number;
  contentOrganization: number;
  workEfficiency: number;
  processOptimization: number;
  analysis: number;
  decisionSupport: number;
  ideaGeneration: number;
  professionalApplication: number;
  structureDesign: number;
  botConstruction: number;
}

export interface AssessmentData {
  tools: string;
  frequency: string;
  botNames: string;
  botCount: number;
  scores: AssessmentScores;
  evidenceDesc: string;
  evidenceLink: string;
}

export interface AssessmentComputed {
  domainContent: number; // (text + content)/2 * 2 (Scale to 10)
  domainEfficiency: number;
  domainAnalysis: number;
  domainInnovation: number;
  domainIntegration: number;
  breadth: number;
  depth: number;
  comprehensiveScore: number;
  coreStrengths: string;
  talentType: string;
}

export interface SupervisorReview {
  impactScore: number; // 1-5
  evidenceStatus: 'Approved' | 'Rejected' | 'None';
  comments: string;
  reviewedAt: string;
  finalGrade: 'A' | 'B' | 'C' | 'D' | 'E';
}

export interface AssessmentRecord {
  userEmail: string;
  status: 'Pending' | 'Submitted' | 'Reviewed';
  submittedAt?: string;
  data?: AssessmentData;
  computed?: AssessmentComputed;
  supervisorReview?: SupervisorReview;
}
