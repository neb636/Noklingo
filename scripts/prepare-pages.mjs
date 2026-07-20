import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const assetPrefix = (process.env.ASSET_PREFIX ?? "").replace(/\/$/, "");
const outputDirectory = "dist/client";

if (!assetPrefix) process.exit(0);

async function rewriteAssetPaths(directory) {
  const entries = await readdir(directory, { withFileTypes: true });

  await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return rewriteAssetPaths(path);
      if (!/\.(?:html|rsc|css)$/.test(entry.name)) return;

      const contents = await readFile(path, "utf8");
      const rewritten = contents.replace(
        /(["'(])\/assets\//g,
        `$1${assetPrefix}/assets/`,
      );

      if (rewritten !== contents) await writeFile(path, rewritten);
    }),
  );
}

await rewriteAssetPaths(outputDirectory);
