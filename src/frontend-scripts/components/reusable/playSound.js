const playSound = (soundName, extension, duration) => {
	const sound = document.createElement('audio');

	sound.setAttribute('src', `../sounds/${soundName}.${extension}`);
	sound.play();

	setTimeout(() => {
		sound.pause();
	}, duration);
};

export default playSound;
