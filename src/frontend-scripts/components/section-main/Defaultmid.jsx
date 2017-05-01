import React from 'react';

export default class Defaultmid extends React.Component {
	render() {
		return (
			<section className="defaultmid">
				<img src="images/lizard4.png" alt="Secret Hitler logo" style={{position: 'absolute', left: '50%', marginLeft: '-200px', top: '140px'}} width="400" height="400" />
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
				<button style={{padding: '5px', width: '80px'}} data-name="hhh" className="loginquick">hhh</button>
			</section>
		);
	}
}

Defaultmid.propTypes = {
	quickDefault: React.PropTypes.func
};