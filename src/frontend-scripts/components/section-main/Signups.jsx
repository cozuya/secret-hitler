import React, { useEffect, useState } from 'react';
import moment from 'moment';
import PropTypes from 'prop-types';
import * as Swal from 'sweetalert2';

let signupType = 'getSignups';

const Signups = ({ socket }) => {
	const [signuplog, updateSignuplog] = useState([]);
	const [logSort, updateLogSort] = useState({ type: 'date', direction: 'descending' });
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
		const clickSort = type => {
			updateLogSort({
				type,
				direction: logSort.direction === 'descending' && type === logSort.type ? 'ascending' : 'descending'
			});
		};

		return (
			<div>
				<h2 style={{ textAlign: 'center' }}>
					{signupType === 'getSignups' ? 'Successful Signups' : signupType === 'getAllSignups' ? 'Failed Signups' : 'Private Signups'}
				</h2>
				<table className="ui celled table" style={{ background: 'gainsboro' }}>
					<thead>
						<tr>
							<th
								style={{ whiteSpace: 'nowrap' }}
								onClick={() => {
									clickSort('date');
								}}
							>
								Date {logSort.type === 'date' && <i className={logSort.direction === 'descending' ? 'angle down icon' : 'angle up icon'} />}
							</th>
							<th
								style={{ whiteSpace: 'nowrap' }}
								onClick={() => {
									clickSort('userName');
								}}
							>
								Username {logSort.type === 'userName' && <i className={logSort.direction === 'descending' ? 'angle down icon' : 'angle up icon'} />}
							</th>
							<th
								style={{ whiteSpace: 'nowrap' }}
								onClick={() => {
									clickSort('ip');
								}}
							>
								IP {logSort.type === 'ip' && <i className={logSort.direction === 'descending' ? 'angle down icon' : 'angle up icon'} />}
							</th>
							<th
								style={{ whiteSpace: 'nowrap' }}
								onClick={() => {
									clickSort('type');
								}}
							>
								Type {logSort.type === 'type' && <i className={logSort.direction === 'descending' ? 'angle down icon' : 'angle up icon'} />}
							</th>
							<th
								style={{ whiteSpace: 'nowrap' }}
								onClick={() => {
									clickSort('email');
								}}
							>
								Email {logSort.type === 'email' && <i className={logSort.direction === 'descending' ? 'angle down icon' : 'angle up icon'} />}
							</th>
						</tr>
					</thead>
					<tbody>
						{signuplog
							.sort((a, b) => {
								const aDate = new Date(a.date);
								const bDate = new Date(b.date);

								if (logSort.type === 'date') {
									if (logSort.direction === 'descending') {
										return aDate > bDate ? -1 : 1;
									}
									return aDate > bDate ? 1 : -1;
								} else {
									if (logSort.direction === 'descending') {
										if (a[logSort.type] === b[logSort.type]) {
											return aDate > bDate ? -1 : 1;
										}
										return a[logSort.type] > b[logSort.type] ? -1 : 1;
									}

									if (a[logSort.type] === b[logSort.type]) {
										return aDate > bDate ? 1 : -1;
									}
									return a[logSort.type] > b[logSort.type] ? 1 : -1;
								}
							})
							.map((report, index) => (
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
