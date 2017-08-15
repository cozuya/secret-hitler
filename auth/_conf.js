var ids = {
  google: {
    clientID: 'get your own',
    clientSecret: 'get your own',
    callbackURL: "http://127.0.0.1:8080/auth/google/callback"
  },
  reddit: {
    clientID: 'get your own',
    clientSecret: 'get your own',
    callbackURL: "http://127.0.0.1:8080/auth/reddit/callback"
  },
  tumblr: {
    consumerKey: 'get your own',
    consumerSecret: 'get your own',
    callbackURL: "http://127.0.0.1:8080/auth/tumblr/callback"
  },
  discord: { //you can set up your app for production at https://discordapp.com/developers/applications/me
    clientID: '335815850194108416',
    clientSecret: 'Xbc41_X4RikjKZZ7kgj3lEyfG2eRcP_h',
    callbackURL: "http://127.0.0.1:8080/auth/discord/callback" //this has to match the callback url set up in discord.
  },
  twitter: {
    consumerKey: 'get your own',
    consumerSecret: 'get your own',
    callbackURL: 'http://127.0.0.1:8080/auth/twitter/callback'
  }
};

module.exports = ids;