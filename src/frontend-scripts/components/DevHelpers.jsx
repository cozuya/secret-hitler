import React from 'react';

export default class DevHelpers extends React.PureComponent {
	constructor() {
		super();
	}

	// need to fix default game button

	render() {
		return (
			<section style={{ display: 'flex', maxWidth: '95%', margin: 'auto' }}>
				<br />
				<button style={{ padding: '5px', background: '#333', color: 'white' }} data-name="h" onClick={quickDefault}>
					default game
				</button>
				<br />
				<button style={{ padding: '5px', width: '80px', color: 'black' }} data-name="Uther" className="loginquick">
					Uther
				</button>
				<br />
				<button style={{ padding: '5px', width: '80px', color: 'black' }} data-name="Jaina" className="loginquick">
					Jaina
				</button>
				<br />
				<button style={{ padding: '5px', width: '80px', color: 'black' }} data-name="Rexxar" className="loginquick">
					Rexxar
				</button>
				<br />
				<button style={{ padding: '5px', width: '80px', color: 'black' }} data-name="Malfurian" className="loginquick">
					Malfurian
				</button>
				<br />
				<button style={{ padding: '5px', width: '80px', color: 'black' }} data-name="Thrall" className="loginquick">
					Thrall
				</button>
				<br />
				<button style={{ padding: '5px', width: '80px', color: 'black' }} data-name="Valeera" className="loginquick">
					Valeera
				</button>
				<br />
				<button style={{ padding: '5px', width: '80px', color: 'black' }} data-name="Anduin" className="loginquick">
					Anduin
				</button>
				<br />
				<button style={{ padding: '5px', width: '80px', color: 'black' }} data-name="aaa" className="loginquick">
					aaa
				</button>
				<br />
				<button style={{ padding: '5px', width: '80px', color: 'black' }} data-name="bbb" className="loginquick">
					bbb
				</button>
				<br />
				<button style={{ padding: '5px', width: '80px', color: 'black' }} data-name="ccc" className="loginquick">
					ccc
				</button>
				<br />
				<button style={{ padding: '5px', width: '80px', color: 'black' }} data-name="ddd" className="loginquick">
					ddd
				</button>
				<br />
				<button style={{ padding: '5px', width: '80px', color: 'black' }} data-name="eee" className="loginquick">
					eee
				</button>
				<br />
				<button style={{ padding: '5px', width: '80px', color: 'black' }} data-name="fff" className="loginquick">
					fff
				</button>
				<br />
				<button style={{ padding: '5px', width: '80px', color: 'black' }} data-name="ggg" className="loginquick">
					ggg
				</button>
				<br />
				<button style={{ padding: '5px', width: '80px', color: 'black' }} data-name="hhh" className="loginquick">
					hhh
				</button>
			</section>
		);
	}
}
