import React from 'react';
import moment from 'moment';
import PropTypes from 'prop-types';

export default class Reports extends React.Component {
	constructor() {
		super();

		this.state = {
			reports: []
		};
	}

	componentDidMount() {
		this.props.socket.emit('getUserReports');

		this.props.socket.on('reportInfo', reports => {
			this.setState({
				reports
			});
		});
	}

	componentWillUnmount() {
		this.props.socket.off('reportsInfo');
	}

	renderReportsLog() {
		return (
			<div>
				<table className="ui celled table">
					<thead>
						<tr>
							<th>Date</th>
							<th>UID</th>
							<th>User Reported</th>
							<th>Type</th>
							<th>Comment</th>
							<th>Reporting User</th>
						</tr>
					</thead>
					<tbody>
						{this.state.reports.map((report, index) => (
							<tr key={index}>
								<td>{moment(new Date(report.date)).format('YYYY-MM-DD HH:mm')}</td>
								<td>{report.gameUid.substr(0, 5)}</td>
								<td>{report.reportedPlayer}</td>
								<td>{report.reason}</td>
								<td>{report.comment}</td>
								<td>{report.reportingPlayer}</td>
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
				<h2>Player Reports</h2>
				<a href="#/">
					<i className="remove icon" />
				</a>
				{this.renderReportsLog()}
			</section>
		);
	}
}

Reports.propTypes = {
	userInfo: PropTypes.object,
	socket: PropTypes.object
};
