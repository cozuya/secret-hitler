import React from 'react'; // eslint-disable-line
import { connect } from 'react-redux';
import { updateMidsection, viewPatchNotes } from '../../actions/actions';
import fetch from 'isomorphic-fetch';
import PropTypes from 'prop-types';

const mapStateToProps = ({ version }) => ({ version });

const mapDispatchToProps = dispatch => ({
	readPatchNotes: () => {
		dispatch(updateMidsection('changelog'));
		dispatch(viewPatchNotes());
		fetch('/viewPatchNotes', {
			credentials: 'same-origin'
		});
	}
});

const PatchAlert = ({ isActive, onClick }) => {
	if (isActive) {
		return <div className="patch-alert" onClick={onClick} />;
	} else {
		return null;
	}
};

const Defaultmid = ({ version, readPatchNotes, quickDefault }) =>
	<section className="defaultmid">
		<div className="callout">50,000+ games played!</div>
		<div className="poll">
			<a target="_blank" href="/polls">
				Check out our new polls page!
			</a>
		</div>
		<PatchAlert isActive={version.lastSeen && version.current.number !== version.lastSeen} onClick={readPatchNotes} />
		<img src="images/lizard23.png" alt="Secret Hitler logo" width="400" height="400" />
		<p>
			<span>{`sh.io version ${version.current.number} "${version.current.color}" released ${version.current.date} | `}</span>
			<span>
				<a onClick={readPatchNotes}>changelog</a> |{' '}
				<a target="_blank" href="https://github.com/cozuya/secret-hitler/issues">
					open issues and upcoming features
				</a>{' '}
				|{' '}
				<a
					target="_blank"
					style={{ color: 'brown' }}
					href="https://docs.google.com/forms/d/e/1FAIpQLSf_pq4xipbxyb8s84eGaazK0itPZmdKSTvMAH9eIHj2hyz0BQ/viewform?c=0&w=1&usp=send_form"
				>
					bug and feedback form
				</a>{' '}
				|{' '}
				<a target="_blank" style={{ fontWeight: 'bold', color: '#fff' }} href="https://discord.gg/FXDxP2m">
					discord
				</a>
			</span>
		</p>
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
	</section>;

Defaultmid.propTypes = {
	quickDefault: PropTypes.func
};

export default connect(mapStateToProps, mapDispatchToProps)(Defaultmid);
