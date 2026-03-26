import fs from "node:fs/promises";
import path from "node:path";
import { PortfolioConfigSchema } from "./schema";
import {
  fetchRepoLanguages,
  fetchRepoReadme,
  fetchRepoTopics,
  fetchUserRepos,
} from "./github";
import { extractFirstImageUrl, resolveReadmeImageUrl } from "./readme";

const CONFIG_PATH = path.resolve(process.cwd(), "portfolio.config.json");
const GENERATED_PATH = path.resolve(
  process.cwd(),
  "src",
  "data",
  "projects.generated.json",
);

export async function loadConfig() {
  const raw = await fs.readFile(CONFIG_PATH, "utf8");
  const json = JSON.parse(raw);
  const parsed = PortfolioConfigSchema.safeParse(json);

  if (!parsed.success) {
    const message = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid portfolio.config.json: ${message}`);
  }

  return parsed.data;
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function rankRepos(repos, pinned, maxRepos) {
  const pinnedRepos = pinned
    .map((name) => repos.find((repo) => repo.name === name))
    .filter(Boolean);
  const pinnedSet = new Set(pinnedRepos.map((repo) => repo.name));

  const rest = repos
    .filter((repo) => !pinnedSet.has(repo.name))
    .sort(
      (a, b) => new Date(b.pushed_at).getTime() - new Date(a.pushed_at).getTime(),
    );

  return [...pinnedRepos, ...rest].slice(0, maxRepos);
}

async function ensureTopics(repo, featuredTopic) {
  let topics = Array.isArray(repo.topics) ? repo.topics : null;
  if (!topics) {
    try {
      topics = await fetchRepoTopics(repo.owner.login, repo.name);
    } catch {
      topics = [];
    }
  }
  const hasFeatured = featuredTopic ? topics.includes(featuredTopic) : true;
  return { ...repo, topics, hasFeatured };
}

async function enrichRepo(repo, config) {
  const [languagesRaw, readme] = await Promise.all([
    fetchRepoLanguages(repo.owner.login, repo.name).catch(() => ({})),
    fetchRepoReadme(repo.owner.login, repo.name),
  ]);

  const languages = Object.entries(languagesRaw)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name]) => name);

  const readmeImage = resolveReadmeImageUrl(
    extractFirstImageUrl(readme),
    {
      owner: repo.owner.login,
      repo: repo.name,
      defaultBranch: repo.default_branch || "main",
    },
  );

  const overrides = config.github.overrides?.[repo.name] ?? {};
  const homepage = repo.homepage?.trim() || "";
  const demoUrl =
    overrides.demoUrl ?? (homepage && homepage !== repo.html_url ? homepage : null);
  const thumbnail = overrides.thumbnail ?? readmeImage ?? null;

  return {
    slug: slugify(repo.name),
    name: repo.name,
    fullName: repo.full_name,
    description: repo.description ?? "",
    htmlUrl: repo.html_url,
    homepage,
    stars: repo.stargazers_count ?? 0,
    forks: repo.forks_count ?? 0,
    lastPushedAt: repo.pushed_at,
    languages,
    topics: repo.topics ?? [],
    tags: overrides.tags ?? [],
    demoUrl,
    thumbnail,
    impact: overrides.impact ?? "",
    howToRun: overrides.howToRun ?? "",
  };
}

let cached = null;

export async function getProjects() {
  if (cached) {
    return cached;
  }

  const config = await loadConfig();

  // Try to use the pre-generated file as a fallback when the GitHub API is unavailable
  let projects;
  try {
    const repos = await fetchUserRepos(config.github.username);
    const featuredTopic = config.github.featuredTopic;
    const allowlist = new Set(config.github.allowlist ?? []);

    const filtered = [];
    for (const repo of repos) {
      if (config.github.excludeForks && repo.fork) {
        continue;
      }
      if (config.github.excludeArchived && repo.archived) {
        continue;
      }

      const withTopics = await ensureTopics(repo, featuredTopic);
      if (allowlist.size > 0 && !allowlist.has(repo.name)) {
        continue;
      }
      if (allowlist.size === 0 && featuredTopic && !withTopics.hasFeatured) {
        continue;
      }

      filtered.push(withTopics);
    }

    const ranked = rankRepos(filtered, config.github.pinned, config.github.maxRepos);
    projects = await Promise.all(
      ranked.map((repo) => enrichRepo(repo, config)),
    );

    await fs.mkdir(path.dirname(GENERATED_PATH), { recursive: true });
    await fs.writeFile(GENERATED_PATH, `${JSON.stringify(projects, null, 2)}\n`);
  } catch (err) {
    // GitHub API unavailable — fall back to pre-generated cache if present
    try {
      const raw = await fs.readFile(GENERATED_PATH, "utf8");
      projects = JSON.parse(raw);
    } catch {
      // No cache available; render with an empty project list
      projects = [];
    }
  }

  cached = { config, projects };
  return cached;
}
