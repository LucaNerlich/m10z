import ExecutionEnvironment from '@docusaurus/ExecutionEnvironment'

/*
<script defer data-domain="m10z.lucanerlich.com"
 src="https://plausible-m10z.lucanerlich.com/js/script.file-downloads.outbound-links.js"></script>
<script>window.plausible = window.plausible || function() { (window.plausible.q = window.plausible.q || []).push(arguments) }</script>
 */

// https://stackoverflow.com/questions/57859350/how-can-i-add-custom-scripts-in-index-htmls-head-part-in-docusaurus-v2
if (ExecutionEnvironment.canUseDOM) {
    // Create the script element for the umami tracking code
    const umamiScript = document.createElement('script')
    umamiScript.src = 'https://umami-t8kgsg4o4wc4o80wgwwo484c.lucanerlich.com/script.js'
    umamiScript.async = false
    umamiScript.defer = true
    umamiScript.setAttribute('data-website-id', 'ff848c61-f514-41d1-a139-def9da0ee3c1')

    // Insert the script into the head of the document
    document.head.appendChild(umamiScript)
}
