# secret-hitler

[![Build Status](https://api.travis-ci.com/cozuya/secret-hitler.svg?branch=master)](https://travis-ci.com/cozuya/secret-hitler/)
[![Contributions Welcome](https://img.shields.io/badge/contributions-welcome-orange.svg?style=flat)](https://github.com/cozuya/secret-hitler/issues)
[![Dependencies](https://david-dm.org/cozuya/secret-hitler.svg)](https://david-dm.org/cozuya/secret-hitler)
[![Dev Dependencies](https://david-dm.org/cozuya/secret-hitler/dev-status.svg)](https://david-dm.org/cozuya/secret-hitler?type=dev)
[![Styled with Prettier](https://img.shields.io/badge/styled_with-prettier-ff69b4.svg)](https://github.com/prettier/prettier)

This codebase is a "lobby style" implementation of the 5-10 player board game. Anyone can make a game which is displayed on a list on the "home" page. The game starts when enough players are seated.

Current production/stable is found at [Secret Hitler IO](https://secrethitler.io).

![Screenshot](https://cdn.discordapp.com/attachments/532418308977328139/538550232015962112/unknown.png)

Considering contributing to this project? Please read our brief guidelines found at
[CONTRIBUTING](https://github.com/cozuya/secret-hitler/blob/master/.github/CONTRIBUTING.md). Contributors get a cool special playername color!

Front end: React, Redux, Sass, Semantic UI, jQuery, SocketIO.

Back end: Node, Express, Pug, Passport, Redis, Mongodb with Mongoose, SocketIO.

## Installation

Install [node.js version: LTS](https://nodejs.org/en/), have it in your path.

Install [git](https://git-scm.com/downloads), have it in your path.

Install [mongodb](https://www.mongodb.com/download-center?ct=atlasheader#community), have it in your path.

Install [yarn](https://yarnpkg.com/en/docs/install) for your OS.

Install [redis](https://redis.io/) for your OS and run it. Windows will need some work to get it running (look to download version 2.8).

then

```bash
git clone https://github.com/cozuya/secret-hitler.git
cd secret-hitler
yarn
```

If you're receiving an error like "Found incompatible module", try using `yarn --ignore-engines`

## Running in dev mode

```bash
yarn dev
```

Navigate to: http://localhost:8080

You'll most likely need a browser extension such as Chrome's [SessionBox](https://chrome.google.com/webstore/detail/sessionbox-free-multi-log/megbklhjamjbcafknkgmokldgolkdfig?hl=en) to have multiple sessions on the same browser. No, incognito will not work. When developing in Chrome, you'll want to check "disable cache" on the network tab - my webpack setup isn't great and it doesn't cache bust itself. Also it will be very helpful to make all of the "quickdefault" accounts with the default password, `snipsnap`, so that you can log in to an account in one click. There is a yarn script you may run once `server` or `dev` yarn scripts are already running called `create-accounts` which will attempt to populate all of the helper accounts into the database.

```bash
yarn create-accounts
```

**Assigning a local mod:**

In order to better test all functions of the site in a local development environment it is useful to assign an admin account.
This is done for you through the `secret-hitler/scripts/assignLocalMod.js` file courtesy of contributor Hexicube.
After running the `create-accounts` script you will have the helper accounts populated into the database.
Running the next line below will then assign `Uther` to the `admin` staffRole to better test all site functions in testing.

```bash
yarn assign-local-mod
```

Upon seeing the end result in the terminal of `Assigned.` you will know it worked. Just refresh your localhost:8080 page at this point and then you will have a local mod to test additional functions of the site with in a development mode environment.

## Running in production mode

Don't. Respect the maintainer and contributors who have given their time for free to make SH.io as good as it is. Running this codebase outside of SH.io may have unintended consequences.

## Statistics

Production has a limited set of data on the /stats page, check network traffic for the XHR for that if interested. If you'd like to do more detailed data analysis, please contact the maintainer for a dump of the (anonymized) profile and replay data.

## License and Attribution

Secret Hitler is designed by Max Temkin (Cards Against Humanity, Humans vs. Zombies) Mike Boxleiter (Solipskier, TouchTone), Tommy Maranges (Philosophy Bro) and illustrated by Mackenzie Schubert (Letter Tycoon, Penny Press).

This game is licensed as per the [Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International](https://creativecommons.org/licenses/by-nc-sa/4.0/)
license.

## Alterations to the original game

Minor image alterations and editing (assets available upon request).

Veto power is slightly adjusted so that chancellors need to select a policy prior to saying yes or no to vetoing that policy.

Adapted the rules explanation to account for online vs physical play.

There is an option when players make a game to "rebalance" the 6, 7 and 9 player games - 6p starts with a fascist policy already enacted, 7p starts with one less fascist policy in the deck, 9p starts with two less facist policies in the deck. Players (and results from analyzing statistics) have noted that these game modes are not balanced well in the original ruleset.

There is a custom game mode where game creators can make games with different rulesets such as being able to pick policy powers, pick number of fascists (always less than liberals), number of policies, etc.
