const React = require("react")
const {useState, useEffect} = require("react")
const {render} = require("react-dom")

function App() {
  const [state, setState] = useState({})

  useEffect(() => {
    setTimeout(async () => {
      const response = await fetch("/api/foo")
      const json = await response.json()
      setState({ ...state, responseJson: json })

    }, 2000)
  }, [])

  return (
    <div>
      <h1>Hello, world!</h1>
      <pre>{JSON.stringify(state, null, 2)}</pre>
    </div>
  )
}

render(<App />, document.getElementById("app"))
