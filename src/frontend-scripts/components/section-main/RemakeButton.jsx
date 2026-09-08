import React from "react";
import PropTypes from "prop-types";

// The "vote to remake" control (the repeat / cancel-tournament icon). Extracted from
// Tracks so the flappy end screen can show it too: a flappy-decided game keeps
// phase === "flappyHitler", so Game.jsx renders <Flappy> (not <Tracks>) as the final
// board. This button previously lived only in Tracks, so flappy-ended games had no way
// to vote a remake. Self-contained (own remakeStatus state + updateRemakeVoting
// subscription) so both boards render an identical button; only one is ever mounted at a
// time (Game.jsx picks Tracks XOR Flappy), so there is no double subscription.
class RemakeButton extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      remakeStatus: Boolean(props.gameInfo && props.gameInfo.remakeStatus),
    };
  }

  componentDidMount() {
    const { socket } = this.props;

    if (socket) {
      // kept on the instance so componentWillUnmount removes THIS handler specifically -
      // a bare socket.off("updateRemakeVoting") would drop every listener for the event,
      // and this component mounts/unmounts as the board flips between Tracks and Flappy
      this.onRemakeVoting = (status) => {
        this.setState({ remakeStatus: status });
      };
      socket.on("updateRemakeVoting", this.onRemakeVoting);
    }
  }

  componentWillUnmount() {
    const { socket } = this.props;

    if (socket && this.onRemakeVoting) {
      socket.removeListener("updateRemakeVoting", this.onRemakeVoting);
    }
  }

  componentWillReceiveProps(nextProps) {
    const { gameInfo } = nextProps;

    if (!gameInfo || !gameInfo.gameState || !gameInfo.general) {
      return;
    }

    if (typeof gameInfo.remakeStatus === "boolean") {
      this.setState({ remakeStatus: gameInfo.remakeStatus });
    } else if (!gameInfo.gameState.isStarted || gameInfo.general.uid !== this.props.gameInfo?.general?.uid) {
      this.setState({ remakeStatus: false });
    }
  }

  render() {
    const { userInfo, gameInfo, socket } = this.props;

    // guard a partial payload from throwing into the error boundary before the visibility
    // conditions below dereference gameState/general
    if (!gameInfo || !gameInfo.gameState || !gameInfo.general) {
      return null;
    }

    const isTourny = gameInfo.general.isTourny;

    if (
      !(
        userInfo.userName &&
        userInfo.isSeated &&
        gameInfo.gameState.isTracksFlipped &&
        !gameInfo.general.isRemade &&
        !(isTourny && gameInfo.general.tournyInfo.round === 2)
      )
    ) {
      return null;
    }

    const updateRemake = () => {
      socket.emit("updateRemake", {
        remakeStatus: !this.state.remakeStatus,
        uid: gameInfo.general.uid,
      });
    };

    return (
      <i
        className={
          isTourny && gameInfo.general.tournyInfo.round === 1
            ? `remove icon ${this.state.remakeStatus ? "enabled" : ""}`
            : `icon repeat ${this.state.remakeStatus ? "enabled" : ""}`
        }
        onClick={updateRemake}
        title={
          isTourny
            ? "Enable this button to show that you would like to cancel this tournament"
            : "Enable this button to show that you would like to remake this game"
        }
      />
    );
  }
}

RemakeButton.propTypes = {
  userInfo: PropTypes.object,
  gameInfo: PropTypes.object,
  socket: PropTypes.object,
};

export default RemakeButton;
