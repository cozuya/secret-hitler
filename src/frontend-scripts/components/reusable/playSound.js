const playSound = (soundName, packNumber, duration) => {
	const sound = document.createElement('audio');

	sound.setAttribute('src', `../sounds/${packNumber}/${soundName}.mp3`);
	sound.play();

	setTimeout(() => {
		sound.pause();
	}, duration);
};

export default playSound;
