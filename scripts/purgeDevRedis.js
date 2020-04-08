const redis = require('redis');

const createClients = (num) => redis.createClient({ db: num });

Array(6)
	.fill(true)
	.forEach((el, index) => {
		const client = createClients(index);

		if (index) {
			client.flushall();
		}
	});

process.exit();
