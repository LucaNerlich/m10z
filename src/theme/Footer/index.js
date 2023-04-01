import React from 'react'
import Footer from '@theme-original/Footer'

export default function FooterWrapper(props) {
    return (
        <>
            <script defer src='/_vercel/insights/script.js'></script>
            <Footer {...props} />
        </>
    )
}
