const React = require("react")
const {useState, useEffect} = require("react")
const {render} = require("react-dom")

function App() {
  const [state, setState] = useState({
    state: "LOADING",
  })

  useEffect(() => {
    const effect = async () => {
      const response = await fetch("/api/foo")
      if (response.status === 200) {
        setState({
          ...state,
          state: "LOADED",
          responseStatus: response.status,
          responseStatusText: response.statusText,
          response: await response.json(),
        })
      } else {
        setState({
          ...state,
          state: "ERROR",
          responseStatus: response.status,
          responseStatusText: response.statusText,
          response: await response.text(),
        })
      }
    }
    effect()
  }, [])

  return (
    <div>
      <h1>Hello, world!</h1>
      <pre>{JSON.stringify(state, null, 2)}</pre>
    </div>
  )
}

render(<App />, document.getElementById("app"))
