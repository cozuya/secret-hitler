![header](https://cdn.discordapp.com/attachments/335071937350860801/357617077881667584/hello1234.jpeg)  

***
# [Read Me Page](https://github.com/cozuya/secret-hitler#secret-hitler)

[![styled with prettier](https://img.shields.io/badge/styled_with-prettier-ff69b4.svg)](https://github.com/prettier/prettier)

Secret Hitler is a dramatic game of political intrigue and betrayal set in 1930's Germany. Players are secretly divided into two teams - liberals and fascists.
Known only to each other, the fascists coordinate to sow distrust and install their cold-blooded leader. The liberals must find and stop the Secret Hitler
before it’s too late.

Effectively this is a take on the classic social deduction/hidden role board game genre such as Werewolf and Mafia, but closer to the Resistance. Games are 5-10
players, the minority (fascists) know who everyone is and the majority (liberals) don't know anything. Over the course of the game the liberals need to try to
figure out the fascists to win and the fascists need to remain hidden, with an extra "superfascist" role with an additional win condition for both sides. This
codebase is a "lobby style" implementation of this game - anyone can make a game which is displayed on a list on the "home" page, when enough players are seated
it starts, anyone can watch a game in progress, etc.

Current production/stable is found at [Secret Hitler IO](https://secrethitler.io).

![Screenshot](https://i.imgur.com/y7ka1lG.png)

Considering contributing to this project? Please read our brief guidelines found at
[CONTRIBUTING](https://github.com/cozuya/secret-hitler/blob/master/CONTRIBUTING.md). Contributors get a cool orange playername color!

Front end: React, Redux, Sass, Semantic UI, jQuery, SocketIO.

Back end: Node, Express, Pug, Passport, Mongodb with Mongoose, SocketIO.

## Installation

Install [git](https://git-scm.com/downloads) for your OS, have it in your path.

Install [mongodb](https://www.mongodb.com/download-center?ct=atlasheader#community) for your OS, have it in your path.

Install [node.js version: LTS](https://nodejs.org/en/) for your OS, have it in your path.

Install [yarn](https://yarnpkg.com/en/docs/install) for your OS, have it in your path.

then

> git clone https://github.com/cozuya/secret-hitler.git

> cd secret-hitler

> mkdir data logs

> yarn

## Running in dev mode

Start development:

> yarn dev

Navigate to: http://localhost:8080

You'll most likely need a browser extension such as Chrome's [openMultiLogin](https://chrome.google.com/webstore/detail/openmultilogin/lbofelamdnfmipbbgkebcpkapahbmcgm?hl=en) to have multiple sessions on the same browser. No, incognito will not work. Also it
will be very helpful to make all of the "quickdefault" accounts with the default password, **snipsnap**, so that you can log in to an account in one click.

## Important note for Windows users

After much struggling, I have determined there is something wrong in NodeJS LTS itself. You MUST USE NODE JS v6.13.1, not "Node JS" i.e. the LTS version. For more info: https://stackoverflow.com/questions/49091270/why-is-socket-io-is-very-slow-on-windows/49212490#49212490

## Running in production mode

I'll leave you to figure that out. SH.IO is currently a $20/month ubuntu linux box using nginx, lets encrypt, PM2, and hosted on Digitalocean.

## Statistics

Production has a limited set of data on the /stats page. If you'd like to do more detailed data analysis, please contact the maintainer for a dump of the
(anonymized) profile and replay data.

## License and Attribution

Secret Hitler is designed by Max Temkin (Cards Against Humanity, Humans vs. Zombies) Mike Boxleiter (Solipskier, TouchTone), Tommy Maranges (Philosophy Bro) and
illustrated by Mackenzie Schubert (Letter Tycoon, Penny Press).

This game is licensed as per the [Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International](https://creativecommons.org/licenses/by-nc-sa/4.0/)
license.

## Alterations to the original game

Minor image alterations and editing (assets available upon request).

Veto power is slightly adjusted so that chancellors need to select a policy prior to saying yes or no to vetoing that policy.

Adapted the rules explanation to account for online vs physical play.

There is an option when players make a game to "rebalance" the 6, 7 and 9 player games - 6p starts with a fascist policy already enacted, 7p starts with one
less fascist policy in the deck, 9p starts with two less facist policies in the deck. Players (and results from analyzing statistics) have noted that these game
modes are not balanced well in the original ruleset.
