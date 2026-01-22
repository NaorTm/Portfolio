const API_BASE = "https://api.github.com";
const API_VERSION = "2022-11-28";

function getAuthHeaders() {
  // Try import.meta.env first (Astro), then process.env (Node)
  const token = import.meta.env.GITHUB_TOKEN ?? import.meta.env.GH_TOKEN ?? process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function githubFetch(url, init = {}) {
  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": API_VERSION,
    "User-Agent": "portfolio-build",
    ...getAuthHeaders(),
    ...(init.headers ?? {}),
  };

  const response = await fetch(url, { ...init, headers });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`GitHub API error ${response.status}: ${detail}`);
  }

  return response.json();
}

export async function fetchUserRepos(username) {
  const url = `${API_BASE}/users/${username}/repos?per_page=100&sort=pushed`;
  return githubFetch(url);
}

export async function fetchRepoTopics(owner, repo) {
  const url = `${API_BASE}/repos/${owner}/${repo}/topics`;
  const data = await githubFetch(url);
  return data.names ?? [];
}

export async function fetchRepoLanguages(owner, repo) {
  const url = `${API_BASE}/repos/${owner}/${repo}/languages`;
  return githubFetch(url);
}

export async function fetchRepoReadme(owner, repo) {
  const url = `${API_BASE}/repos/${owner}/${repo}/readme`;
  try {
    const data = await githubFetch(url);
    if (!data?.content || data.encoding !== "base64") {
      return null;
    }
    return Buffer.from(data.content, "base64").toString("utf8");
  } catch (error) {
    return null;
  }
}
