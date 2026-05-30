import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

import { config } from "@/config/config";
import { slugifyTopic } from "@/storage/topic-path";
import type { TopicClassification } from "@/core/topic-classification";

export function createRawSeed(options: {
  question: string;
  classification: TopicClassification;
  onExisting?: "error" | "reuse";
}) {
  const rawDir = path.join(config.vault.path, "00-raw");
  fs.mkdirSync(rawDir, { recursive: true });

  const slug = slugifyTopic(options.classification.topic);
  const filePath = path.join(rawDir, `${slug}.md`);

  if (fs.existsSync(filePath)) {
    if (options.onExisting === "reuse") {
      return {
        path: filePath,
        relativePath: path.relative(config.vault.path, filePath),
        created: false,
      };
    }

    throw new Error(`Raw seed already exists: ${filePath}`);
  }

  const content = matter.stringify(options.question.trim() + "\n", {
    title: options.classification.title,
    domain: options.classification.domain,
    topic: options.classification.topic,
    tags: options.classification.tags,
    source_type: "question",
  });

  fs.writeFileSync(filePath, content);

  return {
    path: filePath,
    relativePath: path.relative(config.vault.path, filePath),
    created: true,
  };
}
