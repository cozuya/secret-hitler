/* eslint-disable */
'use strict';

import $ from 'jquery';
import Transition from 'semantic-ui-transition';

$.fn.transition = Transition;

export default () => {
	$('body').on('click', '#chatsidebar', function(event) {
		event.preventDefault();

	if (window.location.href.indexOf('#/table/') == -1)
	{
		$('.section-right').transition({
			animation: 'slide left',
			displayType: 'flex'
		});
	}
	else
	{
		$('.chat-container').transition({
			animation: 'slide left',
			displayType: 'flex'
		});
	}
	});
};
