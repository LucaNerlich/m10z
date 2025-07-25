import React from 'react';
// @ts-ignore
import Layout from '@theme/Layout';
// @ts-ignore
import authorsFile from '/blog/authors.json';
import {AuthorType} from '../types/authorType';
import Author from '../components/Author';
// @ts-ignore
import styles from './hello.module.css';

export default function Hello() {
    const parsedAuthors: AuthorType[] = [];

    // works, because docusaurus is serverside only
    for (const author in authorsFile) {
        const parsedAuthor = JSON.parse(JSON.stringify(authorsFile[author])) as AuthorType;
        parsedAuthor.id = author;
        parsedAuthors.push(parsedAuthor);
    }

    const authors = parsedAuthors
        .sort((a, b) => a.id > b.id ? 1 : -1)
        .map((author, index) => <Author key={index} author={author} />);

    return (
        <Layout title='Hello' description='Wer wir sind'>
            <div className={styles.wrapper}>
                <h1 className={styles.headline}>Was ist M10Z?</h1>
                <p className={styles.subtitle}>
                    Ein offener Kanal für Videospielcontent und das Drumherum – unentgeltlich, unabhängig, ungezwungen.
                </p>

                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Unsere Mission</h2>
                    <div className={`${styles.contentCard} ${styles.highlightCard}`}>
                        <p>M10Z ist ein offener Kanal für Videospielcontent und das Drumherum.</p>
                        <p>
                            Wir haben Spaß an kurzen oder langen Texten mit mindestens 10 Zeichen.<br />
                            Wir produzieren Podcasts in (un-)regelmäßigen Abständen.<br />
                            Wir lassen uns überraschen was noch kommt.
                        </p>
                        <p>
                            Alles aus Spaß am Medium und dem kreativen Prozess.<br />
                            Unentgeltlich, unabhängig, ungezwungen.
                        </p>
                    </div>
                </section>

                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Über uns</h2>
                    <div className={styles.contentCard}>
                        <p>
                            Bisher ein loses Kollektiv, das seine Anfänge im <a href='https://community.wasted.de/'>Forum</a> von{' '}
                            <a href='https://wasted.de/'>WASTED.de</a> genommen hat.
                        </p>
                        <p>
                            Wir sind Gaming-Enthusiasten, Content-Creators und Menschen, die Lust auf kreative Projekte haben.
                            Jeder bringt seine eigenen Interessen und Expertise mit ein.
                        </p>
                    </div>
                </section>

                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Was wir machen</h2>
                    <div className={styles.contentCard}>
                        <p>
                            Schaut euch hier auf unserem Blog um und genießt die Inhalte.
                        </p>
                        <p>
                            Von Gaming-Podcasts über Spielereviews bis hin zu technischen Projekten – 
                            wir decken ein breites Spektrum ab. Jedes Format hat seinen eigenen Charakter 
                            und wird von verschiedenen Autor:innen betreut.
                        </p>
                    </div>
                </section>

                <div className={styles.ctaSection}>
                    <h3 style={{color: 'var(--ifm-color-primary)', marginBottom: '1rem'}}>
                        Lust auf mehr?
                    </h3>
                    <p style={{marginBottom: '1.5rem'}}>
                        Entdecke unsere verschiedenen Formate oder werde Teil der Community!
                    </p>
                    <a href='/unsere-formate' className={styles.ctaButton}>
                        Unsere Formate entdecken
                    </a>
                    <a href='https://community.wasted.de/' className={styles.ctaButton}>
                        Forum besuchen
                    </a>
                </div>

                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Mitmachen</h2>
                    <div className={styles.contentCard}>
                        <p>
                            <strong>Wer darf mitmachen?</strong><br />
                            Jede*r mit Lust an Themen die zu M10Z passen.
                        </p>
                        <p>
                            Du musst keine Erfahrung haben.<br />
                            Dies darf gerne ein Versuch für Dich sein.
                        </p>
                        <p>
                            Wenn euch gefällt was wir machen, schreibt uns eine{' '}
                            <a href='mailto:m10z@posteo.de'>E-Mail</a> oder schaut im{' '}
                            <a href='https://community.wasted.de/'>WASTED-Forum</a> vorbei.
                        </p>
                        <p>
                            Wenn ihr meint, das könnt ihr ebenso gut oder besser:<br />
                            Mitmachen ist ausdrücklich erwünscht. Meldet euch.
                        </p>
                    </div>
                </section>

                <section className={styles.section}>
                    <div className={`${styles.contentCard} ${styles.warningCard}`}>
                        <p>
                            <strong>M10Z hat keinen Platz für:</strong><br />
                            Sexismus, Rassismus, Antisemitismus, Homo- und Transphobie, Klassismus, Ableismus.
                        </p>
                    </div>
                </section>

                <section className={styles.authorsSection}>
                    <a href='/authors' className={styles.authorsLink}>
                        <h2 className={styles.sectionTitle}>Unsere Autor:innen</h2>
                    </a>
                    <div className={styles.authors}>
                        {authors}
                    </div>
                </section>
            </div>
        </Layout>
    );
}
