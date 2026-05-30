import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { compileTopic } from "@/core/compile-topic";
import { seedTopic } from "../../scripts/seed-topic";
import { askQuestionWithAutoCompile } from "@/core/ask-question";

const printAskResult = (
  result: Awaited<ReturnType<typeof askQuestionWithAutoCompile>>,
) => {
  console.log(
    result.rawSeed.created ? "Created raw seed:" : "Reused raw seed:",
    result.rawSeed.relativePath,
  );

  for (const compiledPath of result.compiledPaths) {
    console.log("Compiled:", compiledPath);
  }

  console.log("\nAnswer:");
  console.log(result.answer);

  console.log("\nSources:");
  for (const source of result.sources) {
    console.log(`- ${source}`);
  }
};

await yargs(hideBin(process.argv))
  .scriptName("norra")
  .command(
    "ask <question>",
    "Ask a question, seed raw knowledge if needed, compile it, then answer",
    (y) => {
      y.positional("question", {
        type: "string",
        demandOption: true,
      });
    },
    async (argv) => {
      const result = await askQuestionWithAutoCompile(String(argv.question));
      printAskResult(result);

      console.log(
        result.rawSeed.created ? "Created raw seed:" : "Reused raw seed:",
        result.rawSeed.relativePath,
      );

      for (const compiledPath of result.compiledPaths) {
        console.log("Compiled:", compiledPath);
      }

      console.log("\nAnswer:");
      console.log(result.answer);

      console.log("\nSources:");
      for (const source of result.sources) {
        console.log(`- ${source}`);
      }
    },
  )
  .command(
    "seed <question>",
    "Create a raw seed note from a question",
    (y) => {
      y.positional("question", {
        type: "string",
        demandOption: true,
      });
    },
    async (argv) => {
      const result = await seedTopic(String(argv.question));

      console.log("Created raw seed:");
      console.log(`Title: ${result.classification.title}`);
      console.log(`Domain: ${result.classification.domain}`);
      console.log(`Topic: ${result.classification.topic}`);
      console.log(`Path: ${result.rawSeed.relativePath}`);
    },
  )
  .command(
    "compile",
    "Compile raw sources into topic pages",
    (y) => {
      return y.option("domain", { type: "string" }).option("topic", {
        type: "string",
      });
    },
    async (argv) => {
      const result = await compileTopic({
        domain: argv.domain,
        topic: argv.topic,
      });

      if (result?.compiledPaths.length === 0) {
        console.log("No matching raw sources found.");
      }
    },
  )
  .command(
    "repl",
    "Start an interactive question loop",
    () => {},
    async () => {
      const rl = createInterface({ input, output });

      console.log("Norra interactive mode");
      console.log("Type a question, or type exit to quit.\n");

      try {
        while (true) {
          const question = (await rl.question("norra> ")).trim();

          if (!question) {
            continue;
          }

          if (
            question.toLowerCase() === "exit" ||
            question.toLowerCase() === "quit"
          ) {
            break;
          }

          try {
            const result = await askQuestionWithAutoCompile(question);
            printAskResult(result);
            console.log("");
          } catch (error) {
            console.error(
              "Error:",
              error instanceof Error ? error.message : String(error),
            );
          }
        }
      } finally {
        rl.close();
      }
    },
  )
  .demandCommand(1)
  .strict()
  .help()
  .parse();
