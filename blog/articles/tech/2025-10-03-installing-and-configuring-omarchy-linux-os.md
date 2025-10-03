---
slug: installing-and-configuring-omarchy-linux-os
title: 'Sunday-Projects – Aufsetzen und konfigurieren von Omarchy OS (Linux)'
date: 2025-10-03
authors: [luca]
tags: [artikel, tech, sunday-projects, luca]
draft: false
image: /img/tech/omarchy.png
---

todo

![omarchy.png](/img/tech/omarchy.png)

<!--truncate-->

## Installation

[Omarchy Homepage](https://omarchy.org)


<div className="youtube-embed">
    <iframe width="100%" height="450" src="https://www.youtube-nocookie.com/embed/TcHY0AEd2Uw?si=ifsaAzpeSOFx1Frr"
            title="Endlich erwachsen 🚚 Hard Truck: Apocalypse #001" frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerpolicy="strict-origin-when-cross-origin" allowfullscreen />
</div>

[Hyprland Tutorial](https://wiki.hypr.land/Getting-Started/Master-Tutorial/)

[Waybar Konfiguration](https://github.com/Alexays/Waybar/wiki)

## Hyprland als Tiling-Manager

### Anpassungen

## Fixes

Generelle Linux-Gaming Empfehlung bei Problemen, gilt als erste Anlaufstellen [protondb](https://www.protondb.com). Existieren bekannte Loesungen fuer Spiele, finden sich diese meist hier in den Kommentaren. Beispielsweise die Empfehlung die folgenden Launch Optionen fuer _Fellowship_ zu setzen: `echo "%command%" | sed 's/fellowship/fellowship-launcher/' | sh`.

### Jetbrains

JetBrains IDEs moegen Wayland und Hyprland leider nocht nicht soo gerne, daher folgende Anpassungen:

In der IDE selber:

Help -> Custom VM Options -> Add `-Dawt.toolkit.name.WLToolkit`

Und in der Hyprland Konfiguration `.config/hypr/hyprland.conf`:

```bash title=".config/hypr/hyprland.conf"
# Hyprland window rules for JetBrains

# Fix all dialogs in Jetbrains products
windowrulev2 = tag +jb, class:^jetbrains-.+$,floating:1
windowrulev2 = stayfocused, tag:jb
windowrulev2 = noinitialfocus, tag:jb
windowrulev2 = focusonactivate,class:^jetbrains-(?!toolbox)

# center the pops excepting context menu
windowrulev2 = move 30% 30%,class:^jetbrains-(?!toolbox),title:^(?!win.*),floating:1
windowrulev2 = size 40% 40%,class:^jetbrains-(?!toolbox),title:^(?!win.*),floating:1

# Fix tooltips (always have a title of `win.<id>`)
# Fix for sidebar menus being unclickable
windowrulev2 = noinitialfocus, class:^(.*jetbrains.*)$, title:^(win.*)$
windowrulev2 = nofocus, class:^(.*jetbrains.*)$, title:^(win.*)$
# Fix tab dragging (always have a single space character as their title)
windowrulev2 = noinitialfocus, class:^(.*jetbrains.*)$, title:^\\s$
windowrulev2 = nofocus, class:^(.*jetbrains.*)$, title:^\\s$
# Additional fixes for tab dragging
windowrulev2 = tag +jb, class:^jetbrains-.+$,floating:1
windowrulev2 = stayfocused, tag:jb
windowrulev2 = noinitialfocus, tag:jb
```

### Steam

Manche Spiele kommen mit Hyprland nicht klar, bzgl Windows/Fullscreen, daher sind diese kurzen Config Updates in `.config/hypr/hyprland.conf` empfehlenswert:

```bash title=".config/hypr/hyprland.conf"
windowrule = fullscreen, class:^steam_app_.*
windowrule = opacity 1, class:^steam_app_.*
```
