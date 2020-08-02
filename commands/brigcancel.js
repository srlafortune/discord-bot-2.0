const moment = require('moment')

module.exports = {
    name: 'brigcancel',
    description: 'put em in the brig',
    guildOnly: true,
    async execute(message, args, dbClient) {
        if (!message.mentions.users.size) {
            return message.reply(
                'you need to tag a user in order to start a brig vote!'
            )
        }

        // get the user who is going to be put in the brig
        const taggedMember = message.mentions.members.first()
        const taggedUser = message.mentions.users.first()

        if (taggedMember === message.member) {
            return message.reply(
                'You thought you were going to put yourself in the brig, but it was me, an error message!'
            )
        }

        const params = {
            TableName: 'Users',
            Key: { id: taggedUser.id },
            ConditionExpression: '#voteInitiator = :voteInitiator',
            ReturnValues: 'ALL_NEW',
            UpdateExpression: 'REMOVE #brigVotes, #voteStart, #voteEnd',
            ExpressionAttributeNames: {
                '#brigVotes': 'brigVotes',
                '#voteStart': 'voteStart',
                '#voteEnd': 'voteEnd',
                '#voteInitiator': 'voteInitiator',
            },
            ExpressionAttributeValues: { ':voteInitiator': message.author.id },
        }
        try {
            const result = await dbClient.update(params).promise()
            console.log(result)

            // message the channel what is going on
            message.channel.send(
                `${message.member}\nhas canceled the brig vote for \n${taggedUser}`
            )
        } catch (err) {
            console.error(err)
        }
    },
}
