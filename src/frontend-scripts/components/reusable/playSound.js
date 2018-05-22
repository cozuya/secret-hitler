const playSound = (soundName, duration) => {
	const sound = document.createElement('audio');

	sound.setAttribute('src', `../sounds/${soundName}.mp3`);
	sound.play();

	setTimeout(() => {
		sound.pause();
	}, duration);
};

export default playSound;
