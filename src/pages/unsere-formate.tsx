import React from 'react'
// @ts-ignore
import styles from './unsere-formate.module.scss'
import Layout from '@theme/Layout'
import SingleFormat from '../components/SingleFormat'

function Beteiligte(props) {
    return <p>
        Beteiligte: <br />
        <em>{props.text}</em>
    </p>
}

export default function Formate() {
    return (
        <Layout title='Unsere Formate' description='Welche Formate wir im Programm haben'>
            <div className={styles.wrapper}>
                <h1 className={styles.headline}>Unsere Formate</h1>
                <SingleFormat title='Fundbüro' link='/tags/fundbuero'>
                    <p>
                        In diesem Podcast findest du Spiele, die (beinahe) schon in Vergessenheit geraten sind.
                    </p>
                    <Beteiligte text='Jan & Edgar' />
                </SingleFormat>

                <SingleFormat title='Ginas Gedankensuppe' link='/tags/gedankensuppe'>
                    <p>
                        Gina schreibt vielfältige Texte zu virtuellen Themen.
                    </p>
                    <Beteiligte text='Gina' />
                </SingleFormat>

                <SingleFormat title='Metaebene' link='/tags/metaebene'>
                    <p>
                        Eine Kleine Kolumne zu grossen Themen.
                    </p>
                    <Beteiligte text='KaFour' />
                </SingleFormat>

                <SingleFormat title='Mindestens 10 Zeichen' link='/tags/m-10-z' imagePath='/img/formate/m10z.jpg'>
                    <p>
                        "Mindestens 10 Zeichen" ist unser M10Z Podcast der Podcasts, der in dem es um alles geht:
                        <br />
                        Spiele, das (Wasted-)Forum, uns und euch...
                    </p>
                    <p>
                        Entstanden als Metaprojekt zu WASTED erzählen euch Marcel (kkuez) und Til (tilmobaxter) möglichst jeden Monat aufs neue, was
                        die Community bewegt und natürlich welches Meme jetzt wirklich das beste aller Zeiten ist.
                        Ausserdem haben wir in jeder Folge "Das Thema": Wnderbare Menschen sind zu Besuch mit spannenden Themen, denen wir uns
                        gemeinsam widmen und euch näherbringen wollen.
                    </p>
                    <p>
                        Produziert wird "Mindestens 10 Zeichen" von Philipp Simon Vogel, der neben seinen Musikprojekten jedes Mal neu versucht ein
                        paar Minuten frei zu kriegen, um das Ding rund abzuliefern.
                    </p>
                    <p>
                        Macht euch bereit und kommt mit uns, wir haben Bock!
                    </p>
                    <Beteiligte text='Marcel (kkuez), Til (tilmobaxter), Simon (simon)' />
                </SingleFormat>
                <SingleFormat title='Once we were Gamers' link='/tags/owwg'>
                    <p>
                        Bei „Once we were Gamers“ wirft Simon einen Blick auf das, was in der Gamingwelt gerade so interessant ist, oder auf das, was
                        er gerade interessant findet.
                    </p>
                    <Beteiligte text='Simon' />
                </SingleFormat>
                <SingleFormat title='Virtuelle Verse' link='/tags/lyrik'>
                    <p>
                        Geprägt durch Heinz Erhardt Kassetten und Videospiel-Cartridges, präsentiert euch Til einmal die Woche die „Virtuellen Verse“.
                    </p>
                    <Beteiligte text='Til' />
                </SingleFormat>
            </div>
        </Layout>
    )
}
