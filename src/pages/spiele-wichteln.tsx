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
    const [participants, setParticipants] = React.useState<Participant[]>([]);
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
            const textToCopy = ref.current.innerText || ref.current.textContent;
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
                            placeholder='https://steamcommunity.com/id/gabelogannewell'
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

                <form className='participantsForm' onSubmit={handleSubmit}>
                    <fieldset>
                        <input
                            disabled={participants.length < 2}
                            type='submit'
                            value='Paare auslosen 🪄'
                        />
                        <input
                            style={{marginLeft: '1rem'}}
                            disabled={participants.length > 0}
                            type='button'
                            onClick={() => setParticipants([
                                {name: 'Fabian', link: 'https://steamcommunity.com/id/Fabian'},
                                {name: 'Alexander', link: 'https://steamcommunity.com/id/Alexander'},
                                {name: 'Nils', link: 'https://steamcommunity.com/id/Nils'},
                                {name: 'Hendrik', link: 'https://steamcommunity.com/id/Hendrik'},
                                {name: 'Anna', link: 'https://steamcommunity.com/id/Anna'},
                                {name: 'Theresa', link: 'https://steamcommunity.com/id/Theresa'},
                                {name: 'Janina', link: 'https://steamcommunity.com/id/Janina'},
                                {name: 'Lena', link: 'https://steamcommunity.com/id/Lena'},
                            ])}
                            value='Demo Modus 🧪'
                        />

                        <input
                            style={{marginLeft: '1rem'}}
                            type='button'
                            disabled={participants.length === 0}
                            onClick={() => {
                                setParticipants([]);
                                setPairs([]);
                            }}
                            value='Reset ⚠️'
                        />
                    </fieldset>

                    <h2 style={{marginTop: '1rem'}}>TeilnehmerInnen</h2>
                    <ul>
                        {participants.map((participant, index) => <li key={index}>
                            <a href={participant.link} target='_blank'>{participant.name}</a>
                        </li>)}
                    </ul>
                </form>

                <hr />

                <h2>Ergebnisse & Kopiervorlagen</h2>

                {/* Markdown / Discourse / Discord */}
                <details open={pairs.length > 0}>
                    <summary>Discourse / Discord / Markdown</summary>
                    <blockquote>
                        <pre ref={discourseRef}>
                            {pairs.map((pair, index) =>
                                <div key={index}>
                                    * [{pair.sender.name}]({pair.sender.link}) bewichtelt ➡️ [{pair.receiver.name}]({pair.receiver.link})
                                </div>,
                            )}
                        </pre>
                        <button onClick={() => copyToClipboard(discourseRef)}>In Zwischenablage kopieren</button>
                    </blockquote>
                </details>

                {/* phpBB */}
                <details>
                    <summary>phpBB</summary>
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
                <details>
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
            </div>
        </Layout>
    );
}
