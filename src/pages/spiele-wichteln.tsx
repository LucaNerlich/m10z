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

interface pair {
    sender: participant;
    reciever: participant;
}

export default function spieleWichteln(props: Readonly<spielewichtelnProps>): React.ReactElement {
    const [results, setResults] = React.useState<pair[]>([]);

    function handleSubmit(event) {
        event.preventDefault();
        console.log('generate pairs');
    }

    return (
        <Layout title='Spiele-Wichteln' description='Web App zum Auslosen von Wichteln Paaren'>
            <div className='wrapper'>
                <h1>Spiele-Wichteln Auslosung</h1>
                <form onSubmit={handleSubmit}>
                    <button type='submit'>Paare auslosen</button>
                </form>

                <h2>Kopiervorlage <strong>Discourse</strong></h2>
                <h2>Kopiervorlage <strong>phpbb</strong></h2>
                <h2>Kopiervorlage <strong>Text</strong></h2>
                {results.map((pair, index) =>
                    <p key={index}>
                        <a href={pair.sender.link} target='_blank'>{pair.sender.name}</a>
                        <strong>bewichtelt ➡️</strong>
                        <a href={pair.reciever.link} target='_blank'>{pair.reciever.name}</a>
                    </p>,
                )}
            </div>
        </Layout>
    );
}
