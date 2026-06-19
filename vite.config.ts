import { defineConfig } from "vite-plus";

export default defineConfig({
  staged: {
    "*": "vp run staged:check",
  },
  pack: {
    entry: ["src/cli/main.ts"],
    dts: {
      tsgo: true,
    },
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  fmt: {},
});
