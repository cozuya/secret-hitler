$(document).ready(function() {
	// yay ES5

	if (window.location.pathname === '/') {
		$.ajax({
			url: '/online-playercount',
			contentType: 'application/json; charset=UTF-8',
			statusCode: {
				200: function(d) {
					$('.chrome.icon').after('<span>' + d.count + ' </span>');
				}
			}
		});
	}

	$('body').on('click', '#signup', function(event) {
		event.preventDefault();

		$('section.signup-modal')
			.modal('setting', 'transition', 'horizontal flip')
			.modal('show');
	});

	$('body').on('click', '#add-email', function(event) {
		event.preventDefault();

		$('section.add-email-modal')
			.modal('setting', 'transition', 'horizontal flip')
			.modal('show');
	});

	$('button.email-submit').on('click', function(event) {
		event.preventDefault();
		var email = $('#add-email-input').val(),
			$loader = $(this).next(),
			$message = $loader.next(),
			submitErr = function(message) {
				$loader.removeClass('active');
				$message.text(message).removeClass('hidden');
			};

		$loader.addClass('active');

		$.ajax({
			url: '/account/add-email',
			method: 'POST',
			contentType: 'application/json; charset=UTF-8',
			data: JSON.stringify({
				email: email
			}),
			statusCode: {
				200: function() {
					window.location.reload();
				},
				400: function() {
					submitErr('Sorry, that request did not look right.');
				},
				401: function(xhr) {
					var message =
						typeof xhr.responseJSON !== 'undefined' ? xhr.responseJSON.message : 'Only non-disposible email addresses can be added for verification purposes.';

					submitErr(message);
				},
				403: function(xhr) {
					var message = typeof xhr.responseJSON !== 'undefined' ? xhr.responseJSON.message : '';

					submitErr(message);
				}
			}
		});
	});

	$('button.signup-submit').on('click', function(event) {
		event.preventDefault();
		var username = $('#signup-username').val(),
			password = $('#signup-password1').val(),
			password2 = $('#signup-password2').val(),
			email = $('#signup-email').val(),
			$loader = $(this).next(),
			$message = $loader.next(),
			isPrivate = $('#private-player').is(':checked'),
			submitErr = function(message) {
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
				username: username,
				password: password,
				password2: password2,
				email: email,
				isPrivate: isPrivate
			}),
			statusCode: {
				200: function() {
					if (window.location.pathname === '/observe/') {
						window.location.pathname = '/game/';
					} else {
						window.location.reload();
					}
				},
				400: function() {
					submitErr('Sorry, that request did not look right.');
				},
				401: function(xhr) {
					var message =
						typeof xhr.responseJSON !== 'undefined'
							? xhr.responseJSON.message
							: 'Sorry, that username already exists and you did not provide the correct password.';

					submitErr(message);
				},
				403: function(xhr) {
					var message = typeof xhr.responseJSON !== 'undefined' ? xhr.responseJSON.message : '';

					submitErr(message);
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

	$('body').on('blur', '.signup-modal .ui.left.icon.input input', function() {
		$(this)
			.parent()
			.next()
			.slideUp();
	});

	$('button.signin-submit').on('click', function(event) {
		event.preventDefault();
		var username = $('#signin-username').val(),
			password = $('#signin-password').val(),
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
			url: '/account/signin',
			method: 'POST',
			contentType: 'application/json; charset=UTF-8',
			data: JSON.stringify({ username: username, password: password }),
			statusCode: {
				200: function() {
					if (window.location.pathname === '/observe/') {
						window.location.pathname = '/game/';
					} else {
						window.location.reload();
					}
				},
				400: function() {
					submitErr('Sorry, that request did not look right.');
				},
				401: function() {
					submitErr('Sorry, that was not the correct password for that username.');
				}
			}
		});
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
					console.log('Hello, World!');
					$message.addClass('hidden');
					$loader.removeClass('active');
					$('.password-reset-modal .ui.info.hidden.message')
						.removeClass('hidden')
						.html("We've sent you a password reset email, please check your email to a link to reset your password.");
				},
				400: function() {
					submitErr('Sorry, that request did not look right.');
				},
				400: function() {
					submitErr("Sorry, we don't have an account associated with that verified email address.");
				}
			}
		});
	});

	$('button#emailadd-submit').on('click', function(event) {
		event.preventDefault();

		var username = $('#emailadd-account-name').val(),
			email = $('#emailadd-email').val(),
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
			url: '/account/add-email',
			method: 'POST',
			contentType: 'application/json; charset=UTF-8',
			data: JSON.stringify({ email: email, username: username }),
			statusCode: {
				200: function() {
					$message.addClass('hidden');
					$loader.removeClass('active');
					$('.emailadd-modal .ui.info.hidden.message')
						.removeClass('hidden')
						.html("We've sent you a verification email, please follow the link inside to verify your account.");
				},
				400: function() {
					submitErr('Sorry, that request did not look right.');
				},
				401: function() {
					submitErr("Sorry, we don't have an account associated with that verified email address.");
				}
			}
		});
	});

	$('a#logout').on('click', function(event) {
		event.preventDefault();

		$.ajax({
			url: '/account/logout',
			method: 'POST',
			success: function() {
				window.location.reload();
			}
		});
	});

	$('button#change-password').on('click', function(event) {
		$('section.passwordchange-modal')
			.modal('setting', 'transition', 'horizontal flip')
			.modal('show');
	});

	$('button#change-email').on('click', function(event) {
		$('section.emailchange-modal')
			.modal('setting', 'transition', 'horizontal flip')
			.modal('show');
	});

	$('button#request-verification').on('click', function(event) {
		event.preventDefault();

		$(this).hide();
		$.ajax({
			url: '/account/request-verification',
			method: 'POST',
			contentType: 'application/json; charset=UTF-8',
			statusCode: {
				200: function() {
					$('section.requestemail-modal')
						.modal('setting', 'transition', 'horizontal flip')
						.modal('show');
				}
			}
		});
	});

	$('button#passwordchange-submit').on('click', function(event) {
		event.preventDefault();

		var newPassword = $('#passwordchange-password').val(),
			newPasswordConfirm = $('#passwordchange-confirmpassword').val(),
			$loader = $(this).next(),
			$errMessage = $loader.next(),
			$successMessage = $errMessage.next(),
			data = JSON.stringify({
				newPassword: newPassword,
				newPasswordConfirm: newPasswordConfirm
			});

		$loader.addClass('active');

		$.ajax({
			url: '/account/change-password',
			method: 'POST',
			contentType: 'application/json; charset=UTF-8',
			data: data,
			statusCode: {
				200: function() {
					$loader.removeClass('active');
					$successMessage.removeClass('hidden');
					if (!$errMessage.hasClass('hidden')) {
						$errMessage.addClass('hidden');
					}
				},
				401: function() {
					$loader.removeClass('active');
					$errMessage.text('Your new password and your confirm password did not match.').removeClass('hidden');
					if (!$successMessage.hasClass('hidden')) {
						$successMessage.addClass('hidden');
					}
				}
			}
		});
	});

	$('button#emailchange-submit').on('click', function(event) {
		event.preventDefault();

		var newEmail = $('#emailchange-input').val(),
			$loader = $(this).next(),
			$errMessage = $loader.next(),
			data = JSON.stringify({
				email: newEmail
			}),
			submitErr = function(message) {
				$loader.removeClass('active');
				$errMessage.text(message).removeClass('hidden');
			};
		$loader.addClass('active');

		$.ajax({
			url: '/account/change-email',
			method: 'POST',
			contentType: 'application/json; charset=UTF-8',
			data: data,
			statusCode: {
				200: function() {
					window.location.reload();
				},
				401: function(xhr) {
					submitErr(xhr.responseJSON.message);
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
		event.preventDefault();

		var password = $('#deleteaccount-password').val(),
			$loader = $(this).next(),
			$errMessage = $loader.next(),
			$successMessage = $errMessage.next(),
			data = JSON.stringify({ username: $('#delete-account-name').text(), password: password });

		$loader.addClass('active');

		$.ajax({
			url: '/account/delete-account',
			method: 'POST',
			contentType: 'application/json; charset=UTF-8',
			data: data,
			statusCode: {
				200: function() {
					$loader.removeClass('active');
					$successMessage.removeClass('hidden');
					setTimeout(function() {
						window.location.reload();
					}, 3000);
					if (!$errMessage.hasClass('hidden')) {
						$errMessage.addClass('hidden');
					}
				},
				401: function() {
					$loader.removeClass('active');
					$errMessage.text('Your password did not match.').removeClass('hidden');
					if (!$successMessage.hasClass('hidden')) {
						$successMessage.addClass('hidden');
					}
				}
			}
		});
	});
});
