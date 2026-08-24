import { copyFile, mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const output = join(process.cwd(), "dist", "client");
const routes = ["today", "study", "results", "library", "progress", "settings"];

for (const route of routes) {
  const source = join(output, `${route}.html`);
  const html = await readFile(source, "utf8");
  if (!html.includes("__NEXT_DATA__") || /http-equiv=["']refresh/i.test(html)) {
    throw new Error(`Refusing to publish an invalid static page: ${route}.html`);
  }
  const directory = join(output, route);
  await mkdir(directory, { recursive: true });
  await copyFile(source, join(directory, "index.html"));
}

console.log(`Prepared ${routes.length} clean GitHub Pages routes in dist/client/.`);
