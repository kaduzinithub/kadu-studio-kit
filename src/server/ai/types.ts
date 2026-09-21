import type { GeneratedProject } from "./schemas";

export type GenerateSiteInput = { prompt: string };
export type EditSiteInput = GenerateSiteInput & {
  currentFiles: Array<{ path: string; content: string }>;
};

export interface AIProvider {
  generateSite(input: GenerateSiteInput): Promise<GeneratedProject>;
  editSite(input: EditSiteInput): Promise<GeneratedProject>;
}
