import React from 'react'; // eslint-disable-line
import { connect } from 'react-redux';
import { viewPatchNotes } from '../../actions/actions';
import fetch from 'isomorphic-fetch';
import PropTypes from 'prop-types';

const mapStateToProps = ({ version, userInfo }) => ({ version, userInfo });

const mapDispatchToProps = dispatch => ({
	readPatchNotes: () => {
		dispatch(viewPatchNotes());
		fetch('/viewPatchNotes', {
			credentials: 'same-origin'
		});
		window.location.hash = '#/changelog';
	}
});

const PatchAlert = ({ isActive, onClick }) => (isActive ? <div className="patch-alert" onClick={onClick} /> : null);
const Defaultmid = ({ version, readPatchNotes, quickDefault, userInfo }) => (
	<section className="defaultmid">
		<PatchAlert isActive={version.lastSeen && version.current.number !== version.lastSeen} onClick={readPatchNotes} />
		<img src="/images/lizard29.png" alt="Secret Hitler log" width="400" height="400" />
		<p>
			<span>{`sh.io version ${version.current.number} "${version.current.color}" released ${version.current.date} | `}</span>
			<span>
				<a onClick={readPatchNotes}> changelog </a>|{' '}
				<a target="_blank" href="https://github.com/cozuya/secret-hitler/issues">
					open issues and upcoming features
				</a>{' '}
				|{' '}
				<a target="_blank" style={{ color: 'lightgreen' }} href="https://github.com/cozuya/secret-hitler/wiki">
					wiki page
				</a>{' '}
				|{' '}
				<a target="_blank" style={{ fontWeight: 'bold', color: '#fff' }} href="https://discord.gg/FXDxP2m">
					discord server
				</a>
			</span>
		</p>
		<div className="defaults">
			<br />
			<button style={{ padding: '5px', background: '#333', color: 'white' }} data-name="h" onClick={quickDefault}>
				default game
			</button>
			<br />
			<button style={{ padding: '5px', width: '80px' }} data-name="Uther" className="loginquick">
				Uther
			</button>
			<br />
			<button style={{ padding: '5px', width: '80px' }} data-name="Jaina" className="loginquick">
				Jaina
			</button>
			<br />
			<button style={{ padding: '5px', width: '80px' }} data-name="Rexxar" className="loginquick">
				Rexxar
			</button>
			<br />
			<button style={{ padding: '5px', width: '80px' }} data-name="Malfurian" className="loginquick">
				Malfurian
			</button>
			<br />
			<button style={{ padding: '5px', width: '80px' }} data-name="Thrall" className="loginquick">
				Thrall
			</button>
			<br />
			<button style={{ padding: '5px', width: '80px' }} data-name="Valeera" className="loginquick">
				Valeera
			</button>
			<br />
			<button style={{ padding: '5px', width: '80px' }} data-name="Anduin" className="loginquick">
				Anduin
			</button>
			<br />
			<button style={{ padding: '5px', width: '80px' }} data-name="aaa" className="loginquick">
				aaa
			</button>
			<br />
			<button style={{ padding: '5px', width: '80px' }} data-name="bbb" className="loginquick">
				bbb
			</button>
			<br />
			<button style={{ padding: '5px', width: '80px' }} data-name="ccc" className="loginquick">
				ccc
			</button>
			<br />
			<button style={{ padding: '5px', width: '80px' }} data-name="ddd" className="loginquick">
				ddd
			</button>
			<br />
			<button style={{ padding: '5px', width: '80px' }} data-name="eee" className="loginquick">
				eee
			</button>
			<br />
			<button style={{ padding: '5px', width: '80px' }} data-name="fff" className="loginquick">
				fff
			</button>
			<br />
			<button style={{ padding: '5px', width: '80px' }} data-name="ggg" className="loginquick">
				ggg
			</button>
			<br />
			<button style={{ padding: '5px', width: '80px' }} data-name="hhh" className="loginquick">
				hhh
			</button>
		</div>
	</section>
);

Defaultmid.propTypes = {
	quickDefault: PropTypes.func
};

export default connect(mapStateToProps, mapDispatchToProps)(Defaultmid);
