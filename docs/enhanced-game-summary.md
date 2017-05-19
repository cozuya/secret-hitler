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

## playerOf(identifier)

### Arguments

1. identifier (`String` | `Int`): username or player index
2. isId (`Boolean`): defaults to *false*

### Returns

(`Player`)

## indexOf(identifier)

### Arguments

1. identifier (`String` | `Int`): username or player index
2. isId (`Boolean`): defaults to *false*

### Returns

(`Int`)

## loyaltyOf(identifier)

### Arguments

1. identifier (`String` | `Int`): username or player index
2. isId (`Boolean`): defaults to *false*

### Returns

(`String`): either *"liberal"* or *"fascist"*

## roleOf(identifier)

### Arguments

1. identifier (`String` | `Int`): username or player index
2. isId (`Boolean`): defaults to *false*

### Returns

(`String`): either *"liberal"*, *"fascist"*, or *"hitler"*

## votesOf(identifier)

### Arguments

1. identifier (`String` | `Int`): username or player index
2. isId (`Boolean`): defaults to *false*

### Returns

(`Array[{ vote: Boolean, presidentId: Int, chancellorId: Int }]`)

## shotsOf(identifier)

### Arguments

1. identifier (`String` | `Int`): username or player index
2. isId (`Boolean`): defaults to *false*

### Returns

(`Array[Int]`): list of player indexes that have been executed by player