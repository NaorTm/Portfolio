const markdownImage = /!\[[^\]]*]\((?<url>[^)\s]+)(?:\s+"[^"]*")?\)/i;
const htmlImage = /<img[^>]*src=["']([^"']+)["'][^>]*>/i;

export function extractFirstImageUrl(markdown) {
  if (!markdown) {
    return null;
  }

  const markdownMatch = markdown.match(markdownImage);
  if (markdownMatch?.groups?.url) {
    return markdownMatch.groups.url;
  }

  const htmlMatch = markdown.match(htmlImage);
  if (htmlMatch?.[1]) {
    return htmlMatch[1];
  }

  return null;
}

export function resolveReadmeImageUrl(src, { owner, repo, defaultBranch }) {
  if (!src) {
    return null;
  }

  if (src.startsWith("http://") || src.startsWith("https://")) {
    return src;
  }

  if (src.startsWith("//")) {
    return `https:${src}`;
  }

  if (src.startsWith("data:")) {
    return src;
  }

  const cleaned = src.replace(/^\.?\//, "");
  return `https://raw.githubusercontent.com/${owner}/${repo}/${defaultBranch}/${cleaned}`;
}
