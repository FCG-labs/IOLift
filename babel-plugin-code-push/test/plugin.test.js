import fs from "fs";
import { transformSync } from "@babel/core";

describe("babel plugin", () => {
  test("case1: using custom Versioning class", () => {
    const input = fs.readFileSync("./cases/sample1-input", { encoding: "utf-8" });
    const expected = fs.readFileSync("./cases/sample1-output", {
      encoding: "utf-8",
    });

    const generated = transformSync(input, {
      plugins: [
        [
          "../index.js",
          {
            configPath: "./cases/sample1-config",
          },
        ],
      ],
    });

    expect(generated.code).toBe(expected);
  });

  test("case2: using provided Versioning class", () => {
    const input = fs.readFileSync("./cases/sample2-input", { encoding: "utf-8" });
    const expected = fs.readFileSync("./cases/sample2-output", {
      encoding: "utf-8",
    });

    const generated = transformSync(input, {
      plugins: [
        [
          "../index.js",
          {
            configPath: "./cases/sample2-config",
          },
        ],
      ],
    });

    expect(generated.code).toBe(expected);
  });
});
