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

![feeds](/img/tech/sundayprojects/podcastmanager/feeds.png)
> Die Feed-Übersicht

![episodes](/img/tech/sundayprojects/podcastmanager/episodes.png)
> Die Episoden-Übersicht

![bruno](/img/tech/sundayprojects/podcastmanager/bruno.png)
> REST Zugriff auf einen privaten Feed

