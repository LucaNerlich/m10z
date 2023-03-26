import React from 'react'
import Layout from '@theme/Layout'

export default function Hello() {
    return (
        <Layout title='Hello' description='Hello React Page'>
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '50vh',
                    fontSize: '20px',
                }}>
                <p>
                    <h2 style={{color: '#F16012'}}>Was ist M10Z?</h2>

                    M10Z ist ein offener Kanal für Videospielcontent und das Drumherum.<br />

                    Wir haben Spaß an kurzen oder langen Texten mit mindestens 10 Zeichen. <br />
                    Wir produzieren Podcasts in (un-) regelmäßigen Abständen.<br />
                    Wir lassen uns überraschen was noch kommt.<br />

                    Alles aus Spaß am Medium und dem kreativen Prozess.
                    Unentgeltlich, unabhängig, ungezwungen. <br /> <br />

                    <h2 style={{color: '#F16012'}}>Wer sind wir?</h2>

                    Bisher ein loses Kollektiv, das seine Anfänge im <a href='https://community.wasted.de/'>Forum</a> von <a
                    href='https://wasted.de/'>WASTED.de</a> genommen hat. <br /> <br />

                    <h2 style={{color: '#F16012'}}>Was macht ihr?</h2>

                    Schaut euch hier auf unserem Blog um und genießt die Inhalte.<br />
                    Wenn euch gefällt was wir machen, schreibt uns eine <a href='mailto:m10z@posteo.de'>Email</a> oder kommt zu uns ins <a
                    href='https://community.wasted.de/'>Forum</a>.<br />
                    Wenn ihr meint, das könnt ihr ebenso gut oder besser:<br />
                    Mitmachen ist ausdrücklich erwünscht. Meldet euch. <br /> <br />

                    <h2 style={{color: '#F16012'}}>Wer darf mitmachen?</h2>

                    Jede*r mit Lust an Themen die zu M10Z passen.<br />
                    Du musst keine Erfahrung haben. <br />
                    Dies darf gerne ein Versuch für Dich sein. <br /> <br />

                    <h2 style={{color: '#F16012'}}>M10Z hat keinen Platz für:</h2>

                    Sexismus, Rassismus, Antisemitismus, Homo- und Transphobie, Klassismus, Ableismus

                </p>
            </div>
        </Layout>
    )
}
