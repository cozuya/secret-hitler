import React from 'react'; // eslint-disable-line
import { shallow } from 'enzyme';
import ProfileEloGraph from './ProfileEloGraph';

describe('ProfileEloGraph', () => {
	it('renders hidden state when visible elo is disabled', () => {
		const component = shallow(<ProfileEloGraph staffDisableVisibleElo={true} />);

		expect(component.find('.elo-graph-empty')).toHaveLength(1);
		expect(component.text()).toContain('---');
	});

	it('renders graph shell when valid pastElo exists', () => {
		const component = shallow(
			<ProfileEloGraph
				profileId="Rexxar"
				pastElo={[
					{ date: '2026-02-10T01:00:00.000Z', value: 1600 },
					{ date: '2026-02-11T01:00:00.000Z', value: 1615 },
					{ date: '2026-02-12T01:00:00.000Z', value: 1598 }
				]}
			/>
		);

		expect(component.find('.elo-graph-controls button')).toHaveLength(5);
		expect(component.find('svg.elo-graph-svg')).toHaveLength(1);
	});

	it('falls back safely when pastElo is empty and eloOverall exists', () => {
		const component = shallow(<ProfileEloGraph profileId="Rexxar" pastElo={[]} eloOverall={1700} />);

		expect(component.find('svg.elo-graph-svg')).toHaveLength(1);
		expect(component.find('.elo-graph-summary-title').text()).toBe('Latest:');
		expect(
			component
				.find('.elo-graph-summary span')
				.at(1)
				.prop('style')
		).toEqual({ color: 'var(--elo-color-40)' });
	});

	it('does not crash with malformed points', () => {
		const component = shallow(
			<ProfileEloGraph
				profileId="Rexxar"
				pastElo={[
					{ date: 'not-a-date', value: 1600 },
					{ date: '2026-02-12T01:00:00.000Z', value: 'not-a-number' }
				]}
			/>
		);

		expect(component.find('.elo-graph-empty')).toHaveLength(1);
		expect(component.text()).toContain('No Elo history yet.');
	});

	it('uses bucket css vars for selected marker color', () => {
		const component = shallow(
			<ProfileEloGraph
				profileId="Rexxar"
				pastElo={[
					{ date: '2026-02-10T01:00:00.000Z', value: 1600 },
					{ date: '2026-02-11T01:00:00.000Z', value: 1615 }
				]}
			/>
		);

		component.setState({ eloGraphHoverIndex: 1 });
		expect(
			component
				.find('line')
				.first()
				.prop('stroke')
		).toBe('var(--elo-color-23)');
	});
});
