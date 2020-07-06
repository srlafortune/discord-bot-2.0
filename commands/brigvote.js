const moment = require('moment')

module.exports = {
    name: 'brigvote',
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

        // can vote if a vote has started
        // and user hasn't voted yet
        // and vote period hasn't passed yet
        const params = {
            TableName: 'Users',
            Key: { id: taggedUser.id },
            ReturnValues: 'ALL_NEW',
            UpdateExpression: 'SET #brigVotes.#author = :voteRecord',
            ConditionExpression:
                'attribute_exists(#brigVotes) AND attribute_not_exists(#brigVotes.#author) AND :currentTime < #voteEnd',
            ExpressionAttributeNames: {
                '#brigVotes': 'brigVotes',
                '#voteEnd': 'voteEnd',
                '#author': message.author.id,
            },
            ExpressionAttributeValues: {
                ':voteRecord': { hasRole, time: moment().toISOString() },
                ':currentTime': moment().toISOString(),
            },
        }

        try {
            const result = await dbClient.update(params).promise()
            console.log(result)
            if (Object.keys(result.Attributes.brigVotes).length > 3) {
                if (
                    Object.values(result.Attributes.brigVotes).some((vote) => {
                        return vote.hasRole
                    })
                ) {
                    message.channel.send('TO THE BRIGGGGG')

                    const role = message.guild.roles.cache.find(
                        (role) => role.name === 'Landlubber'
                    )
                    const member = message.mentions.members.first()
                    member.roles.add(role)

                    // message the brig the recap
                    const channel = message.client.channels.cache.get(
                        process.env.BRIG_ID
                    )
                    channel.send(`${member} is now in the brig`)
                    channel.send(`They joined the server at ${member.joinedAt}`)
                    channel.send(
                        `Their most recent message: ${member.lastMessage.url}`
                    )

                    // message the user what is going on
                    member.send(
                        'Hello you are now in the brig. This system is cool'
                    )
                } else {
                    message.channel.send(
                        'You need someone with the role to vote for the user to be kicked'
                    )
                }
            }

            console.log(result)
        } catch (err) {
            console.error(err)
            message.channel.send('Error updating')
            if (err.code === 'ConditionalCheckFailedException') {
                message.channel.send(
                    'Brig vote either doesnt exist or expired or you alreayd voted'
                )
            }
        }
    },
}
