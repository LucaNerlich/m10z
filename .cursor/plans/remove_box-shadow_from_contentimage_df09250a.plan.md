---
name: Remove box-shadow from ContentImage
overview: "Remove the `box-shadow: var(--shadow-soft);` property from the `.container` class in `ContentImage.module.css` to eliminate the visual gap between images and metadata sections."
todos:
  - id: remove-box-shadow
    content: Remove box-shadow property from .container class in ContentImage.module.css
    status: completed
---

# Remove box-shadow from ContentImage

Remove the `box-shadow` styling from the ContentImage component to eliminate visual gaps.

## Changes

### [frontend/src/components/ContentImage.module.css](frontend/src/components/ContentImage.module.css)

Remove the `box-shadow: var(--shadow-soft);` property from the `.container` class (line 9), keeping all other properties unchanged:

- Keep `padding`, `display`, `justify-content`, `margin`, `max-width`
- Keep `border-radius: var(--border-radius);`