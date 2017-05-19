# Stats

Catalog of all stats being tracked and how they are calculated

- Player Stats
	- Matches
		- All Matches
		- By Loyalty
			- Liberal
			- Fascist
	- Actions
		- Vote Accuracy
		- Shot Accuracy

## Player Stats

### Matches

High level stats that reflect general properties of games of player

#### All Matches

*Instance:* Game completed

*Success:* Game won

#### By Loyalty

##### Liberal

*Instance:* Game completed

*Success:* Player loyalty is liberal and game won

##### Fascist

*Instance:* Game completed

*Success:* Player loyalty is fascist and game won

### Actions

Low level stats that reflect actions of player

#### Vote Accuracy

*Instance*: Player is liberal and votes when president is fascist or chancellor is Hitler

*Success*: Player votes "nein"

#### Shot Accuracy

*Instance*: Player is liberal and executes another player

*Success*: Other player is fascist