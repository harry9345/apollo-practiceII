import { useState } from 'react'
import { useApolloClient, useQuery } from '@apollo/client'
import { ALL_PERSONS } from './queries'
import Persons from './Persons'
import PersonFrom from './PersonFrom'
import PhoneForm from './PhoneForm'
import LoginForm from './LoginForm'

const App = () => {
  const [errorMessage, setErrorMessage] = useState(null)
  const [token,setToken]=useState(null)
  const result = useQuery(ALL_PERSONS)
  const client = useApolloClient()

  const notify = (message)=>{
    setErrorMessage(message)
    setTimeout(() => {
      setErrorMessage(null)
    }, 10000);
  }

  const logout = ()=>{
    setToken(null)
    localStorage.clear()
    client.resetStore()
  }

  if (!token){
    return (
      <div>
        <Notify errorMessage={errorMessage} />
        <h2>Login</h2>
        <LoginForm 
        setToken={setToken}
        setError={notify}/>
      </div>
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
      <PersonFrom  setError={notify}/>
      <PhoneForm  setError={notify} />
    </div>
  )
}

const Notify = ({errorMessage}) =>{
  if(!errorMessage){
    return null
  } 
  return (
    <div style={{color:'red'}}>
      {errorMessage}
    </div>
  )
}

export default App