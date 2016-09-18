secret-hitler
======================

Secret Hitler is a dramatic game of political intrigue and betrayal set in 1930's Germany. Players are secretly divided into two teams - liberals and fascists. Known only to each other, the fascists coordinate to sow distrust and install their cold-blooded leader. The liberals must find and stop the Secret Hitler before it’s too late.

<!-- ![Screenshot](http://todo) -->

Front end: React, Redux, Sass, Bootstrap 4, jQuery, SocketIO.

Back end: Node, Express, Pug, Passport, Mongodb with Mongoose, SocketIO.

Build: Gulp, Browserify, Babel (front end).

Latest version: pre-alpha

## Installation ##

Install node v6.x.

Install mongodb, have it in your path.

> git clone https://github.com/cozuya/secret-hitler.git

> cd secret-hitler

> npm i -g gulp nodemon

> npm i

At this point you may receive an error regarding node-sass so you'll need to do

> npm rebuild node-sass

For installation on windows, you may need to do a few extra steps if you are getting node-gyp errors, specifically installing the required MS programs referred to on node-gyp's github, and then possibly doing:

> set GYP_MSVS_VERSION=2013

> npm i --msvs_version=2013

instead of the npm install found above.

## Running in dev mode ##

start mongo:

> npm run db

start server:

> npm start

build assets (first time only):

> gulp build

start development task runner:

> gulp

navigate to: http://localhost:8080

You'll most likely need a browser extension such as Chrome's Multilogin to have multiple sessions on the same browser.  No, incognito will not work.

## Tests ##

> npm test

## Attribution ##

Secret Hitler is designed by Max Temkin (Cards Against Humanity, Humans vs. Zombies) Mike Boxleiter (Solipskier, TouchTone), Tommy Maranges (Philosophy Bro) and illustrated by Mackenzie Schubert (Letter Tycoon, Penny Press).

This game is attributed as per the [Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International](https://creativecommons.org/licenses/by-nc-sa/4.0/) license.