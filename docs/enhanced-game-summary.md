# Enhanced game summary

Represents a human-friendly game

- playerSize
- numberOfTurns
- lastTurn
- hitlerZone
- playerOf
- indexOf
- loyaltyOf
- rolesOf
- votesOf
- shotsOf

## playerSize

(`Int`)

## numberOfTurns

(`Int`)

## lastTurn

(`Turn`): the final turn of the game

## hitlerZone

(`Int`): the index of the turn right after 3 fascist policies are enacted

## playerOf(username | id, [isId])

### Arguments

1. username | id (`String` | `Int`)
2. isId (`Boolean`): defaults to *false*

### Returns

(`Player`)

## indexOf(username | id, [isId])

### Arguments

1. username | id (`String` | `Int`)
2. isId (`Boolean`): defaults to *false*

### Returns

(`Int`)

## loyaltyOf(username | id, [isId])

### Arguments

1. username | id (`String` | `Int`)
2. isId (`Boolean`): defaults to *false*

### Returns

(`String`): either *"liberal"* or *"fascist"*

## roleOf(username | id, [isId])

### Arguments

1. username | id (`String` | `Int`)
2. isId (`Boolean`): defaults to *false*

### Returns

(`String`): either *"liberal"*, *"fascist"*, or *"hitler"*

## votesOf(username | id, [isId])

### Arguments

1. username | id (`String` | `Int`)
2. isId (`Boolean`): defaults to *false*

### Returns

(`Array[{ vote: Boolean, presidentId: Int, chancellorId: Int }]`)

## shotsOf(username | id, [isId])

### Arguments

1. username | id (`String` | `Int`)
2. isId (`Boolean`): defaults to *false*

### Returns

(`Array[Int]`): list of player ids