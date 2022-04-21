import { useQuery } from '@apollo/client'
import Persons from './Persons'
import PersonFrom from './PersonFrom'
import { ALL_PERSONS } from './queries'
import { useState } from 'react'
import PhoneForm from './PhoneForm'


const App = () => {
  const [errorMessage, setErrorMessage] = useState(null)

  const result = useQuery(ALL_PERSONS)

  const notify = (message)=>{
    setErrorMessage(message)
    setTimeout(() => {
      setErrorMessage(null)
    }, 10000);
  }

  if (result.loading) {
    return <div> loading ...</div>
  }

  return (
    <div>
      <Notify errorMessage={errorMessage} />
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