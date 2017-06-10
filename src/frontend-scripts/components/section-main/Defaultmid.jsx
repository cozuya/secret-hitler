import React from 'react';

export default class Defaultmid extends React.Component {
	constructor() {
		super();
		this.changelogClicked = this.changelogClicked.bind(this);
	}

	changelogClicked(e) {
		e.preventDefault();
		this.props.onChangelogButtonClick('changelog');
	}

	render() {
		return (
			<section className="defaultmid">
				<img src="images/lizard15.png" alt="Secret Hitler logo" width="400" height="400" />
				<p>sh.io version 0.5.0 "glow" released 6/10/2017 | <a onClick={this.changelogClicked}>changelog</a> | <a target="_blank" href="https://github.com/cozuya/secret-hitler/issues">open issues and upcoming features</a> | <a target="_blank" href="https://docs.google.com/forms/d/e/1FAIpQLSf_pq4xipbxyb8s84eGaazK0itPZmdKSTvMAH9eIHj2hyz0BQ/viewform?c=0&w=1&usp=send_form">bug/feedback/report abuse form</a></p>
				<br />
				<button style={{padding: '5px', background: '#333', color: 'white'}} data-name="h" onClick={this.props.quickDefault}>default game</button>
				<br />
				<button style={{padding: '5px', width: '80px'}} data-name="Uther" className="loginquick">Uther</button>
				<br />
				<button style={{padding: '5px', width: '80px'}} data-name="Jaina" className="loginquick">Jaina</button>
				<br />
				<button style={{padding: '5px', width: '80px'}} data-name="Rexxar" className="loginquick">Rexxar</button>
				<br />
				<button style={{padding: '5px', width: '80px'}} data-name="Malfurian" className="loginquick">Malfurian</button>
				<br />
				<button style={{padding: '5px', width: '80px'}} data-name="Thrall" className="loginquick">Thrall</button>
				<br />
				<button style={{padding: '5px', width: '80px'}} data-name="Valeera" className="loginquick">Valeera</button>
				<br />
				<button style={{padding: '5px', width: '80px'}} data-name="Anduin" className="loginquick">Anduin</button>
				<br />
				<button style={{padding: '5px', width: '80px'}} data-name="aaa" className="loginquick">aaa</button>
				<br />
				<button style={{padding: '5px', width: '80px'}} data-name="bbb" className="loginquick">bbb</button>
				<br />
				<button style={{padding: '5px', width: '80px'}} data-name="ccc" className="loginquick">ccc</button>
				<br />
				<button style={{padding: '5px', width: '80px'}} data-name="ddd" className="loginquick">ddd</button>
				<br />
				<button style={{padding: '5px', width: '80px'}} data-name="eee" className="loginquick">eee</button>
				<br />
				<button style={{padding: '5px', width: '80px'}} data-name="fff" className="loginquick">fff</button>
				<br />
				<button style={{padding: '5px', width: '80px'}} data-name="ggg" className="loginquick">ggg</button>
				<br />
				<button style={{padding: '5px', width: '80px'}} data-name="coz" className="loginquick">coz</button>
			</section>
		);
	}
}

Defaultmid.propTypes = {
	quickDefault: React.PropTypes.func
};