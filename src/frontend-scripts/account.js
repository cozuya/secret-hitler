/* eslint-disable */
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

		$('section.signup-modal')
			.modal('setting', 'transition', 'horizontal flip')
			.modal('show');
	});

	$('button.signup-submit').on('click', function(event) {
		event.preventDefault();
		const username = $('#signup-username').val();
		const password = $('#signup-password1').val();
		const password2 = $('#signup-password2').val();
		const email = $('#signup-email').val();
		const bypassKey = $('#signup-bypass').val();
		const $loader = $(this).next();
		const $message = $loader.next();
		const isPrivate = $('#private-player').is(':checked');
		const submitErr = message => {
			$loader.removeClass('active');
			$message.text(message).removeClass('hidden');
		};

		$loader.addClass('active');
		if (!$('#tou-agree').is(':checked')) {
			submitErr('You must agree to the Terms of Use.');
			return;
		}

		$.ajax({
			url: '/account/signup',
			method: 'POST',
			contentType: 'application/json; charset=UTF-8',
			data: JSON.stringify({
				username,
				password,
				password2,
				email,
				isPrivate,
				bypassKey
			}),
			statusCode: {
				200() {
					if (window.location.pathname === '/observe/') {
						window.location.pathname = '/game/';
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
				403(xhr) {
					const message = typeof xhr.responseJSON !== 'undefined' ? xhr.responseJSON.message : '';

					submitErr(message);
				},
				500(xhr) {
					const message = typeof xhr.responseJSON !== 'undefined' ? xhr.responseJSON.message : '';

					submitErr(`Internal error: ${message}`);
				}
			}
		});
	});

	$('body').on('click', '#signin', function(event) {
		event.preventDefault();

		$('section.signin-modal')
			.modal('setting', 'transition', 'horizontal flip')
			.modal('show');
	});

	$('body').on('focus', '#signup-username', function() {
		$(this)
			.parent()
			.next()
			.text('3-12 alphanumeric characters.')
			.slideDown();
	});

	$('body').on('focus', '#signup-password1', function() {
		$(this)
			.parent()
			.next()
			.text('6-255 characters.')
			.slideDown();
	});

	$('body').on('focus', '#signup-bypass', function() {
		$(this)
			.parent()
			.next()
			.text('Only fill this in if instructed to do so.')
			.slideDown();
	});

	$('body').on('blur', '.signup-modal .ui.left.icon.input input', function() {
		$(this)
			.parent()
			.next()
			.slideUp();
	});

	$('button.signin-submit').on('click', function(event) {
		event.preventDefault();
		const username = $('#signin-username').val();
		const password = $('#signin-password').val();
		const twofac = $('#signin-twofac').val();
		const $loader = $(this).next();
		const $message = $loader.next();
		const submitErr = message => {
			$loader.removeClass('active');
			$message.text(message).removeClass('hidden');
		};

		$loader.addClass('active');

		$.ajax({
			url: '/account/signin',
			method: 'POST',
			contentType: 'application/json; charset=UTF-8',
			data: JSON.stringify({ username, password, twofac }),
			statusCode: {
				200() {
					if (window.location.pathname === '/observe/') {
						window.location.pathname = '/game/';
					} else {
						window.location.reload();
					}
				},
				400() {
					submitErr('Sorry, that request did not look right.');
				},
				401() {
					submitErr('Sorry, that was not the correct password for that username.');
				},
				403(xhr) {
					submitErr(xhr.responseJSON.message);
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
		$('section.passwordchange-modal')
			.modal('setting', 'transition', 'horizontal flip')
			.modal('show');
	});

	$('button#passwordchange-submit').on('click', function(event) {
		event.preventDefault();

		const newPassword = $('#passwordchange-password').val();
		const newPasswordConfirm = $('#passwordchange-confirmpassword').val();
		const $loader = $(this).next();
		const $errMessage = $loader.next();
		const $successMessage = $errMessage.next();
		const data = JSON.stringify({
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
		$('section.deleteaccount-modal')
			.modal('setting', 'transition', 'horizontal flip')
			.modal('show');
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

	$('a#reset-password').on('click', function(event) {
		event.preventDefault();
		$('.signin-modal')
			.modal('setting', 'transition', 'horizontal flip')
			.modal('hide', function() {
				$('.password-reset-modal')
					.modal('setting', 'transition', 'horizontal flip')
					.modal('show');
			});
	});

	$('button#password-reset-submit').on('click', function(event) {
		event.preventDefault();

		var email = $('#password-reset-email').val(),
			$loader = $(this).next(),
			$message = $(this)
				.next()
				.next(),
			submitErr = function(message) {
				$loader.removeClass('active');
				$message.text(message).removeClass('hidden');
			};

		$loader.addClass('active');

		$.ajax({
			url: '/account/reset-password',
			method: 'POST',
			contentType: 'application/json; charset=UTF-8',
			data: JSON.stringify({ email: email }),
			statusCode: {
				200: function() {
					$message.addClass('hidden');
					$loader.removeClass('active');
					$('#password-reset-submit').hide();
					$('.password-reset-modal .ui.info.hidden.message')
						.removeClass('hidden')
						.html("We've sent you a password reset email, please check your email for a link to reset your password.");
				},
				400: function() {
					submitErr('Sorry, that request did not look right.');
				},
				404: function() {
					submitErr("Sorry, we don't have an account associated with that verified email address.");
				}
			}
		});
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
