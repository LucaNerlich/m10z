import React from 'react';
// @ts-ignore
import styles from './unsere-formate.module.css';
// @ts-ignore
import Layout from '@theme/Layout';
import SingleFormat from '../components/SingleFormat';

function Beteiligte(props) {
    return (
        <div className="participants">
            <p>
                <strong>Beteiligte:</strong><br />
                <em>{props.text}</em>
            </p>
        </div>
    );
}

function TableOfContents() {
    const scrollToSection = (sectionId: string) => {
        const element = document.getElementById(sectionId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    const sections = [
        { id: 'gaming-podcasts', title: 'Gaming & Podcasts', count: 7 },
        { id: 'hauptformat-community', title: 'Hauptformat & Community', count: 2 },
        { id: 'kultur-kreatives', title: 'Kultur & Kreatives', count: 4 },
        { id: 'kolumnen-gastbeitraege', title: 'Kolumnen & Gastbeiträge', count: 4 },
        { id: 'archiv', title: 'Archiv', count: 1 }
    ];

    return (
        <div className={styles.tocSection}>
            <h3 className={styles.tocTitle}>📋 Inhaltsverzeichnis</h3>
            <div className={styles.tocGrid}>
                {sections.map((section) => (
                    <div
                        key={section.id}
                        className={styles.tocItem}
                        onClick={() => scrollToSection(section.id)}
                    >
                        <span className={styles.tocItemText}>{section.title}</span>
                        <span className={styles.tocItemCount}>{section.count}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function Formate() {
    return (
        <Layout title='Unsere Formate' description='Welche Formate wir im Programm haben'>
            <div className={styles.wrapper}>
                <h1 className={styles.headline}>Unsere Formate</h1>
                <p className={styles.subtitle}>
                    Entdecke die vielfältigen Inhalte von M10Z – von Gaming-Podcasts über Literatur bis hin zu technischen Projekten.
                </p>

                <TableOfContents />

                <section className={styles.section} id="gaming-podcasts">
                    <h2 className={styles.sectionTitle}>Gaming & Podcasts</h2>
                    <p className={styles.sectionDescription}>
                        Unsere Gaming-Formate decken alles ab – von Retro-Gaming bis zu aktuellen Releases.
                    </p>
                    <div className={styles.formatsGrid}>
                        <SingleFormat title='En Rogue' link='/tags/en-rogue' imagePath='/img/formate/banner/enrogue.jpg'>
                            <p>
                                In En Rogue begeben sich Jan, Simon und Adrian in den ewigen Kreislauf des Sterbens und Wiederauferstehens.
                                In jeder Folge wird ein Spiel aus dem weiten Feld der Rogue Lites/ Likes besprochen.
                            </p>
                            <Beteiligte text='Simon, Adrian, Jan' />
                        </SingleFormat>

                        <SingleFormat title='Fundbüro' link='/tags/fundbuero' imagePath='/img/formate/banner/fundbuero.jpg'>
                            <p>
                                In diesem Podcast findest du Spiele, die (beinahe) schon in Vergessenheit geraten sind.
                            </p>
                            <Beteiligte text='Jan & Edgar' />
                        </SingleFormat>

                        <SingleFormat title='Once we were Gamers' link='/tags/owwg' imagePath='/img/formate/banner/owwg.jpg'>
                            <p>
                                Bei „Once we were Gamers" wirft Simon einen Blick auf das, was in der Gamingwelt gerade so interessant ist, oder auf das, was
                                er gerade interessant findet.
                            </p>
                            <Beteiligte text='Simon & Franziska' />
                        </SingleFormat>

                        <SingleFormat title='Pixelplausch' link='/tags/pixelplausch' imagePath='/img/formate/banner/pixelplausch.jpg'>
                            <p>
                                Ein entspannter Gaming-Talk zwischen Freunden über aktuelle Spiele, Trends und Gaming-Kultur.
                            </p>
                            <Beteiligte text='Jan, Georg & Gäste' />
                        </SingleFormat>

                        <SingleFormat title='Telespiel Trio' link='/tags/telespiel-trio' imagePath='/img/formate/banner/telespiel-trio.jpg'>
                            <p>
                                Drei Perspektiven auf die Gaming-Welt – das Telespiel Trio bespricht gemeinsam aktuelle und klassische Videospiele.
                            </p>
                            <Beteiligte text='Simon, Marcel, Til' />
                        </SingleFormat>

                        <SingleFormat title='Circa 10 Zeichen' link='/tags/c-10-z' imagePath='/img/formate/cover/c10z.jpg'>
                            <p>
                                Eine Serie von Gaming-Reviews und Gedanken zu verschiedenen Spielen,
                                die einen tieferen Blick auf die Spielewelt werfen.
                            </p>
                            <Beteiligte text='Luca' />
                        </SingleFormat>

                        <SingleFormat title='Zocken ohne Zaster' link='/tags/zoz' imagePath='/img/formate/banner/zoz.jpg'>
                            <p>
                                Gaming mit kleinem Budget – entdeckt großartige Spiele, die wenig kosten oder sogar kostenlos sind.
                                Beweise, dass gute Unterhaltung nicht teuer sein muss.
                            </p>
                            <Beteiligte text='Marcel, Til' />
                        </SingleFormat>
                    </div>
                </section>

                <section className={styles.section} id="hauptformat-community">
                    <h2 className={styles.sectionTitle}>Hauptformat & Community</h2>
                    <p className={styles.sectionDescription}>
                        Das Herzstück von M10Z und unsere Community-Formate.
                    </p>
                    <div className={styles.formatsGrid}>
                        <SingleFormat title='Mindestens 10 Zeichen' link='/tags/m-10-z' imagePath='/img/formate/banner/m10z-podcast.jpg'>
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

                        <SingleFormat title='Quiz' link='/tags/quiz'>
                            <p>
                                Unser interaktives Quiz-Format, bei dem die Community ihr Wissen unter Beweis stellen kann.
                            </p>
                            <Beteiligte text='Simon & Gäste' />
                        </SingleFormat>
                    </div>
                </section>

                <section className={styles.section} id="kultur-kreatives">
                    <h2 className={styles.sectionTitle}>Kultur & Kreatives</h2>
                    <p className={styles.sectionDescription}>
                        Von Comics über Literatur bis hin zu kreativen Gedanken – hier findet ihr kulturelle Inhalte.
                    </p>
                    <div className={styles.formatsGrid}>
                        <SingleFormat title='ComicCast' link='/tags/comiccast' imagePath='/img/formate/banner/comic-cast.jpg'>
                            <p>
                                Alles rund um Comics, Graphic Novels und die neuesten Entwicklungen in der Comic-Welt.
                            </p>
                            <Beteiligte text='Edgar, Simon, Til' />
                        </SingleFormat>

                        <SingleFormat title='Fantastische Fakten' link='/tags/fakten' imagePath='/img/formate/banner/fakten.jpg'>
                            <p>
                                Interessante und kuriose Fakten aus der Welt der Fantasie, Science-Fiction und Gaming.
                            </p>
                            <Beteiligte text='Jan, Simon, Til' />
                        </SingleFormat>

                        <SingleFormat title='Virtuelle Verse' link='/tags/lyrik' imagePath='/img/formate/banner/verse.jpg'>
                            <p>
                                Geprägt durch Heinz Erhardt Kassetten und Videospiel-Cartridges, präsentiert euch Til einmal die Woche die „Virtuellen Verse".
                            </p>
                            <Beteiligte text='Til' />
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
                    </div>
                </section>

                <section className={styles.section} id="kolumnen-gastbeitraege">
                    <h2 className={styles.sectionTitle}>Kolumnen & Gastbeiträge</h2>
                    <p className={styles.sectionDescription}>
                        Persönliche Gedanken und Gastbeiträge aus der Community.
                    </p>
                    <div className={styles.formatsGrid}>
                        <SingleFormat title='Metaebene' link='/tags/metaebene'>
                            <p>
                                Eine kleine Kolumne zu großen Themen.
                            </p>
                            <Beteiligte text='KaFour' />
                        </SingleFormat>

                        <SingleFormat title='Open Beta' link='/tags/openbeta' imagePath='/img/articles/OpenBetaLogo.jpg'>
                            <p>
                                In Open Beta öffnen wir M10Z für eure Gastbeiträge. Kurze Gedankenblitze, lange Kolumnen, Spielkritiken, … alles kann, nichts
                                muss.
                            </p>
                        </SingleFormat>

                        <SingleFormat title='Sunday Projects' link='/tags/sunday-projects' imagePath='/img/tech/sundayprojects/rssgen.jpg'>
                            <p>
                                'Sunday Projects' sind die kleinen, technischen Projekte und Spielereien mit denen ich in unregelmäßigen Abständen meine Zeit verbringe.
                            </p>
                            <Beteiligte text='Luca' />
                        </SingleFormat>

                        <SingleFormat title='Brief Bookmarks' link='/tags/brief-bookmarks' imagePath='/img/articles/briefbookmarks/dosdeck.png'>
                            <p>
                                'Brief Bookmarks' sind kurze Infohäppchen, die vielleicht den einen oder anderen interessieren könnten.
                                Adrian teilt interessante Tech-Tools, Websites und Entdeckungen aus dem Netz.
                            </p>
                            <Beteiligte text='Adrian' />
                        </SingleFormat>
                    </div>
                </section>

                <section className={styles.archiveSection} id="archiv">
                    <h2 className={styles.sectionTitle}>Archiv</h2>
                    <p className={styles.sectionDescription}>
                        Formate, die nicht mehr aktiv sind, aber deren Inhalte weiterhin verfügbar bleiben.
                    </p>
                    <div className={styles.formatsGrid}>
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
                    </div>
                </section>
            </div>
        </Layout>
    );
}
