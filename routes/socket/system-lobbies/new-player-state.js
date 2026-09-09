// Keep these helpers independent of the manager's IO/database imports so broadcast code can use them.
const isNewPlayerLobby = (game) => game?.general?.systemLobby === "new-player";

// Countdown still owns intake; completed/started cohorts must retain ordinary teardown behavior.
const shouldSurviveEmptyPregame = (game) =>
  isNewPlayerLobby(game) && !game.gameState.isTracksFlipped && !game.gameState.isCompleted;

const trimNewPlayerLobbyChats = (game) => {
  // Intake can live indefinitely. Bound stored history before broadcasts, including command output.
  if (shouldSurviveEmptyPregame(game) && game.chats.length > 100) {
    game.chats = game.chats.slice(-100);
  }
};

module.exports = { isNewPlayerLobby, shouldSurviveEmptyPregame, trimNewPlayerLobbyChats };
