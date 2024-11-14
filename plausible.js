import ExecutionEnvironment from '@docusaurus/ExecutionEnvironment'

/*
<script defer data-domain="m10z.lucanerlich.com"
 src="https://plausible-m10z.lucanerlich.com/js/script.file-downloads.outbound-links.js"></script>
<script>window.plausible = window.plausible || function() { (window.plausible.q = window.plausible.q || []).push(arguments) }</script>
 */

// https://stackoverflow.com/questions/57859350/how-can-i-add-custom-scripts-in-index-htmls-head-part-in-docusaurus-v2
if (ExecutionEnvironment.canUseDOM) {

    window.plausible = window.plausible || function() {
        (window.plausible.q = window.plausible.q || []).push(arguments)
    }

    // Create the script element for the Clarity tracking code

    plausibleScript.src = 'https://plausible-m10z.lucanerlich.com/js/script.file-downloads.outbound-links.js'
    plausibleScript.async = false
    plausibleScript.defer = true
    plausibleScript.setAttribute('data-domain', 'm10z.lucanerlich.com')

    // Insert the script into the head of the document
    document.head.appendChild(plausibleScript)

    const umamiScript = document.createElement('script')
    umamiScript.src = 'https://cloud.umami.is/script.js'
    umamiScript.async = false
    umamiScript.defer = true
    umamiScript.setAttribute('data-website-id', 'd0d4c4ba-3a09-4585-b94b-21e11dc01b2c')

    // Insert the script into the head of the document
    document.head.appendChild(umamiScript)
}
