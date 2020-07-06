const moment = require('moment')

module.exports = {
    name: 'brigstart',
    description: 'put em in the brig',
    guildOnly: true,
    async execute(message, args, dbClient) {
        if (!message.mentions.users.size) {
            return message.reply(
                'you need to tag a user in order to kick them!'
            )
        }

        // get the user who is going to be put in the brig
        const taggedUser = message.mentions.users.first()

        if (taggedUser.roles.cache.some((role) => role.name === 'landLubber')) {
            return message.reply('tagged user is already in the brig')
        }

        // everyone has @everyone role so this size should be greater than 1 if they were assigned a role
        const hasRole = message.member.roles.cache.size > 1

        message.channel.send(`You wanted to kick: ${taggedUser.username}`)

        const params = {
            TableName: 'Users',
            Key: { id: taggedUser.id },
            ReturnValues: 'ALL_NEW',
            UpdateExpression:
                'SET #brigVotes = :voteRecord, #voteStart = :voteStart, #voteEnd = :voteEnd',
            ExpressionAttributeNames: {
                '#brigVotes': 'brigVotes',
                '#voteStart': 'voteStart',
                '#voteEnd': 'voteEnd',
            },
            ExpressionAttributeValues: {
                ':voteRecord': {
                    [message.author.id]: {
                        hasRole,
                        time: moment().toISOString(),
                    },
                },
                ':voteStart': moment().toISOString(),
                ':voteEnd': moment().add(15, 'minutes').toISOString(),
            },
        }
        try {
            const result = await dbClient.update(params).promise()
            console.log(result)
            message.channel.send('Voting has started')
        } catch (err) {
            console.error(err)
        }
    },
}
