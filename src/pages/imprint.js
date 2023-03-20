import React from 'react';
import Layout from '@theme/Layout';

export default function Hello() {
    return (
        <Layout title="Impressum" description="m10z Imprint">
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'start',
                    alignItems: 'start',
                    maxWidth: "1200px",
                    margin: '0 auto',
                }}>

                <h1>Impressum</h1>
                Angaben gemäß § 5 TMG

                <h2>Kontakt</h2>
                TODO
                <h2>Redaktionell verantwortlich</h2>
                TODO
            </div>
        </Layout>
    );
}
