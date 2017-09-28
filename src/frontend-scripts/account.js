/* eslint-disable no-invalid-this */
'use strict';

import $ from 'jquery';
import Modal from 'semantic-ui-modal';
import Dimmer from 'semantic-ui-dimmer';
import Transition from 'semantic-ui-transition';

$.fn.transition = Transition;
$.fn.modal = Modal;
$.fn.dimmer = Dimmer;

export default () => {
	$('body').on('click', '#signup', function(event) {
		event.preventDefault();

		$('section.signup-modal').modal('setting', 'transition', 'horizontal flip').modal('show');
	});

	$('button.signup-submit').on('click', function(event) {
		event.preventDefault();
		const username = $('#signup-username').val(),
			password = $('#signup-password1').val(),
			password2 = $('#signup-password2').val(),
			$loader = $(this).next(),
			$message = $loader.next(),
			submitErr = message => {
				$loader.removeClass('active');
				$message.text(message).removeClass('hidden');
			};

		$loader.addClass('active');

		$.ajax({
			url: '/account/signup',
			method: 'POST',
			contentType: 'application/json; charset=UTF-8',
			data: JSON.stringify({
				username,
				password,
				password2
			}),
			statusCode: {
				200() {
					if (window.location.pathname === '/observe') {
						window.location.pathname = '/game';
					} else {
						window.location.reload();
					}
				},
				400() {
					submitErr('Sorry, that request did not look right.');
				},
				401(xhr) {
					const message =
						typeof xhr.responseJSON !== 'undefined'
							? xhr.responseJSON.message
							: 'Sorry, that username already exists and you did not provide the correct password.';

					submitErr(message);
				},
				403: function(xhr) {
					const message = typeof xhr.responseJSON !== 'undefined' ? xhr.responseJSON.message : '';

					submitErr(message);
				}
			}
		});
	});

	$('body').on('click', '#signin', function(event) {
		event.preventDefault();

		$('section.signin-modal').modal('setting', 'transition', 'horizontal flip').modal('show');
	});

	$('body').on('focus', '#signup-username', function() {
		$(this).parent().next().text('3-12 alphanumeric characters.').slideDown();
	});

	$('body').on('focus', '#signup-password1', function() {
		$(this).parent().next().text('6-255 characters.').slideDown();
	});

	$('body').on('blur', '.signup-modal .ui.left.icon.input input', function() {
		$(this).parent().next().slideUp();
	});

	$('button.signin-submit').on('click', function(event) {
		event.preventDefault();
		const username = $('#signin-username').val(),
			password = $('#signin-password').val(),
			$loader = $(this).next(),
			$message = $loader.next(),
			submitErr = message => {
				$loader.removeClass('active');
				$message.text(message).removeClass('hidden');
			};

		$loader.addClass('active');

		$.ajax({
			url: '/account/signin',
			method: 'POST',
			contentType: 'application/json; charset=UTF-8',
			data: JSON.stringify({ username, password }),
			statusCode: {
				200() {
					if (window.location.pathname === '/observe') {
						window.location.pathname = '/game';
					} else {
						window.location.reload();
					}
				},
				400() {
					submitErr('Sorry, that request did not look right.');
				},
				401() {
					submitErr('Sorry, that was not the correct password for that username.');
				}
			}
		});
	});

	$('a#logout').on('click', function(event) {
		event.preventDefault();

		$.ajax({
			url: '/account/logout',
			method: 'POST',
			success() {
				window.location.reload();
			}
		});
	});

	$('button#change-password').on('click', function(event) {
		$('section.passwordchange-modal').modal('setting', 'transition', 'horizontal flip').modal('show');
	});

	$('button#passwordchange-submit').on('click', function(event) {
		event.preventDefault();

		const newPassword = $('#passwordchange-password').val(),
			newPasswordConfirm = $('#passwordchange-confirmpassword').val(),
			$loader = $(this).next(),
			$errMessage = $loader.next(),
			$successMessage = $errMessage.next(),
			data = JSON.stringify({
				newPassword,
				newPasswordConfirm
			});

		$loader.addClass('active');

		$.ajax({
			url: '/account/change-password',
			method: 'POST',
			contentType: 'application/json; charset=UTF-8',
			data,
			statusCode: {
				200() {
					$loader.removeClass('active');
					$successMessage.removeClass('hidden');
					if (!$errMessage.hasClass('hidden')) {
						$errMessage.addClass('hidden');
					}
				},
				401() {
					$loader.removeClass('active');
					$errMessage.text('Your new password and your confirm password did not match.').removeClass('hidden');
					if (!$successMessage.hasClass('hidden')) {
						$successMessage.addClass('hidden');
					}
				}
			}
		});
	});

	$('button#delete-account').on('click', function(event) {
		$('section.deleteaccount-modal').modal('setting', 'transition', 'horizontal flip').modal('show');
	});

	$('button#deleteaccount-submit').on('click', function(event) {
		// todo-release
		// event.preventDefault();
		// const password = $('#deleteaccount-password').val(),
		// 	$loader = $(this).next(),
		// 	$errMessage = $loader.next(),
		// 	$successMessage = $errMessage.next(),
		// 	data = JSON.stringify({password});
		// $loader.addClass('active');
		// $.ajax({
		// 	url: '/account/delete-account',
		// 	method: 'POST',
		// 	contentType: 'application/json; charset=UTF-8',
		// 	data,
		// 	statusCode: {
		// 		200() {
		// 			$loader.removeClass('active');
		// 			$successMessage.removeClass('hidden');
		// 			setTimeout(function () {
		// 				window.location.reload();
		// 			}, 3000);
		// 			if (!$errMessage.hasClass('hidden')) {
		// 				$errMessage.addClass('hidden');
		// 			}
		// 		},
		// 		400() {
		// 			$loader.removeClass('active');
		// 			$errMessage.text('Your password did not match.').removeClass('hidden');
		// 			if (!$successMessage.hasClass('hidden')) {
		// 				$successMessage.addClass('hidden');
		// 			}
		// 		}
		// 	}
		// });
	});

	// dev: autologin crap remove later

	$('body').on('click', '.loginquick', function(event) {
		event.preventDefault();
		const user = $(this).attr('data-name');

		$.ajax({
			url: '/account/signin',
			method: 'POST',
			contentType: 'application/json; charset=UTF-8',
			data: JSON.stringify({ username: user, password: 'snipsnap' }),
			statusCode: {
				200() {
					if (window.location.pathname === '/observe/') {
						window.location.pathname = '/game/';
					} else {
						window.location.reload();
					}
				}
			}
		});
	});
};
