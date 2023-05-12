import React, {ReactElement, useEffect, useState} from 'react'
import Layout from '@theme/Layout'
// @ts-ignore
import authorsFile from '/blog/authors.json'
import {AuthorType} from '../types/authorType'
import Author from '../components/Author'
// @ts-ignore
import styles from './hello.module.scss'

export default function Hello() {
    const parsedAuthors: AuthorType[] = []

    // works, because docusaurus is serverside only
    for (const author in authorsFile) {
        const parsedAuthor = JSON.parse(JSON.stringify(authorsFile[author])) as AuthorType
        parsedAuthor.id = author
        parsedAuthors.push(parsedAuthor)
    }

    const [authors, setAuthors] = useState(createAuthors())

    function createAuthors() {
        return parsedAuthors
            .sort((a, b) => a.name > b.name ? 1 : -1)
            .map((author, index) => <Author key={index} author={author} />)
    }

    return (
        <Layout title='Hello' description='Wer wir sind'>
            <div className={styles.wrapper}>
                <div className={styles.hello}>
                    <h1 className={styles.headline}>Was ist M10Z?</h1>

                    <p>M10Z ist ein offener Kanal für Videospielcontent und das Drumherum.</p>

                    <p>
                        Wir haben Spaß an kurzen oder langen Texten mit mindestens 10 Zeichen. <br />
                        Wir produzieren Podcasts in (un-)regelmäßigen Abständen.<br />
                        Wir lassen uns überraschen was noch kommt.
                    </p>

                    <p>
                        Alles aus Spaß am Medium und dem kreativen Prozess. <br />
                        Unentgeltlich, unabhängig, ungezwungen.
                    </p>

                    <h2 className={styles.headline}>Wer sind wir?</h2>

                    <p>
                        Bisher ein loses Kollektiv, das seine Anfänge im <a href='https://community.wasted.de/'>Forum</a> von <a
                        href='https://wasted.de/'>WASTED.de</a> genommen hat.
                    </p>

                    <h2 className={styles.headline}>Was macht ihr?</h2>

                    <p>
                        Schaut euch hier auf unserem Blog um und genießt die Inhalte.
                    </p>
                    <p>
                        Wenn euch gefällt was wir machen, schreibt uns eine <a href='mailto:m10z@posteo.de'>E-Mail</a> oder schaut im <a
                        href='https://community.wasted.de/'>WASTED-Forum</a> vorbei.
                    </p>
                    <p>
                        Wenn ihr meint, das könnt ihr ebenso gut oder besser:<br />
                        Mitmachen ist ausdrücklich erwünscht. Meldet euch.
                    </p>

                    <h2 className={styles.headline}>Wer darf mitmachen?</h2>

                    <p>
                        Jede*r mit Lust an Themen die zu M10Z passen.
                    </p>
                    <p>
                        Du musst keine Erfahrung haben. <br />
                        Dies darf gerne ein Versuch für Dich sein.
                    </p>

                    <h2 className={styles.headline}>M10Z hat keinen Platz für:</h2>
                    <p>Sexismus, Rassismus, Antisemitismus, Homo- und Transphobie, Klassismus, Ableismus.</p>

                    <h1 className={styles.headline}>Unsere Autor:Innen</h1>
                    <div className={styles.authors}>
                        {authors}
                    </div>
                </div>
            </div>
        </Layout>
    )
}
