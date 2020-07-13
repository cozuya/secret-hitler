import React, { useState } from 'react'; // eslint-disable-line
import { connect } from 'react-redux';
import { Popup, List, Grid, Button, Dropdown, Segment, TextArea } from 'semantic-ui-react';

const mapStateToProps = ({ userList }) => ({ userList });

const Report = props => {
	const opt = ['AFK/Leaving Game', 'Abusive chat', 'Cheating', 'Gamethrowing', 'Stalling', 'Other'];
	return (
		<Segment inverted>
			<Dropdown placeholder="Reason" fluid selection options={opt.map(option => ({ text: option, key: option, value: option }))} />
			<TextArea placeholder="Tell us more" style={{ marginTop: 10, marginBottom: 10, width: '100%' }} />
			<Button>Submit</Button>
		</Segment>
	);
};

const UserInfo = props => {
	const [reportVisible, setReportVisible] = useState(false);
	const user = props.userList && props.userList.list && props.userList.list.find(play => play.userName === props.userName);
	return (
		<Popup inverted hoverable trigger={props.children} mouseLeaveDelay={300}>
			<Popup.Header>{props.userName}</Popup.Header>
			<Popup.Content>
				<List>
					<List.Item>
						<List.Icon name="chart line" />
						<List.Content>
							<Grid columns={2} divided inverted>
								<Grid.Row textAlign="center">
									<Grid.Column>{user && (user.eloOverall || 1600)}</Grid.Column>
									<Grid.Column>{user && (user.eloSeasonal || 1600)}</Grid.Column>
								</Grid.Row>
							</Grid>
						</List.Content>
					</List.Item>
					{props.onPing && (
						<List.Item>
							<Button fluid size="small">
								Ping
							</Button>
						</List.Item>
					)}
					<List.Item>
						<Button fluid size="small" onClick={() => (window.location.hash = `#/profile/${userName}`)}>
							View Profile
						</Button>
					</List.Item>
					<List.Item>
						<List.Icon name="gavel" />
						<List.Content>
							<a onClick={() => setReportVisible(!reportVisible)}>Report</a>
						</List.Content>
					</List.Item>
					{props.onBlacklist && (
						<List.Item>
							<List.Icon name="x" />
							<List.Content>
								<a>Blacklist</a>
							</List.Content>
						</List.Item>
					)}
				</List>
				{reportVisible && <Report />}
			</Popup.Content>
		</Popup>
	);
};

export default connect(mapStateToProps, null)(UserInfo);
