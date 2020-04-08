import React from 'react';
import moment from 'moment';
import PropTypes from 'prop-types';
import { Checkbox } from 'semantic-ui-react';

export default class Reports extends React.Component {
	constructor() {
		super();

		this.state = {
			reports: [],
			sortType: 'date',
			sortDirection: 'descending',
		};
	}

	componentDidMount() {
		this.props.socket.emit('getUserReports');

		this.props.socket.on('reportInfo', (reports) => {
			this.setState({
				reports,
			});
		});
	}

	componentWillUnmount() {
		this.props.socket.off('reportsInfo');
	}

	renderReportsLog() {
		const { sortType, sortDirection } = this.state;

		/**
		 * @param {string} type - description of how to sort the reports log
		 */
		const sortClick = (type) => {
			this.setState({
				sortType: type,
				sortDirection: sortDirection === 'descending' ? 'ascending' : 'descending',
			});
		};
		const activeClick = (report) => {
			this.props.socket.emit('updateModAction', {
				isReportResolveChange: true,
				_id: report._id,
			});
		};

		return (
			<div>
				<table className="ui celled table">
					<thead>
						<tr>
							<th
								onClick={() => {
									sortClick('date');
								}}
							>
								Date{' '}
								{sortType === 'date' && (
									<i className={sortDirection === 'descending' ? 'angle down icon' : 'angle up icon'} />
								)}
							</th>
							<th
								onClick={() => {
									sortClick('uid');
								}}
							>
								UID{' '}
								{sortType === 'uid' && (
									<i className={sortDirection === 'descending' ? 'angle down icon' : 'angle up icon'} />
								)}
							</th>
							<th
								onClick={() => {
									sortClick('userReported');
								}}
							>
								User Reported{' '}
								{sortType === 'userReported' && (
									<i className={sortDirection === 'descending' ? 'angle down icon' : 'angle up icon'} />
								)}
							</th>
							<th
								onClick={() => {
									sortClick('type');
								}}
							>
								Type{' '}
								{sortType === 'type' && (
									<i className={sortDirection === 'descending' ? 'angle down icon' : 'angle up icon'} />
								)}
							</th>
							<th
								onClick={() => {
									sortClick('comment');
								}}
							>
								Comment{' '}
								{sortType === 'comment' && (
									<i className={sortDirection === 'descending' ? 'angle down icon' : 'angle up icon'} />
								)}
							</th>
							<th
								onClick={() => {
									sortClick('reportingUser');
								}}
							>
								Reporting User{' '}
								{sortType === 'reportingUser' && (
									<i className={sortDirection === 'descending' ? 'angle down icon' : 'angle up icon'} />
								)}
							</th>
							<th>Game Type</th>
							<th>Resolved</th>
						</tr>
					</thead>
					<tbody>
						{this.state.reports
							.sort((a, b) => {
								const aDate = new Date(a.date);
								const bDate = new Date(b.date);

								if (sortType === 'date') {
									if (sortDirection === 'descending') {
										return aDate > bDate ? -1 : 1;
									}
									return aDate > bDate ? 1 : -1;
								} else {
									if (sortDirection === 'descending') {
										if (a[sortType] === b[sortType]) {
											return aDate > bDate ? -1 : 1;
										}
										return a[sortType] > b[sortType] ? -1 : 1;
									}

									if (a[sortType] === b[sortType]) {
										return aDate > bDate ? 1 : -1;
									}
									return a[sortType] > b[sortType] ? 1 : -1;
								}
							})
							.map((report, index) => (
								<tr key={index} style={{ background: report.isActive ? '#cdf9db' : '#708a78' }}>
									<td>{moment(new Date(report.date)).format('YYYY-MM-DD HH:mm')}</td>
									<td>
										<a href={`#/table/${report.gameUid}`} style={{ textDecoration: 'underline' }}>
											{report.gameUid.substr(0, 5)}
										</a>
									</td>
									<td>{report.reportedPlayer}</td>
									<td>{report.reason}</td>
									<td>{report.comment}</td>
									<td>{report.reportingPlayer}</td>
									<td>{report.gameType}</td>
									<td>
										<Checkbox
											style={{ left: '20px', top: '4px' }}
											toggle
											checked={!report.isActive}
											onChange={() => {
												activeClick(report);
											}}
										/>
									</td>
								</tr>
							))}
					</tbody>
				</table>
			</div>
		);
	}

	render() {
		return (
			<section className="reports">
				<a href="#/">
					<i className="remove icon" />
				</a>
				<h2>Player Reports</h2>
				{this.renderReportsLog()}
			</section>
		);
	}
}

Reports.propTypes = {
	userInfo: PropTypes.object,
	socket: PropTypes.object,
};
