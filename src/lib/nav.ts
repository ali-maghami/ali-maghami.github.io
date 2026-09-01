export function getNavHref(path: string): string {
	const base = import.meta.env.BASE_URL;
	if (path === '/') return base;
	const cleanPath = path.startsWith('/') ? path : `/${path}`;
	return base.endsWith('/') ? `${base}${cleanPath.slice(1)}` : `${base}${cleanPath}`;
}
