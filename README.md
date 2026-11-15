# Squishymania by Ella

A static catalogue of real NeeDoh squishy toys by Schylling. Ella can mark each one Have or Want in this browser. There is no account, no ads, and no tracking.

Open `index.html` through any static file server. The catalogue lives in [`data/catalogue.json`](data/catalogue.json). Facts and photo credits are in [`SOURCES.md`](SOURCES.md).

## Add a NeeDoh

Add an object to the `items` array. Leave unknown strings empty and list those field names in `unknown`. Point `image` at a file in `assets/images/` and set `imageSource` to the page the photo came from. If you do not have a photo, set `placeholder` to true and use a drawing in `assets/placeholders/`.

## GitHub Pages

The site is plain files, so it does not need a server. [`.github/workflows/pages.yml`](.github/workflows/pages.yml) publishes the repository root to GitHub Pages on every push to `main`.

After this workflow is on `main`, turn on Pages once: **Settings → Pages → Build and deployment → Source: GitHub Actions**. The site will then be at:

https://genemagg10.github.io/needoh/

## Sounds

Every sound is made in the browser by [`js/sfx.js`](js/sfx.js). There are no audio files. The speaker button remembers on or off in `squishymania.sound.v1`. Sound is on unless she turns it off, and the first tap is what lets the browser play it.

To add or tweak a sound, edit a function in `js/sfx.js` (`squish`, `have`, `want`, `whoosh`, `pop`, `secret`, or `giggle`) or add a new one next to them and put it on the `sfx` object. `tone()` is a soft note. `noise()` is a soft whoosh. `gain` is how loud that note is, and `dur` is how long it lasts. `prefers-reduced-motion` already makes every sound shorter and quieter. Call the new function from `js/app.js` at the moment it should play.

## Fonts

Fredoka and Nunito are included under the SIL Open Font License. The files came from Fontsource.
