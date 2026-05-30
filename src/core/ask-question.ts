import { config } from "@/config/config";
import { compileTopic } from "./compile-topic";
import { answerWithContext } from "@/llm/answer";
import { seedTopic } from "../../scripts/seed-topic";
import { readCompiledTopics, type CompiledTopic } from "@/storage/topic-reader";

const formatTopicForContext = (topic: CompiledTopic) => {
  return [
    `Source: ${topic.relativePath}`,
    `Title: ${topic.title}`,
    topic.domain ? `Domain: ${topic.domain}` : "",
    topic.topic ? `Topic: ${topic.topic}` : "",
    topic.tags.length > 0 ? `Tags: ${topic.tags.join(", ")}` : "",
    "",
    topic.body,
  ]
    .filter(Boolean)
    .join("\n");
};

export const askQuestion = async (
  question: string,
  options: { domain?: string; topic?: string },
) => {
  const trimmedQuestion = question.trim();

  if (!trimmedQuestion) {
    throw new Error("Question is required");
  }

  const topics = readCompiledTopics({
    vaultPath: config.vault.path,
    domain: options.domain,
    topic: options.topic,
  });

  if (topics.length === 0) {
    throw new Error("No compiled topics found in 04-topics");
  }

  const context = topics.map(formatTopicForContext).join("\n---\n");

  const answer = await answerWithContext({
    question: trimmedQuestion,
    context,
  });

  return {
    answer,
    sources: topics.map((t) => t.relativePath),
  };
};

export const askQuestionWithAutoCompile = async (question: string) => {
  const seeded = await seedTopic(question, { onExisting: "reuse" });

  const compiled = await compileTopic({
    domain: seeded.classification.domain,
    topic: seeded.classification.topic,
  });

  const answer = await askQuestion(question, {
    domain: seeded.classification.domain,
    topic: seeded.classification.topic,
  });

  return {
    ...answer,
    classification: seeded.classification,
    rawSeed: seeded.rawSeed,
    compiledPaths: compiled?.compiledPaths || [],
  };
};
