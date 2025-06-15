import React from 'react';
// @ts-ignore
import styles from './unsere-formate.module.css';
// @ts-ignore
import Layout from '@theme/Layout';
import SingleFormat from '../components/SingleFormat';

function Beteiligte(props) {
    return <p>
        Beteiligte: <br />
        <em>{props.text}</em>
    </p>;
}

export default function Formate() {
    return (
        <Layout title='Unsere Formate' description='Welche Formate wir im Programm haben'>
            <div className={styles.wrapper}>
                <h1 className={styles.headline}>Unsere Formate</h1>

                <SingleFormat title='En Rogue' link='/tags/en-rogue' imagePath='/img/cover/enrogue.jpg'>
                    <p>
                        In En Rogue begeben sich Jan, Simon und Adrian in den ewigen Kreislauf des Sterbens und Wiederauferstehens.
                        In jeder Folge wird ein Spiel aus dem weiten Feld der Rogue Lites/ Likes besprochen.
                    </p>
                    <Beteiligte text='Simon, Adrian, Jan' />
                </SingleFormat>

                <SingleFormat title='Fundbüro' link='/tags/fundbuero' imagePath='/img/cover/fundbuero.jpg'>
                    <p>
                        In diesem Podcast findest du Spiele, die (beinahe) schon in Vergessenheit geraten sind.
                    </p>
                    <Beteiligte text='Jan & Edgar' />
                </SingleFormat>

                <SingleFormat title='Ginas Gedankensuppe' link='/tags/gedankensuppe' imagePath='/img/articles/GinasGedankensuppe.jpg'>
                    <p>
                        Platz für Kreativität und ein tolles Miteinander.
                    </p>
                    <p>
                        Hier erscheinen regelmäßig neue Artikel über spannende Themen.
                    </p>
                    <p>
                        Ich betreibe für euch Recherche, überlege mir was euch und mich interessieren könnte, schreibe das alles voller Leidenschaft
                        auf und habe dabei super viel Spaß.
                    </p>
                    <Beteiligte text='Gina alias GinyFreeBird' />
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
                        Ausserdem haben wir in jeder Folge "Das Thema": Wunderbare Menschen sind zu Besuch mit spannenden Themen, denen wir uns
                        gemeinsam widmen und euch näherbringen wollen.
                    </p>
                    <p>
                        Produziert wird "Mindestens 10 Zeichen" von Simon-Philipp Vogel, der neben seinen Musikprojekten jedes Mal neu versucht ein
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
                <SingleFormat title='Open Beta' link='/tags/openbeta' imagePath='/img/articles/OpenBetaLogo.jpg'>
                    <p>
                        In Open Beta öffnen wir M10Z für eure Gastbeiträge. Kurze Gedankenblitze, lange Kolumnen, Spielkritiken, … alles kann, nichts
                        muss.
                    </p>
                </SingleFormat>

                <SingleFormat title='Das gesprochene Wort' link='/tags/dgw' imagePath='/img/formate/cover/dgw.jpg'>
                    <p>
                        Liebe Gemeinde,
                        <br />
                        <br />
                        Hiermit kommt was neues! Na gut, es findet ein Versuch statt. Marcel nimmt sich vor in dem neuen Format mit dem zauberhaften Namen "Das gesprochene Wort" Texte von euch, Magazinen aber auch allgemein tollen Schreibenden vorzulesen. Das ganze soll gerahmt sein in einer kuscheligen Atmosphäre samt Kaminknistern und sanften Pianoklängen.
                        <br />
                        <br />
                        Bitte gebt ihm doch im Forum Feedback, zu lang, zu kurz? Allgemein gut, aber Gedudel doof? Her damit!
                        <br />
                        Entspannt euch, lasst euch fallen, macht die Augen zu und lernt mit ihm neue, tolle Texte kennen. Kommt doch mit?!
                    </p>

                    <Beteiligte text='Marcel (kkuez)' />
                </SingleFormat>
                <SingleFormat title='Sunday Projects' link='/tags/sunday-projects' imagePath='/img/tech/sundayprojects/rssgen.jpg'>
                    <p>
                        'Sunday Projects' sind die kleinen, technischen Projekte und Spielereien mit denen ich in unregelmäßigen Abständen meine Zeit verbringe.
                    </p>
                    <Beteiligte text='Luca' />

                </SingleFormat>
            </div>
        </Layout>
    );
}
