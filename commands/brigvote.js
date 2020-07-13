const moment = require('moment')

module.exports = {
    name: 'aye',
    description: 'put em in the brig',
    guildOnly: true,
    async execute(message, args, dbClient) {
        if (!message.mentions.users.size) {
            return message.reply(
                'you need to tag a user in order to kick them!'
            )
        }

        // get the user who is going to be put in the brig
        const taggedMember = message.mentions.members.first()
        const taggedUser = message.mentions.users.first()

        if (
            taggedMember.roles.cache.some((role) => role.name === 'landLubber')
        ) {
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

                    // get the brig
                    const channel = message.client.channels.cache.get(
                        process.env.BRIG_ID
                    )

                    // send message to the brig
                    channel.send(`
                        The crew has come to a vote and determined that action is required. 
                        As a result, ${member} has been thrown in the brig.
                        They await moderation by @Xandy.
                        
                        Right now, they haven't been banned from this server. This channel is a holding cell.
                        While confined here, they'll be unable to interact with all channels. They can only read this channel.
                        
                        Usually, they'll simply be banned (if they've been rightly imprisoned) or released (if not), but please keep in mind that the brig is not to be used lightly. If this system has been misused, we'll respond accordingly and set things right.
                        
                        Move along folks, nothing to see here, get back above decks!
                        Your captain will explain the situation here once it has been resolved.
                    `)

                    // message Xander what happened
                    channel.send(`They joined the server at ${member.joinedAt}`)
                    channel.send(
                        `Their most recent message: ${member.lastMessage.url}`
                    )

                    // message the user what is going on
                    member.send(
                        `The crew of The Clothesline has come to a vote and determined that action is required. 
                        As a result, you has been thrown in the brig and await moderation by Xandy.
                        
                        Right now, you haven't been banned from this server. The brig channel is a holding cell.
                        While confined there, you'll be unable to interact with all channels. You can only read the brig channel.
                        
                        Usually, you'll simply be banned (if you've been rightly imprisoned) or released (if not), but please keep in mind that the brig is not to be used lightly. If this system has been misused, we'll respond accordingly and set things right.
                        
                        Where appropriate, your captain will send you a message to conclude these proceedings.`
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
