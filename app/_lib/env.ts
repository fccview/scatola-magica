import "server-only";

import { readFileSync } from "fs";
import { logger } from "@/app/_lib/logger";

const SCOPE = "env";

export const envOrFile = (name: string): string | undefined => {
  const filePath = process.env[`${name}_FILE`];

  if (filePath) {
    try {
      return readFileSync(filePath, "utf-8").trim();
    } catch (error) {
      logger.error(SCOPE, `Cannot read ${name}_FILE at ${filePath}`, error);
    }
  }

  return process.env[name]?.trim() || undefined;
};
