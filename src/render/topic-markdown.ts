import matter from "gray-matter";

import { type Knowledge } from "@/schema/knowledge-schema";

const formatObsidianDate = (date: Date) => {
  return date.toISOString().slice(0, 10);
};

const renderList = (items: string[]) => {
  if (items.length === 0) return ["- None"];

  return items.map((item) => `- ${item}`);
};

const renderRelated = (items: string[]) => {
  if (items.length === 0) return ["- None"];

  return items.map((item) => {
    const trimmed = item.trim();
    if (trimmed.startsWith("[[")) return `- ${trimmed}`;
    return `- [[${trimmed}]]`;
  });
};

const renderSources = (sources: { title: string; relativePath: string }[]) => {
  if (sources.length === 0) return ["- None"];

  return sources.map((source) => {
    const rawName = source.relativePath.split("/").at(-1)?.replace(/\.md$/, "");

    const title = source.title
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());

    return `- [[${rawName}|${title}]]`;
  });
};

export const renderTopicMarkdown = (options: {
  knowledge: Knowledge;
  domain: string;
  topic: string;
  tags: string[];
  sources: {
    title: string;
    path: string;
    relativePath: string;
  }[];
}) => {
  const now = formatObsidianDate(new Date());

  const body = [
    `# ${options.knowledge.title}`,
    "",
    "## Summary",
    "",
    options.knowledge.summary.trim(),
    "",
    "## Key Concepts",
    "",
    ...options.knowledge.keyConcepts.map(
      (concept) =>
        `- **${concept.name.trim()}**: ${concept.explanation.trim()}`,
    ),
    "",
    "## Deep Dive",
    "",
    ...options.knowledge.deepDive.flatMap((section) => [
      `### ${section.heading.trim()}`,
      "",
      section.body.trim(),
      "",
    ]),
    "## Related",
    "",
    ...renderRelated(options.knowledge.related),
    "",
    "## Open Questions",
    "",
    ...renderList(options.knowledge.openQuestions),
    "",
    "## Sources",
    "",
    ...renderSources(options.sources),
    "",
  ].join("\n");

  return matter.stringify(body, {
    title: options.knowledge.title,
    domain: options.domain,
    topic: options.topic,
    tags: options.tags,
    source_type: "topic",
    created_at: now,
    updated_at: now,
  });
};
