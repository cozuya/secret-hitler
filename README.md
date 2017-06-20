secret-hitler
======================

Secret Hitler is a dramatic game of political intrigue and betrayal set in 1930's Germany. Players are secretly divided into two teams - liberals and fascists. Known only to each other, the fascists coordinate to sow distrust and install their cold-blooded leader. The liberals must find and stop the Secret Hitler before it’s too late.

![Screenshot](http://i.imgur.com/6M56f6I.jpg)

Considering a contributing to this project?  Please read our very brief guidelines found at /docs/contributions.txt.

Front end: React, Redux, Sass, Semantic UI, jQuery, SocketIO.

Back end: Node, Express, Pug, Passport, Mongodb with Mongoose, SocketIO.

Build: Gulp, Browserify, Babel (front end).

## Installation ##

Install node v6 or higher.

Install mongodb, have it in your path.

> git clone https://github.com/cozuya/secret-hitler.git

> cd secret-hitler

You pass butter.

> npm i -g yarn

> yarn global add gulp nodemon

> yarn

## Running in dev mode ##

build assets (first time only):

> gulp build

start mongo:

> yarn run db

start express server:

> yarn start

start development task runner:

> gulp

navigate to: http://localhost:8080

You'll most likely need a browser extension such as Chrome's openMultiLogin to have multiple sessions on the same browser.  No, incognito will not work.

## Tests ##

> yarn test

## License and Attribution ##

Secret Hitler is designed by Max Temkin (Cards Against Humanity, Humans vs. Zombies) Mike Boxleiter (Solipskier, TouchTone), Tommy Maranges (Philosophy Bro) and illustrated by Mackenzie Schubert (Letter Tycoon, Penny Press).

This game is attributed as per the [Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International](https://creativecommons.org/licenses/by-nc-sa/4.0/) license.

## Alterations to the original game ##

Minor image alterations and editing (from scans, assets available upon request).

Veto power is slightly adjusted so that chancellors need to select a policy prior to saying yes or no to vetoing that policy.

Adapted the rules slightly to account for online vs physical play.