const { UserInputError, AuthenticationError } = require('apollo-server')
const jwt = require('jsonwebtoken')
const { PubSub } = require('graphql-subscriptions')
const pubsub = new PubSub()
const Person = require('./src/models')
const User = require('./src/user')

const JWT_SECRET = 'sercet'

const resolvers = {
    Query: {
        personCount: async () => Person.collection.countDocuments(),
        allPersons: async (root, args) => {

            // graph Ql
            // if (!args.phone) {
            //   return persons
            // }
            // const byPhone = (person) =>
            //   args.phone === 'YES' ? person.phone : !person.phone
            // return persons.filter(byPhone)
            // Mongo DB
            if (!args.phone) {
                return Person.find({})
            }

            return Person.find({ phone: { $exists: args.phone === 'YES' } })
        },
        findPerson: async (root, args) => Person.findOne({ name: args.name }),
        me: (root, args, context) => {
            return context.currentUser
        },
    },
    Person: {
        address: (root) => {
            return {
                street: root.street,
                city: root.city,
            }
        },
    },
    Mutation: {
        addPerson: async (root, args, context) => {
            // graph QL
            // if (persons.find(p => p.name === args.name)) {
            //   throw new UserInputError('Name must be unique', {
            //     invalidArgs: args.name,
            //   })
            // }
            // const person = { ...args, id: uuid() }
            // persons = persons.concat(person)
            // return person

            // mongo DB
            const currentUser = context.currentUser

            if (!currentUser) {
                throw new AuthenticationError('not authenticated')
            }

            const person = new Person({ ...args })
            try {
                await person.save()
                currentUser.friends = currentUser.friends.concat(person)
                await currentUser.save()
            } catch (error) {
                throw new UserInputError(error.message, {
                    invalidArgs: args,
                })
            }
            pubsub.publish('PERSON_ADDED', { personAdded: person })

            return person
        },
        editNumber: async (root, args) => {
            const person = await Person.findOne({ name: args.name })

            // graph Ql
            // const person = persons.find(p => p.name === args.name)
            // if (!person) {
            //   return null
            // }
            // const updatedPerson = { ...person, phone: args.phone }
            // persons = persons.map(p => p.name === args.name ? updatedPerson : p)
            // return updatedPerson
            // mongo DB 
            person.phone = args.phone

            try {
                await person.save()
            } catch (error) {
                throw new UserInputError(error.message, {
                    invalidArgs: args,
                })
            }
            return person.save()
        },
        createUser: async (root, args) => {
            const user = new User({ username: args.username })

            return user.save().catch((error) => {
                throw new UserInputError(error.message, {
                    invalidArgs: args,
                })
            })
        },
        login: async (root, args) => {
            const user = await User.findOne({ username: args.username })

            if (!user || args.password !== 'secret') {
                throw new UserInputError('wrong credentials')
            }

            const userForToken = {
                username: user.username,
                id: user._id,
            }

            return { value: jwt.sign(userForToken, JWT_SECRET) }
        },
        addAsFriend: async (root, args, { currentUser }) => {
            const nonFriendAlready = (person) =>
                !currentUser.friends.map(f => f._id.toString()).includes(person._id.toString())

            if (!currentUser) {
                throw new AuthenticationError('not authenticated')
            }

            const person = await Person.findOne({ name: args.name })
            if (nonFriendAlready(person)) {
                currentUser.friends = currentUser.friends.concat(person)
            }

            await currentUser.save()

            return currentUser
        },
    },
    Subscription: {
        personAdded: {
            subscrib: () => pubsub.asyncIterator(['PERSON_ADDED'])
        }
    }
}

module.exports = resolvers