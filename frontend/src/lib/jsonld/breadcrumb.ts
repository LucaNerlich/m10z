import {type BreadcrumbList} from './types';
import {absoluteRoute} from '@/src/lib/routes';

type BreadcrumbItem = {
    name: string;
    path: string;
};

/**
 * Generate a schema.org BreadcrumbList JSON-LD object from an ordered list of breadcrumb items.
 *
 * Each item's `path` is resolved to an absolute URL. The items should be ordered
 * from root (Home) to the current page.
 *
 * @param items - Breadcrumb path segments ordered from root to leaf
 * @returns A BreadcrumbList JSON-LD object ready for embedding in a script tag
 */
export function generateBreadcrumbJsonLd(items: BreadcrumbItem[]): BreadcrumbList {
    return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.name,
            item: absoluteRoute(item.path),
        })),
    };
}
