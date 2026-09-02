// Global site data. The values live in src/data/settings.json so they can be
// edited from the CMS at /admin/ without touching code; these exports keep the
// existing import sites (`SITE_TITLE`, `SITE_DESCRIPTION`) working unchanged.
import settings from './data/settings.json';

export const SITE_TITLE = settings.siteTitle;
export const SITE_DESCRIPTION = settings.siteDescription;
export const SOCIAL = settings.social;
/** Which page sections show the certificate badge strip in the footer. */
export const FOOTER_BADGE_PAGES: string[] = settings.footerBadges?.pages ?? [];
/** How many badges the footer strip shows at most. 0 means no limit. */
export const FOOTER_BADGE_LIMIT: number = settings.footerBadges?.limit ?? 0;

export default settings;
