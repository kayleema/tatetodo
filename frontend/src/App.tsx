import './App.css'
import {useParams} from "react-router-dom";
import {Board} from "./Board.tsx";

function App() {
    const { boardId } = useParams<{ boardId: string }>();
    if (!boardId) return <div>No boardId</div>
    return <Board boardId={boardId}/>
}

export default App
