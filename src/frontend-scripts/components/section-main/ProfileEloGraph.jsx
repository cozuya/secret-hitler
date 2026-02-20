import React from 'react'; // eslint-disable-line no-unused-vars
import PropTypes from 'prop-types';
import moment from 'moment';
import { getEloBucketIndex } from '../../constants';

const ELO_GRAPH_RANGES = [
	{ key: '1W', label: '1W', days: 7 },
	{ key: '1M', label: '1M', days: 30 },
	{ key: '3M', label: '3M', days: 90 },
	{ key: '1Y', label: '1Y', days: 365 },
	{ key: 'ALL', label: 'All', days: null }
];

const EMPTY_PAST_ELO = [];

const getNearestPointIndexByX = (plottedPoints, mouseX) => {
	if (!plottedPoints.length) {
		return null;
	}

	let low = 0;
	let high = plottedPoints.length - 1;

	while (low < high) {
		const mid = Math.floor((low + high) / 2);
		if (plottedPoints[mid].x < mouseX) {
			low = mid + 1;
		} else {
			high = mid;
		}
	}

	const right = low;
	if (right === 0) {
		return 0;
	}

	const left = right - 1;
	return Math.abs(plottedPoints[right].x - mouseX) < Math.abs(plottedPoints[left].x - mouseX) ? right : left;
};

const downsamplePointsForGraph = (points, maxPoints) => {
	if (points.length <= maxPoints) {
		return points;
	}

	const sampled = [];
	const seen = new Set();
	const pushUnique = point => {
		const key = `${point.date.getTime()}|${point.value}`;
		if (!seen.has(key)) {
			seen.add(key);
			sampled.push(point);
		}
	};

	pushUnique(points[0]);

	const interior = points.slice(1, -1);
	if (interior.length) {
		const bucketCount = Math.max(1, Math.floor((maxPoints - 2) / 4));
		const bucketSize = Math.ceil(interior.length / bucketCount);

		for (let start = 0; start < interior.length; start += bucketSize) {
			const bucket = interior.slice(start, start + bucketSize);
			if (!bucket.length) {
				continue;
			}

			let minPoint = bucket[0];
			let maxPoint = bucket[0];
			for (let i = 1; i < bucket.length; i++) {
				if (bucket[i].value < minPoint.value) {
					minPoint = bucket[i];
				}
				if (bucket[i].value > maxPoint.value) {
					maxPoint = bucket[i];
				}
			}

			[bucket[0], minPoint, maxPoint, bucket[bucket.length - 1]].sort((a, b) => a.date - b.date).forEach(pushUnique);
		}
	}

	pushUnique(points[points.length - 1]);
	return sampled.sort((a, b) => a.date - b.date);
};

const getPolylineLength = plottedPoints => {
	if (plottedPoints.length < 2) {
		return 1;
	}

	let total = 0;
	for (let i = 1; i < plottedPoints.length; i++) {
		total += Math.hypot(plottedPoints[i].x - plottedPoints[i - 1].x, plottedPoints[i].y - plottedPoints[i - 1].y);
	}
	return Math.max(total, 1);
};

