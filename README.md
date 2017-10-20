
secret-hitler
======================

[![styled with prettier](https://img.shields.io/badge/styled_with-prettier-ff69b4.svg)](https://github.com/prettier/prettier)

Secret Hitler is a dramatic game of political intrigue and betrayal set in 1930's Germany. Players are secretly divided into two teams - liberals and fascists. Known only to each other, the fascists coordinate to sow distrust and install their cold-blooded leader. The liberals must find and stop the Secret Hitler before it’s too late.

Current production/stable is found at [Secret Hitler IO](https://secrethitler.io).

![Screenshot](http://i.imgur.com/6M56f6I.jpg)

Considering contributing to this project?  Please read our very brief guidelines found at ./CONTRIBUTING.md.  Contributors get a cool orange playername color!

Front end: React, Redux, Sass, Semantic UI, jQuery, SocketIO.

Back end: Node, Express, Pug, Passport, Mongodb with Mongoose, SocketIO.

Build: Gulp, Browserify, Babel (front end).

## Initial Installation ##

Step 1.) Install node.js from https://nodejs.org/en/. Production is on node LTS currently v6.11.4 and is recommended you use that for development, have it in your path.

To add this to your path we recommend searching for specific instructions online for your computer be it Windows, Mac, etc.

However, this should automatically be in your path after installation, but if you have errors using it then find out if it is in your path or not as it is likely the cuase for the issues you are experiencing.

Step 2.) Install mongodb from https://www.mongodb.com/download-center?jmp=nav#community, have it in your path.

Again, to add this to your path we recommend searching for specific instructions online for your computer be it Windows, Mac, etc.

However, this should automatically be in your path after installation, but if you have errors using it then find out if it is in your path or not as it is likely the cause for the issues you are experiencing.

Step 3.) Make a .env file using the steps below: 

Make sure your .env file is located in the Default Users folder that you start out in each time you open node.js for your convenience.
This will be the same directory where you will automatically download your cloned code of secret-hitler to in a later step.

In order to make the required .env file you will have to start with a default .txt file first then rename it inside of the node.js command prompt with the command: (Just name the file .txt and then .env unless having something like secrethitler.env is helpful.)

> rename .txt .env

You can check the names of your files before and after with this command to see if you did it right, in the node.js command prompt:

> dir

After you are done renaming your .txt to .env, close your node.js command prompt window, and add the following information to your new .env file:

> MONGOPORT={5 digit port number here}

Example:

> MONGOPORT=27017

Now save and close your .env file and move onto the next step.

Step 4.) Open your first node.js command prompt window and type in the following commands in the order presented one after the other:

(First Time Only):

> git clone https://github.com/cozuya/secret-hitler.git

(Note: if for some reason this command is not working it may be due to the fact that you do not have Git installed on your computer and/or added it to your path like nodejs and mongodb. Navigate to: https://git-scm.com/download/win to install git. Then follow the same steps you used to ensure that it is placed into your path as you did for nodejs and mongodb. Test the command at this point and it should work.)

(Everytime at the beginning of command processing):

> cd secret-hitler

(Note: This command changes your working directory to be directly inside your new secret-hitler code folder to make the rest of the commands do their jobs properly. Each time you open a new node.js command prompt window this needs to be the first command you enter everytime for proper development.)

(First Time Only):

> npm i -g gulp nodemon

(First Time Only):

> npm i

## Running in Development Mode ##

(Note: You should still be in your first node.js command prompt window at this time for proper initial development.)

build assets (first time only):

> gulp build

start mongo:

This command you will do each time to run your secret-hitler localhost site.

> npm run db {your 5 digit port number here (from .env file)}

Example:

> npm run db 27017

## At this time you will now need to open a second node.js command prompt window and initialize with this command: ##

> cd secret-hitler

start express server:

> nodemon bin/dev

## At this time you will now need to open a third node.js command prompt window and initialize with this command: ##

> cd secret-hitler

start development task runner:

> gulp

## Whenever you run secret-hitler after initial set-up in Dev Mode all you need to do is open 3 node.js command prompt windows. ##

In the first one:

> cd secret-hitler
> npm run db 27017

In the second one:

> cd secret-hitler
> nodemon bin/dev

In the third one:

> cd secret-hitler
> gulp

## DO NOT CLOSE ANY OF THE MAIN 3 NEEDED NODE.JS COMMAND PROMPTS OTHERWISE THE SITE WILL NOT LOAD! ##

Step 5.) Navigate to: http://localhost:8080  If you are within the same IP address/network zone with a friend who has a computer you can give them a link like this to access your site: http://{yourPCname}:8080    Example: http://Bob123:8080

You'll most likely need a browser extension such as Chrome's openMultiLogin to have multiple sessions on the same browser.  No, incognito will not work.

You can also use different browsers like having some accounts open in Google Chrome, Mozilla Firefox, Internet Explorer, Microsoft Edge, Opera, Safari, etc. You can use both site urls (localhost:8080 and PCname:8080) as well to have even more sessions.

## Running in Production Mode ##

I'll leave you to figure that out. SH.IO is currently a $10/month digital ocean box using nginx, lets encrypt, and PM2.

## Local Tunnel Option ##

If you wish to provide free access to other users incapable of accessing through your localhost site, you can use localtunnel as an internally downloaded aspect of node.js to provide a publicly accessible custom subdomian url of your choice (within reason), through the following commands in a FOURTH NODE.JS CMD WINDOW:

Initial Installation of LocalTunnel: (First Time Only) (Note: You do not have to do the cd secret-hitler step on this one.)

> npm install -g localtunnel

Localhost Exposing Command: (Use each time you wish to make free public access to your site)

> lt -p 8080 -s {your custom subdomain name here}

Example:

> lt -p 8080 -s secrethitler

The output should provide you with a link similar to this that you can share with friends:

> Your url is: https://secrethitler.localtunnel.me

(Note: This link is only active so long as you are actively hosting your site with all of your node.js CMDs open and with your computer on and running them as well. You have to reopen this node.js for localtunnel each time you close your other CMDs. This link will not auto activate without the necessary command.)

Due to an issue with localtunnel, the url provided expires after a certain length of time. However there is a solution to this problem using the Git Bash command prompt (which was installed when you put Git on your computer in an earlier step).

The command you need to enter to keep your subdomain link refreshing to be active indefinetely during active hosting hours is:

(You again do not need the cd secret-hitler command here.)

>  while true; do lt -p 8080 -s {subdomain name}; sleep 1; done

Example:

>  while true; do lt -p 8080 -s secrethitler; sleep 1; done

## Tests ## (not needed really unless you want to configure or look at different details...)

> npm test

## License and Attribution ##

Secret Hitler is designed by Max Temkin (Cards Against Humanity, Humans vs. Zombies) Mike Boxleiter (Solipskier, TouchTone), Tommy Maranges (Philosophy Bro) and illustrated by Mackenzie Schubert (Letter Tycoon, Penny Press).

This game is licensed as per the [Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International](https://creativecommons.org/licenses/by-nc-sa/4.0/) license.

## Alterations to the original game ##

Minor image alterations and editing (from scans, assets available upon request).

Veto power is slightly adjusted so that chancellors need to select a policy prior to saying yes or no to vetoing that policy.

Adapted the rules explanation to account for online vs physical play.
