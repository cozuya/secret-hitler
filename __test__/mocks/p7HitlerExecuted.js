// hitler executed
export default {
        "_id" : ObjectId("592bd27619c346816a80dd45"),
        "uid" : "devgame",
        "date" : ISODate("2017-05-29T07:47:04.995Z"),
        "logs" : [
            {
                "presidentId" : 0,
                "chancellorId" : 2,
                "enactedPolicy" : "fascist",
                "_id" : ObjectId("592bd27619c346816a80dd4a"),
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
                "chancellorId" : 3,
                "enactedPolicy" : "fascist",
                "investigationId" : 2,
                "_id" : ObjectId("592bd27619c346816a80dd49"),
                "presidentClaim" : {
                    "reds" : 0,
                    "blues" : 3
                },
                "chancellorHand" : {
                    "reds" : 1,
                    "blues" : 1
                },
                "presidentHand" : {
                    "reds" : 1,
                    "blues" : 2
                },
                "votes" : [
                    false,
                    true,
                    false,
                    true,
                    true,
                    true,
                    true
                ]
            },
            {
                "presidentId" : 2,
                "chancellorId" : 4,
                "_id" : ObjectId("592bd27619c346816a80dd48"),
                "votes" : [
                    false,
                    false,
                    false,
                    false,
                    false,
                    true,
                    true
                ]
            },
            {
                "presidentId" : 3,
                "chancellorId" : 4,
                "enactedPolicy" : "fascist",
                "specialElection" : 4,
                "_id" : ObjectId("592bd27619c346816a80dd47"),
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
                    false,
                    true,
                    false,
                    false
                ]
            },
            {
                "presidentId" : 4,
                "chancellorId" : 5,
                "enactedPolicy" : "fascist",
                "execution" : 2,
                "_id" : ObjectId("592bd27619c346816a80dd46"),
                "chancellorHand" : {
                    "reds" : 2,
                    "blues" : 0
                },
                "presidentHand" : {
                    "reds" : 3,
                    "blues" : 0
                },
                "votes" : [
                    true,
                    true,
                    false,
                    true,
                    false,
                    true,
                    true
                ]
            }
        ],
        "players" : [
            {
                "username" : "Uther",
                "role" : "liberal",
                "_id" : ObjectId("592bd27619c346816a80dd51")
            },
            {
                "username" : "Jaina",
                "role" : "fascist",
                "_id" : ObjectId("592bd27619c346816a80dd50")
            },
            {
                "username" : "Malfurian",
                "role" : "hitler",
                "_id" : ObjectId("592bd27619c346816a80dd4f")
            },
            {
                "username" : "Rexxar",
                "role" : "fascist",
                "_id" : ObjectId("592bd27619c346816a80dd4e")
            },
            {
                "username" : "Thrall",
                "role" : "liberal",
                "_id" : ObjectId("592bd27619c346816a80dd4d")
            },
            {
                "username" : "Valeera",
                "role" : "liberal",
                "_id" : ObjectId("592bd27619c346816a80dd4c")
            },
            {
                "username" : "Anduin",
                "role" : "liberal",
                "_id" : ObjectId("592bd27619c346816a80dd4b")
            }
        ],
        "__v" : 0
}