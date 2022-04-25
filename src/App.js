import { useState } from 'react'
import {
  useQuery, useMutation, useSubscription, useApolloClient
} from '@apollo/client'
import { ALL_PERSONS, PERSON_ADDED } from './queries'
import Persons from './Persons'
import PersonFrom from './PersonFrom'
import PhoneForm from './PhoneForm'
import LoginForm from './LoginForm'


export const updateCache = (cache, query, addedPerson) => {

  const uniqByName = (a) => {
    let seen = new Set()
    return a.filter((item) => {
      let k = item.name
      return seen.has(k) ? false : seen.add(k)
    })
  }
  cache.updateQuery(query, ({ allPersons }) => {
    return {
      allPersons: uniqByName(allPersons.concat(addedPerson))
    }
  })
}


const App = () => {
  const [errorMessage, setErrorMessage] = useState(null)
  const [token, setToken] = useState(null)
  const result = useQuery(ALL_PERSONS)
  const client = useApolloClient()

  const notify = (message) => {
    setErrorMessage(message)
    setTimeout(() => {
      setErrorMessage(null)
    }, 10000);
  }

  const logout = () => {
    setToken(null)
    localStorage.clear()
    client.resetStore()
  }

  useSubscription(PERSON_ADDED, {
    onSubscriptionData: ({ subscriptionData }) => {
      console.log('subscriptionData',subscriptionData);
      const addedPerson = subscriptionData.data.personAdded
      notify(`${addedPerson.name} added`)
      updateCache(client.cache, { query: ALL_PERSONS }, addedPerson)
    }
  })


  if (!token) {
    console.log('token : ', token);
    return (
      <>
        <Notify errorMessage={errorMessage} />
        <LoginForm setToken={setToken} setError={notify} />
      </>
    )
  }

  if (result.loading) {
    return <div> loading ...</div>
  }

  return (
    <div>
      <Notify errorMessage={errorMessage} />
      <button onClick={logout}>Log out</button>
      <Persons persons={result.data.allPersons} />
      <PersonFrom setError={notify} />
      <PhoneForm setError={notify} />
    </div>
  )
}

const Notify = ({ errorMessage }) => {
  if (!errorMessage) {
    return null
  }
  return (
    <div style={{ color: 'red' }}>
      {errorMessage}
    </div>
  )
}

export default App