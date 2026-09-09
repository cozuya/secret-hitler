import React from "react";
import moment from "moment";

class Leaderboard extends React.Component {
  constructor() {
    super();

    this.state = {
      seasonalLeaderboardElo: [],
      seasonalLeaderboardXP: [],
      dailyLeaderboardElo: [],
      dailyLeaderboardXP: [],
      rainbowLeaderboard: [],
      loading: true,
      updatedAt: null,
      status: null,
    };
  }

  componentDidMount() {
    this.loadLeaderboard();
  }

  loadLeaderboard = () => {
    this.setState({ loading: true, errored: false });
    return fetch("/leaderboardData.json", { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error(`Leaderboard request failed (${res.status})`);
        return res.json();
      })
      .then((data) => {
        this.setState({
          seasonalLeaderboardElo: data.seasonalLeaderboardElo || [],
          seasonalLeaderboardXP: data.seasonalLeaderboardXP || [],
          dailyLeaderboardElo: data.dailyLeaderboardElo || [],
          dailyLeaderboardXP: data.dailyLeaderboardXP || [],
          rainbowLeaderboard: data.rainbowLeaderboard || [],
          updatedAt: data.updatedAt || null,
          status: data.status || null,
          errored: data.status === "unavailable",
          loading: false,
        });
      })
      .catch((e) => {
        console.log("Error in Getting Current Leaderboard", e);
        this.setState({
          errored: true,
          loading: false,
        });
      });
  };

  render() {
    // Show the boards if ANY of them has data — early in a season seasonalLeaderboardElo can be
    // empty while the daily/XP/rainbow boards are populated (master guarded on the combined set).
    const hasLeaderboardData =
      this.state.seasonalLeaderboardElo.length ||
      this.state.seasonalLeaderboardXP.length ||
      this.state.dailyLeaderboardElo.length ||
      this.state.dailyLeaderboardXP.length ||
      this.state.rainbowLeaderboard.length;
    const updatedAt = this.state.updatedAt && moment(this.state.updatedAt);
    const hasUpdateTime = updatedAt && updatedAt.isValid();
    return (
      <section className="leaderboards">
        <a href="#/">
          <i className="remove icon" style={{ marginTop: "30px" }} />
        </a>
        {hasUpdateTime && (
          <p className="leaderboard-updated" role="status">
            Last updated{" "}
            <time dateTime={updatedAt.toISOString()} title={updatedAt.format("LLLL")}>
              {updatedAt.fromNow()}
            </time>
            . Standings refresh daily.
            {moment().diff(updatedAt, "hours", true) > 36 && " These standings are waiting for a fresh update."}
          </p>
        )}
        {this.state.loading ? (
          <p role="status">Loading leaderboards...</p>
        ) : hasLeaderboardData && !this.state.errored ? (
          <>
            <div className="ui grid">
              <div className="eight wide column">
                {this.state.seasonalLeaderboardElo.length > 0 && (
                  <>
                    <h2 className="ui header">Seasonal Elo leaders</h2>
                    <ul>
                      {this.state.seasonalLeaderboardElo.map((user) => (
                        <li key={user.userName}>
                          <p>
                            <a href={`#/profile/${user.userName}`}>{user.userName}</a>
                          </p>
                          <p>{user.elo.toFixed(0)}</p>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
              <div className="eight wide column">
                {this.state.dailyLeaderboardElo.length > 0 && (
                  <>
                    <h2 className="ui header">Daily Elo leaders</h2>
                    <ul>
                      {this.state.dailyLeaderboardElo.map(
                        (user) =>
                          user.dailyEloDifference.toFixed(0) >= 0 && (
                            <li key={user.userName}>
                              <p>
                                <a href={`#/profile/${user.userName}`}>{user.userName}</a>
                              </p>
                              <p>+{user.dailyEloDifference.toFixed(0)}</p>
                            </li>
                          )
                      )}
                    </ul>
                  </>
                )}
              </div>
            </div>
            <div className="ui grid">
              <div className="eight wide column">
                {this.state.seasonalLeaderboardXP.length > 0 && (
                  <>
                    <h2 className="ui header">Seasonal XP leaders</h2>
                    <ul>
                      {this.state.seasonalLeaderboardXP.map((user) => (
                        <li key={user.userName}>
                          <p>
                            <a href={`#/profile/${user.userName}`}>{user.userName}</a>
                          </p>
                          <p>{user.xp.toFixed(0)}</p>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
              <div className="eight wide column">
                {this.state.dailyLeaderboardXP.length > 0 && (
                  <>
                    <h2 className="ui header">Daily XP leaders</h2>
                    <ul>
                      {this.state.dailyLeaderboardXP.map(
                        (user) =>
                          user.dailyXPDifference.toFixed(0) >= 0 && (
                            <li key={user.userName}>
                              <p>
                                <a href={`#/profile/${user.userName}`}>{user.userName}</a>
                              </p>
                              <p>+{user.dailyXPDifference.toFixed(0)}</p>
                            </li>
                          )
                      )}
                    </ul>
                  </>
                )}
              </div>
            </div>
            <div className="ui grid">
              <div className="eight wide column">
                {this.state.rainbowLeaderboard.length > 0 && (
                  <>
                    <h2 className="ui header">Most recent rainbow players</h2>
                    <ul>
                      {this.state.rainbowLeaderboard.map((user) => (
                        <li key={user.userName}>
                          <p>
                            <a href={`#/profile/${user.userName}`}>{user.userName}</a>
                          </p>
                          <p>{moment(user.date).format("DD-MM-YYYY")}</p>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </div>
          </>
        ) : this.state.errored ? (
          <div role="alert">
            <h2 className="ui header">Leaderboards are temporarily unavailable</h2>
            <button className="ui button" onClick={this.loadLeaderboard}>
              Try again
            </button>
          </div>
        ) : (
          <>
            <h2 className="ui header">No leaderboard results yet</h2>
            <p>
              {this.state.status === "pending"
                ? "Standings have not been published yet."
                : "Standings appear after the next daily update when players qualify."}
            </p>
          </>
        )}
      </section>
    );
  }
}

export default Leaderboard;
