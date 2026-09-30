import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// dev-only map-pipeline demo: http://localhost:5173/#mapdemo
if (import.meta.env.DEV && window.location.hash === '#mapdemo') {
  document.getElementById('boot')?.remove() // the demo doesn't run App's boot-fade
  import('./MapDemo.jsx').then(({ default: MapDemo }) => {
    ReactDOM.createRoot(document.getElementById('root')).render(<MapDemo />)
  })
} else {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
}
