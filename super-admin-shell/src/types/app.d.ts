export interface App {
  id: number;
  name: string;
  code?: string;
  url?: string;
  origin?: string;
  icon?: string;
  allowedScopes?: string[];
  remoteEntry?: string;
  createdAt: string;
  updatedAt: string;
}
