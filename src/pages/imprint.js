import React from 'react'
import Layout from '@theme/Layout'

export default function Hello() {
    return (
        <Layout title='Impressum' description='m10z Imprint'>
            <div
                style={{
                    fontSize: '20px',
                    maxWidth: '1200px',
                    margin: '0 auto',
                    padding: ' 1em',
                }}>

                <h1>Impressum</h1>
                <p>Angaben gemäß § 5 TMG</p>

                <h2>Kontakt</h2>
                Tilman Breidenbach<br />
                Bussardweg 13<br />
                58579 Schalksmühle<br />
                Telefon: +49 (0) 2355 5046019<br />
                E-Mail: m10z(at)posteo(dot)de<br />

                <h2>Redaktionell verantwortlich</h2>
                Tilman Breidenbach<br />
                Bussardweg 13<br />
                58579 Schalksmühle<br />
            </div>
        </Layout>
    )
}
