import React, { useEffect, useState } from 'react';
import moment from 'moment';
import PropTypes from 'prop-types';
import * as Swal from 'sweetalert2';

let signupType = 'getSignups';

const Signups = ({ socket }) => {
	const [signuplog, updateSignuplog] = useState([]);
	useEffect(() => {
		socket.emit(signupType);

		const timerId = setInterval(() => {
			socket.emit(signupType);
		}, 10000);

		socket.on('signupsInfo', info => {
			updateSignuplog(info);
		});

		return () => {
			socket.off('signupsInfo');
			clearInterval(timerId);
		};
	}, []);

	const renderSignupsLog = () => {
		return (
			<div>
				<h2 style={{ textAlign: 'center' }}>
					{signupType === 'getSignups' ? 'Successful Signups' : signupType === 'getAllSignups' ? 'Failed Signups' : 'Private Signups'}
				</h2>
				<table className="ui celled table" style={{ background: 'gainsboro' }}>
					<thead>
						<tr>
							<th>Date</th>
							<th>Username</th>
							<th>IP</th>
							<th>Type</th>
							<th>Email</th>
						</tr>
					</thead>
					<tbody>
						{signuplog.map((report, index) => (
							<tr key={index}>
								<td>{moment(new Date(report.date)).format('YYYY-MM-DD HH:mm')}</td>
								<td>{report.userName}</td>
								<td>{report.ip}</td>
								<td>{report.type}</td>
								<td
									onClick={() => {
										if (report.email.indexOf('#') !== -1) {
											Swal.fire('Discord ID: ' + report.oauthID);
										}
									}}
									style={{ cursor: `${report.email.indexOf('#') !== -1 ? 'pointer' : ''}` }}
								>
									{report.email}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		);
	};

	return (
		<section>
			<a href="#/">
				<i
					className="remove icon"
					style={{
						position: 'absolute',
						top: '10px',
						right: '10px'
					}}
				/>
			</a>
			<span
				onClick={() => {
					signupType = signupType === 'getSignups' ? 'getAllSignups' : signupType === 'getAllSignups' ? 'getPrivateSignups' : 'getSignups';
					socket.emit(signupType);
				}}
				style={{
					position: 'absolute',
					color: 'lightblue',
					userSelect: 'none',
					WebkitUserSelect: 'none',
					MsUserSelect: 'none',
					textDecoration: 'underline',
					left: '0',
					top: '10px',
					cursor: 'pointer'
				}}
			>
				Toggle Signup Type
			</span>
			{renderSignupsLog()}
		</section>
	);
};

Signups.propTypes = {
	socket: PropTypes.object
};

export default Signups;
