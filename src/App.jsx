import { useEffect, useState } from "react";

function App() {
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('http://localhost:8080/api/hello')
    .then(res => res.json())
    .then(data => setMessage(data.message))
    .catch(err => console.error(err));
  },[]);
  return (
    <div>
      {message}
    </div>
  )
}

export default App
