const moment = require('moment')

module.exports = {
    name: 'brig',
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

        if (
            taggedMember.roles.cache.some((role) => role.name === 'Landlubber')
        ) {
            return message.reply('tagged user is already in the brig')
        }

        if (taggedMember === message.member) {
            return message.reply(
                'You thought you were going to put yourself in the brig, but it was me, an error message!'
            )
        }

        // everyone has @everyone role so this size should be greater than 1 if they were assigned a role
        const hasRole = message.member.roles.cache.size > 1

        // message.channel.send(`You wanted to kick: ${taggedUser.username}`)

        const params = {
            TableName: 'Users',
            Key: { id: taggedUser.id },
            ReturnValues: 'ALL_NEW',
            ConditionExpression:
                ':currentTime > #voteEnd OR attribute_not_exists(#brigVotes)',
            UpdateExpression:
                'SET #brigVotes = :voteRecord, #voteStart = :voteStart, #voteEnd = :voteEnd, #voteInitiator = :voteInitiator',
            ExpressionAttributeNames: {
                '#brigVotes': 'brigVotes',
                '#voteStart': 'voteStart',
                '#voteEnd': 'voteEnd',
                '#voteInitiator': 'voteInitiator',
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
                ':voteInitiator': message.author.id,
                ':currentTime': moment().toISOString(),
            },
        }
        try {
            const result = await dbClient.update(params).promise()
            console.log(result)

            // message the channel what is going on
            message.channel.send(
                `${message.member}\nhas proposed that\n${taggedUser}\nbe thrown in the brig for their misconduct.\nAll in favor, say !aye ${taggedUser} to vote.`
            )
        } catch (err) {
            console.error(err)
            if (err.code === 'ConditionalCheckFailedException') {
                message.reply(`Brig vote already in progress for ${taggedUser}`)
            }
        }
    },
}
