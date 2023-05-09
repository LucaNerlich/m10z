import React from 'react'
import Layout from '@theme/Layout'

export default function Hello() {
    return (
        <Layout title='Hello' description='Wer wir sind'>
            <div
                style={{
                    maxWidth: '1200px',
                    margin: '0 auto',
                    paddingBlockStart:' 1em',
                }}>
                <h1 style={{color: '#F16012'}}>Was ist M10Z?</h1>

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

                <h2 style={{color: '#F16012'}}>Wer sind wir?</h2>

                <p>
                    Bisher ein loses Kollektiv, das seine Anfänge im <a href='https://community.wasted.de/'>Forum</a> von <a
                    href='https://wasted.de/'>WASTED.de</a> genommen hat.
                </p>

                <h2 style={{color: '#F16012'}}>Was macht ihr?</h2>

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

                <h2 style={{color: '#F16012'}}>Wer darf mitmachen?</h2>

                <p>
                    Jede*r mit Lust an Themen die zu M10Z passen.
                </p>
                <p>
                    Du musst keine Erfahrung haben. <br />
                    Dies darf gerne ein Versuch für Dich sein.
                </p>

                <h2 style={{color: '#F16012'}}>M10Z hat keinen Platz für:</h2>
                <p>Sexismus, Rassismus, Antisemitismus, Homo- und Transphobie, Klassismus, Ableismus.</p>
            </div>
        </Layout>
    )
}
