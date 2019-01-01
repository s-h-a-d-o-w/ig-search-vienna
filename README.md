# ig-search-vienna

## IMPORTANT

This was thrown together in just a few days. I had never worked with Puppeteer 
and GraphQL before and I have no intention of refactoring and making it 
more general purpose because it already does what I need.

## What it does

All I wanted to do was find interesting instagram posts from people where 
I live.
But IG's laughable search functionality makes that impossible.
And their [APIs](https://www.instagram.com/developer/) ~~suck~~ are 
very restrictive "in the interest of privacy".

So I wrote this little scraper that retrieves infos about hashtags 
being used in posts that have a geo tag for Vienna at a slow enough rate 
that the IG servers don't seem to care (otherwise - Response `429`).

And it's already been helpful for penetrating the noise compared to looking 
at **all** recent posts for Vienna.

## How to use

### General

Run `yarn dev:scrape` at least once and let it finish (which will take **1-2 
hours**) to create `db.json`. New data will be merged into that every time 
that `dev:scrape` is run.

It'll also start the GraphQL API once scraping is done.

### Development

Backend and frontend run separately (so that their terminal output isn't mixed).
Frontend reachable at http://localhost:3000 (Backend runs on `4000`)

```bash
yarn dev   # or yarn dev:scrape
yarn dev:cra
```

### Production

Required env variable: `REACT_APP_BACKEND` 

Backend also serves frontend, so everything is reachable on port `3000`.

Make sure you have a `db.json` you can upload, since scraping in production 
doesn't make sense with the way this project is constructed.

```bash
yarn build
yarn start
```
