import React, {useState} from 'react'
import Link from '@docusaurus/Link'
import useBaseUrl from '@docusaurus/useBaseUrl'
import isInternalUrl from '@docusaurus/isInternalUrl'
import IconExternalLink from '@theme/Icon/ExternalLink'

export default function FooterLinkItem({item}) {
    const {to, href, label, prependBaseUrlToHref, clipboard, ...props} = item
    const toUrl = useBaseUrl(to)
    const normalizedHref = useBaseUrl(href, {forcePrependBaseUrl: true})

    const [showCheckmark, setShowCheckmark] = useState(false)
    return (
        <>
            {clipboard ?
                <div style={{
                    cursor: 'pointer',
                    display: 'inline-block',
                }} onClick={() => {
                    navigator.clipboard.writeText(href)
                    setShowCheckmark(true)
                }}>{label} <span style={showCheckmark ? {} : {display: 'none'}}>✅</span></div>
                :
                <Link
                    className='footer__link-item'
                    {...(href
                        ? {href: prependBaseUrlToHref ? normalizedHref : href}
                        : {to: toUrl})}
                    {...props}>
                    {label}
                    {href && !isInternalUrl(href) && <IconExternalLink />}
                </Link>
            }
        </>
    )
}
