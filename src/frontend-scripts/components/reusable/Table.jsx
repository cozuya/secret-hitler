import React from 'react'; // eslint-disable-line no-unused-vars

const Table = ({ headers, body, uiTable }) => (
	<table className={`ui ${uiTable} table`}>
		<thead>
			<tr>
				{ headers.map(h =>
					<th key={h}>{h}</th>
				)}
			</tr>
		</thead>
		<tbody>
			{ body.map((row, i) =>
				<tr key={i} >
					{ row.map((cell, i) =>
						<td key={i}>{ cell }</td>
					)}
				</tr>
			)}
		</tbody>
	</table>
);

export default Table;