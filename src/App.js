import './styling/App.css';
import {useState, useEffect } from 'react';
import axios from 'axios';

function App() {
const[data,setData] = useState('');

useEffect(() => {
  axios.get('api/hi')
  .then(response => setData(response.data.message))
  .catch(error => console.error('api hi error: ',error))
})
  return (
    <div className="App">
      <p>{data}</p>
    </div>
  );
}

export default App;
