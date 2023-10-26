import React from 'react'
// @ts-ignore
import styles from './unsere-formate.module.scss'
import Layout from '@theme/Layout'
import SingleFormat from '../components/SingleFormat'

export default function Formate() {
    return (
        <Layout title='Unsere Formate' description='Welche Formate wir im Programm haben'>
            <div className={styles.wrapper}>
                <h1 className={styles.headline}>Unsere Formate</h1>
                <SingleFormat title='Fundbüro' link='/tags/fundbuero' />
                <SingleFormat title='Ginas Gedankensuppe' link='/tags/gedankensuppe' />
                <SingleFormat title='Metaebene' link='/tags/metaebene' />
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
                    <p>
                        Beteiligte: <br />
                        <em>Marcel (kkuez), Til (tilmobaxter), Simon (simon)</em>
                    </p>
                </SingleFormat>
                <SingleFormat title='Once we were Gamers' link='/tags/owwg' />
                <SingleFormat title='Virtuelle Verse' link='/tags/lyrik' />
            </div>
        </Layout>
    )
}
