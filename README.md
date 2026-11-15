# Squishymania by Ella

A static catalogue of real NeeDoh squishy toys by Schylling. Ella can mark each one Have or Want in this browser. There is no account, no ads, and no tracking.

Open `index.html` through any static file server. The catalogue lives in [`data/catalogue.json`](data/catalogue.json). Facts and photo credits are in [`SOURCES.md`](SOURCES.md).

## Add a NeeDoh

Add an object to the `items` array. Leave unknown strings empty and list those field names in `unknown`. Point `image` at a file in `assets/images/` and set `imageSource` to the page the photo came from. If you do not have a photo, set `placeholder` to true and use a drawing in `assets/placeholders/`.

## GitHub Pages

The site is plain files, so it does not need a server. [`.github/workflows/pages.yml`](.github/workflows/pages.yml) publishes the repository root to GitHub Pages on every push to `main`.

After this workflow is on `main`, turn on Pages once: **Settings → Pages → Build and deployment → Source: GitHub Actions**. The site will then be at:

https://genemagg10.github.io/needoh/

## Fonts

Fredoka and Nunito are included under the SIL Open Font License. The files came from Fontsource.
