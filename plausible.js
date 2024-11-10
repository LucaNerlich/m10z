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
    const plausibleScript = document.createElement('script')
    plausibleScript.src = 'https://plausible-m10z.lucanerlich.com/js/script.file-downloads.outbound-links.js'
    plausibleScript.async = false
    plausibleScript.defer = true
    plausibleScript.setAttribute('data-domain', 'm10z.lucanerlich.com')

    // Insert the script into the head of the document
    document.head.appendChild(plausibleScript)
}
