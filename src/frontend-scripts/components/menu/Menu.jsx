import React from "react";
import { connect } from "react-redux";
import PropTypes from "prop-types";
import { viewPatchNotes } from "../../actions/actions";
import { Popup } from "semantic-ui-react";

const mapStateToProps = ({ version }) => ({ version });

const mapDispatchToProps = (dispatch) => ({
  readPatchNotes: () => {
    dispatch(viewPatchNotes());
    fetch("/viewPatchNotes", {
      credentials: "same-origin",
    });
    window.location.hash = "#/changelog";
  },
});

class Menu extends React.Component {
  constructor() {
    super();
  }

  render() {
    let classes = "ui menu nav-menu";
    const { userInfo } = this.props;

    if (this.props.midSection === "game") {
      classes += " game";
    }

    if (userInfo && userInfo.gameSettings && userInfo.gameSettings.safeForWork) {
      window.document.title = "SH.io";
    }

    return (
      <div>
        <div className="menu-container" style={{ zIndex: 9999 }}>
          <section className={classes}>
            <a href="/">
              {userInfo && userInfo.gameSettings && userInfo.gameSettings.safeForWork ? "SH.io" : "SECRET HITLER.io"}
            </a>
            <div className="center-menu-links">
              <span>
                <a style={{ textDecoration: "none" }} target="_blank" href="/tou">
                  Site Rules
                </a>{" "}
                |{" "}
                <a rel="noopener noreferrer" target="_blank" href="https://github.com/cozuya/secret-hitler/wiki">
                  Wiki
                </a>{" "}
                |{" "}
                <a rel="noopener noreferrer" target="_blank" href="https://discord.gg/secrethitlerio">
                  Discord
                </a>
              </span>
            </div>
            <div className="item right menu">
              {(() => {
                const { gameInfo, userInfo } = this.props;

                /**
                 * @return {string} classnames
                 */
                const iconClasses = () => {
                  let classes = "setting icon large";

                  if (gameInfo.gameState && gameInfo.gameState.isStarted && !gameInfo.gameState.isCompleted) {
                    classes += " disabled";
                  }

                  return classes;
                };

                return !userInfo.userName ? (
                  <div className="ui buttons">
                    <div className="ui button" id="signin">
                      Log in
                    </div>
                    <div className="or" />
                    <div className="ui button" id="signup">
                      Sign up
                    </div>
                  </div>
                ) : (
                  <div>
                    <Popup
                      inverted
                      className="loggedin"
                      trigger={
                        <a href={`#/profile/${userInfo.userName}`}>
                          <span
                            className="playername"
                            style={
                              userInfo.gameSettings && userInfo.gameSettings.hasUnseenBadge
                                ? { textShadow: "2px 2px 8px var(--theme-text-1)" }
                                : {}
                            }
                          >
                            {userInfo.userName}
                          </span>
                        </a>
                      }
                      content={userInfo.gameSettings && userInfo.gameSettings.hasUnseenBadge ? "New badges" : "Profile"}
                    />
                    <Popup
                      inverted
                      className="settings-popup"
                      trigger={
                        <a href="#/settings">
                          <i className={iconClasses()} />
                        </a>
                      }
                      content="Settings"
                    />
                  </div>
                );
              })()}
              {this.props.userInfo.userName && (
                <div className="item right">
                  <a className="ui button" href="/logout">
                    Logout
                  </a>
                </div>
              )}
            </div>
          </section>
        </div>
        <div className="menu-container-mobile" style={{ zIndex: 9999 }}>
          <section className="nav-menu">
            <div className="center-menu-links">
              <span>
                <a style={{ textDecoration: "none" }} target="_blank" href="/tou">
                  Site Rules
                </a>
                |{" "}
                <a rel="noopener noreferrer" target="_blank" href="https://github.com/cozuya/secret-hitler/wiki">
                  Wiki
                </a>{" "}
                |{" "}
                <a rel="noopener noreferrer" target="_blank" href="https://discord.gg/secrethitlerio">
                  Discord
                </a>
              </span>
            </div>
          </section>
        </div>
        <div className="menu-container-mobile" style={{ zIndex: 9999 }}>
          <section className={classes}>
            <div className="item left menu">
              {(() => {
                const { gameInfo, userInfo } = this.props;

                /**
                 * @return {string} classnames
                 */
                const iconClasses = () => {
                  let classes = "setting icon large";

                  if (gameInfo.gameState && gameInfo.gameState.isStarted && !gameInfo.gameState.isCompleted) {
                    classes += " disabled";
                  }

                  return classes;
                };

                return !userInfo.userName ? (
                  <div className="ui buttons">
                    <div className="ui button" id="signin">
                      Log in
                    </div>
                    <div className="or" />
                    <div className="ui button" id="signup">
                      Sign up
                    </div>
                  </div>
                ) : (
                  <div>
                    <Popup
                      inverted
                      className="loggedin"
                      trigger={
                        <a href={`#/profile/${userInfo.userName}`}>
                          <span
                            className="playername"
                            style={
                              userInfo.gameSettings && userInfo.gameSettings.hasUnseenBadge
                                ? { textShadow: "2px 2px 8px var(--theme-text-1)" }
                                : {}
                            }
                          >
                            {userInfo.userName}
                          </span>
                        </a>
                      }
                      content={userInfo.gameSettings && userInfo.gameSettings.hasUnseenBadge ? "New badges" : "Profile"}
                    />
                    <Popup
                      inverted
                      className="settings-popup"
                      trigger={
                        <a href="#/settings">
                          <i className={iconClasses()} />
                        </a>
                      }
                      content="Settings"
                    />
                  </div>
                );
              })()}
              {this.props.userInfo.userName && (
                <div className="item right">
                  <a className="ui button" href="/logout">
                    Logout
                  </a>
                </div>
              )}
            </div>
            <div className="item right menu">
              <button className="ui button floating primary button" id="chatsidebar">
                Chat
              </button>
            </div>
          </section>
        </div>
      </div>
    );
  }
}

Menu.propTypes = {
  userInfo: PropTypes.object,
  gameInfo: PropTypes.object,
  midSection: PropTypes.string,
  version: PropTypes.object,
  readPatchNotes: PropTypes.func,
};

export default connect(mapStateToProps, mapDispatchToProps)(Menu);
