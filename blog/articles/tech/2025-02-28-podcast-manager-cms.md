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

Durch bereits gesammelte Erfahrungen in anderen Projekten, habe ich mich erneut fuer [CMS Strapi](https://strapi.io) entschieden. Strapi ist gratis selbst hostbar, bietet eine REST API und ist durch Plugins erweiterbar. Insbesondere unterstützt die Strapi Medienverwaltung das Hochladen von Dateien und Bildern direkt in AWS S3, welches wiederum eine der kostengünstigsten Cloud-Massenspeicherlösungen ist.
