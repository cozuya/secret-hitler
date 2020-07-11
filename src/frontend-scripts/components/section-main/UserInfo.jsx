import React from 'react'; // eslint-disable-line
import { connect } from 'react-redux';
import { Popup, List, Grid, Button } from 'semantic-ui-react';

const mapStateToProps = ({ userList }) => ({ userList });

const UserInfo = props => {
	const user = props.userList && props.userList.list && props.userList.list.find(play => play.userName === props.userName);
	return (
		<Popup inverted hoverable trigger={props.children}>
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
					<List.Item>
						<Button fluid size="small">
							Ping
						</Button>
					</List.Item>
					<List.Item>
						<Button fluid size="small" as={'Link'} to={`/observe/#/profile/${props.userName}`}>
							View Profile
						</Button>
					</List.Item>
					<List.Item>
						<List.Icon name="gavel" />
						<List.Content>
							<a>Report</a>
						</List.Content>
					</List.Item>
					<List.Item>
						<List.Icon name="x" />
						<List.Content>
							<a>Blacklist</a>
						</List.Content>
					</List.Item>
				</List>
			</Popup.Content>
		</Popup>
	);
};

export default connect(mapStateToProps, null)(UserInfo);
