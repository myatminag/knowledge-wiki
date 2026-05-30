import { classifyTopic } from "@/core/topic-classification";

import { createRawSeed } from "./create-raw-seed";

export async function seedTopic(
  question: string,
  options: { onExisting?: "error" | "reuse" } = {},
) {
  const classification = await classifyTopic(question);

  const rawSeed = createRawSeed({
    question,
    classification,
    onExisting: options.onExisting,
  });

  return {
    classification,
    rawSeed,
  };
}
