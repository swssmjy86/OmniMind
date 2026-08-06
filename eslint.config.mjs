import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // 로컬 Obsidian 볼트(저장소 루트에서 우연히 열린 개인 도구 산출물) — 프로젝트 코드 아님
    ".obsidian/**",
  ]),
]);

export default eslintConfig;
