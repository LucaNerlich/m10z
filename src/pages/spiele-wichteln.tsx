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
    receiver: participant;
}

function shuffleArray(array) {
    for (var i = array.length - 1; i >= 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
}

export default function spieleWichteln(props: Readonly<spielewichtelnProps>): React.ReactElement {
    // set demo participants
    const [participants, setParticipants] = React.useState<participant[]>([
        {name: 'Player 1', link: 'https://steamcommunity.com/id/player1'},
        {name: 'Player 2', link: 'https://steamcommunity.com/id/player2'},
        {name: 'Player 3', link: 'https://steamcommunity.com/id/player3'},
        {name: 'Player 4', link: 'https://steamcommunity.com/id/player4'},
        {name: 'Player 5', link: 'https://steamcommunity.com/id/player5'},
    ]);
    const [pairs, setPairs] = React.useState<pair[]>([]);


    function handleSubmit(event) {
        event.preventDefault();
        if (participants && participants.length < 2) return;

        // shuffle participant list
        shuffleArray(participants);

        // create circular pairing
        const pairs = [];
        participants.forEach((participant, index) => {
            // pick the next player from the shuffled array, if the end is reached, pick index 0
            // e.g (4 + 1) % 5` = 0
            pairs.push({sender: participant, receiver: participants[(index + 1) % participants.length]});
        });

        // add pairs to result
        setPairs(pairs);
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
                {pairs.map((pair, index) =>
                    <p key={index}>
                        <a href={pair.sender.link} target='_blank'>{pair.sender.name}</a>
                        <strong>&nbsp;bewichtelt ➡️&nbsp;</strong>
                        <a href={pair.receiver.link} target='_blank'>{pair.receiver.name}</a>
                    </p>,
                )}
            </div>
        </Layout>
    );
}
