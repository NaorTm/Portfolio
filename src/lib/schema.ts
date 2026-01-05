import { z } from "zod";

const ThemeSchema = z.object({
  default: z.enum(["light", "dark"]).default("dark"),
  allowToggle: z.boolean().default(true),
});

const SiteSchema = z.object({
  url: z.string().url(),
  basePath: z.string().default(""),
  title: z.string(),
  description: z.string(),
  ogImage: z.string(),
  theme: ThemeSchema,
});

const ProfileSchema = z.object({
  name: z.string(),
  headline: z.string(),
  location: z.string().optional(),
  bio: z.string(),
  atGlance: z.array(z.string()).default([]),
});

const SocialSchema = z.object({
  github: z.string(),
  linkedin: z.string(),
  email: z.string().email(),
});

const ResumeSchema = z.object({
  pdfPath: z.string(),
  highlights: z.array(z.string()).min(1),
});

const GithubOverrideSchema = z.object({
  demoUrl: z.string().url().optional(),
  tags: z.array(z.string()).optional(),
  thumbnail: z.string().optional(),
  impact: z.string().optional(),
  howToRun: z.string().optional(),
});

const GithubSchema = z.object({
  username: z.string(),
  featuredTopic: z.string().default("featured"),
  excludeForks: z.boolean().default(true),
  excludeArchived: z.boolean().default(true),
  maxRepos: z.number().int().min(1).max(100).default(18),
  allowlist: z.array(z.string()).default([]),
  pinned: z.array(z.string()).default([]),
  overrides: z.record(GithubOverrideSchema).default({}),
});

const SkillsSchema = z.record(z.array(z.string()));

const ContactSchema = z.object({
  enableForm: z.boolean().default(false),
  formProvider: z.string().default("formspree"),
  formEndpoint: z.string().default(""),
});

export const PortfolioConfigSchema = z.object({
  site: SiteSchema,
  profile: ProfileSchema,
  social: SocialSchema,
  resume: ResumeSchema,
  github: GithubSchema,
  skills: SkillsSchema,
  contact: ContactSchema,
});

export type PortfolioConfig = z.infer<typeof PortfolioConfigSchema>;
