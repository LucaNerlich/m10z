import {forwardRef, type SVGProps} from 'react';

/**
 * Inline bar-chart icon for the Umami-Statistiken widget.
 *
 * Deliberately not imported from `@strapi/icons`: Strapi only aliases
 * `@strapi/design-system` (plus singletons) into the admin bundle, so bare
 * `@strapi/icons` imports from a local plugin fail to resolve under pnpm's
 * strict dependency isolation. An inline SVG has no runtime dependency at
 * all. The `forwardRef` shape keeps it assignable to the widget `icon` type.
 */
export const UmamiChartIcon = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>(function UmamiChartIcon(props, ref) {
    return (
        <svg
            ref={ref}
            xmlns='http://www.w3.org/2000/svg'
            viewBox='0 0 24 24'
            width='1em'
            height='1em'
            fill='none'
            stroke='currentColor'
            strokeWidth={2}
            strokeLinecap='round'
            aria-hidden='true'
            {...props}
        >
            <line x1='4' y1='20' x2='4' y2='12' />
            <line x1='10' y1='20' x2='10' y2='4' />
            <line x1='16' y1='20' x2='16' y2='9' />
            <line x1='2' y1='20' x2='22' y2='20' />
        </svg>
    );
});
