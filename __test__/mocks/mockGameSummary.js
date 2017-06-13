// keep this updated with GameSummary schema

// Jaina never votes for a fascist, kills a fascist
// Valeera shoots a liberal
// Uther always votes for a fascist
export default {
    "uid" : "devgame",
    "date" : new Date(),
    "logs" : [
        {
            "presidentId" : 0,
            "chancellorId" : 1,
            "enactedPolicy" : "fascist",
            "chancellorHand" : {
                "reds" : 2,
                "blues" : 0
            },
            "presidentHand" : {
                "reds" : 2,
                "blues" : 1
            },
            "votes" : [
                true,
                true,
                true,
                true,
                true,
                true,
                true
            ]
        },
        {
            "presidentId" : 1,
            "chancellorId" : 3,
            "enactedPolicy" : "fascist",
            "investigation" : 4,
            "chancellorHand" : {
                "reds" : 1,
                "blues" : 1
            },
            "presidentHand" : {
                "reds" : 2,
                "blues" : 1
            },
            "votes" : [
                true,
                true,
                true,
                true,
                true,
                true,
                true
            ]
        },
        {
            "presidentId" : 2,
            "chancellorId" : 0,
            "enactedPolicy" : "fascist",
            "specialElection" : 1,
            "chancellorHand" : {
                "reds" : 1,
                "blues" : 1
            },
            "presidentHand" : {
                "reds" : 1,
                "blues" : 2
            },
            "votes" : [
                true,
                true,
                true,
                true,
                true,
                true,
                true
            ]
        },
        {
            "presidentId" : 1,
            "chancellorId" : 6,
            "enactedPolicy" : "fascist",
            "execution" : 3,
            "chancellorHand" : {
                "reds" : 1,
                "blues" : 1
            },
            "presidentHand" : {
                "reds" : 2,
                "blues" : 1
            },
            "votes" : [
                true,
                false,
                true,
                true,
                true,
                true,
                false
            ]
        },
        {
            "presidentId" : 4,
            "chancellorId" : 2,
            "votes" : [
                true,
                false,
                false,
                true,
                false,
                true,
                false
            ]
        },
        {
            "presidentId" : 5,
            "chancellorId" : 4,
            "votes" : [
                true,
                false,
                false,
                true,
                false,
                false,
                false
            ]
        },
        {
            "presidentId" : 6,
            "chancellorId" : 2,
            "enactedPolicy" : "fascist",
            "execution" : 2,
            "chancellorHand" : {
                "reds" : 2,
                "blues" : 0
            },
            "presidentHand" : {
                "reds" : 2,
                "blues" : 1
            },
            "votes" : [
                true,
                true,
                true,
                true,
                true,
                true,
                true
            ]
        },
        {
            "presidentId" : 0,
            "chancellorId" : 5,
            "enactedPolicy" : "fascist",
            "chancellorHand" : {
                "reds" : 2,
                "blues" : 0
            },
            "presidentHand" : {
                "reds" : 2,
                "blues" : 1
            },
            "votes" : [
                true,
                false,
                true,
                true,
                true,
                true,
                true
            ]
        }
    ],
    "players" : [
        {
            "username" : "Uther",
            "role" : "liberal",
        },
        {
            "username" : "Jaina",
            "role" : "liberal",
        },
        {
            "username" : "Rexxar",
            "role" : "liberal",
        },
        {
            "username" : "Malfurian",
            "role" : "fascist",
        },
        {
            "username" : "Thrall",
            "role" : "hitler",
        },
        {
            "username" : "Valeera",
            "role" : "fascist",
        },
        {
            "username" : "Anduin",
            "role" : "liberal",
        }
    ],
}