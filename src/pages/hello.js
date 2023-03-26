import React from 'react';
import Layout from '@theme/Layout';

export default function Hello() {
    return (
        <Layout title="Hello" description="Hello React Page">
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '50vh',
                    fontSize: '20px',
                }}>
                <p>
                  **Was ist M10Z?**

M10Z ist ein offener Kanal für Videospielcontent und das Drumherum.

Wir haben Spaß an kurzen oder langen Texten mit mindestens 10 Zeichen.   
Wir produzieren Podcasts in (un-) regelmäßigen Abständen.  
Wir lassen uns überraschen was noch kommt.

Alles aus Spaß am Medium und dem kreativen Prozess.   
Unentgeltlich, unabhängig, ungezwungen.

**Wer sind wir?**

Bisher ein loses Kollektiv, das seine Anfänge im [Forum](https://community.wasted.de "Wasted Forum") von [WASTED.de](http://http://wasted.de "Wasted") genommen hat.

**Was macht ihr?**

Schaut euch hier auf unserem Blog um und genießt die Inhalte.  
Wenn euch gefällt was wir machen, schreibt uns eine Email oder kommt zu uns ins [Forum](https://community.wasted.de "Wasted Forum").  
Wenn ihr meint, das könnt ihr ebenso gut oder besser:  
Mitmachen ist ausdrücklich erwünscht. Meldet euch.

**Wer darf mitmachen?**

Jede*r mit Lust an Themen die zu M10Z passen.  
Du musst keine Erfahrung haben.  
Dies darf gerne ein Versuch für Dich sein.

**M10Z hat keinen Platz für:**

Sexismus, Rassismus, Antisemitismus, Homo- und Transphobie, Klassismus, Ableismus  
                </p>
            </div>
        </Layout>
    );
}
