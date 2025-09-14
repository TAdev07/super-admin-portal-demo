export interface App {
  id: number;
  name: string;
  code: string;
  icon?: string;
  remoteEntry?: string;
  origin?: string;
  allowedScopes?: string[];
  createdAt: string;
  updatedAt: string;
}