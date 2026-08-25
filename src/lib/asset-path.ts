const rawBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
export const basePath = rawBasePath && rawBasePath !== "/"
  ? `/${rawBasePath.replace(/^\/+|\/+$/g, "")}`
  : "";

export function assetPath(path: string): string {
  if (/^(?:[a-z]+:)?\/\//i.test(path) || path.startsWith("data:") || path.startsWith("blob:")) {
    return path;
  }
  const cleanPath = `/${path.replace(/^\/+/, "")}`;
  if (basePath && (cleanPath === basePath || cleanPath.startsWith(`${basePath}/`))) {
    return cleanPath;
  }
  return `${basePath}${cleanPath}`;
}
