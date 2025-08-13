# secret-hitler

[![Build Status](https://github.com/cozuya/secret-hitler/actions/workflows/node.js.yml/badge.svg)](https://github.com/cozuya/secret-hitler/actions)

Secret Hitler is a dramatic game of political intrigue and betrayal set in 1930's Germany. Players are secretly divided into two teams - liberals and fascists.
Known only to each other, the fascists coordinate to sow distrust and install their cold-blooded leader. The liberals must find and stop the Secret Hitler before it’s too late.

This codebase is a "lobby style" implementation of this game - anyone can make a game which is displayed on a list on the "home" page. The game starts when enough players are seated. In addition, anyone can watch a game in progress, etc.

Originally launched in 2017, production is at [Secret Hitler IO](https://secrethitler.io). The tech to make this work is VERY OLD (before react hooks!), has had almost no oversight of public pull requests leading to some giant pasta style code, and I can't recommend working on it, looking at it, or exposing it to sunlight. It does work, though.

Front end: React, Redux, Sass, Semantic UI (which needs jQuery..), SocketIO.

Back end: Node, Express, Pug, Passport, Mongodb with Mongoose, SocketIO.

## Installation

Install NodeJS v22.14.0. [NVM](https://github.com/nvm-sh/nvm) is the industry standard way to install Node.

Install [mongodb](https://www.mongodb.com/download-center/community), have it in your path.

Install [redis](https://redis.io/download), have it in your path.

Install [yarn](https://yarnpkg.com/en/docs/install) for your OS.

then

```bash
git clone https://github.com/cozuya/secret-hitler.git
cd secret-hitler
yarn
```

If you're receiving an error like "Found incompatible module", try using `yarn --ignore-engines`

## Running in dev mode

**Start development:**

Start the redis server.

```bash
yarn dev
```

Navigate to: http://localhost:8080

You'll need multiple sessions, so use something like Chrome's user profiles, or Firefox's multi-account containers. No, incognito will not work. You'll want to check "disable cache" on the network tab - the webpack setup isn't great, doesn't cache bust itself, and there's no live reload, so all saves will need a F5. Also it will be very helpful to make all of the "quickdefault" accounts with the default password, `snipsnap`, so that you can log in to an account in one click. There is a yarn script you may run once `server` or `dev` yarn scripts are already running called `create-accounts` which will attempt to populate all of the helper accounts into the database.

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

Don't. Please respect the maintainers and contributors who have given their time for free to make SH.io as good as it is. Running this codebase outside of SH.io may have unintended consequences.

## License and Attribution

Secret Hitler is designed by Max Temkin (Cards Against Humanity, Humans vs. Zombies) Mike Boxleiter (Solipskier, TouchTone), Tommy Maranges (Philosophy Bro) and illustrated by Mackenzie Schubert (Letter Tycoon, Penny Press).

This game is licensed as per the [Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International](https://creativecommons.org/licenses/by-nc-sa/4.0/)
license.

## Alterations to the original game

Minor image alterations and editing - assets available in this repository.

Veto power is slightly adjusted so that chancellors need to select a policy prior to saying yes or no to vetoing that policy.

Adapted the rules explanation to account for online vs physical play.

There is an option when players make a game to "rebalance" the 6, 7 and 9 player games - 6p starts with a fascist policy already enacted, 7p starts with one less fascist policy in the deck, 9p starts with two less fascist policies in the deck. Players (and results from analyzing statistics) have noted that these game modes are not balanced well in the original ruleset.

There is a custom game mode where game creators can make games with different rulesets such as being able to pick policy powers, pick number of fascists (always less than liberals), number of policies, etc.

## Credits

While I (poorly) made this many years ago, it could not have been as successful as it has been, with close to 2 million games played, without the efforts of all of the people who have given up their time on our discord found at https://discord.gg/secrethitlerio, and a special thanks to many of the larger PRs over the years. -coz
