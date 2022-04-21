const { ApolloServer, UserInputError, gql, AuthenticationError } = require('apollo-server')
const mongoose = require('mongoose')
const Person = require('./src/models')
const jwt = require('jsonwebtoken')

const JWT_SECRET = 'sercet'

const MONGODB_URI = 'mongodb+srv://apolllo-test:apollo-test@cluster0.5u6qu.mongodb.net/apollo-test?retryWrites=true&w=majority'

console.log('conneccting to :', MONGODB_URI);

mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('connected to MongoDb');
  })
  .catch((error) => {
    console.log('error connecting to mongoDb:', error.message);
  })

// const { v1: uuid } = require('uuid')

// let persons = [
//   {
//     name: "Arto Hellas",
//     phone: "040-123543",
//     street: "Tapiolankatu 5 A",
//     city: "Espoo",
//     id: "3d594650-3436-11e9-bc57-8b80ba54c431"
//   },
//   {
//     name: "Matti Luukkainen",
//     phone: "040-432342",
//     street: "Malminkaari 10 A",
//     city: "Helsinki",
//     id: '3d599470-3436-11e9-bc57-8b80ba54c431'
//   },
//   {
//     name: "Venla Ruuska",
//     street: "Nallemäentie 22 C",
//     city: "Helsinki",
//     id: '3d599471-3436-11e9-bc57-8b80ba54c431'
//   },
// ]

const typeDefs = gql`
 enum YesNo { 
  YES 
  NO 
 }
type Address {
  street: String!
  city: String! 
}

type Person {
  name: String!
  phone: String
  address: Address!
  id: ID!
  }
  type User {
  username: String!
  friends: [Person!]!
  id: ID!
}

type Token {
  value: String!
}


  type Query {
    personCount: Int!
    allPersons(phone:YesNo): [Person!]!
    findPerson(name: String!): Person
    me: User
  }
 
  type Mutation {
    addPerson(
      name: String!
      phone: String
      street: String!
      city: String!
    ): Person
    editNumber(
      name: String!
      phone: String!
    ): Person
    createUser(
      username: String!
    ): User
    login(
      username: String!
      password: String!
    ): Token
    addAsFriend(
    name:String!
    ): User
 }
`

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
    findPerson: async (root, args) =>
      Person.findOne({ name: args.name }),
    me: (root, args, context) => {
      return context.currentUser
    }
  },
  Person: {
    address: (root) => {
      return {
        street: root.street,
        city: root.city
      }
    }
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
      const person = new Person({ ...args })
      const currentUser = context.currentUser
      if (!currentUser) {
        throw new AuthenticationError('not authticat')
      }
      try {
        await person.save()
        currentUser.friends = currentUser.friends.concat(person)
      } catch (error) {
        throw new UserInputError(error.message, {
          invalidArgs: args,
        })
      }
      return person
    },
    editNumber: async (root, args) => {
      // graph Ql
      // const person = persons.find(p => p.name === args.name)
      // if (!person) {
      //   return null
      // }
      // const updatedPerson = { ...person, phone: args.phone }
      // persons = persons.map(p => p.name === args.name ? updatedPerson : p)
      // return updatedPerson

      // mongo DB 
      const person = await Person.findOne({ name: args.name })
      person.phone = args.phone

      try {
        await person.save()
      } catch (error) {
        throw new UserInputError(error.message, {
          invalidArgs: args,
        })
      }
      return person
    },
    createUser: async (root, args) => {
      const user = new User({ username: args.username })

      return user.save()
        .catch(error => {
          throw new UserInputError(error.message, {
            invalidArgs: args,
          })
        })
    },
    login: async (root, args) => {
      const user = await User.findOne({ username: args.username })

      if (!user || args.password !== 'secret') {
        throw new UserInputError("wrong credentials")
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
        throw new AuthenticationError('not Authenticat')
      }
      const person = await Person.findOne({ name: args.name })
      if (nonFriendAlready(person)) {
        currentUser.friends = currentUser.friends.concat(person)
      }
      await currentUser.save()
      return currentUser
    }
  },
}

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: async ({ req }) => {
    const auth = req ? req.headers.authorization : null
    if (auth && auth.toLowerCase().startsWith('bearer ')) {
      const decodedToken = jwt.verify(
        auth.substring(7), JWT_SECRET
      )
      const currentUser = await User.findById(decodedToken.id).populate('friends')
      return { currentUser }
    }
  }
})

server.listen().then(({ url }) => {
  console.log(`Server ready at ${url}`)
})



