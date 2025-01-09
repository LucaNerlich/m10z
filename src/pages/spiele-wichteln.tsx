import React from 'react';
// @ts-ignore
import Layout from '@theme/Layout';
import './wichteln/spiele-wichteln.css';

interface spielewichtelnProps {
}

interface participant {
    name: string;
    link: string; // main gaming platform, such as steam profile page
}

export default function spieleWichteln(props: Readonly<spielewichtelnProps>): React.ReactElement {
    return (
        <Layout title='Spiele-Wichteln' description='Web App zum Auslosen von Wichteln Paaren'>
            <div className="wrapper">
                <p>I am a spieleWichteln</p>
            </div>
        </Layout>
);
}
