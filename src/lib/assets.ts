const externalSource = /^(?:[a-z]+:|\/\/)/iu;

/**
 * Resolve a file from `public/` without assuming the app is hosted at `/`.
 * GitHub Pages previews and production both add a path prefix at build time.
 */
export function publicAssetPath(source: string): string;
export function publicAssetPath(source: undefined): undefined;
export function publicAssetPath(source: string | undefined) {
  if (!source) return undefined;
  if (externalSource.test(source)) return source;
  const prefix = (process.env.NEXT_PUBLIC_ASSET_PREFIX ?? "").replace(
    /\/$/u,
    "",
  );
  const path = source.replace(/^\/+/, "");
  return `${prefix}/${path}`;
}
