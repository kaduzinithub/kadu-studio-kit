import { z } from "zod";

export const generatedFileSchema = z.object({
  path: z.enum(["index.html", "styles.css", "script.js"]),
  content: z.string().min(1).max(300_000),
});

export const generatedProjectSchema = z.object({
  projectName: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use um identificador URL seguro."),
  title: z.string().trim().min(1).max(160),
  files: z.array(generatedFileSchema).length(3),
});

export type GeneratedProject = z.infer<typeof generatedProjectSchema>;

export const generatedProjectJsonSchema = {
  type: "object",
  properties: {
    projectName: { type: "string", description: "Nome URL seguro em kebab-case." },
    title: { type: "string", description: "Título humano do website." },
    files: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: {
        type: "object",
        properties: {
          path: { type: "string", enum: ["index.html", "styles.css", "script.js"] },
          content: { type: "string" },
        },
        required: ["path", "content"],
        additionalProperties: false,
      },
    },
  },
  required: ["projectName", "title", "files"],
  additionalProperties: false,
} as const;

export function toGeneratedSiteFiles(project: GeneratedProject) {
  const files = Object.fromEntries(project.files.map((file) => [file.path, file.content]));
  const required = ["index.html", "styles.css", "script.js"] as const;
  if (required.some((path) => !files[path])) {
    throw new Error("A IA não retornou os três arquivos obrigatórios do site.");
  }
  return files as Record<(typeof required)[number], string>;
}
