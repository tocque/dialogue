import typescript from "rollup-plugin-ts"
import { lezer } from "@lezer/generator/rollup"
import { defineConfig } from "rollup"

export default defineConfig({
  input: "grammar/index.ts",
  external: id => id != "tslib" && !/^(\.?\/|\w:)/.test(id),
  output: {
    file: "src/grammar/index.js",
    format: "es",
  },
  plugins: [lezer(), typescript({
    tsconfig: "tsconfig.grammar.json",
  })],
})
