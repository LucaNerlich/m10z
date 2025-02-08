---
slug: podcast-manager-strapi-cms
title: 'Sunday-Projects – Podcast Manager'
date: 2025-02-28
authors: [luca]
tags: [artikel, tech, sunday-projects, luca]
draft: false
image: /img/tech/sundayprojects/podcastcms.jpg
---

Da mich das manuelle Verwalten meiner privaten Archiv-Podcasts nervte, habe ich mir in den letzten Tagen einen [Podcast-RSS-Feed-Manager](https://github.com/LucaNerlich/podcast-manager) gebaut.

![wichteln.jpg](/img/tech/sundayprojects/podcastcms.jpg)

<!--truncate-->

Zu meinen Lieblings-Podcast-Formaten gehören die Audio-Lets Plays von [StayForever Spielt](https://www.stayforever.de/alle-premium-formate-steady-patreon/#spielt) und die ("quasi") Hörspiele von [Down to the Detail](https://downtothedetailpodcast.de). Sobald eine Staffel fertig ist, lade ich mir die MP3s herunter, schneide sie mit Audacity zu einem *Supercut* zusammen und stelle mir die Folgen über meinen privaten Podcast RSS Feed zur Verfügung. So kann ich mir die Staffeln bequem und jederzeit immer wieder anhören - nutzen tue ich dies dadurch fast täglich.

Meine Ziele mit diesem Projekt waren die Folgenden:

1. Bereitstellung von Podcast-Feeds als RSS XML Datei
2. Aufrufbar durch eine simple URL, da ich die Feeds in meiner Podcatcher-App abonnieren möchte
3. Es muss möglich sein, Feeds nur von spezifischen Usern abrufbar zu machen
4. Feeds und Episoden müssen per grafischer Oberfläche erzeugbar sein und verwaltet werden können
5. MP3 Dateien und Cover Images müssen hochladbar sein

Aufgrund der Erfahrungen aus anderen Projekten habe ich mich wieder für das [CMS Strapi](https://strapi.io) entschieden. Strapi kann kostenlos selbst gehostet werden, bietet eine REST API und ist durch Plugins erweiterbar. Insbesondere unterstützt die Medienverwaltung von Strapi den Upload von Dateien und Bildern direkt in AWS S3, welches wiederum eine der kostengünstigsten Cloud-Massenspeicherlösungen ist.

Die Umsetzung des Projekts war relativ einfach, da Strapi bereits viele der benötigten Funktionen mitbringt. Ich habe lediglich einige eigene Endpunkte, Lifecycle Hooks und Controller geschrieben, um die Feeds und Episoden zu verwalten. Die Modelle für Feeds und Episoden sind relativ einfach gehalten, da ich keine komplexen Datenstrukturen benötige. Neben den Standardfeldern wie Titel, Beschreibung und Coverbild gibt es noch eine Verbindung zwischen Feed und Episode, sowie zwischen Feed und "erlaubten Usern" für private Feeds.

Damit die XML-Datei nicht bei jeder Anfrage neu generiert werden muss, speichert jede Episode bei einem Update ihren eigenen RSS `<item/>` Eintrag. Ein CRON-Job generiert einen geänderten Feed, auf basis aller verknuepften Episoden und deren `<item/>` Feldern neu und speichert das XML-Ergebnis in der Datenbank. Die XML-Datei wird dann bei einer Anfrage einfach aus der Datenbank geladen und zurückgegeben. Bei privaten Feeds wird zusaetzlich noch der anfragende Token mit der Liste der "erlaubten Usern" verglichen.

Hier der Service des *findOne* Endpunktes, der die Feeds aus der Datenbank lädt und die Berechtigungen prüft:

```javascript title="src/api/feed/services/feed.ts"
import {factories} from '@strapi/strapi';

export default factories.createCoreService('api::feed.feed', ({strapi}) => ({
    async findOne(params) {
        const {documentId, slug, userToken} = params;

        const filters: any = {};

        if (documentId !== undefined) filters.documentId = {$eq: documentId};
        if (slug !== undefined) filters.slug = {$eq: slug};

        // find the feed based on the given filters
        const result: any = await strapi.documents('api::feed.feed').findFirst({
            filters: filters,
            fields: ['data', 'public'],
            populate: ['allowed_users'],
        });

        // no feed found
        if (!result) return null;

        // public feed, just return
        if (result.public) return result.data;

        // private feed, but no user token passed
        if (!userToken) return null;

        // private feed, but user token does not have access
        if (!result.allowed_users.some(user => user.token === userToken)) return null;

        return result.data;
    },
}));
```

Hier sind die Lifecycle Hooks, die beim Erstellen und Veraendern von Episoden aufgerufen werden:

```javascript title="src/api/episode/content-types/episode/lifecycles.ts"
export default {
    async beforeCreate(event) {
        event.params.data.guid = event.params.data.guid ?? crypto.randomUUID();
        event.params.data.data = prettify(generateItem(event), {
            indent: 2,
            newline: "\n",
        });
    },
    async afterCreate(event) {
        const {result} = event;
        await triggerFeedUpdate(result);
    },
    async beforeUpdate(event) {
        event.params.data.data = prettify(generateItem(event), {
            indent: 2,
            newline: "\n",
        });
    },
    async afterUpdate(event) {
        const {result} = event;
        await triggerFeedUpdate(result);
    }
};
```

`generateItem` generiert die XML `<item/>` Einträge und `triggerFeedUpdate` löst die Neugenerierung des Feeds aus.

```javascript title="Generate XML Item"
function generateItem(event) {
    return `
        <item>
            <title>${event.params.data.title}</title>
            <pubDate>${new Date(event.params.data.releasedAt).toUTCString()}</pubDate>
            <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
            <guid isPermaLink="false">${event.params.data.guid}</guid>
            <itunes:image href="${event.params.data.cover.url}"/>
            <description>${event.params.data.description}</description>
            <itunes:explicit>false</itunes:explicit>
            <itunes:duration>${event.params.data.duration}</itunes:duration>
            <link>${event.params.data.link}</link>
            <enclosure url="${event.params.data.audio.url}" length="${Math.round(event.params.data.audio.size * 1024)}" type="audio/mpeg"/>
        </item>
        `;
}
```

Der Feed Generierungs CRON Job läuft alle X Minuten und generiert alle Feeds neu, die in seit der letzten Generierung verändert wurden. Jede Veraenderung setzt dabei lediglich den `updatedAt` Zeitstempel der des Feed-Models neu, gegen diesen dann geprüft wird.

```javascript title="Trigger Feed Update"
/**
 * Updates all feeds associated with an episode to re-trigger their update lifecycle hooks.
 * This ensures that the associated feed data, such as the feed.xml, is regenerated.
 *
 * @param {Object} result The result object containing the documentId of the episode to update.
 * @return {Promise<void>} A promise that resolves when all associated feeds have been updated.
 */
async function triggerFeedUpdate(result) {
    // gather documentIds of attached feeds, since the event relation is unpopulated
    const episode = await strapi.documents('api::episode.episode').findOne({
        documentId: result.documentId,
        populate: {
            feeds: {
                fields: ['documentId']
            }
        },
    })

    // 'fake' update all affected feeds,
    for (const feed of episode.feeds) {
        await strapi.documents('api::feed.feed').update({
            documentId: feed.documentId,
            data: {
                updatedAt: new Date(),
            }
        });
        console.info("Updated Feed from Episode - " + feed.documentId)
    }
}
```

Zu guter Letzt der CRON Job

```javascript title="config/cron-tasks.ts"
export default {
    generateFeeds: {
        task: async ({strapi}) => {
            const feeds = await strapi.documents('api::feed.feed').findMany({
                populate: ['episodes', 'cover'],
                status: 'published',
            });

            for (const feed of feeds) {
                // Skip empty feeds
                if (!feed.episodes || feed.episodes.length === 0) {
                    console.info("Skipped empty feed - " + feed.documentId)
                    continue;
                }

                // Skip unchanged feeds
                if (new Date(feed.generatedAt).getTime() + 2000 > new Date(feed.updatedAt).getTime()) {
                    console.info("Skipped unmodified feed - " + feed.documentId)
                    continue
                }

                // Regenerate xml feed file
                const generatedFeed = prettify(generateFeed(feed), {
                    indent: 2,
                    newline: "\n",
                })

                // Save generated xml to database
                await strapi.documents('api::feed.feed').update({
                    documentId: feed.documentId,
                    data: {
                        generatedAt: new Date(),
                        data: generatedFeed
                    }
                })
                console.info("Regenerated feed - " + feed.documentId)
            }
        },
        options: {
            rule: "*/5 * * * *", // every 5 minutes
        },
    },
};
```

```javascript title="Generate XML Feed"
function generateFeed(feed) {
    const episodes = feed.episodes;
    return `
        <rss version="2.0" 
        xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"
        xmlns:atom="http://www.w3.org/2005/Atom"
        xmlns:content="http://purl.org/rss/1.0/modules/content/">
            <channel>
                <title>${feed.title}</title>
                <description>${feed.description}</description>
                <language>de</language>
                <copyright>${feed.copyright}</copyright>
                <link>${feed.link}</link>
                <itunes:category text="Leisure"/>
                <itunes:owner>
                    <itunes:name>${feed.owner}</itunes:name>
                    <itunes:email>${feed.email}</itunes:email>
                </itunes:owner>
                <itunes:author>${feed.owner}</itunes:author>
                <itunes:explicit>false</itunes:explicit>
                <itunes:type>episodic</itunes:type>
                <itunes:image href="${feed.cover?.url}"/>
                ${episodes
        // remove draft episodes
        .filter((episode) => episode.draft === false || episode.draft === undefined || episode.draft === null)
        // remove unreleased episodes
        .filter((episode) => new Date(episode.releasedAt).getTime() < new Date().getTime())
        // sort by youngest first
        .sort((a, b) => new Date(b.releasedAt).getTime() - new Date(a.releasedAt).getTime())
        // add all item entries
        .map((episode) => episode.data).join('')}
            </channel>
        </rss>
        `;
}
```

Das komplette [Repository](https://github.com/LucaNerlich/podcast-manager) findet sich hier.

## Screenshots

![feeds](/img/tech/sundayprojects/podcastmanager/feeds.png)
> Die Feed-Übersicht
---
![episodes](/img/tech/sundayprojects/podcastmanager/episodes.png)
> Die Episoden-Übersicht
---
![bruno](/img/tech/sundayprojects/podcastmanager/bruno.png)
> REST Zugriff auf einen privaten Feed

Bei Fragen, meldet euch gerne auf unserem Discord oder direkt im GitHub Repository.

Luca
