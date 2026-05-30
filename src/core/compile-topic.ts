import fs from "node:fs";
import path from "node:path";

import { config } from "@/config/config";
import { callStructured } from "@/llm/structured";
import { KnowledgeSchema } from "../schema/knowledge-schema";
import { resolveTopicDomainPath } from "@/storage/topic-path";
import { renderTopicMarkdown } from "@/render/topic-markdown";
import { scanRawSources, type RawSource } from "@/ingest/raw-source";

const groupByTopicDomain = (raws: RawSource[]) => {
  const groups = new Map<string, RawSource[]>();

  for (const raw of raws) {
    const key = `${raw.meta.domain}|||${raw.meta.topic}`;
    groups.set(key, [...(groups.get(key) ?? []), raw]);
  }

  return groups;
};

const buildPrompt = (raws: RawSource[]) => {
  return raws
    .map((raw, index) => {
      return [
        `Source ${index + 1}: ${raw.meta.title}`,
        raw.meta.source_url ? `URL: ${raw.meta.source_url}` : null,
        raw.body,
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n---\n\n");
};

export const compileTopic = async (options: {
  domain?: string;
  topic?: string;
}) => {
  const rawDir = path.join(config.vault.path, "00-raw");

  const raws = scanRawSources(rawDir).filter((raw) => {
    if (options.domain && raw.meta.domain !== options.domain) return false;
    if (options.topic && raw.meta.topic !== options.topic) return false;
    return true;
  });

  const groups = groupByTopicDomain(raws);

  for (const [, group] of groups) {
    const first = group[0];

    if (!first) continue;

    const knowledge = await callStructured({
      schema: KnowledgeSchema,
      name: "compiled_topic",
      system: `
        You compile raw learning material into a detailed Markdown wiki topic.

        Rules:
        - Do not invent facts.
        - Write a substantial summary of 150-250 words.
        - Produce 6-10 key concepts.
        - Produce 4-6 deep-dive sections.
        - Each deep-dive section should be 120-250 words.
        - Deep-dive section bodies may contain valid Markdown.
        - Use fenced code blocks for code examples.
        - Use bullet lists when explaining multiple items.
        - Preserve important technical terms, formulas, and examples.
        - Prefer useful explanation over brevity.
        - Do not write Markdown headings inside deep-dive bodies; headings are provided separately.
      `,
      user: buildPrompt(group),
    });

    const outputPath = resolveTopicDomainPath({
      vaultPath: config.vault.path,
      domain: first.meta.domain,
      topic: first.meta.topic,
    });

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });

    fs.writeFileSync(
      outputPath,
      renderTopicMarkdown({
        knowledge,
        domain: first.meta.domain,
        topic: first.meta.topic,
        tags: [...new Set(group.flatMap((raw) => raw.meta.tags))],
        sources: group.map((raw) => ({
          title: raw.meta.title,
          path: raw.path,
          relativePath: path.relative(config.vault.path, raw.path),
        })),
      }),
    );

    console.log(`Compiled: ${outputPath}`);

    const compiledPaths: string[] = [];

    compiledPaths.push(outputPath);

    return { compiledPaths };
  }
};
