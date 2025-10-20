// import { Button } from "@/components/ui/button"
import "./App.css"
import { Routes, Route } from 'react-router-dom';
import HomePage from "./pages/Home";
import VoiceRecorder from "./pages/Speaking"
function App() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center text-amber-900">
      {/* <Button>Click me</Button> */}
      <Routes>
        <Route path="/" element={<HomePage/>}/>
        
        <Route path="/s" element={<VoiceRecorder/>}/>
      </Routes>
    </div>
  )
}

export default App