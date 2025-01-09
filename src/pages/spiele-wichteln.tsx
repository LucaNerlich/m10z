import React, {useRef} from 'react';
// @ts-ignore
import Layout from '@theme/Layout';
import './wichteln/spiele-wichteln.css';

interface Participant {
    name: string;
    link: string; // main gaming platform, such as steam profile page
}

interface Pair {
    sender: Participant;
    receiver: Participant;
}

/**
 * Shuffles the elements of an array in place using the Fisher-Yates algorithm.
 *
 * @param {Array} array - The array to be shuffled. The array is modified in place.
 * @return {Array} The shuffled array.
 */
function shuffleArray(array: Array<any>) {
    for (let i = array.length - 1; i >= 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
}

// todo save to local-storage, read and delete

export default function SpieleWichtelnPage(): React.ReactElement {
    // set demo participants
    const [participants, setParticipants] = React.useState<Participant[]>([
        {name: 'Player 1', link: 'https://steamcommunity.com/id/player1'},
        {name: 'Player 2', link: 'https://steamcommunity.com/id/player2'},
        {name: 'Player 3', link: 'https://steamcommunity.com/id/player3'},
        {name: 'Player 4', link: 'https://steamcommunity.com/id/player4'},
        {name: 'Player 5', link: 'https://steamcommunity.com/id/player5'},
    ]);
    const [pairs, setPairs] = React.useState<Pair[]>([]);
    const [newPlayer, setNewPlayer] = React.useState<Participant>({name: '', link: ''});
    const discourseRef = useRef<HTMLPreElement>(null);
    const phpRef = useRef<HTMLPreElement>(null);
    const textRef = useRef<HTMLUListElement>(null);


    function handleSubmit(event) {
        event.preventDefault();
        if (participants && participants.length < 2) return;

        // shuffle cloned participant list
        const clonedParticipants = [...participants];
        shuffleArray(clonedParticipants);

        // create circular pairing
        const pairs = [];
        clonedParticipants.forEach((participant, index) => {
            // pick the next player from the shuffled array, if the end is reached, pick index 0
            // e.g (4 + 1) % 5` = 0
            pairs.push({sender: participant, receiver: clonedParticipants[(index + 1) % clonedParticipants.length]});
        });

        // add pairs to result
        setPairs(pairs);
    }

    function copyToClipboard(ref: React.RefObject<HTMLPreElement | HTMLUListElement>) {
        if (ref.current) {
            const textToCopy = ref.current.textContent;
            if (textToCopy) {
                navigator.clipboard.writeText(textToCopy).then(() => {
                    console.info('Inhalte wurden in die Zwischenablage kopiert!');
                }).catch(err => {
                    console.error('Fehler beim Kopieren in die Zwischenablage:', err);
                });
            }
        }
    }

    return (
        <Layout title='Spiele-Wichteln' description='Web App zum Auslosen von Wichteln-Paaren'>
            <div className='wrapper'>

                <h1>Spiele-Wichteln Auslosungs App</h1>
                <form className='addParticipantForm'>
                    <fieldset>
                        <legend>SpielerIn</legend>
                        <input
                            type='text'
                            name='name'
                            required
                            placeholder='Luca'
                            value={newPlayer.name}

                            onChange={(event) => setNewPlayer({...newPlayer, name: event.target.value})}
                        />

                    </fieldset>
                    <fieldset>
                        <legend>Profil Link (Steam o. Ä.)</legend>
                        <input
                            type='url'
                            pattern='https://.*'
                            required
                            name='link'
                            placeholder='https://steamcommunity.com/id/e_Lap'
                            value={newPlayer.link}
                            onChange={(event) => setNewPlayer({...newPlayer, link: event.target.value})}
                        />

                    </fieldset>

                    <input type='button' value='SpielerIn hinzufügen'
                           disabled={!newPlayer.name || !newPlayer.link}
                           onClick={() => {
                               setParticipants([...participants, {name: newPlayer.name, link: newPlayer.link}]);
                               setNewPlayer({name: '', link: ''});
                           }} />
                </form>

                <h2 style={{marginTop: '1rem'}}>TeilnehmerInnen</h2>
                <form className='participantsForm' onSubmit={handleSubmit}>
                    <ul>
                        {participants.map((participant, index) => <li key={index}>
                            <a href={participant.link} target='_blank'>{participant.name}</a>
                        </li>)}
                    </ul>

                    <input
                        disabled={participants.length < 2}
                        type='submit'
                        value='Paare auslosen 🪄'
                    />
                </form>

                <hr />

                <h2>Kopiervorlagen</h2>

                {/* Markdown / Discourse */}
                <details>
                    <summary>Discourse</summary>
                    <blockquote>
                        <pre ref={discourseRef}>
                            {pairs.map((pair, index) =>
                                <div key={index}>* [{pair.sender.name}]({pair.sender.link}) bewichtelt ➡️
                                    [{pair.receiver.name}]({pair.receiver.link})</div>,
                            )}
                        </pre>
                        <button onClick={() => copyToClipboard(discourseRef)}>In Zwischenablage kopieren</button>
                    </blockquote>
                </details>

                {/* phpbb */}
                <details>
                    <summary>phpbb</summary>
                    <blockquote>
                        <pre ref={phpRef}>
                            [list]
                            {pairs.map((pair, index) =>
                                <div key={index}>
                                    [*] [url={pair.sender.link}]{pair.sender.name}[/url] bewichtelt ➡️ [url={pair.receiver.link}]{pair.receiver.name}[/url]
                                </div>,
                            )}
                            [/list]
                        </pre>
                        <button onClick={() => copyToClipboard(phpRef)}>In Zwischenablage kopieren</button>
                    </blockquote>
                </details>

                {/* Plain Text / HTML */}
                <details open>
                    <summary>Text</summary>
                    <blockquote>
                        <ul ref={textRef}>
                            {pairs.map((pair, index) =>
                                <li key={index}>
                                    <a href={pair.sender.link} target='_blank'>{pair.sender.name}</a>
                                    <strong>&nbsp;bewichtelt ➡️&nbsp;</strong>
                                    <a href={pair.receiver.link} target='_blank'>{pair.receiver.name}</a>
                                </li>,
                            )}
                        </ul>
                        <button onClick={() => copyToClipboard(textRef)}>In Zwischenablage kopieren</button>
                    </blockquote>
                </details>

                <hr />

                <button style={{marginBottom: '1rem'}} type='button' onClick={() => {
                    setParticipants([]);
                    setPairs([]);
                }}>
                    Reset ⚠️
                </button>
            </div>
        </Layout>
    );
}