class ProfileEloGraph extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			eloGraphRange: '1M',
			eloGraphHoverIndex: null,
			lineAnimationSeed: 0,
			lineAnimationDelayMs: 0
		};
		this.eloGraphMemo = null;
		this.eloGraphHoverRaf = null;
		this.pendingEloGraphHoverIndex = null;
		this.graphRootRef = React.createRef();
		this.graphContainerResizeObserver = null;
		this.isGraphContainerOpen = false;
	}

	componentDidMount() {
		this.bindGraphContainerObserver();
	}

	componentWillUnmount() {
		if (this.eloGraphHoverRaf && typeof window !== 'undefined' && window.cancelAnimationFrame) {
			window.cancelAnimationFrame(this.eloGraphHoverRaf);
		}
		if (this.graphContainerResizeObserver) {
			this.graphContainerResizeObserver.disconnect();
		}
	}

	bindGraphContainerObserver = () => {
		if (typeof ResizeObserver === 'undefined' || !this.graphRootRef.current) {
			return;
		}

		const collapsable = this.graphRootRef.current.closest('.collapsable');
		if (!collapsable) {
			return;
		}

		const syncContainerOpenState = () => {
			const isOpen = collapsable.getBoundingClientRect().height > 1;
			if (isOpen && !this.isGraphContainerOpen) {
				this.setState(prev => ({
					lineAnimationSeed: prev.lineAnimationSeed + 1,
					lineAnimationDelayMs: 400
				}));
			}
			this.isGraphContainerOpen = isOpen;
		};

		syncContainerOpenState();

		this.graphContainerResizeObserver = new ResizeObserver(() => {
			syncContainerOpenState();
		});
		this.graphContainerResizeObserver.observe(collapsable);
	};

	scheduleEloGraphHoverUpdate = nextIndex => {
		this.pendingEloGraphHoverIndex = nextIndex;

		if (this.eloGraphHoverRaf) {
			return;
		}

		const flush = () => {
			this.eloGraphHoverRaf = null;
			const pending = this.pendingEloGraphHoverIndex;
			this.pendingEloGraphHoverIndex = null;

			if (pending !== this.state.eloGraphHoverIndex) {
				this.setState({ eloGraphHoverIndex: pending });
			}
		};

		if (typeof window !== 'undefined' && window.requestAnimationFrame) {
			this.eloGraphHoverRaf = window.requestAnimationFrame(flush);
		} else {
			flush();
		}
	};

	resetEloGraphHover = () => {
		if (this.eloGraphHoverRaf && typeof window !== 'undefined' && window.cancelAnimationFrame) {
			window.cancelAnimationFrame(this.eloGraphHoverRaf);
			this.eloGraphHoverRaf = null;
		}
		this.pendingEloGraphHoverIndex = null;

		if (this.state.eloGraphHoverIndex !== null) {
			this.setState({ eloGraphHoverIndex: null });
		}
	};

	getEloGraphData() {
		const { profileId, pastElo, eloOverall } = this.props;
		const rawPastElo = Array.isArray(pastElo) ? pastElo : EMPTY_PAST_ELO;
		const fallbackOverallElo = Number.isFinite(eloOverall) ? Number(eloOverall) : null;
		const rangeKey = this.state.eloGraphRange;

		if (
			this.eloGraphMemo &&
			this.eloGraphMemo.profileId === profileId &&
			this.eloGraphMemo.rawPastElo === rawPastElo &&
			this.eloGraphMemo.fallbackOverallElo === fallbackOverallElo &&
			this.eloGraphMemo.rangeKey === rangeKey
		) {
			return this.eloGraphMemo.data;
		}

		let points = rawPastElo
			.map(point => {
				const date = new Date(point.date);
				const value = Number(point.value);
				if (!Number.isFinite(value) || Number.isNaN(date.getTime())) {
					return null;
				}
				return { date, value };
			})
			.filter(Boolean)
			.sort((a, b) => a.date - b.date);

		if (!points.length && Number.isFinite(fallbackOverallElo)) {
			points = [{ date: new Date(), value: fallbackOverallElo }];
		}

		const selectedRange = ELO_GRAPH_RANGES.find(range => range.key === rangeKey) || ELO_GRAPH_RANGES[1];
		if (selectedRange.days) {
			const cutoff = Date.now() - selectedRange.days * 24 * 60 * 60 * 1000;
			const filtered = points.filter(point => point.date.getTime() >= cutoff);
			points = filtered.length ? filtered : points.length ? [points[points.length - 1]] : [];
		}

		const width = 680;
		const height = 240;
		const margin = { top: 4, right: 4, bottom: 4, left: 4 };
		const graphWidth = width - margin.left - margin.right;
		const graphHeight = height - margin.top - margin.bottom;
		const maxRenderPoints = Math.max(50, Math.floor(graphWidth));
		points = downsamplePointsForGraph(points, maxRenderPoints);

		let plottedPoints = [];
		let polylinePoints = '';

		if (points.length) {
			const minTime = points[0].date.getTime();
			const maxTime = points[points.length - 1].date.getTime();
			const timeSpan = Math.max(maxTime - minTime, 1);

			let minElo = Math.min(...points.map(point => point.value));
			let maxElo = Math.max(...points.map(point => point.value));
			if (minElo === maxElo) {
				minElo -= 10;
				maxElo += 10;
			}

			const xAt = point => {
				if (points.length === 1) {
					return margin.left + graphWidth / 2;
				}
				return margin.left + ((point.date.getTime() - minTime) / timeSpan) * graphWidth;
			};
			const yAt = point => margin.top + ((maxElo - point.value) / (maxElo - minElo)) * graphHeight;

			plottedPoints = points.map(point => ({
				point,
				x: xAt(point),
				y: yAt(point)
			}));
			polylinePoints = plottedPoints.map(plotted => `${plotted.x},${plotted.y}`).join(' ');
		}

		const data = { points, width, height, margin, graphHeight, plottedPoints, polylinePoints };
		this.eloGraphMemo = { profileId, rawPastElo, fallbackOverallElo, rangeKey, data };
		return data;
	}

	render() {
		if (this.props.staffDisableVisibleElo) {
			return <div className="elo-graph-empty">---</div>;
		}

		const { points, width, height, margin, graphHeight, plottedPoints, polylinePoints } = this.getEloGraphData();
		if (!points.length) {
			return <div className="elo-graph-empty">No Elo history yet.</div>;
		}

		const hoverIndex = this.state.eloGraphHoverIndex;
		const hoverPoint = Number.isInteger(hoverIndex) ? points[hoverIndex] : null;
		const infoPoint = hoverPoint || points[points.length - 1];
		const hoveredPlottedPoint = Number.isInteger(hoverIndex) ? plottedPoints[hoverIndex] : null;
		const lineColor = 'var(--theme-secondary)';
		const infoColor = `var(--elo-color-${getEloBucketIndex(infoPoint.value)})`;
		const markerColor = hoveredPlottedPoint ? `var(--elo-color-${getEloBucketIndex(hoveredPlottedPoint.point.value)})` : lineColor;
		const polylineLength = getPolylineLength(plottedPoints);
		const polylineAnimationKey = `${this.state.eloGraphRange}-${this.state.lineAnimationSeed}`;

		return (
			<div className="elo-graph" ref={this.graphRootRef}>
				<div className="elo-graph-controls">
					{ELO_GRAPH_RANGES.map(range => (
						<button
							type="button"
							key={range.key}
							className={`ui mini button ${this.state.eloGraphRange === range.key ? 'primary' : ''}`}
							onClick={() => {
								this.eloGraphMemo = null;
								this.resetEloGraphHover();
								this.setState(prev => ({
									eloGraphRange: range.key,
									lineAnimationSeed: prev.lineAnimationSeed + 1,
									lineAnimationDelayMs: 0
								}));
							}}
						>
							{range.label}
						</button>
					))}
				</div>
				<div className="elo-graph-summary">
					<span className="elo-graph-summary-title">{hoverPoint ? 'Selected' : 'Latest'}:</span>{' '}
					<span style={{ color: infoColor }}>
						{Math.round(infoPoint.value)} ({moment(infoPoint.date).format('MM/DD/YYYY HH:mm')})
					</span>
				</div>
				<div className="elo-graph-canvas">
					<svg
						className="elo-graph-svg"
						viewBox={`0 0 ${width} ${height}`}
						role="img"
						aria-label="Elo history graph"
						onMouseMove={event => {
							const rect = event.currentTarget.getBoundingClientRect();
							if (!rect.width) {
								return;
							}

							const mouseX = ((event.clientX - rect.left) / rect.width) * width;
							const nextIndex = getNearestPointIndexByX(plottedPoints, mouseX);
							if (nextIndex !== null) {
								this.scheduleEloGraphHoverUpdate(nextIndex);
							}
						}}
						onMouseLeave={this.resetEloGraphHover}
					>
						<polyline
							key={polylineAnimationKey}
							className="elo-graph-line-draw"
							fill="none"
							stroke={lineColor}
							strokeWidth="3"
							points={polylinePoints}
							style={{
								'--elo-graph-path-length': `${polylineLength}`,
								'--elo-graph-line-delay': `${this.state.lineAnimationDelayMs}ms`
							}}
						/>
						{hoveredPlottedPoint && (
							<>
								<line
									x1={hoveredPlottedPoint.x}
									y1={margin.top}
									x2={hoveredPlottedPoint.x}
									y2={margin.top + graphHeight}
									stroke={markerColor}
									strokeWidth="3"
									opacity="0.75"
								/>
								<circle cx={hoveredPlottedPoint.x} cy={hoveredPlottedPoint.y} r={8} fill={markerColor} stroke="var(--theme-background-1)" strokeWidth="1">
									<title>
										{Math.round(hoveredPlottedPoint.point.value)} ({moment(hoveredPlottedPoint.point.date).format('MM/DD/YYYY HH:mm')})
									</title>
								</circle>
							</>
						)}
					</svg>
				</div>
			</div>
		);
	}
}

ProfileEloGraph.defaultProps = {
	profileId: undefined,
	pastElo: undefined,
	eloOverall: undefined,
	staffDisableVisibleElo: false
};

ProfileEloGraph.propTypes = {
	profileId: PropTypes.string,
	pastElo: PropTypes.array,
	eloOverall: PropTypes.number,
	staffDisableVisibleElo: PropTypes.bool
};

export default ProfileEloGraph;
