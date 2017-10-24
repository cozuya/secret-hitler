import React from 'react'; // eslint-disable-line no-unused-vars

const TBody = ({ rows }) => (
	<tbody>
		{rows.map((row, i) => {
			const isRich = !Array.isArray(row),
				noop = () => null,
				onClick = isRich && row.onClick ? row.onClick : noop,
				cells = isRich ? row.cells : row;

			return (
				<tr onClick={onClick} key={i}>
					{cells.map((cell, i) => <td key={i}>{cell}</td>)}
				</tr>
			);
		})}
	</tbody>
);

const Table = ({ headers, rows, uiTable }) => (
	<table className={`ui ${uiTable} table`}>
		<thead>
			<tr>{headers.map(h => <th key={h}>{h}</th>)}</tr>
		</thead>
		<TBody rows={rows} />
	</table>
);

export default Table;
