# Contributing to Secret Hitler
Written by Paladin of Ioun.

Welcome! This is a guide intended for people with none of the required tools installed or have little to no experience with Git and GitHub. This guide has steps for Windows and Linux development (because I don't have a Mac). 

## Intro
Before we start, let's go over formatting. `code` represents some code you have to run, usually in your terminal.

## Step 1: Required Tools.
Make sure to install everything in order (except possibly mongodb) because everything requires the previous thing to be installed.
### 1. NodeJS and npm
The first (and most important) tool you need is NodeJS. This is the programming language the site uses, so it's pretty important you have it installed correctly.
#### Windows Installation
Go to the [NodeJS website](https://nodejs.org/en/). You should see two green buttons to download. Download the LTS version (12.18.2 at the time of writing). **Important**: when installing, make sure to select to install `npm` as well.

#### Linux Installation
To install NodeJS, you should have a package called `node` or `nodejs` in your repository. Similarly, you should install `npm` or `node-npm`. The exact package name varies from distribution to distribution.

### 2. yarn
On any operating system, open a terminal (Command Prompt on Windows) and run `npm install -g yarn`.

### 3. mongodb
#### Windows Installation
Follow the instructions [here.](https://docs.mongodb.com/manual/tutorial/install-mongodb-on-windows/)
#### Linux Installation
Follow the instructions [here.](https://docs.mongodb.com/manual/tutorial/install-mongodb-on-linux/) For a distribution like Arch or Manjaro, you can find a prebuilt binary in the `community` library instead of building it yourself.

### 4. git
#### Windows Installation
Download it [here.](https://git-scm.com/downloads) The default options are usually acceptable.
#### Linux Installation
You should have a package called `git` in your repositories. It is almost certainly pre-installed though.

### 5. Finish up
If your computer ever asks you to reboot, do so now.

## Step 2: Fork the project.
Now comes the fun part. If you don't have a [GitHub](https://github.com) account, make one now. Go to [the GitHub repository](https://github.com/cozuya/secret-hitler/) and click ![Fork](https://i.ibb.co/NF79Vt9/fork.png). This creates a copy of the code that you can edit. Then, GitHub should take you to the fork. Now, once you are on a fork, click ![enter image description here](https://i.ibb.co/pvJPbq5/branch.png). A box should appear with an option to type in a new branch name. You can name it whatever you want, but it's recommended to name it something like "YourGithubName-patch1" or something more descriptive of what you are adding. For example, "TestAccount-patch1" or "TestAccount-fixing-timer" is good. "patch" or "my-branch" is bad. 

## Step 3: Clone your branch.
For this step, you need the URL of your fork and the name of your branch. Find the directory where you want to store the source code of the game. Then, open a terminal to that directory. Run `git clone <your fork url> -b <your branch name>`. For example, I might run `git clone https://github.com/TestAccount/secret-hitler -b TestAccount-patch1`. 

## Step 4: Install dependencies and run code.
Change directory into your clone (`cd secret-hitler` on all operating systems). Run `npm install` to install the dependencies. Then, run `yarn dev`. A bunch of lines of debug should output. Wait about 30 seconds, then open `localhost:8080` in your browser. The site should load! When entering the game lobby, you'll see a bunch of buttons to log in to testing accounts. The accounts don't exist yet, so, in another terminal, run `yarn create-accounts` in the same directory you ran `yarn dev`. If that works, run `yarn assign-local-mod`. Now, Uther is an admin and everything is working!

### Issues
If you get an issue like `yarn: command not found` when running `yarn dev`, make sure `yarn` is on your PATH. This is a pretty common issue with some Linux installations.

## Step 5: Make your changes!
I can't really help with this step, but now, you have all the code. 
## Step 6: Push to your branch.
Make sure you know what files you changed. For each file you changed (or the directory with all the files), run `git add <file>` (from any folder in the main folder of the code). Next, you want to explain what you did. Come up with a message. Usually a sentence or two is enough. **Important**: if you are fixing an issue, make sure to write "fixes \<issue link>". Then run `git commit -m "<your message>"`. Finally, run `git push`. 
## Step 7: Make a pull request!
This is the last step! Go to your branch on GitHub (if you never closed your fork on GitHub, you should be still on it). Go to https://github.com/cozuya/secret-hitler/compare/master...YOUR_GITHUB_NAME:master (replace "YOUR_GITHUB_NAME" with your actual GitHub username). If you did everything right, you can click ![enter image description here](https://i.ibb.co/LNw5pRm/create-pr.png). Fill out a name and description (remember to include "fixes \<issue link>" in the description if you fixed an issue). Click "Create Pull Request" and you're done!
